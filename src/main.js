import * as THREE from 'three';

import { Engine } from './core/Engine.js';
import { LightPool } from './core/LightPool.js';
import { Input, IS_TOUCH } from './core/Input.js';
import { TouchControls } from './core/Touch.js';

import { buildBuilding } from './world/Building.js';
import { RoomManager } from './world/RoomManager.js';
import { ROOM_BY_ID } from './world/floorplan.js';
import { whenReady } from './world/textures.js';

import { Player } from './character/Player.js';
import { Npc, NpcManager } from './character/Npc.js';
import { loadAppearance, DEFAULT_APPEARANCE } from './character/appearance.js';

import { CURATOR, MEMBERS } from './data/people.js';

import { Hud } from './ui/Hud.js';
import { Stats } from './ui/Stats.js';
import { Achievements } from './ui/Achievements.js';
import { RoomCard } from './ui/RoomCard.js';
import { InfoModal } from './ui/InfoModal.js';
import { Dialogue } from './ui/Dialogue.js';
import { Minimap } from './ui/Minimap.js';
import { Audio } from './ui/Audio.js';
import { CharacterCreator } from './ui/CharacterCreator.js';
import { Prologue } from './ui/Prologue.js';
import { ProximityManager } from './interaction/ProximityManager.js';

// -----------------------------------------------------------------------------
// main.js — assembly, in two phases.
//
// Phase one is everything cheap: the renderer, the lights, the interface, and
// the character creator. It runs in a few milliseconds, so the first thing the
// browser paints is something you can immediately use.
//
// Phase two — raising the building — costs the better part of a second and is
// deliberately deferred until after that first paint. You spend it choosing a
// face, which is exactly the right place to hide it. By the time you press
// "enter the lab" the world exists and its shaders are compiled, so the intro
// starts on the next frame instead of hanging.
// -----------------------------------------------------------------------------

const canvas = document.getElementById('scene');
const ui = document.getElementById('ui-root');
const labels = document.createElement('div');
labels.className = 'label-layer';
ui.appendChild(labels);

// =============================================================== phase one ===

const engine = new Engine(canvas);

// A bright late-morning key with a cool sky bounce behind it. The hemisphere
// carries most of the room now that the practicals are pooled, so it is warm
// above and sand-coloured below, as if light were coming back off a wooden
// floor. Between this and the stained glass in world/sunlight.js the building
// should read as an art studio with the windows open.
// Interiors are roofed against the sun now (see buildInvisibleCeilings), so the
// hemisphere carries more of the room than it did and can afford to.
const hemi = new THREE.HemisphereLight(0xfff5e4, 0xd8c9a8, 1.95);
engine.scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff2d8, 1.85);
key.position.set(26, 40, 22);
key.castShadow = true;
key.shadow.mapSize.set(engine.settings.shadowMap, engine.settings.shadowMap);
key.shadow.camera.near = 1;
key.shadow.camera.far = 110;
// The shadow camera used to cover the whole plan at +/-60 units, so even a 2048
// map was stretched over 120 units and still looked soft. It now covers only
// what the isometric camera can frame — sharper *and* a quarter of the cost.
key.shadow.camera.left = -26;
key.shadow.camera.right = 26;
key.shadow.camera.top = 26;
key.shadow.camera.bottom = -26;
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.03;
// A wide, soft contact shadow is most of what makes clean low-poly objects sit
// convincingly on a surface. It costs nothing extra with PCFSoft.
key.shadow.radius = 3.2;
engine.scene.add(key, key.target);

const fill = new THREE.DirectionalLight(0xc2dcea, 0.62);
fill.position.set(-30, 22, -26);
engine.scene.add(fill);

const audio = new Audio();
const hud = new Hud(ui);
const roomCard = new RoomCard(ui);
const modal = new InfoModal(ui);
const dialogue = new Dialogue(ui);
const creator = new CharacterCreator(ui);
const stats = new Stats(engine, ui);
const achievements = new Achievements(ui);
achievements.show(false);

hud.show(false);

let world = null;                 // filled in by phase two
let introDone = false;

// The `C` key still reopens the full creator later; it just is not the way in
// any more. The prologue owns the first run.
creator.onDone = (appearance) => {
  if (!world) return;
  world.player.setAppearance(appearance);
  world.input.enabled = true;
};

// =============================================================== phase two ===
// Two frames of breathing room: one to paint the creator, one to be sure it
// composited, and only then the expensive work.

