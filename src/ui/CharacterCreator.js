import * as THREE from 'three';
import { buildFigure } from '../character/figure.js';
import {
  SKIN, HAIR_COLOR, HAIR_STYLE, COAT, BUILD,
  DEFAULT_APPEARANCE, loadAppearance, saveAppearance, trousersFor,
} from '../character/appearance.js';

// -----------------------------------------------------------------------------
// CharacterCreator — the mirror in the porch.
//
// A second, tiny WebGL context showing nothing but the figure on a turntable,
// rebuilt from scratch whenever any option changes. Rebuilding is cheap here
// (one chibi, a few dozen primitives) and it means the preview can never drift
// out of sync with what the world will actually build.
//
// Choices persist to localStorage, so returning visitors keep their face; the
// `C` key reopens this at any time.
// -----------------------------------------------------------------------------
export class CharacterCreator {
  constructor(root) {
    this.appearance = loadAppearance() ?? { ...DEFAULT_APPEARANCE };
    this.onDone = () => {};
    this._raf = null;

    this.el = document.createElement('div');
    this.el.className = 'creator';
    this.el.innerHTML = `
      <div class="creator-panel">
        <div class="creator-stage">
          <canvas class="creator-canvas"></canvas>
          <div class="creator-turn">
            <button data-turn="-1" aria-label="Turn left">‹</button>
            <button data-turn="1" aria-label="Turn right">›</button>
          </div>
        </div>
        <div class="creator-side">
          <div class="creator-kicker">Before you go in</div>
          <h1 class="creator-title">Who are you today?</h1>
          <p class="creator-lede">You'll be walking around a building full of other people's work. It seems only fair that you look like someone.</p>

          <label class="creator-field">
            <span>Name</span>
            <input class="creator-name" type="text" maxlength="18" />
          </label>

          <div class="creator-group" data-group="skin"><span class="creator-label">Skin</span><div class="swatches"></div></div>
          <div class="creator-group" data-group="hairStyle"><span class="creator-label">Hair</span><div class="chips"></div></div>
          <div class="creator-group" data-group="hairColor"><span class="creator-label">Hair colour</span><div class="swatches"></div></div>
          <div class="creator-group" data-group="coat"><span class="creator-label">Coat</span><div class="swatches"></div></div>
          <div class="creator-group" data-group="build"><span class="creator-label">Build</span><div class="chips"></div></div>

          <label class="creator-field">
            <span>Height</span>
            <input class="creator-height" type="range" min="0.88" max="1.12" step="0.01" />
          </label>

          <div class="creator-actions">
            <button class="creator-random">Surprise me</button>
            <button class="creator-go">Enter the lab →</button>
          </div>
        </div>
      </div>
    `;
    root.appendChild(this.el);

    this.canvas = this.el.querySelector('.creator-canvas');
    this._initPreview();
    this._buildControls();
    this._bind();
    this._sync();
  }

  // --------------------------------------------------------------- preview --
  _initPreview() {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
    } catch { this.renderer = null; return; }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    this.camera.position.set(0, 2.5, 10.5);
    this.camera.lookAt(0, 1.9, 0);

