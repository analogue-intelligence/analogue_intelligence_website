import * as THREE from 'three';
import { DEFAULT_APPEARANCE, buildOf } from './appearance.js';

// -----------------------------------------------------------------------------
// figure.js — one chibi, built to order.
//
// Big head, short limbs, chunky silhouette: the Animal Crossing read. Everything
// the character creator can change is a parameter here — skin, hair style and
// colour, coat, trousers, accessory, build and height — and the same function
// makes the player, the Curator and the three team members.
//
// Returns { group, parts, animate } where animate(t, moving) drives a walk
// cycle and an idle bob.
// -----------------------------------------------------------------------------

export function buildFigure(opts = {}) {
  const a = { ...DEFAULT_APPEARANCE, ...opts };
  const b = buildOf(a.build);
  const skin = a.skin;
  const coat = a.coat;
  const trim = shade(coat, -0.22);

  const M = (c, o = {}) => new THREE.MeshStandardMaterial({
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
  const legGeo = new THREE.CylinderGeometry(0.17 * b.body, 0.21 * b.body, 0.85, 8);
  const legMat = M(a.trousers);
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.25, 0.44, 0);
  const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.25, 0.44, 0);

  const shoeGeo = new THREE.BoxGeometry(0.32, 0.22, 0.46);
  const shoeMat = M(shade(a.trousers, -0.4), { roughness: 0.6 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(-0.25, 0.11, 0.07);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(0.25, 0.11, 0.07);

  // ---------------------------------------------------------------- body ---
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5 * b.shoulder, 0.8 * b.body, 1.3, 10), coatMat);
  body.position.y = 1.52;
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.81 * b.body, 0.83 * b.body, 0.14, 10), trimMat);
  hem.position.y = 0.92;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.2, 10), trimMat);
  collar.position.y = 2.16;
  // a placket down the front so the coat reads as a coat
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.06), trimMat);
  placket.position.set(0, 1.55, 0.56 * b.body);

  // ---------------------------------------------------------------- arms ---
  const armGeo = new THREE.CylinderGeometry(0.14 * b.shoulder, 0.17 * b.shoulder, 0.92, 8);
  const armL = new THREE.Mesh(armGeo, coatMat); armL.position.set(-0.62 * b.shoulder, 1.68, 0); armL.rotation.z = 0.26;
  const armR = new THREE.Mesh(armGeo, coatMat); armR.position.set(0.62 * b.shoulder, 1.68, 0); armR.rotation.z = -0.26;
  const handGeo = new THREE.SphereGeometry(0.15, 8, 7);
  const handL = new THREE.Mesh(handGeo, skinMat); handL.position.set(-0.78 * b.shoulder, 1.2, 0);
  const handR = new THREE.Mesh(handGeo, skinMat); handR.position.set(0.78 * b.shoulder, 1.2, 0);

  // ---------------------------------------------------------------- head ---
  const head = new THREE.Group(); head.position.y = 2.7;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.63, 18, 14), skinMat);
  skull.scale.set(1, 0.97, 0.94);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 1.04),
    new THREE.MeshBasicMaterial({ map: faceTexture(a), transparent: true, depthWrite: false }));
  face.position.set(0, 0.03, 0.585);
  face.renderOrder = 2;
  const ear = (s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skinMat);
    e.position.set(s * 0.6, 0, -0.02); e.scale.set(0.6, 1, 0.8);
    return e;
  };
  head.add(skull, face, ear(-1), ear(1));
  addHair(head, a, hairMat, M);
  addAccessory(head, group, a, M, skinMat, b);

  group.add(legL, legR, shoeL, shoeR, hem, body, collar, placket, armL, armR, handL, handR, head);
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
    parts: { head, body, armL, armR, legL, legR, shoeL, shoeR },
    animate(t, moving) {
      const amp = moving ? 0.55 : 0;
      const s = Math.sin(t * 9);
      legL.rotation.x = s * amp; legR.rotation.x = -s * amp;
      shoeL.position.z = 0.07 + s * amp * 0.2; shoeR.position.z = 0.07 - s * amp * 0.2;
      armL.rotation.x = -s * amp * 0.85; armR.rotation.x = s * amp * 0.85;
      const bob = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 1.5) * 0.022;
      head.position.y = baseHeadY + bob;
      body.position.y = baseBodyY + bob * 0.5;
      head.rotation.z = moving ? Math.sin(t * 4.5) * 0.03 : Math.sin(t * 0.9) * 0.02;
    },
  };
}

