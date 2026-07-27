import { PLATFORMS, RAMPS } from './floorplan.js';

// -----------------------------------------------------------------------------
// Nav — "if I stand here, how high am I, and is that even allowed?"
//
// The old build hard-coded three regions and the rules between them. This one
// takes the platform and ramp rectangles straight from the floorplan and picks
// whichever candidate is nearest the height you're *already* at. That single
// rule is what lets the stair landing hang over the hall without the two floors
// arguing, and what lets you walk underneath the landing at ground level.
// -----------------------------------------------------------------------------

const STEP = 1.7;   // how far you can step up or down in one go

function inside(x, z, r, pad = 0) {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

export class Nav {
  constructor() {
    this.platforms = PLATFORMS;
    this.ramps = RAMPS;
  }

  /** Every floor height available at (x, z), ramps first so stairs win ties. */
  candidates(x, z) {
    const out = [];
    for (const r of this.ramps) if (inside(x, z, r)) out.push({ y: r.yAt(x, z), id: r.id, ramp: true });
    for (const p of this.platforms) if (inside(x, z, p)) out.push({ y: p.y, id: p.id, ramp: false });
    return out;
  }

  /**
   * Resolve a move. Returns { ok, y, id }. ok=false means "there's no floor
   * there you could reach from where you are", which the player treats as a wall.
   */
  resolve(x, z, currentY) {
    const cands = this.candidates(x, z);
    if (!cands.length) return { ok: false };

    // A staircase is carved through the floor of the room it stands in, so both
    // the ramp and that room's flat floor claim the same footprint. If we just
    // took the nearest height, the floor would win every time — it's always
    // exactly zero away from where you already are — and you'd never climb a
    // single step. So a ramp you can reach always wins.
    const ramps = cands.filter((c) => c.ramp && Math.abs(c.y - currentY) <= STEP);
    const pool = ramps.length ? ramps : cands;

    let best = null, bestD = Infinity;
    for (const c of pool) {
      const d = Math.abs(c.y - currentY);
      if (d < bestD) { best = c; bestD = d; }
    }
    if (bestD > STEP) return { ok: false };
    return { ok: true, y: best.y, id: best.id };
  }

  /** Ground height under a point, ignoring where the player currently is. */
  floorAt(x, z, preferY = 0) {
    const r = this.resolve(x, z, preferY);
    return r.ok ? r.y : preferY;
  }
}
