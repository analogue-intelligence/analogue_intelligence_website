import * as THREE from 'three';
import { M, box, cyl, lathe, paint, surface, decal, textPlate } from '../materials.js';
import {
  plinth, exhibitSpot, pendant, framedArt, plant, bookshelf, chair,
} from '../props.js';

// -----------------------------------------------------------------------------
// rooms/hall.js — the Hall of Fame.
//
// Six things the lab has made, each on its own lit plinth, arranged down two
// aisles with a totem at the far end. The room is deliberately the emptiest in
// the building in the middle and the densest at the edges: you should be able to
// see every exhibit from the doorway and still have to walk to each one.
// -----------------------------------------------------------------------------

export function buildHall(ctx) {
  // ------------------------------------------------------------- surfaces --
  const runner = decal(6, 20, M.rug([1, 3]), 0.03);
  ctx.add(runner, 0, 0.03, 0.5);

  // a compass medallion inlaid where the aisles cross
  const medallion = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 32),
    new THREE.MeshStandardMaterial({ map: medallionTexture(), roughness: 0.7 }));
  medallion.rotation.x = -Math.PI / 2;
  ctx.add(medallion, 0, 0.045, 0.5);

  // ---------------------------------------------------------------- light --
  for (const z of [-6, 1, 8]) {
    ctx.add(pendant('#c9a24a', 2.4, 0.85), 0, 5.6, z);
    ctx.lamp(0xffdca8, 0, 5.1, z, { intensity: 26, distance: 22, size: 5.4, opacity: 0.4 });
    // the beam the pendant hangs from — the only ceiling in the building
    ctx.add(box(30, 0.3, 0.5, M.wood('#3f2f20', [6, 1])), 0, 7.9, z);
  }

  // ------------------------------------------------------------- exhibits --
  // Three plinths, spread across the floor rather than lined up down one wall —
  // with two exhibits removed a single row left the east side of the hall empty.
  const EXHIBITS = [
    { id: 'ex_zephyr', x: -10.5, z: -5, label: 'ZEPHYR · 2026', build: droneExhibit, h: 1.9 },
    { id: 'ex_atlas', x: -10.5, z: 3.5, label: 'ATLAS · 2025', build: footballExhibit, h: 1.55 },
    { id: 'ex_daedalus', x: 7.5, z: -4.5, label: 'DAEDALUS · 2025', build: printExhibit, h: 2.3 },
  ];

  for (const ex of EXHIBITS) {
    const base = plinth(1.8, 1.15, 1.8, ex.label);
    ctx.add(base, ex.x, 0, ex.z);
    ctx.collide(ex.x, ex.z, 1.9, 1.9, 0);

    const piece = ex.build(ctx, ex.x, 1.15, ex.z);
    ctx.interact(ex.id, piece, ctx.anchor(ex.x, ex.h + 0.75, ex.z));

    ctx.add(exhibitSpot(), ex.x, 7.6, ex.z);
    ctx.lamp(0xffe6be, ex.x, 4.6, ex.z, { intensity: 9, distance: 8, size: 2.4, opacity: 0.3 });
  }

  // ------------------------------------------------ the lab's own totem ----
  const totem = albersTotem(ctx);
  ctx.add(totem, 0, 0, -9);
  ctx.collide(0, -9, 2.4, 2.4, 0);
  ctx.interact('ex_origin', totem, ctx.anchor(0, 3.6, -9));
  ctx.lamp(0xffcf8a, 0, 5.2, -8.6, { intensity: 22, distance: 14, size: 4.6, opacity: 0.45 });
  ctx.add(exhibitSpot(0xffd9a0), 0, 7.4, -9);

  // ------------------------------------------------------------ dressing ---
  // seating down the middle of the aisle, facing the exhibits
  for (const z of [-3, 4]) {
    const bench = box(3.2, 0.42, 1.1, M.wood('#5d4128', [2, 1]));
    ctx.add(bench, -2.4, 0.6, z);
    for (const sx of [-1, 1]) ctx.add(box(0.16, 0.6, 0.9, M.wood('#3f2f20')), -2.4 + sx * 1.4, 0.3, z);
    ctx.collide(-2.4, z, 3.2, 1.1, 0);
  }

  // framed plates along the far (west) wall
  const titles = ['field study', 'ablation', 'first flight', 'the rig'];
  titles.forEach((t, i) => {
    const art = framedArt(1.5, 1.15, ['#6b7a5e', '#7a5638', '#4f6472', '#7a5a68'][i]);
    ctx.add(art, -15.6, 4.2, -8 + i * 5.2, Math.PI / 2);
  });

  // an introductory panel just inside the door, so the room explains itself
  const panel = box(4.6, 2.6, 0.12, new THREE.MeshStandardMaterial({
    map: textPlate(['THE HALL OF FAME', '', 'Walk up to anything here and', 'press E — or just click it.'], {
      w: 640, h: 360, bg: '#1c1e22', border: '#8a7040', color: '#e0d6c0',
      size: 42, font: '"Space Mono", monospace', weight: 400,
    }),
    roughness: 0.8,
  }));
  ctx.add(panel, 15.6, 4.4, 7.5, -Math.PI / 2);

  // corners: plants and a reading nook under the landing
  ctx.add(plant(1.4), -14, 0, 10);
  ctx.add(plant(1.1), -14, 0, -9.5);
  ctx.add(plant(1.2), 14, 0, 10.4);
  ctx.add(bookshelf(3, 3.6, 0.9, '#54391f', 3), -8, 0, -10.6);
  ctx.collide(-8, -10.6, 3, 0.9, 0);
  ctx.add(chair('#5d4128', '#7a5a44'), 9.4, 0, -10.2, 2.4);

  // dust in the pendant light
  const dust = makeDust(ctx);
  ctx.add(dust.points, 0, 0, 0);
  ctx.tick(dust.tick);
}

