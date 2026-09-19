import { IS_TOUCH } from './Input.js';

// -----------------------------------------------------------------------------
// Touch.js — the phone (and the drag pad everyone gets).
//
// The desktop build assumes three things a phone does not have: a keyboard for
// movement, a hover state for "what am I pointing at", and a cursor precise
// enough to hit a plinth from across a room. Everything here replaces one of
// those without removing anything.
//
//   · drag to walk: put a finger down anywhere on the world and slide — up is
//     forward, down is back, sideways turns. A ring appears under the finger
//     so you can see how hard you are pushing. (Input.js does the driving;
//     this file only draws it. A mouse drag works the same way on a laptop.)
//   · a large action button carrying the E key, labelled with what it will act
//     on, so "what am I pointing at" is answered before you press
//   · pinch to pull the camera in or out
//   · every keyboard shortcut also on a button, so nothing is desktop-only
//
// A quick tap on an exhibit or a person still opens it. A tap on bare floor
// does nothing — it used to walk you there, which on a phone mostly meant
// walking somewhere by accident.
// -----------------------------------------------------------------------------


export class TouchControls {
  constructor(engine, input, root) {
    this.engine = engine;
    this.input = input;
    this.active = IS_TOUCH;
    this.onAction = () => {};
    this.onKey = () => {};

    // The drag pad is drawn for every pointer type, so a laptop user who
    // drags with the mouse sees the same thing a phone user does.
    this.pad = document.createElement('div');
    this.pad.className = 'drag-pad';
    this.pad.hidden = true;
    this.pad.innerHTML = '<div class="stick-base"></div><div class="stick-nub"></div>';
    root.appendChild(this.pad);
    const nub = this.pad.querySelector('.stick-nub');
    input.onDragStart = (x, y) => {
      this.pad.style.left = `${x}px`;
      this.pad.style.top = `${y}px`;
      nub.style.transform = 'translate(-50%, -50%)';
      this.pad.hidden = false;
    };
    input.onDragMove = (dx, dy) => {
      nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    input.onDragEnd = () => { this.pad.hidden = true; };

    if (!this.active) return;

    document.body.classList.add('is-touch');

    this.el = document.createElement('div');
    this.el.className = 'touch-ui';
    this.el.innerHTML = `
      <button class="tbtn tbtn-action" disabled>
        <span class="tbtn-verb">look</span>
        <span class="tbtn-target">nothing nearby</span>
      </button>
      <div class="tbtn-menu">
        <button class="tbtn tbtn-toggle" aria-label="Controls" aria-expanded="false">
          <span class="tbtn-toggle-glyph">≡</span>
        </button>
        <div class="tbtn-tray">
          <button class="tbtn tbtn-small" data-key="m"><i>▤</i><em>Map</em></button>
          <button class="tbtn tbtn-small" data-key="c"><i>☺</i><em>Character</em></button>
          <button class="tbtn tbtn-small" data-key="q"><i>◐</i><em>Quality</em></button>
          <button class="tbtn tbtn-small" data-key="n"><i>♪</i><em>Sound</em></button>
          <button class="tbtn tbtn-small" data-key="f"><i>◱</i><em>Stats</em></button>
        </div>
      </div>
    `;
    root.appendChild(this.el);

    this.actionBtn = this.el.querySelector('.tbtn-action');
    this.verbEl = this.el.querySelector('.tbtn-verb');
    this.targetEl = this.el.querySelector('.tbtn-target');

    this.actionBtn.addEventListener('click', (e) => { e.preventDefault(); this.onAction(); });

    // Five permanent buttons down the edge of a phone is most of the screen
    // edge spoken for before anything has happened. They live behind one now:
    // the tray opens on demand, closes as soon as something is chosen, and
    // closes itself if it is left open and ignored.
    this.menuEl = this.el.querySelector('.tbtn-menu');
    this.toggleEl = this.el.querySelector('.tbtn-toggle');
    this.toggleEl.addEventListener('click', (e) => { e.preventDefault(); this.toggleMenu(); });

    for (const b of this.el.querySelectorAll('[data-key]')) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.onKey(b.dataset.key);
        this.toggleMenu(false);
      });
    }

    this._bindPinch();
  }

  /** Two fingers change the camera's framing, within sane limits. */
  _bindPinch() {
    const canvas = this.engine.canvas;
    const points = new Map();
    let lastDist = 0;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      points.set(e.pointerId, e);
      if (points.size === 2) {
        const [a, b] = [...points.values()];
        lastDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!points.has(e.pointerId)) return;
      points.set(e.pointerId, e);
      if (points.size !== 2) return;
      const [a, b] = [...points.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!lastDist || !d) return;
      // fingers apart = closer in; the engine clamps and locks the choice
      this.engine.zoomBy(lastDist / d);
      lastDist = d;
    });
    const drop = (e) => { points.delete(e.pointerId); if (points.size < 2) lastDist = 0; };
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
  }

  /** Open or close the tray of secondary controls. */
  toggleMenu(force) {
    if (!this.menuEl) return;
    const open = force ?? !this.menuEl.classList.contains('open');
    this.menuEl.classList.toggle('open', open);
    this.toggleEl.setAttribute('aria-expanded', String(open));
    clearTimeout(this._menuTimer);
    if (open) this._menuTimer = setTimeout(() => this.toggleMenu(false), 6000);
  }

  /**
   * Keep the action button honest: it names its target, and greys out when
   * there is nothing to act on, so nobody presses it hopefully.
   */
  setTarget(label, kind, accent) {
    if (!this.active) return;
    const has = !!label;
    this.actionBtn.disabled = !has;
    this.verbEl.textContent = has ? (kind === 'npc' ? 'talk to' : 'read') : 'look';
    this.targetEl.textContent = has ? label : 'nothing nearby';
    this.actionBtn.style.setProperty('--accent', accent ?? '#c9a24a');
  }

  show(v) { if (this.active) this.el.classList.toggle('hidden', !v); }
}