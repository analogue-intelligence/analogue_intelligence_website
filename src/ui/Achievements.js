// -----------------------------------------------------------------------------
// Achievements.js — something to find, and a reason to look.
//
// The building rewards wandering, which is lovely if you have twenty minutes
// and useless if you arrived wanting to know what this group does. This gives
// the second kind of visitor a visible target: a count in the corner, a list
// they can open, and a small acknowledgement each time they turn something up.
//
// It is deliberately not a game. Nothing is hidden behind an achievement,
// nothing is timed, and every one of them is earned by doing the thing you
// would have done anyway — the list simply tells you those things exist, which
// is the part a silent building cannot do for itself.
// -----------------------------------------------------------------------------

const KEY = 'analogue-intelligence:found';

export const ACHIEVEMENTS = [
  // --- the rooms ----------------------------------------------------------
  { id: 'room_lobby', icon: '☕', title: 'Front of house', hint: 'Arrive in the coffee lobby' },
  { id: 'room_hall', icon: '◈', title: 'The work itself', hint: 'Walk into the Hall of Fame' },
  { id: 'room_lab', icon: '⚙', title: 'One room, two habits', hint: 'Find the Research Lab' },
  { id: 'room_classroom', icon: '✎', title: 'Open to anyone', hint: 'Find the Classroom' },
  { id: 'room_partners', icon: '◆', title: 'The case for it', hint: 'Find the Partners Room' },
  { id: 'room_library', icon: '▤', title: 'Upstairs', hint: 'Climb the stairs to the library' },
  { id: 'room_all', icon: '★', title: 'The whole building', hint: 'Set foot in every room' },

  // --- reading ------------------------------------------------------------
  { id: 'read_first', icon: '◉', title: 'Curious', hint: 'Read anything at all' },
  { id: 'read_10', icon: '◎', title: 'Thorough', hint: 'Read ten things' },
  { id: 'read_all', icon: '✦', title: 'Read the room', hint: 'Read everything in the building' },
  { id: 'read_projects', icon: '⬡', title: 'The three projects', hint: 'Read every exhibit in the Hall of Fame' },

  // --- people -------------------------------------------------------------
  { id: 'talk_first', icon: '☺', title: 'Said hello', hint: 'Talk to somebody' },
  { id: 'talk_all', icon: '✿', title: 'Met the group', hint: 'Talk to everyone in the building' },

  // --- the way you got here ----------------------------------------------
  { id: 'arrived', icon: '⌂', title: 'You have arrived', hint: 'Read the sign outside' },
  { id: 'restyled', icon: '✂', title: 'Second thoughts', hint: 'Change your character after arriving' },
  { id: 'travelled', icon: '⤳', title: 'Shortcut', hint: 'Travel by tapping a room on the map' },
];

const TOTAL = ACHIEVEMENTS.length;

// How long a card stays up. The timer line is driven by a CSS transition of the
// same duration, so the two cannot drift apart.
export const TOAST_MS = 5200;

export class Achievements {
  constructor(root) {
    this.got = new Set(this._load());
    this.onUnlock = () => {};

    this.el = document.createElement('div');
    this.el.className = 'ach';
    this.el.innerHTML = `
      <button class="ach-count" title="What you have found">
        <span class="ach-count-icon">★</span>
        <span class="ach-count-n"></span>
      </button>
      <div class="ach-toasts"></div>
      <div class="ach-banner"></div>
      <div class="ach-panel">
        <div class="ach-panel-head">
          <span>What there is to find</span>
          <button class="ach-panel-close" aria-label="Close">×</button>
        </div>
        <div class="ach-list"></div>
      </div>
    `;
    root.appendChild(this.el);

    this.countEl = this.el.querySelector('.ach-count-n');
    this.toastsEl = this.el.querySelector('.ach-toasts');
    this.bannerEl = this.el.querySelector('.ach-banner');
    this.panelEl = this.el.querySelector('.ach-panel');
    this.listEl = this.el.querySelector('.ach-list');

    this.el.querySelector('.ach-count').addEventListener('click', () => this.togglePanel());
    this.el.querySelector('.ach-panel-close').addEventListener('click', () => this.togglePanel(false));

    this._renderList();
    this._renderCount();
  }

  _load() {
    try { return JSON.parse(window.localStorage?.getItem(KEY) ?? '[]'); } catch { return []; }
  }

  _save() {
    try { window.localStorage?.setItem(KEY, JSON.stringify([...this.got])); } catch { /* private mode */ }
  }

  has(id) { return this.got.has(id); }
  get count() { return { got: this.got.size, total: TOTAL }; }

  /** Award one. Returns true if it was new, so callers can chime only then. */
  unlock(id) {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def || this.got.has(id)) return false;
    this.got.add(id);
    this._save();
    this._toast(def);
    this._renderCount();
    this._renderList();
    this.onUnlock(def);
    return true;
  }

  /**
   * The announcement.
   *
   * Centred along the top, between the group's name on the left and the
   * controls on the right — the one strip of the interface nothing else
   * occupies. It carries its own timer as a line that runs left to right, so
   * the card visibly spends its time rather than vanishing without warning, and
   * the moment the line reaches the end the entry is ticked off in the list.
   */
  _toast(def) {
    const t = document.createElement('div');
    t.className = 'ach-toast';
    t.innerHTML = `
      <span class="ach-toast-icon">${def.icon}</span>
      <span class="ach-toast-text">
        <span class="ach-toast-kicker">Achievement</span>
        <b>${def.title}</b>
        <i>${def.hint}</i>
      </span>
      <span class="ach-toast-timer"><span class="ach-toast-bar"></span></span>`;
    this.bannerEl.appendChild(t);

    const bar = t.querySelector('.ach-toast-bar');
    requestAnimationFrame(() => {
      t.classList.add('on');
      requestAnimationFrame(() => { bar.style.transform = 'scaleX(1)'; });
    });

    setTimeout(() => {
      t.classList.remove('on');
      setTimeout(() => {
        t.remove();
        // ticked off only once its time is actually up
        this._renderList();
      }, 460);
    }, TOAST_MS);
  }

  _renderCount() {
    const { got, total } = this.count;
    this.countEl.textContent = `${got}/${total}`;
    this.el.querySelector('.ach-count').classList.toggle('complete', got === total);
  }

  /**
   * Every entry is listed by name whether or not it is found — the hint already
   * says what to do, so hiding the title only made the list harder to read.
   * Found ones carry a tick.
   */
  _renderList() {
    this.listEl.innerHTML = ACHIEVEMENTS.map((a) => {
      const done = this.got.has(a.id);
      return `<div class="ach-item${done ? ' done' : ''}">
        <span class="ach-item-icon">${a.icon}</span>
        <span class="ach-item-text"><b>${a.title}</b><i>${a.hint}</i></span>
        <span class="ach-item-tick">${done ? '✓' : ''}</span>
      </div>`;
    }).join('');
  }

  togglePanel(force) {
    const on = force ?? !this.panelEl.classList.contains('on');
    this.panelEl.classList.toggle('on', on);
    if (on) this._renderList();
  }

  show(v) { this.el.classList.toggle('hidden', !v); }

  /** Wipe progress — useful while authoring. */
  reset() { this.got.clear(); this._save(); this._renderCount(); this._renderList(); }
}
