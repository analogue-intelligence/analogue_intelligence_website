import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Cutaway — the reason you can see into the rooms.
//
// The camera is locked to a 45° isometric looking down the -x/-z diagonal, so a
// wall hides the player exactly when it sits at a *greater* x (for walls running
// north–south) or a greater z (for walls running east–west) than the player
// does. That's the whole test. Walls that fail it dissolve to a low stub, the
// way an architectural cutaway drawing slices the near side off a building.
//
// The fade is per-wall and eased, so walking from the hall into the studio
// swings the cut around you rather than popping.
// -----------------------------------------------------------------------------

const FADE_BAND = 3.0;      // world units over which a wall fades out
const MIN_OPACITY = 0.0;    // fully gone once you're behind it

export class Cutaway {
  constructor() {
    this.walls = [];        // { mesh, axis, coord, material, base }
  }

  /**
   * Register a wall segment. `axis` is the axis the wall's normal runs along
   * ('x' for a wall standing in the z direction), `coord` its position on it.
   */
  add(mesh, axis, coord) {
    // Walls need their own material instance: they animate opacity independently.
    mesh.material = mesh.material.clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    this.walls.push({ mesh, axis, coord, k: 1, mat: mesh.material });
  }

  update(dt, playerPos) {
    for (const w of this.walls) {
      const p = w.axis === 'x' ? playerPos.x : playerPos.z;
      // 1 when the wall is safely behind the player, 0 when it's in front
      const target = THREE.MathUtils.clamp((p - w.coord) / FADE_BAND + 1, 0, 1);
      w.k += (target - w.k) * Math.min(dt * 5.5, 1);

      const o = MIN_OPACITY + (1 - MIN_OPACITY) * w.k;
      w.mat.opacity = o;
      // Once a wall is nearly gone, stop it writing depth so it can't punch a
      // hole in whatever is behind it.
      w.mat.depthWrite = o > 0.92;
      w.mesh.visible = o > 0.02;
    }
  }
}
