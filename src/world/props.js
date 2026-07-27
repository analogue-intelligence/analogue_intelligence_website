import * as THREE from 'three';
import { M, PALETTE, box, cyl, lathe, paint, surface, decal, glow, textPlate, screenMaterial , mergeStatic } from './materials.js';

// -----------------------------------------------------------------------------
// props.js — the furniture kit.
//
// Every piece is assembled from parts the way the real object is: a table has an
// apron and four legs, a chair has slats, a shelf has a carcass and a back
// panel. It costs a few more triangles than a tinted box and it is the whole
// difference between a room that reads as furniture and one that reads as
// placeholder geometry.
//
// Anything room-specific (drones, robot arms, plotters) lives with its room or
// in exhibits.js — this file is only things that appear more than once.
// -----------------------------------------------------------------------------

const G = () => new THREE.Group();

// ------------------------------------------------------------------ tables --
export function table(w = 3, d = 1.6, h = 1.15, tint = '#8a6236') {
  const g = G();
  const wood = M.wood(tint, [2, 1]);
  const top = box(w, 0.12, d, wood); top.position.y = h;
  const apron1 = box(w - 0.5, 0.18, 0.1, wood); apron1.position.set(0, h - 0.18, d / 2 - 0.14);
  const apron2 = apron1.clone(); apron2.position.z = -(d / 2 - 0.14);
  g.add(top, apron1, apron2);
  const legInset = 0.22;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.16, h - 0.12, 0.16, wood);
    leg.position.set(sx * (w / 2 - legInset), (h - 0.12) / 2, sz * (d / 2 - legInset));
    g.add(leg);
  }
  return mergeStatic(g);
}

export function roundTable(r = 0.9, h = 1.1, tint = '#7a5630') {
  const g = G();
  const wood = M.wood(tint, [1, 1]);
  g.add(cyl(r, r, 0.1, wood, 18, { pos: [0, h, 0] }));
  g.add(cyl(0.12, 0.16, h - 0.1, wood, 10, { pos: [0, (h - 0.1) / 2, 0] }));
  g.add(cyl(0.55, 0.62, 0.08, wood, 14, { pos: [0, 0.05, 0] }));
  return mergeStatic(g);
}

export function chair(tint = '#6f4c2c', seatFabric = null) {
  const g = G();
  const wood = M.wood(tint, [1, 1]);
  const seat = box(0.72, 0.1, 0.7, seatFabric ? M.fabric(seatFabric) : wood);
  seat.position.y = 0.62; g.add(seat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.1, 0.62, 0.1, wood);
    leg.position.set(sx * 0.29, 0.31, sz * 0.28); g.add(leg);
  }
  for (const sx of [-1, 1]) {
    const post = box(0.1, 1.0, 0.1, wood);
    post.position.set(sx * 0.29, 1.1, -0.28); g.add(post);
  }
  for (let i = 0; i < 3; i++) {
    const slat = box(0.62, 0.14, 0.06, wood);
    slat.position.set(0, 0.94 + i * 0.28, -0.28); g.add(slat);
  }
  return mergeStatic(g);
}

export function stool(h = 0.85, tint = '#5d4630') {
  const g = G();
  const wood = M.wood(tint, [1, 1]);
  g.add(cyl(0.33, 0.31, 0.1, wood, 14, { pos: [0, h, 0] }));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.05, 0.06, h, M.metal('#8d8a83', 0.5), 8);
    leg.position.set(Math.cos(a) * 0.24, h / 2, Math.sin(a) * 0.24);
    leg.rotation.z = -Math.cos(a) * 0.1; leg.rotation.x = Math.sin(a) * 0.1;
    g.add(leg);
  }
  return mergeStatic(g);
}

