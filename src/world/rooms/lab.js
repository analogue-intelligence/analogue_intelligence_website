import * as THREE from 'three';
import { M, box, cyl, paint, surface, decal, textPlate, glow , FLOOR } from '../materials.js';
import { plant, hangingPlant, framedArt, plaque, rug, stool } from '../props.js';
import { LAB_ROBOTICS_X, LAB_STUDIO_X } from '../floorplan.js';
import { buildRobotics } from './robotics.js';
import { buildStudio } from './studio.js';

// -----------------------------------------------------------------------------
// rooms/lab.js — the Research Lab: one creative robotics studio.
//
// The first version of this room merged two rooms but kept them legible as two
// halves: a floor change on the old wall line, area signs, and a long shared
// bench sitting exactly where the wall had been. That was worse than a wall.
// You enter from the east heading west, and a bench running north–south sits
// *across* your path — so the west end read as sealed off, and the two areas
// still read as two areas with a seam between them.
//
// The rule this version follows: nothing long is allowed to run perpendicular to
// the way in. One floor, one light, one colour scheme, and the two practices
// interleaved rather than adjacent — a plotter among the workbenches, a robot
// arm holding a paintbrush, colour everywhere. The argument that engineering and
// making are one practice is made by the room being unable to show you where one
// stops.
// -----------------------------------------------------------------------------

const MID = (LAB_ROBOTICS_X + LAB_STUDIO_X) / 2;     // x = -38, the old wall line

export function buildLab(ctx) {
  // The two practices, laid out around their own centres. No divider between
  // them and no floor change: the room's boards run the full 44 units.
  buildRobotics(ctx, LAB_ROBOTICS_X);
  buildStudio(ctx, LAB_STUDIO_X);

  colour(ctx);
  crossover(ctx);
}

