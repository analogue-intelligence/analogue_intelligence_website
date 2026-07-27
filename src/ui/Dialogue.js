// -----------------------------------------------------------------------------
// Dialogue — conversations, with anyone.
//
// One panel serves the Curator and all three colleagues: it's handed a speaker
// object from data/people.js and reads greeting → question list → answer →
// back to the list. Lines advance on click so you can set your own pace.
// -----------------------------------------------------------------------------
export class Dialogue {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'dlg-wrap';
    this.el.innerHTML = `
      <div class="dlg">
        <div class="dlg-head">
          <span class="dlg-name"></span>
          <span class="dlg-role"></span>
          <button class="dlg-close" aria-label="Close">×</button>
        </div>
        <div class="dlg-line"></div>
        <div class="dlg-more">click to continue</div>
        <div class="dlg-choices"></div>
      </div>
    `;
    root.appendChild(this.el);

    this.open = false;
    this.onClose = () => {};
    this.nameEl = this.el.querySelector('.dlg-name');
    this.roleEl = this.el.querySelector('.dlg-role');
    this.lineEl = this.el.querySelector('.dlg-line');
    this.moreEl = this.el.querySelector('.dlg-more');
    this.choicesEl = this.el.querySelector('.dlg-choices');

    this.el.querySelector('.dlg-close').addEventListener('click', (e) => {
      e.stopPropagation(); this.close();
    });
    this.el.querySelector('.dlg').addEventListener('click', () => this._advance());
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') this.close();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._advance(); }
    });
  }

  /** Start a conversation. `speaker` is a CURATOR/MEMBERS entry. */
  start(speaker) {
    this.speaker = speaker;
    this.el.style.setProperty('--accent', speaker.accent ?? '#c9a24a');
    this.nameEl.textContent = speaker.name;
    this.roleEl.textContent = speaker.role ?? '';
    this.el.classList.add('on');
    this.open = true;
    this._queue = [...(speaker.greeting ?? ['…'])];
    this._afterQueue = () => this._showChoices();
    this._next();
  }

  _next() {
    if (!this._queue.length) { this._afterQueue(); return; }
    const line = this._queue.shift();
    this.lineEl.innerHTML = line;
    this.lineEl.classList.remove('in'); void this.lineEl.offsetWidth;
    this.lineEl.classList.add('in');
    this.choicesEl.innerHTML = '';
    this.moreEl.style.opacity = '1';
  }

  _advance() {
    if (this._queue?.length) this._next();
    else if (!this.choicesEl.childElementCount) this._afterQueue();
  }

  _showChoices() {
    this.moreEl.style.opacity = '0';
    this.choicesEl.innerHTML = '';
    for (const q of this.speaker.questions ?? []) {
      const b = document.createElement('button');
      b.className = 'dlg-choice';
      b.textContent = q.q;
      b.addEventListener('click', (e) => { e.stopPropagation(); this._answer(q); });
      this.choicesEl.appendChild(b);
    }
    const leave = document.createElement('button');
    leave.className = 'dlg-choice leave';
    leave.textContent = 'That is all for now.';
    leave.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.speaker.farewell) {
        this._queue = [this.speaker.farewell];
        this._afterQueue = () => this.close();
        this._next();
      } else this.close();
    });
    this.choicesEl.appendChild(leave);
  }

  _answer(q) {
    this._queue = [...q.answer];
    this._afterQueue = () => {
      this._showChoices();
      if (q.action) {
        const a = document.createElement('a');
        a.className = 'dlg-choice action';
        a.textContent = q.action.label;
        a.href = q.action.href;
        a.target = '_blank'; a.rel = 'noopener';
        a.addEventListener('click', (e) => e.stopPropagation());
        this.choicesEl.prepend(a);
      }
    };
    this._next();
  }

  close() {
    if (!this.open) return;
    this.el.classList.remove('on');
    this.open = false;
    this.onClose();
  }
}
