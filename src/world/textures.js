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
const loader = new THREE.TextureLoader();
const cache = new Map();

let maxAniso = 4;
export function setAnisotropy(n) { maxAniso = Math.max(1, Math.min(n, 8)); }

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
