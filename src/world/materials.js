import * as THREE from 'three';
import { tex, texPair } from './textures.js';

// -----------------------------------------------------------------------------
// materials.js — the palette and the material kit.
//
// The old build generated every surface at runtime; this one binds baked
// painterly maps to tinted standard materials. Tinting a near-neutral map is
// what lets one plaster texture serve five differently-coloured rooms without
// five downloads.
//
// The palette is deliberately desaturated and split warm/cool: ochres and rusts
// for anything lamplit, verdigris and slate for anything in shadow. Saturated
// colour is rationed and spent on the exhibits.
// -----------------------------------------------------------------------------

// Warmed through for daylight: the neutrals were all cool greys, which fought
// the sun coming through the glass and dragged every room back towards evening.
export const PALETTE = {
  // paper & ink
  ash: '#f2ebda',
  bone: '#ded4bf',
  ink: '#1e1811',
  soot: '#2e2720',

  // warm side
  ochre: '#c9a24a',
  amber: '#e0a13c',
  brass: '#b08d46',
  rust: '#a8452f',
  clay: '#8a5638',
  lamp: '#ffd9a0',

  // cool side
  verdigris: '#3e6b62',
  pine: '#2f4a44',
  slate: '#6a6558',
  steel: '#7c8794',
  night: '#241d16',

  // accents, used sparingly
  violet: '#6b4a78',
  rose: '#9a5a86',
  moss: '#5e6b3e',

  // timber
  oak: '#8a6236',
  walnut: '#4a3320',
  ebony: '#2a2018',
};

export const ROOM_LIGHT = {
  lobby: 0xffd2a0,
  hall: 0xffe3b8,
  robotics: 0xcfe3f0,
  studio: 0xf0c8e0,
  library: 0xffcf94,
};

// ---------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------
const cache = new Map();

/**
 * A textured standard material. `map` names a baked texture; `color` tints it.
 *   surface({ map:'plaster', repeat:[4,2], color:'#5d6b62', roughness:1 })
 */
export function surface(o = {}) {
  const key = JSON.stringify([o.map, o.repeat, o.color, o.roughness, o.metalness,
    o.emissive, o.emissiveIntensity, o.opacity, o.side, o.rotation, o.normalScale]);
  if (cache.has(key)) return cache.get(key);

  const maps = o.map ? texPair(o.map, o.repeat ?? [1, 1], o.rotation) : { map: null, normalMap: null };
  const m = new THREE.MeshStandardMaterial({
    color: o.color ?? '#ffffff',
    map: maps.map,
    normalMap: maps.normalMap,
    roughness: o.roughness ?? 0.88,
    metalness: o.metalness ?? 0.0,
    emissive: o.emissive ?? '#000000',
    emissiveIntensity: o.emissiveIntensity ?? 0,
    transparent: o.opacity !== undefined && o.opacity < 1,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    flatShading: o.flat ?? false,
    // image-based lighting: without this every surface is lit only by the two
    // directionals and reads flat, whatever its roughness says
    // A touch more environment and slightly tighter roughness gives painted
    // surfaces the soft clay sheen that clean low-poly work relies on, without
    // going anywhere near photoreal.
    envMapIntensity: o.envMapIntensity ?? 0.45,
  });
  if (maps.normalMap) m.normalScale.set(o.normalScale ?? 0.7, o.normalScale ?? 0.7);
  cache.set(key, m);
  return m;
}

/** Untextured flat colour — for painted props, plastics, small parts. */
/**
 * A painted colour — with paint on it.
 *
 * This used to be a bare `color` with no map, and it is used about seventy
 * times: every chair, crate, robot part, plaque and figure in the building.
 * That is why the props read as moulded plastic sitting in a hand-painted room
 * — the floors and walls had brushwork and nothing else did.
 *
 * The `brushwork` map is a near-white greyscale (mean 0.91) of crossed strokes
 * and canvas tooth, so it modulates the colour rather than tinting it. One
 * shared texture, no extra draw calls, and every flat surface in the building
 * gains visible paint at once. `bare: true` opts out for the few things that
 * should stay clean — screens, glass, emissive signage.
 */
export function paint(color, o = {}) {
  if (o.bare) {
    return surface({ color, roughness: o.roughness ?? 0.62, metalness: o.metalness ?? 0,
      emissive: o.emissive, emissiveIntensity: o.emissiveIntensity, flat: o.flat ?? false,
      opacity: o.opacity, side: o.side });
  }
  return surface({
    color, map: 'brushwork', repeat: o.repeat ?? [1, 1],
    roughness: o.roughness ?? 0.62, metalness: o.metalness ?? 0,
    emissive: o.emissive, emissiveIntensity: o.emissiveIntensity, flat: o.flat ?? false,
    opacity: o.opacity, side: o.side, normalScale: 0.25,
  });
}

