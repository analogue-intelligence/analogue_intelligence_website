import * as THREE from 'three';
import { buildFigure } from './figure.js';

// -----------------------------------------------------------------------------
// Npc — a colleague who is busy with something else.
//
// Three states, on a timer: WALK to the next waypoint, PAUSE at it, LOOK around
// while paused. That's enough to read as a person going about their day without
// any pathfinding — the patrol loops are authored in data/people.js and kept
// clear of furniture there, which is much cheaper than solving avoidance.
//
// Talking to one stops them where they stand and turns them to face you, which
// is the only bit of the behaviour anyone consciously notices.
// -----------------------------------------------------------------------------

const WALK_SPEED = 2.1;
const ARRIVE = 0.4;

export class Npc {
  constructor(spec) {
    this.spec = spec;
    this.id = spec.id;
    this.name = spec.name;
    this.figure = buildFigure({ ...spec.appearance, name: spec.name });
    this.group = this.figure.group;

    this.route = (spec.patrol ?? []).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.stationary = this.route.length === 0;
    this.index = 0;
    this.state = this.stationary ? 'idle' : 'walk';
    this.timer = 1 + Math.random() * 2;
    this._t = Math.random() * 10;
    this.talking = false;

    const start = this.stationary
      ? new THREE.Vector3(...(spec.position ?? [0, 0, 0]))
      : this.route[0].clone();
    this.group.position.copy(start);
    this.group.rotation.y = spec.facing ?? Math.random() * Math.PI * 2;
    this.home = start.clone();

    // No point light per person. Four colleagues meant four more lights in every
    // material's shader for a rim you barely register; the accent now lives in
    // the figure's own emissive and the label chip instead.
    for (const o of this.group.children) {
      if (o.isMesh) o.receiveShadow = false;
    }

    this.anchor = new THREE.Vector3();
  }

  /** Face a world point over the next few frames. */
  faceToward(p, dt = 1) {
    const dx = p.x - this.group.position.x, dz = p.z - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const want = Math.atan2(dx, dz);
    const delta = ((want - this.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.group.rotation.y += delta * Math.min(dt * 6, 1);
  }

  update(dt, playerPos) {
    this._t += dt;
    let moving = false;

    if (this.talking) {
      this.faceToward(playerPos, dt);
    } else if (!this.stationary) {
      this.timer -= dt;
      if (this.state === 'walk') {
        const target = this.route[this.index];
        const to = target.clone().sub(this.group.position); to.y = 0;
        if (to.length() < ARRIVE) {
          this.state = 'pause';
          this.timer = 1.6 + Math.random() * 3.2;
        } else {
          to.normalize();
          this.group.position.addScaledVector(to, WALK_SPEED * dt);
          this.faceToward(target, dt * 0.7);
          moving = true;
        }
      } else if (this.timer <= 0) {
        this.index = (this.index + 1) % this.route.length;
        this.state = 'walk';
      } else {
        // looking around: a slow sweep of the head, nothing more
        this.group.rotation.y += Math.sin(this._t * 0.9) * dt * 0.5;
      }
    } else {
      // the Curator stays put but turns to whoever is at the counter
      if (playerPos.distanceTo(this.group.position) < 7) this.faceToward(playerPos, dt * 0.5);
      else this.faceToward(this.home.clone().add(new THREE.Vector3(0, 0, 4)), dt * 0.3);
    }

    this.figure.animate(this._t, moving);
    this.anchor.copy(this.group.position).add(new THREE.Vector3(0, 3.7, 0));
  }
}

// -----------------------------------------------------------------------------
// NpcManager — labels, proximity and clicks for everyone in the building.
// It mirrors ProximityManager deliberately: same chip, same E-key affordance,
// so talking to a person feels like reading an object.
// -----------------------------------------------------------------------------
export class NpcManager {
  constructor(engine, player, layer) {
    this.engine = engine;
    this.player = player;
    this.layer = layer;
    this.npcs = [];
    this.nearest = null;
    this.radius = 6.5;
    this.onTalk = () => {};
    this._ray = new THREE.Raycaster();
    this._v = new THREE.Vector3();
  }

  add(npc) {
    const el = document.createElement('button');
    el.className = 'obj-label npc-label';
    el.style.setProperty('--accent', npc.spec.accent ?? '#c9a24a');
    el.innerHTML =
      `<span class="obj-cat">${npc.spec.role ?? 'Team'}</span>` +
      `<span class="obj-tag">${npc.name}</span>` +
      `<span class="obj-key">E</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); this.onTalk(npc); });
    npc._label = el;
    this.layer.appendChild(el);
    this.npcs.push(npc);
    return npc;
  }

  tryClick(pointer) {
    this._ray.setFromCamera(pointer, this.engine.camera);
    for (const n of this.npcs) {
      if (this._ray.intersectObject(n.group, true).length) { this.onTalk(n); return true; }
    }
    return false;
  }

  talkNearest() {
    if (this.nearest) { this.onTalk(this.nearest); return true; }
    return false;
  }

  update(dt) {
    const p = this.player.position;
    let nearest = null, nd = Infinity;

    for (const n of this.npcs) {
      n.update(dt, p);
      const sameFloor = Math.abs(n.group.position.y - p.y) < 4.5;
      const d = n.group.position.distanceTo(p);
      const live = sameFloor && d < this.radius;
      if (live && d < nd) { nearest = n; nd = d; }

      const el = n._label;
      const s = this.engine.project(n.anchor, this._v);
      const on = live && s.visible && s.x > -80 && s.x < window.innerWidth + 80;
      el.style.opacity = on ? '1' : '0';
      el.style.pointerEvents = on ? 'auto' : 'none';
      if (on) el.style.transform = `translate(-50%, -120%) translate(${s.x}px, ${s.y}px)`;
      el.classList.toggle('is-live', live);
    }
    for (const n of this.npcs) n._label.classList.toggle('is-nearest', n === nearest);
    this.nearest = nearest;
  }

  /** Distance from the player to the nearest person — used to break E-key ties. */
  nearestDistance() {
    return this.nearest ? this.nearest.group.position.distanceTo(this.player.position) : Infinity;
  }
}
