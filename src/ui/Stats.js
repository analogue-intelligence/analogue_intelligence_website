// -----------------------------------------------------------------------------
// Stats.js — what the machine is actually doing.
//
// "It feels clunky" and "the frames are crashing" are real reports but they are
// not measurements, and optimising against a description is guesswork. This
// panel answers the three questions that matter: what hardware is this, how
// long is a frame taking, and how much is being asked of it.
//
// The renderer string comes from WEBGL_debug_renderer_info, which is the same
// thing chrome://gpu shows under Driver Information. Some browsers mask it for
// fingerprinting reasons; if it comes back generic, that is the browser's
// choice rather than a fault.
//
// Toggle with F, or from the console with AI.stats.toggle().
// -----------------------------------------------------------------------------

const SAMPLES = 120;

export class Stats {
  constructor(engine, root) {
    this.engine = engine;
    this.visible = false;
    this.frames = [];
    this._acc = 0;

    this.el = document.createElement('div');
    this.el.className = 'stats hidden';
    root.appendChild(this.el);

    this.gpu = this._renderer();
  }

  /** Ask WebGL what it is running on. */
  _renderer() {
    try {
      const gl = this.engine.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
      const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null;
      // Some browsers mask these for fingerprinting reasons and return
      // something that is not a string at all, so coerce rather than trust.
      const str = (x, fallback) => (typeof x === 'string' && x ? x : fallback);
      return {
        name: str(name, str(gl.getParameter(gl.RENDERER), 'masked by the browser')),
        vendor: str(vendor, str(gl.getParameter(gl.VENDOR), '')),
        version: str(gl.getParameter(gl.VERSION), ''),
      };
    } catch {
      return { name: 'unavailable', vendor: '', version: '', maxTexture: 0 };
    }
  }

  toggle() {
    this.visible = !this.visible;
    this.el.classList.toggle('hidden', !this.visible);
    return this.visible;
  }

  update(dt) {
    this.frames.push(dt);
    if (this.frames.length > SAMPLES) this.frames.shift();
    if (!this.visible) return;

    this._acc += dt;
    if (this._acc < 0.25) return;              // four refreshes a second is plenty
    this._acc = 0;

    const sorted = [...this.frames].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] || 0.016;
    const worst = sorted[Math.floor(sorted.length * 0.95)] || med;
    const info = this.engine.renderer.info;
    const s = this.engine.settings;

    // A frame budget of 16.7 ms is 60fps; 33.3 ms is 30. Colour by which side
    // of playable the median sits on, so the number needs no interpretation.
    const ms = med * 1000;
    const state = ms < 18 ? 'good' : ms < 34 ? 'fair' : 'poor';

    this.el.innerHTML = `
      <div class="stats-row stats-${state}">
        <b>${(1 / med).toFixed(0)} fps</b>
        <span>${ms.toFixed(1)} ms median · ${(worst * 1000).toFixed(1)} ms worst 5%</span>
      </div>
      <div class="stats-grid">
        <span>tier</span><b>${this.engine.tier}${this.engine.autoQuality ? '' : ' (locked)'}</b>
        <span>pixel ratio</span><b>${this.engine.renderer.getPixelRatio().toFixed(2)}</b>
        <span>draw calls</span><b>${info.render.calls}</b>
        <span>triangles</span><b>${(info.render.triangles / 1000).toFixed(0)}k</b>
        <span>shaders</span><b>${info.programs ? info.programs.length : '—'}</b>
        <span>textures</span><b>${info.memory.textures}</b>
        <span>geometries</span><b>${info.memory.geometries}</b>
        <span>shadows</span><b>${s.shadows ? `${s.shadowMap}px` : 'off'}</b>
        <span>post</span><b>${this.engine.post.enabled ? `on · ao ${s.ao}` : 'off'}</b>
        <span>lights</span><b>${s.lights} pooled</b>
      </div>
      <div class="stats-gpu">
        <div>${esc(this.gpu.name)}</div>
        <div class="stats-dim">${esc(this.gpu.vendor)} · ${esc(this.gpu.version)}</div>
      </div>
      <div class="stats-hint">F to hide · Q to change quality</div>
    `;
  }

  /** A one-line summary for pasting into a bug report. */
  summary() {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] || 0;
    const info = this.engine.renderer.info;
    return [
      `${(1 / med).toFixed(0)} fps (${(med * 1000).toFixed(1)} ms)`,
      `tier ${this.engine.tier}`,
      `dpr ${this.engine.renderer.getPixelRatio().toFixed(2)}`,
      `${info.render.calls} calls`,
      `${(info.render.triangles / 1000).toFixed(0)}k tris`,
      this.gpu.name,
    ].join(' · ');
  }
}

function esc(s) {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
