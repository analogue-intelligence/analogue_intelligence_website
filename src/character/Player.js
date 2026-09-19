import * as THREE from 'three';
import { buildFigure } from './figure.js';

// -----------------------------------------------------------------------------
// Player — the visitor.
//
// Driven like a person rather than a cursor: a heading you turn, and a speed
// that builds up and bleeds off instead of switching on and off. W is always
// "the way I am facing"; the camera rides behind, so that is also "into the
// screen".
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
    this.speed = 7.2;           // walking pace
    this.runSpeed = 11.5;       // with Shift held
    this.turnSpeed = 2.0;       // radians per second at full lock
    this.radius = 0.62;
    this.heading = Math.PI;     // facing -z, toward the building
    this._speed = 0;            // current signed speed along the heading
    this._turn = 0;             // current turn rate
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

  setPosition(v) { this.group.position.copy(v); this._targetY = v.y; this._speed = 0; }

  /** Face a direction outright (radians, 0 = +z). */
  setHeading(h) {
    this.heading = h;
    this.group.rotation.y = h;
    this._turn = 0;
  }

  /** Unit vector the visitor is facing, on the floor plane. */
  forward(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

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
    const cmd = this.revealed ? input.drive() : null;
    const throttle = cmd?.throttle ?? 0;
    const turnIn = cmd?.turn ?? 0;
    const top = cmd?.run ? this.runSpeed : this.speed;

    // Turning eases in and out a little, so a tap of A is a small correction
    // and holding it is a smooth pivot. D always swings you (and the view)
    // to the right, whether you are walking forwards or stepping back.
    this._turn += (turnIn - this._turn) * Math.min(dt * 12, 1);
    this.heading -= this._turn * this.turnSpeed * dt;
    this.heading = ((this.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.group.rotation.y = this.heading;

    // Speed builds and bleeds off rather than snapping — backwards is slower.
    const want = throttle >= 0 ? throttle * top : throttle * top * 0.55;
    const rate = Math.abs(want) > Math.abs(this._speed) ? 7 : 10;
    this._speed += (want - this._speed) * Math.min(dt * rate, 1);
    if (Math.abs(this._speed) < 0.02 && !throttle) this._speed = 0;

    this.moving = false;
    if (this._speed && this.revealed) {
      const f = this.forward(_fwd);
      const d = this._speed * dt;
      const movedX = this._tryAxis('x', f.x * d);
      const movedZ = this._tryAxis('z', f.z * d);

      if (movedX || movedZ) {
        this.moving = Math.abs(this._speed) > 0.6;
        this._stepAccum += Math.abs(this._speed) * dt;
        if (this._stepAccum > 2.1) { this._stepAccum = 0; this.onFootstep(); }
      } else {
        // walked into something: stop pushing rather than skating on the spot
        this._speed *= 0.5;
      }
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

const _fwd = new THREE.Vector3();
