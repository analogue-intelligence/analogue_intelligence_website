import * as THREE from 'three';
import { buildFigure } from './figure.js';

// -----------------------------------------------------------------------------
// Player — the visitor.
//
// Movement is axis-separated so sliding along a wall feels right instead of
// stopping dead, and every candidate position is checked against Nav, which
// answers with a floor height or a refusal. Colliders carry the floor they sit
// on, so a bookshelf upstairs can't block you downstairs.
// -----------------------------------------------------------------------------
export class Player {
  constructor(colliders, nav, appearance) {
    this.colliders = colliders;
    this.nav = nav;
    // Brisk. The building is about a hundred units end to end, and at 7.6 the
    // walk between the two far rooms was long enough to be a chore.
    this.speed = 9.4;
    this.radius = 0.62;
    this._targetY = 0;
    this._stepAccum = 0;
    this._t = 0;
    this.onFootstep = () => {};
    this.moving = false;
    this.group = new THREE.Group();
    this.figure = null;

    this.lamp = new THREE.PointLight(0xffd9a0, 7, 8, 2);
    this.lamp.position.set(0, 2.2, 0);
    this.group.add(this.lamp);

    this.setAppearance(appearance);
    this.group.scale.setScalar(0.001);
    this.revealed = false;
  }

  /** Rebuild the body from a new appearance — used by the character creator. */
  setAppearance(appearance) {
    if (this.figure) this.group.remove(this.figure.group);
    this.figure = buildFigure(appearance);
    this.appearance = this.figure.appearance;
    this.group.add(this.figure.group);
  }

  get position() { return this.group.position; }
  get y() { return this.group.position.y; }

  setPosition(v) { this.group.position.copy(v); this._targetY = v.y; }

  reveal() {
    this.revealed = true;
    const start = performance.now();
    const anim = () => {
      const k = Math.min((performance.now() - start) / 480, 1);
      const e = 1 - Math.pow(1 - k, 3);
      this.group.scale.setScalar(0.001 + e);
      if (k < 1) requestAnimationFrame(anim); else this.group.scale.setScalar(1);
    };
    anim();
  }

  update(dt, input) {
    this._t += dt;
    let dir = input.moveVector();
    if (dir) { input.moveTarget = null; }
    else if (input.moveTarget) {
      const to = input.moveTarget.clone().sub(this.group.position); to.y = 0;
      if (to.length() < 0.35) input.moveTarget = null;
      else dir = to.normalize();
    }

    this.moving = false;
    if (dir && this.revealed) {
      const step = dir.clone().multiplyScalar(this.speed * dt);
      const movedX = this._tryAxis('x', step.x);
      const movedZ = this._tryAxis('z', step.z);

      if (movedX || movedZ) {
        this.moving = true;
        this._stepAccum += this.speed * dt;
        if (this._stepAccum > 2.1) { this._stepAccum = 0; this.onFootstep(); }
      }
      const angle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y +=
        ((angle - this.group.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(dt * 11, 1);
    }

    this.group.position.y += (this._targetY - this.group.position.y) * Math.min(dt * 10, 1);
    this.figure.animate(this._t, this.moving);
    this.lamp.intensity = 7 + Math.sin(this._t * 5) * 0.8;
  }

  /** Try to move on one axis; commit only if there's a legal floor and no prop. */
  _tryAxis(axis, amount) {
    if (Math.abs(amount) < 1e-5) return false;
    const p = this.group.position;
    const nx = axis === 'x' ? p.x + amount : p.x;
    const nz = axis === 'z' ? p.z + amount : p.z;

    const r = this.nav.resolve(nx, nz, this._targetY);
    if (!r.ok) return false;
    if (this._collides(nx, nz, r.y)) return false;

    p[axis] += amount;
    this._targetY = r.y;
    return true;
  }

  _collides(x, z, y) {
    for (const c of this.colliders) {
      if (Math.abs((c.y ?? 0) - y) > 2.2) continue;
      const hx = c.w / 2 + this.radius, hz = c.d / 2 + this.radius;
      if (Math.abs(x - c.x) < hx && Math.abs(z - c.z) < hz) return true;
    }
    return false;
  }
}
