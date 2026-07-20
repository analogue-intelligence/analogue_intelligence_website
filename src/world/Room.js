import * as THREE from 'three';
import { PALETTE, mat, box, roughen, lathe, glowSprite, tileTexture, stainedGlass } from './materials.js';
import { Interactable } from '../interaction/Interactable.js';
import { Levels } from './Levels.js';

// -----------------------------------------------------------------------------
// Room — a sunlit antique library/bookshop. Daylight through stained glass,
// tiled floor, Tiffany pendant lamps, a curved-feel staircase up to a mezzanine
// of research books, an entrance door (animated in the intro), and lots of
// props. Geometry stays consistent with Levels (H=5, mez/stairs footprints).
//
// Returns { group, floorMesh, colliders, interactables, spawn, guidePos,
//           levels, door, tick }.
// -----------------------------------------------------------------------------
export function buildRoom() {
  const group = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const levels = new Levels();
  const H = levels.H, HALF = 13, WALL_H = 9;
  const animate = [];

  // give interactables their own material instance so proximity-glow never bleeds
  const register = (id, anchor, mesh) => {
    mesh.material = mesh.material.clone();
    interactables.push(new Interactable(id, anchor, mesh));
    return mesh;
  };

  // ---------------- FLOOR (tiled) ----------------
  const floorGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, 16, 16);
  floorGeo.rotateX(-Math.PI / 2); roughen(floorGeo, 0.01);
  const floorMesh = new THREE.Mesh(floorGeo,
    new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.75 }));
  floorMesh.receiveShadow = true; floorMesh.name = 'floor';
  group.add(floorMesh);

  addRug(group, 0, 10.5, 3.2, 6, '#a3352e');    // red entrance runner
  addRug(group, -6.5, 2, 6, 4, '#7a3550');

  // ---------------- WALLS (teal) ----------------
  const addWall = (x, z, w, d) => {
    const m = box(w, WALL_H, d, PALETTE.teal, { roughness: 1 });
    m.position.set(x, WALL_H / 2, z); group.add(m);
    colliders.push({ x, z, w, d, level: null });
  };
  addWall(0, -HALF, HALF * 2, 0.6);             // back
  addWall(-HALF, 0, 0.6, HALF * 2);             // left
  addWall(HALF, 0, 0.6, HALF * 2);              // right
  // front wall split around a door gap (gap x:-1.8..1.8)
  addWall(-7.4, HALF, 11.2, 0.6);
  addWall(7.4, HALF, 11.2, 0.6);
  // wainscot trim along walls
  [[-HALF + 0.4, 0, 0.2, HALF * 2], [0, -HALF + 0.4, HALF * 2, 0.2]].forEach(([x, z, w, d]) => {
    const t = box(w, 1.0, d, PALETTE.woodDk); t.position.set(x, 0.5, z); group.add(t);
  });

  // ---------------- STAINED GLASS + DAYLIGHT ----------------
  // Left wall: two tall panels facing +x
  [-4, 4].forEach((z) => {
    const sg = stainedGlass(5, 6, 4, 6);
    sg.position.set(-HALF + 0.35, 5, z); sg.rotation.y = Math.PI / 2;
    group.add(sg);
    group.add(placeGlow('#fff0c0', -HALF + 1, 5, z, 4));
    addSunPool(group, animate, -6.5, z, 4.5, 6);   // coloured light on the floor
  });
  // Back clerestory band, facing +z, up high
  for (let x = -9; x <= 9; x += 6) {
    const sg = stainedGlass(5, 2.4, 4, 3);
    sg.position.set(x, 7.4, -HALF + 0.35);
    group.add(sg);
  }
  // Right wall upper window
  const sgR = stainedGlass(4.5, 4, 4, 4);
  sgR.position.set(HALF - 0.35, 6.4, 5); sgR.rotation.y = -Math.PI / 2;
  group.add(sgR);
  addSunPool(group, animate, 6.5, 6, 4, 5);

  // wall pictures (framed) on the teal
  [[-2, '#c98a3a'], [2, '#5b8f86'], [6, '#a85b7a']].forEach(([z, c]) => {
    const frame = box(0.14, 1.5, 1.1, PALETTE.woodDk); frame.position.set(-HALF + 0.5, 3.2, z);
    const art = box(0.05, 1.1, 0.8, c); art.position.set(-HALF + 0.6, 3.2, z);
    group.add(frame, art);
  });

  // ---------------- ENTRANCE (arched frame + animated door) ----------------
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.28, 8, 16, Math.PI), mat(PALETTE.woodDk));
  arch.position.set(0, 3.4, HALF); arch.rotation.z = Math.PI; group.add(arch); // top arc
  [-2.0, 2.0].forEach((x) => { const p = box(0.4, 3.6, 0.5, PALETTE.woodDk); p.position.set(x, 1.8, HALF); group.add(p); });
  const doormat = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), mat('#8a4a3a')); doormat.rotateX(-Math.PI / 2); doormat.position.set(0, 0.02, 11.8); group.add(doormat);

  const door = new THREE.Group(); door.position.set(-1.8, 0, HALF - 0.1); // hinge at left of gap
  const panel = box(3.5, 3.4, 0.18, PALETTE.wood); panel.position.set(1.75, 1.9, 0); door.add(panel);
  const dGlass = stainedGlass(2.6, 1.6, 3, 2); dGlass.position.set(1.75, 2.6, 0.12); door.add(dGlass);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(PALETTE.amber, { metalness: 0.6, roughness: 0.3 }));
  knob.position.set(3.2, 1.9, 0.15); door.add(knob);
  group.add(door);

  // hanging shop sign outside
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.1),
    new THREE.MeshStandardMaterial({ map: signTexture('Analogue Intelligence'), roughness: 0.9 }));
  sign.position.set(0, 5, HALF + 0.6); group.add(sign);
  const signBar = box(4.4, 0.12, 0.12, PALETTE.woodDk); signBar.position.set(0, 5.7, HALF + 0.6); group.add(signBar);
  // exterior stoop + a strip of ground so "outside" reads during the intro
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), mat('#b9b39a')); ground.rotateX(-Math.PI / 2); ground.position.set(0, -0.02, HALF + 7); group.add(ground);
  for (let i = 0; i < 2; i++) { const st = box(4, 0.3, 1.2, '#9a9078'); st.position.set(0, 0.15, HALF + 0.9 + i * 1.2); group.add(st); }

  // =========================== GROUND FLOOR PROPS ===========================

  // curator's counter (facing the room)
  const counter = box(5.2, 1.35, 1.6, PALETTE.wood); counter.position.set(-7, 0.68, -1.5); group.add(counter);
  // decorative front panels with a star motif
  for (let i = -1; i <= 1; i++) {
    const p = box(1.3, 0.9, 0.05, PALETTE.woodLt); p.position.set(-7 + i * 1.5, 0.7, -0.68); group.add(p);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat(PALETTE.amber)); star.position.set(-7 + i * 1.5, 0.7, -0.62); group.add(star);
  }
  colliders.push({ x: -7, z: -1.5, w: 5.2, d: 1.6, level: 'ground' });
  const guidePos = new THREE.Vector3(-7, 0, -2.9);
  // green banker's lamp on the counter
  addTiffanyDesk(group, -8.6, 1.35, -1.5);
  // grandfather clock beside counter
  const clock = box(1.0, 3.4, 0.7, PALETTE.woodDk); clock.position.set(-11, 1.7, -1.5); group.add(clock);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), mat(PALETTE.cream)); clockFace.position.set(-11, 2.6, -1.12); group.add(clockFace);
  colliders.push({ x: -11, z: -1.5, w: 1.0, d: 0.7, level: 'ground' });

  // reading desk → vision interactable
  const desk = box(3.2, 1.1, 1.8, PALETTE.wood); desk.position.set(7, 0.55, 6); group.add(desk);
  colliders.push({ x: 7, z: 6, w: 3.2, d: 1.8, level: 'ground' });
  addTiffanyDesk(group, 6, 1.1, 6);
  const openBook = box(1.2, 0.12, 0.9, PALETTE.paper); openBook.position.set(7.4, 1.2, 6);
  register('vision_desk', new THREE.Vector3(7, 1.7, 6), openBook); group.add(openBook);

  // notice board → contact interactable
  const board = box(0.3, 2.4, 3, PALETTE.paper); board.position.set(-HALF + 0.7, 2.6, 8);
  register('contact_board', new THREE.Vector3(-HALF + 1.3, 2.8, 8), board); group.add(board);

  // globe → extra interactable ("how the lab works")
  const globeStand = box(0.4, 1.0, 0.4, PALETTE.woodDk); globeStand.position.set(9.5, 0.5, 6); group.add(globeStand);
  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat('#3f7fae', { flat: true }));
  globe.position.set(9.5, 1.4, 6);
  register('globe', new THREE.Vector3(9.5, 2.0, 6), globe); group.add(globe);
  colliders.push({ x: 9.5, z: 6, w: 0.5, d: 0.5, level: 'ground' });

  // gramophone → extra interactable (creative aside), near entrance
  const gramBase = box(0.9, 0.7, 0.9, PALETTE.woodDk); gramBase.position.set(-4.5, 0.35, 9.5); group.add(gramBase);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 10, 1, true), mat(PALETTE.amber, { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }));
  horn.position.set(-4.5, 1.4, 9.5); horn.rotation.z = -0.5;
  register('gramophone', new THREE.Vector3(-4.5, 2.1, 9.5), horn); group.add(horn);
  colliders.push({ x: -4.5, z: 9.5, w: 0.9, d: 0.9, level: 'ground' });

  // bookshelves + plants around the ground floor
  [[-11.5, 5], [-11.5, -8], [11.5, -8], [2, 11], [11.5, 10]].forEach(([x, z]) => addBookshelf(group, colliders, x, z, 'ground'));
  addPlant(group, -9.5, 10); addPlant(group, 10, 3.5); addPlant(group, -5.5, -4); addPlant(group, 4, -4);

  // seated patrons for life
  addPatron(group, animate, -4.5, 4.5, PALETTE.indigo, 0.4);
  addPatron(group, animate, 3.5, 2.5, PALETTE.magenta, 1.4);

  // ---------------- TIFFANY PENDANT LAMPS ----------------
  addPendant(group, 0, 6);     // over reading area
  addPendant(group, -6, 0.5);  // over counter
  addPendant(group, 4, -1);

  // =========================== STAIRS ===========================
  const st = levels.stairs, nSteps = 9, dz = (st.z1 - st.z0) / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const zc = st.z1 - (i + 0.5) * dz, top = levels.stairHeight(zc);
    const step = box(st.x1 - st.x0, Math.max(top, 0.4), dz * 0.98, i % 2 ? PALETTE.wood : PALETTE.woodLt);
    step.position.set((st.x0 + st.x1) / 2, Math.max(top, 0.4) / 2, zc); group.add(step);
    // turned balusters + handrail on the open (left) side
    const bal = lathe([[0, 0], [0.06, 0.1], [0.03, 0.4], [0.07, 0.7], [0.03, 1.0]], PALETTE.cream, { segments: 8 });
    bal.position.set(st.x0 + 0.1, top, zc); bal.scale.y = 1; group.add(bal);
  }
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9.2), mat('#9a3530'));
  runner.position.set((st.x0 + st.x1) / 2, 0, -1); runner.rotation.set(-Math.PI / 2 + 0.58, 0, 0); group.add(runner);

  // =========================== MEZZANINE ===========================
  const mz = levels.mez, mezW = mz.x1 - mz.x0, mezD = mz.z1 - mz.z0;
  const mezGeo = new THREE.BoxGeometry(mezW, 0.4, mezD); roughen(mezGeo, 0.02);
  const mez = new THREE.Mesh(mezGeo, new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.8 }));
  mez.position.set((mz.x0 + mz.x1) / 2, H - 0.2, (mz.z0 + mz.z1) / 2); mez.receiveShadow = true; group.add(mez);
  [[-10, -6], [0, -6], [10, -6]].forEach(([x, z]) => { const post = box(0.5, H, 0.5, PALETTE.woodLt); post.position.set(x, H / 2, z); group.add(post); });

  // ornate front railing (turned balusters) along z=-5, gap for the stairs
  for (let x = mz.x0 + 0.5; x <= mz.x1 - 0.5; x += 0.7) {
    if (x >= st.x0 - 0.5 && x <= st.x1 + 0.5) continue;
    const bal = lathe([[0, 0], [0.07, 0.1], [0.04, 0.5], [0.08, 0.9], [0.04, 1.1]], PALETTE.cream, { segments: 8 });
    bal.position.set(x, H + 0.05, -5); group.add(bal);
  }
  const railTop = box(mezW, 0.16, 0.16, PALETTE.wood); railTop.position.set((mz.x0 + mz.x1) / 2, H + 1.15, -5); group.add(railTop);

  // the four research books
  const books = [
    { id: 'book_software', x: -9, color: PALETTE.orange },
    { id: 'book_ai', x: -3, color: PALETTE.magenta },
    { id: 'book_robotics', x: 3, color: PALETTE.navy },
    { id: 'book_creative', x: 9, color: PALETTE.purple },
  ];
  books.forEach(({ id, x, color }) => {
    addBookshelf(group, colliders, x, -11, 'mezzanine');
    const bk = box(1.5, 1.0, 1.1, color);
    bk.position.set(x, H + 2.3, -10.0);
    register(id, new THREE.Vector3(x, H + 2.9, -10.0), bk); group.add(bk);
  });
  // a pendant over the reading library upstairs
  addPendant(group, 0, -9, H + 3.6);

  // ---------------- DUST MOTES (catch the light) ----------------
  const dust = makeDust(HALF, WALL_H); group.add(dust.points); animate.push((dt) => dust.tick(dt));

  const spawn = new THREE.Vector3(0, 0, 8.5);
  const tick = (dt) => { for (const fn of animate) fn(dt); };
  return { group, floorMesh, colliders, interactables, spawn, guidePos, levels, door, tick };
}

