import * as THREE from 'three';
import { M, box, cyl, lathe, paint, surface, decal, screenMaterial, textPlate , FLOOR } from '../materials.js';
import {
  workbench, pegboard, shelfUnit, crate, monitor, stool, plant, plaque,
} from '../props.js';

// -----------------------------------------------------------------------------
// rooms/robotics.js — the robotics area, where intelligence is given a body.
//
// No longer a room of its own: it shares the Research Lab with the studio, and
// takes its centre from the caller so the two areas can be laid out side by
// side without either file knowing where the other one is.
//
// Cooler light than the rest of the building, a concrete floor, and everything
// either bolted down or in a crate. The three set pieces — arm, quadruped,
// flight cage — are the ones you can talk to; the rest is the mess that makes a
// working lab look like one.
// -----------------------------------------------------------------------------

export function buildRobotics(ctx, centreX = -27) {
  const CX = centreX;         // centre of the robotics *area*, not the room

  // safety markings on the concrete
  const hazard = decal(9, 9, new THREE.MeshStandardMaterial({
    map: hazardTexture(), transparent: true, roughness: 1,
  }), 0.02);
  ctx.add(hazard, CX, FLOOR.marking, 0.5);

  // ------------------------------------------------------------ robot arm --
  const arm = buildArm(ctx);
  ctx.add(arm.group, CX, 0.9, 0.5);
  const table = cyl(1.5, 1.7, 0.9, M.metal('#565b61', 0.6), 18);
  ctx.add(table, CX, 0.45, 0.5);
  ctx.collide(CX, 0.5, 3.2, 3.2, 0);
  ctx.interact('rb_arm', arm.group, ctx.anchor(CX, 3.6, 0.5));

  // a tray of parts for it to reach toward
  for (let i = 0; i < 4; i++) {
    const part = box(0.24, 0.16, 0.24, M.metal('#b08d46', 0.4));
    ctx.add(part, CX + 0.9 + (i % 2) * 0.34, 0.99, 0.5 + Math.floor(i / 2) * 0.34);
  }

  // ------------------------------------------------------------ quadruped --
  const dog = buildQuadruped(ctx);
  ctx.add(dog, CX + 6.5, 0.02, 7);
  ctx.collide(CX + 6.5, 7, 1.6, 1.1, 0);
  ctx.interact('rb_quadruped', dog, ctx.anchor(CX + 6.5, 1.8, 7));
  // charging pad
  ctx.add(decal(2.4, 1.8, paint('#3a4048'), FLOOR.marking), CX + 6.5, FLOOR.marking, 7);

  // ----------------------------------------------------------- flight cage --
  const cage = buildFlightCage(ctx);
  ctx.add(cage, CX - 5.5, 0, -6);
  ctx.collide(CX - 5.5, -6, 8.4, 8.4, 0);
  ctx.interact('rb_dronecage', cage, ctx.anchor(CX - 5.5, 4.6, -6));

  // ------------------------------------------------------------- benches ---
  const bench = workbench(6, 1.6);
  ctx.add(bench, CX + 6.6, 0, -9.6);
  ctx.collide(CX + 6.6, -9.6, 6, 1.6, 0);
  ctx.interact('rb_bench', bench, ctx.anchor(CX + 6.6, 2.1, -9.6));
  ctx.add(pegboard(5.4, 2.6), CX + 6.6, 3.6, -10.9);

  ctx.add(monitor(1.5, 0.95, ['episode 4128', 'return  +182.4', 'freeze   0.7%'],
    { plot: true, accent: '#7fd7c4' }), CX + 5.4, 1.72, -9.9, 0.2);
  ctx.add(monitor(1.2, 0.78, ['mode: FULL_PRED', 'rollout  h=12'],
    { accent: '#e0a13c' }), CX + 7.6, 1.62, -9.9, -0.25);
  ctx.lamp(0x9fd8e8, CX + 6.5, 2.4, -9.4, { intensity: 6, distance: 7, size: 2.2, opacity: 0.28 });

  // oscilloscope, soldering iron, coffee that has gone cold
  const scope = box(0.8, 0.6, 0.5, M.metal('#3f454b', 0.5));
  ctx.add(scope, CX + 3.5, 1.42, -9.6);
  const scopeFace = box(0.6, 0.42, 0.03, screenMaterial([], { plot: true, accent: '#8ae06a', bg: '#0a1208' }));
  ctx.add(scopeFace, CX + 3.5, 1.44, -9.33);

  // ------------------------------------------------------------- storage ---
  // These three units used to line the west wall of the robotics room. That
  // wall is gone — the studio is on the other side of it now — so standing them
  // in the same place left a row of shelving marooned in the middle of an open
  // floor. They are against the north wall instead, where shelving belongs.
  for (let i = 0; i < 3; i++) {
    ctx.add(shelfUnit(2.4, 2.4), CX - 6.6 + i * 2.7, 0, -10.6, 0);
    ctx.collide(CX - 6.6 + i * 2.7, -10.6, 2.4, 0.9, 0);
    for (let k = 0; k < 3; k++) {
      const bin = box(0.7, 0.4, 0.6, paint(['#4f6472', '#7a5638', '#5e6b3e'][k % 3]));
      ctx.add(bin, CX - 7.2 + i * 2.7 + k * 0.5, 0.5 + k, -10.6, 0);
    }
  }
  ctx.add(crate(1.2), CX + 8.4, 0, 3.5, 0.3);
  ctx.collide(CX + 8.4, 3.5, 1.2, 1.2, 0);
  ctx.add(crate(0.9), CX + 8.6, 0, 5.1, -0.4);

  // a battery charging rack, blinking
  const rack = new THREE.Group();
  rack.add(box(2.2, 1.4, 0.6, M.metal('#4a5058', 0.55)));
  const leds = [];
  for (let i = 0; i < 8; i++) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6),
      paint('#7fd7c4', { emissive: '#7fd7c4', emissiveIntensity: 2 }));
    led.position.set(-0.9 + (i % 4) * 0.6, 0.3 - Math.floor(i / 4) * 0.55, 0.32);
    rack.add(led); leds.push(led);
  }
  ctx.add(rack, CX - 10.4, 2.4, 8.6, Math.PI / 2);
  ctx.tick(() => {
    const t = performance.now() * 0.002;
    leds.forEach((l, i) => { l.material.emissiveIntensity = 1 + Math.sin(t + i * 0.8) * 1.1; });
  });

  // whiteboard: the failure taxonomy
  const wb = box(5.4, 2.8, 0.12, new THREE.MeshStandardMaterial({
    map: whiteboardTexture(), roughness: 0.5,
  }));
  ctx.add(wb, CX, 4.2, -11.1);

  ctx.add(stool(0.9), CX + 4.6, 0, -8.2);
  ctx.add(stool(0.9), CX + 8.4, 0, -8.4);
  ctx.add(plant(1.0), CX + 9, 0, 10.4);

  // ---------------------------------------------------------------- light --
  // cool fluorescents, hung in a grid
  for (const z of [-7, 0, 7]) {
    for (const x of [CX - 5, CX + 5]) {
      const tube = box(3.6, 0.16, 0.4,
        paint('#dff2f6', { emissive: '#cfeaf4', emissiveIntensity: 1.5 }));
      ctx.add(tube, x, 6.4, z);
      ctx.add(box(3.8, 0.12, 0.6, M.metal('#5a6068', 0.6)), x, 6.56, z);
    }
    ctx.lamp(0xbfe2f0, CX, 6.0, z, { intensity: 22, distance: 22, size: 5.6, opacity: 0.24 });
  }
}

