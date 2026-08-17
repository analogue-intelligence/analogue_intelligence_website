import * as THREE from 'three';
import { DEFAULT_APPEARANCE, buildOf } from './appearance.js';
import { tex } from '../world/textures.js';

let _brush = null;
function brushworkMap() {
  if (!_brush) _brush = tex('brushwork', { repeat: [1, 1] });
  return _brush;
}

// -----------------------------------------------------------------------------
// figure.js — one chibi, built to order.
//
// Proportions are the whole game here. The first version was about two and a
// half heads tall, which is stylised but still reads as a small adult: the head
// was not big enough to be the thing you look at, and the limbs were long
// enough to look like limbs. These are just under two heads — an oversized
// round skull, a body barely taller than it, and short thick limbs that read as
// gestures rather than anatomy. Everything else scales from HEAD_R, so the
// whole silhouette can be retuned from one number.
//
// Big head, short limbs, chunky silhouette: the Animal Crossing read. Everything
// the character creator can change is a parameter here — skin, hair style and
// colour, coat, trousers, accessory, build and height — and the same function
// makes the player, the Curator and the three team members.
//
// Returns { group, parts, animate } where animate(t, moving) drives a walk
// cycle and an idle bob.
// -----------------------------------------------------------------------------

// The single number the whole figure is built around, and the factor that
// carries the hair and the accessories along with it.
const HEAD_R = 0.78;
const HS = HEAD_R / 0.63;

