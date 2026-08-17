// -----------------------------------------------------------------------------
// floorplan.js — the building, described once, in data.
//
// Everything downstream reads from here: Building.js raises the shell, Nav.js
// works out what height you're standing at, RoomManager.js decides when a room
// has been discovered, and Minimap.js draws the plan. If you want to move a
// wall or add a room, this is the only file you need to touch.
//
// Axes: +x runs east (right), +z runs south (toward the camera), y is up.
// The isometric camera sits high on the +x/+z side, so south and east walls are
// the ones that get cut away — see Cutaway.js.
//
//        z=-30 ┌────────────── LIBRARY (upper, y=7) ──────────────┐
//        z=-11 ├──────────────────┬───────────┬──────────────────-┤
//              │    ROBOTICS      │   HALL    │      STUDIO       │
//              │       LAB        │  OF FAME  │   (creative)      │
//         z=12 └──────────────────┴─┐  ⌷  ┌───┴──────────────────-┘
//                                   │LOBBY│
//         z=26                      └──⌷──┘   ← front door
//             x=-38            x=-16   0   x=16            x=38
// -----------------------------------------------------------------------------

export const WALL_H = 8;          // ground-floor wall height
export const UPPER_Y = 7;         // library floor height
export const DOOR_W = 3.4;
export const LAB_ROBOTICS_X = -27;     // centre of the robotics area
export const LAB_STUDIO_X = -49;       // centre of the studio area, same room
export const PARTNERS_X = 27;
export const CLASS_DOOR_Z = 21;        // lobby to classroom, on the west wall
export const CLASSROOM_X = -25;
export const STUDIO_DOOR_Z = 8;        // studio doorway offset, clear of the stairs
export const DOOR_H = 5.4;        // clear height of an interior doorway

