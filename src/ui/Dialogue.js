import { GUIDE } from '../data/dialogue.js';

// -----------------------------------------------------------------------------
// Dialogue — the curator's conversation panel. Opens with the greeting and a
// list of pre-established questions; picking one shows the answer (and any
// contact action), then returns to the question list. Doubles as the "get in
// touch" surface.
// -----------------------------------------------------------------------------
export class Dialogue {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'dialogue';
    this.el.innerHTML = `
      <button class="dialogue-close" aria-label="Close">✕</button>
      <div class="dialogue-name">${GUIDE.name}</div>
      <div class="dialogue-text"></div>
      <div class="dialogue-options"></div>`;
    root.appendChild(this.el);

    this.text = this.el.querySelector('.dialogue-text');
    this.options = this.el.querySelector('.dialogue-options');
    this.el.querySelector('.dialogue-close').addEventListener('click', () => this.close());
    this.isOpen = false;
  }

  open() {
    this._say(GUIDE.greeting);
    this._showQuestions();
    this.el.classList.add('open');
    this.isOpen = true;
  }

  _say(paragraphs) {
    this.text.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
  }

  _showQuestions() {
    this.options.innerHTML = '';
    GUIDE.questions.forEach((item) => {
      const b = document.createElement('button');
      b.className = 'dialogue-opt';
      b.textContent = item.q;
      b.addEventListener('click', () => this._answer(item));
      this.options.appendChild(b);
    });
  }

  _answer(item) {
    this._say(item.answer);
    this.options.innerHTML = '';
    if (item.action) {
      const a = document.createElement('a');
      a.className = 'dialogue-action';
      a.href = item.action.href;
      a.textContent = item.action.label;
      this.options.appendChild(a);
    }
    const back = document.createElement('button');
    back.className = 'dialogue-opt dialogue-back';
    back.textContent = '← Ask something else';
    back.addEventListener('click', () => { this._say(GUIDE.greeting); this._showQuestions(); });
    this.options.appendChild(back);
  }

  close() {
    this.el.classList.remove('open');
    this.isOpen = false;
  }
}
