import * as THREE from 'three';
import { M, box, cyl, paint, surface, decal, textPlate, FLOOR } from '../materials.js';
import {
  table, chair, stool, plant, hangingPlant, bookshelf, noticeBoard,
  framedArt, rug, plaque, sofa, monitor,
} from '../props.js';
import { CLASSROOM_X } from '../floorplan.js';

// -----------------------------------------------------------------------------
// rooms/classroom.js — where the teaching happens.
//
// The brief for this room came with a warning built into it: a course is "too
// much of a hassle and too official". So this is not a lecture theatre. There
// are no rows, no lectern, no raked seating and nothing that puts a speaker
// above an audience — a semicircle of unmatched chairs around a rug, a
// whiteboard somebody has clearly been drawing on, and a kettle.
//
// Two things share the space. The taught courses, which are university work
// with enrolment and marks; and the open lecture series, which is the opposite
// of that — one talk every month or two, no registration, aimed at anyone who
// uses these systems without being told how they work. The room is arranged so
// the second one is what you notice first.
//
// Only the west wall (x = -38) and the south wall (z = 12) survive the cutaway
// from inside this room, so everything readable hangs on those.
// -----------------------------------------------------------------------------

const WEST = -37.6;
const SOUTH = 12.35;

export function buildClassroom(ctx) {
  const CX = CLASSROOM_X;

  // ------------------------------------------------------------ the floor --
  ctx.add(rug(11, 8, [1, 1]), CX, FLOOR.rug, 20.5);

  // --------------------------------------------------- the open series -----
  // The centrepiece, on the wall you face as you come in from the lobby.
  const boardFrame = box(7.4, 3.9, 0.16, paint('#4a3320'));
  ctx.add(boardFrame, WEST, 4.5, 20.5, Math.PI / 2);
  const board = box(7.0, 3.5, 0.1, new THREE.MeshStandardMaterial({
    map: textPlate([
      'WHEN A LANGUAGE MODEL WRITES,', 'WHAT IS IT ACTUALLY DOING?', '',
      'Open lecture · everyone welcome',
      'no registration, no prerequisites',
    ], {
      w: 900, h: 450, bg: '#1e2a24', border: '#5e8a5a', color: '#eef2e6',
      size: 44, font: '"Space Mono", monospace', weight: 400,
    }),
    roughness: 0.84,
  }));
  ctx.add(board, WEST + 0.1, 4.5, 20.5, Math.PI / 2);
  ctx.interact('cl_open', board, ctx.anchor(WEST + 1.4, 2.6, 20.5));
  ctx.lamp(0xffe6be, WEST + 1.6, 6.2, 20.5, { intensity: 9, distance: 10, size: 2.6, opacity: 0.3 });

  // ----------------------------------------------------- the whiteboard ----
  // Mid-explanation, not wiped clean: a sentence being cut into tokens, with
  // probabilities under the candidates for the next one.
  const wbFrame = box(6.6, 3.3, 0.14, paint('#b8ac96'));
  ctx.add(wbFrame, CX + 1.5, 4.4, SOUTH, 0);
  const wb = box(6.3, 3.0, 0.08, new THREE.MeshStandardMaterial({
    map: whiteboardTexture(), roughness: 0.6,
  }));
  ctx.add(wb, CX + 1.5, 4.4, SOUTH + 0.09, 0);
  ctx.interact('cl_topics', wb, ctx.anchor(CX + 1.5, 2.7, SOUTH + 1.0));

  const tray = box(6.3, 0.12, 0.28, paint('#8a7a5a'));
  ctx.add(tray, CX + 1.5, 2.78, SOUTH + 0.22);
  const PENS = ['#c94f3c', '#3c7d93', '#5e8a4a', '#e8b23c'];
  PENS.forEach((c, i) => {
    const pen = cyl(0.05, 0.05, 0.34, paint(c), 8);
    pen.rotation.z = Math.PI / 2;
    ctx.add(pen, CX - 0.4 + i * 0.42, 2.9, SOUTH + 0.22);
  });

  // ------------------------------------------------------ the seating ------
  // Unmatched chairs in two loose staggered rows rather than an arc, all of it
  // in the northern half of the room. The first arrangement put a semicircle
  // straight across the line from the door to the boards, so walking in meant
  // walking into the backs of chairs — a classroom you have to squeeze into is
  // not the welcome this room is supposed to give.
  //
  // Everything is kept north of z = 21.8, which leaves the whole approach from
  // the doorway clear and still faces the audience at the corner where the two
  // boards meet.
  const SEAT = ['#c94f3c', '#3c7d93', '#e8b23c', '#5e8a4a', '#8a5aa8', '#d8547e', '#c9822f'];
  const SEATS = [
    [CX - 6.2, 23.6], [CX - 3.6, 22.4], [CX - 1.0, 21.9], [CX + 1.6, 22.2], [CX + 4.2, 23.2],
    [CX - 5.0, 26.2], [CX - 2.2, 25.4], [CX + 0.6, 25.2], [CX + 3.4, 25.8],
  ];
  const FOCUS = { x: CX - 4.5, z: 17.5 };          // between the two boards
  SEATS.forEach(([x, z], i) => {
    const rot = Math.atan2(FOCUS.x - x, FOCUS.z - z) + (i % 3 - 1) * 0.1;
    ctx.add(chair(SEAT[i % SEAT.length], '#9a8f78'), x, 0, z, rot);
    ctx.collide(x, z, 1.0, 1.0, 0);
  });
  for (const [x, z, t] of [[CX - 8.6, 24.4, '#5e8a4a'], [CX + 6.6, 26.4, '#c94f3c']]) {
    ctx.add(stool(0.82, t), x, 0, z, x * 0.3);
  }

  // ------------------------------------------------------- the demo bench --
  // Where whoever is talking actually stands: a low bench off to one side, not
  // a lectern in the middle.
  const bench = table(2.8, 1.1, 1.02, '#7a5230');
  ctx.add(bench, CX - 8.8, 0, 18.6, 0.5);
  ctx.collide(CX - 8.8, 18.6, 2.8, 1.5, 0);
  ctx.add(monitor(1.3, 0.85), CX - 8.8, 1.06, 18.9, 0.5 + Math.PI);
  ctx.add(box(0.9, 0.05, 0.6, paint('#3c4048')), CX - 8.2, 1.09, 18.2, 0.3);

  // ------------------------------------------------- the two taught courses
  // Deliberately smaller than the open series, and side by side, because they
  // are the ordinary university half of what happens here.
  const course = (id, lines, x, tint) => {
    const f = box(3.0, 2.0, 0.14, paint('#4a3320'));
    ctx.add(f, x, 4.3, SOUTH, 0);
    const p = box(2.75, 1.75, 0.09, new THREE.MeshStandardMaterial({
      map: textPlate(lines, {
        w: 480, h: 300, bg: '#242018', border: tint, color: '#efe6d2',
        size: 40, font: '"Space Mono", monospace', weight: 400,
      }),
      roughness: 0.84,
    }));
    ctx.add(p, x, 4.3, SOUTH + 0.09, 0);
    ctx.interact(id, p, ctx.anchor(x, 3.1, SOUTH + 1.0));
  };
  course('cl_python', ['INTRODUCTION', 'TO PYTHON'], CX - 8.2, '#4f7d93');
  course('cl_applied', ['APPLIED', 'PROGRAMMING'], CX + 8.4, '#c9822f');

  // ---------------------------------------------------- how to turn up -----
  const pin = noticeBoard(3.6, 2.4);
  ctx.add(pin, WEST + 0.25, 3.4, 15.4, Math.PI / 2);
  ctx.collide(WEST + 0.25, 15.4, 0.4, 3.6, 0);
  const dates = box(0.1, 1.9, 2.9, new THREE.MeshStandardMaterial({
    map: textPlate(['NEXT UP', '', 'reinforcement learning',
      'version control', 'what CI is for', 'models in production'], {
      w: 420, h: 300, bg: '#1e2126', border: '#c9a24a', color: '#e7dcc2',
      size: 32, font: '"Space Mono", monospace', weight: 400,
    }),
    roughness: 0.82,
  }));
  ctx.add(dates, WEST + 0.4, 3.5, 15.4, Math.PI / 2);
  ctx.interact('cl_attend', dates, ctx.anchor(WEST + 1.4, 2.4, 15.4));

  // --------------------------------------------------- the informal half ---
  // A kettle and mugs, because the point of the series is that it is not a
  // lecture, and people should be holding something.
  const side = table(2.2, 0.9, 1.0, '#6d4d2c');
  ctx.add(side, CX + 8.0, 0, 27.0, 0.2);
  ctx.collide(CX + 8.0, 27.0, 2.2, 1.0, 0);
  ctx.add(cyl(0.22, 0.26, 0.42, paint('#c9ccc4'), 12), CX + 7.4, 1.22, 27.0);
  const MUG = ['#c94f3c', '#e8b23c', '#3c7d93', '#5e8a4a', '#d8547e'];
  MUG.forEach((c, i) => {
    ctx.add(cyl(0.13, 0.11, 0.22, paint(c), 10),
      CX + 8.1 + (i % 3) * 0.34, 1.12, 26.7 + Math.floor(i / 3) * 0.4);
  });

  // borrowed machines, for people who arrive without one
  ctx.add(bookshelf(3.2, 2.4, 0.8, '#5d4128', 2), CX - 9.4, 0, 27.4, Math.PI);
  ctx.collide(CX - 9.4, 27.4, 3.2, 0.8, 0);
  for (let i = 0; i < 4; i++) {
    ctx.add(box(0.7, 0.07, 0.5, paint('#3c4048')), CX - 10.4 + i * 0.68, 1.28, 27.4, 0.05);
  }

  ctx.add(sofa(3.2, '#7a6a52'), CX - 9.6, 0, 21.5, Math.PI / 2);
  ctx.collide(CX - 9.6, 21.5, 1.3, 3.2, 0);

  // ------------------------------------------------------------ dressing ---
  ctx.add(framedArt(1.6, 1.2, '#5e8a4a'), WEST + 0.2, 4.8, 26.6, Math.PI / 2);
  ctx.add(framedArt(1.4, 1.1, '#8a5aa8'), WEST + 0.2, 2.9, 26.6, Math.PI / 2);
  for (const [x, z, sc] of [[WEST + 1.4, 29.0, 1.4], [CX + 10.4, 13.6, 1.2],
    [CX - 10.8, 13.8, 1.35], [CX + 10.6, 29.0, 1.15]]) {
    ctx.add(plant(sc), x, 0, z);
  }
  ctx.add(hangingPlant(1.0), CX + 4, 6.3, 26.5);
  ctx.add(hangingPlant(0.9), CX - 4, 6.3, 15.5);

  ctx.lamp(0xffe2b0, CX, 5.8, 20.5, { intensity: 12, distance: 16, size: 3.4, opacity: 0.34 });
  ctx.lamp(0xffd9a0, CX + 7, 5.2, 26.0, { intensity: 7, distance: 11, size: 2.4, opacity: 0.26 });

  ctx.add(plaque(['everyone', 'welcome']), -12.4, 5.8, 21, -Math.PI / 2);
}

