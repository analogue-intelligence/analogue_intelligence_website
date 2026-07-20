import * as THREE from 'three';
import { TITLE } from '../data/content.js';

// -----------------------------------------------------------------------------
// playIntro — a cinematic, camera-driven opening. Beats:
//   1. establish the shopfront from outside (title fades in)
//   2. the door swings open; camera steps to the threshold
//   3. first-person dolly through the doorway into the library
//   4. camera pulls out to the isometric 3rd-person view; the title rises to the
//      top bar; the player pops in "having just walked in"
// Runs on the engine's tick while engine.cinematic = true, then hands off.
// -----------------------------------------------------------------------------
export function playIntro(engine, { door, player, camOffset, root }) {
  return new Promise((resolve) => {
    // ---- DOM: light vignette (fades out) + title (docks to top, stays) ----
    const scrim = document.createElement('div');
    scrim.className = 'intro-scrim';
    root.appendChild(scrim);
    const titleWrap = document.createElement('div');
    titleWrap.className = 'intro-title-wrap';
    titleWrap.innerHTML = `<h1 class="intro-title">${TITLE}</h1><p class="intro-sub">— the other AI</p>`;
    root.appendChild(titleWrap);
    const title = titleWrap.querySelector('.intro-title');
    const sub = titleWrap.querySelector('.intro-sub');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- camera keyframes: [posX,posY,posZ, tgtX,tgtY,tgtZ] ----
    const spawn = player.position.clone();
    const K = {
      k0: [3, 4, 22, 0, 2.6, 13.2],
      k1: [0.6, 3.1, 16, 0, 2.2, 12.5],
      k2: [0, 2.9, 13.2, 0, 1.9, 4],
      k3: [0, 3.0, 6, 0, 1.6, -3],
      k4: [spawn.x + camOffset.x, spawn.y + camOffset.y, spawn.z + camOffset.z, spawn.x, spawn.y + 1.5, spawn.z],
    };
    const segs = [
      { d: 0.6, a: 'k0', b: 'k0' },   // hold: establish
      { d: 1.4, a: 'k0', b: 'k1' },   // approach
      { d: 1.0, a: 'k1', b: 'k2' },   // door opens, to threshold
      { d: 1.3, a: 'k2', b: 'k3' },   // first-person walk-in
      { d: 1.7, a: 'k3', b: 'k4' },   // pull out to iso
    ];
    const total = segs.reduce((s, x) => s + x.d, 0);

    const pos = new THREE.Vector3(), tgt = new THREE.Vector3(), pA = new THREE.Vector3(), pB = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
    const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);

    if (reduced) {
      door.rotation.y = -1.9;
      engine.setCam(new THREE.Vector3(K.k4[0], K.k4[1], K.k4[2]), new THREE.Vector3(K.k4[3], K.k4[4], K.k4[5]));
      titleWrap.classList.add('rise'); sub.classList.add('gone');
      player.reveal();
      finish();
      return;
    }

    setTimeout(() => title.classList.add('in'), 60);
    setTimeout(() => sub.classList.add('in'), 500);

    let t = 0, revealed = false, done = false;
    const tick = (dt) => {
      if (done) return;
      t += dt;

      // pick segment
      let acc = 0, seg = segs[segs.length - 1], local = 1;
      for (const s of segs) {
        if (t <= acc + s.d) { seg = s; local = (t - acc) / s.d; break; }
        acc += s.d;
      }
      const f = smooth(Math.min(local, 1));
      pA.set(K[seg.a][0], K[seg.a][1], K[seg.a][2]); pB.set(K[seg.b][0], K[seg.b][1], K[seg.b][2]);
      tA.set(K[seg.a][3], K[seg.a][4], K[seg.a][5]); tB.set(K[seg.b][3], K[seg.b][4], K[seg.b][5]);
      pos.copy(pA).lerp(pB, f); tgt.copy(tA).lerp(tB, f);
      engine.setCam(pos, tgt);

      // door swing (t: 1.6 → 3.0)
      const dk = Math.min(Math.max((t - 1.6) / 1.4, 0), 1);
      door.rotation.y = -1.95 * smooth(dk);

      // scrim fades as we head inside
      scrim.style.setProperty('--veil', String(Math.max(0, 1 - t / 3.2)));

      // title rises, player pops in during the final pull-out
      if (t > 4.3) { titleWrap.classList.add('rise'); sub.classList.add('gone'); }
      if (t > 4.9 && !revealed) { revealed = true; player.reveal(); }

      if (t >= total) { done = true; finish(); }
    };
    engine.cinematic = true;
    engine.onTick(tick);

    function finish() {
      engine.cinematic = false;
      engine.seedLook(new THREE.Vector3(spawn.x, spawn.y + 1.5, spawn.z));
      titleWrap.classList.add('rise'); sub.classList.add('gone');
      setTimeout(() => scrim.classList.add('lift'), 100);
      resolve();
    }
  });
}
