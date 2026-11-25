/**
 * engines/biology/cellSceneBuilder.ts — Cảnh 3D tế bào cho Sinh học 10.
 *  - buildCellScene     (Bài 7) : vi khuẩn cắt lát với roi, lông, vỏ nhầy, thành, màng, ribosome, vùng nhân, plasmid
 *  - buildMembraneScene (Bài 10): lớp kép phospholipid, protein kênh/bơm, hạt chất tan, túi nhập/xuất bào, tế bào thẩm thấu
 *  - buildSignalScene   (Bài 12): tế bào phát tín hiệu → tế bào đích với thụ thể, 4 phương thức truyền tin
 * Dùng InstancedMesh cho hạt/phospholipid để giữ số draw call thấp trên máy yếu.
 */
import * as THREE from 'three';
import type { SceneVisualState } from '../../types/lab';
import { Anim, box, cyl, disposeObject, makeBench, makeLabel, mat, setLabelText, sphere, tagObject, vis, type SceneHandle } from '../sceneKit';

const ease = (a: number, b: number, dt: number): number => a + (b - a) * Math.min(1, dt * 5);

/* ========================= BÀI 7 ========================= */
export function buildCellScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.4, 2));
  const cell = new THREE.Group();
  cell.position.set(0, 1, 0);
  root.add(cell);
  const half = (r: number, len: number, color: string, opacity: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 28), mat(color, { transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.z = Math.PI / 2;
    return m;
  };
  const parts = new Map<string, THREE.Object3D>();
  const add = (id: string, label: string, obj: THREE.Object3D): void => {
    parts.set(id, obj);
    tagObject(obj, `part-${id}`, label);
    cell.add(obj);
  };
  const capsule = half(0.46, 0.72, '#a7f3d0', 0.16);
  const outer = half(0.41, 0.7, '#f472b6', 0.22);
  const wall = half(0.38, 0.69, '#818cf8', 0.34);
  const membrane = half(0.33, 0.68, '#fbbf24', 0.32);
  add('capsule', 'Vỏ nhầy', capsule);
  add('wall', 'Thành tế bào (peptidoglycan)', wall);
  add('membrane', 'Màng tế bào', membrane);
  cell.add(outer);
  // Roi (đường cong hình sin)
  const pts = Array.from({ length: 24 }, (_, i) => new THREE.Vector3(0.72 + i * 0.045, Math.sin(i * 0.7) * 0.09, Math.cos(i * 0.7) * 0.05));
  add('flagellum', 'Roi', new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 50, 0.016, 6), mat('#e2e8f0')));
  const pili = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = -0.4 + (i % 6) * 0.16;
    const r = cyl(0.007, 0.007, 0.22, mat('#cbd5e1'), 5);
    const dir = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    r.position.set(x, dir.y * 0.52, dir.z * 0.52);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    pili.add(r);
  }
  add('pili', 'Lông', pili);
  const ribo = new THREE.Group();
  const riboMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#92400e'), 60);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    const a = i * 2.399;
    const rr = 0.12 + 0.17 * ((i * 37) % 60) / 60;
    m4.makeTranslation(-0.45 + ((i * 17) % 60) * 0.0155, Math.cos(a) * rr, Math.sin(a) * rr);
    riboMesh.setMatrixAt(i, m4);
  }
  ribo.add(riboMesh);
  add('ribosome', 'Ribosome 70S', ribo);
  const loop = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * (0.26 + 0.07 * Math.sin(5 * a)) - 0.05, Math.sin(a) * (0.12 + 0.04 * Math.cos(7 * a)), 0.06 * Math.sin(3 * a));
  });
  add('nucleoid', 'Vùng nhân (DNA vòng)', new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 120, 0.018, 6, true), mat('#2563eb')));
  const plasmid = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 8, 24), mat('#dc2626'));
  plasmid.position.set(0.36, 0.1, 0.12);
  add('plasmid', 'Plasmid', plasmid);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), mat('#334155'));
  hit.position.set(0, 0.06, 0.55);
  tagObject(hit, 'cell', 'Thước đo tế bào — chạm để ghi số liệu');
  root.add(hit);
  const readout = makeLabel('—');
  readout.position.set(0, 1.85, 0);
  root.add(readout);
  let part = 'all';
  let scale = 1;
  let target = 1;
  return {
    root,
    interactive: [hit, ...parts.values()],
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0.4, 1.4, 2.6),
    cameraTarget: new THREE.Vector3(0.1, 0.95, 0),
    update(v: SceneVisualState) {
      part = vis.str(v, 'part', 'all');
      const gramNeg = vis.num(v, 'gram') === 1;
      outer.visible = gramNeg;
      wall.scale.set(gramNeg ? 0.94 : 1.04, 1, gramNeg ? 0.94 : 1.04);
      (wall.material as THREE.MeshStandardMaterial).color.set(gramNeg ? '#f9a8d4' : '#6d28d9');
      (wall.material as THREE.MeshStandardMaterial).userData.baseEmissive = 0;
      target = 0.62 + 0.42 * Math.min(1, Math.log10(1 + vis.num(v, 'r', 0.5) * 3));
      setLabelText(readout, vis.str(v, 'readout', '—'));
    },
    tick(dt) {
      scale = ease(scale, target, dt);
      cell.scale.setScalar(scale);
      cell.rotation.y = 0.35 * Math.sin(performance.now() / 2600);
      const pulse = 1 + 0.08 * Math.sin(performance.now() / 160);
      for (const [id, obj] of parts) {
        const on = id === part;
        obj.scale.setScalar(on && id !== 'wall' && id !== 'membrane' && id !== 'capsule' ? pulse : 1);
        const mm = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm?.transparent) mm.opacity = on ? 0.7 : part === 'all' ? 0.3 : 0.12;
      }
    },
    dispose: () => disposeObject(root)
  };
}

