/**
 * engines/chemistry/moleculeSceneBuilder.ts — Cảnh 3D phân tử (Bài 12) và chuyển electron (Bài 15).
 * Phân tử: mô hình cầu – que; mỗi vạch liên kết là một cặp electron dùng chung (σ: que xám, π: que vàng song song,
 * cho – nhận: que xanh lá); hạt electron dao động, lệch về nguyên tử có độ âm điện lớn hơn.
 * Trạng thái đọc từ solver: mode ('bond' | 'redox'), mol, readout, donor, acceptor, electrons, transfer.
 */
import * as THREE from 'three';
import type { SceneVisualState } from '../../types/lab';
import { Anim, cyl, disposeObject, makeBench, makeLabel, mat, setLabelText, sphere, tagObject, vis, type SceneHandle } from '../sceneKit';

const COLORS: Record<string, string> = { H: '#f8fafc', C: '#475569', N: '#3b82f6', O: '#ef4444', F: '#a3e635', Cl: '#22c55e', Na: '#a855f7', Zn: '#94a3b8', Cu: '#d97706', Fe: '#b45309', Mn: '#c084fc' };
const RADII: Record<string, number> = { H: 0.13, C: 0.2, N: 0.19, O: 0.19, F: 0.18, Cl: 0.24, Na: 0.22 };
const CHI: Record<string, number> = { H: 2.2, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Cl: 3.16, Na: 0.93 };

type Atom = [string, number, number, number];
type Bond = [number, number, number, 'cov' | 'dative' | 'ion'];
interface Geometry {
  atoms: Atom[];
  bonds: Bond[];
}
const tetra = (r: number): Array<[number, number, number]> => [[0, r, 0], [0.943 * r, -0.333 * r, 0], [-0.471 * r, -0.333 * r, 0.816 * r], [-0.471 * r, -0.333 * r, -0.816 * r]];
const diatomic = (a: string, b: string, order: number, kind: Bond[3] = 'cov', d = 0.3): Geometry => ({ atoms: [[a, -d, 0, 0], [b, d, 0, 0]], bonds: [[0, 1, order, kind]] });
const central = (c: string, outer: Array<[string, [number, number, number]]>, order = 1, dativeIndex = -1): Geometry => ({
  atoms: [[c, 0, 0, 0], ...outer.map(([e, q]): Atom => [e, ...q])],
  bonds: outer.map((_, i): Bond => [0, i + 1, order, i === dativeIndex ? 'dative' : 'cov'])
});
const GEOMETRY: Record<string, Geometry> = {
  'H₂': diatomic('H', 'H', 1, 'cov', 0.24),
  'Cl₂': diatomic('Cl', 'Cl', 1, 'cov', 0.36),
  HCl: diatomic('H', 'Cl', 1),
  HF: diatomic('H', 'F', 1, 'cov', 0.27),
  'O₂': diatomic('O', 'O', 2),
  'N₂': diatomic('N', 'N', 3),
  NaCl: diatomic('Na', 'Cl', 1, 'ion', 0.42),
  'H₂O': central('O', [['H', [0.44, -0.34, 0]], ['H', [-0.44, -0.34, 0]]]),
  'NH₃': central('N', tetra(0.5).slice(1).map((q) => ['H', q])),
  'CH₄': central('C', tetra(0.55).map((q) => ['H', q])),
  'NH₄⁺': central('N', tetra(0.52).map((q) => ['H', q]), 1, 0),
  'CO₂': central('C', [['O', [0.6, 0, 0]], ['O', [-0.6, 0, 0]]], 2),
  'C₂H₄': { atoms: [['C', -0.3, 0, 0], ['C', 0.3, 0, 0], ['H', -0.62, 0.4, 0], ['H', -0.62, -0.4, 0], ['H', 0.62, 0.4, 0], ['H', 0.62, -0.4, 0]], bonds: [[0, 1, 2, 'cov'], [0, 2, 1, 'cov'], [0, 3, 1, 'cov'], [1, 4, 1, 'cov'], [1, 5, 1, 'cov']] },
  'C₂H₂': { atoms: [['C', -0.27, 0, 0], ['C', 0.27, 0, 0], ['H', -0.8, 0, 0], ['H', 0.8, 0, 0]], bonds: [[0, 1, 3, 'cov'], [0, 2, 1, 'cov'], [1, 3, 1, 'cov']] }
};

interface Electron {
  mesh: THREE.Mesh;
  a: THREE.Vector3;
  b: THREE.Vector3;
  shift: number;
  phase: number;
}