// ---------------------------------------------------------------- rooms -----
// `purpose` shows on the dark room card before you first walk in; `blurb` is
// the line that fades in underneath once you have.
export const ROOMS = [
  {
    id: 'lobby',
    name: 'Coffee Lobby',
    purpose: 'Arrivals, caffeine, and loitering with intent',
    blurb: 'Where every project starts as a conversation.',
    accent: '#c9822f',
    x0: -12, x1: 12, z0: 12, z1: 30, y: 0, h: WALL_H,
    floor: 'tile',
    wallTint: '#d3c3a2',
    lit: true,               // the room you arrive in — never shrouded
  },
  {
    id: 'hall',
    name: 'Hall of Fame',
    purpose: 'The lab\'s work, on plinths, under lamps',
    blurb: 'Six things we made. Walk up to any of them.',
    accent: '#c9a24a',
    x0: -16, x1: 16, z0: -11.5, z1: 12, y: 0, h: WALL_H,
    floor: 'wood_floor',
    wallTint: '#c7b190',
  },
  {
    // One room, two areas, no wall between them. The robotics bays and the
    // studio used to be separate rooms on opposite sides of the hall, which
    // quietly argued that engineering and making are different activities
    // done by different people. They share a floor now; the only division is
    // the change from concrete underfoot to boards.
    id: 'lab',
    name: 'Research Lab',
    purpose: 'A creative robotics studio',
    blurb: 'Arms, rotors, plotters and paint, on one floor.',
    accent: '#e0673c',
    x0: -60, x1: -16, z0: -11.5, z1: 12, y: 0, h: WALL_H,
    // Boards the full length. The concrete-to-wood change on the old wall line
    // was re-drawing the division the merge was supposed to remove.
    floor: 'wood_floor',
    wallTint: '#c9b79a',
  },
  {
    // Positioned off the *lobby*, not off the research wing, and that is the
    // whole argument. The teaching this room represents is deliberately open to
    // people who are not students — citizens, children, anyone — so it has to
    // be reachable by turning left inside the front door rather than by walking
    // through a working lab. It still shares its south wall with the Research
    // Lab, so the two are neighbours and you can see one from the other.
    id: 'classroom',
    name: 'The Classroom',
    purpose: 'Courses, and lectures open to anyone',
    blurb: 'Turn left at the door. No enrolment required.',
    accent: '#5e8a5a',
    x0: -38, x1: -12, z0: 12, z1: 30, y: 0, h: WALL_H,
    floor: 'wood_floor',
    wallTint: '#cfc0a0',
  },
  {
    id: 'partners',
    name: 'Partners Room',
    purpose: 'The case for backing this work',
    blurb: 'Walk the wall from the claim to the way to reply.',
    accent: '#b08d46',
    x0: 16, x1: 38, z0: -11.5, z1: 12, y: 0, h: WALL_H,
    floor: 'wood_floor',
    wallTint: '#d8c4a4',
  },
  {
    id: 'library',
    name: 'Library',
    purpose: 'The long view — reading, writing, and argument',
    blurb: 'Four shelves, one question, asked four ways.',
    accent: '#b06a3a',
    x0: -16, x1: 16, z0: -30, z1: -8, y: UPPER_Y, h: WALL_H,
    floor: 'wood_floor',
    wallTint: '#cdb590',
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// ---------------------------------------------------------------- walls -----
// axis:'x' → a wall standing in the z direction at x = at
// axis:'z' → a wall standing in the x direction at z = at
// openings are ranges along the wall's run; each gets a lintel above it.
export const WALLS = [
  // ---- lobby shell -----------------------------------------------------
  { axis: 'z', at: 30, from: -12, to: 12, y: 0, h: WALL_H, tint: '#d3c3a2',
    openings: [{ from: -2.2, to: 2.2, h: 5.6 }], exterior: true },
  // the lobby's west wall is now an interior one, with the classroom door in it
  { axis: 'x', at: -12, from: 12, to: 30, y: 0, h: WALL_H, tint: '#d3c3a2',
    openings: [{ from: CLASS_DOOR_Z - DOOR_W / 2, to: CLASS_DOOR_Z + DOOR_W / 2, h: DOOR_H }] },
  { axis: 'x', at: -38, from: 12, to: 30, y: 0, h: WALL_H, tint: '#cfc0a0', exterior: true },
  { axis: 'z', at: 30, from: -38, to: -12, y: 0, h: WALL_H, tint: '#cfc0a0', exterior: true },
  { axis: 'x', at: 12, from: 12, to: 30, y: 0, h: WALL_H, tint: '#d3c3a2', exterior: true },

  // ---- the whole southern face, with the lobby↔hall doorway in it -------
  { axis: 'z', at: 12, from: -60, to: 38, y: 0, h: WALL_H, tint: '#cbb894',
    openings: [{ from: -DOOR_W / 2, to: DOOR_W / 2, h: DOOR_H }] },

  // ---- hall ↔ wings ----------------------------------------------------
  { axis: 'x', at: -16, from: -11.5, to: 12, y: 0, h: WALL_H, tint: '#cbb894',
    openings: [{ from: -DOOR_W / 2, to: DOOR_W / 2, h: DOOR_H }] },
  // The studio doorway sits at z = +8, not on centre. The staircase runs up the
  // inside of this wall between z = 4 and z = -8, so a door on centre opened
  // straight into the underside of the stairs and the studio was unreachable.
  { axis: 'x', at: 16, from: -11.5, to: 12, y: 0, h: WALL_H, tint: '#cbb894',
    openings: [{ from: STUDIO_DOOR_Z - DOOR_W / 2, to: STUDIO_DOOR_Z + DOOR_W / 2, h: DOOR_H }] },

  // ---- outer east / west -----------------------------------------------
  { axis: 'x', at: -60, from: -11.5, to: 12, y: 0, h: WALL_H, tint: '#c9b79a', exterior: true },
  { axis: 'x', at: 38, from: -11.5, to: 12, y: 0, h: WALL_H, tint: '#d8c4a4', exterior: true },

  // ---- northern face of the wings (the middle stretch is the library
  //      plinth, raised in Building.js) -----------------------------------
  { axis: 'z', at: -11.5, from: -60, to: -16, y: 0, h: WALL_H, tint: '#c9b79a', exterior: true },
  { axis: 'z', at: -11.5, from: 16, to: 38, y: 0, h: WALL_H, tint: '#d8c4a4', exterior: true },

  // ---- library, upstairs ------------------------------------------------
  // south face: solid at the edges, a door from the landing, and a long
  // railed overlook down into the hall.
  { axis: 'z', at: -11.5, from: -16, to: -13.5, y: UPPER_Y, h: WALL_H, tint: '#cdb590' },
  { axis: 'z', at: -11.5, from: 5.5, to: 9.4, y: UPPER_Y, h: WALL_H, tint: '#cdb590' },
  { axis: 'z', at: -11.5, from: 13.6, to: 16, y: UPPER_Y, h: WALL_H, tint: '#cdb590' },
  // the header above the overlook + doorway, so the wall still reads as a wall
  { axis: 'z', at: -11.5, from: -13.5, to: 5.5, y: UPPER_Y + DOOR_H, h: WALL_H - DOOR_H, tint: '#cdb590' },
  { axis: 'z', at: -11.5, from: 9.4, to: 13.6, y: UPPER_Y + DOOR_H, h: WALL_H - DOOR_H, tint: '#cdb590' },

  { axis: 'x', at: -16, from: -30, to: -11.5, y: UPPER_Y, h: WALL_H, tint: '#cdb590', exterior: true },
  { axis: 'x', at: 16, from: -30, to: -11.5, y: UPPER_Y, h: WALL_H, tint: '#cdb590', exterior: true },
  { axis: 'z', at: -30, from: -16, to: 16, y: UPPER_Y, h: WALL_H, tint: '#cdb590', exterior: true },
];

// ---------------------------------------------------------------- doors -----
// Hung in the openings above. `swing` is the sign of the hinge rotation.
export const DOORS = [
  { id: 'front', axis: 'z', at: 30, center: 0, w: 4.4, h: 5.6, y: 0,
    swing: -1, kind: 'entrance', leaves: 2, room: 'lobby' },
  { id: 'lobby_hall', axis: 'z', at: 12, center: 0, w: DOOR_W, h: DOOR_H, y: 0,
    swing: -1, kind: 'interior', leaves: 2, room: 'hall', from: 'lobby' },
  { id: 'lobby_classroom', axis: 'x', at: -12, center: CLASS_DOOR_Z, w: DOOR_W, h: DOOR_H, y: 0,
    swing: 1, kind: 'interior', leaves: 1, room: 'classroom', from: 'lobby' },
  { id: 'hall_lab', axis: 'x', at: -16, center: 0, w: DOOR_W, h: DOOR_H, y: 0,
    swing: 1, kind: 'lab', leaves: 1, room: 'lab', from: 'hall' },
  { id: 'hall_partners', axis: 'x', at: 16, center: STUDIO_DOOR_Z, w: DOOR_W, h: DOOR_H, y: 0,
    swing: -1, kind: 'studio', leaves: 1, room: 'partners', from: 'hall' },
  { id: 'landing_library', axis: 'z', at: -11.5, center: 11.5, w: 3.6, h: DOOR_H, y: UPPER_Y,
    swing: 1, kind: 'library', leaves: 1, room: 'library', from: 'hall' },
];

// ------------------------------------------------------------- walkable -----
// Flat platforms and sloped ramps. Nav.js picks whichever candidate is closest
// to the height you're already at, which is what lets the landing sit over the
// hall without the two fighting each other.
export const STAIRS = { x0: 11.6, x1: 15.9, zBottom: 4, zTop: -8, yBottom: 0, yTop: UPPER_Y };

export const PLATFORMS = [
  { id: 'lobby', x0: -12, x1: 12, z0: 12, z1: 30, y: 0 },
  { id: 'classroom', x0: -38, x1: -12, z0: 12, z1: 30, y: 0 },
  // The approach. Without this the road is scenery you cannot stand on — Nav
  // only knows about platforms, so the prologue would assemble you above a
  // surface you could not then walk along.
  { id: 'approach', x0: -14, x1: 14, z0: 29.4, z1: 112, y: 0 },
  { id: 'doorway_classroom', x0: -12.7, x1: -11.3, z0: CLASS_DOOR_Z - 2.1, z1: CLASS_DOOR_Z + 2.1, y: 0 },
  { id: 'hall', x0: -16, x1: 16, z0: -11.5, z1: 12, y: 0 },
  { id: 'lab', x0: -60, x1: -16, z0: -11.5, z1: 12, y: 0 },
  { id: 'partners', x0: 16, x1: 38, z0: -11.5, z1: 12, y: 0 },
  { id: 'doorway_lobby', x0: -2.4, x1: 2.4, z0: 11.4, z1: 12.6, y: 0 },
  { id: 'doorway_lab', x0: -16.7, x1: -15.3, z0: -2.4, z1: 2.4, y: 0 },
  { id: 'doorway_partners', x0: 15.3, x1: 16.7, z0: 5.9, z1: 10.1, y: 0 },
  { id: 'landing', x0: 8, x1: 16, z0: -11.5, z1: -8, y: UPPER_Y },
  { id: 'doorway_library', x0: 9.6, x1: 13.4, z0: -12.2, z1: -11, y: UPPER_Y },
  { id: 'library', x0: -16, x1: 16, z0: -30, z1: -11.5, y: UPPER_Y },
];

export const RAMPS = [
  {
    id: 'stairs',
    x0: STAIRS.x0, x1: STAIRS.x1, z0: STAIRS.zTop, z1: STAIRS.zBottom,
    // height falls from yTop at z0 to yBottom at z1
    yAt(x, z) {
      const t = (STAIRS.zBottom - z) / (STAIRS.zBottom - STAIRS.zTop);
      return STAIRS.yBottom + (STAIRS.yTop - STAIRS.yBottom) * Math.min(Math.max(t, 0), 1);
    },
  },
];

// The full extent of the building, used by the minimap and the exterior slab.
export const BOUNDS = { x0: -64, x1: 42, z0: -32, z1: 116 };
