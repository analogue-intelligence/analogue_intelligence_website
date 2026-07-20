// -----------------------------------------------------------------------------
// Hud — on-screen furniture: the W/A/S/D hint, the floating-label layer, the
// always-on clickable Curator marker (you must click it — or the NPC — to talk),
// a discovery toast, and the mute button.
// -----------------------------------------------------------------------------
export class Hud {
  constructor(root) {
    this.root = root;

    this.hint = document.createElement('div');
    this.hint.className = 'move-hint';
    this.hint.innerHTML = `
      <div class="keys">
        <span class="key key-w">W</span>
        <div class="keys-row"><span class="key">A</span><span class="key">S</span><span class="key">D</span></div>
      </div>
      <p class="hint-text">Walk with <b>W A S D</b><br>or <b>click the floor</b> to move there.<br>
      Objects glow when you're near — click to read. Stairs lead up.</p>`;
    this.hint.classList.add('pre');
    root.appendChild(this.hint);

    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'label-layer';
    root.appendChild(this.labelLayer);

    // Curator marker (always visible after intro; tracks the NPC on screen)
    this.guideMarker = document.createElement('button');
    this.guideMarker.className = 'guide-marker';
    this.guideMarker.innerHTML = `<span class="gm-star">✦</span><span class="gm-text">Talk to the Curator</span>`;
    this.guideMarker.style.opacity = '0';
    root.appendChild(this.guideMarker);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    root.appendChild(this.toastEl);
    this._toastTimer = null;

    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'mute-btn';
    this.muteBtn.setAttribute('aria-label', 'Toggle sound');
    this.muteBtn.textContent = '♪';
    root.appendChild(this.muteBtn);
  }

  fadeHintAfter(ms) { setTimeout(() => this.hint.classList.add('faded'), ms); }

  // called each frame with the guide's projected screen position
  updateGuideMarker(x, y, onScreen, active) {
    this.guideMarker.style.opacity = (onScreen && active) ? '1' : '0';
    this.guideMarker.style.pointerEvents = (onScreen && active) ? 'auto' : 'none';
    this.guideMarker.style.transform = `translate(-50%, -120%) translate(${x}px, ${y}px)`;
  }

  toast(title, color) {
    this.toastEl.innerHTML = `<span class="toast-tag" style="color:${color}">Discovered</span><span class="toast-title">${title}</span>`;
    this.toastEl.style.setProperty('--accent', color);
    this.toastEl.classList.remove('show'); void this.toastEl.offsetWidth; this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 3200);
  }

  setMuted(muted) { this.muteBtn.textContent = muted ? '⁄' : '♪'; this.muteBtn.classList.toggle('muted', muted); }
}
