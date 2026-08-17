import * as THREE from 'three';
import {
  ROOMS, ROOM_BY_ID, WALLS, DOORS, STAIRS, BOUNDS, WALL_H, UPPER_Y,
} from './floorplan.js';
import { M, PALETTE, box, cyl, paint, surface, decal, textPlate, mergeStatic } from './materials.js';
import { buildDaylight } from './sunlight.js';
import { buildApproach } from './road.js';
import { railing, plant } from './props.js';
import { Door, shopSign } from './Door.js';
import { Cutaway } from './Cutaway.js';
import { Nav } from './Nav.js';
import { Ctx } from './Ctx.js';

import { buildLobby } from './rooms/lobby.js';
import { buildHall } from './rooms/hall.js';
import { buildLab } from './rooms/lab.js';
import { buildClassroom } from './rooms/classroom.js';
import { buildPartners } from './rooms/partners.js';
import { buildLibrary } from './rooms/library.js';

// -----------------------------------------------------------------------------
// Building — reads floorplan.js and raises the shell: floors, walls with their
// openings, stairs, the balcony landing, doors, and the exterior. Then it hands
// each room a Ctx and lets that room's own file furnish it.
//
// Nothing here knows what a robot arm is. Nothing in rooms/ knows how a wall is
// cut. That separation is what keeps a building this size editable.
// -----------------------------------------------------------------------------

const WALL_T = 0.5;                       // wall thickness
const ROOM_BUILDERS = {
  lobby: buildLobby, hall: buildHall, lab: buildLab, classroom: buildClassroom,
  partners: buildPartners, library: buildLibrary,
};

