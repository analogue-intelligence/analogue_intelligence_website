# Analogue Intelligence

An explorable building for the Analogue Intelligence research group. Five rooms
over two storeys: a coffee lobby you arrive in, a hall of projects on plinths, a
robotics lab, a creative studio, and a library up the stairs. You make a
character, walk around with the keyboard, and read things by standing next to
them.

No build step. No bundler. It is a folder of ES modules, a stylesheet and a
directory of baked PNG textures.

---

## Running it

Because it uses ES modules and an import map, it has to be served over HTTP —
opening `index.html` from the filesystem will fail on CORS.

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

Any static server works: `npx serve`, `php -S localhost:5173`, GitHub Pages.
For Pages, push the whole folder to a repo and point Pages at the branch root.

Three.js is loaded from jsDelivr via the import map in `index.html`. To vendor
it instead, drop `three.module.js` into `vendor/` and change the map to point at
`./vendor/three.module.js`.

## Controls

| | |
|---|---|
| `W A S D` / arrow keys | walk |
| click the floor | walk there |
| `E` | read the nearest object, or talk to the nearest person |
| click an object or person | same |
| `C` | change your character (reopens the mirror) |
| `M` | toggle the map |
| `Q` | cycle quality: low / medium / high |
| `P` | toggle the painted post-processing |
| `N` | mute |
| `Esc` | close a panel |

---

## How it fits together

```
index.html                 fonts, import map, canvas
src/main.js                assembly and the tick loop — start reading here

src/core/
  Engine.js                renderer, isometric follow-camera, intro camera, clock
  Input.js                 WASD + arrows, click-to-move, one-shot key bus
  Postprocess.js           the painted look: ink edges, brush tooth, split-tone

src/world/
  floorplan.js             ← THE BUILDING. rooms, walls, doors, platforms, stairs
  Building.js              reads the floorplan and raises the shell
  RoomManager.js           the dark-until-entered shrouds and the room signs
  Nav.js                   "if I stand here, how high am I, and is that allowed?"
  Cutaway.js               fades near walls so you can see in
  Door.js                  hinged doors that swing open as you approach
  Ctx.js                   the handle each room builder is given
  props.js                 tables, shelves, lamps, plants — the shared vocabulary
  materials.js             palette + textured material factories
  textures.js              cached texture loading
  rooms/*.js               one file per room: what is actually in it

src/character/
  appearance.js            the option set the creator offers + persistence
  figure.js                one parametric chibi, built to order
  Player.js                you
  Npc.js                   colleagues, their patrols, and the manager

src/interaction/           proximity reveal, glow, label chips
src/ui/                    hud, modal, dialogue, minimap, intro, creator, audio
src/data/
  content.js               ← every word an OBJECT says
  people.js                ← every word a PERSON says
tools/bake_textures.py     regenerates assets/textures
```

The rule the whole thing is built on: **nothing in `rooms/` knows how a wall is
cut, and nothing in `Building.js` knows what a robot arm is.** 

---

## Editing it

### Change what something says

`src/data/content.js`. Each entry is `{ category, title, tag, subtitle, body[],
action }`. `tag` is the line on the little chip that floats over the object;
`body` is the paragraphs in the panel.

> **Check the links.** The GitHub URLs are built from `ORG` at the top of the
> file and guessed repo names (`${ORG}/zephyr`, `${ORG}/atlas`, …). !!!!Point them at
> the real repositories before this goes live.


### Move a wall or add a room

`src/world/floorplan.js` - walls, doorways,
platforms, ramps and stairs all come from there, and the minimap is drawn from
the same data so it can't drift out of step.

To add a sixth room: add a `ROOMS` entry, the `WALLS` that enclose it, a `DOORS`
spec, and a `PLATFORMS` rectangle so `Nav` knows there's a floor. Then write
`src/world/rooms/theroom.js` exporting `buildTheRoom(ctx)` and register it in
`ROOM_BUILDERS` at the top of `Building.js`.

Inside a room builder you have five verbs:

```js
ctx.add(obj, x, y, z, rotY)      // put it in the world
ctx.collide(x, z, w, d, y)       // make it solid
ctx.interact(id, mesh, anchor)   // make it readable, using a content.js id
ctx.lamp(color, x, y, z, opts)   // a practical light + its glow
ctx.tick((dt, playerPos) => {})  // make it move
```

Rooms are ceiling-less on purpose - it's a cutaway diorama, and a ceiling would
be a lid on the box.

### The grounds

The building stands on lawn: `assets/textures/grass.png`, baked with clumped
tone variation and fourteen thousand short blades, plus a darker mown verge
around the walls and ninety scattered shrubs along the approach. All of it is
merged into a handful of draw calls. The forecourt and steps are still stone, so
there is a path to the front door.

### Re-bake the textures

```bash
pip install numpy pillow
python3 tools/bake_textures.py
```

Every surface is painted with thousands of wrapped elongated-gaussian brush
strokes over warped value noise, which is where the hand-made quality comes
from. The tunables are at the top of the script: `SIZE`, stroke counts, and the
palette per material. Normal maps are Sobel-derived at half resolution.

### Daylight and mood

`src/world/sunlight.js` is where the building stops feeling like a vault. It
declares ten windows in `WINDOWS`; each one builds leaded coloured glass, a haze
in front of it, a plant growing in the light, and — the part that actually does
the work — a soft pool of colour thrown across the floor. 

The pools are textures, not lights, and deliberately so. Real projected light
through coloured glass means a spotlight with a cookie per window, and the whole
point of `LightPool` was getting the light count down. Painted on the floor they
cost one transparent quad each and can be exactly the shape you want.

To move the sun around, edit `WINDOWS`: `at` is the wall, `along` the position
on it, `inward` the direction the pool is thrown. `GLASS` at the top of the file
holds each room's palette. A window on a wall the cutaway can slice needs
`cut: true` or its glass will hang in mid-air once the wall dissolves.

The overall grade lives in three places: `Engine.js` (background, fog, exposure),
`main.js` (the hemisphere and key lights), and the uniforms at the bottom of
`Postprocess.js` (vignette, saturation, shadow and highlight tints).

### Adjust the look

`src/core/Postprocess.js` — ink edge threshold and width, brush overlay
strength, split-tone shadow and highlight tints, saturation, vignette, grain. It
is a single fullscreen pass with no addon dependencies, and it fails soft: if
depth textures aren't available it renders straight to the screen.

`src/world/materials.js` — `PALETTE` is the whole colour vocabulary. Everything
else references it.

