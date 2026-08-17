import * as THREE from 'three';
import { M, box, cyl, lathe, paint, surface, decal, screenMaterial , FLOOR } from '../materials.js';
import { QUALITY } from '../../core/quality.js';
import {
  table, chair, stool, plant, hangingPlant, pendant, framedArt, monitor, crate, plaque, rug,
} from '../props.js';

// -----------------------------------------------------------------------------
// rooms/studio.js — the studio area of the Research Lab.
//
// The warmest and most cluttered part of the building. Where the robotics bays
// are gridded and bolted down, this end is diagonal: nothing quite square to the
// walls, paper on every surface, and one wall given over entirely to screens.
// They face each other across an open floor on purpose.
// -----------------------------------------------------------------------------

export function buildStudio(ctx, centreX = -49) {
  const CX = centreX;         // centre of the studio *area*, not the room

  ctx.add(rug(9, 7, [1, 1]), CX, FLOOR.rug, 2);

  // ------------------------------------------------------------- plotter ---
  const plotter = buildPlotter(ctx);
  ctx.add(plotter, CX - 6.5, 0, -6, 0.35);
  ctx.collide(CX - 6.5, -6, 3.2, 2.2, 0);
  ctx.interact('st_plotter', plotter, ctx.anchor(CX - 6.5, 2.3, -6));

  // ----------------------------------------------------------- media wall --
  const wall = new THREE.Group();
  const screens = [];
  const feeds = [
    { lines: ['touchdesigner', 'feed 01'], accent: '#8fd0d8', plot: true },
    { lines: ['glsl / noise'], accent: '#e0a13c' },
    { lines: ['pose  → sound'], accent: '#b4547e', plot: true },
    { lines: ['daedalus', 'gen 214'], accent: '#7fd7c4' },
  ];
  feeds.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const s = box(2.6, 1.7, 0.16, screenMaterial(f.lines, { ...f, intensity: 1.1 }));
    s.position.set(-1.45 + col * 2.9, 1.0 - row * 1.9, 0);
    wall.add(s);
    screens.push(s.material);
  });
  wall.add(box(6.6, 4.4, 0.1, M.metal('#33383e', 0.6), { pos: [0, 0, -0.1] }));
  ctx.add(wall, CX, 4.2, -11.1);
  ctx.interact('st_mediawall', wall, ctx.anchor(CX, 6.8, -10.6));
  ctx.tick(() => {
    const t = performance.now() * 0.001;
    screens.forEach((m, i) => { m.emissiveIntensity = 0.95 + Math.sin(t * 1.7 + i * 1.4) * 0.22; });
  });
  ctx.lamp(0xbf8fd0, CX, 4.4, -9.4, { intensity: 16, distance: 14, size: 5, opacity: 0.3 });

  // desk under the media wall
  ctx.add(table(6, 1.5, 1.1, '#7a5630'), CX, 0, -9.4);
  ctx.collide(CX, -9.4, 6, 1.5, 0);
  ctx.add(monitor(1.3, 0.85, ['> sketch_014.py', '> running'], { accent: '#e0a13c' }), CX - 1.8, 1.65, -9.6, 0.2);
  ctx.add(monitor(1.3, 0.85, ['fps 60', 'particles 40k'], { accent: '#8fd0d8', plot: true }), CX + 1.8, 1.65, -9.6, -0.2);
  for (const sx of [-1, 0, 1]) ctx.add(chair('#6f4c2c', '#8a5a68'), CX + sx * 2, 0, -7.6, Math.PI);

  // ---------------------------------------------------------- print wall ---
  const prints = new THREE.Group();
  const palette = ['#a8452f', '#3e6b62', '#c9a24a', '#6b4a78', '#8a5638', '#4f6472'];
  for (let i = 0; i < 12; i++) {
    const w = 0.9 + Math.random() * 0.5, h = w * (1.1 + Math.random() * 0.4);
    const f = framedArt(w, h, palette[i % palette.length], '#2f2620');
    f.position.set(-3.6 + (i % 4) * 2.4, 1.8 - Math.floor(i / 4) * 1.9, 0);
    f.rotation.z = (Math.random() - 0.5) * 0.05;
    prints.add(f);
  }
  ctx.add(prints, CX + 3, 4.6, 11.6, Math.PI);
  ctx.interact('st_easel', prints, ctx.anchor(CX + 3, 7.0, 11.0));
  ctx.lamp(0xffd9a8, CX + 3, 6.6, 10.2, { intensity: 12, distance: 11, size: 3.6, opacity: 0.32 });

  // an easel standing away from the wall, mid-work
  const easel = buildEasel();
  ctx.add(easel, CX + 7.4, 0, 7.6, -0.7);
  ctx.collide(CX + 7.4, 7.6, 1.2, 1.2, 0);

  // ------------------------------------------------------ teaching table ---
  const tt = table(4.4, 2.2, 1.1, '#8a6236');
  ctx.add(tt, CX - 5, 0, 6, 0.12);
  ctx.collide(CX - 5, 6, 4.6, 2.4, 0);
  ctx.interact('st_p5table', tt, ctx.anchor(CX - 5, 2.0, 6));
  for (let i = 0; i < 4; i++) {
    const nb = box(0.62, 0.06, 0.44, M.paper());
    ctx.add(nb, CX - 6.3 + i * 0.85, 1.19, 5.6 + (i % 2) * 0.7, (Math.random() - 0.5) * 0.5);
  }
  // two open laptops
  for (const [lx, lz, ry] of [[CX - 5.8, 6.4, 0.3], [CX - 3.9, 6.2, -0.5]]) {
    const lap = new THREE.Group();
    lap.add(box(0.9, 0.05, 0.62, M.metal('#8d9298', 0.4)));
    const lid = box(0.9, 0.58, 0.04, screenMaterial(['p5.js', 'walker.js'], { accent: '#7fd7c4' }));
    lid.position.set(0, 0.3, -0.3); lid.rotation.x = -0.32;
    lap.add(lid);
    ctx.add(lap, lx, 1.18, lz, ry);
  }
  for (const [sx, sz] of [[CX - 6.6, 7.8], [CX - 4.6, 8.0], [CX - 2.8, 7.4]]) {
    ctx.add(chair('#6f4c2c', '#6b7a5e'), sx, 0, sz, Math.PI + (Math.random() - 0.5) * 0.5);
  }

  // ------------------------------------------------------------ dressing ---
  // a paint-spattered supply table
  // Also pulled off the old wall line and back against the north wall, for the
  // same reason: the room is open there now.
  ctx.add(table(2.4, 1.2, 1.0, '#6a4a2c'), CX + 6.2, 0, -9.8, -0.12);
  ctx.collide(CX + 6.2, -9.8, 2.4, 1.4, 0);
  for (let i = 0; i < 9; i++) {
    const jar = lathe([[0, 0], [0.09, 0], [0.1, 0.24], [0.07, 0.28]],
      paint(palette[i % palette.length], { roughness: 0.5 }), 10);
    ctx.add(jar, CX + 6.8 + (i % 3) * 0.36, 1.0, -1.9 + Math.floor(i / 3) * 0.4);
  }
  const roll = cyl(0.34, 0.34, 1.6, M.paper(), 14);
  roll.rotation.z = Math.PI / 2;
  ctx.add(roll, CX + 8.2, 0.36, 3.4, 0.2);

  ctx.add(crate(1.1, '#8a6236'), CX - 8.6, 0, 9.6, 0.4);
  ctx.add(plant(1.5), CX + 8.6, 0, 10.2);
  ctx.add(plant(1.0), CX - 8.8, 0, -1.5);
  ctx.add(hangingPlant(1.2), CX - 3, 6.4, 10.4);

  ctx.add(plaque('CREATIVE STUDIO', 3.2, 0.6, { bg: '#2a2230' }), CX, 6.6, 11.4, Math.PI);

  // ---------------------------------------------------------------- light --
  for (const [lx, lz] of [[CX - 5, 6], [CX + 4, 4], [CX - 4, -4]]) {
    ctx.add(pendant('#9a5aa0', 2.2, 0.7), lx, 5.6, lz);
    ctx.lamp(0xffc8e0, lx, 5.1, lz, { intensity: 18, distance: 16, size: 4.4, opacity: 0.34 });
  }
  // a strip of coloured LEDs along the far wall, because of course there is one
  for (let i = 0; i < 6; i++) {
    const c = ['#b4547e', '#8a5aa0', '#4f7d93'][i % 3];
    const strip = box(3.2, 0.1, 0.1, paint(c, { emissive: c, emissiveIntensity: 2 }));
    ctx.add(strip, 17.2, 6.6 - i * 0.0, -8 + i * 3.4, 0);
  }
}

