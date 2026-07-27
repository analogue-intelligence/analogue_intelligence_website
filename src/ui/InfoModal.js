// -----------------------------------------------------------------------------
// InfoModal — what an object has to say, in a panel you can dismiss with Escape.
//
// It takes an Interactable rather than raw strings so the category colour, the
// subtitle and the action link all come along automatically.
// -----------------------------------------------------------------------------
export class InfoModal {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.el.innerHTML = `
      <div class="modal">
        <button class="modal-close" aria-label="Close">×</button>
        <div class="modal-cat"></div>
        <h2 class="modal-title"></h2>
        <div class="modal-subtitle"></div>
        <div class="modal-body"></div>
        <a class="modal-action" target="_blank" rel="noopener"></a>
      </div>
    `;
    root.appendChild(this.el);

    this.open = false;
    this.onClose = () => {};
    this.catEl = this.el.querySelector('.modal-cat');
    this.titleEl = this.el.querySelector('.modal-title');
    this.subEl = this.el.querySelector('.modal-subtitle');
    this.bodyEl = this.el.querySelector('.modal-body');
    this.actionEl = this.el.querySelector('.modal-action');

    this.el.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.close(); });
  }

  show(interactable) {
    const c = interactable.content;
    if (!c) return;
    const accent = interactable.color;
    this.el.style.setProperty('--accent', accent);
    this.catEl.textContent = interactable.categoryLabel;
    this.titleEl.textContent = c.title;
    this.subEl.textContent = c.subtitle ?? '';
    this.subEl.style.display = c.subtitle ? 'block' : 'none';
    this.bodyEl.innerHTML = (c.body ?? []).map((p) => `<p>${p}</p>`).join('');

    if (c.action) {
      this.actionEl.textContent = c.action.label;
      this.actionEl.href = c.action.href;
      this.actionEl.style.display = 'inline-flex';
    } else {
      this.actionEl.style.display = 'none';
    }

    this.el.classList.add('on');
    this.open = true;
  }

  close() {
    if (!this.open) return;
    this.el.classList.remove('on');
    this.open = false;
    this.onClose();
  }
}
