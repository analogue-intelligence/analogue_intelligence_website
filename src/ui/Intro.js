import * as THREE from 'three';
import { TITLE, SUBTITLE } from '../data/content.js';

// The play camera sits at player + (30, 34, 30). To end the flight looking down
// that same axis, the intro camera finishes on it too — 90 units out, which is
// far enough that perspective has flattened into something the orthographic
// camera can take over from without a visible cut.
const ISO_D = 90;
const ISO_LEN = Math.hypot(30, 34, 30);
const ISO_X = (30 / ISO_LEN) * ISO_D;
const ISO_Y = (34 / ISO_LEN) * ISO_D;
const ISO_Z = 22.5 + (30 / ISO_LEN) * ISO_D;

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
  { t: 0.00, pos: [10, 9, 60], look: [0, 5, 30], fov: 54 },
  { t: 0.34, pos: [3, 6.2, 42], look: [0, 5, 30], fov: 52 },
  { t: 0.56, pos: [0.4, 4.6, 33], look: [0, 4.2, 24], fov: 50 },
  { t: 0.68, pos: [0, 4.2, 28.6], look: [0, 2.2, 22], fov: 48 },
  // --- the settle -----------------------------------------------------------
  // Everything after this exists so the handover to the play camera is not a
  // cut. The old version ended at the doorway and then snapped to an
  // orthographic view over the player's shoulder, which after a slow arrival
  // through the front doors felt like being yanked backwards.
  //
  // Instead the camera climbs and swings round onto the isometric axis while
  // the field of view narrows. A perspective camera at 90 units with a 19.6°
  // vertical FOV frames almost exactly what the orthographic camera frames at
  // frustum 15.5 — so by the last frame the two images are nearly identical and
  // the swap is invisible.
  { t: 0.84, pos: [14, 14, 40], look: [0, 1.6, 24], fov: 34 },
  { t: 1.00, pos: [ISO_X, ISO_Y, ISO_Z], look: [0, 1.4, 22.5], fov: 19.6 },
];
const DURATION = 7.4;

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

    // the words clear before the camera starts to climb
    const fade = k < 0.36 ? 1 : Math.max(0, 1 - (k - 0.36) / 0.22);
    this.el.querySelector('.intro-inner').style.opacity = fade.toFixed(2);

    // hand over the moment the two framings agree, not after a pause
    if (k >= 1) this.finish();
  }

  _apply(k) {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOutQuad
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    let local = THREE.MathUtils.clamp((e - a.t) / (b.t - a.t), 0, 1);
    // ease within the segment as well, so the joins between keys are not felt
    local = local * local * (3 - 2 * local);

    this._a.fromArray(a.pos).lerp(this._b.fromArray(b.pos), local);
    const look = new THREE.Vector3().fromArray(a.look)
      .lerp(new THREE.Vector3().fromArray(b.look), local);

    const fov = (a.fov ?? 52) + ((b.fov ?? 52) - (a.fov ?? 52)) * local;
    if (Math.abs(this.engine.introCam.fov - fov) > 0.01) {
      this.engine.introCam.fov = fov;
      this.engine.introCam.updateProjectionMatrix();
    }
    this.engine.setCam(this._a, look);
  }

  /** How far through the flight we are, for anything that wants to fade in. */
  get progress() { return Math.min(this._t / DURATION, 1); }

  finish() {
    if (this.done) return;
    this.done = true;
    this.playing = false;
    // Seed the play camera with where the flight ended so its own easing has
    // nothing to catch up on — otherwise it lerps in from wherever it happened
    // to be pointing and the first second of play drifts.
    this.engine.seedLook(new THREE.Vector3(0, 1.4, 22.5));
    this.engine.cinematic = false;
    this.el.classList.remove('on');
    setTimeout(() => this.el.remove(), 900);
    this.onFinish();
  }
}