// ------------------------------- helpers -------------------------------------
function placeGlow(color, x, y, z, size) { const s = glowSprite(color, size, 0.4); s.position.set(x, y, z); return s; }

function addRug(group, x, z, w, d, color) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat(color, { roughness: 1 })); m.position.set(x, 0.015, z); m.receiveShadow = true; group.add(m);
}

function addSunPool(group, animate, x, z, w, d) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0xffdca0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, 0.05, z); group.add(m);
  const base = 0.22, phase = Math.random() * 6;
  animate.push((dt) => { m.material.opacity = base + Math.sin(performance.now() * 0.0006 + phase) * 0.06; });
}

function addTiffanyDesk(group, x, y, z) {
  const stem = box(0.12, 0.5, 0.12, PALETTE.woodDk); stem.position.set(x, y + 0.25, z); group.add(stem);
  const shade = lathe([[0, 0], [0.32, 0.02], [0.34, 0.18], [0.1, 0.28]], PALETTE.glassGreen, { emissive: PALETTE.glassGreen, emissiveIntensity: 0.7, segments: 12 });
  shade.position.set(x, y + 0.55, z); group.add(shade);
  const l = new THREE.PointLight(0xbfe6a0, 8, 5, 2); l.position.set(x, y + 0.5, z); group.add(l);
  group.add(placeGlow('#cde6a0', x, y + 0.55, z, 1.6));
}