export function buildFigure(opts = {}) {
  const a = { ...DEFAULT_APPEARANCE, ...opts };
  const b = buildOf(a.build);
  const skin = a.skin;
  const coat = a.coat;
  const trim = shade(coat, -0.22);

  // Figures get the same brushwork as everything else — a chibi with a flat
  // vinyl finish in a painted room is the thing that breaks the illusion.
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({
    map: o.bare ? null : brushworkMap(),
    normalMap: null,
    color: c, roughness: o.roughness ?? 0.88, metalness: 0,
    emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissiveIntensity ?? 0,
    flatShading: o.flat ?? false,
    transparent: o.opacity !== undefined, opacity: o.opacity ?? 1,
  });

  const group = new THREE.Group();
  const skinMat = M(skin);
  const coatMat = M(coat, { roughness: 0.92 });
  const trimMat = M(trim, { roughness: 0.92 });
  const hairMat = M(a.hairColor, { roughness: 0.95 });

  // ---------------------------------------------------------------- legs ---
  // Short and thick. A chibi's legs are a suggestion that it can walk, not a
  // mechanism — most of the motion reads off the body bob and the shoes.
  const legGeo = new THREE.CylinderGeometry(0.19 * b.body, 0.22 * b.body, 0.52, 8);
  const legMat = M(a.trousers);
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.24, 0.34, 0);
  const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.24, 0.34, 0);

  // Rounded rather than boxy — a squashed sphere with a slight forward stretch
  // reads as a little boot and softens the whole silhouette at the ground.
  const shoeGeo = new THREE.SphereGeometry(0.23, 14, 10);
  const shoeMat = M(shade(a.trousers, -0.4), { roughness: 0.6 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.24, 0.14, 0.06); shoeL.scale.set(0.82, 0.66, 1.15);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.24, 0.14, 0.06); shoeR.scale.set(0.82, 0.66, 1.15);

  // ---------------------------------------------------------------- body ---
  // Barely taller than the head, and wider at the bottom, so the whole figure
  // is a stable little pear with a ball on top.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48 * b.shoulder, 0.7 * b.body, 1.02, 12), coatMat);
  body.position.y = 1.24;
  // a soft dome across the bottom so the silhouette is a pear rather than a tin
  const bodyCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 * b.body, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    coatMat);
  bodyCap.position.y = 0.74;
  bodyCap.scale.y = 0.42;

  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.71 * b.body, 0.72 * b.body, 0.12, 14), trimMat);
  hem.position.y = 0.75;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.19, 12), trimMat);
  collar.position.y = 1.79;
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.86, 0.06), trimMat);
  placket.position.set(0, 1.26, 0.5 * b.body);

  // ---------------------------------------------------------------- arms ---
  const armGeo = new THREE.CylinderGeometry(0.155 * b.shoulder, 0.185 * b.shoulder, 0.66, 8);
  // The tilt was inverted: a positive Z rotation swings the *top* of the arm
  // outward and the bottom in, so the shoulders splayed while the hands tucked
  // under the body and did not meet the sleeve. Narrow at the shoulder, open at
  // the hand, which is also the friendlier shape.
  const armL = new THREE.Mesh(armGeo, coatMat);
  armL.position.set(-0.5 * b.shoulder, 1.4, 0); armL.rotation.z = -0.26;
  const armR = new THREE.Mesh(armGeo, coatMat);
  armR.position.set(0.5 * b.shoulder, 1.4, 0); armR.rotation.z = 0.26;

  // Mitten hands: a squashed sphere reads rounder and cuter than a ball, and
  // sits exactly where the sleeve ends.
  const handGeo = new THREE.SphereGeometry(0.2, 12, 10);
  const handL = new THREE.Mesh(handGeo, skinMat);
  handL.position.set(-0.585 * b.shoulder, 1.07, 0.02); handL.scale.set(1, 0.86, 1.1);
  const handR = new THREE.Mesh(handGeo, skinMat);
  handR.position.set(0.585 * b.shoulder, 1.07, 0.02); handR.scale.set(1, 0.86, 1.1);

  // a soft shoulder cap so the torso does not end in a hard rim
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.49 * b.shoulder, 14, 10), coatMat);
  shoulders.position.y = 1.72; shoulders.scale.set(1, 0.62, 0.92);

  // ---------------------------------------------------------------- head ---
  // No neck, and deliberately oversized: the head should be the first thing the
  // eye lands on and roughly half the figure's height.
  const head = new THREE.Group(); head.position.y = 2.26;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 20, 16), skinMat);
  skull.scale.set(1, 0.96, 0.93);
  // The face plane sat at 0.585·HS while the skull's front surface is at
  // HEAD_R·0.93 — a difference of about a millimetre, so the two z-fought and
  // the eyes flickered and broke up. Sit it clearly proud of the skull and let
  // polygon offset keep it there at every angle.
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0 * HS, 1.0 * HS),
    new THREE.MeshBasicMaterial({
      map: faceTexture(a), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
  face.position.set(0, 0.05 * HS, HEAD_R * 0.93 + 0.035);
  face.renderOrder = 3;
  const ear = (s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13 * HS, 8, 6), skinMat);
    e.position.set(s * 0.6 * HS, 0, -0.02); e.scale.set(0.6, 1, 0.8);
    return e;
  };
  head.add(skull, face, ear(-1), ear(1));

  // Hair and head-worn accessories were authored against the old 0.63 skull, so
  // they ride in a scaled group rather than needing every offset rewritten.
  const headArt = new THREE.Group();
  headArt.scale.setScalar(HS);
  head.add(headArt);
  addHair(headArt, a, hairMat, M);
  addAccessory(headArt, group, a, M, skinMat, b);

  group.add(legL, legR, shoeL, shoeR, hem, body, bodyCap, shoulders, collar, placket,
    armL, armR, handL, handR, head);
  // Only the bulk of the body casts. Eighteen tiny shadow casters per person,
  // times five people, is a real cost for shadows of an ear.
  for (const o of [body, hem, head, legL, legR, armL, armR]) {
    o.traverse?.((c) => { if (c.isMesh) c.castShadow = true; });
    if (o.isMesh) o.castShadow = true;
  }
  group.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  group.scale.setScalar(a.height ?? 1);

  const baseHeadY = head.position.y;
  const baseBodyY = body.position.y;

  return {
    group,
    appearance: a,
    parts: { head, body, bodyCap, shoulders, armL, armR, legL, legR, shoeL, shoeR },
    animate(t, moving) {
      const amp = moving ? 0.55 : 0;
      const s = Math.sin(t * 9);
      legL.rotation.x = s * amp; legR.rotation.x = -s * amp;
      shoeL.position.z = 0.07 + s * amp * 0.2; shoeR.position.z = 0.07 - s * amp * 0.2;
      armL.rotation.x = -s * amp * 0.85; armR.rotation.x = s * amp * 0.85;
      const bob = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 1.5) * 0.022;
      head.position.y = baseHeadY + bob;
      body.position.y = baseBodyY + bob * 0.5;
      shoulders.position.y = 1.72 + bob * 0.5;
      bodyCap.position.y = 0.74 + bob * 0.35;
      head.rotation.z = moving ? Math.sin(t * 4.5) * 0.03 : Math.sin(t * 0.9) * 0.02;
    },
  };
}

