import * as THREE from 'three';
import { M, box, cyl, paint, surface, textPlate } from './materials.js';

// -----------------------------------------------------------------------------
// Door — every room is entered through one, and each swings itself open as you
// come within reach. That's the whole navigation grammar of the building: no
// teleports, no fades, you walk through doorways.
//
// Each `kind` is dressed differently, so you can read where a door goes before
// you reach it: the lab door is a steel fire door with a wired window, the
// studio's is painted plywood, the library's is panelled oak.
// -----------------------------------------------------------------------------

const STYLES = {
  entrance: { leaf: '#5b4026', frame: '#3a2a1a', glass: '#cbb27a', panels: true },
  interior: { leaf: '#6a4a2c', frame: '#3a2a1a', glass: '#c9b78a', panels: true },
  lab: { leaf: '#7d858c', frame: '#4a5058', glass: '#93b6c4', panels: false, steel: true },
  studio: { leaf: '#9a5a6c', frame: '#4a3320', glass: null, panels: false },
  library: { leaf: '#6d4a2a', frame: '#3a2a1a', glass: null, panels: true },
};

export class Door {
  constructor(spec) {
    this.spec = spec;
    this.group = new THREE.Group();
    this.leaves = [];
    this.open = 0;                       // 0 shut, 1 fully swung
    this.targetOpen = 0;
    this.locked = false;

    const st = STYLES[spec.kind] ?? STYLES.interior;
    const along = spec.axis === 'z' ? 'x' : 'z';   // the axis the door runs along
    const halfW = spec.w / 2;
    const leafW = spec.w / (spec.leaves ?? 1);

    // ---- frame ----
    const frameMat = M.wood(st.frame, [1, 2]);
    for (const s of [-1, 1]) {
      const jamb = spec.axis === 'z'
        ? box(0.34, spec.h + 0.3, 0.62, frameMat)
        : box(0.62, spec.h + 0.3, 0.34, frameMat);
      jamb.position.set(
        spec.axis === 'z' ? spec.center + s * (halfW + 0.17) : 0,
        (spec.h + 0.3) / 2,
        spec.axis === 'z' ? 0 : spec.center + s * (halfW + 0.17));
      this.group.add(jamb);
    }
    const head = spec.axis === 'z'
      ? box(spec.w + 0.68, 0.34, 0.62, frameMat)
      : box(0.62, 0.34, spec.w + 0.68, frameMat);
    head.position.set(spec.axis === 'z' ? spec.center : 0, spec.h + 0.15,
      spec.axis === 'z' ? 0 : spec.center);
    this.group.add(head);

    // ---- leaves ----
    for (let i = 0; i < (spec.leaves ?? 1); i++) {
      const dir = (spec.leaves === 2) ? (i === 0 ? -1 : 1) : 1;
      const hingeOffset = (spec.leaves === 2) ? dir * halfW : -halfW;
      const pivot = new THREE.Group();
      pivot.position.set(
        spec.axis === 'z' ? spec.center + hingeOffset : 0, 0,
        spec.axis === 'z' ? 0 : spec.center + hingeOffset);
      this.group.add(pivot);

      const inward = (spec.leaves === 2) ? -dir : 1;    // which way the panel extends
      const panelMat = st.steel
        ? M.metal(st.leaf, 0.45)
        : surface({ map: 'wood_dark', repeat: [1, 2], color: st.leaf, roughness: 0.72 });

      const panel = spec.axis === 'z'
        ? box(leafW, spec.h, 0.16, panelMat)
        : box(0.16, spec.h, leafW, panelMat);
      panel.position.set(
        spec.axis === 'z' ? inward * leafW / 2 : 0, spec.h / 2,
        spec.axis === 'z' ? 0 : inward * leafW / 2);
      pivot.add(panel);

      // raised panels / window / kick plate, depending on the style
      if (st.panels) {
        for (const py of [spec.h * 0.28, spec.h * 0.62]) {
          const p = spec.axis === 'z'
            ? box(leafW * 0.6, spec.h * 0.22, 0.06, panelMat)
            : box(0.06, spec.h * 0.22, leafW * 0.6, panelMat);
          p.position.set(
            spec.axis === 'z' ? inward * leafW / 2 : 0.1, py,
            spec.axis === 'z' ? 0.1 : inward * leafW / 2);
          p.scale.multiplyScalar(0.98);
          pivot.add(p);
        }
      }
      if (st.glass) {
        const glassMat = paint(st.glass, { emissive: st.glass, emissiveIntensity: 0.35, opacity: 0.72 });
        const gl = spec.axis === 'z'
          ? box(leafW * 0.62, spec.h * 0.26, 0.06, glassMat)
          : box(0.06, spec.h * 0.26, leafW * 0.62, glassMat);
        gl.position.set(
          spec.axis === 'z' ? inward * leafW / 2 : 0.09, spec.h * 0.74,
          spec.axis === 'z' ? 0.09 : inward * leafW / 2);
        pivot.add(gl);
      }

      // handle
      const handle = cyl(0.05, 0.05, 0.4, M.metal('#b08d46', 0.35), 8);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(
        spec.axis === 'z' ? inward * (leafW - 0.32) : 0.16, spec.h * 0.45,
        spec.axis === 'z' ? 0.16 : inward * (leafW - 0.32));
      pivot.add(handle);

      this.leaves.push({ pivot, dir: (spec.leaves === 2 ? dir : 1) * (spec.swing ?? 1) });
    }

    this.group.position.set(
      spec.axis === 'z' ? 0 : spec.at, spec.y,
      spec.axis === 'z' ? spec.at : 0);

    this.worldCenter = new THREE.Vector3(
      spec.axis === 'z' ? spec.center : spec.at,
      spec.y + 1,
      spec.axis === 'z' ? spec.at : spec.center);
  }

  /** Swing open when someone is close and roughly at the same height. */
  update(dt, playerPos) {
    const dx = playerPos.x - this.worldCenter.x;
    const dz = playerPos.z - this.worldCenter.z;
    const dy = Math.abs(playerPos.y - this.spec.y);
    const near = Math.hypot(dx, dz) < 5.2 && dy < 3;
    this.targetOpen = (near && !this.locked) ? 1 : 0;
    this.open += (this.targetOpen - this.open) * Math.min(dt * 3.4, 1);
    const a = this.open * 1.85;
    for (const l of this.leaves) l.pivot.rotation.y = a * l.dir;
  }
}

/** The hanging shop sign over the entrance. */
export function shopSign(text, sub) {
  const g = new THREE.Group();
  const t = textPlate([text, sub], {
    w: 1024, h: 300, bg: '#2a2018', border: '#b08d46', borderWidth: 8,
    color: '#e7d7b0', size: 96, font: '"Syne", Georgia, serif',
  });
  const board = box(5.2, 1.5, 0.14, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
  g.add(board);
  const bar = box(5.8, 0.12, 0.12, M.metal('#3f3b36', 0.55));
  bar.position.y = 0.92; g.add(bar);
  for (const s of [-1, 1]) {
    const chain = box(0.06, 0.85, 0.06, M.metal('#3f3b36', 0.55));
    chain.position.set(s * 2.1, 0.46, 0); g.add(chain);
  }
  return g;
}
