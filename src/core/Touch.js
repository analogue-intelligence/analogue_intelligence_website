import { IS_TOUCH } from './Input.js';

// -----------------------------------------------------------------------------
// Touch.js — the phone.
//
// The desktop build assumes three things a phone does not have: a keyboard for
// movement, a hover state for "what am I pointing at", and a cursor precise
// enough to hit a plinth from across a room. Everything here exists to replace
// one of those without removing anything.
//
//   · a thumbstick, which appears wherever your left thumb lands rather than in
//     a fixed corner — fixed sticks are only comfortable if you happen to hold
//     the phone the way the designer does
//   · a large action button carrying the E key, labelled with what it will act
//     on, so "what am I pointing at" is answered before you press rather than
//     after
//   · pinch to zoom, because a 6-inch screen at desktop framing shows about
//     four square metres of a seventy-metre building
//   · every keyboard shortcut also on a button, so nothing is desktop-only
//
// Tapping the world still works exactly as it does with a mouse: objects first,
// then people, then walk there. Input.js decides what counts as a tap.
// -----------------------------------------------------------------------------

const STICK_RADIUS = 62;      // px from centre to full deflection
const DEAD_ZONE = 0.14;

export class TouchControls {
  constructor(engine, input, root) {
    this.engine = engine;
    this.input = input;
    this.active = IS_TOUCH;
    this.onAction = () => {};
    this.onKey = () => {};

    if (!this.active) return;

    document.body.classList.add('is-touch');

    this.el = document.createElement('div');
    this.el.className = 'touch-ui';
    this.el.innerHTML = `
      <div class="stick" hidden>
        <div class="stick-base"></div>
        <div class="stick-nub"></div>
      </div>
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

    this.stick = this.el.querySelector('.stick');
    this.nub = this.el.querySelector('.stick-nub');
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

    this._bindStick();
    this._bindPinch();
  }

  /**
   * The stick lives on the left half of the canvas and appears under the thumb.
   * It deliberately does not capture taps: a press that never travels far
   * enough falls through to Input as a tap on the world.
   */
  _bindStick() {
    const canvas = this.engine.canvas;
    let id = null, ox = 0, oy = 0, moved = false;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || id !== null) return;
      if (e.clientX > window.innerWidth * 0.58) return;      // right side is for tapping
      id = e.pointerId; ox = e.clientX; oy = e.clientY; moved = false;
      this.stick.style.left = `${ox}px`;
      this.stick.style.top = `${oy}px`;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const dist = Math.hypot(dx, dy);
      if (!moved && dist < 10) return;                        // still might be a tap
      if (!moved) { moved = true; this.stick.hidden = false; }

      const clamped = Math.min(dist, STICK_RADIUS);
      const nx = (dx / (dist || 1)) * clamped;
      const ny = (dy / (dist || 1)) * clamped;
      this.nub.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

      const mag = clamped / STICK_RADIUS;
      if (mag < DEAD_ZONE) { this.input.axis.x = 0; this.input.axis.y = 0; return; }
      this.input.axis.x = (nx / STICK_RADIUS);
      this.input.axis.y = (ny / STICK_RADIUS);
      this.input.moveTarget = null;
    });

    const release = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.stick.hidden = true;
      this.nub.style.transform = 'translate(-50%, -50%)';
      this.input.axis.x = 0; this.input.axis.y = 0;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  /** Two fingers change the camera's framing, within sane limits. */
  _bindPinch() {
    const canvas = this.engine.canvas;
    const points = new Map();
    let startDist = 0, startFrustum = 0;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      points.set(e.pointerId, e);
      if (points.size === 2) {
        const [a, b] = [...points.values()];
        startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        startFrustum = this.engine.targetFrustum;
        this.input.axis.x = 0; this.input.axis.y = 0;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!points.has(e.pointerId)) return;
      points.set(e.pointerId, e);
      if (points.size !== 2) return;
      const [a, b] = [...points.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!startDist) return;
      const f = Math.max(11, Math.min(34, startFrustum * (startDist / d)));
      this.engine._zoomFromUser = true;
      this.engine.setZoom(f);
      this.engine._zoomFromUser = false;
      this.engine.lockZoom = true;      // stop room entry overriding a manual choice
    });
    const drop = (e) => { points.delete(e.pointerId); if (points.size < 2) startDist = 0; };
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