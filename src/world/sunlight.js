import * as THREE from 'three';
import { M, PALETTE, box, paint, glow , FLOOR } from './materials.js';
import { plant, hangingPlant } from './props.js';

// -----------------------------------------------------------------------------
// sunlight.js — windows, and what comes through them.
//
// The building had no daylight. Every lumen came from a practical lamp, which
// is why it read as a vault at midnight rather than a studio in the morning.
//
// A window here is three things: leaded coloured glass in the wall, an additive
// sheet of light in front of it, and — the part that actually does the work — a
// pool of colour thrown across the floor. That pool is a texture, not a light,
// which matters: real projected light through coloured glass would mean a
// spotlight with a cookie per window and we spent the last round getting the
// light count *down*. Painted on the floor it costs one transparent quad and
// looks better, because it can be exactly the shape you want.
//
// Everything drifts. The pools breathe, sway a few centimetres and dim slightly
// as if a branch outside were moving, which is most of what sells "sunny and
// breezy" — a static sun pool reads as a decal, a moving one reads as weather.
// -----------------------------------------------------------------------------

const GLASS = {
  lab: ['#5fa8c9', '#8fc7d8', '#e8dcc0', '#c9d86f'],
  classroom: ['#8fc7a8', '#e8dcc0', '#c9d86f', '#9ec8e0'],
  studio: ['#e8894a', '#e8c14a', '#c05a86', '#6fb0a8', '#e8dcc0'],
  partners: ['#e8c14a', '#b08d46', '#e8dcc0', '#c9a86f'],
  library: ['#c96f4a', '#e8b44a', '#8a6fc9', '#e8dcc0'],
  lobby: ['#e8a84a', '#d86f5a', '#e8dcc0', '#8fc9a8'],
  hall: ['#e8c14a', '#e8dcc0', '#d89a5a'],
};

/**
 * Where the daylight comes in. Coordinates are the wall the window is cut into;
 * `inward` is the direction the floor pool is thrown, which is always into the
 * room. Only walls the isometric camera actually keeps — the low-x and low-z
 * ones — are worth glazing, since the others fade out under the cutaway.
 */
export const WINDOWS = [
  // studio end of the lab: the big north light an art room is built around
  { room: 'lab', axis: 'x', at: -59.7, along: -4, w: 5.6, h: 5.6, sill: 1.4, inward: [1, 0],
    glass: 'studio' },
  { room: 'lab', axis: 'z', at: -11.2, along: -54, w: 6.0, h: 5.6, sill: 1.4, inward: [0, 1],
    glass: 'studio' },
  { room: 'lab', axis: 'z', at: -11.2, along: -44, w: 4.4, h: 4.6, sill: 1.9, inward: [0, 1],
    glass: 'studio' },
  // robotics end: cooler, higher, more industrial
  { room: 'lab', axis: 'z', at: -11.2, along: -30, w: 4.6, h: 4.4, sill: 2.2, inward: [0, 1] },
  { room: 'lab', axis: 'z', at: -11.2, along: -20, w: 4.6, h: 4.4, sill: 2.2, inward: [0, 1] },
  // library: a pair over the stacks
  { room: 'library', axis: 'z', at: -29.7, along: -8, w: 5.4, h: 5.0, sill: 1.8, inward: [0, 1] },
  { room: 'library', axis: 'z', at: -29.7, along: 6, w: 5.4, h: 5.0, sill: 1.8, inward: [0, 1] },
  // lobby: morning light over the coffee bar
  // Moved south along the wall. The classroom door was added at z = 21 on this
  // same wall, and this window spanned 16.7 to 21.3 — so the stained glass was
  // drawn straight across the doorway and you could not see the way through.
  { room: 'lobby', axis: 'x', at: -11.7, along: 15.4, w: 4.2, h: 4.6, sill: 1.5, inward: [1, 0] },
  // the classroom gets its own daylight, on the wall the cutaway keeps
  { room: 'classroom', axis: 'x', at: -37.7, along: 26.4, w: 4.6, h: 4.8, sill: 1.6,
    inward: [1, 0], glass: 'lab' },
  { room: 'classroom', axis: 'z', at: 29.7, along: -20, w: 5.0, h: 4.4, sill: 1.9,
    inward: [0, -1] },
  // partners room: warm and deliberately generous
  { room: 'partners', axis: 'z', at: -11.2, along: 24, w: 6.0, h: 5.4, sill: 1.5, inward: [0, 1] },
  { room: 'partners', axis: 'z', at: -11.2, along: 33, w: 4.0, h: 4.4, sill: 2.0, inward: [0, 1] },
  // hall: no ceiling, so this is simply the sun coming in from overhead
  { room: 'hall', axis: 'sky', along: 0, at: 0, w: 9, h: 16, sill: 0, inward: [0, 0] },
  { room: 'hall', axis: 'sky', along: -9, at: 6, w: 6, h: 10, sill: 0, inward: [0, 0] },
];

