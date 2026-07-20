# Analogue Intelligence - an explorable library
The landing page of the research group Analogue Intelligence - small game-like interaction.


## Run it

No build step. It uses ES modules + an import map, so it must be served over
HTTP (not opened as a `file://`):

```bash
cd analogue-intelligence
python3 -m http.server 5173      # then open http://localhost:5173
```

Any static server works (`npx serve`, VS Code Live Server, etc.).
Three.js is pulled from a CDN via the import map in `index.html`.

## Architecture

```
index.html            entry; import map + canvas + ui-root
src/
  main.js             boots engine, builds world, wires everything
  core/
    Engine.js         renderer, isometric follow-camera, tick loop
    Input.js          WASD vector + click-to-move + object-click hook
  world/
    materials.js      palette, flat-shaded materials, vertex "roughen"
    Levels.js         procedural height field + floor transitions  ← Phase 2
    Room.js           procedural two-floor library, props, colliders, dust
  character/
    Player.js         low-poly figure, 3D movement, collision, the lamp
    Guide.js          the Curator NPC (proximity → talk prompt)
  interaction/
    Interactable.js   binds a mesh to a content entry
    ProximityManager  lamp-radius reveal, labels, click picking, discovery
  ui/
    Intro.js          title → top-bar transition
    Hud.js            move hint, label layer, talk prompt, toast, mute
    InfoModal.js      themed info card
    Dialogue.js       curator conversation
    Audio.js          procedural WebAudio (no files)               ← Phase 2
    Minimap.js        live top-down canvas                          ← Phase 2
  data/
    content.js        ALL research-group copy + category colours
    dialogue.js       curator's question tree
  styles/ui.css       all overlay styling (matches the brand)
```

**Change any text** in `src/data/content.js`. **Add an interactable**: add an
entry to `content.js`, then in `Room.js` create the mesh and push
`new Interactable(id, anchorVec, mesh)`. **Retune the world layout** (stairs,
balcony) in one place: `src/world/Levels.js` — keep the geometry in `Room.js`
consistent with those rects.