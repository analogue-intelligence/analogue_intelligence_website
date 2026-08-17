import * as THREE from 'three';
import { M, box, cyl, paint, surface, decal, textPlate, screenMaterial, glow , FLOOR } from '../materials.js';
import {
  table, chair, plant, hangingPlant, plinth, framedArt,
  bookshelf, rug, plaque, sofa, stool,
} from '../props.js';
import { PARTNERS_X } from '../floorplan.js';

// -----------------------------------------------------------------------------
// rooms/partners.js — the room that makes the case.
//
// This was a sponsorship room with priced tiers, which answered a question
// nobody had asked yet: a price list assumes the visitor has already decided to
// back you and is only choosing an amount. The earlier and harder job is
// convincing them the work is worth backing at all.
//
// So it is laid out as an argument you walk through. The door is at the
// south-east; the path runs up the west wall — claim, why now, evidence — turns
// along the north wall — people, direction, how partnership works — and ends at
// a writing desk with one way to reply. Sequence is the thing a room can do
// that a PDF cannot, so the sequence *is* the pitch.
//
// Content lives in data/content.js under the `pt_` prefix. The only two walls
// used are x = 16 and z = -11.5: the other two are always dissolved by the
// cutaway from any position inside the room, so anything hung there would be
// read against open air.
// -----------------------------------------------------------------------------

const WEST = 16.42;          // inner face of the partition wall
const NORTH = -11.22;        // inner face of the north wall