// ---------------------------------------------------------------------------
/** Leaded glass: irregular panes in a dark came, drawn once per palette. */
const _glassCache = new Map();
function glassTexture(colors, seed = 0) {
  const key = colors.join() + seed;
  if (_glassCache.has(key)) return _glassCache.get(key);

  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2118';
  g.fillRect(0, 0, 256, 256);

  let r = seed * 9781 + 1;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const cols = 4, rows = 6;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const w = 256 / cols, h = 256 / rows;
      const x = i * w, y = j * h;
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      g.globalAlpha = 0.75 + rnd() * 0.25;
      // a slightly irregular pane so it doesn't read as a spreadsheet
      g.beginPath();
      g.moveTo(x + 2 + rnd() * 2, y + 2 + rnd() * 2);
      g.lineTo(x + w - 2 - rnd() * 2, y + 2 + rnd() * 2);
      g.lineTo(x + w - 2 - rnd() * 2, y + h - 2 - rnd() * 2);
      g.lineTo(x + 2 + rnd() * 2, y + h - 2 - rnd() * 2);
      g.closePath(); g.fill();
      // a highlight streak, so the glass looks like glass
      g.globalAlpha = 0.18;
      g.fillStyle = '#ffffff';
      g.fillRect(x + w * 0.15, y + 3, w * 0.2, h - 6);
    }
  }
  g.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _glassCache.set(key, t);
  return t;
}

/** The soft-edged patch of colour the window throws on the floor. */
const _poolCache = new Map();
function poolTexture(colors, seed = 0) {
  const key = 'p' + colors.join() + seed;
  if (_poolCache.has(key)) return _poolCache.get(key);

  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);

  let r = seed * 7919 + 3;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  // the panes, blurred and stretched as they would be in projection
  const cols = 4, rows = 6;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const w = S / cols, h = S / rows;
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      g.globalAlpha = 0.5 + rnd() * 0.3;
      g.fillRect(i * w + 5, j * h + 5, w - 10, h - 10);
    }
  }
  g.globalAlpha = 1;
  g.filter = 'blur(7px)';
  g.drawImage(c, 0, 0);
  g.filter = 'none';

  // feather the border to nothing so there is no visible rectangle edge
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.52);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _poolCache.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------
/**
 * Build one window and its light. Returns a group to add to the world and a
 * tick that drifts the pool. `roomY` is the floor height of the room.
 */