/** A whiteboard part-way through an explanation, not wiped clean. */
function whiteboardTexture() {
  const c = document.createElement('canvas');
  c.width = 900; c.height = 430;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 900, 430);

  g.font = '600 30px "Space Mono", monospace';
  g.fillStyle = '#2b3a44';
  g.fillText('the cat sat on the', 60, 74);

  // the same sentence, cut into tokens
  const toks = ['the', ' cat', ' sat', ' on', ' the'];
  const cols = ['#c94f3c', '#3c7d93', '#5e8a4a', '#8a5aa8', '#c9822f'];
  let x = 60;
  g.font = '600 26px "Space Mono", monospace';
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].length * 16 + 14;
    g.strokeStyle = cols[i]; g.lineWidth = 2.5;
    g.strokeRect(x, 108, w, 44);
    g.fillStyle = cols[i];
    g.fillText(toks[i].trim(), x + 9, 139);
    x += w + 9;
  }

  // candidates for the next token, with bars
  g.fillStyle = '#2b3a44';
  g.font = '600 24px "Space Mono", monospace';
  g.fillText('next?', 60, 208);
  const cands = [['mat', 0.41], ['floor', 0.22], ['roof', 0.11], ['bus', 0.03]];
  cands.forEach(([w, p], i) => {
    const y = 244 + i * 40;
    g.fillStyle = '#2b3a44';
    g.font = '400 22px "Space Mono", monospace';
    g.fillText(w, 70, y + 16);
    g.fillStyle = '#5e8a4a';
    g.fillRect(210, y, 420 * p, 20);
    g.fillStyle = '#6b7a80';
    g.fillText(p.toFixed(2), 650, y + 16);
  });

  g.strokeStyle = '#c94f3c'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(700, 200); g.lineTo(840, 200); g.stroke();
  g.fillStyle = '#c94f3c';
  g.font = '400 20px "Space Mono", monospace';
  g.fillText('temperature', 700, 190);
  g.fillText('flattens this', 700, 232);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