    this.scene.add(new THREE.HemisphereLight(0xffe3c0, 0x2a3038, 1.5));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.1);
    key.position.set(4, 7, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fb0c9, 1.1);
    rim.position.set(-5, 3, -4);
    this.scene.add(rim);

    // a plinth, so the figure is standing on something rather than floating
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.9, 0.24, 28),
      new THREE.MeshStandardMaterial({ color: '#2b3038', roughness: 0.9 }));
    disc.position.y = -0.12;
    this.scene.add(disc);

    this.turntable = new THREE.Group();
    this.scene.add(this.turntable);
    this.spin = 0;
    this.spinVel = 0.25;
  }

  _rebuild() {
    if (!this.renderer) return;
    if (this._figure) this.turntable.remove(this._figure.group);
    this._figure = buildFigure(this.appearance);
    this.turntable.add(this._figure.group);
  }

  _resizePreview() {
    if (!this.renderer) return;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // -------------------------------------------------------------- controls --
  _buildControls() {
    const swatch = (group, values) => {
      const host = this.el.querySelector(`[data-group="${group}"] .swatches`);
      host.innerHTML = '';
      for (const v of values) {
        const b = document.createElement('button');
        b.className = 'swatch';
        b.style.background = v;
        b.dataset.value = v;
        b.addEventListener('click', () => this._set(group, v));
        host.appendChild(b);
      }
    };
    const chips = (group, options) => {
      const host = this.el.querySelector(`[data-group="${group}"] .chips`);
      host.innerHTML = '';
      for (const o of options) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = o.label;
        b.dataset.value = o.id;
        b.addEventListener('click', () => this._set(group, o.id));
        host.appendChild(b);
      }
    };

    swatch('skin', SKIN);
    swatch('hairColor', HAIR_COLOR);
    swatch('coat', COAT);
    chips('hairStyle', HAIR_STYLE);
    chips('build', BUILD);
  }

  _bind() {
    this.nameEl = this.el.querySelector('.creator-name');
    this.heightEl = this.el.querySelector('.creator-height');

    this.nameEl.addEventListener('input', () => {
      this.appearance.name = this.nameEl.value.trim() || 'Visitor';
    });
    this.heightEl.addEventListener('input', () => {
      this.appearance.height = parseFloat(this.heightEl.value);
      this._rebuild();
    });
    this.el.querySelector('.creator-random').addEventListener('click', () => this._randomise());
    this.el.querySelector('.creator-go').addEventListener('click', () => this.finish());
    for (const b of this.el.querySelectorAll('[data-turn]')) {
      b.addEventListener('click', () => { this.spinVel += parseFloat(b.dataset.turn) * 2.6; });
    }
    // drag the figure to turn it
    let dragging = false, lastX = 0;
    this.canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.spin += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
      this.spinVel = 0;
    });
    window.addEventListener('resize', () => this._resizePreview());
  }

  _set(key, value) {
    this.appearance[key] = value;
    // the coat picks the trousers, so the figure stays coordinated for free
    if (key === 'coat') this.appearance.trousers = trousersFor(value);
    this._sync();
    this._rebuild();
  }

  _randomise() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const coat = pick(COAT);
    this.appearance = {
      ...this.appearance,
      skin: pick(SKIN),
      hairStyle: pick(HAIR_STYLE).id,
      hairColor: pick(HAIR_COLOR),
      coat,
      trousers: trousersFor(coat),
      accessory: 'none',
      build: pick(BUILD).id,
      height: 0.88 + Math.random() * 0.24,
    };
    this._sync();
    this._rebuild();
  }

  /** Push the current appearance back into the controls' selected states. */
  _sync() {
    for (const b of this.el.querySelectorAll('.swatch, .chip')) {
      const group = b.closest('.creator-group').dataset.group;
      b.classList.toggle('on', String(this.appearance[group]) === b.dataset.value);
    }
    if (this.nameEl) this.nameEl.value = this.appearance.name ?? 'Visitor';
    if (this.heightEl) this.heightEl.value = String(this.appearance.height ?? 1);
  }

  // ------------------------------------------------------------- lifecycle --
  open() {
    if (!this.renderer) this._initPreview();
    this.el.classList.add('on');
    this._sync();
    this._rebuild();
    requestAnimationFrame(() => this._resizePreview());
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      if (!this.renderer) return;
      const dt = 0.016;
      this.spinVel *= 0.94;
      this.spin += this.spinVel * dt * 6;
      this.turntable.rotation.y = this.spin;
      this._figure?.animate(performance.now() / 1000, false);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  finish() {
    saveAppearance(this.appearance);
    this.el.classList.remove('on');
    cancelAnimationFrame(this._raf);
    this._raf = null;
    // Hand the GPU back its second context. Browsers allow only a handful of
    // live WebGL contexts, and leaving this one running alongside the building
    // was costing a full render target and its own draw loop for a preview
    // nobody can see any more.
    setTimeout(() => this.dispose(), 500);
    this.onDone({ ...this.appearance });
  }

  dispose() {
    if (!this.renderer) return;
    if (this._figure) {
      this._figure.group.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry?.dispose?.();
        for (const m of [].concat(o.material)) { m?.map?.dispose?.(); m?.dispose?.(); }
      });
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer = null;
    this._figure = null;
  }
}
