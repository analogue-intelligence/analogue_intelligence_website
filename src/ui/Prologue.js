import * as THREE from 'three';
import { TITLE, SUBTITLE } from '../data/content.js';
import { buildAppearanceControls, randomiseAppearance } from './appearanceControls.js';
import { saveAppearance } from '../character/appearance.js';
import { ROAD } from '../world/road.js';

// -----------------------------------------------------------------------------
// Prologue.js — arriving.
//
// The old opening was two disconnected pieces: a full-screen character creator
// with its own WebGL context, and then a camera flight through the front door.
// It read as a settings page followed by a cutscene, and nothing you did in the
// first had any visible bearing on the second.
//
// This is one continuous shot. You are assembled floating above a road, in the
// real scene, lit by the real sun; the options appear around you one at a time;
// when you are done you drop onto the road and the camera swings round to show
// you where you are going. Then you walk there yourself, learning the controls
// on the way, and the last thing you do before going in is read a sign — which
// is the same action you will use on every exhibit inside.
//
// Nothing here is a special case: it is the real player, the real interaction
// system and the real camera throughout. The only borrowed machinery is the
// perspective camera the engine already keeps for cinematics, and the blend
// back to the isometric play camera, which is the same trick the old arrival
// used — a long lens at ninety units frames almost exactly what the
// orthographic camera frames, so the swap cannot be seen.
//
// Every phase can be skipped, and `finish()` is idempotent: whatever happens,
// the player ends up standing on the road able to walk.
// -----------------------------------------------------------------------------

// Low enough to read as hovering rather than flying. At 3.3 the visitor was up
// near the lamp heads and the drop felt like a fall from a roof.
const FLOAT_Y = 1.55;
const LAND_MS = 1800;

export class Prologue {
  constructor({ engine, player, input, root, hud, audio }) {
    this.engine = engine;
    this.player = player;
    this.input = input;
    this.hud = hud;
    this.audio = audio;

    this.phase = 'idle';
    this.done = false;
    this.onFinish = () => {};
    this._t = 0;
    this._walked = 0;
    this._last = new THREE.Vector3();

    this.el = document.createElement('div');
    this.el.className = 'prologue';
    this.el.innerHTML = `
      <div class="pro-title">
        <div class="pro-title-main">${TITLE}</div>
        <div class="pro-title-sub">${SUBTITLE}</div>
      </div>

      <div class="pro-panel">
        <div class="pro-kicker">Before you go in</div>
        <h1 class="pro-heading">Who are you today?</h1>
        <div class="pro-controls"></div>
        <div class="pro-actions">
          <button class="pro-random">Surprise me</button>
          <button class="pro-go">I'm ready →</button>
        </div>
      </div>

      <button class="pro-boot">
        <span class="pro-boot-ring"></span>
        <span class="pro-boot-label">click to start</span>
      </button>
      <div class="pro-turn">drag to turn</div>
      <div class="pro-tut"><span class="pro-tut-text"></span></div>
      <button class="pro-skip">skip →</button>
    `;
    root.appendChild(this.el);

    this.titleEl = this.el.querySelector('.pro-title');
    this.panelEl = this.el.querySelector('.pro-panel');
    this.tutEl = this.el.querySelector('.pro-tut');
    this.turnEl = this.el.querySelector('.pro-turn');
    this.bootEl = this.el.querySelector('.pro-boot');
    this.bootEl.addEventListener('click', () => this._begin());
    this.tutText = this.el.querySelector('.pro-tut-text');

    this.el.querySelector('.pro-skip').addEventListener('click', () => this.skip());
    this.el.querySelector('.pro-go').addEventListener('click', () => this._drop());
    this.el.querySelector('.pro-random').addEventListener('click', () => {
      randomiseAppearance(this.appearance);
      this.controls.sync();
      this._rebuild();
    });

    this._camPos = new THREE.Vector3();
    this._camLook = new THREE.Vector3();

    // You turn the figure, the camera does not turn around you. An orbiting
    // camera swung the building into shot behind the character, which gave the
    // ending away and made the road stop reading as a road.
    this.spin = Math.PI;          // facing the camera to begin with
    this.spinVel = 0;

    // How much of the world is visible, in screen heights. The world is built
    // and lit from the first frame; this is the only thing hiding it.
    this.reveal = 0.0;
    this.revealTarget = 0.0;
    this._revealC = new THREE.Vector3();
    this._bindDrag();
  }

