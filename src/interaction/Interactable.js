import * as THREE from 'three';
import { CONTENT, CATEGORIES } from '../data/content.js';

// -----------------------------------------------------------------------------
// Interactable — the binding between something in the world and something it can
// say. It accepts a whole Group as well as a single Mesh, so a six-part drone
// lights up as one object rather than one rotor at a time.
// -----------------------------------------------------------------------------
export class Interactable {
  constructor(contentId, worldAnchor, object3d, roomId = null) {
    this.id = contentId;
    this.anchor = worldAnchor;
    this.object = object3d;
    this.room = roomId;
    this.content = CONTENT[contentId];
    if (!this.content) console.warn(`[interactable] no content entry for "${contentId}"`);
    this.category = CATEGORIES[this.content?.category] ?? CATEGORIES.vision;

    this.revealed = false;      // in range right now
    this.discovered = false;    // has ever been in range
    this._glow = 0;

    // Each interactable owns its materials so the glow can't leak into every
    // other prop that happened to share one.
    this.materials = [];
    object3d.traverse?.((o) => {
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        if (o.material.emissive) this.materials.push(o.material);
      }
    });
    if (object3d.isMesh && !this.materials.length && object3d.material?.emissive) {
      this.materials.push(object3d.material);
    }
    this._baseEmissive = this.materials.map((m) => m.emissiveIntensity ?? 0);
  }

  get color() { return this.category.color; }
  get tag() { return this.content?.tag ?? ''; }
  get title() { return this.content?.title ?? this.id; }
  get categoryLabel() { return this.category.label; }

  /** Drive the emissive lift from the proximity manager. */
  setGlow(k) {
    this._glow = k;
    for (let i = 0; i < this.materials.length; i++) {
      const m = this.materials[i];
      m.emissive.set(this.color);
      m.emissiveIntensity = this._baseEmissive[i] + k * 0.55;
    }
  }
}