// ---------------------------------------------------------------------------
// colour and decoration, distributed evenly so no part of the room is duller
// than another — an even spread is what makes a space read as one space.
// ---------------------------------------------------------------------------
function colour(ctx) {
  // --- rugs, in three places, so the eye never rests on bare floor ---------
  ctx.add(rug(7.5, 5.5, [1, 1]), MID + 1.5, FLOOR.rug, -6.5);
  ctx.add(rug(6.0, 4.5, [1, 1]), LAB_ROBOTICS_X + 3.5, FLOOR.rug, 8.0);
  ctx.add(rug(5.5, 4.0, [1, 1]), LAB_STUDIO_X - 4.0, FLOOR.rug, -8.0);

  // --- paint on the floor, as if the room had been used ------------------
  const SPLASH = ['#e0673c', '#e8b23c', '#4f9d93', '#8a5aa8', '#5e8a4a', '#d8547e'];
  for (let i = 0; i < 22; i++) {
    const c = SPLASH[i % SPLASH.length];
    const r = 0.28 + (i % 5) * 0.13;
    const blob = decal(r * 2, r * 1.7, new THREE.MeshStandardMaterial({
      color: c, roughness: 0.85, transparent: true, opacity: 0.55,
    }), FLOOR.stain);
    const x = -58 + (i * 37) % 41;
    const z = -10 + (i * 23) % 21;
    ctx.add(blob, x, FLOOR.stain, z, i * 0.7);
  }

  // --- a colour-block mural along the north wall --------------------------
  // Nested squares, which is the group's own mark. It runs the length of the
  // room deliberately: one continuous piece of colour across both practices is
  // the cheapest possible way to stop them reading as two rooms.
  const MURAL = [
    ['#c94f3c', '#e8a03c'], ['#3c7d93', '#8fc4c0'], ['#8a5aa8', '#d8a2c8'],
    ['#5e8a4a', '#c6d86f'], ['#d8547e', '#f0b0a8'], ['#c9a24a', '#efdca8'],
  ];
  MURAL.forEach(([outer, inner], i) => {
    const x = -56 + i * 7.4;
    const back = box(6.0, 4.4, 0.08, paint(outer));
    ctx.add(back, x, 4.6, -11.2);
    const mid = box(3.9, 2.9, 0.09, paint(inner));
    ctx.add(mid, x, 4.6, -11.15);
    const core = box(1.9, 1.4, 0.1, paint(outer));
    ctx.add(core, x, 4.6, -11.1);
  });

  // --- bunting, strung the whole length -----------------------------------
  // Strung, not scattered: the cord sags in short straight runs and each flag
  // hangs from the point above it. A dead-level cord with flags floating below
  // it was the reason these read as confetti suspended in mid-air.
  const FLAGS = ['#e0673c', '#e8b23c', '#4f9d93', '#8a5aa8', '#5e8a4a', '#d8547e', '#c9a24a'];
  const N = 30, X0 = -58.5, DX = 1.45;
  const cordY = (i) => 6.95 - Math.sin((i / (N - 1)) * Math.PI) * 0.55;
  for (let run = 0; run < 2; run++) {
    const z = run ? 7.4 : -3.0;
    for (let i = 0; i < N; i++) {
      const x = X0 + i * DX;
      const y = cordY(i);
      // the cord segment to the next point, angled to match the sag
      if (i < N - 1) {
        const y2 = cordY(i + 1);
        const seg = box(Math.hypot(DX, y2 - y), 0.05, 0.05, paint('#6d5a44'));
        seg.rotation.z = Math.atan2(y2 - y, DX);
        ctx.add(seg, x + DX / 2, (y + y2) / 2, z);
      }
      const flag = box(0.5, 0.62, 0.03, paint(FLAGS[(i + run * 3) % FLAGS.length]));
      ctx.add(flag, x, y - 0.33, z, 0.2 + (i % 3) * 0.15);
    }
  }

  // --- prints and pinned work, both ends and the middle -------------------
  const ART = ['#c94f3c', '#3c7d93', '#8a5aa8', '#5e8a4a', '#d8547e', '#e8a03c'];
  ART.forEach((c, i) => {
    ctx.add(framedArt(1.5 + (i % 3) * 0.3, 1.15 + (i % 2) * 0.35, c),
      -59.6, 4.3 + (i % 2) * 1.7, -8 + i * 3.4, Math.PI / 2);
  });

  // --- planting, spread rather than cornered ------------------------------
  for (const [x, z, s] of [[-58, 9.6, 1.5], [-47, 10.2, 1.2], [-38, 9.8, 1.35],
    [-29, 10.4, 1.15], [-19, 9.4, 1.45], [-57, -9.6, 1.2],
    [-41, -9.2, 1.3], [-24, -9.6, 1.1]]) {
    ctx.add(plant(s), x, 0, z);
  }
  for (const [x, z] of [[-54, -2], [-45, 6], [-35, -4], [-25, 3]]) {
    ctx.add(hangingPlant(1.0), x, 6.3, z);
  }

  // --- warm practical light, evenly spaced, one colour temperature --------
  for (const x of [-55, -47, -39, -31, -22]) {
    ctx.lamp(0xffe2b0, x, 5.6, 0.5, { intensity: 11, distance: 15, size: 3.2, opacity: 0.32 });
  }
  ctx.lamp(0xffd08a, MID + 1.5, 4.2, -6.5, { intensity: 8, distance: 11, size: 2.6, opacity: 0.28 });
}

// ---------------------------------------------------------------------------
// the crossover pieces: things that belong to both practices at once, placed
// in the middle third where the wall used to be.
// ---------------------------------------------------------------------------
function crossover(ctx) {
  // --- a robot arm holding a paintbrush -----------------------------------
  // The whole thesis of the room in one object, and the reason there is no
  // sign explaining it. Set north of the walking line so the way west stays
  // open from the door.
  const painter = paintingArm(ctx);
  ctx.add(painter.group, MID, 0, -7.2, -0.5);
  ctx.collide(MID, -7.2, 2.2, 2.2, 0);
  ctx.tick(painter.tick);

  // Nothing stands in the middle of the floor. Waist-high shelving was still
  // furniture parked in the one place the room needs to stay open — the first
  // thing you see through the door should be the far wall, not storage.
  // Seating instead, pulled back to the edges of the rugs where it belongs.
  for (const [x, z, t] of [[MID - 6.2, -5.0, '#c94f3c'], [MID + 5.4, -8.2, '#3c7d93'],
    [MID + 4.6, -4.4, '#e8b23c'], [MID - 5.8, -8.6, '#5e8a4a']]) {
    ctx.add(stool(0.82, t), x, 0, z, x * 0.3);
  }

  ctx.add(plaque(['one practice', 'two habits']), MID, 2.2, -11.05);
}

