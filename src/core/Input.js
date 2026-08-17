import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Input — keyboard movement, click-to-move, and a small bus for one-shot keys.
//
// Movement accepts WASD *and* the arrow keys (either hand, or one hand on the
// mouse). Because the camera is a fixed 45° isometric, the raw input vector is
// rotated a quarter turn so "up" on the keyboard is "away from the camera" on
// screen rather than "toward -z in world space".
//
// Clicks are read on the canvas rather than the window: overlays sit above it in
// the stacking order and swallow their own clicks, so only genuine world clicks
// ever reach us here.
//
// On a touch screen there is no keyboard, so movement also accepts an analog
// axis fed by core/Touch.js. A press is only treated as a click if it ends
// quickly and near where it started — otherwise a thumb dragging a joystick
// would fire a walk-to-here command on every stroke.
// -----------------------------------------------------------------------------

export const IS_TOUCH = (() => {
  try {
    return window.matchMedia('(pointer: coarse)').matches
      || navigator.maxTouchPoints > 0;
  } catch { return false; }
})();

const TAP_MS = 300;          // longer than this and it was a drag, not a tap
const TAP_PX = 12;

const FORWARD = ['w', 'arrowup'];
const BACK = ['s', 'arrowdown'];
const LEFT = ['a', 'arrowleft'];
const RIGHT = ['d', 'arrowright'];
const ALL_MOVE = [...FORWARD, ...BACK, ...LEFT, ...RIGHT];

export class Input {
  constructor(engine, floorMeshes) {
    this.engine = engine;
    this.floors = floorMeshes ?? [];
    this.keys = new Set();
    this.moveTarget = null;
    this.enabled = true;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this._clickHandlers = [];
    this._keyHandlers = new Map();
    this._rot = new THREE.Vector3(0, 1, 0);
    // analog stick, in screen space: set by core/Touch.js, ignored otherwise
    this.axis = { x: 0, y: 0 };
    this.isTouch = IS_TOUCH;
    this._down = null;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (ALL_MOVE.includes(k)) {
        this.keys.add(k);
        this.moveTarget = null;
        if (k.startsWith('arrow')) e.preventDefault();   // stop the page scrolling
      }
      const hs = this._keyHandlers.get(k);
      if (hs) hs.forEach((fn) => fn(e));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    const canvas = engine.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this._down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      this._setPointer(e);
      // A mouse can act immediately; a finger has to prove it is not a drag.
      if (e.pointerType === 'mouse') this._act();
    });
    canvas.addEventListener('pointerup', (e) => {
      const d = this._down;
      this._down = null;
      if (!this.enabled || !d || e.pointerType === 'mouse') return;
      if (performance.now() - d.t > TAP_MS) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX) return;
      this._setPointer(e);
      this._act();
    });
    canvas.addEventListener('pointercancel', () => { this._down = null; });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this._setPointer(e);
    });
  }

  onObjectClick(fn) { this._clickHandlers.push(fn); }

  /** onKey('e', fn) — one-shot key, fires on keydown regardless of repeat. */
  onKey(key, fn) {
    const k = key.toLowerCase();
    if (!this._keyHandlers.has(k)) this._keyHandlers.set(k, []);
    this._keyHandlers.get(k).push(fn);
  }

  setFloors(meshes) { this.floors = meshes; }

  /** Objects first, then people, then the floor — same order as a mouse click. */
  _act() {
    for (const h of this._clickHandlers) { if (h(this.pointer)) return; }
    this._pickFloor();
  }

  _setPointer(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _pickFloor() {
    if (!this.floors.length) return;
    this.raycaster.setFromCamera(this.pointer, this.engine.camera);
    const hit = this.raycaster.intersectObjects(this.floors, false)[0];
    if (hit) this.moveTarget = hit.point.clone();
  }

  moveVector() {
    if (!this.enabled) return null;
    const v = new THREE.Vector3();
    if (FORWARD.some((k) => this.keys.has(k))) v.z -= 1;
    if (BACK.some((k) => this.keys.has(k))) v.z += 1;
    if (LEFT.some((k) => this.keys.has(k))) v.x -= 1;
    if (RIGHT.some((k) => this.keys.has(k))) v.x += 1;

    // the thumbstick pushes in screen space, which is the same space the keys
    // are interpreted in, so both go through the same quarter-turn rotation
    if (this.axis.x || this.axis.y) { v.x += this.axis.x; v.z += this.axis.y; }

    if (v.lengthSq() === 0) return null;
    v.applyAxisAngle(this._rot, Math.PI / 4);
    return v.normalize();
  }

  /** Fire a bound key handler from somewhere other than the keyboard. */
  press(key) {
    const hs = this._keyHandlers.get(key.toLowerCase());
    if (hs) hs.forEach((fn) => fn({ key }));
  }
}
