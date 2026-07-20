import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Input — WASD → movement vector, and clicks on the CANVAS → either an object
// activation or a click-to-move target. Listening on the canvas (not window) is
// the fix for the earlier bug: UI overlays that sit above the canvas naturally
// intercept their own clicks, and only genuine world clicks reach us here.
// -----------------------------------------------------------------------------
export class Input {
  constructor(engine, floorMesh) {
    this.engine = engine;
    this.floor = floorMesh;
    this.keys = new Set();
    this.moveTarget = null;
    this.enabled = true;                 // intro disables movement input
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this._clickHandlers = [];

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k)) { this.keys.add(k); this.moveTarget = null; }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    const canvas = engine.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this._setPointer(e);
      for (const h of this._clickHandlers) { if (h(this.pointer)) return; }  // object hit → don't move
      this._pickFloor();
    });
    canvas.addEventListener('pointermove', (e) => this._setPointer(e));
  }

  onObjectClick(fn) { this._clickHandlers.push(fn); }

  _setPointer(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _pickFloor() {
    if (!this.floor) return;
    this.raycaster.setFromCamera(this.pointer, this.engine.camera);
    const hit = this.raycaster.intersectObject(this.floor, true)[0];
    if (hit) this.moveTarget = hit.point.clone();
  }

  moveVector() {
    if (!this.enabled) return null;
    const v = new THREE.Vector3();
    if (this.keys.has('w')) v.z -= 1;
    if (this.keys.has('s')) v.z += 1;
    if (this.keys.has('a')) v.x -= 1;
    if (this.keys.has('d')) v.x += 1;
    if (v.lengthSq() === 0) return null;
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    return v.normalize();
  }
}