export function metalMat(color = '#b9bec4', roughness = 0.42) {
  return surface({ map: 'metal', repeat: [1, 1], color, roughness, metalness: 0.55, normalScale: 0.4 });
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

/** Slight vertex jitter — keeps hard edges from reading as CAD output. */
export function roughen(geometry, amount = 0.012) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) + (Math.random() - 0.5) * amount,
      pos.getY(i) + (Math.random() - 0.5) * amount,
      pos.getZ(i) + (Math.random() - 0.5) * amount);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Geometry cache. Before this, 1,483 meshes owned 1,456 distinct geometries —
// essentially no sharing, so every crate leg was its own GPU upload. Boxes and
// cylinders are the overwhelming majority of the building and most of them
// repeat, so keying on their dimensions collapses thousands of buffers into a
// few hundred. Geometries are immutable once built, so sharing is safe.
const _geoCache = new Map();
function cached(key, make) {
  let g = _geoCache.get(key);
  if (!g) { g = make(); _geoCache.set(key, g); }
  return g;
}
const q = (n) => Math.round(n * 1000) / 1000;   // kill float noise in the key

export function geometryCacheSize() { return _geoCache.size; }


// ---------------------------------------------------------------------------
/**
 * A box with its twelve edges chamfered.
 *
 * This is the single biggest thing separating "assembled from primitives" from
 * "modelled": a perfectly sharp 90° edge catches no light, so a room built from
 * BoxGeometry reads as untextured plastic no matter how good the materials are.
 * A chamfer barely a few centimetres across picks up a specular line along every
 * edge, and the eye reads that line as a manufactured object.
 *
 * Built indexed and hand-UV'd rather than with ExtrudeGeometry, for two
 * reasons: mergeStatic() only merges indexed geometry, so an unindexed box would
 * quietly cost us the draw-call budget; and Extrude's UV generator does not
 * match BoxGeometry's per-face 0..1 convention, which every tiled material here
 * assumes.
 *
 * 96 vertices and 44 triangles against BoxGeometry's 24 and 12 — affordable,
 * because the geometry cache means each distinct size is built exactly once.
 */