export function sofa(w = 3.4, tint = '#5e6b5a') {
  const g = G();
  const cloth = M.fabric(tint, [2, 1]);
  const base = box(w, 0.55, 1.4, cloth); base.position.y = 0.42; g.add(base);
  const back = box(w, 0.95, 0.35, cloth); back.position.set(0, 1.0, -0.52); g.add(back);
  for (const sx of [-1, 1]) {
    const arm = box(0.34, 0.5, 1.4, cloth); arm.position.set(sx * (w / 2 - 0.17), 0.95, 0); g.add(arm);
  }
  for (let i = 0; i < Math.max(2, Math.round(w / 1.7)); i++) {
    const n = Math.max(2, Math.round(w / 1.7));
    const cush = box(w / n - 0.12, 0.2, 1.2, M.fabric(tint, [1, 1]));
    cush.position.set(-w / 2 + (w / n) * (i + 0.5), 0.78, 0.05);
    cush.rotation.z = (Math.random() - 0.5) * 0.02; g.add(cush);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = box(0.12, 0.16, 0.12, M.wood('#3b2a1c'));
    foot.position.set(sx * (w / 2 - 0.3), 0.08, sz * 0.55); g.add(foot);
  }
  return mergeStatic(g);
}

// ----------------------------------------------------------------- storage --
export function bookshelf(w = 2.6, h = 4.4, d = 0.9, tint = '#5d4128', shelves = 4) {
  const g = G();
  const wood = M.wood(tint, [1, 2]);
  const bookMat = M.books([Math.max(1, Math.round(w)), 1]);
  g.add(box(w, 0.14, d, wood, { pos: [0, h - 0.07, 0] }));           // top
  g.add(box(w, 0.14, d, wood, { pos: [0, 0.07, 0] }));               // base
  for (const sx of [-1, 1]) g.add(box(0.14, h, d, wood, { pos: [sx * (w / 2 - 0.07), h / 2, 0] }));
  const back = box(w - 0.28, h, 0.08, M.wood('#3a2818', [1, 1]));
  back.position.set(0, h / 2, -d / 2 + 0.04);
  g.add(back);

  const gap = (h - 0.3) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = 0.14 + gap * i;
    if (i > 0) g.add(box(w - 0.28, 0.08, d - 0.1, wood, { pos: [0, y, 0] }));
    // a run of spines, standing slightly proud of the shelf
    const run = box(w - 0.4, gap * 0.72, d * 0.62, bookMat);
    run.position.set(0, y + gap * 0.4, 0.06);
    g.add(run);
    // a couple of leaning strays for silhouette
    if (Math.random() < 0.65) {
      const stray = box(0.16, gap * 0.6, d * 0.5, paint(['#7d3a2e', '#2f4f4a', '#8a6a2d', '#6b3450'][i % 4]));
      stray.position.set(w / 2 - 0.5, y + gap * 0.34, 0.1);
      stray.rotation.z = 0.22; g.add(stray);
    }
  }
  return mergeStatic(g);
}

export function crate(s = 1, tint = '#7a5a34') {
  const g = G();
  const wood = M.wood(tint, [1, 1]);
  g.add(box(s, s * 0.9, s, wood));
  g.children[0].position.y = s * 0.45;
  for (const sy of [0.14, 0.76]) {
    const band = box(s + 0.04, 0.08, s + 0.04, M.metal('#6d6a63', 0.6));
    band.position.y = s * sy; g.add(band);
  }
  return mergeStatic(g);
}

export function shelfUnit(w = 2.2, h = 2.2, tint = '#6a6f74') {
  const g = G();
  const steel = M.metal(tint, 0.55);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(box(0.08, h, 0.08, steel, { pos: [sx * (w / 2 - 0.05), h / 2, sz * 0.35] }));
  }
  for (let i = 0; i < 3; i++) g.add(box(w, 0.06, 0.8, steel, { pos: [0, 0.3 + i * (h - 0.4) / 2, 0] }));
  return mergeStatic(g);
}