export function buildPartners(ctx) {
  const CX = PARTNERS_X;

  ctx.add(rug(11, 8, [1, 1]), CX + 1, FLOOR.rug, 2.5);

  // ============================================================ the path ====

  // --- 1. the claim -------------------------------------------------------
  // Deliberately the largest object in the room, and the first thing in view
  // when you turn left through the door.
  pitchBoard(ctx, {
    id: 'pt_thesis',
    lines: ['THE CLAIM', '',
      'Intelligence worth having is', 'intelligence that survives contact',
      'with a physical room.'],
    x: WEST, z: 3.0, w: 5.4, h: 3.4, y: 4.3, face: Math.PI / 2,
    tint: '#c9a24a', size: 46, lamp: true,
  });

  // --- 2. the evidence, which is the rest of the building -----------------
  pitchBoard(ctx, {
    id: 'pt_evidence',
    lines: ['TRACK RECORD', '',
      'Three projects delivered, a', 'workshop programme in its 25th',
      'year, and a university behind it.'],
    x: WEST, z: -4.6, w: 5.0, h: 3.1, y: 4.3, face: Math.PI / 2,
    tint: '#a8452f', size: 38,
  });

  // --- 4. the people ------------------------------------------------------
  pitchBoard(ctx, {
    id: 'pt_people',
    lines: ['WHO YOU WORK WITH', '',
      'A small group, which means the', 'people who answer are the people',
      'doing the work.'],
    x: 21.5, z: NORTH, w: 5.2, h: 3.1, y: 4.3, face: 0,
    tint: '#5e8a5a', size: 38,
  });

  // --- 5. where it goes next ----------------------------------------------
  pitchBoard(ctx, {
    id: 'pt_directions',
    lines: ['WHAT SUPPORT UNLOCKS', '',
      'Three directions, defined and', 'ready to run.'],
    x: 28.5, z: NORTH, w: 5.2, h: 3.1, y: 4.3, face: 0,
    tint: '#c9822f', size: 38, lamp: true,
  });

  // --- 6. how a partnership actually works --------------------------------
  pitchBoard(ctx, {
    id: 'pt_partnership',
    lines: ['WAYS TO WORK TOGETHER', '',
      'Bring a problem. Fund a', 'direction. Share a student.',
      'Commission an evaluation.'],
    x: 35.5, z: NORTH, w: 5.2, h: 3.1, y: 4.3, face: 0,
    tint: '#b08d46', size: 36,
  });

  // ==================================================== the middle of it ====

  // The building in miniature, under glass: institutional context, and a small
  // joke — you are standing in the thing on the table.
  const modelBase = plinth(3.0, 1.05, 2.2, 'VU AMSTERDAM');
  ctx.add(modelBase, CX, 0, -5.6);
  ctx.collide(CX, -5.6, 3.1, 2.3, 0);

  const model = miniature();
  ctx.add(model, CX, 1.05, -5.6);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: '#dff0f4', transparent: true, opacity: 0.17,
      roughness: 0.06, metalness: 0.1, side: THREE.DoubleSide,
    }));
  dome.position.set(CX, 1.08, -5.6);
  ctx.add(dome, 0, 0, 0);
  ctx.lamp(0xfff0d0, CX, 3.6, -5.6, { intensity: 9, distance: 9, size: 2.4, opacity: 0.3 });

  // --- the table you would actually sit at --------------------------------
  const t = table(4.8, 2.4, 1.15, '#7a5230');
  ctx.add(t, CX, 0, 3.2);
  ctx.collide(CX, 3.2, 4.8, 2.4, 0);
  for (const [dx, dz, rot] of [[-1.5, 2.4, 0.2], [1.5, 2.4, -0.2],
    [-1.5, -2.4, Math.PI - 0.2], [1.5, -2.4, Math.PI + 0.2]]) {
    ctx.add(chair('#6d4d2c', '#8a7a5a'), CX + dx, 0, 3.2 + dz * 1.1, rot);
  }
  const carafe = cyl(0.16, 0.2, 0.5, paint('#cfe0e2'), 12);
  ctx.add(carafe, CX - 1.4, 1.46, 3.2);
  for (let i = 0; i < 3; i++) {
    ctx.add(cyl(0.09, 0.08, 0.2, paint('#dfe9ea'), 10), CX - 0.8 + i * 0.42, 1.31, 3.6);
  }
  ctx.add(box(0.9, 0.05, 0.64, paint('#8a5638'), { rough: 0.01 }), CX + 1.2, 1.24, 3.0, 0.12);

  // The independence point used to stand here on its own board, phrased as a
  // list of refusals. It reads far better as the closing paragraph of "ways to
  // work together" — a reason the findings are worth having, rather than a
  // warning notice in the middle of a pitch.

  // ===================================================== the way to reply ===
  // One call to action, on the way out, impossible to walk past.
  const desk = table(3.0, 1.3, 1.1, '#6d4d2c');
  ctx.add(desk, 32.6, 0, 8.4, -0.12);
  ctx.collide(32.6, 8.4, 3.0, 1.3, 0);
  ctx.add(chair('#6d4d2c', '#8a7a5a'), 32.6, 0, 6.9, 0.1);

  const cta = box(2.0, 1.15, 0.12, new THREE.MeshStandardMaterial({
    map: textPlate(['WRITE TO US', '', 'hello@analogue-', 'intelligence.org'], {
      w: 420, h: 250, bg: '#241d18', border: '#c9a24a', color: '#f0e4c6',
      size: 40, font: '"Space Mono", monospace', weight: 700,
    }),
    roughness: 0.7, emissive: '#3a2c12', emissiveIntensity: 0.5,
  }));
  ctx.add(cta, 32.6, 2.1, 9.1, -0.12);
  ctx.interact('pt_contact', cta, ctx.anchor(32.6, 2.9, 9.1));
  ctx.lamp(0xffd98a, 32.6, 3.6, 8.8, { intensity: 11, distance: 10, size: 2.6, opacity: 0.34 });

  // a card holder and a pen, so the desk reads as a desk
  ctx.add(box(0.44, 0.26, 0.32, paint('#b08d46'), { rough: 0.02 }), 31.7, 1.24, 8.4, -0.12);
  ctx.add(cyl(0.03, 0.03, 0.32, paint('#2b2f34'), 8), 33.4, 1.28, 8.3, 0.9);

  // ============================================================= comfort ====
  // Seating sits south of z = 4. The line from the door at z = 8 through to the
  // writing desk is the walk the whole room is arranged around, and it stays
  // clear — furniture in it is the fastest way to make a room feel broken.
  ctx.add(sofa(3.4, '#7a6a52'), 19.9, 0, 1.4, Math.PI / 2);
  ctx.collide(19.9, 1.4, 1.3, 3.4, 0);
  ctx.add(table(1.2, 1.2, 0.5, '#5d4128'), 21.9, 0, 1.4);
  ctx.add(stool(0.8, '#5d6b4a'), 22.2, 0, -1.0);

  ctx.add(bookshelf(2.6, 3.0, 0.8, '#5d4128', 3), 36.9, 0, -8.4, -Math.PI / 2);
  ctx.collide(36.9, -8.4, 0.8, 2.6, 0);

  ctx.add(plant(1.5), 17.5, 0, 10.8);
  ctx.add(plant(1.2), 36.8, 0, 10.4);
  ctx.add(plant(1.35), 24.2, 0, -9.6);
  ctx.add(hangingPlant(1.1), 30.0, 6.4, -9.4);
  ctx.add(framedArt(1.8, 1.3, '#7a5638'), 37.5, 4.6, 3.5, -Math.PI / 2);

  ctx.lamp(0xffe0b0, CX, 6.2, 3.2, { intensity: 13, distance: 17, size: 3.6, opacity: 0.36 });
  ctx.lamp(0xffd9a0, 20, 5.4, 8.5, { intensity: 7, distance: 11, size: 2.4, opacity: 0.26 });

  ctx.add(plaque(['partners', 'welcome']), WEST + 0.02, 6.0, 9.6, Math.PI / 2);
}