  /**
   * True while the prologue is posing the visitor itself.
   *
   * Player.update() runs every frame from the main tick: it eases `position.y`
   * toward its own `_targetY` and calls `figure.animate()` on its own clock. So
   * while the prologue was also setting y and animating on a *different* clock,
   * the two fought each frame — which is the trembling. Nobody should be
   * driving the same object twice.
   */
  get ownsPlayer() {
    return !this.done
      && ['boot', 'title', 'reveal', 'create', 'drop'].includes(this.phase);
  }

  /** The middle of the figure — what the camera looks at and the reveal centres on. */
  focusY() { return this.player.group.position.y + 1.5 * (this.appearance?.height ?? 1); }

  // ---------------------------------------------------------------- start --
  start(appearance) {
    this.appearance = appearance;
    this.phase = 'boot';
    this._t = 0;
    this.reveal = 0.0;
    this.revealTarget = 0.26;

    this.engine.cinematic = true;
    this.engine.introCam.fov = 46;
    this.engine.introCam.updateProjectionMatrix();

    // stand the visitor on the road, floating, facing the camera
    this.player.setPosition(new THREE.Vector3(ROAD.x, FLOAT_Y, ROAD.spawn));
    this.player.group.rotation.y = Math.PI;      // facing whoever is watching
    this.player.revealed = false;
    this.player.group.scale.setScalar(0.001);
    this.input.enabled = false;

    this.el.classList.add('on');

    // Put the camera on its mark before the first frame is ever drawn. The old
    // opening rendered a few frames of the building from wherever the camera
    // happened to be initialised, then snapped — which is the "it shows the
    // building oddly and then loads" everyone noticed.
    // Far enough back that the whole figure sits inside a small circle, and
    // aimed at its middle rather than its feet — the camera was looking at
    // FLOAT_Y, which put the head out of frame above.
    this._camPos.set(0, FLOAT_Y + 1.5, ROAD.spawn - 11.0);
    this._camLook.set(0, FLOAT_Y + 1.5, ROAD.spawn);
    this.engine.setCam(this._camPos, this._camLook);
    this.player.group.scale.setScalar(1);
    this.player.revealed = true;
    this.engine.post?.setReveal?.(0.5, 0.5, 0.0, 0.1);

    this.controls = buildAppearanceControls(
      this.el.querySelector('.pro-controls'),
      this.appearance,
      () => this._rebuild(),
      { stagger: true });
  }

