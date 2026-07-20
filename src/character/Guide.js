import * as THREE from 'three';
import { buildFigure } from './figure.js';

// -----------------------------------------------------------------------------
// Guide — the Curator behind the counter: a bearded chibi figure. Clicking the
// NPC (its mesh or its always-on marker) opens the dialogue. It exposes a
// `hitTargets` list for the raycaster and tracks its head anchor so the UI can
// float a clickable marker above it. No proximity auto-open — you must click.
// -----------------------------------------------------------------------------
export class Guide {
  constructor(pos) {
    this.figure = buildFigure({
      skin: '#e79a5c', coat: '#2f5d54', coatTrim: '#24463f',
      hair: '#d8d2c4', variant: 'guide', beard: true,
    });
    this.group = this.figure.group;
    this.group.position.copy(pos);
    this.group.rotation.y = Math.PI;          // face outward toward the room

    // a warm reading lamp beside the curator so they're always nicely lit
    const halo = new THREE.PointLight(0xffe0a8, 10, 8, 2);
    halo.position.set(0, 2.8, -0.6);
    this.group.add(halo);

    this.anchor = new THREE.Vector3(pos.x, pos.y + 3.4, pos.z); // marker sits here
    this._t = 0;
  }

  // meshes the raycaster should test for "clicked the NPC"
  get hitTargets() {
    const list = [];
    this.group.traverse((o) => { if (o.isMesh) list.push(o); });
    return list;
  }

  update(dt) {
    this._t += dt;
    this.figure.animate(this._t, false);      // idle only
  }
}
