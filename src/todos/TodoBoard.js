// -----------------------------------------------------------------------------
// TodoBoard: the lab's project dashboard, at ?mode=todos. Not linked from
// anywhere.
//
// One page. Every project is a block whose background fills up, in the
// project's own colour, as its todos get done. Blocks can be dragged into a
// new order with the mouse, and the others slide out of the way; adding or
// removing one reflows the grid the same way. Clicking a block opens its todos
// in a popup over the dashboard, where a todo can be dragged from one column
// to another to change its status.
//
// Everything happens in the browser. The page talks straight to PostgREST,
// which sits next to Postgres on the lab machine (see db/README.md).
//
//   · Tailscale   https via `tailscale serve`. Works from the public https
//                 site, in the lab or out of it (Tailscale goes direct over
//                 the LAN when both ends are in the same room).
//   · LAN         plain http, so browsers only allow it from a page that is
//                 itself served over http (a local copy of the site). It is
//                 left out on https rather than tried and blocked.
//
// All usable endpoints are probed at once; the first to answer is used for
// the rest of the visit.
// -----------------------------------------------------------------------------

export const ENDPOINTS = [
  { label: 'Via Tailscale', url: 'https://desktop-d7ungo1.tail30fcd7.ts.net' },
  { label: 'In the lab',    url: 'http://192.168.137.1:3000' },
].filter((ep) => location.protocol === 'http:' || ep.url.startsWith('https:'));

const STATUSES = [
  { id: 'todo',  title: 'To do',  accent: '#4f7d93' },
  { id: 'doing', title: 'Doing',  accent: '#c9822f' },
  { id: 'done',  title: 'Done',   accent: '#5e8a6a' },
];
const NEXT = { todo: 'doing', doing: 'done', done: 'todo' };

/** The site's palette, offered when choosing a project's colour. */
const COLORS = ['#4f7d93', '#b4547e', '#8a5aa0', '#5e8a6a', '#c9822f', '#a8432d', '#5d5346'];

const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Resolves to the first endpoint that answers, or rejects if none do. */
async function pickEndpoint(timeout = 4000) {
  const probe = async (ep) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(`${ep.url}/projects?limit=1`, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`${ep.url} answered ${r.status}`);
      return ep;
    } finally { clearTimeout(t); }
  };
  return Promise.any(ENDPOINTS.map(probe));
}

