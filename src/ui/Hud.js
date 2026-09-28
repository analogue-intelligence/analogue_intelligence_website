import { TITLE, SUBTITLE } from '../data/content.js';

// -----------------------------------------------------------------------------
// Hud — the quiet furniture of the screen. Title top-left, where-you-are
// top-centre, controls bottom-left, and a single contextual prompt that only
// appears when there is genuinely something to press E on.
// -----------------------------------------------------------------------------
export class Hud {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-brand">
        <div class="hud-title">${TITLE}</div>
        <div class="hud-sub">${SUBTITLE}</div>
        <a class="hud-page" href="?mode=page">Read the plain page &rarr;</a>
      </div>
      <div class="hud-room"><span class="hud-room-name"></span></div>
      <div class="hud-controls">
        <span><b>W</b> / <b>↑</b> forward · <b>S</b> / <b>↓</b> back</span>
        <span><b>A D</b> / <b>← →</b> step sideways · <b>Shift</b> hurry</span>
        <span><b>drag</b> to turn and walk · <b>wheel</b> zoom</span>
        <span><b>E</b> read · talk</span>
        <span><b>C</b> change your character</span>
        <span><b>M</b> map</span>
        <span><b>Q</b> quality <i class="hud-q">medium</i></span>
        <span><b>F</b> performance</span>
        <span class="hud-controls-hint"><b>H</b> hide this</span>
        <span class="hud-controls-hint">the plain page is linked top-left</span>
      </div>
      <div class="hud-prompt"></div>
    `;
    root.appendChild(this.el);
    this.roomEl = this.el.querySelector('.hud-room-name');
    this.qualityEl = this.el.querySelector('.hud-q');
    this.promptEl = this.el.querySelector('.hud-prompt');
    this._room = '';
    this._prompt = '';
    this.controlsEl = this.el.querySelector('.hud-controls');
    this._helpShown = true;
  }

  /**
   * The key list is useful for the first minute and furniture after that. It
   * tucks itself away a while after the HUD appears; H brings it back.
   */
  toggleHelp(force) {
    this._helpShown = force ?? !this._helpShown;
    this.controlsEl.classList.toggle('tucked', !this._helpShown);
    clearTimeout(this._helpTimer);
  }

  setRoom(name, accent) {
    if (name === this._room) return;
    this._room = name;
    this.roomEl.textContent = name ?? '';
    this.roomEl.style.setProperty('--accent', accent ?? '#c9a24a');
    this.roomEl.classList.remove('swap'); void this.roomEl.offsetWidth;
    this.roomEl.classList.add('swap');
  }

  /** text=null hides the prompt. */
  setPrompt(text, accent) {
    if (text === this._prompt) return;
    this._prompt = text;
    if (!text) { this.promptEl.classList.remove('on'); return; }
    this.promptEl.innerHTML = `<b>E</b> ${text}`;
    this.promptEl.style.setProperty('--accent', accent ?? '#c9a24a');
    this.promptEl.classList.add('on');
  }

  /** Shows which quality tier the engine settled on, and flags a manual pick. */
  setQuality(name, manual = false) {
    if (!this.qualityEl) return;
    this.qualityEl.textContent = name + (manual ? ' (locked)' : '');
    this.qualityEl.classList.remove('flash'); void this.qualityEl.offsetWidth;
    this.qualityEl.classList.add('flash');
  }

  show(v = true) {
    this.el.classList.toggle('hidden', !v);
    if (v && !this._autoTucked) {
      this._autoTucked = true;
      this._helpTimer = setTimeout(() => this.toggleHelp(false), 25000);
    }
  }
}