/* ========================= BÀI 10 ========================= */
export function buildMembraneScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.6, 2));
  const Y = 0.95;
  const patch = new THREE.Group();
  patch.position.set(-0.45, Y, 0);
  root.add(patch);
  // Lớp kép phospholipid: 2 lớp đầu ưa nước
  const cols = 18;
  const rows = 8;
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#f59e0b'), cols * rows * 2);
  const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 5), mat('#fde68a'), cols * rows * 2);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      for (const s of [1, -1]) {
        const x = -0.8 + i * 0.094;
        const z = -0.33 + j * 0.094;
        m4.makeTranslation(x, s * 0.19, z);
        heads.setMatrixAt(n, m4);
        m4.makeTranslation(x, s * 0.09, z);
        tails.setMatrixAt(n, m4);
        n++;
      }
  patch.add(heads, tails);
  const channel = cyl(0.13, 0.13, 0.5, mat('#7c3aed', { transparent: true, opacity: 0.75 }), 18, true);
  const pump = cyl(0.14, 0.1, 0.5, mat('#dc2626', { transparent: true, opacity: 0.85 }), 18);
  const atp = makeLabel('ATP', { size: 34, bg: 'rgba(220,38,38,0.9)' });
  atp.position.set(0, -0.45, 0.2);
  patch.add(channel, pump, atp);
  const vesicle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), mat('#f59e0b', { transparent: true, opacity: 0.6 }));
  patch.add(vesicle);
  const lOut = makeLabel('Ngoài tế bào', { size: 30 });
  lOut.position.set(-0.55, 0.62, 0.2);
  const lIn = makeLabel('Trong tế bào', { size: 30 });
  lIn.position.set(-0.55, -0.55, 0.2);
  patch.add(lOut, lIn);
  const N = 40;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.032, 8, 6), new THREE.MeshBasicMaterial({ color: '#38bdf8' }), N);
  patch.add(dots);
  // Tế bào minh họa thẩm thấu
  const cell = new THREE.Group();
  cell.position.set(1.05, Y, 0.1);
  const wall = box(0.72, 0.72, 0.5, mat('#65a30d', { transparent: true, opacity: 0.22, depthWrite: false }));
  const proto = sphere(0.33, mat('#c084fc', { transparent: true, opacity: 0.7, depthWrite: false }), 24);
  const nucleus = sphere(0.09, mat('#6d28d9'), 16);
  cell.add(wall, proto, nucleus);
  tagObject(cell, 'cell', 'Tế bào quan sát — chạm để ghi số liệu');
  root.add(cell);
  const hitPatch = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.5, 0.85), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hitPatch.position.copy(patch.position);
  tagObject(hitPatch, 'membrane', 'Màng tế bào');
  root.add(hitPatch);
  const readout = makeLabel('—');
  readout.position.set(0.2, 1.85, 0);
  root.add(readout);
  let proc = 0;
  let rate = 0;
  let size = 1;
  let targetSize = 1;
  let animal = false;
  let time = 0;
  const anim = new Anim();
  let last = -1;
  return {
    root,
    interactive: [cell, hitPatch],
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0.25, 1.5, 3.5),
    cameraTarget: new THREE.Vector3(0.15, 0.85, 0),
    update(v, nonce) {
      proc = vis.num(v, 'process');
      rate = vis.num(v, 'rate');
      animal = vis.num(v, 'cell') === 1;
      targetSize = Math.cbrt(Math.max(0.3, 1 + vis.num(v, 'dV') / 100));
      channel.visible = proc === 1 || proc === 2;
      pump.visible = proc === 3;
      atp.visible = proc >= 3;
      vesicle.visible = proc >= 4;
      wall.visible = !animal;
      cell.visible = proc === 2;
      (proto.material as THREE.MeshStandardMaterial).color.set(animal ? '#f87171' : '#c084fc');
      (dots.material as THREE.MeshBasicMaterial).color.set(proc === 2 ? '#38bdf8' : proc === 3 ? '#facc15' : '#34d399');
      setLabelText(readout, vis.str(v, 'readout', '—'));
      if (nonce !== last) {
        last = nonce;
        anim.start(vis.num(v, 'animMs'));
      }
    },
    tick(dt) {
      time += dt;
      anim.tick(dt);
      size = ease(size, targetSize, dt * 0.5);
      proto.scale.setScalar(size * (animal ? 1.15 : 1));
      const dir = proc === 2 ? (targetSize >= 1 ? -1 : 1) : rate >= 0 ? -1 : 1;
      const speed = proc === 2 ? 0.25 : Math.min(0.6, 0.06 + Math.abs(rate) * 0.1);
      const gate = proc === 1 || proc === 2 || proc === 3;
      for (let i = 0; i < N; i++) {
        const crossing = i % 3 === 0;
        const u = (time * speed * (1 + (i % 5) * 0.12) + i / N) % 1;
        const sx = -0.78 + ((i * 53) % N) * 0.04;
        const sz = -0.3 + ((i * 29) % 20) * 0.03;
        let x = sx;
        let y: number;
        if (proc >= 4) {
          y = (i % 2 ? 0.3 : -0.3) + 0.12 * Math.sin(time + i);
        } else if (crossing && Math.abs(rate) + (proc === 2 ? 1 : 0) > 0.01) {
          y = dir < 0 ? 0.55 - u * 1.1 : -0.55 + u * 1.1;
          if (gate) x = sx * Math.min(1, Math.abs(y) * 2.2) * 0.9;
        } else y = (i % 2 ? 0.42 : -0.42) + 0.1 * Math.sin(time * 1.3 + i);
        m4.makeTranslation(x, y, sz * (gate && crossing ? Math.abs(y) * 1.6 : 1));
        dots.setMatrixAt(i, m4);
      }
      dots.instanceMatrix.needsUpdate = true;
      if (proc >= 4) {
        const u = (time * 0.3) % 1;
        vesicle.position.set(0, proc === 4 ? 0.45 - u * 0.9 : -0.45 + u * 0.9, 0);
        vesicle.scale.setScalar(0.6 + 0.4 * Math.sin(Math.PI * u));
      }
    },
    dispose: () => disposeObject(root)
  };
}