export function chamferBox(w, h, d, r) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  r = Math.min(r, Math.min(w, h, d) * 0.24);

  const pos = [], nor = [], uv = [], idx = [];

  // UVs are projected planar on the dominant axis of the face normal, which
  // reproduces BoxGeometry's convention closely enough that every tiled
  // material keeps its scale.
  const pushVert = (p, n) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);

    // Choosing the projection axis by the largest normal component alone is
    // wrong for anything flat. A wall plate 0.08 deep has chamfer strips whose
    // normal is a 45° blend of "outward" and "sideways"; picking the sideways
    // axis projects the whole texture across 0.08 of a unit and smears it into
    // a streak around every edge. Dividing by the box's extent on that axis
    // makes a thin dimension the *preferred* projection direction, which is
    // what the flat face already uses — so edges and faces agree.
    const sx = Math.abs(n[0]) / w, sy = Math.abs(n[1]) / h, sz = Math.abs(n[2]) / d;
    let u, v;
    if (sx >= sy && sx >= sz) { u = (p[2] + hz) / d; v = (p[1] + hy) / h; }
    else if (sy >= sz) { u = (p[0] + hx) / w; v = (p[2] + hz) / d; }
    else { u = (p[0] + hx) / w; v = (p[1] + hy) / h; }
    uv.push(u, v);
  };

  // Winding has to agree with the declared normal or the triangle is invisible:
  // three.js culls back faces by default, so a quad listed the wrong way round
  // simply is not drawn. Emitting the six faces, twelve strips and eight corners
  // by hand and hoping each one came out consistent is exactly the sort of thing
  // that fails silently — half of them did, which is why every box lost its top.
  // So rather than trust the vertex order, check it: cross the edges, compare
  // against the normal we meant, and reverse if they disagree.
  const facesForward = (a, b, c, n) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    return cx * n[0] + cy * n[1] + cz * n[2] >= 0;
  };

  const quad = (a, b, c, e, n) => {
    if (!facesForward(a, b, c, n)) { const t = a; a = e; e = t; const u = b; b = c; c = u; }
    const base = pos.length / 3;
    pushVert(a, n); pushVert(b, n); pushVert(c, n); pushVert(e, n);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const tri = (a, b, c, n) => {
    if (!facesForward(a, b, c, n)) { const t = b; b = c; c = t; }
    const base = pos.length / 3;
    pushVert(a, n); pushVert(b, n); pushVert(c, n);
    idx.push(base, base + 1, base + 2);
  };

  const ix = hx - r, iy = hy - r, iz = hz - r;
  const S = [-1, 1];
  const nrm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };

  // --- the six faces, inset by the chamfer --------------------------------
  for (const s of S) {
    quad([s * hx, -iy, -iz], [s * hx, -iy, iz], [s * hx, iy, iz], [s * hx, iy, -iz],
      [s, 0, 0]);
    quad([-ix, s * hy, -iz], [ix, s * hy, -iz], [ix, s * hy, iz], [-ix, s * hy, iz],
      [0, s, 0]);
    quad([-ix, -iy, s * hz], [ix, -iy, s * hz], [ix, iy, s * hz], [-ix, iy, s * hz],
      [0, 0, s]);
  }

  // --- the twelve chamfer strips ------------------------------------------
  for (const a of S) for (const b of S) {
    quad([a * hx, b * iy, -iz], [a * hx, b * iy, iz],
      [a * ix, b * hy, iz], [a * ix, b * hy, -iz], nrm([a, b, 0]));          // x/y
    quad([a * hx, -iy, b * iz], [a * hx, iy, b * iz],
      [a * ix, iy, b * hz], [a * ix, -iy, b * hz], nrm([a, 0, b]));          // x/z
    quad([-ix, a * hy, b * iz], [ix, a * hy, b * iz],
      [ix, a * iy, b * hz], [-ix, a * iy, b * hz], nrm([0, a, b]));          // y/z
  }

  // --- the eight corners ---------------------------------------------------
  for (const a of S) for (const b of S) for (const c of S) {
    tri([a * hx, b * iy, c * iz], [a * ix, b * hy, c * iz], [a * ix, b * iy, c * hz],
      nrm([a, b, c]));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * How much chamfer a box of this size should get — and whether it is worth any.
 *
 * Below about a tenth of a unit the bevel is smaller than a pixel at this camera
 * distance, so slats, chain links and bin lips pay four times the vertex count
 * for nothing. Those keep sharp edges.
 */
function chamferFor(w, h, d) {
  const m = Math.min(w, h, d);
  if (m < 0.09) return 0;
  return Math.max(0.012, Math.min(0.05, m * 0.11));
}

export function box(w, h, d, material, o = {}) {
  // `sharp` opts out — a few things (thin decals, screens) look better without,
  // and a roughened box is displaced afterwards anyway so it gains nothing.
  const bevel = o.sharp || o.rough ? 0 : chamferFor(w, h, d);
  const g = cached(`b|${q(w)}|${q(h)}|${q(d)}|${o.rough ?? 0}|${q(bevel)}`, () => {
    const geo = bevel > 0
      ? chamferBox(w, h, d, bevel)
      : new THREE.BoxGeometry(w, h, d);
    if (o.rough) roughen(geo, o.rough);
    return geo;
  });
  const m = new THREE.Mesh(g, typeof material === 'string' ? paint(material) : material);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  return m;
}

export function cyl(rt, rb, h, material, seg = 12, o = {}) {
  const g = cached(`c|${q(rt)}|${q(rb)}|${q(h)}|${seg}`,
    () => new THREE.CylinderGeometry(rt, rb, h, seg));
  const m = new THREE.Mesh(g, typeof material === 'string' ? paint(material) : material);
  m.castShadow = true; m.receiveShadow = true;
  if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  return m;
}

export function lathe(profile, material, segments = 14) {
  const pts = profile.map((p) => new THREE.Vector2(p[0], p[1]));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, segments),
    typeof material === 'string' ? paint(material) : material);
  m.castShadow = true;
  return m;
}

/** A flat quad lying on the floor — rugs, light pools, decals. */
/**
 * Heights for anything lying flat on a floor.
 *
 * Everything used to sit between 0.02 and 0.035, which put rugs and floor paint
 * six thousandths of a unit apart. Across a 220-unit depth range that is about
 * 2.7e-5 — right at the resolution of a 16-bit depth buffer — so which one won
 * changed as the camera moved, and the floor flickered.
 *
 * The ladder below is spaced forty thousandths apart, roughly seven times the
 * precision floor, and the lift is invisible from an isometric camera thirty
 * units up. Use these rather than writing a literal.
 */