function addPendant(group, x, z, y = 7.0) {
  const cord = box(0.04, 1.4, 0.04, '#2a2018'); cord.position.set(x, y + 0.7, z); group.add(cord);
  const shade = lathe([[0, 0], [0.55, 0.05], [0.6, 0.35], [0.15, 0.5]], PALETTE.glassGreen, { emissive: PALETTE.glassGreen, emissiveIntensity: 0.85, segments: 14 });
  shade.position.set(x, y, z); group.add(shade);
  const l = new THREE.PointLight(0xcfeeae, 16, 12, 2); l.position.set(x, y - 0.2, z); group.add(l);
  group.add(placeGlow('#d6f0af', x, y, z, 3.2));
}

function addBookshelf(group, colliders, x, z, level) {
  const s = box(2.6, 4.4, 1.4, PALETTE.wood); s.position.set(x, 2.2, z); group.add(s);
  colliders.push({ x, z, w: 2.6, d: 1.4, level });
  const cols = [PALETTE.orange, PALETTE.magenta, PALETTE.purple, PALETTE.amber, PALETTE.green, PALETTE.indigo, PALETTE.plum];
  for (let shelf = 0; shelf < 3; shelf++) for (let i = 0; i < 6; i++) {
    const b = box(0.28, 0.7, 0.9, cols[(i + shelf * 3) % cols.length]);
    b.position.set(x - 1.0 + i * 0.4, 1.1 + shelf * 1.2, z + 0.15); group.add(b);
  }
}

