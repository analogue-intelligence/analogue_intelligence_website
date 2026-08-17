import * as THREE from 'three';

// -----------------------------------------------------------------------------
// textures.js — loads the baked painterly maps in assets/textures.
//
// These are real files now, not canvas drawings: see tools/bake_textures.py for
// how they're made. Colour maps are tagged sRGB, normal maps stay linear, and
// every texture is cached per (name, repeat) so the whole building shares a
// handful of GPU uploads.
// -----------------------------------------------------------------------------

const BASE = new URL('../../assets/textures/', import.meta.url).href;

/**
 * A loading manager, so somebody can wait for the textures.
 *
 * Every surface is created the moment the building is built, but its texture
 * arrives whenever the network says so. Starting the arrival sequence before
 * they land means the first seconds are spent watching untextured plaster turn
 * into wood — which is what the "textures doing something" moment was.
 *
 * `whenReady()` resolves once every request the manager has seen is finished,
 * and resolves immediately if nothing is outstanding.
 */
export const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const cache = new Map();

let pending = 0;
let settled = false;
const waiters = [];

manager.onStart = () => { settled = false; };
manager.onProgress = (_u, loaded, total) => { pending = total - loaded; };
const finish = () => {
  if (settled) return;
  settled = true;
  pending = 0;
  while (waiters.length) waiters.shift()();
};
manager.onLoad = finish;
manager.onError = () => { /* a missing texture must not hold the door shut */ };

/** Resolve when the textures are in — or after `timeout`, whichever is first. */
export function whenReady(timeout = 9000) {
  return new Promise((resolve) => {
    if (settled) return resolve();
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    waiters.push(go);
    setTimeout(go, timeout);          // never let a slow file block the site
  });
}

/** How many texture requests are still outstanding. */
export function texturesPending() { return pending; }

// Anisotropy matters more here than it looks: the ground is a single 220-unit
// plane seen at a shallow angle, and at 4 the far half of it shimmers as the
// camera moves — which reads as the floor glitching rather than as aliasing.
let maxAniso = 8;
export function setAnisotropy(n) { maxAniso = Math.max(1, Math.min(n, 16)); }

/**
 * @param {string} name   file stem, e.g. 'wood_floor'
 * @param {object} opts   { repeat:[u,v], linear:boolean, rotation:number }
 */
export function tex(name, opts = {}) {
  const [ru, rv] = opts.repeat ?? [1, 1];
  const key = `${name}|${ru}|${rv}|${opts.linear ? 'lin' : 'srgb'}|${opts.rotation ?? 0}`;
  if (cache.has(key)) return cache.get(key);

  const t = loader.load(`${BASE}${name}.png`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ru, rv);
  t.anisotropy = maxAniso;
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.rotation) { t.center.set(0.5, 0.5); t.rotation = opts.rotation; }
  cache.set(key, t);
  return t;
}

/** Colour map + matching normal map, if one was baked. */
export function texPair(name, repeat, rotation) {
  return {
    map: tex(name, { repeat, rotation }),
    normalMap: HAS_NORMAL.has(name) ? tex(`${name}_n`, { repeat, linear: true, rotation }) : null,
  };
}

const HAS_NORMAL = new Set([
  'wood_floor', 'wood_dark', 'plaster', 'concrete', 'tile', 'stone', 'metal', 'canvas',
]);
