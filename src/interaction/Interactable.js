import { CONTENT, CATEGORIES } from '../data/content.js';

// -----------------------------------------------------------------------------
// Interactable — a thin binding between a piece of geometry and a content entry.
// Holds its own world anchor (where the floating label sits) and tracks whether
// it's currently "revealed" (inside the lamp) so the manager can animate glow.
// -----------------------------------------------------------------------------
export class Interactable {
  constructor(contentId, worldAnchor, mesh) {
    this.id = contentId;
    this.anchor = worldAnchor;      // THREE.Vector3
    this.mesh = mesh;
    this.content = CONTENT[contentId];
    this.category = CATEGORIES[this.content.category];
    this.revealed = false;          // in lamp radius this frame
    this.discovered = false;        // has ever been revealed (for one-time cues)
    this._glow = 0;                 // 0..1 eased emissive strength
  }

  get color() { return this.category.color; }
  get tag() { return this.content.tag; }
  get categoryLabel() { return this.category.label; }
}
