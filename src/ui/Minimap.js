// -----------------------------------------------------------------------------
// Minimap — a small top-down canvas (top-right) drawn each frame. Shows the room
// outline, furniture, the balcony + stairs, the guide, and interactables (dim
// until discovered, then lit in their category colour). The player is a dot with
// a facing tick and a ring for the lamp radius.
// -----------------------------------------------------------------------------
export class Minimap {
  constructor(root, room, player, guide, revealRadius) {
    this.room = room;
    this.player = player;
    this.guide = guide;
    this.revealRadius = revealRadius;
    this.levels = room.levels;

    this.size = 160;
    this.wrap = document.createElement('div');
    this.wrap.className = 'minimap';
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size; this.canvas.height = this.size;
    this.levelTag = document.createElement('span');
    this.levelTag.className = 'minimap-tag';
    this.wrap.appendChild(this.canvas);
    this.wrap.appendChild(this.levelTag);
    root.appendChild(this.wrap);

    this.ctx = this.canvas.getContext('2d');
    this.HALF = 13;
  }

  _p(x, z) {
    const s = this.size, h = this.HALF;
    return [((x + h) / (h * 2)) * s, ((z + h) / (h * 2)) * s];
  }

  draw() {
    const ctx = this.ctx, s = this.size;
    ctx.clearRect(0, 0, s, s);

    // room fill + border
    ctx.fillStyle = 'rgba(10,8,16,0.9)';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(241,236,224,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, s - 2, s - 2);

    // mezzanine footprint (dim)
    const mz = this.levels.mez;
    const [mx0, mz0] = this._p(mz.x0, mz.z0);
    const [mx1, mz1] = this._p(mz.x1, mz.z1);
    ctx.fillStyle = 'rgba(123,44,191,0.18)';
    ctx.fillRect(mx0, mz0, mx1 - mx0, mz1 - mz0);

    // stairs
    const st = this.levels.stairs;
    const [sx0, sz0] = this._p(st.x0, st.z0);
    const [sx1, sz1] = this._p(st.x1, st.z1);
    ctx.fillStyle = 'rgba(255,183,3,0.25)';
    ctx.fillRect(sx0, sz0, sx1 - sx0, sz1 - sz0);

    // furniture
    ctx.fillStyle = 'rgba(241,236,224,0.28)';
    for (const c of this.room.colliders) {
      if (c.level === null) continue; // skip walls
      const [px, pz] = this._p(c.x - c.w / 2, c.z - c.d / 2);
      const [qx, qz] = this._p(c.x + c.w / 2, c.z + c.d / 2);
      ctx.globalAlpha = c.level === this.player.level ? 0.9 : 0.35;
      ctx.fillRect(px, pz, qx - px, qz - pz);
    }
    ctx.globalAlpha = 1;

    // interactables
    for (const it of this.room.interactables) {
      const [px, pz] = this._p(it.anchor.x, it.anchor.z);
      ctx.beginPath();
      ctx.arc(px, pz, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = it.discovered ? it.color : 'rgba(241,236,224,0.3)';
      ctx.fill();
    }

    // guide
    const [gx, gz] = this._p(this.guide.group.position.x, this.guide.group.position.z);
    ctx.beginPath(); ctx.arc(gx, gz, 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffb703'; ctx.lineWidth = 1.6; ctx.stroke();

    // player + lamp radius + facing
    const [px, pz] = this._p(this.player.position.x, this.player.position.z);
    const rr = (this.revealRadius / (this.HALF * 2)) * s;
    ctx.beginPath(); ctx.arc(px, pz, rr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,207,158,0.10)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px, pz, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcf9e'; ctx.fill();
    const ang = this.player.group.rotation.y;
    ctx.beginPath(); ctx.moveTo(px, pz);
    ctx.lineTo(px + Math.sin(ang) * 7, pz + Math.cos(ang) * 7);
    ctx.strokeStyle = '#ffcf9e'; ctx.lineWidth = 1.5; ctx.stroke();

    this.levelTag.textContent = this.player.level === 'mezzanine' ? 'Library ↑' :
      this.player.level === 'stairs' ? 'Stairs' : 'Ground';
  }
}
