import * as THREE from 'three';
import { tex } from '../world/textures.js';

// -----------------------------------------------------------------------------
// Postprocess.js — the painted-canvas pass.
//
// This is the single biggest lever on the art style, and it's deliberately
// hand-rolled rather than pulled from three's example addons: one render target
// with a depth attachment, one fullscreen shader, no dependencies.
//
// What the shader does, in order:
//   1. depth discontinuities  → soft ink lines, dark in the shadows, thinner in
//      the light, the way a brush loads up at the edge of a form
//   2. a baked brush map      → multiplied in screen space, strongest in the
//      mid-tones so flat surfaces get visible tooth
//   3. warm/cool split-tone   → shadows pushed toward teal, highlights toward
//      lamplight, then a gentle S-curve and a saturation pull
//   4. vignette + grain       → the edges of a lit canvas
//
// Everything is guarded: if depth textures or float targets aren't available we
// fall back to rendering straight to the screen and the world still works.
// -----------------------------------------------------------------------------

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tBrush;
uniform sampler2D tGrain;
uniform vec2  uTexel;
uniform vec2  uBrushScale;
uniform float uNear;
uniform float uFar;
uniform float uTime;
uniform float uInk;
uniform float uBrush;
uniform float uGrain;
uniform float uVignette;
uniform float uSaturation;
uniform vec3  uShadowTint;
uniform vec3  uHighlightTint;
uniform float uAO;
uniform float uBands;
uniform float uAORadius;
uniform float uBloom;
uniform vec2  uRevealC;
uniform float uRevealR;
uniform float uRevealSoft;

varying vec2 vUv;

// orthographic depth is linear in view space already
float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return uNear + d * (uFar - uNear);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// ---------------------------------------------------------------------------
// Ambient occlusion from depth alone.
//
// The orthographic camera makes this unusually cheap and unusually accurate:
// its depth buffer is already linear in world units, so a sample that is nearer
// the camera than the centre pixel by some number of units is an occluder by
// exactly that many units — no reconstruction, no projection maths, no normal
// buffer. Twelve taps on a golden-angle spiral is enough at this camera
// distance.
//
// This is the single strongest depth cue available here. Without it every
// object sits *on* the floor rather than *in* the room.
// ---------------------------------------------------------------------------
float occlusion(vec2 uv, float dC, vec2 grad) {
  if (uAO <= 0.0) return 1.0;
  float occ = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float ang = fi * 2.39996323;                       // golden angle
    float rad = uAORadius * sqrt((fi + 0.5) / 8.0);
    vec2 off = vec2(cos(ang), sin(ang)) * rad;
    off.y *= uTexel.y / uTexel.x;                      // keep the disc circular

    // The correction that makes this usable. A floor or a wall seen from an
    // isometric camera has a steep, *constant* depth gradient — so comparing a
    // sample against the centre pixel marks half of every flat surface as
    // occluded, and every large plane picks up a dirty gradient across it.
    // Predicting what the depth *should* be if the surface simply continued
    // means only genuine creases register.
    float predicted = dC + dot(off / uTexel, grad);
    float diff = predicted - texture2D(tDepth, uv + off).x * (uFar - uNear);
    occ += clamp(diff / 0.42, 0.0, 1.0) * (1.0 - smoothstep(1.4, 3.0, diff));
  }
  return clamp(1.0 - (occ / 8.0) * uAO, 0.0, 1.0);
}

// A cheap single-pass highlight bleed. Not a real bloom — no downsample chain —
// but enough that lamps and stained glass spill light into the air around them.
vec3 bleed(vec2 uv) {
  if (uBloom <= 0.0) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float ang = float(i) * 1.5707963 + 0.7853981;
    vec2 off = vec2(cos(ang), sin(ang)) * uTexel * 10.0;
    sum += max(texture2D(tDiffuse, uv + off).rgb - 0.88, vec3(0.0));
  }
  return sum * (uBloom / 4.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92,
             1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
             step(vec3(0.0031308), c));
}

