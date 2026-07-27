import * as THREE from 'three';
import { ROOMS } from './floorplan.js';


// -----------------------------------------------------------------------------
// RoomManager — the dark, and what lifts it.
//
// Every room except the lobby starts under a shroud: a box the size of the room,
// unlit black, drawn after everything else. Because it *encloses* the room's
// contents, ordinary depth testing does the work — the box's near faces sit in
// front of the furniture, so the furniture is hidden, while a wall between you
// and the room still occludes the shroud correctly.
//
// Floating inside each shroud is the room's name and its purpose, so the
// building explains itself before you commit to walking anywhere. Cross the
// threshold and the shroud dissolves, permanently.
// -----------------------------------------------------------------------------

const SHROUD_COLOR = '#120d08';   // warm dark, not a blue-black void
const FADE = 0.9;              // seconds for a room to come up

export class RoomManager {
  constructor(scene, player, onEnter) {
    this.player = player;
    this.onEnter = onEnter ?? (() => {});
    this.group = new THREE.Group();
    this.group.name = 'shrouds';
    scene.add(this.group);

    this.rooms = [];
    this.current = null;

    for (const r of ROOMS) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, h = r.h;
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;

      const mat = new THREE.MeshBasicMaterial({
        color: SHROUD_COLOR, transparent: true, opacity: 1,
        depthWrite: false, depthTest: true, side: THREE.DoubleSide,
        fog: false,
      });
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h, d - 0.1), mat);
      shroud.position.set(cx, r.y + h / 2 - 0.2, cz);
      shroud.renderOrder = 20;
      shroud.frustumCulled = false;

      const sign = makeSign(r);
      sign.position.set(cx, r.y + 4.2, cz);
      sign.renderOrder = 21;

      const entry = {
        spec: r, shroud, sign,
        lit: !!r.lit, k: r.lit ? 0 : 1, visited: !!r.lit,
      };
      if (!r.lit) { this.group.add(shroud); this.group.add(sign); }
      this.rooms.push(entry);
    }
  }

  /** Which room contains a point, if any. Height matters — the library is above the hall. */
  roomAt(p) {
    for (const e of this.rooms) {
      const r = e.spec;
      if (p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1 && Math.abs(p.y - r.y) < 3.5) {
        return e;
      }
    }
    return null;
  }

  update(dt) {
    const p = this.player.position;
    const here = this.roomAt(p);

    if (here && here !== this.current) {
      this.current = here;
      if (!here.visited) { here.visited = true; }
      this.onEnter(here.spec, here);
    } else if (!here && this.current) {
      this.current = null;
    }

    for (const e of this.rooms) {
      if (e.lit) continue;
      const target = e.visited ? 0 : 1;
      if (Math.abs(e.k - target) < 0.002) {
        if (e.k !== target) { e.k = target; this._apply(e); }
        continue;
      }
      e.k += (target - e.k) * Math.min(dt / FADE * 2.2, 1);
      this._apply(e);
    }
  }

  _apply(e) {
    const k = e.k;
    e.shroud.material.opacity = k;
    e.shroud.visible = k > 0.01;
    e.sign.material.opacity = Math.max(0, k * 1.15 - 0.15);
    e.sign.visible = k > 0.06;
  }

  /** Re-shroud everything except the lobby — handy while authoring rooms. */
  reset() {
    for (const e of this.rooms) { if (!e.lit) { e.visited = false; } }
  }
}

// ---------------------------------------------------------------------------
/** The name that hangs in the dark: room title over its purpose, camera-facing. */
function makeSign(room) {
  // Drawn by hand rather than through textPlate: the name and the subtitle want
  // two different faces at two different weights, which that helper doesn't do.
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = room.accent ?? '#e7e0d2';
  g.font = '700 82px "Syne", Georgia, serif';
  g.letterSpacing = '2px';
  g.fillText(room.name, 512, 116);
  g.fillStyle = 'rgba(231,224,210,0.62)';
  g.font = '400 34px "Space Mono", monospace';
  g.letterSpacing = '0px';
  g.fillText(room.purpose, 512, 196);
  g.strokeStyle = 'rgba(231,224,210,0.25)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(340, 244); g.lineTo(684, 244); g.stroke();
  g.fillStyle = 'rgba(231,224,210,0.4)';
  g.font = '400 26px "Space Mono", monospace';
  g.fillText('walk in to light it', 512, 278);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 3.6), mat);
  sign.rotation.y = Math.PI / 4;        // square-on to the fixed isometric camera
  sign.frustumCulled = false;
  return sign;
}