function addPlant(group, x, z) {
  const pot = lathe([[0, 0], [0.45, 0], [0.5, 0.5], [0.4, 0.9]], PALETTE.plum, { segments: 10 });
  pot.position.set(x, 0, z); group.add(pot);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8, 4), mat(PALETTE.leaf, { roughness: 1 }));
    leaf.position.set(x + (Math.random() - 0.5) * 0.6, 1.6 + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.6);
    leaf.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.8); leaf.castShadow = true; group.add(leaf);
  }
}

function addPatron(group, animate, x, z, coatColor, phase) {
  const p = new THREE.Group();
  const chair = box(0.9, 0.8, 0.9, PALETTE.wood); chair.position.y = 0.4;
  const legs = box(0.8, 0.6, 1.0, '#33475a'); legs.position.set(0, 1.05, 0.15);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 1.0, 7), mat(coatColor)); torso.position.y = 1.75;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat('#e79a5c')); head.position.y = 2.5;
  p.add(chair, legs, torso, head); p.position.set(x, 0, z);
  p.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p);
  animate.push(() => { head.position.y = 2.5 + Math.sin(performance.now() * 0.0015 + phase) * 0.04; torso.rotation.y = Math.sin(performance.now() * 0.0007 + phase) * 0.08; });
}

function makeDust(half, height) {
  const N = 120, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * half * 2; pos[i * 3 + 1] = Math.random() * height; pos[i * 3 + 2] = (Math.random() - 0.5) * half * 2; vel[i] = 0.1 + Math.random() * 0.2; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff2cf, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  const tick = (dt) => { const a = geo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3 + 1] += vel[i] * dt; if (a[i * 3 + 1] > height) a[i * 3 + 1] = 0; a[i * 3] += Math.sin(performance.now() * 0.0003 + i) * dt * 0.12; } geo.attributes.position.needsUpdate = true; };
  return { points, tick };
}

function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 140; const g = c.getContext('2d');
  g.fillStyle = '#4a3420'; g.fillRect(0, 0, 512, 140);
  g.strokeStyle = '#caa15a'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 120);
  g.fillStyle = '#efe7d3'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 74);
  return new THREE.CanvasTexture(c);
}
