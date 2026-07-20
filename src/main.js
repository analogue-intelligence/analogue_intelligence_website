import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { buildRoom } from './world/Room.js';
import { Player } from './character/Player.js';
import { Guide } from './character/Guide.js';
import { ProximityManager } from './interaction/ProximityManager.js';
import { playIntro } from './ui/Intro.js';
import { Hud } from './ui/Hud.js';
import { InfoModal } from './ui/InfoModal.js';
import { Dialogue } from './ui/Dialogue.js';
import { Audio } from './ui/Audio.js';
import { Minimap } from './ui/Minimap.js';

// -----------------------------------------------------------------------------
// main.js — sunlit antique-library build. Boots the engine, lights the room for
// daylight, builds the world, and wires input → player → interaction → UI →
// audio. The intro is a cinematic door-entry; the Curator is click-to-talk.
// -----------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');
const engine = new Engine(canvas);

// ---- daylight rig ----
engine.scene.add(new THREE.HemisphereLight(0xeef3f6, 0x8a7a5c, 1.0));
engine.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
const sun = new THREE.DirectionalLight(0xfff2d2, 1.7);
sun.position.set(-16, 24, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0005;
engine.scene.add(sun);
engine.scene.add(sun.target);

// ---- world ----
const room = buildRoom();
engine.scene.add(room.group);

const player = new Player(room.colliders, room.levels);
player.setPosition(room.spawn);
engine.scene.add(player.group);

const guide = new Guide(room.guidePos);
engine.scene.add(guide.group);

// ---- input + UI + audio ----
const input = new Input(engine, room.floorMesh);
input.enabled = false;                       // locked during the intro
const hud = new Hud(uiRoot);
const modal = new InfoModal(uiRoot);
const dialogue = new Dialogue(uiRoot);
const audio = new Audio();
const proximity = new ProximityManager(engine, player, room.interactables, hud.labelLayer);
const minimap = new Minimap(uiRoot, room, player, guide, proximity.revealRadius);

const CHIME = { vision: 0, software: 3, ai: 5, robotics: 7, creative: 10, contact: 12 };
function panelOpen() { return modal.isOpen || dialogue.isOpen; }
let guideActive = false;

// object interaction
proximity.onActivate = (it) => { if (!panelOpen()) { modal.open(it); audio.click(); } };
proximity.onDiscover = (it) => { hud.toast(it.content.title, it.color); audio.chime(CHIME[it.content.category] ?? 0); };

// click order: NPC first, then objects, else move
const rc = new THREE.Raycaster();
input.onObjectClick((pointer) => {
  if (!guideActive || panelOpen()) return false;
  rc.setFromCamera(pointer, engine.camera);
  if (rc.intersectObjects(guide.hitTargets, false)[0]) { dialogue.open(); audio.click(); return true; }
  return false;
});
input.onObjectClick((pointer) => proximity.tryClick(pointer));

// Curator marker click
hud.guideMarker.addEventListener('click', () => { if (!panelOpen()) { dialogue.open(); audio.click(); } });

// footsteps + mute
player.onFootstep = () => audio.footstep();
hud.muteBtn.addEventListener('click', () => { audio.init(); hud.setMuted(audio.toggleMute()); });
const startAudio = () => { audio.init(); window.removeEventListener('pointerdown', startAudio); window.removeEventListener('keydown', startAudio); };
window.addEventListener('pointerdown', startAudio);
window.addEventListener('keydown', startAudio);

// ---- per-frame ----
const gv = new THREE.Vector3();
engine.onTick((dt) => {
  if (!panelOpen()) player.update(dt, input);
  engine.follow(player.position);
  guide.update(dt);
  if (player.revealed) proximity.update(dt);
  room.tick(dt);
  minimap.draw();

  // project the guide's anchor to place the "Talk" marker
  gv.copy(guide.anchor).project(engine.camera);
  const sx = (gv.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-gv.y * 0.5 + 0.5) * window.innerHeight;
  hud.updateGuideMarker(sx, sy, gv.z < 1, guideActive && !panelOpen());
});

engine.start();

// ---- boot: cinematic intro, then unlock ----
playIntro(engine, { door: room.door, player, camOffset: engine.camOffset, root: uiRoot }).then(() => {
  input.enabled = true;
  guideActive = true;
  hud.hint.classList.remove('pre');
  hud.fadeHintAfter(11000);
});