/* ========================= BÀI 12 ========================= */
export function buildSignalScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.8, 2));
  const Y = 0.95;
  const makeCell = (color: string): THREE.Group => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), mat(color, { transparent: true, opacity: 0.45, depthWrite: false })), sphere(0.15, mat('#6d28d9'), 18));
    return g;
  };
  const sender = makeCell('#38bdf8');
  sender.position.set(-1, Y, 0);
  tagObject(sender, 'sender', 'Tế bào phát tín hiệu');
  const target = makeCell('#f59e0b');
  tagObject(target, 'cell', 'Tế bào nhận — chạm để ghi đáp ứng');
  root.add(sender, target);
  const receptors = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.6 + (i / 8) * Math.PI * 0.8;
    const r = box(0.08, 0.04, 0.04, mat('#dc2626'));
    r.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0);
    r.rotation.z = a;
    receptors.add(r);
  }
  target.add(receptors);
  const vessel = cyl(0.2, 0.2, 1.1, mat('#ef4444', { transparent: true, opacity: 0.25 }), 20, true);
  vessel.rotation.z = Math.PI / 2;
  vessel.position.set(0, Y, 0);
  const bridge = cyl(0.1, 0.1, 0.3, mat('#22c55e', { transparent: true, opacity: 0.6 }), 16, true);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(-0.45, Y, 0);
  const axon = cyl(0.07, 0.13, 0.7, mat('#38bdf8', { transparent: true, opacity: 0.6 }), 16);
  axon.rotation.z = Math.PI / 2;
  axon.position.set(-0.5, Y, 0);
  root.add(vessel, bridge, axon);
  const N = 36;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde047' }), N);
  root.add(dots);
  const readout = makeLabel('—');
  readout.position.set(0, 1.85, 0);
  root.add(readout);
  const l1 = makeLabel('Tế bào phát', { size: 30 });
  l1.position.set(-1, Y - 0.6, 0.2);
  const l2 = makeLabel('Tế bào nhận', { size: 30 });
  root.add(l1, l2);
  const m4 = new THREE.Matrix4();
  let mode = 0;
  let has = true;
  let conc = 20;
  let resp = 0;
  let respTarget = 0;
  let stage = 0;
  let tx = 1;
  let time = 0;
  return {
    root,
    interactive: [sender, target],
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0.1, 1.4, 3.5),
    cameraTarget: new THREE.Vector3(0.1, 0.9, 0),
    update(v) {
      mode = vis.num(v, 'mode');
      has = vis.num(v, 'target') === 0;
      conc = vis.num(v, 'L', 20);
      stage = vis.num(v, 'stage');
      respTarget = vis.num(v, 'response');
      tx = mode === 0 ? -0.12 : mode === 2 ? 1.25 : mode === 1 ? 0.5 : 0.35;
      target.position.set(tx, Y, 0);
      l2.position.set(tx, Y - 0.6, 0.2);
      receptors.visible = has;
      vessel.visible = mode === 2;
      bridge.visible = mode === 0;
      axon.visible = mode === 3;
      setLabelText(readout, vis.str(v, 'readout', '—'));
    },
    tick(dt) {
      time += dt;
      resp = ease(resp, respTarget, dt * 0.6);
      const body = target.children[0] as THREE.Mesh;
      (body.material as THREE.MeshStandardMaterial).color.set('#f59e0b').lerp(new THREE.Color('#22c55e'), resp);
      const glow = stage === 1 ? 1 + 0.06 * Math.sin(time * 6) : 1;
      target.children[1].scale.setScalar(stage === 2 ? 1 + 0.25 * resp * (0.5 + 0.5 * Math.sin(time * 4)) : glow);
      receptors.scale.setScalar(stage === 0 ? 1 + 0.05 * Math.sin(time * 6) : 1);
      const count = Math.max(4, Math.min(N, Math.round(conc / 6) + 4));
      dots.count = count;
      const x0 = mode === 3 ? -0.15 : -0.6;
      const x1 = tx - (has ? 0.45 : 0.6);
      for (let i = 0; i < count; i++) {
        const u = (time * (mode === 2 ? 0.18 : mode === 3 ? 0.9 : 0.35) + i / count) % 1;
        const spread = mode === 1 ? 0.32 : mode === 2 ? 0.12 : 0.05;
        m4.makeTranslation(x0 + (x1 - x0) * u, Y + Math.sin(i * 2.4) * spread, Math.cos(i * 1.7) * spread);
        dots.setMatrixAt(i, m4);
      }
      dots.instanceMatrix.needsUpdate = true;
    },
    dispose: () => disposeObject(root)
  };
}