// ---------------------------------------------------------------------------
/** A six-axis arm that idles through a slow pick-and-place cycle. */
function buildArm(ctx) {
  const group = new THREE.Group();
  const shell = M.metal('#e0dcd2', 0.42);
  const joint = paint('#2f3439', { roughness: 0.55 });
  const accent = paint('#c97a3a', { roughness: 0.6 });

  const base = cyl(0.55, 0.7, 0.34, shell, 16); group.add(base);
  const yaw = new THREE.Group(); yaw.position.y = 0.34; group.add(yaw);
  yaw.add(cyl(0.42, 0.5, 0.3, joint, 14, { pos: [0, 0.15, 0] }));

  const shoulder = new THREE.Group(); shoulder.position.y = 0.34; yaw.add(shoulder);
  const upper = box(0.36, 1.5, 0.42, shell); upper.position.y = 0.75; shoulder.add(upper);
  shoulder.add(box(0.44, 0.22, 0.5, accent, { pos: [0, 1.42, 0] }));

  const elbow = new THREE.Group(); elbow.position.y = 1.5; shoulder.add(elbow);
  elbow.add(cyl(0.24, 0.24, 0.5, joint, 12, { rot: [0, 0, Math.PI / 2] }));
  const fore = box(0.3, 1.2, 0.34, shell); fore.position.y = 0.6; elbow.add(fore);

  const wrist = new THREE.Group(); wrist.position.y = 1.2; elbow.add(wrist);
  wrist.add(cyl(0.18, 0.18, 0.36, joint, 10, { rot: [0, 0, Math.PI / 2] }));
  const grip = new THREE.Group(); grip.position.y = 0.3; wrist.add(grip);
  grip.add(box(0.26, 0.26, 0.26, accent));
  for (const s of [-1, 1]) {
    const finger = box(0.07, 0.36, 0.14, joint);
    finger.position.set(s * 0.13, 0.28, 0);
    grip.add(finger);
  }

  let t = Math.random() * 6;
  ctx.tick((dt) => {
    t += dt * 0.55;
    yaw.rotation.y = Math.sin(t * 0.5) * 1.1;
    shoulder.rotation.x = -0.35 + Math.sin(t) * 0.32;
    elbow.rotation.x = 0.7 + Math.sin(t * 1.1 + 1) * 0.45;
    wrist.rotation.x = Math.sin(t * 0.9) * 0.4;
    grip.rotation.y = t * 0.6;
  });

  return { group };
}

