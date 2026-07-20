import * as THREE from 'three';

// -----------------------------------------------------------------------------
// ProximityManager — every frame, checks which interactables fall inside the
// player's lamp radius. Revealed objects (a) glow up their emissive, and (b) get
// an HTML label positioned over them in screen space. Clicking a label or its
// mesh fires onActivate(interactable). Objects outside the lamp go dark + hide.
// -----------------------------------------------------------------------------
export class ProximityManager {
  constructor(engine, player, interactables, labelLayer) {
    this.engine = engine;
    this.player = player;
    this.items = interactables;
    this.layer = labelLayer;      // a DOM element that holds label chips
    this.revealRadius = 7.5;
    this.onActivate = () => {};
    this.onDiscover = () => {};
    this._raycaster = new THREE.Raycaster();
    this._v = new THREE.Vector3();

    // Build one label chip per interactable.
    for (const it of this.items) {
      const el = document.createElement('button');
      el.className = 'obj-label';
      el.style.setProperty('--accent', it.color);
      el.innerHTML =
        `<span class="obj-cat">${it.categoryLabel}</span>` +
        `<span class="obj-tag">${it.tag}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.revealed) this.onActivate(it);
      });
      it._label = el;
      this.layer.appendChild(el);
    }
  }

  // Called by Input.onObjectClick — returns true if a revealed mesh was hit,
  // which tells Input to NOT treat the click as a move command.
  tryClick(pointer) {
    this._raycaster.setFromCamera(pointer, this.engine.camera);
    const meshes = this.items.filter((i) => i.revealed).map((i) => i.mesh);
    const hit = this._raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return false;
    const it = this.items.find((i) => i.mesh === hit.object);
    if (it) { this.onActivate(it); return true; }
    return false;
  }

  update(dt) {
    const p = this.player.position;
    for (const it of this.items) {
      const dist = it.anchor.distanceTo(p);
      const wasRevealed = it.revealed;
      it.revealed = dist < this.revealRadius;

      // Ease emissive glow in/out.
      const targetGlow = it.revealed ? 1 : 0;
      it._glow += (targetGlow - it._glow) * Math.min(dt * 6, 1);
      if (it.mesh.material.emissive) {
        it.mesh.material.emissive.set(it.color);
        it.mesh.material.emissiveIntensity = it._glow * 0.8;
      }

      // First discovery cue.
      if (it.revealed && !it.discovered) { it.discovered = true; this.onDiscover(it); }

      // Position / show the HTML label.
      const el = it._label;
      if (it._glow > 0.05) {
        this._v.copy(it.anchor).project(this.engine.camera);
        const x = (this._v.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-this._v.y * 0.5 + 0.5) * window.innerHeight;
        const onScreen = this._v.z < 1 && x > 0 && x < window.innerWidth;
        el.style.opacity = onScreen ? it._glow.toFixed(2) : '0';
        el.style.transform = `translate(-50%, -120%) translate(${x}px, ${y}px)`;
        el.classList.toggle('is-live', it.revealed);
        el.style.pointerEvents = it.revealed ? 'auto' : 'none';
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }

      if (it.revealed !== wasRevealed && it.revealed) {
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      }
    }
  }
}
