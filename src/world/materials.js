import * as THREE from 'three';

// -----------------------------------------------------------------------------
// materials.js — palette + a procedural style kit. Everything here is generated
// at runtime (canvas textures, lathe shapes, stained glass) — no asset files.
// This is what pushes the look away from "gray boxes": warm daylit palette,
// stained-glass windows, tiled floor, turned lamp shades, painted faces.
// -----------------------------------------------------------------------------

export const PALETTE = {
  cream:   '#efe7d3',
  ink:     '#2a2320',
  orange:  '#e8703a',
  amber:   '#f4b942',
  magenta: '#d1477a',
  purple:  '#8e6fb8',
  indigo:  '#4f5bab',
  navy:    '#3a5068',
  plum:    '#9d4b6c',
  // warm antique-library surfaces
  wood:    '#6b4a2f',
  woodLt:  '#8a5f38',
  woodDk:  '#4a3420',
  teal:    '#3c7d74',   // walls
  tealDk:  '#2c5c55',
  paper:   '#e6dcc0',
  green:   '#5a7d4e',
  leaf:    '#6d9a52',
  sky:     '#e7eef3',
  sun:     '#fff3d6',
  glassGreen: '#8fbf7f',
};

// jewel tones for stained glass
export const GLASS_COLORS = ['#d94f4f', '#e79a3c', '#eccb54', '#3fa48f', '#4477a8', '#8e6fb8', '#c85b93', '#6ab04c'];

const _cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (_cache.has(key)) return _cache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, flatShading: opts.flat ?? true,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    map: opts.map ?? null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  _cache.set(key, m);
  return m;
}

export function roughen(geometry, amount = 0.03) {
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

export function box(w, h, d, color, opts) {
  const g = roughen(new THREE.BoxGeometry(w, h, d), opts?.rough ?? 0.015);
  const m = new THREE.Mesh(g, mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// A lathe-turned shape (for lamp shades, vases, finials) from a radius profile.
export function lathe(profile, color, opts = {}) {
  const pts = profile.map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, opts.segments ?? 12);
  const m = new THREE.Mesh(g, mat(color, opts));
  m.castShadow = true;
  return m;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Additive radial glow sprite for lamps / window light.
export function glowSprite(color, size = 3, opacity = 0.55) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, hexToRgba(color, opacity));
  grd.addColorStop(1, hexToRgba(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

// Procedural diamond-tile floor texture (cream + green diamonds, like the refs).
export function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dcc4'; g.fillRect(0, 0, 256, 256);
  const n = 8, s = 256 / n;
  g.strokeStyle = 'rgba(90,120,90,0.35)'; g.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke();
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke();
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i + j) % 2 === 0) {
      const cx = i * s + s / 2, cy = j * s + s / 2, r = s * 0.2;
      g.fillStyle = '#8fae7e';
      g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// A painted chibi face on a transparent canvas → used as a plane in front of the
// head. `variant` tweaks features (glasses for the player, brows for the guide).
export function faceTexture(variant = 'player', skin = '#e79a5c') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  // rosy cheeks
  g.fillStyle = 'rgba(220,90,90,0.55)';
  g.beginPath(); g.ellipse(38, 78, 12, 8, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(90, 78, 12, 8, 0, 0, 7); g.fill();
  // eyes
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(46, 60, 12, 0, 7); g.fill();
  g.beginPath(); g.arc(82, 60, 12, 0, 7); g.fill();
  g.fillStyle = '#2a2320';
  g.beginPath(); g.arc(48, 62, 6, 0, 7); g.fill();
  g.beginPath(); g.arc(80, 62, 6, 0, 7); g.fill();
  // mouth
  g.strokeStyle = '#7a3b2a'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.arc(64, 84, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  if (variant === 'player') {
    // round glasses
    g.strokeStyle = '#2a2320'; g.lineWidth = 3;
    g.beginPath(); g.arc(46, 60, 15, 0, 7); g.stroke();
    g.beginPath(); g.arc(82, 60, 15, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(61, 60); g.lineTo(67, 60); g.stroke();
  } else {
    // curator brows + a small nose mark
    g.strokeStyle = '#5a3b2a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(36, 44); g.lineTo(56, 48); g.stroke();
    g.beginPath(); g.moveTo(92, 44); g.lineTo(72, 48); g.stroke();
    g.fillStyle = '#c0402a';
    g.beginPath(); g.arc(64, 46, 3, 0, 7); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// A full stained-glass panel: colored translucent panes + dark leading.
export function stainedGlass(w, h, cols = 4, rows = 6) {
  const grp = new THREE.Group();
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const color = GLASS_COLORS[(i * 3 + j * 5 + i * j) % GLASS_COLORS.length];
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(cw * 0.9, ch * 0.9),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.82, roughness: 0.35, side: THREE.DoubleSide,
      }));
    pane.position.set(-w / 2 + cw * (i + 0.5), -h / 2 + ch * (j + 0.5), 0);
    grp.add(pane);
  }
  // leading: vertical + horizontal dark bars
  const lead = mat('#3a2c1c', { roughness: 1 });
  for (let i = 0; i <= cols; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.12), lead);
    bar.position.set(-w / 2 + cw * i, 0, 0); grp.add(bar);
  }
  for (let j = 0; j <= rows; j++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.12), lead);
    bar.position.set(0, -h / 2 + ch * j, 0); grp.add(bar);
  }
  return grp;
}