export const FLOOR = {
  stain: 0.03,      // paint splashes, spills — under everything
  marking: 0.07,    // hazard tape, bay outlines, painted zones
  rug: 0.11,        // rugs and mats
  light: 0.15,      // sun pools and other additive light patches
};

// Decal materials get a polygon offset as well as the height separation: the
// offset handles decal-against-floor, the ladder handles decal-against-decal.
const _decalMats = new Map();
function decalMaterial(material, y) {
  // Offset by a metre before rounding so heights below zero still separate.
  // Clamping negatives to zero gave the lawn and the verge — which sit at -0.40
  // and -0.36 — the same layer, the same polygon offset and the same render
  // order, so nothing decided which of them drew first.
  const layer = Math.round((y + 1) * 100);
  const key = `${material.uuid}|${layer}`;
  let m = _decalMats.get(key);
  if (!m) {
    m = material.clone();
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -(2 + (layer % 40) * 2);
    _decalMats.set(key, m);
  }
  return m;
}

export function decal(w, d, material, y = FLOOR.stain) {
  const g = cached(`p|${q(w)}|${q(d)}`, () => {
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    return geo;
  });
  const base = typeof material === 'string' ? paint(material) : material;
  const m = new THREE.Mesh(g, decalMaterial(base, y));
  m.position.y = y;
  m.renderOrder = Math.round((y + 1) * 100);          // deterministic ordering
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// static merging
// ---------------------------------------------------------------------------

/**
 * Collapse a prop's meshes into one mesh per material.
 *
 * A bookshelf is a carcass, four shelves, two uprights and a row of book
 * blocks — about twenty-five meshes, and therefore twenty-five draw calls, for
 * a thing that never moves a millimetre internally. Multiply by every piece of
 * furniture in five rooms and the frame is spending all its time on state
 * changes rather than pixels.
 *
 * The parts of a prop are rigid relative to each other, so their geometry can
 * be baked into shared buffers once, at build time. Anything that isn't a plain
 * indexed mesh — lights, sprites, screens with their own material — is left
 * exactly where it is.
 *
 * Written out by hand rather than pulled from three's BufferGeometryUtils so the
 * project keeps its single dependency and its no-build promise.
 */
export function mergeStatic(group) {
  try {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();

    group.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) return;
      if (o.morphTargetInfluences || Array.isArray(o.material)) return;
      const g = o.geometry;
      if (!g?.index || !g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      const key = o.material.uuid;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    });

    for (const [, meshes] of buckets) {
      if (meshes.length < 2) continue;

      let vTotal = 0, iTotal = 0;
      for (const m of meshes) { vTotal += m.geometry.attributes.position.count; iTotal += m.geometry.index.count; }
      if (vTotal > 65535 * 4) continue;                 // absurdly large, leave it

      const pos = new Float32Array(vTotal * 3);
      const nor = new Float32Array(vTotal * 3);
      const uv = new Float32Array(vTotal * 2);
      const idx = vTotal > 65535 ? new Uint32Array(iTotal) : new Uint16Array(iTotal);

      const mat4 = new THREE.Matrix4();
      const mat3 = new THREE.Matrix3();
      const v = new THREE.Vector3();
      let vo = 0, io = 0;

      for (const m of meshes) {
        m.updateWorldMatrix(true, false);
        mat4.copy(inv).multiply(m.matrixWorld);
        mat3.getNormalMatrix(mat4);

        const g = m.geometry;
        const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(mat4);
          pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
          v.fromBufferAttribute(n, i).applyMatrix3(mat3).normalize();
          nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
          uv[(vo + i) * 2] = t.getX(i); uv[(vo + i) * 2 + 1] = t.getY(i);
        }
        const gi = g.index;
        for (let i = 0; i < gi.count; i++) idx[io + i] = gi.getX(i) + vo;
        vo += p.count; io += gi.count;
      }

      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      merged.setIndex(new THREE.BufferAttribute(idx, 1));
      merged.computeBoundingSphere();

      const mesh = new THREE.Mesh(merged, meshes[0].material);
      mesh.castShadow = meshes.some((m) => m.castShadow);
      mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
      for (const m of meshes) m.parent?.remove(m);
      group.add(mesh);
    }
  } catch (e) {
    console.warn('[merge] left a prop unmerged:', e);
  }
  return group;
}

