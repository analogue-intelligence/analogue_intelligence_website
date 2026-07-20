import * as THREE from 'three';
import { buildFigure } from './figure.js';

// -----------------------------------------------------------------------------
// Player — the chibi visitor. 3D movement via the Levels system (walkable
// mezzanine), collision against per-floor furniture, a soft warm lamp for mood
// (the room itself is daylit now), a walk animation, and an intro pop-in.
// -----------------------------------------------------------------------------
export class Player {
  constructor(colliders, levels) {
    this.colliders = colliders;
    this.levels = levels;
    this.speed = 6.5;
    this.radius = 0.7;
    this.level = 'ground';
    this._targetY = 0;
    this._stepAccum = 0;
    this._t = 0;
    this.onFootstep = () => {};
    this.moving = false;

    this.figure = buildFigure({
      skin: '#e79a5c', coat: '#c65a2e', coatTrim: '#9c3f1e',
      hair: '#2e2118', variant: 'player', scarf: '#e0c060',
    });
    this.group = this.figure.group;

    // soft warm personal light (subtle in a bright room, adds a glow at night-y corners)
    this.lamp = new THREE.PointLight(0xffd9a0, 10, 9, 2);
    this.lamp.position.set(0, 2.2, 0);
    this.group.add(this.lamp);

    this.group.scale.setScalar(0.001);   // hidden until intro reveals us
    this.revealed = false;
  }

  get position() { return this.group.position; }
  setPosition(v) { this.group.position.copy(v); this._targetY = v.y; }

  reveal() {                              // intro pop-in
    this.revealed = true;
    const start = performance.now();
    const anim = () => {
      const k = Math.min((performance.now() - start) / 450, 1);
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
      if (to.length() < 0.3) input.moveTarget = null;
      else dir = to.normalize();
    }

    this.moving = false;
    if (dir && this.revealed) {
      const prev = this.group.position.clone();
      const step = dir.clone().multiplyScalar(this.speed * dt);
      this._moveAxis('x', step.x);
      this._moveAxis('z', step.z);
      const r = this.levels.resolve(this.group.position.x, this.group.position.z, this.level);
      if (!r.ok) { this.group.position.copy(prev); }
      else {
        this.level = r.level; this._targetY = r.y; this.moving = true;
        this._stepAccum += this.speed * dt;
        if (this._stepAccum > 2.0) { this._stepAccum = 0; this.onFootstep(); }
      }
      const angle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y += ((angle - this.group.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(dt * 10, 1);
    }

    this.group.position.y += (this._targetY - this.group.position.y) * Math.min(dt * 9, 1);
    this.figure.animate(this._t, this.moving);
    this.lamp.intensity = 10 + Math.sin(this._t * 6) * 1.2;
  }

  _moveAxis(axis, amount) {
    if (amount === 0) return;
    const next = this.group.position.clone();
    next[axis] += amount;
    if (!this._collides(next)) this.group.position[axis] += amount;
  }

  _collides(pos) {
    for (const c of this.colliders) {
      if (c.level && c.level !== this.level) continue;
      const hx = c.w / 2 + this.radius, hz = c.d / 2 + this.radius;
      if (Math.abs(pos.x - c.x) < hx && Math.abs(pos.z - c.z) < hz) return true;
    }
    if (Math.abs(pos.x) > 12.2 || Math.abs(pos.z) > 12.2) return true;
    return false;
  }
}
