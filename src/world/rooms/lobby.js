import * as THREE from 'three';
import { M, box, cyl, lathe, paint, surface, decal } from '../materials.js';
import {
  table, roundTable, chair, stool, sofa, plant, hangingPlant, pendant,
  floorLamp, sconce, noticeBoard, rug, framedArt, bookshelf,
} from '../props.js';

// -----------------------------------------------------------------------------
// rooms/lobby.js — the coffee lobby, and the room you arrive in.
//
// It does three jobs: it establishes the register (warm, a bit scruffy, clearly
// used by people), it puts the Curator somewhere you'll walk past, and it points
// at the door to the Hall of Fame without a tutorial arrow.
// -----------------------------------------------------------------------------

export function buildLobby(ctx) {
  // ------------------------------------------------------------- the bar ---
  const barX = -7.5;
  const bar = new THREE.Group();
  const counterMat = M.wood('#5d4128', [3, 1]);
  const top = box(8.6, 0.16, 1.5, M.stone([2, 1])); top.position.y = 1.24; bar.add(top);
  const front = box(8.6, 1.2, 1.4, counterMat); front.position.y = 0.6; bar.add(front);
  // panelled front, with a brass foot rail
  for (let i = -2; i <= 2; i++) {
    const p = box(1.3, 0.8, 0.06, M.wood('#7a5630', [1, 1]));
    p.position.set(i * 1.6, 0.62, 0.72); bar.add(p);
  }
  const foot = cyl(0.05, 0.05, 8.4, M.metal('#b08d46', 0.35), 8);
  foot.rotation.z = Math.PI / 2; foot.position.set(0, 0.22, 0.85); bar.add(foot);
  ctx.add(bar, barX, 0, 17.5);
  ctx.collide(barX, 17.5, 8.6, 1.6, 0);

  // back gantry: shelves, cups, bottles
  const gantry = new THREE.Group();
  gantry.add(box(8.6, 0.1, 0.5, M.wood('#4a3320', [3, 1])));
  for (let s = 0; s < 3; s++) {
    const shelf = box(8.2, 0.08, 0.42, M.wood('#4a3320', [3, 1]));
    shelf.position.y = s * 0.85; gantry.add(shelf);
    for (let i = 0; i < 12; i++) {
      const cupCol = ['#e0d8c4', '#c97a3a', '#3e6b62', '#a8452f'][i % 4];
      const cup = lathe([[0, 0], [0.11, 0], [0.13, 0.17], [0.11, 0.18]], paint(cupCol), 10);
      cup.position.set(-3.8 + i * 0.68, s * 0.85 + 0.04, 0);
      gantry.add(cup);
    }
  }
  ctx.add(gantry, barX, 1.6, 15.6);

  // espresso machine — interactable
  const machine = new THREE.Group();
  const chrome = M.metal('#cfd3d6', 0.28);
  machine.add(box(1.7, 0.9, 0.9, chrome));
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.7, 14, 1, false, 0, Math.PI), chrome);
  hood.rotation.z = Math.PI / 2; hood.position.y = 0.45; machine.add(hood);
  for (const sx of [-0.45, 0.45]) {
    machine.add(cyl(0.09, 0.09, 0.34, M.metal('#8d8a83', 0.35), 10, { pos: [sx, -0.5, 0.42] }));
    const cup = lathe([[0, 0], [0.1, 0], [0.12, 0.14]], paint('#efe9dc'), 10);
    cup.position.set(sx, -0.66, 0.42); machine.add(cup);
  }
  const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16),
    paint('#e8dfc4', { emissive: '#e8dfc4', emissiveIntensity: 0.5 }));
  gauge.position.set(0, 0.1, 0.46); machine.add(gauge);
  ctx.add(machine, barX + 2.6, 1.78, 17.2);
  ctx.interact('lb_espresso', machine, ctx.anchor(barX + 2.6, 2.6, 17.2));
  ctx.tick((dt) => { gauge.material.emissiveIntensity = 0.4 + Math.sin(performance.now() * 0.002) * 0.15; });

  // steam, drifting up off the group head
  const steam = makeSteam();
  ctx.add(steam.points, barX + 2.6, 1.5, 17.6);
  ctx.tick(steam.tick);

  // stools along the bar
  for (let i = -2; i <= 2; i++) ctx.add(stool(1.0), barX + i * 1.7, 0, 19.4);

  // ------------------------------------------------------------- seating ---
  ctx.add(rug(7, 5, [1, 1]), 5, 0.02, 20);
  ctx.add(sofa(3.6, '#4f6055'), 5, 0, 22.6, Math.PI);
  ctx.collide(5, 22.6, 3.6, 1.4, 0);
  ctx.add(sofa(2.6, '#6b4a48'), 8.8, 0, 19.6, -Math.PI / 2);
  ctx.collide(8.8, 19.6, 1.4, 2.6, 0);

  const low = box(1.9, 0.14, 1.1, M.wood('#5d4128', [1, 1]));
  ctx.add(low, 5, 0.55, 19.6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ctx.add(box(0.1, 0.55, 0.1, M.wood('#3f2f20')), 5 + sx * 0.8, 0.28, 19.6 + sz * 0.44);
  }
  // magazines on the low table
  for (let i = 0; i < 3; i++) {
    const mag = box(0.5, 0.03, 0.66, M.paper());
    ctx.add(mag, 4.7 + i * 0.14, 0.64 + i * 0.03, 19.6, i * 0.3);
  }

  // two café tables closer to the door
  for (const [tx, tz] of [[6.5, 15.5], [-1.5, 22.5]]) {
    ctx.add(roundTable(0.85, 1.05), tx, 0, tz);
    ctx.collide(tx, tz, 1.5, 1.5, 0);
    ctx.add(chair('#6f4c2c', '#7a6a4e'), tx - 1.3, 0, tz, Math.PI / 2);
    ctx.add(chair('#6f4c2c', '#7a6a4e'), tx + 1.3, 0, tz, -Math.PI / 2);
    const cup = lathe([[0, 0], [0.1, 0], [0.12, 0.15]], paint('#efe9dc'), 10);
    ctx.add(cup, tx + 0.2, 1.05, tz + 0.1);
  }

  // ------------------------------------------------------- notice board ----
  const board = noticeBoard(3.4, 2.4);
  ctx.add(board, 11.6, 3.4, 20, -Math.PI / 2);
  ctx.interact('lb_board', board, ctx.anchor(10.9, 4.3, 20));

  // ------------------------------------------------------- gramophone ------
  const gram = new THREE.Group();
  gram.add(box(1.0, 0.75, 1.0, M.wood('#4a3320', [1, 1])));
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.1, 12, 1, true),
    M.metal('#c9a24a', 0.3));
  horn.material.side = THREE.DoubleSide;
  horn.position.set(0, 0.95, 0); horn.rotation.z = -0.55;
  gram.add(horn);
  const disc = cyl(0.42, 0.42, 0.03, paint('#1a1a1e'), 20);
  disc.position.y = 0.4; gram.add(disc);
  ctx.add(gram, -11, 0.38, 23.4, 0.4);
  ctx.collide(-11, 23.4, 1.1, 1.1, 0);
  ctx.interact('lb_gramophone', gram, ctx.anchor(-11, 2.0, 23.4));
  ctx.tick((dt) => { disc.rotation.y += dt * 1.4; });

  // ------------------------------------------------------------- dressing --
  ctx.add(plant(1.35), -11, 0, 13.6);
  ctx.add(plant(1.1), 10.6, 0, 24.4);
  ctx.add(hangingPlant(1.1), -3.5, 6.6, 14.2);
  ctx.add(hangingPlant(0.9), 3.5, 6.6, 24.2);
  ctx.add(bookshelf(2.2, 2.6, 0.7, '#54391f', 2), 11, 0, 14.4, -Math.PI / 2);
  ctx.collide(11, 14.4, 0.7, 2.2, 0);

  const menu = box(2.4, 1.5, 0.08, new THREE.MeshStandardMaterial({
    map: menuTexture(), roughness: 0.85,
  }));
  ctx.add(menu, barX + 3.4, 4.2, 12.4);

  ctx.add(framedArt(1.1, 1.4, '#5a6b62'), -3.0, 4.4, 12.35);
  ctx.add(framedArt(1.1, 1.4, '#7a5a3a'), -1.2, 4.4, 12.35);

  // ---------------------------------------------------------------- light --
  ctx.add(pendant('#c97a3a', 2.0, 0.5), barX - 2.5, 5.4, 17.5);
  ctx.add(pendant('#c97a3a', 2.6, 0.5), barX + 0.5, 5.4, 17.5);
  ctx.add(pendant('#c97a3a', 2.2, 0.5), barX + 3.5, 5.4, 17.5);
  ctx.lamp(0xffcf94, barX + 0.5, 4.6, 17.5, { intensity: 26, distance: 18, size: 5, opacity: 0.42 });
  ctx.lamp(0xffd9a8, 5, 4.4, 20.6, { intensity: 20, distance: 15, size: 4.4, opacity: 0.38 });
  ctx.add(floorLamp('#c9a24a'), 8.6, 0, 23.4);
  ctx.lamp(0xffdcae, 8.6, 2.4, 23.4, { intensity: 12, distance: 9, size: 2.8, opacity: 0.35 });
  for (const z of [15, 22]) {
    ctx.add(sconce('#c9a24a'), -11.7, 4.4, z, Math.PI / 2);
    ctx.lamp(0xffcf94, -11.2, 4.5, z, { intensity: 8, distance: 8, size: 2.2, opacity: 0.3 });
  }
}