// ---------------------------------------------------------------------------
/** One beat of the argument: a lit panel on a wall, readable and clickable. */
function pitchBoard(ctx, o) {
  const frame = box(o.w + 0.3, o.h + 0.3, 0.14, paint('#4a3320'));
  const panel = box(o.w, o.h, 0.1, new THREE.MeshStandardMaterial({
    map: textPlate(o.lines, {
      w: 640, h: Math.round(640 * (o.h / o.w)),
      bg: '#1e2126', border: o.tint, color: '#efe6d2',
      size: o.size ?? 40, font: '"Space Mono", monospace', weight: 400,
    }),
    roughness: 0.84,
  }));

  const dx = o.face === 0 ? 0 : 0.09;
  const dz = o.face === 0 ? 0.09 : 0;
  ctx.add(frame, o.x, o.y, o.z, o.face);
  ctx.add(panel, o.x + dx, o.y, o.z + dz, o.face);
  ctx.interact(o.id, panel, ctx.anchor(
    o.x + dx * 8, o.y - o.h / 2 - 0.3, o.z + dz * 8));

  if (o.lamp) {
    ctx.lamp(0xffe6be, o.x + dx * 18, o.y + o.h / 2 + 1.2, o.z + dz * 18,
      { intensity: 8, distance: 9, size: 2.2, opacity: 0.28 });
  }
}

/** A rough massing model of the building it stands inside. */
function miniature() {
  const g = new THREE.Group();
  const base = box(2.6, 0.1, 1.9, paint('#6d5a44'));
  g.add(base);

  const wallMat = surface({ map: 'plaster', repeat: [1, 1], color: '#d8c8a8', roughness: 0.9 });
  const roofMat = paint('#8a5638');

  // west wing (the lab), hall, east wing, lobby, library above
  const parts = [
    [-0.85, 0.34, 0.0, 1.1, 0.5, 0.9],
    [0.05, 0.34, 0.0, 0.75, 0.5, 0.9],
    [0.72, 0.3, 0.0, 0.5, 0.42, 0.9],
    [0.05, 0.26, 0.62, 0.55, 0.34, 0.34],
    [0.05, 0.74, -0.34, 0.75, 0.36, 0.5],
  ];
  for (const [x, y, z, w, h, d] of parts) {
    const b = box(w, h, d, wallMat);
    b.position.set(x, y + 0.05, z);
    g.add(b);
    const roof = box(w + 0.06, 0.05, d + 0.06, roofMat);
    roof.position.set(x, y + h / 2 + 0.08, z);
    g.add(roof);
  }

  // a speck of lawn, and the tiny stained-glass glow
  const lawn = decal(2.4, 1.75, paint('#6f9440'), 0.055);
  lawn.position.y = 0.055;
  g.add(lawn);
  const spark = glow('#e8c14a', 0.5, 0.35);
  spark.position.set(-0.85, 0.5, 0.5);
  g.add(spark);

  return g;
}
