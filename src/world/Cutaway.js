import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Cutaway — the reason you can see the visitor through the walls.
//
// The camera rides behind the visitor now and turns with them, so "which walls
// are in the way" is no longer a fixed rule about the south and east sides. It
// is the literal question: does the line from the camera to the visitor pass
// through this wall? Each registered wall keeps its world-space bounding box,
// and every frame two sight lines — to the visitor's chest and to the top of
// their head — are tested against it. A wall either line crosses dissolves to
// nothing; a wall neither line crosses stays solid. Walls right up against the
// camera also go, so the lens never ends up buried in plaster.
//
// The fade is per-wall and eased, so turning a corner swings the cut round
// with you rather than popping.
// -----------------------------------------------------------------------------

const PAD = 0.45;           // how generously a sight line "touches" a wall
const NEAR_CAMERA = 1.4;    // anything closer than this to the lens goes too
const FADE_RATE = 7.5;

const _box = new THREE.Box3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _head = new THREE.Vector3();

/** Slab test: does the segment a→b cross the (padded) box? */
function segmentHitsBox(a, b, box, pad) {
  let t0 = 0, t1 = 1;
  for (const ax of ['x', 'y', 'z']) {
    const d = b[ax] - a[ax];
    const lo = box.min[ax] - pad, hi = box.max[ax] + pad;
    if (Math.abs(d) < 1e-9) {
      if (a[ax] < lo || a[ax] > hi) return false;
      continue;
    }
    let ta = (lo - a[ax]) / d, tb = (hi - a[ax]) / d;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

export class Cutaway {
  constructor() {
    this.walls = [];        // { mesh, box, k, mat }
    this.camera = null;     // set by main.js; without it nothing is cut
  }

  /**
   * Register something that may stand between the camera and the visitor.
   * `axis` and `coord` are accepted for compatibility with the old fixed-angle
   * version and are no longer needed — the bounding box says it all.
   */
  add(mesh, axis = null, coord = null, opts = {}) {
    // Walls need their own material instance: they animate opacity independently.
    mesh.material = mesh.material.clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    const entry = {
      mesh, box: null, k: 1, mat: mesh.material,
      axis, coord, isWall: !!opts.wall,
      attached: [],           // things hung on this wall — hidden with it
    };
    this.walls.push(entry);
    return entry;
  }

  /**
   * Hang something on a wall, as far as the cutaway is concerned: when the
   * wall dissolves, so does whatever is mounted on it. Otherwise a framed
   * print, a notice board or a stained-glass window is left floating in the
   * air where the wall used to be.
   */
  attach(entry, object) {
    entry.attached.push(object);
    // Their own bounds are tested too: a sign over a doorway can be squarely
    // in the way while the sight line slips through the opening beneath it
    // and never touches the wall.
    object.updateWorldMatrix?.(true, true);
    const b = new THREE.Box3().setFromObject(object);
    if (!b.isEmpty()) (entry.abox ??= new THREE.Box3()).union(b);
  }

  /**
   * Something overhead — a pendant, a run of bunting, a hanging plant. The old
   * camera looked down from far above, so none of it could ever get in the
   * way; a camera riding behind you at head-and-a-half height can end up
   * staring through a lampshade. These are simply hidden while a sight line
   * crosses them (no fade: their materials are shared and merged).
   */
  addOccluder(objects, box) {
    this.walls.push({
      mesh: null, box, k: 1, mat: null, isWall: false, occluder: true,
      attached: objects,
    });
  }

  update(dt, playerPos) {
    const cam = this.camera;
    if (!cam) return;
    _a.copy(cam.position);
    _b.copy(playerPos); _b.y += 1.2;
    _head.copy(playerPos); _head.y += 2.9;

    for (const w of this.walls) {
      if (w.occluder) {
        const inWay = segmentHitsBox(_a, _b, w.box, 0.3)
          || segmentHitsBox(_a, _head, w.box, 0.2)
          || w.box.distanceToPoint(_a) < NEAR_CAMERA;
        const shown = !inWay;
        if ((w.k > 0.5) !== shown) {
          w.k = shown ? 1 : 0;
          for (const a of w.attached) a.visible = shown;
        }
        continue;
      }
      if (!w.box) {
        w.mesh.updateWorldMatrix(true, false);
        w.box = new THREE.Box3().setFromObject(w.mesh);
        // A wall does not move, but a thin one can be thinner than the padding
        // makes sensible; the padding handles grazing lines.
      }
      const inWay = segmentHitsBox(_a, _b, w.box, PAD)
        || segmentHitsBox(_a, _head, w.box, PAD * 0.5)
        || w.box.distanceToPoint(_a) < NEAR_CAMERA;
      const target = inWay ? 0 : 1;
      if (w.abox) {
        const hangIn = segmentHitsBox(_a, _b, w.abox, 0.2)
          || segmentHitsBox(_a, _head, w.abox, 0.1)
          || w.abox.distanceToPoint(_a) < NEAR_CAMERA;
        const shown = w.k > 0.5 && !hangIn;
        if (shown !== w._aShown) {
          w._aShown = shown;
          for (const a of w.attached) a.visible = shown;
        }
      }
      if (w.k === target) continue;
      w.k += (target - w.k) * Math.min(dt * FADE_RATE, 1);
      if (Math.abs(w.k - target) < 0.01) w.k = target;

      const o = w.k;
      w.mat.opacity = o;
      // Once a wall is nearly gone, stop it writing depth so it can't punch a
      // hole in whatever is behind it.
      w.mat.depthWrite = o > 0.92;
      w.mesh.visible = o > 0.02;
    }
  }
}
