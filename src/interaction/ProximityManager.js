import * as THREE from 'three';

// -----------------------------------------------------------------------------
// ProximityManager — decides what is close enough to notice.
//
// Each frame it measures every interactable against the player, eases a glow
// value, parks an HTML chip over the ones in range, and keeps track of the
// single nearest one so the E key has something obvious to act on.
//
// Objects on another floor are ignored outright: standing in the hall should not
// light up a book directly above you in the library.
// -----------------------------------------------------------------------------
export class ProximityManager {
  constructor(engine, player, interactables, labelLayer) {
    this.engine = engine;
    this.player = player;
    this.items = interactables;
    this.layer = labelLayer;
    this.revealRadius = 8.0;
    this.onActivate = () => {};
    this.canActivate = () => true;      // main.js narrows this to lit rooms
    this.onDiscover = () => {};
    this.nearest = null;
    this._raycaster = new THREE.Raycaster();
    this._v = new THREE.Vector3();

    for (const it of this.items) {
      const el = document.createElement('button');
      el.className = 'obj-label';
      el.style.setProperty('--accent', it.color);
      // Every live chip carries a hint, not only the nearest one. Clicking a
      // chip has always worked, but only the closest object showed an `E`, so
      // the others looked like captions rather than buttons — and when three
      // exhibits are in range at once, guessing which one `E` will pick is a
      // genuinely bad experience. Now: the nearest says `E`, the rest say
      // `click`, and both do the same thing.
      el.innerHTML =
        `<span class="obj-cat">${it.categoryLabel}</span>` +
        `<span class="obj-tag">${it.tag}</span>` +
        `<span class="obj-key"><i class="k-e">E</i><i class="k-c">click</i></span>`;
      el.title = `Open ${it.title}`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onActivate(it);
      });
      it._label = el;
      this.layer.appendChild(el);
    }
  }

  /**
   * Called from Input — true means "this click was consumed by an object".
   *
   * Clicking used to require standing inside the reveal radius, which made the
   * mouse feel broken: you could plainly see a plinth, click it, and walk
   * somewhere instead. Anything you can see is now clickable. The one guard is
   * that objects in rooms you haven't entered stay unclickable, so a click
   * can't reach through the dark and spoil the reveal.
   */
  tryClick(pointer) {
    this._raycaster.setFromCamera(pointer, this.engine.camera);
    let best = null, bestDist = Infinity;
    for (const it of this.items) {
      if (!this.canActivate(it)) continue;
      const hit = this._raycaster.intersectObject(it.object, true)[0];
      if (hit && hit.distance < bestDist) { best = it; bestDist = hit.distance; }
    }
    if (best) { this.onActivate(best); return true; }
    return false;
  }

  /** Activate whatever is closest — the E key path. */
  activateNearest() {
    if (this.nearest) { this.onActivate(this.nearest); return true; }
    return false;
  }

  update(dt) {
    const p = this.player.position;
    let nearest = null, nearestD = Infinity;
    const R2 = this.revealRadius * this.revealRadius;

    for (const it of this.items) {
      // Cheap rejection first: squared distance, no sqrt, and skip the DOM
      // entirely for the twenty-odd objects that are nowhere near you.
      const d2 = it.anchor.distanceToSquared(p);
      if (d2 > R2 * 4 && it._glow < 0.005) {
        if (it._label.style.opacity !== '0') {
          it._label.style.opacity = '0';
          it._label.style.pointerEvents = 'none';
        }
        it.revealed = false;
        continue;
      }
      const sameFloor = Math.abs(it.anchor.y - p.y) < 4.5;
      const dist = Math.sqrt(d2);
      const wasRevealed = it.revealed;
      it.revealed = sameFloor && dist < this.revealRadius;

      if (it.revealed && dist < nearestD) { nearest = it; nearestD = dist; }

      const target = it.revealed ? 1 : 0;
      const g = it._glow + (target - it._glow) * Math.min(dt * 6, 1);
      it.setGlow(g);

      if (it.revealed && !it.discovered) { it.discovered = true; this.onDiscover(it); }

      const el = it._label;
      if (g > 0.04) {
        const s = this.engine.project(it.anchor, this._v);
        const onScreen = s.visible && s.x > -80 && s.x < window.innerWidth + 80;
        el.style.opacity = onScreen ? g.toFixed(2) : '0';
        el.style.transform = `translate(-50%, -120%) translate(${s.x}px, ${s.y}px)`;
        el.style.pointerEvents = it.revealed && onScreen ? 'auto' : 'none';
        el.classList.toggle('is-live', it.revealed);
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }

      if (it.revealed && !wasRevealed) {
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      }
    }

    // only the closest object advertises the E key
    for (const it of this.items) it._label.classList.toggle('is-nearest', it === nearest);
    this.nearest = nearest;
  }
}
