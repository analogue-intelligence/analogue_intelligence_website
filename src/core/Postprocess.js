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

varying vec2 vUv;

// orthographic depth is linear in view space already
float viewDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return uNear + d * (uFar - uNear);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

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

  // ---- 2. brush tooth ------------------------------------------------------
  float b = texture2D(tBrush, vUv * uBrushScale).r - 0.5;
  float mid = 1.0 - abs(luma(col) - 0.45) * 1.6;      // strongest in mid-tones
  col *= 1.0 + b * uBrush * clamp(mid, 0.15, 1.0);

  // ---- 3. split-tone grade -------------------------------------------------
  float L = luma(col);
  vec3 tint = mix(uShadowTint, uHighlightTint, smoothstep(0.08, 0.75, L));
  col *= tint;
  col = mix(vec3(L), col, uSaturation);              // pull saturation back
  col = clamp(col, 0.0, 4.0);
  col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;   // gentle S-curve
  col += vec3(0.012, 0.010, 0.016);                  // lifted, cool blacks

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
        uInk: { value: 0.9 },
        uBrush: { value: 0.3 },
        // Graded for a sunny morning rather than a crypt. The old values —
        // a heavy 0.42 vignette, saturation pulled to 0.86 and cold blue in the
        // shadows — were doing most of the work of making the building feel
        // like somewhere you'd been locked in overnight. Shadows are now warm
        // and only slightly cool of neutral, highlights are cream, and the
        // vignette is a suggestion instead of a tunnel.
        uGrain: { value: 0.028 },
        uVignette: { value: 0.13 },
        uSaturation: { value: 1.06 },
        uShadowTint: { value: new THREE.Color(0.97, 0.96, 1.00) },
        uHighlightTint: { value: new THREE.Color(1.06, 1.01, 0.92) },
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

  toggle() { this.enabled = !this.enabled; return this.enabled; }
}