export function buildBuilding() {
  const group = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const animate = [];
  const lights = [];
  const floorMeshes = [];
  const cutaway = new Cutaway();
  const nav = new Nav();
  const doors = {};

  // ------------------------------------------------------------ exterior ---
  // Lawn, not the concrete apron this used to sit on. The grass texture is
  // baked by tools/bake_textures.py: clumped tone variation with fourteen
  // thousand short blades laid over it, which is what stops a large flat plane
  // reading as a green rectangle from thirty units up.
  // The height goes *into* decal(), not on after it — the render order and the
  // polygon offset are both derived from it, so moving the mesh afterwards
  // leaves it layered as though it were somewhere else.
  //
  // -0.40 puts it below the room floor slabs, which are 0.3 thick with their
  // top at zero; a lawn anywhere above -0.30 runs through all six of them.
  //
  // repeat 16 rather than 26: a 220-unit plane tiled 26 times minifies hard in
  // the distance, and that shimmer reads as the ground glitching.
  const ground = decal(220, 220, surface({
    map: 'grass', repeat: [16, 16], color: '#b9d69a', roughness: 1, normalScale: 0.3,
  }), -0.40);
  ground.position.x = 0; ground.position.z = 0;
  group.add(ground);

  // A darker mown band right around the building, so the walls meet something
  // rather than floating on a tile pattern.
  // 0.08 above the lawn, not 0.01. These two overlap across eighty-eight units
  // by a hundred and four, so a hundredth of a unit between them is the largest
  // z-fight in the project — most of what you see outdoors was flickering.
  const verge = decal(104, 88, surface({
    map: 'grass', repeat: [9, 8], color: '#a7cb87', roughness: 1,
  }), -0.30);
  verge.position.x = 0; verge.position.z = -2;
  group.add(verge);

  // shrubs and tufts scattered along the approach — cheap, merged, and the only
  // thing that stops the lawn looking like a putting green
  const shrubMat = surface({ map: 'fabric', repeat: [2, 2], color: '#6f9a49', roughness: 1 });
  shrubMat.name = 'planting';        // so a test can find them after merging
  const tufts = new THREE.Group();
  tufts.name = 'planting';
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  // Keep-out rectangles: every room, plus the forecourt and the path to the
  // door. Scattering on a radius alone put shrubs inside the robotics bays,
  // because the building is not round and the rooms reach well past any radius
  // small enough to keep the lawn looking planted.
  const keepOut = ROOMS.map((r) => ({
    x0: r.x0 - 2.5, x1: r.x1 + 2.5, z0: r.z0 - 2.5, z1: r.z1 + 2.5,
  }));
  keepOut.push({ x0: -15, x1: 15, z0: 24, z1: 44 });     // forecourt and steps
  const inside = (x, z) => keepOut.some(
    (k) => x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1);

  for (let i = 0; i < 320 && tufts.children.length < 120; i++) {
    const x = BOUNDS.x0 - 6 + rnd() * (BOUNDS.x1 - BOUNDS.x0 + 12);
    const z = BOUNDS.z0 - 6 + rnd() * (BOUNDS.z1 - BOUNDS.z0 + 12);
    if (inside(x, z)) continue;

    const sc = 0.5 + rnd() * 1.1;
    const bush = box(1.5 * sc, 1.15 * sc, 1.4 * sc, shrubMat, { rough: 0.09, cast: true });
    bush.position.set(x, 0.5 * sc - 0.1, z);
    bush.rotation.y = rnd() * 3;
    tufts.add(bush);

    if (rnd() > 0.62) {
      const tx = x + (rnd() - 0.5) * 3, tz = z + (rnd() - 0.5) * 3;
      if (inside(tx, tz)) continue;
      const t = box(0.5 * sc, 0.55 * sc, 0.5 * sc, shrubMat, { rough: 0.06, cast: false });
      t.position.set(tx, 0.24 * sc - 0.1, tz);
      tufts.add(t);
    }
  }
  mergeStatic(tufts);
  group.add(tufts);

  // forecourt + steps up to the front door
  const court = decal(26, 16, M.stone([6, 4]), -0.04);
  court.position.x = 0; court.position.z = 34;
  group.add(court);
  for (let i = 0; i < 3; i++) {
    const s = box(9 - i * 0.6, 0.22, 1.5, M.stone([3, 1]));
    s.position.set(0, 0.11 - i * 0.22, 27.4 + i * 1.5);
    group.add(s);
  }

  // ------------------------------------------------------------- floors ----
  for (const r of ROOMS) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const rep = [Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(d / 4))];
    const mat = r.floor === 'tile' ? M.floorTile(rep)
      : r.floor === 'concrete' ? M.floorConcrete(rep)
        : M.floorWood(rep);
    const geo = new THREE.BoxGeometry(w, 0.3, d);
    const f = new THREE.Mesh(geo, mat);
    f.position.set((r.x0 + r.x1) / 2, r.y - 0.15, (r.z0 + r.z1) / 2);
    f.receiveShadow = true;
    f.name = `floor_${r.id}`;
    f.userData.room = r.id;
    group.add(f);
    floorMeshes.push(f);

    // skirting, so floor and wall meet in something other than a seam
    addSkirting(group, r);
  }

  // the solid mass the library stands on — from inside the hall it reads as the
  // back wall, from outside as the plinth of a two-storey block
  // Its top must finish *below* the library floor, not level with it. At full
  // UPPER_Y height the plinth's top face and the library floor's top face were
  // the same plane over the same footprint, and the depth buffer flickered
  // between the two textures as the camera moved — the twitch you could see
  // walking across the library.
  const PLINTH_H = UPPER_Y - 0.34;
  const plinth = box(32, PLINTH_H, 18.5, M.plaster('#cbb894', [8, 3]));
  plinth.position.set(0, PLINTH_H / 2, -20.75);
  group.add(plinth);
  colliders.push({ x: 0, z: -20.75, w: 32, d: 18.5, y: 0 });

  // ------------------------------------------------------------- walls -----
  for (const spec of WALLS) buildWall(group, colliders, cutaway, spec);

  // -------------------------------------------------------- stairs + landing
  buildStairs(group, colliders, cutaway);
  buildLanding(group, colliders, floorMeshes);

  // ------------------------------------------------------------- doors -----
  for (const spec of DOORS) {
    const d = new Door(spec);
    group.add(d.group);
    doors[spec.id] = d;
    animate.push((dt, player) => d.update(dt, player));
  }

  // hanging sign + a pair of planters outside the front door
<<<<<<< Updated upstream
  const sign = shopSign('ANALOGUE INTELLIGENCE', 'Software, AI, and Creativity');
  sign.position.set(0, 7.4, 26.9);
