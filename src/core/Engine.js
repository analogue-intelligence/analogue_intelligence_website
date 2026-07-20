import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Engine — renderer, isometric follow-camera, clock, tick loop. In `cinematic`
// mode the follow logic is suspended so the intro can drive the camera directly;
// when it ends we seed the look target for a smooth hand-off to the follow-cam.
// -----------------------------------------------------------------------------
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e8eef2');   // bright daylight sky
    this.scene.fog = new THREE.Fog('#e8eef2', 55, 90);

    this.frustum = 14;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camOffset = new THREE.Vector3(17, 20, 17);
    this.camTarget = new THREE.Vector3(0, 1.5, 0);
    this._camLook = new THREE.Vector3(0, 1.5, 0);

    // a perspective camera used only for the cinematic intro (the ortho camera
    // can't convey moving *through* the door — no perspective foreshortening)
    this.introCam = new THREE.PerspectiveCamera(52, 1, 0.1, 200);

    this.cinematic = false;
    this.clock = new THREE.Clock();
    this._ticks = [];

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onTick(fn) { this._ticks.push(fn); }
  follow(point) { this.camTarget.copy(point); }
  seedLook(point) { this._camLook.copy(point); }

  // Directly aim the cinematic (perspective) camera — used by the intro.
  setCam(pos, target) { this.introCam.position.copy(pos); this.introCam.lookAt(target); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight, aspect = w / h, f = this.frustum;
    this.camera.left = -f * aspect; this.camera.right = f * aspect;
    this.camera.top = f; this.camera.bottom = -f;
    this.camera.updateProjectionMatrix();
    this.introCam.aspect = aspect; this.introCam.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start() {
    const loop = () => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      for (const fn of this._ticks) fn(dt);           // ticks (incl. intro) run first
      if (!this.cinematic) {
        this._camLook.lerp(this.camTarget, 0.12);
        this.camera.position.copy(this._camLook).add(this.camOffset);
        this.camera.lookAt(this._camLook);
      }
      const cam = this.cinematic ? this.introCam : this.camera;
      this.renderer.render(this.scene, cam);
      requestAnimationFrame(loop);
    };
    loop();
  }
}
