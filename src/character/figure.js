import * as THREE from 'three';
import { faceTexture } from '../world/materials.js';

// -----------------------------------------------------------------------------
// figure.js — builds a chibi, hand-painted-looking character (à la the reference
// low-poly figure): a big faceted head with a canvas-painted face, a tapered
// coat, stubby limbs, optional beard/scarf. Returns the group plus the limbs so
// the owner can animate an idle bob and a simple walk swing. Materials are made
// inline (not shared) so characters can be tinted/scaled independently.
// -----------------------------------------------------------------------------
export function buildFigure(opts = {}) {
  const skin = opts.skin ?? '#e79a5c';
  const coat = opts.coat ?? '#37414f';
  const coatTrim = opts.coatTrim ?? '#2a323d';
  const hair = opts.hair ?? '#3a2a20';
  const variant = opts.variant ?? 'player';

  const M = (c, e = '#000', ei = 0) => new THREE.MeshStandardMaterial({
    color: c, flatShading: true, roughness: 0.9, emissive: e, emissiveIntensity: ei,
  });

  const group = new THREE.Group();

  // ---- legs (stubby tapered cylinders) ----
  const legGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.9, 6);
  const legMat = M('#2c333d');
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.24, 0.45, 0);
  const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.24, 0.45, 0);
  // little shoes
  const shoeGeo = new THREE.BoxGeometry(0.3, 0.22, 0.42);
  const shoeMat = M('#20262e');
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(-0.24, 0.11, 0.06);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(0.24, 0.11, 0.06);

  // ---- coat body (wide at the hem) ----
  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.78, 1.25, 8);
  const body = new THREE.Mesh(bodyGeo, M(coat)); body.position.y = 1.55;
  // collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.22, 8), M(coatTrim));
  collar.position.y = 2.18;

  // ---- arms ----
  const armGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.95, 6);
  const armMat = M(coat);
  const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.62, 1.7, 0); armL.rotation.z = 0.28;
  const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.62, 1.7, 0); armR.rotation.z = -0.28;
  const handGeo = new THREE.SphereGeometry(0.14, 6, 6);
  const handMat = M(skin);
  const handL = new THREE.Mesh(handGeo, handMat); handL.position.set(-0.78, 1.22, 0);
  const handR = new THREE.Mesh(handGeo, handMat); handR.position.set(0.78, 1.22, 0);

  // ---- head (faceted sphere) + painted face ----
  const head = new THREE.Group(); head.position.y = 2.72;
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), M(skin));
  skull.scale.set(1, 0.95, 0.95);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.0),
    new THREE.MeshBasicMaterial({ map: faceTexture(variant, skin), transparent: true }));
  face.position.set(0, 0.02, 0.58);
  head.add(skull, face);

  // hair cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.64, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), M(hair));
  cap.position.y = 0.12; head.add(cap);

  // optional beard
  if (opts.beard) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.95, 7), M('#efe9dd'));
    beard.position.set(0, -0.42, 0.28); beard.rotation.x = 0.12;
    head.add(beard);
    // moustache
    const mous = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), M('#efe9dd'));
    mous.position.set(0, -0.14, 0.56); head.add(mous);
  }

  // optional scarf (player)
  if (opts.scarf) {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 6, 10), M(opts.scarf));
    scarf.position.y = 2.28; scarf.rotation.x = Math.PI / 2;
    group.add(scarf);
  }

  group.add(legL, legR, shoeL, shoeR, body, collar, armL, armR, handL, handR, head);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

  return {
    group,
    parts: { legL, legR, shoeL, shoeR, armL, armR, head, body },
    // walkPhase in radians; moving toggles the swing amplitude
    animate(t, moving) {
      const amp = moving ? 0.5 : 0;
      const s = Math.sin(t * 9);
      legL.rotation.x = s * amp; legR.rotation.x = -s * amp;
      shoeL.position.z = 0.06 + s * amp * 0.18; shoeR.position.z = 0.06 - s * amp * 0.18;
      armL.rotation.x = -s * amp * 0.8; armR.rotation.x = s * amp * 0.8;
      const bob = moving ? Math.abs(Math.sin(t * 9)) * 0.04 : Math.sin(t * 1.6) * 0.02;
      head.position.y = 2.72 + bob;
      body.position.y = 1.55 + bob * 0.5;
    },
  };
}