// ------------------------------------------------------------------ plants --
export function plant(scale = 1, potTint = '#8a5638') {
  const g = G();
  const pot = lathe([[0, 0], [0.46, 0], [0.52, 0.55], [0.44, 0.95], [0.4, 0.98], [0, 0.98]],
    surface({ map: 'stone', repeat: [1, 1], color: potTint, roughness: 0.95 }), 14);
  g.add(pot);
  const soil = cyl(0.42, 0.42, 0.06, paint('#2e2419'), 12, { pos: [0, 0.96, 0] });
  g.add(soil);
  const greens = ['#4e6b3a', '#5e7d42', '#3f5a30', '#6b8a4a'];
  for (let i = 0; i < 11; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.05 + Math.random() * 0.35;
    const blade = new THREE.Mesh(
      new THREE.SphereGeometry(0.34 + Math.random() * 0.2, 6, 4),
      paint(greens[i % greens.length], { roughness: 0.95 }));
    blade.scale.set(0.5, 1.5 + Math.random() * 0.9, 0.5);
    blade.position.set(Math.cos(a) * r, 1.5 + Math.random() * 0.8, Math.sin(a) * r);
    blade.rotation.set((Math.random() - 0.5) * 0.7, a, (Math.random() - 0.5) * 0.7);
    blade.castShadow = true;
    g.add(blade);
  }
  g.scale.setScalar(scale);
  return mergeStatic(g);
}

export function hangingPlant(scale = 1) {
  const g = G();
  g.add(cyl(0.02, 0.02, 1.6, paint('#2a2018'), 6, { pos: [0, 0.8, 0] }));
  const pot = lathe([[0, 0], [0.34, 0], [0.36, 0.34], [0, 0.34]], paint('#8a5638'), 12);
  g.add(pot);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const vine = box(0.1, 0.9 + Math.random() * 0.9, 0.1, paint('#4e6b3a'));
    vine.position.set(Math.cos(a) * 0.28, -(0.45 + Math.random() * 0.45), Math.sin(a) * 0.28);
    vine.rotation.z = (Math.random() - 0.5) * 0.4;
    g.add(vine);
  }
  g.scale.setScalar(scale);
  return mergeStatic(g);
}

// ------------------------------------------------------------------- light --
/** Cone-shaded pendant. Returns { group, lightPos } so the caller can add a lamp. */
export function pendant(shadeTint = '#c9a24a', cordLen = 2.2, r = 0.62) {
  const g = G();
  g.add(box(0.05, cordLen, 0.05, paint('#241d18'), { pos: [0, cordLen / 2, 0] }));
  const shade = lathe([[0, 0], [r, 0.02], [r * 0.92, 0.1], [0.16, 0.52], [0.1, 0.54]],
    paint(shadeTint, { roughness: 0.5 }), 16);
  shade.rotation.x = Math.PI;                       // opening downward
  shade.position.y = 0.08;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6),
    paint('#fff0c8', { emissive: '#ffd9a0', emissiveIntensity: 2.4 }));
  bulb.position.y = -0.18; g.add(bulb);
  return mergeStatic(g);
}

export function deskLamp(tint = '#2f4a44') {
  const g = G();
  g.add(cyl(0.2, 0.24, 0.07, M.metal('#4a4640', 0.5), 12, { pos: [0, 0.035, 0] }));
  g.add(cyl(0.04, 0.05, 0.62, M.metal('#4a4640', 0.5), 8, { pos: [0, 0.34, 0] }));
  const shade = lathe([[0, 0], [0.34, 0.03], [0.34, 0.14], [0.1, 0.2]],
    paint(tint, { emissive: tint, emissiveIntensity: 0.55 }), 14);
  shade.rotation.x = Math.PI; shade.position.y = 0.78;
  g.add(shade);
  return mergeStatic(g);
}

