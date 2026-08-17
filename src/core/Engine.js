import * as THREE from 'three';
import { Postprocess } from './Postprocess.js';
import { setAnisotropy } from '../world/textures.js';
import { QUALITY } from './quality.js';

// -----------------------------------------------------------------------------
// Engine — renderer, the isometric follow-camera, the clock, and the tick loop.
//
// Two cameras: an orthographic one for play (the cutaway diorama look depends on
// parallel projection) and a perspective one the intro borrows so it can move
// *through* the front door. `cinematic` decides which is live.
//
// It also watches its own frame time. A building this size has to run on a
// laptop with integrated graphics, so rather than pick one setting and hope,
// the engine starts conservative, measures, and moves between three tiers. What
// it gives up — resolution, shadow sharpness, the number of practical lights,
// the painted post pass — are the expensive things, in the order you'd sacrifice
// them by hand.
// -----------------------------------------------------------------------------

export const TIERS = {
  high:   { pixelRatio: 1.75, shadows: true,  shadowMap: 2048, lights: 6, post: true, shadowEvery: 1, ao: 0.50, bloom: 0.5,  bands: 10, liveTex: 0.035 },
  medium: { pixelRatio: 1.25, shadows: true,  shadowMap: 1024, lights: 4, post: true, shadowEvery: 2, ao: 0.42, bloom: 0.38, bands: 9, liveTex: 0.05 },
  low:    { pixelRatio: 1.0,  shadows: false, shadowMap: 512,  lights: 3, post: true, shadowEvery: 4, ao: 0.0,  bloom: 0.0,  bands: 8, liveTex: 0.12 },
};
const ORDER = ['low', 'medium', 'high'];