// ---------------------------------------------------------------------------
// The hairline.
//
// Coordinates in here are the pre-scale ones the styles were authored in (a
// 0.63 skull), because the whole hair group rides in a scaled child of the
// head. The blush marks — which are the face, now that there are no drawn eyes
// — sit at about y = 0.02 in this space. Nothing may hang below HAIRLINE at the
// front, or the face ends up inside the hair and the character loses its
// expression entirely.
const HAIRLINE = 0.24;

function addHair(head, a, hairMat, M) {
  const style = a.hairStyle ?? 'crop';
  if (style === 'shaved') return addShaved(head, a, M);

  // Every style is built on this. The skull is radius 0.63 in this space and
  // the face plane sits at z = 0.585 — so a cap sphere of radius 0.66 that
  // sweeps past the equator passes *in front of* the face at z = 0.66, which is
  // exactly why the character was appearing with its features inside its own
  // hair. The cap therefore stops at the hairline, and any style that needs
  // length gets it from separate pieces at the back and sides.
  head.add(capPiece(hairMat, 0.665, Math.PI * 0.40));      // crown, front-safe
  head.add(backPiece(hairMat, 0.675, Math.PI * 0.38, Math.PI * 0.34));

  switch (style) {
    case 'crop': return addCrop(head, hairMat);
    case 'bob': return addBob(head, hairMat);
    case 'bun': return addBun(head, hairMat, M);
    case 'curls': return addCurls(head, hairMat);
    case 'long': return addLong(head, hairMat);
    default: return undefined;
  }
}

/** The crown: a cap that stops above the brow all the way round. */
function capPiece(mat, r, phi) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, phi), mat);
  cap.position.y = 0.04;
  return cap;
}

/**
 * The back and sides, which may safely come lower because nothing is there.
 * theta = PI..2PI is the rear half in three's sphere winding, so this covers
 * the occiput without ever crossing the face.
 */
function backPiece(mat, r, phiStart, phiLength) {
  const back = new THREE.Mesh(
    new THREE.SphereGeometry(r, 18, 10, Math.PI, Math.PI, phiStart, phiLength), mat);
  back.position.y = 0.04;
  return back;
}

function addCrop(head, mat) {
  // a short swept fringe sitting on the hairline, never below it
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.17, 0.2), mat);
  fringe.position.set(0.05, 0.30, 0.5);
  fringe.rotation.set(0.26, 0.06, -0.07);
  head.add(fringe);
  const wedge = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), mat);
  wedge.scale.set(1.5, 0.5, 0.7);
  wedge.position.set(-0.1, 0.36, 0.36);
  head.add(wedge);
}

function addBob(head, mat) {
  // length down the sides, kept behind the cheek line
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), mat);
    side.scale.set(0.46, 1.55, 0.86);
    side.position.set(s * 0.6, -0.16, -0.08);
    head.add(side);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat);
    tip.position.set(s * 0.58, -0.5, -0.06);
    head.add(tip);
  }
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10), mat);
  back.scale.set(1.02, 1.2, 0.72);
  back.position.set(0, -0.2, -0.3);
  head.add(back);
  // a centre-parted fringe: two soft sweeps that open away from the face
  // Raised and pulled back: rotating a flattened ellipsoid grows its vertical
  // extent, which is how this one crept down over the face despite its centre
  // sitting well above the hairline.
  for (const s of [-1, 1]) {
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat);
    sweep.scale.set(1.02, 0.36, 0.62);
    sweep.position.set(s * 0.27, 0.42, 0.34);
    sweep.rotation.z = -s * 0.26;
    head.add(sweep);
  }
}

