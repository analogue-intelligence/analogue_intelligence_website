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
// -----------------------------------------------------------------------------

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
      this._setPointer(e);
      for (const h of this._clickHandlers) { if (h(this.pointer)) return; }
      this._pickFloor();
    });
    canvas.addEventListener('pointermove', (e) => this._setPointer(e));
  }

  onObjectClick(fn) { this._clickHandlers.push(fn); }

  /** onKey('e', fn) — one-shot key, fires on keydown regardless of repeat. */
  onKey(key, fn) {
    const k = key.toLowerCase();
    if (!this._keyHandlers.has(k)) this._keyHandlers.set(k, []);
    this._keyHandlers.get(k).push(fn);
  }

  setFloors(meshes) { this.floors = meshes; }

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
    if (v.lengthSq() === 0) return null;
    v.applyAxisAngle(this._rot, Math.PI / 4);
    return v.normalize();
  }
}