export class Engine {
  constructor(canvas, tier = null) {
    // Medium everywhere, phones included. Starting low and climbing meant most
    // people saw the worst version of the building first, and the promotion is
    // slow enough that many never saw it improve. Medium is the intended look;
    // the frame-time watch below drops it only if the machine cannot hold it.
    const coarse = (() => {
      try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; }
    })();
    tier = tier ?? 'medium';
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, powerPreference: 'high-performance', stencil: false,
    });
    // Antialiasing is off deliberately: the post pass already resolves edges
    // with its ink outline, and MSAA over a full-resolution buffer is one of
    // the most expensive things you can ask an integrated GPU for.
    this.renderer.shadowMap.enabled = true;
    // Chosen once and never changed. Switching shadow map type flips a shader
    // define, which means every material in the scene has to recompile — about
    // five hundred of them, in one frame, every time the adaptive quality system
    // changed tier. That was the stutter.
    this.renderer.shadowMap.type = coarse ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;      // driven by hand, below
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // 1.38 was clipping. Up-facing surfaces receive the hemisphere at full
    // strength, so tabletops and the tops of wall panels blew out to flat white
    // and lost all their texture — the detail was not missing, it was
    // over-exposed off the top of the range.
    this.renderer.toneMappingExposure = 1.22;
    setAnisotropy(Math.min(this.renderer.capabilities.getMaxAnisotropy?.() ?? 8, 16));

    this.scene = new THREE.Scene();
    // Warm daylight, and fog that *lightens* with distance instead of swallowing
    // it. The old near-black background was what made every room feel like a
    // vault however brightly it was lit.
    // Bright and airy rather than warm and enclosed. The reference look for
    // this pass — clean low-poly web 3D of the bruno-simon.com sort — puts
    // saturated objects on a light, almost paper-coloured ground and lets the
    // silhouettes do the work. Fog starts late and barely closes, so the far
    // end of the building stays legible instead of hazing out.
    // A drawn sky, not a fill. A flat colour is fine behind a building seen
    // from above and hopeless on the approach road, where you look straight out
    // at a horizon and it reads as an empty white void.
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog('#f0e2cc', 130, 300);

    this.frustum = 15.5;
    this.targetFrustum = 15.5;
    this.frameScale = 1.0;
    this.lockZoom = false;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 220);
    this.camOffset = new THREE.Vector3(30, 34, 30);
    this.camTarget = new THREE.Vector3(0, 1.5, 0);
    this._camLook = new THREE.Vector3(0, 1.5, 0);

    this.introCam = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
    this.cinematic = false;

    this.clock = new THREE.Clock();
    this._ticks = [];
    this.post = new Postprocess(this.renderer);

    // adaptive-quality state
    this.tier = tier;
    this.autoQuality = true;
    this.onTierChange = () => {};
    this._frameTimes = [];
    this._sinceChange = 0;
    this._frame = 0;
    this.fps = 60;

    this._applyTier();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /**
   * Image-based lighting from a procedural sky.
   *
   * Two directional lights and a hemisphere give you brightness but not
   * *material* — every surface responds identically regardless of what it is
   * supposed to be made of, which is most of why primitive geometry reads as
   * toy plastic. An environment map gives MeshStandardMaterial something to
   * reflect, so roughness and metalness finally mean something: the brass rail
   * picks up the window, the concrete does not.
   *
   * The map is generated here rather than loaded — a 64x32 equirectangular
   * gradient with a warm sun blob, run through PMREM. It costs one small
   * texture and one prefilter at startup.
   */
  _buildEnvironment() {
    try {
      const W = 64, H = 32;
      const data = new Uint8Array(W * H * 4);
      const sky = [255, 242, 214], horizon = [236, 224, 200], ground = [176, 156, 122];
      for (let y = 0; y < H; y++) {
        const t = y / (H - 1);                       // 0 = top of the sky
        const k = Math.min(1, Math.abs(t - 0.5) * 2);
        const from = t < 0.5 ? horizon : horizon;
        const to = t < 0.5 ? sky : ground;
        for (let x = 0; x < W; x++) {
          // a soft sun where the key light sits, so highlights have somewhere
          // to come from and the reflections are not uniform
          const u = x / W;
          const sun = Math.max(0, 1 - Math.hypot((u - 0.13) * 2.6, (t - 0.24) * 3.4)) ** 3;
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            data[i + c] = Math.min(255,
              from[c] + (to[c] - from[c]) * k + sun * (c === 2 ? 40 : 90));
          }
          data[i + 3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      pmrem.compileEquirectangularShader();
      this.envMap = pmrem.fromEquirectangular(tex).texture;
      this.scene.environment = this.envMap;
      pmrem.dispose();
      tex.dispose();
    } catch (e) {
      console.warn('[env] image-based lighting unavailable:', e);
    }
  }

  get settings() { return TIERS[this.tier]; }

  onTick(fn) { this._ticks.push(fn); }
  follow(point) { this.camTarget.copy(point); }
  seedLook(point) { this._camLook.copy(point); }
  /** Room entry nudges the framing; a manual pinch takes it over for good. */
  setZoom(frustum) {
    if (this.lockZoom && !this._zoomFromUser) return;
    this.targetFrustum = frustum;
  }

  /** Widen the view on a narrow screen: desktop framing shows almost nothing. */
  autoFrame() {
    const w = window.innerWidth;
    this.frameScale = w < 520 ? 1.5 : w < 820 ? 1.24 : 1.0;
  }
  setCam(pos, target) { this.introCam.position.copy(pos); this.introCam.lookAt(target); }

  setTier(name) {
    if (!TIERS[name] || name === this.tier) return;
    this.tier = name;
    this._sinceChange = 0;
    this._frameTimes.length = 0;
    this._applyTier();
    this.onTierChange(name, this.settings);
  }

  _applyTier() {
    const s = this.settings;
    QUALITY.tier = this.tier;
    QUALITY.liveTex = s.liveTex ?? 0.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.pixelRatio));
    this.renderer.shadowMap.enabled = s.shadows;

    this.post.enabled = s.post;
    this.post.setQuality(s);
    this.resize();
    this.renderer.shadowMap.needsUpdate = true;
  }

  /**
   * Compile every shader the scene needs, up front.
   *
   * Without this, the first frame after the character creator closes has to
   * compile hundreds of material variants in one go, which reads as the page
   * hanging. Doing it behind the creator overlay moves the cost somewhere the
   * user is already occupied — and it is far cheaper now that the scene has a
   * handful of lights rather than forty-one.
   */
  precompile() {
    try {
      // The environment prefilter renders a mip chain, so it waits until we are
      // already behind the creator overlay rather than blocking the first paint.
      if (!this.envMap) this._buildEnvironment();
      this.renderer.compile(this.scene, this.camera);
      this.renderer.shadowMap.needsUpdate = true;
    } catch { /* compilation is an optimisation, never a requirement */ }
  }

  /** World point → screen pixels, for HTML labels that track objects. */
  project(v3, out) {
    const p = out ?? new THREE.Vector3();
    p.copy(v3).project(this.cinematic ? this.introCam : this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      visible: p.z < 1,
    };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
    this.autoFrame();
    this._applyFrustum(aspect);
    this.introCam.aspect = aspect;
    this.introCam.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
  }

  _applyFrustum(aspect) {
    const f = this.frustum * this.frameScale;
    this.camera.left = -f * aspect; this.camera.right = f * aspect;
    this.camera.top = f; this.camera.bottom = -f;
    this.camera.updateProjectionMatrix();
  }

  /** Rolling frame-time watch. Slow for a while → drop a tier. Fast → try up. */
  _watch(dt) {
    if (!this.autoQuality) return;
    this._sinceChange += dt;
    const ft = this._frameTimes;
    ft.push(dt);
    if (ft.length > 90) ft.shift();
    if (ft.length < 90 || this._sinceChange < 2.5) return;

    const sorted = [...ft].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.fps = 1 / median;
    const i = ORDER.indexOf(this.tier);

    // Only drop when it is genuinely unplayable and has been for a while.
    // Falling back at 32fps was too eager: a couple of heavy frames on entering
    // a room was enough to lose the finish for the rest of the session.
    if (median > 1 / 24 && i > 0) this.setTier(ORDER[i - 1]);
    else if (median < 1 / 58 && i < ORDER.length - 1 && this._sinceChange > 3) {
      this.setTier(ORDER[i + 1]);
    }
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this._frame++;

      for (const fn of this._ticks) fn(dt);

      if (Math.abs(this.frustum - this.targetFrustum) > 0.002) {
        this.frustum += (this.targetFrustum - this.frustum) * Math.min(dt * 2.4, 1);
        this._applyFrustum(window.innerWidth / window.innerHeight);
      }

      if (!this.cinematic) {
        this._camLook.lerp(this.camTarget, Math.min(dt * 6, 1));
        this.camera.position.copy(this._camLook).add(this.camOffset);
        this.camera.lookAt(this._camLook);
      }

      // Shadows only need redrawing every nth frame: the sun barely moves and a
      // one-frame-stale shadow is invisible at this camera distance.
      if (this.renderer.shadowMap.enabled && this._frame % this.settings.shadowEvery === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }

      const cam = this.cinematic ? this.introCam : this.camera;
      this.post.render(this.scene, cam, dt);
      this._watch(dt);
    };
    loop();
  }
}

