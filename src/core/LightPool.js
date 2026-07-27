import * as THREE from 'three';

// -----------------------------------------------------------------------------
// LightPool — thirty-six lamps, four lights.
//
// Three.js forward-renders: every point light in the scene is evaluated for
// every pixel of every material, and each material compiles a shader variant
// against the current light count. Thirty-six practical lamps therefore cost
// thirty-six times the fragment work everywhere, including in rooms you can't
// even see, and turn first-frame shader compilation into a multi-second stall.
//
// So the lamps become data. A small pool of real PointLights follows the player
// around the building, snapping to whichever lamps are nearest and cross-fading
// as the set changes. Every lamp keeps its glow sprite, so the room still looks
// lit from where it should be lit; only the expensive part moves.
// -----------------------------------------------------------------------------

const REFRESH = 0.12;        // seconds between reassignments — 8Hz is plenty
const FADE = 5.0;            // intensity easing rate

export class LightPool {
  constructor(scene, count = 4) {
    this.scene = scene;
    this.lamps = [];
    this.slots = [];
    this._acc = REFRESH;
    this._v = new THREE.Vector3();
    this.setCount(count);
  }

  /** Called by the room builders, via Ctx.lamp(). */
  register(def) {
    this.lamps.push({
      ...def,
      pos: new THREE.Vector3(def.x, def.y, def.z),
      _slot: null,
    });
    return def;
  }

  /** Quality tiers change how many real lights we can afford. */
  setCount(n) {
    while (this.slots.length > n) {
      const s = this.slots.pop();
      if (s.lamp) s.lamp._slot = null;
      this.scene.remove(s.light);
      s.light.dispose?.();
    }
    while (this.slots.length < n) {
      const light = new THREE.PointLight(0xffffff, 0, 14, 2);
      light.visible = false;
      this.scene.add(light);
      this.slots.push({ light, lamp: null, k: 0 });
    }
  }

  update(dt, playerPos) {
    this._acc += dt;
    if (this._acc >= REFRESH) {
      this._acc = 0;
      this._assign(playerPos);
    }

    // ease each slot toward its target so lamps swap without popping
    for (const s of this.slots) {
      const target = s.lamp ? 1 : 0;
      s.k += (target - s.k) * Math.min(dt * FADE, 1);
      if (s.k < 0.004) {
        s.light.visible = false;
        if (s.pending) { this._bind(s, s.pending); s.pending = null; }
        continue;
      }
      s.light.visible = true;
      s.light.intensity = (s.lamp?.intensity ?? 0) * s.k;
    }
  }

  _bind(slot, lamp) {
    if (slot.lamp) slot.lamp._slot = null;
    slot.lamp = lamp;
    if (lamp) {
      lamp._slot = slot;
      slot.light.color.set(lamp.color);
      slot.light.distance = lamp.distance;
      slot.light.position.copy(lamp.pos);
    }
  }

  _assign(playerPos) {
    // rank by distance, ignoring anything on another floor entirely
    const ranked = [];
    for (const l of this.lamps) {
      if (Math.abs(l.pos.y - playerPos.y) > 9) continue;
      const d = l.pos.distanceToSquared(playerPos);
      if (d > 1600) continue;                       // 40 units — beyond use
      ranked.push({ l, d });
    }
    ranked.sort((a, b) => a.d - b.d);
    const want = ranked.slice(0, this.slots.length).map((r) => r.l);
    const wanted = new Set(want);

    // keep any slot whose lamp is still wanted; free the rest
    const free = [];
    for (const s of this.slots) {
      if (s.lamp && !wanted.has(s.lamp)) { s.lamp._slot = null; s.lamp = null; free.push(s); }
      else if (!s.lamp) free.push(s);
    }
    for (const lamp of want) {
      if (lamp._slot) continue;
      const s = free.shift();
      if (!s) break;
      // if the slot is still bright from its last lamp, let it fade first
      if (s.k > 0.05) s.pending = lamp; else this._bind(s, lamp);
    }
  }
}