/** A quadruped, resting on its charging pad, breathing. */
function buildQuadruped(ctx) {
  const g = new THREE.Group();
  const shell = M.metal('#3f454b', 0.45);
  const trim = paint('#c9a24a', { roughness: 0.6 });

  const body = box(1.5, 0.44, 0.66, shell); body.position.y = 0.72; g.add(body);
  g.add(box(1.1, 0.16, 0.5, trim, { pos: [0, 0.96, 0] }));
  const head = box(0.44, 0.3, 0.42, shell); head.position.set(0.86, 0.78, 0); g.add(head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
      paint('#7fd7c4', { emissive: '#7fd7c4', emissiveIntensity: 2.2 }));
    eye.position.set(1.06, 0.82, s * 0.13); g.add(eye);
  }

  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.56, 0.7, sz * 0.34);
    const thigh = box(0.14, 0.44, 0.14, shell); thigh.position.y = -0.22; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    const shin = box(0.11, 0.44, 0.11, shell); shin.position.y = -0.22; knee.add(shin);
    knee.add(cyl(0.09, 0.09, 0.08, paint('#1e2226'), 8, { pos: [0, -0.46, 0] }));
    hip.rotation.x = 0.5; knee.rotation.x = -1.0;
    g.add(hip); legs.push({ hip, knee });
  }

  let t = Math.random() * 6;
  ctx.tick((dt) => {
    t += dt;
    body.position.y = 0.72 + Math.sin(t * 1.3) * 0.012;
    head.rotation.z = Math.sin(t * 0.4) * 0.06;
  });
  return g;
}