// ---------------------------------------------------------------------------
/**
 * A pastel sky with clouds, as an equirectangular background.
 *
 * Drawn to a canvas and handed to `scene.background` with equirectangular
 * mapping, so three.js renders it as a proper dome — no geometry, nothing to
 * fall outside the camera's far plane, and it works for the isometric camera
 * and the prologue's perspective camera alike.
 *
 * The horizon band is deliberately the same value as the fog, so distant ground
 * dissolves into the sky instead of ending at a visible edge.
 */
function skyTexture() {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // zenith to horizon: a soft blue falling to a warm pale band
  const grad = g.createLinearGradient(0, 0, 0, H);
  // Warm at the horizon, cool overhead — the light in the reference is a low
  // sun, so the sky is peach where it meets the ground and only turns blue well
  // above the eye line. A cool grey horizon was most of what read as grim.
  grad.addColorStop(0.00, '#86bde2');
  grad.addColorStop(0.28, '#a9d3e8');
  grad.addColorStop(0.44, '#d3e6ea');
  grad.addColorStop(0.53, '#f2e2cf');
  grad.addColorStop(0.60, '#f7d9b8');
  grad.addColorStop(0.74, '#f3ddc6');
  grad.addColorStop(1.00, '#e8dcc8');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // clouds: stacked soft blobs, flattened towards the horizon so they read as
  // lying in a plane rather than pasted on a wall
  let seed = 4127;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  for (let i = 0; i < 26; i++) {
    const cx = rnd() * W;
    const t = 0.06 + Math.pow(rnd(), 1.5) * 0.42;      // above the horizon only
    const cy = t * H;
    const flat = 0.28 + t * 0.9;                        // flatter when higher up
    const scale = 26 + rnd() * 70;
    const puffs = 5 + Math.floor(rnd() * 6);

    for (let p = 0; p < puffs; p++) {
      const px = cx + (rnd() - 0.5) * scale * 2.6;
      const py = cy + (rnd() - 0.5) * scale * flat * 0.7;
      const r = scale * (0.4 + rnd() * 0.6);
      const rg = g.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.80)');
      rg.addColorStop(0.55, 'rgba(255,255,255,0.38)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(px, py, r, r * flat, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // a warm haze right on the horizon, where the sun is
  const sun = g.createRadialGradient(W * 0.13, H * 0.44, 0, W * 0.13, H * 0.44, W * 0.22);
  sun.addColorStop(0, 'rgba(255,232,182,0.75)');
  sun.addColorStop(1, 'rgba(255,236,196,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