// ---------------------------------------------------------------------------
/** A flatbed pen plotter, drawing a line at a time. */
function buildPlotter(ctx) {
  const g = new THREE.Group();
  const frame = M.metal('#8d9298', 0.45);
  g.add(box(3.0, 0.9, 2.0, M.wood('#5d4128', [1, 1]), { pos: [0, 0.45, 0] }));
  const bed = box(2.8, 0.1, 1.8, M.paper());
  bed.position.y = 0.95; g.add(bed);

  // the drawing appearing on the bed, redrawn as the gantry sweeps
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 330;
  const cg = canvas.getContext('2d');
  cg.fillStyle = '#f2ecda'; cg.fillRect(0, 0, 512, 330);
  const drawTex = new THREE.CanvasTexture(canvas);
  drawTex.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.55),
    new THREE.MeshStandardMaterial({ map: drawTex, roughness: 0.95 }));
  sheet.rotation.x = -Math.PI / 2; sheet.position.y = 1.01; g.add(sheet);

  for (const sx of [-1, 1]) g.add(box(0.12, 0.5, 2.0, frame, { pos: [sx * 1.5, 1.2, 0] }));
  const gantry = new THREE.Group();
  gantry.add(box(3.2, 0.16, 0.16, frame));
  const head = box(0.24, 0.3, 0.3, paint('#c97a3a'));
  head.position.y = -0.14; gantry.add(head);
  gantry.position.y = 1.35;
  g.add(gantry);

  let t = Math.random() * 10, px = 0, py = 0, upload = 0;
  // Where this plotter ends up is decided by the caller, so ask the object
  // itself once it has been placed rather than guessing from a room centre.
  const HOME = new THREE.Vector3();
  let homed = false;
  ctx.tick((dt, playerPos) => {
    if (!homed) { g.updateWorldMatrix(true, false); g.getWorldPosition(HOME); homed = true; }
    t += dt;
    const u = (Math.sin(t * 0.5) * 0.5 + 0.5);
    const v = (Math.sin(t * 0.31 + 1.2) * 0.5 + 0.5);
    gantry.position.z = -0.85 + v * 1.7;
    head.position.x = -1.1 + u * 2.2;

    // The pen keeps drawing, but the *canvas* only goes to the GPU when there
    // is somebody to see it, and then only about twelve times a second.
    // Re-uploading a 512x330 texture every frame — from anywhere in the
    // building, including three rooms away — was tens of megabytes a second of
    // transfer and the single biggest cause of dropped frames.
    const nx = u * 512, ny = v * 330;
    cg.strokeStyle = 'rgba(30,40,48,0.8)'; cg.lineWidth = 1.6;
    cg.beginPath(); cg.moveTo(px, py); cg.lineTo(nx, ny); cg.stroke();
    px = nx; py = ny;
    if (t % 26 < dt) { cg.fillStyle = '#f2ecda'; cg.fillRect(0, 0, 512, 330); }

    upload -= dt;
    if (upload <= 0 && playerPos && playerPos.distanceToSquared(HOME) < 900) {
      drawTex.needsUpdate = true;
      // 20fps at medium and 28 at high — fast enough that the pen looks like it
      // is drawing rather than stamping, without going back to every frame.
      upload = QUALITY.liveTex;
    }
  });
  return g;
}

function buildEasel() {
  const g = new THREE.Group();
  const wood = M.wood('#7a5630', [1, 1]);
  for (const [x, z, tilt] of [[-0.4, 0.3, 0.12], [0.4, 0.3, -0.12], [0, -0.5, -0.18]]) {
    const leg = box(0.09, 2.1, 0.09, wood);
    leg.position.set(x, 1.05, z);
    leg.rotation.set(tilt * (z < 0 ? 1 : -0.4), 0, -x * 0.3);
    g.add(leg);
  }
  g.add(box(1.1, 0.1, 0.14, wood, { pos: [0, 1.0, 0.26] }));
  const canvasBoard = box(1.2, 1.5, 0.06,
    surface({ map: 'canvas', repeat: [1, 1], color: '#e6dfcc', roughness: 0.95 }));
  canvasBoard.position.set(0, 1.78, 0.24);
  canvasBoard.rotation.x = -0.1;
  g.add(canvasBoard);
  // a half-finished study in progress
  const study = box(0.8, 0.9, 0.02, paint('#a8452f', { roughness: 0.9 }));
  study.position.set(-0.1, 1.85, 0.29); study.rotation.x = -0.1;
  g.add(study);
  return g;
}