function addBun(head, mat, M) {
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), mat);
  bun.position.set(0, 0.48, -0.4);
  head.add(bun);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.05, 8, 16),
    M('#a8452f', { roughness: 0.85 }));
  band.position.set(0, 0.36, -0.34);
  band.rotation.x = 1.15;
  head.add(band);
  // loose strands either side of the face, tucked back behind the ears
  for (const s of [-1, 1]) {
    const strand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mat);
    strand.scale.set(0.5, 1.5, 0.6);
    strand.position.set(s * 0.6, -0.06, -0.14);
    head.add(strand);
  }
}

function addCurls(head, mat) {
  // Curls sat in a ring that reached below the brow. They now sit *on* the
  // hairline: the front ones start higher than the back ones, which is how a
  // curly hairline actually falls anyway.
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const front = Math.sin(ang) > 0.1;
    const ring = i % 2 ? 0.55 : 0.42;
    const base = front ? 0.34 : 0.12;
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), mat);
    curl.position.set(
      Math.cos(ang) * ring,
      base + (i % 3) * 0.13,
      Math.sin(ang) * ring * (front ? 0.8 : 0.95));
    head.add(curl);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat);
  crown.position.set(0, 0.52, -0.06);
  head.add(crown);
}

function addLong(head, mat) {
  for (const s of [-1, 1]) {
    const fall = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.4, 0.3), mat);
    fall.position.set(s * 0.62, -0.62, -0.14);
    fall.rotation.z = s * 0.03;
    head.add(fall);
    const round = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat);
    round.position.set(s * 0.62, -1.3, -0.14);
    head.add(round);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.3, 0.3), mat);
  back.position.set(0, -0.52, -0.42);
  head.add(back);
  const backEnd = new THREE.Mesh(new THREE.SphereGeometry(0.47, 14, 8), mat);
  backEnd.scale.set(1, 0.5, 0.62);
  backEnd.position.set(0, -1.14, -0.42);
  head.add(backEnd);
  // a soft side parting that stops at the temple
  const part = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), mat);
  part.scale.set(1.18, 0.36, 0.56);
  part.position.set(-0.12, 0.42, 0.32);
  part.rotation.z = 0.2;
  head.add(part);
}

function addShaved(head, a, M) {
  const mat = M(shade(a.hairColor, 0.1), { roughness: 1 });
  head.add(capPiece(mat, 0.648, Math.PI * 0.34));
  head.add(backPiece(mat, 0.652, Math.PI * 0.32, Math.PI * 0.3));
  for (const sx of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat);
    temple.scale.set(0.3, 0.6, 0.78);
    temple.position.set(sx * 0.55, 0.14, -0.12);
    head.add(temple);
  }
}

