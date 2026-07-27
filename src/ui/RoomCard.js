// -----------------------------------------------------------------------------
// RoomCard — the title card that flashes up the first time you enter a room.
// Deliberately brief: the name, the one-line purpose, then out of the way.
// -----------------------------------------------------------------------------
export class RoomCard {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'room-card';
    this.el.innerHTML = `
      <div class="room-card-rule"></div>
      <div class="room-card-name"></div>
      <div class="room-card-blurb"></div>
    `;
    root.appendChild(this.el);
    this.nameEl = this.el.querySelector('.room-card-name');
    this.blurbEl = this.el.querySelector('.room-card-blurb');
    this._timer = null;
  }

  show(room) {
    this.nameEl.textContent = room.name;
    this.blurbEl.textContent = room.blurb ?? room.purpose ?? '';
    this.el.style.setProperty('--accent', room.accent ?? '#c9a24a');
    this.el.classList.remove('on'); void this.el.offsetWidth;
    this.el.classList.add('on');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.el.classList.remove('on'), 3200);
  }
}
