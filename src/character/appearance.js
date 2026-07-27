// -----------------------------------------------------------------------------
// appearance.js — the option set the character creator offers, and the shape of
// the object every figure is built from.
//
// Adding a swatch here is enough to make it appear in the creator; figure.js
// reads the same keys. Nothing else needs to know.
// -----------------------------------------------------------------------------

export const SKIN = [
  '#f3d3b6', '#e8bb95', '#d99b6c', '#b87642', '#8d5524', '#5c3618',
];

export const HAIR_COLOR = [
  '#1c1712', '#3a2a1c', '#6b4523', '#a8672c', '#c9a24a', '#8d8d92', '#e8e2d4', '#6b4a78',
];

export const HAIR_STYLE = [
  { id: 'crop', label: 'Crop' },
  { id: 'bob', label: 'Bob' },
  { id: 'bun', label: 'Bun' },
  { id: 'curls', label: 'Curls' },
  { id: 'long', label: 'Long' },
  { id: 'shaved', label: 'Shaved' },
];

export const COAT = [
  '#a8452f', '#3e6b62', '#4f6472', '#6b4a78', '#c9822f',
  '#5e6b3e', '#8a5638', '#2f3439', '#9a5a86', '#c9a24a',
];

export const TROUSERS = ['#2c333d', '#4a3a2a', '#3f4a44', '#5a4a5a', '#6b6252', '#22262b'];

export const ACCESSORY = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'beard', label: 'Beard' },
  { id: 'apron', label: 'Apron' },   // the Curator's, not offered in the creator
];

export const BUILD = [
  { id: 'slim', label: 'Slim', body: 0.86, shoulder: 0.9 },
  { id: 'regular', label: 'Regular', body: 1.0, shoulder: 1.0 },
  { id: 'sturdy', label: 'Sturdy', body: 1.18, shoulder: 1.12 },
];

export const DEFAULT_APPEARANCE = {
  name: 'Visitor',
  skin: SKIN[2],
  hairStyle: 'crop',
  hairColor: HAIR_COLOR[1],
  coat: COAT[0],
  trousers: TROUSERS[0],
  accessory: 'none',
  build: 'regular',
  height: 1.0,          // 0.88 – 1.12
};

/**
 * Trousers are no longer a choice in the creator — five colour pickers on one
 * screen is four more decisions than anyone wants before they have seen the
 * building. They're derived from the coat instead, so the figure is always
 * coordinated. Deterministic, so your character looks the same every visit.
 *
 * The full palette is still exported: data/people.js sets trousers directly for
 * the team, and the accessory system is likewise intact for them even though
 * the creator no longer offers it.
 */
export function trousersFor(coat) {
  const n = parseInt(String(coat).replace('#', ''), 16);
  return TROUSERS[((n >> 4) ^ (n >> 12)) % TROUSERS.length];
}

const KEY = 'analogue-intelligence:appearance';

export function loadAppearance() {
  try {
    const raw = window.localStorage?.getItem(KEY);
    if (!raw) return null;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch { return null; }
}

export function saveAppearance(a) {
  try { window.localStorage?.setItem(KEY, JSON.stringify(a)); } catch { /* private mode */ }
}

export function clearAppearance() {
  try { window.localStorage?.removeItem(KEY); } catch { /* ignore */ }
}

export function buildOf(id) { return BUILD.find((b) => b.id === id) ?? BUILD[1]; }
