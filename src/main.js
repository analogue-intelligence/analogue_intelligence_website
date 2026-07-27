import * as THREE from 'three';

import { Engine } from './core/Engine.js';
import { LightPool } from './core/LightPool.js';
import { Input } from './core/Input.js';

import { buildBuilding } from './world/Building.js';
import { RoomManager } from './world/RoomManager.js';
import { ROOM_BY_ID } from './world/floorplan.js';

import { Player } from './character/Player.js';
import { Npc, NpcManager } from './character/Npc.js';
import { loadAppearance, DEFAULT_APPEARANCE } from './character/appearance.js';

import { CURATOR, MEMBERS } from './data/people.js';

import { Hud } from './ui/Hud.js';
import { RoomCard } from './ui/RoomCard.js';
import { InfoModal } from './ui/InfoModal.js';
import { Dialogue } from './ui/Dialogue.js';
import { Minimap } from './ui/Minimap.js';
import { Intro } from './ui/Intro.js';
import { Audio } from './ui/Audio.js';
import { CharacterCreator } from './ui/CharacterCreator.js';
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
const hemi = new THREE.HemisphereLight(0xfff1d6, 0xc0ab8c, 1.9);
engine.scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff0d2, 2.5);
key.position.set(26, 40, 22);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
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
engine.scene.add(key, key.target);

const fill = new THREE.DirectionalLight(0xa9cbe0, 0.62);
fill.position.set(-30, 22, -26);
engine.scene.add(fill);

const audio = new Audio();
const hud = new Hud(ui);
const roomCard = new RoomCard(ui);
const modal = new InfoModal(ui);
const dialogue = new Dialogue(ui);
const creator = new CharacterCreator(ui);
const intro = new Intro(engine, ui);

hud.show(false);
creator.open();

let world = null;                 // filled in by phase two
let introDone = false;
let pendingAppearance = null;     // set if you finish the creator before we do

creator.onDone = (appearance) => {
  if (!world) { pendingAppearance = appearance; return; }
  world.player.setAppearance(appearance);
  if (!introDone) intro.play(); else world.input.enabled = true;
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

  const proximity = new ProximityManager(engine, player, building.interactables, labels);
  const npcs = new NpcManager(engine, player, labels);
  const minimap = new Minimap(ui, player, null);

  const rooms = new RoomManager(engine.scene, player, (spec, entry) => {
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

  const curator = npcs.add(new Npc(CURATOR));
  engine.scene.add(curator.group);
  for (const m of MEMBERS) {
    const n = npcs.add(new Npc(m));
    engine.scene.add(n.group);
  }

  // ---------------------------------------------------------- interactions --
  proximity.onActivate = (it) => {
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
    input.enabled = false;
    creator.open();
  });

  input.onKey('m', () => minimap.toggle());
  input.onKey('p', () => engine.post.toggle());
  input.onKey('n', () => audio.toggle());

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

  engine.onTierChange = (name, s) => { lightPool.setCount(s.lights); hud.setQuality(name); };

  intro.onFinish = () => {
    introDone = true;
    input.enabled = true;
    player.reveal();
    hud.show(true);
    minimap.show(true);
    const lobby = ROOM_BY_ID.lobby;
    hud.setRoom(lobby.name, lobby.accent);
    hud.setQuality(engine.tier);
    audio.door();
  };

  // ----------------------------------------------------------------- tick ---
  const look = new THREE.Vector3();

  engine.onTick((dt) => {
    if (!intro.done) intro.update(dt);

    player.update(dt, input);
    building.tick(dt, player.position);
    building.cutaway.update(dt, player.position);
    rooms.update(dt);
    lightPool.update(dt, player.position);
    proximity.update(dt);
    npcs.update(dt);
    minimap.update(dt);

    if (introDone && !modal.open && !dialogue.open) {
      const objD = nearestObjectDistance();
      const npcD = npcs.nearestDistance();
      if (npcD < objD && npcs.nearest) {
        hud.setPrompt(`talk to ${npcs.nearest.name}`, npcs.nearest.spec.accent);
      } else if (proximity.nearest) {
        hud.setPrompt(proximity.nearest.title, proximity.nearest.color);
      } else hud.setPrompt(null);
    } else hud.setPrompt(null);

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
  window.AI = { engine, ...world };

  // Compile every shader while the creator is still up. This is the pause that
  // used to land the instant you pressed "enter the lab".
  engine.precompile();
  engine.start();

  if (pendingAppearance) {
    player.setAppearance(pendingAppearance);
    pendingAppearance = null;
    intro.play();
  }
};

requestAnimationFrame(() => requestAnimationFrame(() => raise()));
