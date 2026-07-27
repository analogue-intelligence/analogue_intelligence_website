import * as THREE from 'three';
import { Postprocess } from './Postprocess.js';
import { setAnisotropy } from '../world/textures.js';

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
  high:   { pixelRatio: 1.75, shadows: true,  shadowMap: 2048, lights: 6, post: true,  shadowEvery: 1 },
  medium: { pixelRatio: 1.25, shadows: true,  shadowMap: 1024, lights: 4, post: true,  shadowEvery: 2 },
  low:    { pixelRatio: 1.0,  shadows: false, shadowMap: 512,  lights: 3, post: false, shadowEvery: 4 },
};
const ORDER = ['low', 'medium', 'high'];

export class Engine {
  constructor(canvas, tier = 'medium') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, powerPreference: 'high-performance', stencil: false,
    });
    // Antialiasing is off deliberately: the post pass already resolves edges
    // with its ink outline, and MSAA over a full-resolution buffer is one of
    // the most expensive things you can ask an integrated GPU for.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;      // driven by hand, below
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    setAnisotropy(Math.min(this.renderer.capabilities.getMaxAnisotropy?.() ?? 4, 4));

    this.scene = new THREE.Scene();
    // Warm daylight, and fog that *lightens* with distance instead of swallowing
    // it. The old near-black background was what made every room feel like a
    // vault however brightly it was lit.
    this.scene.background = new THREE.Color('#e9dcc2');
    this.scene.fog = new THREE.Fog('#efe4cd', 78, 210);

    this.frustum = 15.5;
    this.targetFrustum = 15.5;
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

  get settings() { return TIERS[this.tier]; }

  onTick(fn) { this._ticks.push(fn); }
  follow(point) { this.camTarget.copy(point); }
  seedLook(point) { this._camLook.copy(point); }
  setZoom(frustum) { this.targetFrustum = frustum; }
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.pixelRatio));
    this.renderer.shadowMap.enabled = s.shadows;
    this.post.enabled = s.post;
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
    this._applyFrustum(aspect);
    this.introCam.aspect = aspect;
    this.introCam.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
  }

  _applyFrustum(aspect) {
    const f = this.frustum;
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

    if (median > 1 / 32 && i > 0) this.setTier(ORDER[i - 1]);
    else if (median < 1 / 58 && i < ORDER.length - 1 && this._sinceChange > 8) {
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
