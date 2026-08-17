// -----------------------------------------------------------------------------
// quality.js — the current quality settings, readable from anywhere.
//
// A room builder should not need a reference to the engine just to know how
// often it is allowed to push a texture to the GPU, and threading one through
// every ctx would couple the world to the renderer for no good reason. The
// engine writes here whenever the tier changes; anything that needs to scale
// its own work reads it.
// -----------------------------------------------------------------------------
export const QUALITY = {
  tier: 'medium',
  liveTex: 0.05,        // seconds between uploads of an animated canvas texture
};
