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
    this.canvas = document.createElement('canvas');
    this.canvas.width = 260; this.canvas.height = 210;
    this.el.appendChild(this.canvas);
    this.label = document.createElement('div');
    this.label.className = 'minimap-label';
    this.el.appendChild(this.label);
    root.appendChild(this.el);

    this.g = this.canvas.getContext('2d');
    const w = BOUNDS.x1 - BOUNDS.x0, d = BOUNDS.z1 - BOUNDS.z0;
    this.scale = Math.min((this.canvas.width - PAD * 2) / w, (this.canvas.height - PAD * 2) / d);
    this.ox = PAD + ((this.canvas.width - PAD * 2) - w * this.scale) / 2;
    this.oz = PAD + ((this.canvas.height - PAD * 2) - d * this.scale) / 2;
  }

  toggle() { this.visible = !this.visible; this.el.classList.toggle('hidden', !this.visible); }
  show(v) { this.visible = v; this.el.classList.toggle('hidden', !v); }

  _p(x, z) {
    return [this.ox + (x - BOUNDS.x0) * this.scale, this.oz + (z - BOUNDS.z0) * this.scale];
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
        g.fillStyle = isHere ? '#f0e9da' : 'rgba(231,224,210,0.55)';
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
    const p = this.player.position;
    const [px, pz] = this._p(p.x, p.z);
    g.fillStyle = '#f4e7c8';
    g.beginPath(); g.arc(px, pz, 3.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,24,30,0.9)'; g.lineWidth = 1.2; g.stroke();

    this.label.textContent = here ? here.name : 'Outside';
  }
}

function hexA(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