export function buildWindow(spec, roomY = 0, index = 0, cutaway = null) {
  const colors = GLASS[spec.glass ?? spec.room] ?? GLASS.hall;
  const group = new THREE.Group();
  const ticks = [];

  if (spec.axis === 'sky') {
    // No glazing — the hall has no ceiling, so this is simply open sky above.
    const pool = sunPool(colors, spec.w, spec.h, index);
    pool.position.set(spec.at, roomY + FLOOR.light, spec.along);
    pool.rotation.z = 0.22;
    group.add(pool);
    ticks.push(driftPool(pool, index, 1.0));
    return { group, ticks };
  }

  const horizontal = spec.axis === 'z';
  const cx = horizontal ? spec.along : spec.at;
  const cz = horizontal ? spec.at : spec.along;
  const cy = roomY + spec.sill + spec.h / 2;

  // --- the glass itself ---
  const glassMat = new THREE.MeshBasicMaterial({
    map: glassTexture(colors, index),
    transparent: true, opacity: 0.96, side: THREE.DoubleSide, fog: false,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), glassMat);
  glass.position.set(cx, cy, cz);
  if (!horizontal) glass.rotation.y = Math.PI / 2;
  group.add(glass);

  // A window in a wall that the cutaway can slice — the hall/studio partition
  // is the only one — has to fade with it, or you get stained glass hanging in
  // mid-air once the wall it belongs to has dissolved.
  if (cutaway && spec.cut) {
    cutaway.add(glass, spec.axis, spec.at);
  }

  // --- the frame, so it is set into the wall rather than stuck on it ---
  const frameMat = paint(PALETTE.walnut ?? '#4a3320');
  const t = 0.18;
  const frame = new THREE.Group();
  for (const [dx, dy, w, h] of [
    [0, spec.h / 2 + t / 2, spec.w + t * 2, t],
    [0, -spec.h / 2 - t / 2, spec.w + t * 2, t],
    [-spec.w / 2 - t / 2, 0, t, spec.h + t * 2],
    [spec.w / 2 + t / 2, 0, t, spec.h + t * 2],
    [0, 0, t * 0.6, spec.h],
    [0, 0, spec.w, t * 0.6],
  ]) {
    const bar = box(w, h, 0.22, frameMat, { cast: false });
    bar.position.set(dx, dy, 0);
    frame.add(bar);
  }
  frame.position.set(cx, cy, cz);
  if (!horizontal) frame.rotation.y = Math.PI / 2;
  group.add(frame);
  if (cutaway && spec.cut) {
    for (const bar of frame.children) cutaway.add(bar, spec.axis, spec.at);
  }

  // --- a soft haze in front of the glass, the shaft of light itself ---
  const haze = glow(colors[0], Math.max(spec.w, spec.h) * 1.05, 0.075);
  haze.position.set(
    cx + spec.inward[0] * 0.9, cy - 0.4, cz + spec.inward[1] * 0.9);
  group.add(haze);

  // --- the pool on the floor, thrown inward from the window ---
  const pool = sunPool(colors, spec.w * 1.5, spec.h * 1.9, index);
  const reach = 2.6 + spec.sill * 0.8;
  pool.position.set(
    cx + spec.inward[0] * reach,
    roomY + FLOOR.light,
    cz + spec.inward[1] * reach);
  pool.rotation.z = horizontal ? 0.12 : Math.PI / 2 + 0.12;
  group.add(pool);
  ticks.push(driftPool(pool, index, 0.85));

  // --- and something growing in the light, because that is what happens ---
  const p = plant(0.95 + (index % 3) * 0.12);
  p.position.set(
    cx + spec.inward[0] * 1.5 + (horizontal ? spec.w * 0.42 : 0),
    roomY,
    cz + spec.inward[1] * 1.5 + (horizontal ? 0 : spec.w * 0.42));
  group.add(p);

  if (spec.h > 4.5) {
    const hp = hangingPlant(0.9);
    hp.position.set(
      cx + spec.inward[0] * 0.7, roomY + spec.sill + spec.h - 0.2,
      cz + spec.inward[1] * 0.7);
    group.add(hp);
  }

  return { group, ticks };
}

function sunPool(colors, w, d, seed) {
  const mat = new THREE.MeshBasicMaterial({
    map: poolTexture(colors, seed),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

/** The breeze: a slow sway and a slower breath, offset per window. */
function driftPool(pool, seed, strength) {
  const ox = pool.position.x, oz = pool.position.z;
  const phase = seed * 1.7;
  let t = 0;
  return (dt) => {
    t += dt;
    pool.position.x = ox + Math.sin(t * 0.32 + phase) * 0.20 * strength;
    pool.position.z = oz + Math.cos(t * 0.24 + phase * 1.3) * 0.16 * strength;
    pool.material.opacity =
      (0.26 + Math.sin(t * 0.5 + phase) * 0.04 + Math.sin(t * 1.7 + phase) * 0.02) * strength;
    pool.scale.setScalar(1 + Math.sin(t * 0.21 + phase) * 0.03);
  };
}

/** Build every window in the plan. Called once, from Building.js. */
export function buildDaylight(group, rooms, animate, cutaway = null) {
  let i = 0;
  for (const spec of WINDOWS) {
    const room = rooms.find((r) => r.id === spec.room);
    const { group: g, ticks } = buildWindow(spec, room?.y ?? 0, i++, cutaway);
    group.add(g);
    for (const fn of ticks) animate.push(fn);
  }
}