void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;

  // ---- 1. ink: depth-gradient edges ---------------------------------------
  float dC = viewDepth(vUv);
  float dR = viewDepth(vUv + vec2(uTexel.x, 0.0));
  float dL = viewDepth(vUv - vec2(uTexel.x, 0.0));
  float dU = viewDepth(vUv + vec2(0.0, uTexel.y));
  float dD = viewDepth(vUv - vec2(0.0, uTexel.y));
  float edge = abs(dR - dC) + abs(dL - dC) + abs(dU - dC) + abs(dD - dC);
  edge = smoothstep(0.06, 0.42, edge);
  // don't outline the far plane, and keep lines out of the brightest highlights
  float inWorld = step(dC, uFar - 0.5);
  float lineAmt = edge * inWorld * uInk * (1.0 - 0.55 * smoothstep(0.55, 1.0, luma(col)));
  col *= (1.0 - lineAmt * 0.85);

  // ---- 1b. ambient occlusion ----------------------------------------------
  // the same four taps the ink edge already made, reused as a depth gradient
  vec2 grad = vec2((dR - dL) * 0.5, (dU - dD) * 0.5);
  col *= mix(1.0, occlusion(vUv, dC, grad), inWorld);

  // ---- 1c. highlight bleed -------------------------------------------------
  col += bleed(vUv);

  // ---- 2. brush tooth ------------------------------------------------------
  float b = texture2D(tBrush, vUv * uBrushScale).r - 0.5;
  float mid = 1.0 - abs(luma(col) - 0.45) * 1.6;      // strongest in mid-tones
  col *= 1.0 + b * uBrush * clamp(mid, 0.15, 1.0);

  // ---- 2b. banded light ----------------------------------------------------
  // The illustrated look in the references comes from quantised lighting, not
  // from a filter over the top: shadows and highlights land as blocks of tone
  // rather than a smooth ramp. Doing it here rather than with MeshToonMaterial
  // keeps the environment lighting, the roughness response and the vertex bake
  // — we band the *result* instead of replacing the lighting model.
  //
  // Only the value is quantised; hue and saturation ride through untouched, so
  // colours stay clean rather than posterising into mud.
  if (uBands > 0.5) {
    float lum = max(luma(col), 1e-4);
    float stepped = floor(lum * uBands + 0.5) / uBands;
    // soften the joins a little so the bands read as painted, not as a bug
    float soft = mix(lum, stepped, 0.72);
    col *= soft / lum;
  }

  // ---- 3. split-tone grade -------------------------------------------------
  float L = luma(col);
  vec3 tint = mix(uShadowTint, uHighlightTint, smoothstep(0.08, 0.75, L));
  col *= tint;
  col = mix(vec3(L), col, uSaturation);              // pull saturation back
  col = clamp(col, 0.0, 4.0);
  col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;   // gentle S-curve
  // Lifted well off zero. Nothing in a sunny low-poly scene is ever actually
  // black; crushed shadows are most of what makes a bright palette read grim.
  col += vec3(0.052, 0.048, 0.044);

  // ---- 3b. the reveal ------------------------------------------------------
  // A circle of world around a point, everything outside it black. The prologue
  // uses this to open on the visitor alone and then widen out to the whole
  // building once they have landed, so the first thing anyone sees is a person
  // rather than half a lit interior with the camera still moving to its mark.
  //
  // Doing it here rather than by hiding geometry means it costs one distance
  // per pixel and cannot possibly desynchronise from what is on screen.
  if (uRevealR < 4.0) {
    float aspect = uTexel.y / uTexel.x;
    float dr = distance(vUv * vec2(aspect, 1.0), uRevealC * vec2(aspect, 1.0));
    float m = 1.0 - smoothstep(uRevealR, uRevealR + uRevealSoft, dr);
    col = mix(vec3(0.012, 0.016, 0.026), col, m);
  }

  // ---- 4. vignette + grain -------------------------------------------------
  vec2 v = (vUv - 0.5) * vec2(1.0, 0.92);
  col *= 1.0 - uVignette * dot(v, v) * 1.6;

  float g = texture2D(tGrain, vUv * uBrushScale * 2.4 + vec2(uTime * 0.37, uTime * 0.23)).r;
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(toSRGB(max(col, 0.0)), 1.0);
}`;

export class Postprocess {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.ok = false;

    try {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
      this.target.depthTexture = new THREE.DepthTexture(size.x, size.y);
      this.target.depthTexture.format = THREE.DepthFormat;
      this.target.depthTexture.type = THREE.UnsignedIntType;

      this.uniforms = {
        tDiffuse: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        tBrush: { value: tex('brush', { repeat: [1, 1], linear: true }) },
        tGrain: { value: tex('grain', { repeat: [1, 1], linear: true }) },
        uTexel: { value: new THREE.Vector2(1 / size.x, 1 / size.y) },
        uBrushScale: { value: new THREE.Vector2(size.x / 620, size.y / 620) },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uTime: { value: 0 },
        // A thinner, more even outline and a much lighter brush overlay: the
        // silhouette should be crisp and the surface should carry the texture.
        uInk: { value: 0.34 },
        uBrush: { value: 0.10 },
        // Graded for a sunny morning rather than a crypt. The old values —
        // a heavy 0.42 vignette, saturation pulled to 0.86 and cold blue in the
        // shadows — were doing most of the work of making the building feel
        // like somewhere you'd been locked in overnight. Shadows are now warm
        // and only slightly cool of neutral, highlights are cream, and the
        // vignette is a suggestion instead of a tunnel.
        // Lighter and more graphic. Heavy grain and a strong brush overlay read
        // as muddy at this camera distance; the look wants clean shapes with
        // texture visible in the surface rather than smeared over the image.
        uGrain: { value: 0.008 },
        uVignette: { value: 0.03 },
        uSaturation: { value: 1.16 },
        uShadowTint: { value: new THREE.Color(1.00, 0.985, 0.99) },
        uHighlightTint: { value: new THREE.Color(1.05, 1.02, 0.95) },
        uAO: { value: 0.85 },
        uBands: { value: 7.0 },
        // radius 9 is "off": the shader skips the whole term above 4
        uRevealC: { value: new THREE.Vector2(0.5, 0.5) },
        uRevealR: { value: 9.0 },
        uRevealSoft: { value: 0.14 },
        uAORadius: { value: 0.016 },
        uBloom: { value: 0.5 },
      };

      const quad = new THREE.BufferGeometry();
      quad.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      quad.setAttribute('uv', new THREE.BufferAttribute(
        new Float32Array([0, 0, 2, 0, 0, 2]), 2));

      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.mesh = new THREE.Mesh(quad, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
        depthTest: false, depthWrite: false,
      }));
      this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);
      this.ok = true;
    } catch (e) {
      console.warn('[post] painterly pass unavailable, rendering direct:', e);
      this.ok = false;
    }
  }

  setSize(w, h) {
    if (!this.ok) return;
    const dpr = this.renderer.getPixelRatio();
    const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
    this.target.setSize(bw, bh);
    this.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    this.uniforms.uBrushScale.value.set(bw / 620, bh / 620);
  }

  render(scene, camera, dt) {
    const r = this.renderer;
    if (!this.ok || !this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    this.uniforms.uTime.value += dt;
    this.uniforms.uNear.value = camera.near;
    this.uniforms.uFar.value = camera.far;
    r.setRenderTarget(this.target);
    r.clear();
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
  }

  /** Scale the expensive terms with the engine's quality tier. */
  setQuality(s) {
    const u = this.uniforms;
    if (!u) return;
    if (u.uAO) u.uAO.value = s.ao ?? 0.8;
    if (u.uBloom) u.uBloom.value = s.bloom ?? 0.4;
    if (u.uBands) u.uBands.value = s.bands ?? 7.0;
  }

  /**
   * Show only a circle of the frame, centred on a screen point.
   * `radius` is in screen heights; anything at or above 4 disables the effect.
   */
  setReveal(cx, cy, radius, soft = 0.14) {
    const u = this.uniforms;
    if (!u?.uRevealR) return;
    u.uRevealC.value.set(cx, cy);
    u.uRevealR.value = radius;
    u.uRevealSoft.value = soft;
  }

  clearReveal() { this.setReveal(0.5, 0.5, 9.0); }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
}