export function floorLamp(tint = '#b58b46') {
  const g = G();
  g.add(cyl(0.34, 0.38, 0.08, M.metal('#3f3b36', 0.6), 14, { pos: [0, 0.04, 0] }));
  g.add(cyl(0.05, 0.05, 2.5, M.metal('#3f3b36', 0.6), 8, { pos: [0, 1.25, 0] }));
  const shade = lathe([[0, 0], [0.5, 0.05], [0.42, 0.62], [0.36, 0.64]],
    paint(tint, { emissive: tint, emissiveIntensity: 0.5, side: THREE.DoubleSide }), 16);
  shade.position.y = 2.35; shade.rotation.x = Math.PI;
  g.add(shade);
  return mergeStatic(g);
}

export function sconce(tint = '#c9a24a') {
  const g = G();
  g.add(box(0.24, 0.5, 0.12, M.metal('#463f36', 0.6)));
  const cup = lathe([[0, 0], [0.26, 0.08], [0.3, 0.3], [0.12, 0.34]],
    paint(tint, { emissive: tint, emissiveIntensity: 0.8 }), 12);
  cup.position.set(0, 0.16, 0.22); g.add(cup);
  return mergeStatic(g);
}

/** A hard cone of light for exhibits — the museum spotlight look. */
export function exhibitSpot(color = 0xffe6be) {
  const g = G();
  g.add(cyl(0.11, 0.14, 0.34, M.metal('#2f2b26', 0.5), 10));
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 4.2, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.075,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  cone.position.y = -2.2;
  g.add(cone);
  return mergeStatic(g);
}

// -------------------------------------------------------------- surfacing ---
export function rug(w, d, rep = [1, 1]) {
  const m = decal(w, d, M.rug(rep), 0.02);
  return m;
}

export function framedArt(w = 1.2, h = 1.5, art = '#8a5638', frameTint = '#4a3320') {
  const g = G();
  g.add(box(w + 0.16, h + 0.16, 0.1, M.wood(frameTint, [1, 1])));
  const face = box(w, h, 0.04, typeof art === 'string'
    ? surface({ map: 'canvas', repeat: [1, 1], color: art, roughness: 0.95 })
    : art);
  face.position.z = 0.06; g.add(face);
  return mergeStatic(g);
}

export function noticeBoard(w = 3, h = 2.2) {
  const g = G();
  g.add(box(w + 0.2, h + 0.2, 0.12, M.wood('#4a3320', [1, 1])));
  g.add(box(w, h, 0.06, M.fabric('#6b5a3e', [2, 2]), { pos: [0, 0, 0.06] }));
  for (let i = 0; i < 9; i++) {
    const note = box(0.34 + Math.random() * 0.2, 0.44 + Math.random() * 0.2, 0.02,
      M.paper());
    note.position.set(-w / 2 + 0.35 + Math.random() * (w - 0.7),
      -h / 2 + 0.35 + Math.random() * (h - 0.7), 0.1);
    note.rotation.z = (Math.random() - 0.5) * 0.25;
    g.add(note);
  }
  return mergeStatic(g);
}

/** Turned balusters + handrail, for balconies and stairs. */
export function railing(length, axis = 'x', tint = '#c9c1ad') {
  const g = G();
  const wood = M.wood('#5d4128', [1, 1]);
  const n = Math.max(2, Math.floor(length / 0.62));
  for (let i = 0; i <= n; i++) {
    const t = -length / 2 + (length / n) * i;
    const bal = lathe([[0, 0], [0.075, 0.08], [0.045, 0.42], [0.085, 0.82], [0.045, 1.06]],
      paint(tint, { roughness: 0.85 }), 10);
    bal.position.set(axis === 'x' ? t : 0, 0, axis === 'x' ? 0 : t);
    g.add(bal);
  }
  const rail = box(axis === 'x' ? length : 0.16, 0.14, axis === 'x' ? 0.16 : length, wood);
  rail.position.y = 1.12; g.add(rail);
  const base = box(axis === 'x' ? length : 0.12, 0.1, axis === 'x' ? 0.12 : length, wood);
  base.position.y = 0.04; g.add(base);
  return mergeStatic(g);
}

