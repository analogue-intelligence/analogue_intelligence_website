import * as THREE from 'three';
import {
  ROOMS, ROOM_BY_ID, WALLS, DOORS, STAIRS, BOUNDS, WALL_H, UPPER_Y,
} from './floorplan.js';
import { M, PALETTE, box, cyl, paint, surface, decal, textPlate, mergeStatic } from './materials.js';
import { buildDaylight } from './sunlight.js';
import { railing, plant } from './props.js';
import { Door, shopSign } from './Door.js';
import { Cutaway } from './Cutaway.js';
import { Nav } from './Nav.js';
import { Ctx } from './Ctx.js';

import { buildLobby } from './rooms/lobby.js';
import { buildHall } from './rooms/hall.js';
import { buildRobotics } from './rooms/robotics.js';
import { buildStudio } from './rooms/studio.js';
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
  lobby: buildLobby, hall: buildHall, robotics: buildRobotics,
  studio: buildStudio, library: buildLibrary,
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
  const ground = decal(220, 220, surface({
    map: 'grass', repeat: [30, 30], color: '#ffffff', roughness: 1, normalScale: 0.5,
  }), -0.06);
  ground.position.set(0, -0.06, 0);
  group.add(ground);

  // A darker mown band right around the building, so the walls meet something
  // rather than floating on a tile pattern.
  const verge = decal(104, 88, surface({
    map: 'grass', repeat: [14, 12], color: '#c6d8a8', roughness: 1,
  }), -0.05);
  verge.position.set(0, -0.05, -2);
  group.add(verge);

  // shrubs and tufts scattered along the approach — cheap, merged, and the only
  // thing that stops the lawn looking like a putting green
  const shrubMat = surface({ map: 'fabric', repeat: [2, 2], color: '#5d7a3a', roughness: 1 });
  const tufts = new THREE.Group();
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 26 + rnd() * 44;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8 + 4;
    // keep the forecourt and the path to the door clear
    if (Math.abs(x) < 14 && z > 22) continue;
    const s = 0.5 + rnd() * 1.1;
    const bush = box(1.5 * s, 1.15 * s, 1.4 * s, shrubMat, { rough: 0.09, cast: true });
    bush.position.set(x, 0.5 * s - 0.1, z);
    bush.rotation.y = rnd() * 3;
    tufts.add(bush);
    if (rnd() > 0.62) {
      const t = box(0.5 * s, 0.55 * s, 0.5 * s, shrubMat, { rough: 0.06, cast: false });
      t.position.set(x + (rnd() - 0.5) * 3, 0.24 * s - 0.1, z + (rnd() - 0.5) * 3);
      tufts.add(t);
    }
  }
  mergeStatic(tufts);
  group.add(tufts);

  // forecourt + steps up to the front door
  const court = decal(26, 16, M.stone([6, 4]), -0.04);
  court.position.set(0, -0.04, 34);
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
  const sign = shopSign('ANALOGUE INTELLIGENCE', 'Software, AI, and Creativity');
  sign.position.set(0, 7.4, 26.9);
  group.add(sign);
  for (const sx of [-1, 1]) {
    const p = plant(1.25);
    p.position.set(sx * 5, 0, 28.6);
    group.add(p);
  }

  // ---------------------------------------------------- furnish the rooms ---
  const ctx = new Ctx({ group, colliders, interactables, animate, lights });
  for (const r of ROOMS) {
    ctx.room = r.id;
    ROOM_BUILDERS[r.id]?.(ctx, r);
  }
  ctx.room = null;

  const spawn = new THREE.Vector3(0, 0, 22.5);
  const tick = (dt, playerPos) => { for (const fn of animate) fn(dt, playerPos); };

  // daylight last, so a window can sit in front of whatever the room builder put
  // against that wall rather than behind it
  buildDaylight(group, ROOMS, animate, cutaway);

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
  const slab = box(8, 0.36, 3.5, M.floorWood([2, 1]));
  slab.position.set(12, UPPER_Y - 0.18, -9.75);
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
  for (let i = 0; i < 64; i++) tick(0.037 + (i % 5) * 0.011, far);
  const second = sample();

  for (const [mesh, h] of first) {
    if (second.get(mesh) !== h) bar(mesh);
  }

  // bucket the survivors by material and merge each bucket in place
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || exclude.has(o) || Array.isArray(o.material)) return;
    const g = o.geometry;
    if (!g?.index || !g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });

  let saved = 0;
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
    shed.add(...holder.children);
  }
  group.add(shed);

  const ms = Math.round(performance.now() - before);
  return { drawCallsSaved: saved, ms };
}