const raise = () => {
  const building = buildBuilding();
  engine.scene.add(building.group);

  const lightPool = new LightPool(engine.scene, engine.settings.lights);
  for (const lamp of building.lamps) lightPool.register(lamp);

  const player = new Player(
    building.colliders, building.nav, loadAppearance() ?? DEFAULT_APPEARANCE);
  player.setPosition(building.spawn);
  engine.scene.add(player.group);
  engine.seedLook(building.spawn);
  engine.follow(building.spawn);

  const input = new Input(engine, building.floorMeshes);
  input.enabled = false;

  // The phone layer. Inert on a desktop — TouchControls builds nothing at all
  // unless the pointer is coarse.
  const touch = new TouchControls(engine, input, ui);
  touch.onKey = (k) => input.press(k);

  const proximity = new ProximityManager(engine, player, building.interactables, labels);
  const npcs = new NpcManager(engine, player, labels);
  const minimap = new Minimap(ui, player, null);

  // ------------------------------------------------------- achievements ---
  const READABLE = building.interactables.length;
  const HALL_EXHIBITS = building.interactables.filter((i) => i.id.startsWith('ex_')).map((i) => i.id);
  const read = new Set();
  const spoken = new Set();

  const award = (id) => { if (achievements.unlock(id)) audio.achievement(); };

  const rooms = new RoomManager(engine.scene, player, (spec, entry) => {
    award(`room_${spec.id}`);
    if (rooms.rooms.every((e) => e.visited)) award('room_all');
    hud.setRoom(spec.name, spec.accent);
    engine.setZoom(spec.id === 'lobby' ? 14.5 : spec.id === 'library' ? 15.0 : 16.6);
    if (!entry._announced) {
      entry._announced = true;
      roomCard.show(spec);
      audio.chime(spec.id === 'library' ? -5 : 4);
    }
  });
  minimap.rooms = rooms;
  minimap.show(false);

  // tapping a visited room on the map walks you there
  minimap.onTravel = (spec) => {
    if (!prologue.done || modal.open || dialogue.open) return;
    const to = new THREE.Vector3((spec.x0 + spec.x1) / 2, spec.y, (spec.z0 + spec.z1) / 2);
    const landing = building.nav.resolve(to.x, to.z, spec.y);
    if (!landing.ok) return;
    player.setPosition(new THREE.Vector3(to.x, landing.y, to.z));
    engine.seedLook(player.position);
    input.moveTarget = null;
    award('travelled');
    audio.chime(2);
  };

  const curator = npcs.add(new Npc(CURATOR));
  engine.scene.add(curator.group);
  for (const m of MEMBERS) {
    const n = npcs.add(new Npc(m));
    engine.scene.add(n.group);
  }

  // ---------------------------------------------------------- interactions --
  proximity.onActivate = (it) => {
    read.add(it.id);
    award('read_first');
    if (read.size >= 10) award('read_10');
    if (read.size >= READABLE) award('read_all');
    if (HALL_EXHIBITS.every((id) => read.has(id))) award('read_projects');
    if (dialogue.open) dialogue.close();
    modal.show(it);
    input.enabled = false;
    audio.open();
  };
  proximity.onDiscover = () => audio.discover();
  // Click anything you can see — except into a room still under its shroud.
  proximity.canActivate = (it) => {
    const entry = rooms.rooms.find((e) => e.spec.id === it.room);
    return !entry || entry.visited;
  };
  modal.onClose = () => { input.enabled = true; audio.close(); };

  npcs.onTalk = (npc) => {
    spoken.add(npc.id);
    award('talk_first');
    if (spoken.size >= npcs.npcs.length) award('talk_all');
    if (modal.open) modal.close();
    npc.talking = true;
    dialogue.start(npc.spec);
    input.enabled = false;
    audio.open();
  };
  dialogue.onClose = () => {
    for (const n of npcs.npcs) n.talking = false;
    input.enabled = true;
    audio.close();
  };

  player.onFootstep = () => audio.footstep();

  input.onObjectClick((pointer) => proximity.tryClick(pointer) || npcs.tryClick(pointer));

  const nearestObjectDistance = () => (proximity.nearest
    ? proximity.nearest.anchor.distanceTo(player.position) : Infinity);

  input.onKey('e', () => {
    if (!input.enabled) return;
    const objD = nearestObjectDistance();
    const npcD = npcs.nearestDistance();
    if (objD === Infinity && npcD === Infinity) return;
    if (npcD < objD) npcs.talkNearest(); else proximity.activateNearest();
  });

  input.onKey('c', () => {
    if (modal.open || dialogue.open) return;
    if (prologue.done) award('restyled');
    input.enabled = false;
    creator.open();
  });

  input.onKey('m', () => minimap.toggle());
  input.onKey('p', () => engine.post.toggle());
  input.onKey('n', () => audio.toggle());
  input.onKey('f', () => stats.toggle());

  // Manual quality override. The engine adapts on its own, but on a slow
  // machine waiting for it to notice is its own kind of bad — so let people
  // just pick, and stop second-guessing them once they have.
  const TIERS = ['low', 'medium', 'high'];
  input.onKey('q', () => {
    const next = TIERS[(TIERS.indexOf(engine.tier) + 1) % TIERS.length];
    engine.autoQuality = false;
    engine.setTier(next);
    lightPool.setCount(engine.settings.lights);
    hud.setQuality(next, true);
  });

    engine.onTierChange = (name, s) => {
    lightPool.setCount(s.lights);
    hud.setQuality(name);
    if (key.shadow.mapSize.width !== s.shadowMap) {
      key.shadow.mapSize.set(s.shadowMap, s.shadowMap);
      key.shadow.map?.dispose();
      key.shadow.map = null;                 // forces a re-allocation at the new size
    }
  };

  touch.onAction = () => { if (input.enabled) input.press('e'); };

  // ------------------------------------------------------------ prologue ---
  // The way in. It owns the camera, the player and the interface until the
  // moment you have read the sign outside the door; `C` reopens the full
  // creator afterwards, but it is no longer the first thing anyone sees.
  const prologue = new Prologue({ engine, player, input, root: ui, hud, audio });

  // Hold the quality tier still until the arrival is over. A demotion
  // reallocates the render target and the shadow map, which costs a frame or
  // two — invisible during play, very visible in the middle of a set piece.
  engine.autoQuality = false;

  prologue.onFinish = () => {
    introDone = true;
    input.enabled = true;
    hud.show(true);
    minimap.show(!IS_TOUCH);      // a 260px map is most of a phone screen
    touch.show(true);
    achievements.show(true);
    hud.setQuality(engine.tier);
    engine.autoQuality = true;
    const here = rooms.roomAt(player.position);
    if (here) hud.setRoom(here.spec.name, here.spec.accent);
  };

  // Reading the welcome sign is what ends the tutorial — the sign is a real
  // interactable, so the action that finishes the prologue is the same one the
  // rest of the building uses.
  const baseActivate = proximity.onActivate;
  proximity.onActivate = (it) => {
    baseActivate(it);
    if (it.id === 'welcome') { award('arrived'); prologue.signRead(); }
  };

  // ----------------------------------------------------------------- tick ---
  const look = new THREE.Vector3();

  engine.onTick((dt) => {
    if (!prologue.done) prologue.update(dt);

    // While the prologue is posing the visitor, it is the only thing allowed to
    // touch them — otherwise Player.update eases their height back toward its
    // own target and animates the figure on a second clock, and the two fight
    // every frame.
    if (!prologue.ownsPlayer) player.update(dt, input);
    building.tick(dt, player.position);
    building.cutaway.update(dt, player.position);
    rooms.update(dt);
    lightPool.update(dt, player.position);
    proximity.update(dt);
    npcs.update(dt);
    minimap.update(dt);
    stats.update(dt);

    if (introDone && !modal.open && !dialogue.open) {
      const objD = nearestObjectDistance();
      const npcD = npcs.nearestDistance();
      if (npcD < objD && npcs.nearest) {
        hud.setPrompt(`talk to ${npcs.nearest.name}`, npcs.nearest.spec.accent);
        touch.setTarget(npcs.nearest.name, 'npc', npcs.nearest.spec.accent);
      } else if (proximity.nearest) {
        hud.setPrompt(proximity.nearest.title, proximity.nearest.color);
        touch.setTarget(proximity.nearest.title, 'object', proximity.nearest.color);
      } else { hud.setPrompt(null); touch.setTarget(null); }
    } else { hud.setPrompt(null); touch.setTarget(null); }

    // the camera looks slightly ahead of you, which reads as intent
    look.copy(player.position);
    look.y += 1.4;
    engine.follow(look);

    // keep the sun tracking the player so shadows stay crisp across a big plan
    key.position.set(player.position.x + 26, 40, player.position.z + 22);
    key.target.position.copy(player.position);
    key.target.updateMatrixWorld();
  });

  world = { building, player, input, proximity, npcs, rooms, minimap, lightPool };
  window.AI = { engine, stats, prologue, achievements, ...world };

  // Compile every shader before anything moves. The prologue opens on a held
  // camera looking down the road, which is the one moment in the whole
  // experience where a pause costs nothing.
  // Nothing is drawn until the textures are in.
  //
  // The building is finished the moment buildBuilding() returns, but its
  // texture files arrive whenever the network manages it — so starting here
  // meant the opening seconds were spent watching untextured surfaces turn into
  // wood, and the reveal circle opening onto a scene that was still assembling
  // itself read as a black screen with things happening in it.
  //
  // whenReady() has its own timeout, so a missing or slow file delays the start
  // but can never prevent it.
  const boot = document.createElement('div');
  boot.className = 'booting';
  boot.innerHTML = `<div class="booting-mark">Analogue Intelligence</div>
    <div class="booting-bar"><span></span></div>`;
  ui.appendChild(boot);
  requestAnimationFrame(() => boot.classList.add('on'));

  // The loop runs straight away, behind the hold. Shaders compile, the first
  // frames get drawn and thrown away, and the overlay covers all of it — so by
  // the time the textures land everything is warm and the prologue opens on a
  // scene that is already finished rather than one still assembling itself.
  engine.precompile();
  engine.start();

  whenReady(4000).then(() => {
    prologue.start(loadAppearance() ?? { ...DEFAULT_APPEARANCE });
    boot.classList.remove('on');
    setTimeout(() => boot.remove(), 600);
  });
};

requestAnimationFrame(() => requestAnimationFrame(() => raise()));
