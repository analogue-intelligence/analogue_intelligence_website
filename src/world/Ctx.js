import * as THREE from 'three';
import { Interactable } from '../interaction/Interactable.js';
import { glow } from './materials.js';

// -----------------------------------------------------------------------------
// Ctx — the handle every room builder is given.
//
// Rooms don't touch the scene graph, the collider list or the interactable
// registry directly; they go through here. It keeps five room files from each
// inventing their own conventions, and it means a prop can be placed, made
// solid, made clickable and made to animate in four short lines.
// -----------------------------------------------------------------------------
export class Ctx {
  constructor({ group, colliders, interactables, animate, lights }) {
    this.group = group;
    this.colliders = colliders;
    this.interactables = interactables;
    this.animate = animate;
    this.lights = lights;          // point lights, so we can budget them per room
    this.room = null;              // set by Building before each room builder runs
  }

  /** Place an object in the world. Returns it, so calls can be chained. */
  add(obj, x = 0, y = 0, z = 0, rotY = 0, scale = 1) {
    obj.position.set(x, y, z);
    if (rotY) obj.rotation.y = rotY;
    if (scale !== 1) obj.scale.setScalar(scale);
    this.group.add(obj);
    return obj;
  }

  /** Mark a footprint solid. `y` is the floor the obstacle stands on. */
  collide(x, z, w, d, y = 0) {
    this.colliders.push({ x, z, w, d, y });
    return this;
  }

  /**
   * Make something readable. Takes a Mesh *or* a whole Group — a six-part drone
   * lights up as one object rather than one rotor at a time.
   *
   * Note we don't clone materials here: Interactable's constructor already
   * walks the subtree and gives every mesh its own material instance. Doing it
   * here as well would only work for single meshes, and would throw on a Group.
   */
  interact(id, object, anchor) {
    const a = anchor instanceof THREE.Vector3
      ? anchor
      : new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    const it = new Interactable(id, a, object, this.room);
    this.interactables.push(it);
    return it;
  }

  /** Anchor helper: world position of a prop plus a height offset. */
  anchor(x, y, z) { return new THREE.Vector3(x, y, z); }

  tick(fn) { this.animate.push(fn); return this; }

  /**
   * A practical light. This registers a *virtual* lamp — position, colour and
   * reach — plus the additive sprite that stands in for bloom. A small pool of
   * real PointLights roams the building and snaps to whichever lamps are
   * nearest the player (see core/LightPool.js).
   *
   * Thirty-six real point lights is thirty-six lighting evaluations per pixel
   * across every material in the scene, whether or not you can see the room
   * they're in. The sprite is what you actually notice; the light is what costs.
   */
  lamp(color, x, y, z, { intensity = 14, distance = 16, size = 3.2, opacity = 0.5 } = {}) {
    const g = glow(color, size, opacity);
    g.position.set(x, y, z);
    this.group.add(g);
    const def = { color, x, y, z, intensity, distance, room: this.room };
    this.lights.push(def);
    return def;
  }
}