=======
  // Outside the front door, which moved to z = 30 when the lobby was deepened —
  // the sign and its planters were left standing in the middle of the lobby.
  // y = 6.55 sits the board clear above the 5.6 doorway with the bar under the
  // 8-unit wall top.
  const sign = shopSign('ANALOGUE INTELLIGENCE', 'Software, AI, and Creativity');
  sign.position.set(0, 6.55, 30.9);
>>>>>>> Stashed changes
  group.add(sign);
  for (const sx of [-1, 1]) {
    const p = plant(1.25);
    p.position.set(sx * 5, 0, 32.6);
    group.add(p);
  }

  // ---------------------------------------------------- furnish the rooms ---
  const ctx = new Ctx({ group, colliders, interactables, animate, lights });
  for (const r of ROOMS) {
    ctx.room = r.id;
    ROOM_BUILDERS[r.id]?.(ctx, r);
  }
  // the approach belongs to no room, so it is never shrouded and its sign is
  // always readable — which matters, because reading it is the tutorial
  ctx.room = 'approach';
  buildApproach(ctx);
  ctx.room = null;

  const spawn = new THREE.Vector3(0, 0, 26.5);   // used only when the prologue is skipped
  const tick = (dt, playerPos) => { for (const fn of animate) fn(dt, playerPos); };

  // daylight last, so a window can sit in front of whatever the room builder put
  // against that wall rather than behind it
  buildDaylight(group, ROOMS, animate, cutaway);

  buildInvisibleCeilings(group);
  trimShadows(group);
  const merged = mergeSceneStatics(group, { tick, interactables, cutaway, doors });

  return {
    merged,
    group, floorMeshes, colliders, interactables, doors, cutaway, nav,
    spawn, rooms: ROOMS, roomById: ROOM_BY_ID, lamps: lights, tick,
  };
}

/**
 * Decide what is actually worth casting a shadow.
 *
 * The shadow pass re-draws every caster in the scene, every frame, from the
 * light's point of view — so leaving `castShadow` on all 1,400 meshes doubles
 * the entire cost of the frame to render shadows from teapot handles and shelf
 * brackets that are three pixels across. Anything smaller than a stool is
 * demoted to receiving only; the furniture, the walls and the people still cast.
 *
 * Small props also stop *receiving*, which lets three.js skip the shadow lookup
 * in their fragment shader entirely.
 */
function trimShadows(group, minRadius = 1.05) {
  let cast = 0, total = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.ceiling) { cast++; total++; return; }
    total++;
    const g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const r = (g.boundingSphere?.radius ?? 0) * Math.max(
      Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z));
    if (r < minRadius) { o.castShadow = false; o.receiveShadow = false; }
    if (o.castShadow) cast++;
  });
  group.userData.shadowCasters = cast;
  group.userData.meshCount = total;
}

// ---------------------------------------------------------------- helpers ---

/**
 * A wall run, minus its openings. Each solid stretch becomes one mesh and one
 * collider; each opening gets a lintel above it so the wall still reads whole.
 */
function buildWall(group, colliders, cutaway, spec) {
  const { axis, at, from, to, y, h } = spec;
  const openings = (spec.openings ?? []).slice().sort((a, b) => a.from - b.from);
  const mat = M.plaster(spec.tint ?? '#6a6257',
    [Math.max(2, Math.round(Math.abs(to - from) / 4)), Math.max(1, Math.round(h / 4))]);

  const segments = [];
  let cursor = from;
  for (const o of openings) {
    if (o.from > cursor) segments.push([cursor, o.from, h, y]);
    // lintel over the opening
    const lh = h - o.h;
    if (lh > 0.05) segments.push([o.from, o.to, lh, y + o.h]);
    cursor = o.to;
  }
  if (cursor < to) segments.push([cursor, to, h, y]);

  for (const [a, b, sh, sy] of segments) {
    const len = b - a;
    if (len <= 0.001) continue;
    const mid = (a + b) / 2;
    const mesh = axis === 'x'
      ? box(WALL_T, sh, len, mat, { rough: 0.01 })
      : box(len, sh, WALL_T, mat, { rough: 0.01 });
    mesh.position.set(axis === 'x' ? at : mid, sy + sh / 2, axis === 'x' ? mid : at);
    mesh.receiveShadow = true;
    group.add(mesh);
    cutaway.add(mesh, axis, at);

    // only full-height stretches block movement; lintels sit overhead
    if (sy <= y + 0.01) {
      colliders.push(axis === 'x'
        ? { x: at, z: mid, w: WALL_T, d: len, y }
        : { x: mid, z: at, w: len, d: WALL_T, y });
    }
  }

  // a thin cornice along the top edge catches the key light
  const runLen = to - from;
  const cor = axis === 'x'
    ? box(WALL_T + 0.14, 0.22, runLen, M.wood('#4a3a2a', [1, 1]))
    : box(runLen, 0.22, WALL_T + 0.14, M.wood('#4a3a2a', [1, 1]));
  cor.position.set(axis === 'x' ? at : (from + to) / 2, y + h - 0.11,
    axis === 'x' ? (from + to) / 2 : at);
  group.add(cor);
  cutaway.add(cor, axis, at);
}

