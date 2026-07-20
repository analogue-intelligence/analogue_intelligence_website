// -----------------------------------------------------------------------------
// InfoModal — the formatted card that opens when you activate an object. Themed
// by the object's category colour. Optional action button (e.g. contact email).
// -----------------------------------------------------------------------------
export class InfoModal {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.className = 'modal-scrim';
    this.el.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-accent"></div>
        <button class="modal-close" aria-label="Close">✕</button>
        <span class="modal-cat"></span>
        <h2 class="modal-title"></h2>
        <div class="modal-body"></div>
        <a class="modal-action" style="display:none"></a>
      </div>`;
    root.appendChild(this.el);

    this.card = this.el.querySelector('.modal-card');
    this.el.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    this.isOpen = false;
  }

  open(interactable) {
    const c = interactable.content;
    const accent = interactable.color;
    this.el.style.setProperty('--accent', accent);
    this.el.querySelector('.modal-cat').textContent = interactable.categoryLabel;
    this.el.querySelector('.modal-title').textContent = c.title;
    this.el.querySelector('.modal-body').innerHTML =
      c.body.map((p) => `<p>${p}</p>`).join('');

    const action = this.el.querySelector('.modal-action');
    if (c.action) {
      action.textContent = c.action.label;
      action.href = c.action.href;
      action.style.display = 'inline-flex';
    } else {
      action.style.display = 'none';
    }

    this.el.classList.add('open');
    this.isOpen = true;
  }

  close() {
    this.el.classList.remove('open');
    this.isOpen = false;
  }
}
