// -----------------------------------------------------------------------------
// Levels — resolves the player's floor height and which storey they're on, given
// a desired (x,z) and their current level. This is what makes the mezzanine
// genuinely walkable without any navmesh asset: three regions (ground, stairs
// ramp, mezzanine) and rules for stepping between them.
//
//   ground    : y = 0 everywhere (you can walk UNDER the balcony too)
//   stairs    : a ramp climbing from y=0 (front) to y=H (back)
//   mezzanine : y = H over the back balcony; railing blocks the open edge
// -----------------------------------------------------------------------------
export class Levels {
  constructor() {
    this.H = 5.0;                                   // mezzanine height
    this.mez    = { x0: -12, x1: 12, z0: -12, z1: -5 };  // balcony footprint
    this.stairs = { x0: 7.5, x1: 11.5, z0: -5, z1: 3 };  // stair run footprint
  }

  _in(x, z, r) { return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1; }

  // Ramp height along the staircase: 0 at the bottom (z=3) → H at the top (z=-5).
  stairHeight(z) {
    const t = (this.stairs.z1 - z) / (this.stairs.z1 - this.stairs.z0);
    return Math.max(0, Math.min(this.H, this.H * t));
  }

  // Given a candidate position and the current level, return the resolved
  // { y, level, ok }. ok=false means the move is blocked (e.g. off the railing).
  resolve(x, z, level) {
    const inStairs = this._in(x, z, this.stairs);
    const inMez = this._in(x, z, this.mez);

    if (level === 'ground') {
      if (inStairs) return { y: this.stairHeight(z), level: 'stairs', ok: true };
      return { y: 0, level: 'ground', ok: true };   // includes walking under the balcony
    }

    if (level === 'stairs') {
      if (inStairs) return { y: this.stairHeight(z), level: 'stairs', ok: true };
      if (z <= this.stairs.z0 && inMez) return { y: this.H, level: 'mezzanine', ok: true };
      if (z >= this.stairs.z1) return { y: 0, level: 'ground', ok: true };
      return { ok: false };                          // stepped off the side of the stairs
    }

    // mezzanine
    if (inMez) return { y: this.H, level: 'mezzanine', ok: true };
    if (inStairs && z >= this.stairs.z0) return { y: this.stairHeight(z), level: 'stairs', ok: true };
    return { ok: false };                            // railing edge
  }
}