// ---------------------------------------------------------------------------
// light helpers
// ---------------------------------------------------------------------------
function hexToRgba(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Additive radial sprite — the bloom substitute around every practical light. */
export function glow(color, size = 3, opacity = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, hexToRgba(color, opacity));
  grd.addColorStop(0.45, hexToRgba(color, opacity * 0.35));
  grd.addColorStop(1, hexToRgba(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: t, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

/**
 * Text baked to a canvas — signs, labels, book spines, screens. Text is the one
 * thing still drawn at runtime, because it has to stay crisp and editable.
 */
export function textPlate(text, o = {}) {
  const w = o.w ?? 512, h = o.h ?? 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (o.bg !== 'transparent') { g.fillStyle = o.bg ?? '#241d18'; g.fillRect(0, 0, w, h); }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.borderWidth ?? 5; g.strokeRect(8, 8, w - 16, h - 16); }
  g.fillStyle = o.color ?? '#e7e0d2';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = Array.isArray(text) ? text : [text];
  // Shrink to fit rather than overflow. Without this a plate silently clips its
  // own text the moment the string is a little longer than the author expected
  // — which is exactly what happened to the title over the front door.
  let size = o.size ?? Math.floor(h * 0.42);
  const weight = o.weight ?? 700;
  const face = o.font ?? '"Syne", Georgia, serif';
  if (o.letterSpacing) g.letterSpacing = o.letterSpacing;
  const inner = w - (o.pad ?? 44);
  const widest = () => {
    g.font = `${weight} ${size}px ${face}`;
    return Math.max(...lines.map((ln) => g.measureText(String(ln)).width), 1);
  };
  let guard = 0;
  while (widest() > inner && size > 8 && guard++ < 80) size -= 2;
  // and keep the block inside the plate vertically too
  const blockH = lines.length * size * 1.25;
  if (blockH > h - 24) size = Math.max(8, Math.floor(size * (h - 24) / blockH));
  g.font = `${weight} ${size}px ${face}`;
  lines.forEach((ln, i) => {
    g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A screen: dark panel with faintly glowing content. Used all over the labs. */
export function screenMaterial(lines, o = {}) {
  const w = 512, h = 320;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = o.bg ?? '#0d1418'; g.fillRect(0, 0, w, h);
  g.strokeStyle = o.grid ?? 'rgba(120,200,190,0.16)'; g.lineWidth = 1;
  for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
  for (let i = 0; i < h; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  if (o.plot) {
    g.strokeStyle = o.accent ?? '#7fd7c4'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.6 - Math.sin(x * 0.02) * 50 - Math.sin(x * 0.061) * 26;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  g.fillStyle = o.accent ?? '#7fd7c4';
  g.font = '600 26px "Space Mono", monospace';
  (lines ?? []).forEach((ln, i) => g.fillText(ln, 24, 44 + i * 34));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: o.intensity ?? 0.9,
    roughness: 0.35, metalness: 0.1,
  });
}

// Textured shorthands used repeatedly by the room builders.
export const M = {
  floorWood: (rep) => surface({ map: 'wood_floor', repeat: rep, color: '#c9b391', roughness: 0.82 }),
  floorTile: (rep) => surface({ map: 'tile', repeat: rep, color: '#ffffff', roughness: 0.66 }),
  floorConcrete: (rep) => surface({ map: 'concrete', repeat: rep, color: '#b9bcc0', roughness: 0.95 }),
  stone: (rep) => surface({ map: 'stone', repeat: rep, color: '#b7b6b2', roughness: 0.92 }),
  plaster: (tint, rep) => surface({ map: 'plaster', repeat: rep ?? [3, 2], color: tint, roughness: 0.98, normalScale: 0.5 }),
  wood: (tint = '#9a7448', rep = [1, 1]) => surface({ map: 'wood_dark', repeat: rep, color: tint, roughness: 0.78 }),
  woodLight: (rep = [1, 1]) => surface({ map: 'wood_floor', repeat: rep, color: '#b08b58', roughness: 0.8 }),
  fabric: (tint, rep = [1, 1]) => surface({ map: 'fabric', repeat: rep, color: tint, roughness: 0.98 }),
  rug: (rep = [1, 1]) => surface({ map: 'rug', repeat: rep, color: '#ffffff', roughness: 1 }),
  paper: () => surface({ map: 'paper', repeat: [1, 1], color: '#ffffff', roughness: 0.95 }),
  canvasCloth: () => surface({ map: 'canvas', repeat: [1, 1], color: '#ffffff', roughness: 0.95 }),
  books: (rep = [1, 1]) => surface({ map: 'books', repeat: rep, color: '#ffffff', roughness: 0.9 }),
  metal: metalMat,
};

export { tex };