// ---------------------------------------------------------------------------
// the exhibits themselves
// ---------------------------------------------------------------------------

/** ZEPHYR — a quadrotor hovering above its plinth, rotors idling. */
function droneExhibit(ctx, x, y, z) {
  const g = new THREE.Group();
  const shell = M.metal('#d8d3c6', 0.5);
  const dark = paint('#2b2f34', { roughness: 0.6 });

  const body = box(0.86, 0.24, 0.62, shell);
  g.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    paint('#3f4a52', { roughness: 0.35, metalness: 0.3 }));
  canopy.scale.set(1, 0.7, 1.2); canopy.position.y = 0.12; g.add(canopy);

  const props = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const arm = box(0.9, 0.07, 0.11, dark);
    arm.position.set(sx * 0.44, 0.02, sz * 0.34);
    arm.rotation.y = -sx * sz * 0.62;
    g.add(arm);

    const ax = sx * 0.78, az = sz * 0.62;
    g.add(cyl(0.1, 0.12, 0.16, dark, 8, { pos: [ax, 0.08, az] }));
    const rotor = new THREE.Group();
    for (let b = 0; b < 2; b++) {
      const blade = box(0.9, 0.02, 0.1, paint('#4a5058', { roughness: 0.5 }));
      blade.rotation.y = b * Math.PI / 2;
      rotor.add(blade);
    }
    rotor.position.set(ax, 0.18, az);
    g.add(rotor);
    props.push(rotor);

    const leg = box(0.06, 0.34, 0.06, dark);
    leg.position.set(sx * 0.3, -0.2, sz * 0.24); g.add(leg);
  }
  const skid1 = box(0.08, 0.06, 0.9, dark); skid1.position.set(-0.3, -0.38, 0);
  const skid2 = skid1.clone(); skid2.position.x = 0.3;
  g.add(skid1, skid2);

  // status LED, so the thing looks powered
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
    paint('#7fd7c4', { emissive: '#7fd7c4', emissiveIntensity: 3 }));
  led.position.set(0, 0.02, 0.33); g.add(led);

  ctx.add(g, x, y + 0.95, z, 0.5);
  let t = Math.random() * 9;
  ctx.tick((dt) => {
    t += dt;
    g.position.y = y + 0.95 + Math.sin(t * 1.1) * 0.055;
    g.rotation.z = Math.sin(t * 0.8) * 0.035;
    for (let i = 0; i < props.length; i++) props[i].rotation.y += dt * (7 + i * 0.4);
  });
  return g;
}

/** ATLAS — a match ball, slowly turning. */
function footballExhibit(ctx, x, y, z) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2),
    surface({ map: 'canvas', repeat: [2, 2], color: '#efe9dc', roughness: 0.72 }));
  g.add(ball);
  // dark panels, laid on the icosahedron's own vertex directions
  const geo = new THREE.IcosahedronGeometry(0.42, 0);
  const pos = geo.attributes.position;
  const seen = new Set();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    const key = v.toArray().map((n) => n.toFixed(2)).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.145, 5), paint('#22262b', { roughness: 0.65 }));
    patch.position.copy(v).multiplyScalar(0.415);
    patch.lookAt(v.clone().multiplyScalar(2));
    g.add(patch);
  }
  const tee = cyl(0.16, 0.2, 0.1, M.metal('#8d8a83', 0.5), 12);
  tee.position.y = -0.44; g.add(tee);

  ctx.add(g, x, y + 0.58, z);
  let t = 0;
  ctx.tick((dt) => { t += dt; g.rotation.y += dt * 0.35; g.rotation.x = Math.sin(t * 0.5) * 0.12; });
  return g;
}

