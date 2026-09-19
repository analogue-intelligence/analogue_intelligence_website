import * as THREE from 'three';
import { Postprocess } from './Postprocess.js';
import { setAnisotropy } from '../world/textures.js';
import { QUALITY } from './quality.js';

// -----------------------------------------------------------------------------
// Engine — renderer, the third-person chase camera, the clock, and the loop.
//
// Two cameras, both perspective: a chase camera for play, which rides behind
// and above the visitor and turns with them (so W is always "the way I am
// facing"), and a free one the prologue borrows for its set pieces.
// `cinematic` decides which is live. Because both use the same projection, the
// prologue can hand over by simply flying its camera onto the chase camera's
// mark — there is no projection swap left to hide.
//
// It also watches its own frame time. A building this size has to run on a
// laptop with integrated graphics, so rather than pick one setting and hope,
// the engine starts conservative, measures, and moves between three tiers. What
// it gives up — resolution, shadow sharpness, the number of practical lights,
// the painted post pass — are the expensive things, in the order you'd sacrifice
// them by hand.
// -----------------------------------------------------------------------------

// `lights` is deliberately the same on every tier. The number of point lights
// is compiled into every material's shader, so changing it with the tier
// recompiled the entire scene mid-walk — a long hitch on a laptop and, on a
// phone, sometimes long enough to lose the WebGL context (a black screen).
export const TIERS = {
  high:   { pixelRatio: 1.75, shadows: true,  shadowMap: 2048, lights: 4, post: true, shadowEvery: 1, ao: 0.50, bloom: 0.5,  bands: 10, liveTex: 0.035 },
  medium: { pixelRatio: 1.25, shadows: true,  shadowMap: 1024, lights: 4, post: true, shadowEvery: 2, ao: 0.42, bloom: 0.38, bands: 9, liveTex: 0.05 },
  low:    { pixelRatio: 1.0,  shadows: true,  shadowMap: 512,  lights: 4, post: true, shadowEvery: 6, ao: 0.0,  bloom: 0.0,  bands: 8, liveTex: 0.12 },
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

    // ---- chase camera ----------------------------------------------------
    // `zoom` scales the boom: 1 is the default framing, <1 closer, >1 further.
    // Room entry nudges it (setZoom), a pinch or the wheel takes it over.
    this.zoom = 1;
    this.targetZoom = 1;
    this.lockZoom = false;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 260);
    this.camTarget = new THREE.Vector3(0, 1.5, 0);   // what we are following
    this.camHeading = Math.PI;                        // which way it is facing
    this._camLook = new THREE.Vector3(0, 1.5, 0);    // eased look point
    this._camPos = new THREE.Vector3(0, 10, 10);     // eased camera position
    this._camYaw = Math.PI;                           // eased yaw
    this._chase = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this._snap = true;
    // Optional hook that shortens the boom so the camera never ends up inside
    // an upper floor; main.js wires it to the floor plan.
    this.constrainCamera = null;

    this.introCam = new THREE.PerspectiveCamera(52, 1, 0.1, 260);
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
    // Tier changes and resizes are *queued* and applied at the top of the next
    // frame, before anything is drawn. Resizing the canvas clears it, so doing
    // it after a frame had been rendered (which is where the frame-time watch
    // runs) showed the browser an empty canvas for one frame: the black flash.
    this._pendingTier = null;
    this._needsResize = false;

    this._applyTier();
    window.addEventListener('resize', () => { this._needsResize = true; });
    window.addEventListener('orientationchange', () => { this._needsResize = true; });
    this.resize();

    // A lost context (a phone backgrounding the tab, or running out of GPU
    // memory) otherwise leaves a black canvas forever. Preventing the default
    // lets the browser hand it back, and three.js rebuilds its state when it
    // does.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      console.warn('[engine] WebGL context lost — waiting for it to come back');
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this._needsResize = true;
      this.renderer.shadowMap.needsUpdate = true;
      console.warn('[engine] WebGL context restored');
    }, false);
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

  /** Follow a point, facing `heading` (radians, 0 = +z). */
  follow(point, heading = this.camHeading) {
    this.camTarget.copy(point);
    this.camHeading = heading;
  }
  /** Jump the chase camera straight to its mark on the next frame. */
  seedLook(point) {
    if (point) this.camTarget.copy(point);
    this._snap = true;
  }

  /**
   * Room entry nudges the framing. The old orthographic frustum sizes
   * (14.5 – 16.6) are still what callers pass; they map onto the boom length
   * around the default of 15.5. A manual pinch or wheel takes it over for good.
   */
  setZoom(frustum) {
    if (this.lockZoom && !this._zoomFromUser) return;
    this.targetZoom = THREE.MathUtils.clamp(frustum / 15.5, 0.55, 1.9);
  }
  /** Multiply the boom length — the wheel and the pinch both come through here. */
  zoomBy(k) {
    this.lockZoom = true;
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom * k, 0.55, 1.9);
  }

  /**
   * Where the chase camera wants to be for a visitor at `target` facing
   * `heading`. Also used by the prologue to land its own camera on the exact
   * same mark before handing over.
   */
  chasePose(target, heading, zoom = this.zoom, out = this._chase) {
    const fx = Math.sin(heading), fz = Math.cos(heading);
    // Behind and above. High enough to see over the furniture (and over the
    // 8-unit walls at the default zoom), close enough to still read as
    // following a person rather than watching a map.
    let back = 8.6 * zoom;
    let up = 8.2 * zoom;
    if (this.constrainCamera) {
      const c = this.constrainCamera(target, fx, fz, back, up);
      if (c) { back = c.back; up = c.up; }
    }
    out.pos.set(target.x - fx * back, target.y + up, target.z - fz * back);
    // look a little ahead of the visitor, which reads as intent
    out.look.set(target.x + fx * 2.4, target.y + 0.2, target.z + fz * 2.4);
    return out;
  }

  /** Match the chase camera's field of view to the screen shape. */
  autoFrame() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    // Keep roughly 62° of *horizontal* view, so a portrait phone does not get
    // a letterbox slot of the world; landscape screens use a plain 50°.
    const hfov = THREE.MathUtils.degToRad(62);
    const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect));
    this.camera.fov = THREE.MathUtils.clamp(vfov, 50, 80);
  }
  setCam(pos, target) { this.introCam.position.copy(pos); this.introCam.lookAt(target); }

  /** Queue a tier change; it is applied at the start of the next frame. */
  setTier(name) {
    if (!TIERS[name] || name === this.tier) return;
    this._pendingTier = name;
  }

  _commitTier(name) {
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
    // Shadows stay *enabled* on every tier; the low tier just refreshes them
    // rarely at a small size. Flipping shadowMap.enabled changes a define in
    // every material, so each tier change used to recompile the whole scene.
    this.renderer.shadowMap.enabled = true;

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
      if (this.introCam) this.renderer.compile(this.scene, this.introCam);
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
      visible: p.z < 1 && p.z > -1,
    };
  }

  /** The camera that is actually being drawn with. */
  get activeCamera() { return this.cinematic ? this.introCam : this.camera; }

  resize() {
    this._needsResize = false;
    const w = window.innerWidth, h = window.innerHeight, aspect = w / Math.max(1, h);
    this.autoFrame();
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.introCam.aspect = aspect;
    this.introCam.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
  }

  /** Ease the chase camera toward its mark behind the visitor. */
  _updateChase(dt) {
    if (Math.abs(this.zoom - this.targetZoom) > 0.0005) {
      this.zoom += (this.targetZoom - this.zoom) * Math.min(dt * 4, 1);
    }
    // The yaw lags the visitor's heading a little — the camera swings round
    // behind you as you turn, rather than being bolted to your back.
    const dy = ((this.camHeading - this._camYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this._camYaw += this._snap ? dy : dy * Math.min(dt * 3.2, 1);
    const pose = this.chasePose(this.camTarget, this._camYaw);
    if (this._snap) {
      this._camPos.copy(pose.pos);
      this._camLook.copy(pose.look);
      this._snap = false;
    } else {
      this._camPos.lerp(pose.pos, Math.min(dt * 7, 1));
      this._camLook.lerp(pose.look, Math.min(dt * 9, 1));
    }
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
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
      if (this.contextLost) return;
      this._frame++;

      // anything that resizes the canvas happens *before* this frame draws
      if (this._pendingTier) { const t = this._pendingTier; this._pendingTier = null; this._commitTier(t); }
      if (this._needsResize) this.resize();

      for (const fn of this._ticks) fn(dt);

      if (!this.cinematic) this._updateChase(dt);

      // Shadows only need redrawing every nth frame: the sun barely moves and a
      // one-frame-stale shadow is invisible at this camera distance.
      if (this.renderer.shadowMap.enabled && this._frame % this.settings.shadowEvery === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }

      this.post.render(this.scene, this.activeCamera, dt);
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
