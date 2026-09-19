import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Input — keyboard, drag-to-walk, taps, and a small bus for one-shot keys.
//
// Movement is relative to the visitor, not to the screen. The camera rides
// behind them, so:
//
//   W / ↑   walk forward, the way you are facing
//   S / ↓   step back
//   A / ←   turn left        D / →   turn right
//   Shift   hurry
//
// Dragging does the same job with a finger or a mouse. Put a finger down
// anywhere on the world and slide: up walks forward, down walks back, sideways
// turns — the further you slide, the harder it goes, like a thumbstick that
// appears wherever you touch. There is no click-to-walk any more: on a phone a
// tap on the floor was far too easy to fire by accident, and it fought the
// drag for the same gesture.
//
// A press that ends quickly and close to where it started is still a *tap*,
// and a tap on an exhibit or a person opens it, exactly as before.
//
// Keys typed into a text field (the name box in the prologue, say) are never
// treated as shortcuts. Typing "Claude" used to reopen the character creator
// on the "C", toggle the map on "M" and mute on "N".
// -----------------------------------------------------------------------------

export const IS_TOUCH = (() => {
  try {
    return window.matchMedia('(pointer: coarse)').matches
      || navigator.maxTouchPoints > 0;
  } catch { return false; }
})();

const TAP_MS = 320;          // longer than this and it was a drag, not a tap
const TAP_PX = 12;
const DRAG_START_PX = 10;    // travel before a press becomes a drag
const DRAG_RANGE_PX = 70;    // travel for full deflection
const DEAD_ZONE = 0.12;

const FORWARD = ['w', 'arrowup'];
const BACK = ['s', 'arrowdown'];
const LEFT = ['a', 'arrowleft'];
const RIGHT = ['d', 'arrowright'];
const RUN = ['shift'];
const ALL_MOVE = [...FORWARD, ...BACK, ...LEFT, ...RIGHT];

/** True when a key event is somebody typing, not somebody playing. */
function isTyping(e) {
  const t = e.target;
  if (!t || t === window || t === document.body) return false;
  const tag = (t.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag === 'input') {
    const type = (t.type || 'text').toLowerCase();
    return !['range', 'checkbox', 'radio', 'button', 'submit', 'color'].includes(type);
  }
  return !!t.isContentEditable;
}

export class Input {
  constructor(engine) {
    this.engine = engine;
    this.keys = new Set();
    this.enabled = true;
    this.pointer = new THREE.Vector2();
    this._clickHandlers = [];
    this._keyHandlers = new Map();
    // The drag pad, in the visitor's own frame: throttle +1 is full forward,
    // turn +1 is full right. Written by the pointer handlers below.
    this.axis = { throttle: 0, turn: 0 };
    this.isTouch = IS_TOUCH;
    this.dragging = false;
    // UI hooks for drawing the pad under the finger (see core/Touch.js)
    this.onDragStart = () => {};
    this.onDragMove = () => {};
    this.onDragEnd = () => {};
    this._down = null;
    this._pointers = new Map();

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (ALL_MOVE.includes(k) || RUN.includes(k)) {
        this.keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();   // stop the page scrolling
      }
      if (e.repeat) return;                              // one-shot keys fire once
      const hs = this._keyHandlers.get(k);
      if (hs) hs.forEach((fn) => fn(e));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this._endDrag(); });

    const canvas = engine.canvas;
    // The page must not scroll or zoom under a drag.
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', (e) => {
      this._pointers.set(e.pointerId, e);
      // A second finger means a pinch, which is not a walk.
      if (this._pointers.size > 1) { this._endDrag(); this._down = null; return; }
      if (!this.enabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this._down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, drag: false };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, e);
      const d = this._down;
      if (!d || e.pointerId !== d.id) return;
      if (!this.enabled) { this._endDrag(); this._down = null; return; }
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      const dist = Math.hypot(dx, dy);
      if (!d.drag) {
        if (dist < DRAG_START_PX) return;             // still might be a tap
        d.drag = true;
        this.dragging = true;
        this.onDragStart(d.x, d.y);
      }
      const k = Math.min(dist, DRAG_RANGE_PX) / (dist || 1);
      const nx = (dx * k) / DRAG_RANGE_PX, ny = (dy * k) / DRAG_RANGE_PX;
      const mag = Math.hypot(nx, ny);
      this.axis.throttle = mag < DEAD_ZONE ? 0 : -ny;
      this.axis.turn = mag < DEAD_ZONE ? 0 : nx;
      this.onDragMove(nx * DRAG_RANGE_PX, ny * DRAG_RANGE_PX);
    });

    const up = (e, cancelled) => {
      this._pointers.delete(e.pointerId);
      const d = this._down;
      if (!d || e.pointerId !== d.id) return;
      this._down = null;
      const wasDrag = d.drag;
      this._endDrag();
      if (cancelled || wasDrag || !this.enabled) return;
      if (performance.now() - d.t > TAP_MS) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX) return;
      this._setPointer(e);
      this._act();
    };
    canvas.addEventListener('pointerup', (e) => up(e, false));
    canvas.addEventListener('pointercancel', (e) => up(e, true));
    canvas.addEventListener('lostpointercapture', (e) => {
      if (this._down && e.pointerId === this._down.id) { this._down = null; this._endDrag(); }
    });

    // the wheel pulls the camera in and out
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.engine.zoomBy(Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0016));
    }, { passive: false });
  }

  _endDrag() {
    const was = this.dragging;
    this.dragging = false;
    this.axis.throttle = 0;
    this.axis.turn = 0;
    if (was) this.onDragEnd();
  }

  onObjectClick(fn) { this._clickHandlers.push(fn); }

  /** onKey('e', fn) — one-shot key, fires once per press. */
  onKey(key, fn) {
    const k = key.toLowerCase();
    if (!this._keyHandlers.has(k)) this._keyHandlers.set(k, []);
    this._keyHandlers.get(k).push(fn);
  }

  /** A tap: objects first, then people. A tap on bare floor does nothing. */
  _act() {
    for (const h of this._clickHandlers) { if (h(this.pointer)) return; }
  }

  _setPointer(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  /**
   * What the visitor is being asked to do this frame, in their own frame of
   * reference: { throttle: -1..1 (forward +), turn: -1..1 (right +), run }.
   * Returns null when there is nothing to do.
   */
  drive() {
    if (!this.enabled) return null;
    let throttle = 0, turn = 0;
    if (FORWARD.some((k) => this.keys.has(k))) throttle += 1;
    if (BACK.some((k) => this.keys.has(k))) throttle -= 1;
    if (LEFT.some((k) => this.keys.has(k))) turn -= 1;
    if (RIGHT.some((k) => this.keys.has(k))) turn += 1;
    throttle += this.axis.throttle;
    turn += this.axis.turn;
    throttle = THREE.MathUtils.clamp(throttle, -1, 1);
    turn = THREE.MathUtils.clamp(turn, -1, 1);
    if (!throttle && !turn) return null;
    return { throttle, turn, run: RUN.some((k) => this.keys.has(k)) };
  }

  /** Fire a bound key handler from somewhere other than the keyboard. */
  press(key) {
    const hs = this._keyHandlers.get(key.toLowerCase());
    if (hs) hs.forEach((fn) => fn({ key }));
  }
}
