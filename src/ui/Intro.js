import * as THREE from 'three';
import { TITLE, SUBTITLE } from '../data/content.js';

// -----------------------------------------------------------------------------
// Intro — the arrival.
//
// A short perspective move from the forecourt, up the steps and through the
// front door, at which point the engine swaps to the orthographic play camera
// and the visitor appears. The point is to establish that this is a building
// before it becomes a diorama.
//
// Every keyframe is a position and a look-at, eased and interpolated; there is
// no path solver here on purpose, because four hand-placed keys read better
// than a spline through them.
// -----------------------------------------------------------------------------

const KEYS = [
  { t: 0.00, pos: [10, 9, 56], look: [0, 5, 26] },
  { t: 0.42, pos: [3, 6.2, 38], look: [0, 5, 26] },
  { t: 0.72, pos: [0.4, 4.6, 29], look: [0, 4.2, 20] },
  { t: 1.00, pos: [0, 4.2, 24.6], look: [0, 2.2, 17] },
];
const DURATION = 5.2;

export class Intro {
  constructor(engine, root) {
    this.engine = engine;
    this.done = false;
    this.playing = false;     // update() is a no-op until play() says otherwise
    this._t = 0;

    this.el = document.createElement('div');
    this.el.className = 'intro';
    this.el.innerHTML = `
      <div class="intro-inner">
        <div class="intro-title">${TITLE}</div>
        <div class="intro-sub">${SUBTITLE}</div>
        <div class="intro-hint">Walk with <b>W A S D</b> or the <b>arrow keys</b></div>
      </div>
      <button class="intro-skip">skip →</button>
    `;
    root.appendChild(this.el);
    this.el.querySelector('.intro-skip').addEventListener('click', () => this.finish());

    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this.onFinish = () => {};
  }

  play() {
    if (this.done) return;
    this.playing = true;
    this.engine.cinematic = true;
    this.el.classList.add('on');
    this._t = 0;
    this._apply(0);
  }

  update(dt) {
    // Without the `playing` guard this ran during character creation, finished
    // in the dark, and you arrived to find the flight already over.
    if (this.done || !this.playing) return;
    this._t += dt;
    const k = Math.min(this._t / DURATION, 1);
    this._apply(k);
    // the words fade out over the second half of the move
    const fade = k < 0.55 ? 1 : Math.max(0, 1 - (k - 0.55) / 0.35);
    this.el.querySelector('.intro-inner').style.opacity = fade.toFixed(2);
    if (k >= 1) this.finish();
  }

  _apply(k) {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOutQuad
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const local = THREE.MathUtils.clamp((e - a.t) / (b.t - a.t), 0, 1);
    this._a.fromArray(a.pos).lerp(this._b.fromArray(b.pos), local);
    const look = new THREE.Vector3().fromArray(a.look)
      .lerp(new THREE.Vector3().fromArray(b.look), local);
    this.engine.setCam(this._a, look);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.playing = false;
    this.engine.cinematic = false;
    this.el.classList.remove('on');
    setTimeout(() => this.el.remove(), 900);
    this.onFinish();
  }
}
