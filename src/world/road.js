import * as THREE from 'three';
import { M, box, cyl, paint, surface, decal, textPlate, glow, FLOOR } from './materials.js';
import { plant, plaque } from './props.js';

// -----------------------------------------------------------------------------
// road.js — the approach.
//
// Everything south of the front door: a path running out to the horizon, the
// verge either side of it, and the sign that greets you at the end of the walk.
//
// This exists for the prologue. You build your character standing out here
// rather than in a separate full-screen page, then walk in — so the approach
// has to be somewhere worth standing, with a vanishing point to look down and
// enough on either side that walking it feels like arriving somewhere.
// -----------------------------------------------------------------------------

export const ROAD = {
  x: 0,                    // centre line
  width: 9,
  near: 33,                // where it meets the forecourt
  far: 108,                // where it disappears into the fog
  spawn: 62,               // where you are assembled, floating
  signZ: 40,               // the welcome sign, beside the path
};

export function buildApproach(ctx) {
  const len = ROAD.far - ROAD.near;
  const midZ = (ROAD.near + ROAD.far) / 2;

  // --------------------------------------------------------------- the path -
  const path = decal(ROAD.width, len, surface({
    map: 'stone', repeat: [3, 20], color: '#cdc3ad', roughness: 0.95,
  }), FLOOR.stain);
  path.position.set(ROAD.x, FLOOR.stain, midZ);
  ctx.add(path, 0, 0, 0);

  // a darker worn centre, so it reads as walked rather than laid
  const worn = decal(ROAD.width * 0.55, len, surface({
    map: 'stone', repeat: [2, 22], color: '#b6ab95', roughness: 1,
  // On the ladder, not twelve thousandths above the path — that gap is inside
  // the depth buffer's precision and is exactly what makes a floor flicker.
  }), FLOOR.marking);
  worn.position.set(ROAD.x, FLOOR.marking, midZ);
  ctx.add(worn, 0, 0, 0);

  // kerbs
  for (const s of [-1, 1]) {
    const kerb = box(0.5, 0.22, len, surface({
      map: 'stone', repeat: [1, 26], color: '#ded4bd', roughness: 0.95,
    }), { sharp: true });
    ctx.add(kerb, ROAD.x + s * (ROAD.width / 2 + 0.25), 0.09, midZ);
  }

  // ------------------------------------------------------------- roadside ---
  // Lamp posts thin out with distance, which is most of what gives the path a
  // vanishing point to read against.
  let z = ROAD.near + 8;
  let gap = 9;
  while (z < ROAD.far - 6) {
    for (const s of [-1, 1]) lampPost(ctx, ROAD.x + s * (ROAD.width / 2 + 1.6), z, s);
    z += gap;
    gap *= 1.22;
  }

  // planting along the verge, denser near the building
  let seed = 31;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const zz = ROAD.near + 4 + t * t * (ROAD.far - ROAD.near - 10);
    for (const s of [-1, 1]) {
      if (rnd() > 0.72) continue;
      const x = ROAD.x + s * (ROAD.width / 2 + 2.4 + rnd() * 4);
      ctx.add(plant(0.9 + rnd() * 0.8), x, 0, zz + (rnd() - 0.5) * 3);
    }
  }

  // ---------------------------------------------------------- the welcome ---
  const sx = ROAD.x + ROAD.width / 2 + 2.2;
  const sign = welcomeSign();
  ctx.add(sign, sx, 0, ROAD.signZ, -0.5);
  ctx.collide(sx, ROAD.signZ, 1.4, 0.8, 0);
  ctx.interact('welcome', sign, ctx.anchor(sx, 3.9, ROAD.signZ));
  ctx.lamp(0xffd89a, sx, 4.4, ROAD.signZ, { intensity: 7, distance: 9, size: 2.2, opacity: 0.26 });
}

function lampPost(ctx, x, z, side) {
  const g = new THREE.Group();
  const base = cyl(0.26, 0.32, 0.4, paint('#3f4148'), 10);
  base.position.y = 0.2;
  const post = cyl(0.11, 0.14, 4.4, paint('#4a4d55'), 10);
  post.position.y = 2.5;
  const arm = box(0.1, 0.1, 0.9, paint('#4a4d55'));
  arm.position.set(0, 4.6, -side * 0.4);
  const shade = cyl(0.42, 0.16, 0.4, paint('#5a5f66'), 12);
  shade.position.set(0, 4.42, -side * 0.8);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({
      color: '#ffe9bd', emissive: '#ffce7a', emissiveIntensity: 1.6, roughness: 0.4,
    }));
  bulb.position.set(0, 4.2, -side * 0.8);
  g.add(base, post, arm, shade, bulb);
  const halo = glow('#ffd89a', 1.5, 0.16);
  halo.position.set(0, 4.2, -side * 0.8);
  g.add(halo);
  ctx.add(g, x, 0, z);
  ctx.collide(x, z, 0.5, 0.5, 0);
}

/**
 * The sign at the end of the walk.
 *
 * It is a real interactable, not a scripted popup, because it is also the
 * tutorial for interacting with things: whatever you do to read this sign is
 * exactly what you will do to read every exhibit inside.
 */
function welcomeSign() {
  const g = new THREE.Group();
  const postMat = paint('#6d4d2c');
  for (const s of [-1, 1]) {
    const post = box(0.16, 3.0, 0.16, postMat);
    post.position.set(s * 1.15, 1.5, 0);
    g.add(post);
  }
  const board = box(2.9, 1.7, 0.14, new THREE.MeshStandardMaterial({
    map: textPlate([
      'ANALOGUE', 'INTELLIGENCE', '', 'you have arrived',
    ], {
      w: 520, h: 320, bg: '#2a2018', border: '#c9a24a', color: '#f0e4c6',
      size: 54, font: '"Syne", Georgia, serif',
    }),
    roughness: 0.85,
  }));
  board.position.y = 2.35;
  g.add(board);
  const cap = box(3.2, 0.16, 0.3, postMat);
  cap.position.y = 3.3;
  g.add(cap);
  g.userData.interactAnchor = new THREE.Vector3(0, 3.6, 0);
  return g;
}