/** Netted flight cage with a drone doing slow laps inside. */
function buildFlightCage(ctx) {
  const g = new THREE.Group();
  const frame = M.metal('#5f666d', 0.55);
  const S = 3.8, H = 4.4;

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(box(0.16, H, 0.16, frame, { pos: [sx * S, H / 2, sz * S] }));
  }
  for (const y of [0.1, H]) {
    for (const sz of [-1, 1]) g.add(box(S * 2, 0.14, 0.14, frame, { pos: [0, y, sz * S] }));
    for (const sx of [-1, 1]) g.add(box(0.14, 0.14, S * 2, frame, { pos: [sx * S, y, 0] }));
  }

  // netting: a translucent double-sided shell, open on the camera side
  const netMat = new THREE.MeshStandardMaterial({
    map: netTexture(), transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    roughness: 1, depthWrite: false,
  });
  for (const [px, pz, ry] of [[0, -S, 0], [-S, 0, Math.PI / 2]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, H), netMat);
    panel.position.set(px, H / 2, pz); panel.rotation.y = ry;
    g.add(panel);
  }
  const top = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2), netMat);
  top.rotation.x = -Math.PI / 2; top.position.y = H; g.add(top);

  // obstacle course inside — the columns from the evaluation scenarios
  for (const [ox, oz, oh] of [[-1.6, 1.2, 2.4], [1.4, -0.8, 3.0], [0.2, 1.9, 1.8]]) {
    g.add(box(0.42, oh, 0.42, paint('#8a5638', { roughness: 0.9 }), { pos: [ox, oh / 2, oz] }));
    g.add(box(0.6, 0.1, 0.6, paint('#c9a24a'), { pos: [ox, oh, oz] }));
  }

  // the test drone, flying a lap
  const drone = new THREE.Group();
  drone.add(box(0.4, 0.1, 0.3, M.metal('#d8d3c6', 0.5)));
  const rotors = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    drone.add(box(0.4, 0.03, 0.05, paint('#2b2f34'), { pos: [sx * 0.2, 0.02, sz * 0.16], rot: [0, -sx * sz * 0.6, 0] }));
    const r = box(0.42, 0.012, 0.05, paint('#4a5058'));
    r.position.set(sx * 0.34, 0.08, sz * 0.28);
    drone.add(r); rotors.push(r);
  }
  const trail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6),
    paint('#e0a13c', { emissive: '#e0a13c', emissiveIntensity: 2.4 }));
  trail.position.y = -0.06; drone.add(trail);
  g.add(drone);

  let t = Math.random() * 6;
  ctx.tick((dt) => {
    t += dt * 0.62;
    drone.position.set(Math.cos(t) * 2.3, 2.2 + Math.sin(t * 1.7) * 0.5, Math.sin(t * 1.3) * 2.3);
    drone.rotation.y = -t;
    drone.rotation.z = Math.sin(t * 1.3) * 0.22;
    for (const r of rotors) r.rotation.y += dt * 26;
  });

  const sign = plaque('FLIGHT CAGE · ZEPHYR', 2.6, 0.5, { bg: '#1c2026' });
  sign.position.set(0, H + 0.5, S);
  g.add(sign);
  return g;
}

// ---------------------------------------------------------------------------
function hazardTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(224,161,60,0.75)'; g.lineWidth = 14;
  g.setLineDash([26, 18]);
  g.strokeRect(30, 30, 452, 452);
  g.setLineDash([]);
  g.strokeStyle = 'rgba(224,161,60,0.35)'; g.lineWidth = 6;
  g.strokeRect(58, 58, 396, 396);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(210,215,220,0.85)'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 12) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function whiteboardTexture() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 470;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e6de'; g.fillRect(0, 0, 900, 470);
  g.strokeStyle = '#b9b5aa'; g.lineWidth = 8; g.strokeRect(6, 6, 888, 458);

  g.fillStyle = '#2b3a44'; g.font = '700 40px "Space Mono", monospace';
  g.fillText('FAILURE TAXONOMY', 40, 66);

  const rows = [
    ['freeze', 'local minimum, both fields cancel', '#a8452f'],
    ['grazing', 'clearance < r_safe, no contact', '#c9822f'],
    ['thrash', 'mode oscillation at the boundary', '#6b4a78'],
    ['overshoot', 'escape policy exits too hot', '#3e6b62'],
  ];
  g.font = '400 27px "Space Mono", monospace';
  rows.forEach(([k, v, col], i) => {
    const y = 130 + i * 58;
    g.fillStyle = col; g.fillRect(40, y - 22, 14, 28);
    g.fillStyle = '#2b3a44'; g.fillText(k, 70, y);
    g.fillStyle = '#5a6670'; g.fillText(v, 250, y);
  });

  // a scribbled plot in the corner
  g.strokeStyle = '#3e6b62'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= 200; x += 6) {
    const y = 400 - Math.log(1 + x * 0.5) * 42;
    x === 0 ? g.moveTo(660 + x, y) : g.lineTo(660 + x, y);
  }
  g.stroke();
  g.strokeStyle = '#9aa0a6'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(660, 250); g.lineTo(660, 410); g.lineTo(880, 410); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