/** Baseboard around a room's inner perimeter. */
function addSkirting(group, r) {
  const mat = M.wood('#3f2f20', [4, 1]);
  const t = 0.16, h = 0.42;
  const runs = [
    [(r.x0 + r.x1) / 2, r.z0 + t / 2, r.x1 - r.x0, t],
    [(r.x0 + r.x1) / 2, r.z1 - t / 2, r.x1 - r.x0, t],
    [r.x0 + t / 2, (r.z0 + r.z1) / 2, t, r.z1 - r.z0],
    [r.x1 - t / 2, (r.z0 + r.z1) / 2, t, r.z1 - r.z0],
  ];
  for (const [x, z, w, d] of runs) {
    const m = box(w, h, d, mat);
    m.position.set(x, r.y + h / 2, z);
    m.castShadow = false;
    group.add(m);
  }
}

/** The stair run against the hall's east wall, plus its stringer and rail. */
function buildStairs(group, colliders, cutaway) {
  const { x0, x1, zBottom, zTop, yTop } = STAIRS;
  const w = x1 - x0, run = zBottom - zTop, steps = 16;
  const treadMat = M.stone([1, 1]);
  const riserMat = M.wood('#4a3320', [1, 1]);

  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    const zc = zBottom - (i + 0.5) * (run / steps);
    const top = yTop * t;
    const tread = box(w, 0.16, run / steps + 0.04, treadMat);
    tread.position.set((x0 + x1) / 2, top - 0.08, zc);
    tread.receiveShadow = true;
    group.add(tread);
    const riser = box(w, yTop / steps, 0.12, riserMat);
    riser.position.set((x0 + x1) / 2, top - yTop / steps / 2, zc - run / steps / 2);
    group.add(riser);
  }
  // closed stringer down the open side, so you don't see under the flight
  const stringer = box(0.28, 1.5, Math.hypot(run, yTop), M.wood('#4a3320', [1, 2]));
  stringer.position.set(x0 + 0.05, yTop / 2 - 0.55, (zBottom + zTop) / 2);
  stringer.rotation.x = Math.atan2(yTop, run);
  group.add(stringer);

  // banister above it, following the same pitch
  const rail = railing(Math.hypot(run, yTop), 'z');
  rail.position.set(x0 - 0.02, yTop / 2 - 0.2, (zBottom + zTop) / 2);
  rail.rotation.x = Math.atan2(yTop, run);
  group.add(rail);
  // The banister blocks you at ground level and at the top, but colliders are
  // matched to the floor they sit on — so without a third at mid-height there's
  // a stretch halfway up the flight where you could walk straight through it.
  for (const cy of [0, UPPER_Y / 2, UPPER_Y]) {
    colliders.push({ x: x0 - 0.25, z: (zBottom + zTop) / 2, w: 0.3, d: run, y: cy });
  }
}

