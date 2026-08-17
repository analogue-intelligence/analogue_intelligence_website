import { ROOMS, BOUNDS, STAIRS } from '../world/floorplan.js';

// -----------------------------------------------------------------------------
// Minimap — a plan of the building drawn straight from floorplan.js, so it can
// never drift out of step with the walls you're actually walking into. Rooms
// you haven't entered are drawn as empty outlines; the one you're standing in
// picks up its own accent colour.
// -----------------------------------------------------------------------------

const PAD = 8;

export class Minimap {
  constructor(root, player, roomManager) {
    this.player = player;
    this.rooms = roomManager;
    this.visible = true;

    this.el = document.createElement('div');
    this.el.className = 'minimap';
    // Framed on the building, not on BOUNDS. The world now runs a hundred and
    // fifty units north to south because of the approach road, so drawing the
    // full extent squeezed the whole house into the top third of the panel.
    // The map shows the rooms plus a margin, and the canvas takes its aspect
    // from them, so the plan fills the space whatever shape the building is.
    const ex = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const r of ROOMS) {
      ex.x0 = Math.min(ex.x0, r.x0); ex.x1 = Math.max(ex.x1, r.x1);
      ex.z0 = Math.min(ex.z0, r.z0); ex.z1 = Math.max(ex.z1, r.z1);
    }
    const M = 5;
    this.view = { x0: ex.x0 - M, x1: ex.x1 + M, z0: ex.z0 - M, z1: ex.z1 + M };

    const vw = this.view.x1 - this.view.x0, vd = this.view.z1 - this.view.z0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 300;
    this.canvas.height = Math.round(300 * (vd / vw));
    this.el.appendChild(this.canvas);
    this.label = document.createElement('div');
    this.label.className = 'minimap-label';
    this.el.appendChild(this.label);
    root.appendChild(this.el);

    this.g = this.canvas.getContext('2d');
    this.onTravel = () => {};

    // Tapping a room you have already been in takes you there. The building
    // rewards walking, but a visitor who came for the information should not
    // have to walk the length of it twice — and only visited rooms are
    // reachable, so nothing is spoiled.
    this.canvas.style.cursor = 'pointer';
    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (this.canvas.width / r.width);
      const my = (e.clientY - r.top) * (this.canvas.height / r.height);
      for (const room of ROOMS) {
        const [x0, z0] = this._p(room.x0, room.z0);
        const [x1, z1] = this._p(room.x1, room.z1);
        if (mx < x0 || mx > x1 || my < z0 || my > z1) continue;
        const entry = this.rooms?.rooms.find((q) => q.spec.id === room.id);
        if (!entry?.visited) return;
        this.onTravel(room);
        return;
      }
    });
    const w = this.view.x1 - this.view.x0, d = this.view.z1 - this.view.z0;
    this.scale = Math.min((this.canvas.width - PAD * 2) / w, (this.canvas.height - PAD * 2) / d);
    this.ox = PAD + ((this.canvas.width - PAD * 2) - w * this.scale) / 2;
    this.oz = PAD + ((this.canvas.height - PAD * 2) - d * this.scale) / 2;
  }

  toggle() { this.visible = !this.visible; this.el.classList.toggle('hidden', !this.visible); }
  show(v) { this.visible = v; this.el.classList.toggle('hidden', !v); }

  _p(x, z) {
    return [this.ox + (x - this.view.x0) * this.scale, this.oz + (z - this.view.z0) * this.scale];
  }

  update(dt = 0.016) {
    if (!this.visible) return;
    // Redrawing a 260x210 canvas 60 times a second to move one dot is pure
    // waste. Ten times a second is indistinguishable.
    this._acc = (this._acc ?? 0) + dt;
    if (this._acc < 0.1) return;
    this._acc = 0;
    const g = this.g;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const here = this.rooms.current?.spec ?? null;

    for (const r of ROOMS) {
      const [x0, z0] = this._p(r.x0, r.z0);
      const [x1, z1] = this._p(r.x1, r.z1);
      const entry = this.rooms.rooms.find((e) => e.spec.id === r.id);
      const seen = entry?.visited;
      const isHere = here && here.id === r.id;

      g.fillStyle = isHere ? hexA(r.accent, 0.34) : seen ? 'rgba(231,224,210,0.13)' : 'rgba(231,224,210,0.04)';
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
      g.strokeStyle = isHere ? r.accent : seen ? 'rgba(231,224,210,0.42)' : 'rgba(231,224,210,0.16)';
      g.lineWidth = isHere ? 2 : 1;
      g.strokeRect(x0, z0, x1 - x0, z1 - z0);

      if (seen) {
        // a visited room is a button, and should look like one
        g.strokeStyle = isHere ? r.accent : 'rgba(231,224,210,0.6)';
        g.lineWidth = isHere ? 2 : 1.4;
        g.strokeRect(x0 + 1.5, z0 + 1.5, x1 - x0 - 3, z1 - z0 - 3);
        g.fillStyle = isHere ? '#f0e9da' : 'rgba(231,224,210,0.62)';
        g.font = '600 8px "Space Mono", monospace';
        g.textAlign = 'center';
        g.fillText(r.name.toUpperCase(), (x0 + x1) / 2, (z0 + z1) / 2 + 3);
      }
    }

    // the stair run, so the way upstairs is legible on the plan
    const [sx0, sz0] = this._p(STAIRS.x0, STAIRS.zTop);
    const [sx1, sz1] = this._p(STAIRS.x1, STAIRS.zBottom);
    g.strokeStyle = 'rgba(231,224,210,0.4)';
    g.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = sz0 + ((sz1 - sz0) * i) / 6;
      g.beginPath(); g.moveTo(sx0, y); g.lineTo(sx1, y); g.stroke();
    }

    // you
    // you, clamped to the edge when out on the approach so the marker never
    // disappears off the plan
    const p = this.player.position;
    let [px, pz] = this._p(p.x, p.z);
    const outside = px < 4 || px > this.canvas.width - 4 || pz < 4 || pz > this.canvas.height - 4;
    px = Math.max(4, Math.min(this.canvas.width - 4, px));
    pz = Math.max(4, Math.min(this.canvas.height - 4, pz));
    g.fillStyle = outside ? 'rgba(244,231,200,0.55)' : '#f4e7c8';
    g.beginPath(); g.arc(px, pz, outside ? 2.4 : 3.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,24,30,0.9)'; g.lineWidth = 1.2; g.stroke();

    this.label.textContent = here ? here.name : 'Outside';
  }
}

function hexA(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
