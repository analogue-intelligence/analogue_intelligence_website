// -----------------------------------------------------------------------------
// Audio — everything is synthesised at runtime; there are no sound files.
//
// A low ambient drone (two detuned sines with a slow tremolo, plus filtered
// noise for air) sets the room tone; footsteps, reveal chimes and UI clicks are
// short synthesised events. All defensive: if WebAudio is unavailable it
// silently no-ops.
//
// This is the original sound design from the single-room build, kept intact —
// the drone is what makes the place feel like an interior rather than a void.
// The only additions are a door thunk and the small aliases the newer UI calls.
// -----------------------------------------------------------------------------
export class Audio {
  constructor() {
    this.ready = false;
    this.muted = false;
    this.ctx = null;
    this.master = null;
    this._noiseBuf = null;

    // Autoplay policy: nothing may exist until the first gesture.
    const boot = () => { this.init(); window.removeEventListener('pointerdown', boot); };
    window.addEventListener('pointerdown', boot);
  }

  init() {
    if (this.ready) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);
      this._noiseBuf = this._makeNoise();
      this._startDrone();
      // fade the room tone in gently
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 1.5);
      this.ready = true;
    } catch (e) { /* no audio; ignore */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ready) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.2);
    return this.muted;
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startDrone() {
    const now = this.ctx.currentTime;
    // two detuned low sines (root + fifth)
    [55, 82.4].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = i === 0 ? 0.16 : 0.09;
      // slow tremolo
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.03;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(this.master);
      osc.start(now); lfo.start(now);
    });
    // filtered noise "air"
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
    const ng = this.ctx.createGain(); ng.gain.value = 0.05;
    src.connect(lp).connect(ng).connect(this.master);
    src.start(now);
  }

  // A short percussive tick for a footstep.
  footstep() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 180 + Math.random() * 60; bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(bp).connect(g).connect(this.master);
    src.start(now); src.stop(now + 0.14);
  }

  // A soft bell when an object is revealed; pitch varies to feel distinct.
  chime(semitoneOffset = 0) {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const base = 523.25 * Math.pow(2, semitoneOffset / 12); // C5 * offset
    [1, 2.01].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i ? 'sine' : 'triangle';
      osc.frequency.value = base * mult;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(i ? 0.05 : 0.12, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(g).connect(this.master);
      osc.start(now); osc.stop(now + 1.0);
    });
  }

  // A tiny click for opening panels / buttons.
  click() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square'; osc.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g).connect(this.master);
    osc.start(now); osc.stop(now + 0.07);
  }

  // The front door closing behind you — same idiom, one octave under the drone.
  door() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.32);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g).connect(this.master);
    osc.start(now); osc.stop(now + 0.42);
  }

  // ---- names the newer interface calls, mapped onto the original voices ----
  discover() { this.chime(7); }
  open() { this.click(); }
  close() { this.click(); }
  toggle() { return !this.toggleMute(); }
}