export function buildMoleculeScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.4, 2));
  const holder = new THREE.Group();
  holder.position.set(0, 1, 0);
  root.add(holder);
  // Vùng chạm cố định (tồn tại suốt cảnh để raycaster luôn bắt được)
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.copy(holder.position);
  tagObject(hit, 'molecule', 'Mô hình phân tử — chạm để ghi số liệu');
  root.add(hit);
  const pedestal = cyl(0.3, 0.38, 0.12, mat('#334155'));
  pedestal.position.y = 0.06;
  tagObject(pedestal, 'atom', 'Bệ mô hình');
  root.add(pedestal);
  const readout = makeLabel('—');
  readout.position.set(0, 1.95, 0);
  root.add(readout);
  let electrons: Electron[] = [];
  let built = '';
  let time = 0;
  const anim = new Anim();
  let lastNonce = -1;
  const eMat = (): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: '#fde047' });
  const clear = (): void => {
    disposeObject(holder);
    holder.clear();
    electrons = [];
  };
  const addAtom = (el: string, pos: THREE.Vector3): void => {
    const s = sphere(RADII[el] ?? 0.22, mat(COLORS[el] ?? '#94a3b8', { roughness: 0.35 }), 24);
    s.position.copy(pos);
    const l = makeLabel(el, { size: 34 });
    l.position.copy(pos).add(new THREE.Vector3(0, (RADII[el] ?? 0.22) + 0.1, 0));
    holder.add(s, l);
  };
  const addRod = (a: THREE.Vector3, b: THREE.Vector3, off: THREE.Vector3, color: string): void => {
    const d = b.clone().sub(a);
    const rod = cyl(0.022, 0.022, d.length(), mat(color), 8);
    rod.position.copy(a).add(b).multiplyScalar(0.5).add(off);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    holder.add(rod);
  };
  const buildBond = (formula: string): void => {
    clear();
    const g = GEOMETRY[formula];
    if (!g) return;
    const pos = g.atoms.map(([, x, y, z]) => new THREE.Vector3(x, y, z));
    g.atoms.forEach(([el], i) => addAtom(el, pos[i]));
    for (const [i, j, order, kind] of g.bonds) {
      const dir = pos[j].clone().sub(pos[i]).normalize();
      const side = new THREE.Vector3(-dir.y, dir.x, 0);
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      side.normalize();
      const chiA = CHI[g.atoms[i][0]] ?? 2.5;
      const chiB = CHI[g.atoms[j][0]] ?? 2.5;
      for (let k = 0; k < order; k++) {
        const off = side.clone().multiplyScalar((k - (order - 1) / 2) * 0.1);
        if (kind !== 'ion') addRod(pos[i], pos[j], off, kind === 'dative' ? '#22c55e' : k === Math.floor((order - 1) / 2) ? '#94a3b8' : '#eab308');
        for (const ph of [0, Math.PI]) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eMat());
          holder.add(m);
          electrons.push({ mesh: m, a: pos[i].clone().add(off), b: pos[j].clone().add(off), shift: kind === 'ion' ? 0.42 : Math.max(-0.28, Math.min(0.28, (chiB - chiA) * 0.16)), phase: ph + k });
        }
      }
    }
  };
  const buildRedox = (donor: string, acceptor: string, n: number): void => {
    clear();
    const A = new THREE.Vector3(-0.65, 0, 0);
    const B = new THREE.Vector3(0.65, 0, 0);
    addAtom(donor, A);
    addAtom(acceptor, B);
    const la = makeLabel('Chất khử (nhường e)', { size: 30 });
    la.position.set(-0.65, -0.45, 0);
    const lb = makeLabel('Chất oxi hóa (nhận e)', { size: 30 });
    lb.position.set(0.65, -0.45, 0);
    holder.add(la, lb);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), eMat());
      holder.add(m);
      electrons.push({ mesh: m, a: A, b: B, shift: 0, phase: (i / n) * Math.PI * 2 });
    }
  };
  let mode = 'bond';
  let progress = 0;
  return {
    root,
    interactive: [hit, pedestal],
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0.4, 1.35, 2.6),
    cameraTarget: new THREE.Vector3(0, 0.95, 0),
    update(v: SceneVisualState, nonce: number) {
      mode = vis.str(v, 'mode', 'bond');
      setLabelText(readout, vis.str(v, 'readout', '—'));
      const key = mode === 'bond' ? vis.str(v, 'mol') : `${vis.str(v, 'donor')}>${vis.str(v, 'acceptor')}:${vis.num(v, 'electrons', 1)}`;
      if (key !== built) {
        built = key;
        if (mode === 'bond') buildBond(key);
        else buildRedox(vis.str(v, 'donor'), vis.str(v, 'acceptor'), vis.num(v, 'electrons', 1));
      }
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        progress = 0;
        if (vis.bool(v, 'transfer')) anim.start(vis.num(v, 'animMs'));
        else anim.reset();
      }
    },
    tick(dt) {
      time += dt;
      if (mode === 'bond') holder.rotation.y += dt * 0.35;
      else holder.rotation.y = 0;
      if (anim.active) progress = anim.tick(dt);
      for (const e of electrons) {
        if (mode === 'bond') {
          const t = 0.5 + e.shift + 0.12 * Math.sin(time * 3 + e.phase);
          e.mesh.position.lerpVectors(e.a, e.b, t);
          e.mesh.position.y += 0.05 * Math.cos(time * 3 + e.phase);
        } else {
          const k = Math.min(1, Math.max(0, progress * 1.6 - e.phase / 12));
          const c = e.a.clone().lerp(e.b, k);
          const ang = e.phase + time * 1.5;
          const r = 0.32 * (1 - Math.sin(Math.PI * k)) + 0.05;
          e.mesh.position.set(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r + Math.sin(Math.PI * k) * 0.35, c.z);
        }
      }
    },
    dispose: () => disposeObject(root)
  };
}