/** Done, total and percentage for a list of todos. */
function progress(todos) {
  const total = todos.length;
  const done = todos.filter((t) => t.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Paint a .t-fill element for a percentage, in the project's colour. Width and colour transition in CSS. */
function paintFill(fill, pct, color) {
  const c = hexRgb(color);
  fill.style.width = `${pct}%`;
  fill.style.backgroundColor = rgba(c, 0.22);
  fill.style.borderRightColor = rgba(c, 0.75);
  fill.style.borderRightWidth = pct > 0 && pct < 100 ? '2px' : '0';   // an edge only while it is filling
}

export class TodoBoard {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.projects = [];      // in dashboard order, each with its todos embedded
    this.api = null;
    this.openId = null;      // the project whose popup is showing
    this.dragging = false;
  }

  mount() {
    this._stylesheets();
    document.title = 'Projects · Analogue Intelligence Lab';
    const el = document.createElement('main');
    el.className = 'plain todos';
    el.innerHTML = this._shell();
    this.root.appendChild(el);
    this.el = el;
    this.grid = el.querySelector('.t-projects');
    window.AI = { mode: 'todos', site: this };   // the boot watchdog stands down

    el.querySelector('[data-retry]').addEventListener('click', () => this._connect());
    el.querySelector('[data-new-project]').addEventListener('click', () => this._editProject(null));
    this._gridEvents();
    this._popup();
    this._projectDialog();
    this._todoDialog();
    this._connect();
  }

  _stylesheets() {
    for (const href of ['./src/styles/plain.css', './src/styles/todos.css']) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  _shell() {
    return `
      <header class="p-top ready">
        <a class="p-wordmark" href="?mode=page">
          <img src="./assets/logo.png" alt="" />
          <span>Analogue Intelligence Lab</span>
        </a>
        <span class="t-conn" data-state="probing">Connecting…</span>
      </header>

      <section class="p-section t-head">
        <p class="p-kicker">Lab only</p>
        <div class="t-head-row">
          <h1>Projects</h1>
          <button class="t-btn" type="button" data-new-project disabled>+ New project</button>
        </div>
        <p class="t-hint">Drag a block to reorder. Click it to see its todos.</p>
        <div class="t-error" hidden>
          <p><strong>Could not reach the lab database.</strong> This page only works on the lab network or over Tailscale.</p>
          <p class="t-error-detail"></p>
          <button class="t-btn ghost" type="button" data-retry>Try again</button>
        </div>
      </section>

      <section class="p-section t-projects"></section>`;
  }

  // ---------------------------------------------------------------- network

  async _connect() {
    const conn = this.el.querySelector('.t-conn');
    const err = this.el.querySelector('.t-error');
    conn.dataset.state = 'probing';
    conn.textContent = 'Connecting…';
    err.hidden = true;
    try {
      this.api = await pickEndpoint();
      conn.dataset.state = 'ok';
      const host = new URL(this.api.url).hostname;
      conn.textContent = `${this.api.label} · ${/^[\d.]+$/.test(host) ? host : host.split('.')[0]}`;
      this.el.querySelector('[data-new-project]').disabled = false;
      await this._refresh();
    } catch (e) {
      this.api = null;
      conn.dataset.state = 'down';
      conn.textContent = 'Offline';
      err.hidden = false;
      err.querySelector('.t-error-detail').textContent =
        `Tried ${ENDPOINTS.map((x) => x.url).join(' and ')}.`;
    }
  }

  async _req(path, opts = {}) {
    if (!this.api) throw new Error('Not connected');
    const r = await fetch(`${this.api.url}${path}`, {
      cache: 'no-store',
      ...opts,
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation', ...opts.headers },
    });
    if (!r.ok) {
      let msg = `${r.status}`;
      try { msg = (await r.json()).message || msg; } catch { /* not json */ }
      throw new Error(msg);
    }
    return r.status === 204 ? null : r.json();
  }

  /** Fetch everything again (it is small) and redraw. */
  async _refresh() {
    if (!this.api) return;
    try {
      this.projects = await this._req(
        '/projects?select=*,todos(*)&order=position.asc,id.asc&todos.order=due.asc.nullslast,id.asc');
    } catch (e) {
      return this._connect();
    }
    this._render();
  }

  _project(id) { return this.projects.find((p) => p.id === id); }

  // -------------------------------------------------------------- dashboard

  _render() {
    if (this.dragging) { this.pending = true; return; }   // never reshuffle under the cursor

    // Keyed update: existing blocks are kept (so their fill can animate and
    // they can slide to new places), new ones are made, stale ones removed.
    const before = this._rects();
    const seen = new Set();
    for (const p of this.projects) {
      let card = this.grid.querySelector(`:scope > .t-project[data-id="${p.id}"]`);
      const fresh = !card;
      if (fresh) {
        card = document.createElement('article');
        card.className = 'p-card t-project';
        card.dataset.id = p.id;
        card.tabIndex = 0;
        card.innerHTML = '<div class="t-fill" aria-hidden="true"></div><div class="t-body"></div>';
      }
      this._fillCard(card, p);
      this.grid.appendChild(card);                  // appending in order is the reorder
      seen.add(String(p.id));
      if (fresh && this.drawn && !calm()) {
        card.animate([{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
      }
    }
    for (const card of [...this.grid.children]) {
      if (!seen.has(card.dataset.id)) card.remove();
    }
    if (!this.projects.length) this.grid.innerHTML = '<p class="t-empty">No projects yet. Add the first one.</p>';
    else this.grid.querySelector(':scope > .t-empty')?.remove();
    this._flip(before);
    this.drawn = true;

    if (this.openId != null) {
      const p = this._project(this.openId);
      if (p) this._renderPopup(p);
      else this.popup.close();
    }
  }

  _fillCard(card, p) {
    const { done, total, pct } = progress(p.todos);
    const counts = STATUSES.map((s) => `<span>${p.todos.filter((t) => t.status === s.id).length} ${s.title.toLowerCase()}</span>`).join('');
    const late = p.todos.filter((t) => t.due && t.status !== 'done' && t.due < today()).length;
    card.style.setProperty('--accent', p.color);
    card.setAttribute('aria-label', `${p.name}, ${pct}% done`);
    paintFill(card.querySelector('.t-fill'), pct, p.color);
    card.querySelector('.t-body').innerHTML = `
      <h3>${esc(p.name)}</h3>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
      <div class="t-counts">${counts}${late ? `<span class="late">${late} overdue</span>` : ''}</div>
      <div class="t-score">
        <span class="t-big">${pct}%</span>
        <span class="t-frac">${total ? `${done} of ${total} done` : 'no todos yet'}</span>
      </div>`;
  }

  _rects() {
    return new Map([...this.grid.children].map((c) => [c.dataset.id, c.getBoundingClientRect()]));
  }

  /** Slide (and resize) every block from where it was to where it now is. */
  _flip(before, skip) {
    if (calm()) return;
    for (const card of this.grid.children) {
      const r0 = before.get(card.dataset.id);
      if (!r0 || card === skip) continue;
      card.getAnimations().forEach((an) => an.cancel());   // measure where it really is now
      const r1 = card.getBoundingClientRect();
      const dx = r0.left - r1.left;
      const dy = r0.top - r1.top;
      const sx = r1.width ? r0.width / r1.width : 1;
      const sy = r1.height ? r0.height / r1.height : 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
      card.animate([
        { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: 'top left', transform: 'none' },
      ], { duration: 320, easing: EASE });
    }
  }

  _bar(todos, what, color) {
    const { done, total, pct } = progress(todos);
    return `
      <div class="t-progress">
        <div class="t-bar" role="progressbar" aria-label="Progress of ${esc(what)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <span style="width:${pct}%; background:${color}"></span>
        </div>
        <span class="t-pct">${pct}%</span>
        <span class="t-frac">${done} of ${total} todos done</span>
      </div>`;
  }

  // ---------------------------------------------------------- drag and open

  _gridEvents() {
    // Mouse (and pen) drag to reorder. Touch is left to scroll the page;
    // a tap still opens the project.
    this.grid.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.t-project');
      if (!card || e.button !== 0 || e.pointerType === 'touch') return;
      e.preventDefault();                           // no text selection while dragging
      const start = { x: e.clientX, y: e.clientY };
      let drag = null;

      const move = (ev) => {
        if (!drag) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
          drag = this._startDrag(card, start);
        }
        drag.move(ev);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (drag) {
          drag.end();
          this.justDragged = true;                  // swallow the click that follows
          setTimeout(() => { this.justDragged = false; }, 0);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    this.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.t-project');
      if (card && !this.justDragged) this._openProject(Number(card.dataset.id));
    });
    this.grid.addEventListener('keydown', (e) => {
      const card = e.target.closest('.t-project');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this._openProject(Number(card.dataset.id));
      }
    });
  }

  _startDrag(card, start) {
    this.dragging = true;
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('t-ghost');
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    this.el.appendChild(ghost);
    card.classList.add('t-placeholder');
    document.body.classList.add('t-grabbing');
    const orderBefore = [...this.grid.children].map((c) => c.dataset.id).join();

    return {
      move: (ev) => {
        ghost.style.transform = `translate(${ev.clientX - start.x}px, ${ev.clientY - start.y}px) rotate(1.5deg)`;
        const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.t-project');
        if (!over || over === card || over.parentNode !== this.grid) return;
        if (over.getAnimations().length) return;   // still sliding: wait, or the two swap back and forth
        const cards = [...this.grid.children];
        const before = this._rects();
        if (cards.indexOf(over) > cards.indexOf(card)) over.after(card);
        else over.before(card);
        this._flip(before, card);
      },
      end: () => {
        const to = card.getBoundingClientRect();
        const done = () => {
          ghost.remove();
          card.classList.remove('t-placeholder');
          document.body.classList.remove('t-grabbing');
          this.dragging = false;
          const order = [...this.grid.children].map((c) => Number(c.dataset.id));
          if (order.join() !== orderBefore) this._saveOrder(order);
          else if (this.pending) { this.pending = false; this._render(); }
        };
        if (calm()) return done();
        ghost.animate([
          { transform: ghost.style.transform },
          { transform: `translate(${to.left - rect.left}px, ${to.top - rect.top}px)` },
        ], { duration: 220, easing: EASE }).finished.then(done, done);
      },
    };
  }

  /** Store the new order. Only projects whose place changed are written. */
  async _saveOrder(order) {
    const byId = new Map(this.projects.map((p) => [p.id, p]));
    const changed = order
      .map((id, i) => ({ p: byId.get(id), position: i + 1 }))
      .filter(({ p, position }) => p && p.position !== position);
    this.projects = order.map((id) => byId.get(id)).filter(Boolean);
    changed.forEach(({ p, position }) => { p.position = position; });
    try {
      await Promise.all(changed.map(({ p, position }) =>
        this._req(`/projects?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ position }), headers: { Prefer: 'return=minimal' } })));
    } catch (err) {
      alert(`Could not save the new order: ${err.message}`);
    }
    this.pending = false;
    await this._refresh();
  }

  // ------------------------------------------------------------ todos popup

  _popup() {
    const d = document.createElement('dialog');
    d.className = 't-dialog t-popup';
    d.innerHTML = '<div class="t-popup-inner"></div>';
    this.el.appendChild(d);
    this.popup = d;
    this.popupBody = d.querySelector('.t-popup-inner');

    d.addEventListener('close', () => { this.openId = null; });

    // Drag a todo to another column to change its status. Mouse and pen only,
    // like the project blocks; the "→" button does the same on a phone.
    d.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.t-card');
      if (!card || e.button !== 0 || e.pointerType === 'touch' || e.target.closest('button')) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let drag = null;
      const move = (ev) => {
        if (!drag) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
          drag = this._startTodoDrag(card, start);
        }
        drag.move(ev);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (drag) {
          drag.end();
          this.justDragged = true;
          setTimeout(() => { this.justDragged = false; }, 0);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    d.addEventListener('click', async (e) => {
      if (this.justDragged) return;
      if (e.target === d) return d.close();         // click on the backdrop
      if (e.target.closest('[data-close]')) return d.close();
      if (e.target.closest('[data-edit-project]')) return this._editProject(this._project(this.openId));
      if (e.target.closest('[data-new-todo]')) return this._editTodo(null);

      const card = e.target.closest('.t-card');
      if (!card) return;
      const todo = this._project(this.openId)?.todos.find((t) => t.id === Number(card.dataset.id));
      if (!todo) return;
      const move = e.target.closest('[data-move]');
      if (move) {
        move.disabled = true;
        try {
          await this._req(`/todos?id=eq.${todo.id}`, { method: 'PATCH', body: JSON.stringify({ status: move.dataset.move }) });
          await this._refresh();
        } catch (err) { alert(`Could not move it: ${err.message}`); move.disabled = false; }
        return;
      }
      this._editTodo(todo);
    });
  }

  _startTodoDrag(card, start) {
    this.dragging = true;
    const todo = this._project(this.openId)?.todos.find((t) => t.id === Number(card.dataset.id));
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('t-ghost');
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    this.popup.appendChild(ghost);                  // inside the dialog, or it would sit under it
    card.classList.add('t-placeholder');
    document.body.classList.add('t-grabbing');
    const cols = [...this.popup.querySelectorAll('.t-col')];
    const cards = () => [...this.popup.querySelectorAll('.t-card:not(.t-ghost)')];
    const rects = () => new Map(cards().map((c) => [c, c.getBoundingClientRect()]));
    const slide = (before) => {
      if (calm()) return;
      for (const [c, r0] of before) {
        if (c === card) continue;
        c.getAnimations().forEach((an) => an.cancel());
        const r1 = c.getBoundingClientRect();
        const dx = r0.left - r1.left;
        const dy = r0.top - r1.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: EASE });
      }
    };

    return {
      move: (ev) => {
        ghost.style.transform = `translate(${ev.clientX - start.x}px, ${ev.clientY - start.y}px) rotate(1.5deg)`;
        const col = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.t-col');
        cols.forEach((c) => c.classList.toggle('t-over', c === col));
        if (!col || col.contains(card)) return;
        const before = rects();
        col.querySelector('.t-list').appendChild(card);
        slide(before);
      },
      end: () => {
        cols.forEach((c) => c.classList.remove('t-over'));
        const to = card.getBoundingClientRect();
        const status = card.closest('.t-col').dataset.status;
        const done = async () => {
          ghost.remove();
          card.classList.remove('t-placeholder');
          document.body.classList.remove('t-grabbing');
          this.dragging = false;
          this.pending = false;
          if (todo && status !== todo.status) {
            try {
              await this._req(`/todos?id=eq.${todo.id}`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { Prefer: 'return=minimal' } });
            } catch (err) { alert(`Could not move it: ${err.message}`); }
          }
          await this._refresh();
        };
        if (calm()) return done();
        ghost.animate([
          { transform: ghost.style.transform },
          { transform: `translate(${to.left - rect.left}px, ${to.top - rect.top}px)` },
        ], { duration: 200, easing: EASE }).finished.then(done, done);
      },
    };
  }

  _openProject(id) {
    const p = this._project(id);
    if (!p) return;
    this.openId = id;
    this._renderPopup(p);
    this.popup.showModal();
    this.popup.querySelector('[data-new-todo]').focus();
  }

  _renderPopup(p) {
    const cols = STATUSES.map((s) => {
      const items = p.todos.filter((t) => t.status === s.id);
      return `
        <div class="t-col" data-status="${s.id}" style="--accent:${s.accent}">
          <h3>${s.title} <span class="t-count">${items.length}</span></h3>
          <div class="t-list">
            <p class="t-empty">Nothing here.</p>
            ${items.map((t) => this._block(t)).join('')}
          </div>
        </div>`;
    }).join('');

    this.popupBody.style.setProperty('--accent', p.color);
    this.popupBody.innerHTML = `
      <header class="t-popup-head">
        <span class="t-swatch" aria-hidden="true"></span>
        <h2>${esc(p.name)}</h2>
        <button class="t-btn ghost" type="button" data-edit-project>Edit project</button>
        <button class="t-btn" type="button" data-new-todo>+ New todo</button>
        <button class="t-close" type="button" data-close aria-label="Close">×</button>
      </header>
      ${p.description ? `<p class="t-popup-desc">${esc(p.description)}</p>` : ''}
      ${this._bar(p.todos, p.name, p.color)}
      <div class="t-board">${cols}</div>`;
  }

  _block(t) {
    const overdue = t.due && t.status !== 'done' && t.due < today();
    const due = t.due
      ? `<span class="t-due${overdue ? ' late' : ''}">${new Date(t.due + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>`
      : '';
    const next = STATUSES.find((s) => s.id === NEXT[t.status]);
    return `
      <article class="p-card t-card" data-id="${t.id}">
        <h4>${esc(t.title)}</h4>
        ${t.notes ? `<p>${esc(t.notes)}</p>` : ''}
        <div class="t-meta">
          ${t.owner ? `<span class="t-owner">${esc(t.owner)}</span>` : ''}
          ${due}
          <button class="t-move" type="button" data-move="${next.id}" title="Move to ${next.title}">→ ${next.title}</button>
        </div>
      </article>`;
  }

  // ---------------------------------------------------------------- dialogs

  /** A modal form. `onSave(fields)` and `onDelete.run()` do the request; errors stay in the dialog. */
  _dialog(fieldsHtml, { onSave, onDelete, read }) {
    const d = document.createElement('dialog');
    d.className = 't-dialog t-form';
    d.innerHTML = `
      <form method="dialog">
        <h2 data-heading></h2>
        ${fieldsHtml}
        <p class="t-form-error" hidden></p>
        <div class="t-actions">
          <button class="t-btn danger" type="button" data-delete>Delete</button>
          <span class="t-spacer"></span>
          <button class="t-btn ghost" type="button" data-cancel>Cancel</button>
          <button class="t-btn" type="submit">Save</button>
        </div>
      </form>`;
    this.el.appendChild(d);
    const form = d.querySelector('form');

    const run = async (action) => {
      const msg = d.querySelector('.t-form-error');
      const buttons = d.querySelectorAll('button');
      buttons.forEach((b) => { b.disabled = true; });
      msg.hidden = true;
      try {
        await action();
        d.close();
        await this._refresh();
      } catch (err) {
        msg.textContent = `Could not save: ${err.message}`;
        msg.hidden = false;
      } finally {
        buttons.forEach((b) => { b.disabled = false; });
      }
    };

    d.querySelector('[data-cancel]').addEventListener('click', () => d.close());
    d.querySelector('[data-delete]').addEventListener('click', () => {
      if (confirm(onDelete.confirm())) run(onDelete.run);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      run(() => onSave(read(new FormData(form))));
    });

    /** Open it, for a new record (null) or an existing one. */
    return (heading, record, fill) => {
      form.reset();
      d.querySelector('[data-heading]').textContent = heading;
      d.querySelector('[data-delete]').hidden = !record;
      d.querySelector('.t-form-error').hidden = true;
      if (record) fill(form, record);
      d.showModal();
      form.elements[0].focus();
    };
  }

  _projectDialog() {
    const swatches = COLORS.map((c, i) => `
      <label class="t-swatch-opt" style="--c:${c}">
        <input type="radio" name="color" value="${c}"${i === 0 ? ' checked' : ''} />
        <span></span>
      </label>`).join('');

    this.openProjectForm = this._dialog(`
      <label>Name <input name="name" required maxlength="120" autocomplete="off" /></label>
      <label>Description <textarea name="description" rows="2"></textarea></label>
      <fieldset class="t-colors"><legend>Colour</legend>${swatches}</fieldset>`, {
      read: (f) => ({ name: f.get('name').trim(), description: f.get('description').trim(), color: f.get('color') }),
      onSave: async (fields) => {
        if (this.editingProject) {
          await this._req(`/projects?id=eq.${this.editingProject.id}`, { method: 'PATCH', body: JSON.stringify(fields) });
        } else {
          const position = Math.max(0, ...this.projects.map((p) => p.position)) + 1;
          await this._req('/projects', { method: 'POST', body: JSON.stringify({ ...fields, position }) });
        }
      },
      onDelete: {
        confirm: () => {
          const n = this.editingProject.todos.length;
          return `Delete "${this.editingProject.name}"${n ? ` and its ${n} todo${n === 1 ? '' : 's'}` : ''}? This cannot be undone.`;
        },
        run: () => this._req(`/projects?id=eq.${this.editingProject.id}`, { method: 'DELETE' }),
      },
    });
  }

  _editProject(project) {
    if (!this.api) return;
    this.editingProject = project;
    this.openProjectForm(project ? 'Edit project' : 'New project', project, (form, p) => {
      form.elements.name.value = p.name;
      form.elements.description.value = p.description;
      const radio = [...form.elements.color].find((r) => r.value === p.color);
      if (radio) radio.checked = true;
    });
  }

  _todoDialog() {
    this.openTodoForm = this._dialog(`
      <label>Title <input name="title" required maxlength="200" autocomplete="off" /></label>
      <label>Notes <textarea name="notes" rows="3"></textarea></label>
      <div class="t-row">
        <label>Status
          <select name="status">${STATUSES.map((s) => `<option value="${s.id}">${s.title}</option>`).join('')}</select>
        </label>
        <label>Owner <input name="owner" autocomplete="off" /></label>
        <label>Due <input name="due" type="date" /></label>
      </div>`, {
      read: (f) => ({
        title: f.get('title').trim(),
        notes: f.get('notes').trim(),
        status: f.get('status'),
        owner: f.get('owner').trim(),
        due: f.get('due') || null,
      }),
      onSave: async (fields) => {
        if (this.editingTodo) {
          await this._req(`/todos?id=eq.${this.editingTodo.id}`, { method: 'PATCH', body: JSON.stringify(fields) });
        } else {
          await this._req('/todos', { method: 'POST', body: JSON.stringify({ ...fields, project_id: this.openId }) });
        }
      },
      onDelete: {
        confirm: () => 'Delete this todo?',
        run: () => this._req(`/todos?id=eq.${this.editingTodo.id}`, { method: 'DELETE' }),
      },
    });
  }

  _editTodo(todo) {
    if (!this.api || this.openId == null) return;
    this.editingTodo = todo;
    this.openTodoForm(todo ? 'Edit todo' : 'New todo', todo, (form, t) => {
      for (const k of ['title', 'notes', 'status', 'owner', 'due']) form.elements[k].value = t[k] ?? '';
    });
  }
}