// ---------------------------------------------------------------------------
function addHair(head, a, hairMat, M) {
  const style = a.hairStyle ?? 'crop';
  if (style === 'shaved') {
    const stubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.635, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: a.hairColor, roughness: 1, transparent: true, opacity: 0.55 }));
    stubble.position.y = 0.02; head.add(stubble);
    return;
  }

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
  cap.position.y = 0.06;
  head.add(cap);

  if (style === 'crop') {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.24), hairMat);
    fringe.position.set(0, 0.3, 0.44); fringe.rotation.x = 0.2;
    head.add(fringe);
  }

  if (style === 'bob') {
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), hairMat);
      side.scale.set(0.55, 1.5, 0.9);
      side.position.set(s * 0.52, -0.16, 0.04);
      head.add(side);
    }
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), hairMat);
    back.scale.set(1, 1.15, 0.7); back.position.set(0, -0.14, -0.32);
    head.add(back);
  }

  if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), hairMat);
    bun.position.set(0, 0.5, -0.36); head.add(bun);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 14),
      new THREE.MeshStandardMaterial({ color: '#a8452f', roughness: 0.8 }));
    band.position.set(0, 0.4, -0.3); band.rotation.x = 1.1; head.add(band);
  }

  if (style === 'curls') {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const ring = i % 2 ? 0.56 : 0.44;
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hairMat);
      curl.position.set(Math.cos(ang) * ring, 0.18 + (i % 3) * 0.13, Math.sin(ang) * ring * 0.9);
      head.add(curl);
    }
  }

  if (style === 'long') {
    for (const s of [-1, 1]) {
      const fall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.3, 0.32), hairMat);
      fall.position.set(s * 0.52, -0.62, -0.06);
      head.add(fall);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.3), hairMat);
    back.position.set(0, -0.5, -0.42); head.add(back);
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
      ring.position.y = 2.24; ring.rotation.x = Math.PI / 2;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.1), scarfMat);
      tail.position.set(0.22, 1.85, 0.42); tail.rotation.z = 0.12;
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
      bib.position.set(0, 1.86, 0.6 * b.body);
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72 * b.body, 0.9 * b.body, 0.92, 12, 1, true,
          -Math.PI * 0.42, Math.PI * 0.84), apronMat);
      skirt.position.set(0, 1.16, 0.03);
      const strap = (sx) => {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), apronMat);
        st.position.set(sx * 0.3, 2.14, 0.42); st.rotation.x = -0.2;
        return st;
      };
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 16), apronMat);
      tie.position.y = 1.6; tie.rotation.x = Math.PI / 2;
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

  // cheeks
  g.fillStyle = 'rgba(206,96,86,0.40)';
  g.beginPath(); g.ellipse(37, 79, 13, 8, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(91, 79, 13, 8, 0, 0, 7); g.fill();

  // eyes — a soft oval, not a hard circle, so they read as painted
  const eye = (x) => {
    g.fillStyle = '#f6f2e8';
    g.beginPath(); g.ellipse(x, 61, 12.5, 13.5, 0, 0, 7); g.fill();
    g.fillStyle = '#26221f';
    g.beginPath(); g.ellipse(x + 1, 64, 6.5, 7.5, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(x + 3.5, 60, 2.5, 0, 7); g.fill();
  };
  eye(46); eye(82);

  // brows
  g.strokeStyle = shade(a.hairColor ?? '#3a2a1c', -0.15);
  g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(35, 44); g.lineTo(56, 47); g.stroke();
  g.beginPath(); g.moveTo(93, 44); g.lineTo(72, 47); g.stroke();

  // mouth
  g.strokeStyle = '#8a4232'; g.lineWidth = 3;
  g.beginPath(); g.arc(64, 84, 10, 0.16 * Math.PI, 0.84 * Math.PI); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
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