/** A six-axis arm with a brush, painting a canvas it never quite finishes. */
function paintingArm(ctx) {
  const g = new THREE.Group();
  const metal = surface({ map: 'metal', repeat: [1, 1], color: '#d8d2c4', roughness: 0.42, metalness: 0.5 });
  const accent = paint('#e0673c');

  const base = cyl(0.62, 0.75, 0.34, metal, 18);
  base.position.y = 0.17;
  const column = cyl(0.42, 0.5, 0.6, accent, 16);
  column.position.y = 0.6;
  g.add(base, column);

  const shoulder = new THREE.Group();
  shoulder.position.y = 0.9;
  const upper = box(0.34, 1.7, 0.34, metal);
  upper.position.y = 0.85;
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = 1.7;
  const fore = box(0.28, 1.35, 0.28, metal);
  fore.position.y = 0.67;
  const elbowCap = cyl(0.22, 0.22, 0.4, accent, 12);
  elbowCap.rotation.z = Math.PI / 2;
  elbow.add(fore, elbowCap);

  const wrist = new THREE.Group();
  wrist.position.y = 1.35;
  const brushFerrule = cyl(0.07, 0.07, 0.34, paint('#b8ac96'), 10);
  brushFerrule.position.y = 0.17;
  const bristles = cyl(0.075, 0.03, 0.24, paint('#8a5aa8'), 10);
  bristles.position.y = 0.44;
  wrist.add(brushFerrule, bristles);

  elbow.add(wrist);
  shoulder.add(elbow);
  g.add(shoulder);

  // the canvas it is working on, and a palette on a stand
  const easel = new THREE.Group();
  const legs = [[-0.62, 0.1], [0.62, 0.1], [0, -0.5]];
  for (const [dx, dz] of legs) {
    const leg = box(0.09, 2.5, 0.09, paint('#8a6236'));
    leg.position.set(dx, 1.25, dz);
    leg.rotation.x = dz < 0 ? -0.12 : 0.06;
    easel.add(leg);
  }
  const canvas = box(1.9, 1.5, 0.07, new THREE.MeshStandardMaterial({
    map: livePainting(), roughness: 0.92,
  }));
  canvas.position.set(0, 1.95, 0.1);
  easel.add(canvas);
  easel.position.set(1.55, 0, 0.35);
  easel.rotation.y = -0.5;
  g.add(easel);

  const palette = box(0.9, 0.05, 0.6, paint('#c6a878'));
  palette.position.set(-1.5, 1.05, 0.5);
  palette.rotation.y = 0.5;
  g.add(palette);
  const DAB = ['#c94f3c', '#e8b23c', '#3c7d93', '#8a5aa8', '#5e8a4a'];
  DAB.forEach((c, i) => {
    const d = cyl(0.09, 0.09, 0.03, paint(c), 8);
    d.position.set(-1.72 + i * 0.11, 1.09, 0.36 + (i % 2) * 0.16);
    d.rotation.y = 0.5;
    g.add(d);
  });
  const stand = box(0.7, 1.05, 0.5, paint('#6d5a44'));
  stand.position.set(-1.5, 0.52, 0.5);
  g.add(stand);

  let t = 0;
  return {
    group: g,
    tick: (dt) => {
      t += dt;
      // a slow, deliberate stroke rather than a machine cycle
      shoulder.rotation.y = Math.sin(t * 0.34) * 0.42 + 0.35;
      shoulder.rotation.x = Math.sin(t * 0.51) * 0.13 - 0.16;
      elbow.rotation.x = Math.sin(t * 0.42 + 1.1) * 0.34 + 0.5;
      wrist.rotation.x = Math.sin(t * 0.75) * 0.22 - 0.3;
      wrist.rotation.z = Math.cos(t * 0.6) * 0.16;
    },
  };
}

/** The canvas on the easel: a painting in the group's own idiom. */
function livePainting() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6d2';
  g.fillRect(0, 0, 256, 200);
  const COLS = ['#c94f3c', '#e8b23c', '#3c7d93', '#8a5aa8', '#5e8a4a', '#d8547e'];
  let s = 11;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 5; i++) {
    g.globalAlpha = 0.85;
    g.fillStyle = COLS[i % COLS.length];
    const w = 150 - i * 26, h = 118 - i * 20;
    g.fillRect(128 - w / 2 + (rnd() - 0.5) * 8, 100 - h / 2 + (rnd() - 0.5) * 8, w, h);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#2e2720'; g.lineWidth = 2.5; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.moveTo(rnd() * 256, rnd() * 200);
    g.lineTo(rnd() * 256, rnd() * 200);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}