/** The balcony landing at the top of the stairs, hanging over the hall. */
function buildLanding(group, colliders, floorMeshes) {
  // 0.02 below the library floor, whose slab covers this same footprint. Level
  // with it, the two top faces shared a plane and flickered against each other
  // exactly like the plinth did.
  const slab = box(8, 0.36, 3.5, M.floorWood([2, 1]));
  slab.position.set(12, UPPER_Y - 0.20, -9.75);
  slab.receiveShadow = true;
  slab.name = 'floor_landing';
  group.add(slab);
  floorMeshes.push(slab);

  for (const [x, z] of [[8.4, -8.4], [8.4, -11.1]]) {
    const post = box(0.4, UPPER_Y, 0.4, M.wood('#4a3320', [1, 3]));
    post.position.set(x, UPPER_Y / 2, z);
    group.add(post);
    colliders.push({ x, z, w: 0.4, d: 0.4, y: 0 });
  }

  const r1 = railing(3.4, 'z');
  r1.position.set(8.1, UPPER_Y, -9.75);
  group.add(r1);
  colliders.push({ x: 8.0, z: -9.75, w: 0.3, d: 3.4, y: UPPER_Y });

  const r2 = railing(3.5, 'x');
  r2.position.set(9.8, UPPER_Y, -8.1);
  group.add(r2);
  colliders.push({ x: 9.8, z: -8.0, w: 3.5, d: 0.3, y: UPPER_Y });
}

/**
 * Merge everything in the building that demonstrably never moves.
 *
 * The problem with merging a scene automatically is knowing what is safe: a
 * bookshelf can be baked into one buffer, a robot arm cannot. Rather than
 * maintain a hand-written list that will drift the first time someone adds a
 * prop, this just *runs the animation* for a couple of simulated seconds and
 * watches which meshes actually change. Anything whose transform and visibility
 * are identical at the end is static by demonstration, not by assertion.
 *
 * Material changes survive merging — the merged mesh keeps the original
 * material object — so proximity glow and live canvas textures are unaffected.
 * Interactables, doors and the cutaway walls are excluded outright regardless,
 * because those three are animated from outside the tick loop.
 */
function mergeSceneStatics(group, { tick, interactables, cutaway, doors }) {
  const before = performance.now();
  const exclude = new Set();
  const bar = (o) => o?.traverse?.((c) => exclude.add(c));

  for (const it of interactables) bar(it.object);
  for (const w of cutaway.walls) exclude.add(w.mesh);
  for (const id of Object.keys(doors)) bar(doors[id].group);

  const sample = () => {
    const map = new Map();
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!o.isMesh) return;
      const e = o.matrixWorld.elements;
      let h = o.visible ? 1 : 0;
      for (let i = 0; i < 16; i++) h = (h * 31 + Math.round(e[i] * 4096)) | 0;
      map.set(o, h);
    });
    return map;
  };

  const first = sample();
  // Run the animation across a wide time window, with the player nowhere near
  // anything, so proximity-driven motion stays out of the sample.
  const far = new THREE.Vector3(0, 0, 200);
  // 24 ticks across a wide dt spread catches everything 64 did, at a third of
  // the startup cost — this probe runs before the first frame can be drawn.
  for (let i = 0; i < 24; i++) tick(0.041 + (i % 7) * 0.019, far);
  const second = sample();

  for (const [mesh, h] of first) {
    if (second.get(mesh) !== h) bar(mesh);
  }

  // bucket the survivors by material and merge each bucket in place
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || exclude.has(o) || Array.isArray(o.material)) return;
    if (o.userData.ceiling) return;           // its material is the whole point
    const g = o.geometry;
    if (!g?.index || !g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });

  let saved = 0, baked = 0;
  const shed = new THREE.Group();
  shed.name = 'static_merged';
  for (const [, meshes] of buckets) {
    if (meshes.length < 2) continue;
    const holder = new THREE.Group();
    for (const m of meshes) { m.updateWorldMatrix(true, false); }
    // mergeStatic works in the holder's local space, so parent the originals to
    // it first — their world matrices are already correct and it sits at origin.
    for (const m of meshes) holder.attach(m);
    mergeStatic(holder);
    saved += meshes.length - holder.children.length;
    for (const child of holder.children) {
      child.updateWorldMatrix(true, false);
      bakeVertexLight(child);
      baked++;
    }
    shed.add(...holder.children);
  }
  group.add(shed);

  const ms = Math.round(performance.now() - before);
  return { drawCallsSaved: saved, vertexLitMeshes: baked, ms };
}