// ------------------------------------------------------------------ tech ----
export function monitor(w = 1.2, h = 0.78, lines = ['> ready'], o = {}) {
  const g = G();
  const shell = M.metal('#2b2f34', 0.6);
  g.add(box(w + 0.1, h + 0.1, 0.08, shell));
  const face = box(w, h, 0.03, screenMaterial(lines, o));
  face.position.z = 0.06; g.add(face);
  g.add(box(0.16, 0.36, 0.14, shell, { pos: [0, -h / 2 - 0.18, 0] }));
  g.add(box(0.66, 0.05, 0.4, shell, { pos: [0, -h / 2 - 0.36, 0] }));
  return mergeStatic(g);
}

export function workbench(w = 4, d = 1.5) {
  const g = G();
  const steel = M.metal('#6f7479', 0.55);
  const topMat = surface({ map: 'wood_dark', repeat: [2, 1], color: '#8a7a5c', roughness: 0.85 });
  g.add(box(w, 0.14, d, topMat, { pos: [0, 1.05, 0] }));
  g.add(box(w - 0.2, 0.5, d - 0.2, steel, { pos: [0, 0.72, 0] }));
  for (const sx of [-1, 1]) g.add(box(0.14, 1.0, d - 0.1, steel, { pos: [sx * (w / 2 - 0.1), 0.5, 0] }));
  for (let i = 0; i < 3; i++) {
    const drawer = box(w / 3.4, 0.28, 0.06, M.metal('#8a8f94', 0.5));
    drawer.position.set(-w / 3 + i * (w / 3.2), 0.78, d / 2 - 0.02); g.add(drawer);
  }
  return mergeStatic(g);
}

export function pegboard(w = 4, h = 2.4) {
  const g = G();
  g.add(box(w, h, 0.1, surface({ map: 'paper', repeat: [2, 1], color: '#9a8f78', roughness: 1 })));
  const tools = ['#6f7479', '#b08d46', '#8a5638', '#4a5568'];
  for (let i = 0; i < 14; i++) {
    const t = box(0.1 + Math.random() * 0.12, 0.4 + Math.random() * 0.7, 0.08,
      M.metal(tools[i % tools.length], 0.5));
    t.position.set(-w / 2 + 0.4 + Math.random() * (w - 0.8),
      -h / 2 + 0.5 + Math.random() * (h - 1), 0.1);
    t.rotation.z = (Math.random() - 0.5) * 0.3;
    g.add(t);
  }
  return mergeStatic(g);
}

/** A small sign on a wall or a stand — room labels, exhibit captions. */
export function plaque(text, w = 1.6, h = 0.42, o = {}) {
  const t = textPlate(text, {
    w: 512, h: Math.round(512 * (h / w)), bg: o.bg ?? '#241d18',
    color: o.color ?? '#e7e0d2', border: o.border ?? '#8a7040',
    size: o.size ?? 74, font: o.font ?? '"Space Mono", monospace', weight: 700,
  });
  const m = box(w, h, 0.06, new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
  return m;
}

/** Exhibit pedestal with a captioned face. */
export function plinth(w = 1.6, h = 1.15, d = 1.6, label = null, tint = '#3a3c42') {
  const g = G();
  const stone = surface({ map: 'stone', repeat: [1, 1], color: tint, roughness: 0.9 });
  g.add(box(w + 0.18, 0.14, d + 0.18, stone, { pos: [0, 0.07, 0] }));
  g.add(box(w, h - 0.22, d, stone, { pos: [0, h / 2, 0] }));
  g.add(box(w + 0.14, 0.1, d + 0.14, stone, { pos: [0, h - 0.05, 0] }));
  if (label) {
    const p = plaque(label, w * 0.78, 0.3, { bg: '#1a1c20', border: '#8a7040', size: 62 });
    p.position.set(0, h * 0.6, d / 2 + 0.03);
    g.add(p);
  }
  return mergeStatic(g);
}

export { glow };
