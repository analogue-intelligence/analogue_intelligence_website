import * as THREE from 'three';
import { M, box, cyl, lathe, paint, surface, decal, textPlate , FLOOR } from '../materials.js';
import {
  bookshelf, table, chair, plant, pendant, deskLamp, sconce, railing, rug, plaque, framedArt,
} from '../props.js';
import { UPPER_Y } from '../floorplan.js';

// -----------------------------------------------------------------------------
// rooms/library.js — upstairs, at the back, above the hall.
//
// The four research pillars each get a bay: a shelf, a lamp, and one book you
// can actually open. It's the quietest room in the building and the only one you
// reach by climbing, which is the point — the long view costs you a staircase.
// -----------------------------------------------------------------------------

const Y = UPPER_Y;

export function buildLibrary(ctx) {
  // the balustrade along the overlook, where the wall opens onto the hall below
  const rail = railing(19, 'x');
  ctx.add(rail, -4, Y, -11.4);
  ctx.collide(-4, -11.4, 19, 0.4, Y);

  ctx.add(rug(9, 6, [1, 1]), 0, Y + FLOOR.rug, -18);

  // ------------------------------------------------------- the four bays ---
  const BAYS = [
    { id: 'lib_software', label: 'SOFTWARE ENGINEERING', x: -12.5, color: '#c97a3a' },
    { id: 'lib_ai', label: 'ARTIFICIAL INTELLIGENCE', x: -4.2, color: '#b4547e' },
    { id: 'lib_robotics', label: 'ROBOTICS & HARDWARE', x: 4.2, color: '#4f7d93' },
    { id: 'lib_creative', label: 'CREATIVE TECHNOLOGY', x: 12.5, color: '#8a5aa0' },
  ];

  for (const bay of BAYS) {
    ctx.add(bookshelf(6.4, 5.2, 1.0, '#5d4128', 5), bay.x, Y, -28.9);
    ctx.collide(bay.x, -28.9, 6.4, 1.0, Y);

    // a lectern with the pillar's own volume open on it
    const lectern = new THREE.Group();
    lectern.add(box(0.4, 1.0, 0.4, M.wood('#4a3320', [1, 1]), { pos: [0, 0.5, 0] }));
    lectern.add(box(1.1, 0.12, 0.8, M.wood('#5d4128', [1, 1]), { pos: [0, 1.05, 0], rot: [-0.28, 0, 0] }));
    ctx.add(lectern, bay.x, Y, -26.4);
    ctx.collide(bay.x, -26.4, 1.0, 0.9, Y);

    const bookGroup = new THREE.Group();
    const cover = box(1.0, 0.14, 0.72, paint(bay.color, { roughness: 0.6 }));
    bookGroup.add(cover);
    for (const s of [-1, 1]) {
      const page = box(0.44, 0.06, 0.66, M.paper());
      page.position.set(s * 0.24, 0.1, 0);
      page.rotation.z = s * 0.04;
      bookGroup.add(page);
    }
    bookGroup.rotation.x = -0.28;
    ctx.add(bookGroup, bay.x, Y + 1.2, -26.35);
    ctx.interact(bay.id, bookGroup, ctx.anchor(bay.x, Y + 2.0, -26.35));

    // bay sign above the shelf
    const sign = box(4.2, 0.6, 0.08, new THREE.MeshStandardMaterial({
      map: textPlate(bay.label, {
        w: 640, h: 92, bg: '#241d18', border: bay.color, borderWidth: 5,
        color: '#e0d6c0', size: 44, font: '"Space Mono", monospace',
      }),
      roughness: 0.8,
    }));
    ctx.add(sign, bay.x, Y + 5.6, -28.3);

    ctx.lamp(0xffcf94, bay.x, Y + 4.2, -26.6, { intensity: 12, distance: 11, size: 3.2, opacity: 0.32 });
  }

  // ------------------------------------------------------- reading tables --
  for (const [tx, tz] of [[-8, -18.5], [8, -18.5]]) {
    ctx.add(table(4.2, 2.0, 1.15, '#7a5630'), tx, Y, tz);
    ctx.collide(tx, tz, 4.4, 2.2, Y);
    ctx.add(deskLamp('#2f4a44'), tx - 1.3, Y + 1.15, tz);
    ctx.lamp(0xbfe6a0, tx - 1.3, Y + 1.85, tz, { intensity: 7, distance: 6, size: 1.9, opacity: 0.35 });
    for (const s of [-1, 1]) ctx.add(chair('#6f4c2c', '#6b5a3e'), tx + s * 1.4, Y, tz + 1.6, Math.PI);
    for (const s of [-1, 1]) ctx.add(chair('#6f4c2c', '#6b5a3e'), tx + s * 1.4, Y, tz - 1.6, 0);
    // papers, a mug, a stack that will never be filed
    for (let i = 0; i < 4; i++) {
      const sheet = box(0.6, 0.02, 0.44, M.paper());
      ctx.add(sheet, tx + 0.4 + (i % 2) * 0.5, Y + 1.16 + i * 0.02, tz - 0.2 + Math.floor(i / 2) * 0.5,
        (Math.random() - 0.5) * 0.4);
    }
    const mug = lathe([[0, 0], [0.12, 0], [0.14, 0.2], [0.12, 0.21]], paint('#a8452f'), 10);
    ctx.add(mug, tx + 1.5, Y + 1.15, tz + 0.4);
  }

  // ------------------------------------------------------- thesis stacks ---
  const stacks = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const h = 0.06 + Math.random() * 0.05;
    const vol = box(0.9, h, 0.66, paint(
      ['#3e6b62', '#7a5638', '#4f6472', '#6b4a78', '#8a5638'][i % 5], { roughness: 0.75 }));
    vol.position.set((i % 2) * 1.05, 0.05 + Math.floor(i / 2) * 0.14, 0);
    vol.rotation.y = (Math.random() - 0.5) * 0.16;
    stacks.add(vol);
  }
  const stackTable = table(3.2, 1.4, 0.95, '#5d4128');
  ctx.add(stackTable, -13.4, Y, -19.6, Math.PI / 2);
  ctx.collide(-13.4, -19.6, 1.6, 3.4, Y);
  ctx.add(stacks, -13.9, Y + 0.95, -20.2, Math.PI / 2);
  ctx.interact('lib_theses', stacks, ctx.anchor(-13.4, Y + 2.0, -19.6));

  // ------------------------------------------------------------- globe -----
  const globeGroup = new THREE.Group();
  const stand = lathe([[0, 0], [0.34, 0], [0.16, 0.3], [0.1, 0.9]], M.wood('#4a3320', [1, 1]), 12);
  globeGroup.add(stand);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 24), M.metal('#b08d46', 0.35));
  ring.position.y = 1.5; ring.rotation.x = 0.35; globeGroup.add(ring);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 14),
    new THREE.MeshStandardMaterial({ map: globeTexture(), roughness: 0.72 }));
  globe.position.y = 1.5; globe.rotation.z = 0.35;
  globeGroup.add(globe);
  ctx.add(globeGroup, 13.4, Y, -19.6);
  ctx.collide(13.4, -19.6, 1.2, 1.2, Y);
  ctx.interact('lib_globe', globeGroup, ctx.anchor(13.4, Y + 2.4, -19.6));
  ctx.tick((dt) => { globe.rotation.y += dt * 0.14; });

  // ------------------------------------------------------------ dressing ---
  ctx.add(plant(1.3), -14.6, Y, -13.4);
  ctx.add(plant(1.1), 14.6, Y, -13.4);
  ctx.add(framedArt(1.4, 1.8, '#4f6472'), -15.6, Y + 4.2, -22, Math.PI / 2);
  ctx.add(framedArt(1.4, 1.8, '#7a5638'), 15.6, Y + 4.2, -22, -Math.PI / 2);

  // window seats along the overlook, facing down into the hall
  for (const x of [-9, 1]) {
    ctx.add(box(3.4, 0.5, 1.0, M.fabric('#5e6b5a', [1, 1])), x, Y + 0.55, -12.6);
    ctx.collide(x, -12.6, 3.4, 1.0, Y);
    for (let i = 0; i < 3; i++) {
      const cushion = box(0.7, 0.22, 0.7, M.fabric(['#7a5638', '#3e6b62', '#8a5638'][i], [1, 1]));
      ctx.add(cushion, x - 1 + i, Y + 0.9, -12.7, (Math.random() - 0.5) * 0.4);
    }
  }

  // ---------------------------------------------------------------- light --
  for (const [lx, lz] of [[-8, -18.5], [8, -18.5], [0, -25]]) {
    ctx.add(pendant('#c9a24a', 2.0, 0.72), lx, Y + 5.4, lz);
    ctx.lamp(0xffdcae, lx, Y + 4.9, lz, { intensity: 20, distance: 17, size: 4.6, opacity: 0.38 });
  }
  for (const z of [-16, -24]) {
    for (const s of [-1, 1]) {
      ctx.add(sconce('#c9a24a'), s * 15.6, Y + 4.4, z, -s * Math.PI / 2);
      ctx.lamp(0xffcf94, s * 15.1, Y + 4.5, z, { intensity: 7, distance: 7, size: 2, opacity: 0.28 });
    }
  }
}

// ---------------------------------------------------------------------------
function globeTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3f6a86'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#7a8a52';
  // rough, invented landmasses — a prop globe, not an atlas
  const blobs = [[70, 90, 60, 40], [150, 150, 45, 30], [230, 80, 70, 45],
    [330, 120, 55, 50], [420, 70, 50, 30], [400, 190, 60, 30], [60, 200, 40, 24]];
  for (const [x, y, rx, ry] of blobs) {
    g.beginPath(); g.ellipse(x, y, rx, ry, Math.random(), 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(240,235,220,0.28)'; g.lineWidth = 1;
  for (let i = 0; i < 512; i += 42) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
  for (let i = 0; i < 256; i += 42) { g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