function addAccessory(head, group, a, M, skinMat, b) {
  switch (a.accessory) {
    case 'glasses': {
      const frame = M('#22262b', { roughness: 0.4 });
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 6, 16), frame);
        lens.position.set(s * 0.19, 0.06, 0.56);
        head.add(lens);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14),
          M('#cfe6ee', { opacity: 0.28, roughness: 0.15 }));
        glass.position.set(s * 0.19, 0.06, 0.555);
        head.add(glass);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.026, 0.026), frame);
      bridge.position.set(0, 0.06, 0.57); head.add(bridge);
      break;
    }
    case 'scarf': {
      const scarfMat = M(shade(a.coat, 0.35), { roughness: 0.98 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.12, 8, 14), scarfMat);
      ring.position.y = 1.88; ring.rotation.x = Math.PI / 2;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.1), scarfMat);
      tail.position.set(0.2, 1.42, 0.38); tail.rotation.z = 0.12;
      group.add(ring, tail);
      break;
    }
    case 'beanie': {
      const beanieMat = M(shade(a.coat, 0.22), { roughness: 1 });
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), beanieMat);
      cap.position.y = 0.1; head.add(cap);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 18), beanieMat);
      brim.position.y = 0.11; brim.rotation.x = Math.PI / 2; head.add(brim);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M('#e8e2d4', { roughness: 1 }));
      pom.position.y = 0.74; head.add(pom);
      break;
    }
    case 'headphones': {
      const shellMat = M('#2b2f34', { roughness: 0.5 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 8, 18, Math.PI), shellMat);
      band.position.y = 0.16; band.rotation.z = Math.PI / 2; band.rotation.y = Math.PI / 2;
      head.add(band);
      for (const s of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.14, 12), shellMat);
        cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.62, 0.02, 0);
        head.add(cup);
      }
      break;
    }
    case 'apron': {
      // Front-of-house, and nobody else in the building wears one. Worn with a
      // colour that is deliberately outside the creator's coat palette, so the
      // Curator can never be mistaken for a visitor.
      const apronMat = M('#2e6152', { roughness: 0.98 });
      const bib = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 0.1), apronMat);
      bib.position.set(0, 1.5, 0.52 * b.body);
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62 * b.body, 0.76 * b.body, 0.78, 12, 1, true,
          -Math.PI * 0.42, Math.PI * 0.84), apronMat);
      skirt.position.set(0, 0.92, 0.03);
      const strap = (sx) => {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), apronMat);
        st.position.set(sx * 0.28, 1.76, 0.36); st.rotation.x = -0.2;
        return st;
      };
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 16), apronMat);
      tie.position.y = 1.24; tie.rotation.x = Math.PI / 2;
      group.add(bib, skirt, strap(-1), strap(1), tie);

      const beardM = M(a.hairColor, { roughness: 1 });
      const bd = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.8, 9), beardM);
      bd.position.set(0, -0.4, 0.24); bd.rotation.x = 0.16;
      head.add(bd);
      break;
    }
    case 'beard': {
      const beardMat = M(a.hairColor, { roughness: 1 });
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.86, 9), beardMat);
      beard.position.set(0, -0.42, 0.24); beard.rotation.x = 0.16;
      head.add(beard);
      const mous = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.1), beardMat);
      mous.position.set(0, -0.1, 0.54); head.add(mous);
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------------------
/** The painted face — eyes, cheeks, mouth, drawn once per character. */
export function faceTexture(a) {
  // 128px rather than 256: a chibi face is never more than ~90 screen pixels
  // tall at this camera distance, and five of these are generated at startup.
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);

  // No eyes.
  //
  // There were drawn eyes here — a white sclera with a dark iris — and they
  // were the worst thing on the model. Part of that was a plain bug: the iris
  // had been enlarged far more than the sclera, leaving the white as a thin
  // crescent rim that read as a stray highlight rather than an eye. But fixing
  // the ratio only got them back to *acceptable*, and acceptable eyes at ninety
  // screen pixels are still the feature everybody looks at and nobody likes.
  //
  // So the face is blush and a mouth. This is the oldest trick in soft-toy
  // design: give the viewer two warm marks in roughly the right place and they
  // will read a face into it, and the face they read is friendlier than any you
  // could draw. It also survives every skin tone, every hair style and every
  // distance without ever landing in the uncanny valley.
  //
  // To put eyes back, draw them here — nothing else in the file depends on
  // their absence.
  // Raised from y = 72 to 66 so they sit clearly in the eye zone rather than
  // down on the cheek, well below any hairline. Colour is a choice now — these
  // marks are the whole face, so they should be yours.
  const blush = a.blush ?? '#d66a5e';
  g.fillStyle = rgba(blush, 0.44);
  g.beginPath(); g.ellipse(34, 66, 13.5, 9.5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(94, 66, 13.5, 9.5, 0, 0, 7); g.fill();

  // a softer second pass inside each, so they are a bloom of colour rather
  // than a flat sticker
  g.fillStyle = rgba(shade(blush, -0.12), 0.28);
  g.beginPath(); g.ellipse(34, 66, 8.5, 6, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(94, 66, 8.5, 6, 0, 0, 7); g.fill();

  // A small, high mouth. Low and wide it reads as a grimace; small and set
  // just under the blush line it reads as pleased about something.
  g.strokeStyle = 'rgba(122,58,44,0.85)';
  g.lineWidth = 3.4; g.lineCap = 'round';
  g.beginPath(); g.arc(64, 80, 6.5, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/** A hex colour as a canvas rgba() string. */
function rgba(hex, alpha) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Lighten (k>0) or darken (k<0) a hex colour. */
export function shade(hex, k) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const out = k >= 0 ? v + (255 - v) * k : v * (1 + k);
    return Math.max(0, Math.min(255, Math.round(out)));
  });
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