  /** Drag anywhere on the canvas to rotate the figure, with a little inertia. */
  _bindDrag() {
    const canvas = this.engine.canvas;
    let id = null, lastX = 0;
    const down = (e) => {
      if (this.phase !== 'create') return;
      id = e.pointerId; lastX = e.clientX; this.spinVel = 0;
      this.turnEl.classList.remove('on');
    };
    const move = (e) => {
      if (e.pointerId !== id || this.phase !== 'create') return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      this.spin += dx * 0.011;
      this.spinVel = dx * 0.08;
    };
    const up = (e) => { if (e.pointerId === id) id = null; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  /** The one deliberate act before anything moves. */
  _begin() {
    if (this.phase !== 'boot') return;
    this.phase = 'title';
    this._t = 0;
    this.revealTarget = 0.40;
    this.bootEl.classList.remove('on');
    this.titleEl.classList.add('on');
    this.audio?.init?.();
    this.audio?.chime?.(4);
  }

  _rebuild() {
    this.player.setAppearance(this.appearance);
    // setAppearance rebuilds the mesh, so restore whatever the phase implies
    this.player.group.scale.setScalar(this.phase === 'title' ? 0.001 : 1);
  }

  /** Reveal the option groups one at a time, so the character assembles. */
  _revealControls() {
    this.panelEl.classList.add('on');
    this.controls.groups.forEach((g, i) => {
      setTimeout(() => g.classList.remove('ap-pending'), 260 + i * 190);
    });
    setTimeout(() => this.el.querySelector('.pro-actions').classList.add('on'),
      260 + this.controls.groups.length * 190);
  }

  // ----------------------------------------------------------------- drop --
  _drop() {
    if (this.phase !== 'create') return;
    this.phase = 'drop';
    this._t = 0;
    this.revealTarget = 5.0;        // the world opens out as they land
    saveAppearance(this.appearance);
    this.panelEl.classList.remove('on');
    this.turnEl.classList.remove('on');
    this.audio?.click?.();
  }

  _land() {
    this.phase = 'walk';
    this._t = 0;
    this._walked = 0;
    this._last.copy(this.player.position);
    this.player.setPosition(new THREE.Vector3(ROAD.x, 0, ROAD.spawn));
    this.player.revealed = true;
    this.input.enabled = true;

    // Open the reveal *before* the camera changes, not after.
    //
    // The circle's centre is found by projecting the visitor through whichever
    // camera is live. Switching from the perspective camera to the orthographic
    // one moves that projection a long way in a single frame, so if the circle
    // were still closing it would jump right across the screen and black out
    // most of the frame — the flash at the end of the arrival.
    this.reveal = this.revealTarget = 9.0;
    this.engine.post?.clearReveal?.();

    this.engine.cinematic = false;
    this.engine.seedLook(this.player.position);
    this.audio?.door?.();
    // Both, always. Deciding by `pointer: coarse` got this wrong on every
    // touchscreen laptop, which is most of them — people were shown the phone
    // instructions while sitting at a keyboard.
    this._tut('<b>W A S D</b> or the <b>arrow keys</b> to walk'
      + '<i class="pro-alt">on a phone, drag your thumb on the left of the screen</i>');
  }

  _tut(html) {
    this.tutText.innerHTML = html;
    this.tutEl.classList.remove('on'); void this.tutEl.offsetWidth;
    this.tutEl.classList.add('on');
  }

  // ---------------------------------------------------------------- update --
  update(dt) {
    if (this.done) return;
    this._t += dt;
    this._driveReveal(dt);

    switch (this.phase) {
      case 'boot': return this._boot(dt);
      case 'title': return this._title(dt);
      case 'reveal': return this._reveal(dt);
      case 'create': return this._create(dt);
      case 'drop': return this._dropping(dt);
      case 'walk': return this._walking(dt);
      case 'approach': return this._approaching(dt);
      default: return undefined;
    }
  }

  /**
   * Ease the visible radius toward its target, centred on the visitor's own
   * position on screen so the circle follows them rather than the frame.
   */
  _driveReveal(dt) {
    if (this.reveal > 3.9 && this.revealTarget > 3.9) return;   // fully open
    this.reveal += (this.revealTarget - this.reveal) * Math.min(dt * 2.1, 1);

    this._revealC.copy(this.player.position);
    this._revealC.y = this.focusY();
    const s = this.engine.project(this._revealC);
    const cx = s.x / window.innerWidth;
    const cy = s.y / window.innerHeight;
    const soft = 0.10 + this.reveal * 0.22;
    this.engine.post?.setReveal?.(cx, cy, this.reveal, soft);
    if (this.reveal > 3.9) this.engine.post?.clearReveal?.();
  }

  /** Waiting to be started. Nothing but a person in the dark. */
  _boot(dt) {
    this.player.group.position.y = FLOAT_Y + Math.sin(this._t * 0.5) * 0.045;
    this.player.group.rotation.y = this.spin;
    this.player.figure.animate(this._t, false);
    if (this._t > 0.6) this.bootEl.classList.add('on');
  }

  /** Looking down the road at nothing in particular, while the name lands. */
  _title(dt) {
    const k = Math.min(this._t / 2.4, 1);
    const e = k * k * (3 - 2 * k);
    // closing in, and staying dead centre on the figure the whole way
    const d = 11.0 - e * 3.4;
    this._camPos.set(0, this.focusY(), ROAD.spawn - d);
    this._camLook.set(0, this.focusY(), ROAD.spawn);
    this.engine.setCam(this._camPos, this._camLook);

    if (k >= 1) {
      this.phase = 'reveal';
      this._t = 0;
      this.revealTarget = 0.52;
      this.titleEl.classList.remove('on');
      this.player.reveal();
      this.audio?.chime?.(4);
    }
  }

  /** The camera turns onto the visitor as they fade in, floating. */
  _reveal(dt) {
    const k = Math.min(this._t / 1.5, 1);
    const e = k * k * (3 - 2 * k);
    const d = 7.6 - e * 0.5;
    this._camPos.set(0, this.focusY(), ROAD.spawn - d);
    this._camLook.set(0, this.focusY(), ROAD.spawn);
    this.engine.setCam(this._camPos, this._camLook);

    if (k >= 1) {
      this.phase = 'create';
      this._t = 0;
      this.revealTarget = 0.60;
      this._revealControls();
      setTimeout(() => this.turnEl.classList.add('on'), 1400);
    }
  }

  /**
   * Held still. The camera stands between the building and the visitor, looking
   * back down the empty road — so the building is behind the camera and out of
   * shot, and what you see past your character is open country and horizon.
   * Nothing about where you are going is revealed until you land and turn round.
   */
  _create(dt) {
    this.player.group.position.y = FLOAT_Y + Math.sin(this._t * 0.5) * 0.045;
    this.player.figure.animate(this._t, false);

    // whatever the drag left behind, easing to a stop
    this.spinVel *= Math.pow(0.02, dt);
    this.spin += this.spinVel * dt;
    this.player.group.rotation.y = this.spin;

    // a very slight breathing of the framing, so it is held rather than frozen
    const fy = this.focusY();
    this._camPos.set(0, fy + Math.sin(this._t * 0.3) * 0.03, ROAD.spawn - 7.1);
    this._camLook.set(0, fy, ROAD.spawn);
    this.engine.setCam(this._camPos, this._camLook);
  }

  /** Gravity, a landing, and the building revealed behind you. */
  _dropping(dt) {
    const k = Math.min(this._t / (LAND_MS / 1000), 1);

    // fall on an ease-in, then a short squash and a settle
    const fall = Math.min(k / 0.40, 1);
    const y = FLOAT_Y * (1 - fall * fall);
    this.player.group.position.y = Math.max(0, y);
    this.player.group.rotation.y +=
      ((Math.PI - this.player.group.rotation.y) % (Math.PI * 2)) * Math.min(dt * 2.4, 1);

    if (k > 0.40) {
      const b = (k - 0.40) / 0.60;
      const squash = Math.max(0, Math.sin(b * Math.PI * 2) * 0.12 * (1 - b));
      this.player.group.scale.set(1 + squash, 1 - squash, 1 + squash);
      if (!this._thud) { this._thud = true; this.audio?.footstep?.(); }
    }

    // the camera climbs onto the isometric axis and turns to face the building
    const e = k * k * (3 - 2 * k);
    const iso = new THREE.Vector3(30, 34, 30).normalize().multiplyScalar(90);
    this._camPos.lerpVectors(
      new THREE.Vector3(0, FLOAT_Y + 1.5, ROAD.spawn - 7.1),
      new THREE.Vector3(iso.x, iso.y, ROAD.spawn + iso.z), e);
    this._camLook.lerpVectors(
      new THREE.Vector3(0, FLOAT_Y - 0.2, ROAD.spawn),
      new THREE.Vector3(0, 1.4, ROAD.spawn), e);
    const fov = 46 + (19.6 - 46) * e;
    if (Math.abs(this.engine.introCam.fov - fov) > 0.01) {
      this.engine.introCam.fov = fov;
      this.engine.introCam.updateProjectionMatrix();
    }
    this.engine.setCam(this._camPos, this._camLook);

    // and make sure it is wide open by the time we get there anyway
    if (k > 0.72) this.revealTarget = 9.0;

    if (k >= 1) {
      this.player.group.scale.setScalar(1);
      this._land();
    }
  }

  /** Learning to walk. The prompt clears itself once you have. */
  _walking(dt) {
    const moved = this.player.position.distanceTo(this._last);
    this._last.copy(this.player.position);
    this._walked += moved;

    if (this._walked > 5) {
      this.phase = 'approach';
      this._t = 0;
      this._tut('Follow the path to the building');
    }
  }

  /** Nearly there — hand over once the sign is in reach. */
  _approaching(dt) {
    const d = Math.abs(this.player.position.z - ROAD.signZ);
    if (d < 7 && this._t > 0.5) {
      this._tut('Press <b>E</b>, or click the label, to read the sign'
        + '<i class="pro-alt">on a phone, tap the sign or use the button</i>');
      this.phase = 'sign';
      setTimeout(() => this.finish(), 9000);       // never trap anyone here
    }
  }

  /** Called by main when the welcome sign is actually read. */
  signRead() {
    if (this.phase === 'sign') this.finish();
  }

  // ---------------------------------------------------------------- exits --
  skip() {
    if (this.done) return;
    this.reveal = this.revealTarget = 9.0;
    this.engine.post?.clearReveal?.();
    this.player.setPosition(new THREE.Vector3(ROAD.x, 0, ROAD.near + 2));
    this.player.group.scale.setScalar(1);
    this.player.revealed = true;
    this.engine.cinematic = false;
    this.engine.seedLook(this.player.position);
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.engine.post?.clearReveal?.();
    // skip() can be called before start(), in which case there is nothing to
    // remember and saveAppearance must not be handed undefined
    if (!this.appearance) this.appearance = null;
    this.phase = 'done';
    this.input.enabled = true;
    this.engine.cinematic = false;
    this.player.revealed = true;
    this.player.group.scale.setScalar(1);
    if (this.appearance) saveAppearance(this.appearance);
    this.el.classList.remove('on');
    this.tutEl.classList.remove('on');
    setTimeout(() => this.el.remove(), 900);
    this.onFinish();
  }
}