/**
 * Bake a light bounce and a contact darkening into vertex colours.
 *
 * Two tricks straight out of Bruno Simon's portfolio case study, adapted to a
 * scene that is generated rather than modelled in Blender.
 *
 *   · **Faked floor bounce.** True bounce lighting is not affordable in real
 *     time, so he approximated it: the more a face points at the ground and the
 *     closer it is, the more it takes the floor's colour. Here the floor is
 *     warm boards, so downward-facing geometry near it picks up a little amber.
 *
 *   · **Baked contact shadow.** He baked his in Blender and shipped PNGs. We
 *     have no Blender, but we do have the geometry on the CPU at build time, so
 *     the same information can go straight into a colour attribute: darken
 *     vertices close to the floor, which is where a real contact shadow lives.
 *
 * Both are free at runtime — a vertex colour costs one multiply in the shader —
 * and they add exactly the grounded, soft-shaded quality that separates a
 * modelled scene from a pile of lit primitives.
 */
const BOUNCE = new THREE.Color('#e8b478');     // the floor's colour, roughly
const BOUNCE_REACH = 2.6;                      // how far up it carries
const CONTACT_REACH = 0.85;                    // how far up the darkening goes

function bakeVertexLight(mesh, floorY = 0) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!pos || !nor || geo.attributes.color) return;

  const col = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    n.fromBufferAttribute(nor, i);

    const height = Math.max(0, v.y - floorY);

    // downward-facing and low: takes colour back off the floor
    const downness = Math.max(0, -n.y);
    const near = Math.max(0, 1 - height / BOUNCE_REACH);
    const bounce = downness * near * near * 0.42;

    // anything close to the floor sits in its own contact shadow, whichever
    // way it faces — strongest right at the join
    const contact = Math.pow(Math.max(0, 1 - height / CONTACT_REACH), 2) * 0.30;

    // and a gentle sky term the other way, so up-facing surfaces lift
    const sky = Math.max(0, n.y) * 0.06;

    const k = 1 - contact + sky;
    col[i * 3] = k + BOUNCE.r * bounce;
    col[i * 3 + 1] = k + BOUNCE.g * bounce * 0.72;
    col[i * 3 + 2] = k + BOUNCE.b * bounce * 0.4;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  // vertexColors is a material flag, and materials here are shared and cached,
  // so give this one its own copy rather than switching it on for every object
  // that happens to use the same paint.
  const m = mesh.material.clone();
  m.vertexColors = true;
  mesh.material = m;
}

/**
 * Roofs you cannot see.
 *
 * The building is drawn as a cutaway diorama, so no room has a ceiling. That is
 * right for the view and wrong for the light: with nothing overhead, the sun
 * lands on every interior surface at full strength, as though each room were an
 * open courtyard. Tabletops, shelf tops and the upper halves of wall panels
 * were receiving direct sun *and* the sky at once, clipping to white and losing
 * all their detail. The tops of things looked like they had stopped rendering;
 * they had actually run off the top of the exposure range.
 *
 * The fix is a ceiling that exists for the shadow map and for nothing else.
 * `colorWrite: false` means the mesh draws no pixels — the room is still open
 * to the camera — but it is a normal member of the shadow pass, so the sun is
 * blocked exactly as a real roof would block it. Interiors are then lit by the
 * hemisphere, the pooled lamps and the painted sun pools, which is what they
 * were always meant to be lit by.
 *
 * One quad per room, and it costs nothing to draw.
 */
function buildInvisibleCeilings(group) {
  for (const r of ROOMS) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(Math.PI / 2);                 // face down, toward the room

    const mat = new THREE.MeshBasicMaterial({
      colorWrite: false,                      // shadows only, never seen
      depthWrite: false,
      fog: false,
    });
    const lid = new THREE.Mesh(geo, mat);
    lid.position.set((r.x0 + r.x1) / 2, r.y + r.h - 0.05, (r.z0 + r.z1) / 2);
    lid.castShadow = true;
    lid.receiveShadow = false;
    lid.renderOrder = -1;
    lid.userData.ceiling = true;              // so the shadow trim leaves it be
    group.add(lid);
  }
}