/** DAEDALUS — a framed generative print on a small easel. */
function printExhibit(ctx, x, y, z) {
  const g = new THREE.Group();
  const art = new THREE.MeshStandardMaterial({ map: generativePrintTexture(), roughness: 0.9 });
  const frame = framedArt(1.15, 1.45, art, '#3f2f20');
  frame.position.y = 0.95;
  frame.rotation.x = -0.12;
  g.add(frame);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = box(0.07, 1.5, 0.07, M.wood('#5d4128'));
    leg.position.set(Math.cos(a) * 0.4, 0.6, Math.sin(a) * 0.4 - 0.1);
    leg.rotation.set(-Math.sin(a) * 0.16, 0, Math.cos(a) * 0.16);
    g.add(leg);
  }
  ctx.add(g, x, y, z, -0.35);
  return g;
}



/** The lab's own mark: Albers-style nested squares, standing on a base. */
function albersTotem(ctx) {
  const g = new THREE.Group();
  const base = box(2.2, 0.5, 2.2, M.stone([1, 1]));
  base.position.y = 0.25; g.add(base);
  const column = box(0.5, 3.0, 0.5, M.wood('#3f2f20', [1, 2]));
  column.position.y = 1.9;
  g.add(column);

  const cols = ['#c9a24a', '#c97a3a', '#a8452f', '#6b4a78'];
  const sizes = [2.6, 2.0, 1.4, 0.85];
  const squares = [];
  for (let i = 0; i < 4; i++) {
    const s = box(sizes[i], sizes[i], 0.12 + i * 0.03,
      paint(cols[i], { emissive: cols[i], emissiveIntensity: 0.28, roughness: 0.6 }));
    s.position.set(0, 3.4, 0.06 + i * 0.05);
    g.add(s);
    squares.push(s);
  }
  let t = 0;
  ctx.tick((dt) => {
    t += dt;
    for (let i = 0; i < squares.length; i++) {
      squares[i].material.emissiveIntensity = 0.22 + Math.sin(t * 0.8 + i * 0.9) * 0.16;
      squares[i].rotation.z = Math.sin(t * 0.25 + i) * 0.012 * (i + 1);
    }
  });
  return g;
}

// ---------------------------------------------------------------------------
// canvas art
// ---------------------------------------------------------------------------

/** Stand-in for a DAEDALUS output: layered CPPN-ish contours. */
function generativePrintTexture() {
  const c = document.createElement('canvas'); c.width = 384; c.height = 480;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 384, 480);
  const pal = ['#a8452f', '#3e6b62', '#c9a24a', '#6b4a78', '#2f4a44'];
  for (let layer = 0; layer < 5; layer++) {
    g.strokeStyle = pal[layer];
    g.globalAlpha = 0.55;
    g.lineWidth = 1.1 + layer * 0.25;
    for (let k = 0; k < 26; k++) {
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = i / 120 * Math.PI * 2;
        const r = 60 + layer * 22 + Math.sin(t * (3 + layer) + k * 0.24) * (18 + k * 0.7)
          + Math.cos(t * (7 - layer) + layer) * 9;
        const x = 192 + Math.cos(t) * r * 0.8;
        const y = 240 + Math.sin(t) * r;
        i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath(); g.stroke();
    }
  }
  g.globalAlpha = 1;
  g.fillStyle = '#2a2018';
  g.font = '500 15px "Space Mono", monospace';
  g.fillText('daedalus / cppn-neat / clip', 22, 456);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Inlaid floor medallion where the aisles cross. */
function medallionTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#6b5a3e'; g.beginPath(); g.arc(256, 256, 254, 0, 7); g.fill();
  g.fillStyle = '#8a7048'; g.beginPath(); g.arc(256, 256, 214, 0, 7); g.fill();
  g.strokeStyle = '#d8c89a'; g.lineWidth = 5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * 60, 256 + Math.sin(a) * 60);
    g.lineTo(256 + Math.cos(a) * 205, 256 + Math.sin(a) * 205);
    g.stroke();
  }
  g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(256, 256, 58, 0, 7); g.fill();
  g.fillStyle = '#2a2018'; g.beginPath(); g.arc(256, 256, 30, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Motes drifting through the pendant light. */
function makeDust(ctx) {
  const N = 150;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = -11 + Math.random() * 23;
    vel[i] = 0.08 + Math.random() * 0.18;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffeccc, size: 0.055, transparent: true, opacity: 0.4,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const tick = (dt) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += vel[i] * dt;
      if (a[i * 3 + 1] > 7) a[i * 3 + 1] = 0.2;
      a[i * 3] += Math.sin(performance.now() * 0.0003 + i) * dt * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, tick };
}