// ---------------------------------------------------------------------------
function menuTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#20242a'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#8a7040'; g.lineWidth = 4; g.strokeRect(14, 14, 484, 292);
  g.fillStyle = '#e7dcc0';
  g.font = '700 40px "Syne", Georgia, serif';
  g.fillText('TODAY', 40, 72);
  g.font = '400 26px "Space Mono", monospace';
  const items = [
    ['espresso', 'free'],
    ['filter', 'free'],
    ['an argument', 'free'],
    ['a co-author', 'negotiable'],
  ];
  items.forEach(([a, b], i) => {
    g.fillStyle = '#cfc4a8';
    g.fillText(a, 40, 130 + i * 42);
    g.fillStyle = '#c9a24a';
    g.fillText(b, 330, 130 + i * 42);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSteam() {
  const N = 40;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 0.3;
    pos[i * 3 + 1] = Math.random() * 1.6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    seed[i] = Math.random() * 6.28;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xf2e8d8, size: 0.16, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const tick = (dt) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += dt * 0.42;
      a[i * 3] += Math.sin(performance.now() * 0.001 + seed[i]) * dt * 0.16;
      if (a[i * 3 + 1] > 1.7) { a[i * 3 + 1] = 0; a[i * 3] = (Math.random() - 0.5) * 0.3; }
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, tick };
}
