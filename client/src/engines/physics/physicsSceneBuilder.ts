/**
 * engines/physics/physicsSceneBuilder.ts — Dựng cảnh 3D cho các bài Vật lí.
 *  - buildTrackScene  : máng nghiêng / đệm khí nằm ngang / giá rơi tự do thẳng đứng + cổng quang điện + đồng hồ hiện số.
 *  - buildCircuitScene: bảng mạch pin – khóa K – biến trở – R₀ – ampe kế – vôn kế, có hạt dòng điện chạy.
 * Đầu vào: sceneOptions của plugin. Đầu ra: SceneHandle (root, interactive, snapPoints, update, tick, dispose).
 * Trạng thái hiển thị (SceneVisualState) đọc từ solver: progress, animMs, readout, gateFlash, gatePos, massCount,
 * switchOn, current, rheostat, readoutA, readoutV, danger.
 */
import * as THREE from 'three';
import type { SceneOptions, SceneVisualState } from '../../types/lab';
import {
  Anim,
  box,
  cyl,
  disposeObject,
  makeBench,
  makeDisplay,
  makeLabel,
  makeSnapMarker,
  mat,
  setLabelText,
  sphere,
  tagObject,
  vis,
  type SceneHandle,
  type SnapPoint
} from '../sceneKit';

/* ======================================================================= */
/* MÁNG TRƯỢT / RƠI TỰ DO                                                    */
/* ======================================================================= */
export function buildTrackScene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4.2, 2));
  const orientation = String(options.orientation ?? 'incline');
  const vertical = orientation === 'vertical';
  const interactive: THREE.Object3D[] = [];
  const snapPoints: SnapPoint[] = [];

  // Hệ quy chiếu đường đi: start → end (theo trục của máng)
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const metal = mat('#94a3b8', { metalness: 0.7, roughness: 0.3 });
  const rail = new THREE.Group();

  if (vertical) {
    const pole = box(0.08, 2.1, 0.08, metal);
    pole.position.set(0, 1.05, -0.2);
    const base = box(0.6, 0.06, 0.5, mat('#334155'));
    base.position.set(0, 0.03, -0.1);
    const ruler = box(0.04, 1.9, 0.01, mat('#fde68a'));
    ruler.position.set(0.07, 1.0, -0.15);
    rail.add(pole, base, ruler);
    for (let i = 0; i <= 18; i++) {
      const tick = box(i % 2 ? 0.03 : 0.05, 0.004, 0.012, mat('#1f2937'));
      tick.position.set(0.07, 1.9 - i * 0.1, -0.14);
      rail.add(tick);
    }
    start.set(0, 1.85, 0);
    end.set(0, 0.15, 0);
    // Nam châm điện ở đỉnh (thẻ "release")
    const magnet = cyl(0.07, 0.07, 0.12, mat('#dc2626'));
    magnet.position.set(0, 1.98, 0);
    const arm = box(0.3, 0.04, 0.04, metal);
    arm.position.set(0, 2.05, -0.1);
    rail.add(arm);
    tagObject(magnet, 'release', 'Nam châm điện');
    rail.add(magnet);
    interactive.push(magnet);
  } else {
    const incline = orientation === 'incline';
    const len = 2.6;
    const angle = incline ? 0.16 : 0;
    const beam = box(len, 0.06, 0.16, metal);
    beam.rotation.z = -angle;
    beam.position.set(0, 0.35 + (incline ? 0.2 : 0), 0);
    rail.add(beam);
    const groove = box(len, 0.02, 0.05, mat(incline ? '#475569' : '#0ea5e9'));
    groove.rotation.z = -angle;
    groove.position.set(0, beam.position.y + 0.04, 0);
    rail.add(groove);
    for (const x of [-1.1, 1.1]) {
      const h = beam.position.y - Math.sin(angle) * x;
      const leg = box(0.05, h, 0.05, mat('#334155'));
      leg.position.set(x, h / 2, 0);
      rail.add(leg);
    }
    const dx = Math.cos(angle) * (len / 2 - 0.15);
    const dy = Math.sin(angle) * (len / 2 - 0.15);
    start.set(-dx, beam.position.y + dy + 0.09, 0);
    end.set(dx, beam.position.y - dy + 0.09, 0);
    if (!incline) {
      // Máy bơm đệm khí + ròng rọc & quả nặng
      const pump = box(0.35, 0.25, 0.3, mat('#0369a1'));
      pump.position.set(-1.6, 0.13, 0.55);
      rail.add(pump);
      const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 20), metal);
      pulley.position.set(1.33, beam.position.y + 0.06, 0);
      rail.add(pulley);
      const weight = cyl(0.05, 0.05, 0.12, mat('#78350f'));
      weight.position.set(1.4, 0.2, 0);
      weight.name = 'hangingWeight';
      rail.add(weight);
    }
  }
  root.add(rail);

  // Vật chuyển động (bi thép / xe trượt / trụ thép)
  const objLabel = String(options.objectLabel ?? 'Vật');
  let mover: THREE.Object3D;
  const massGroup = new THREE.Group();
  if (orientation === 'horizontal') {
    const cart = new THREE.Group();
    const body = box(0.3, 0.1, 0.2, mat('#f97316'));
    const flag = box(0.01, 0.12, 0.08, mat('#111827'));
    flag.position.set(0, 0.1, 0);
    cart.add(body, flag, massGroup);
    mover = cart;
  } else if (vertical) {
    mover = cyl(0.04, 0.04, 0.12, mat('#cbd5e1', { metalness: 0.8, roughness: 0.25 }));
  } else {
    mover = sphere(0.06, mat('#e5e7eb', { metalness: 0.9, roughness: 0.15 }), 20);
  }
  mover.position.copy(start);
  tagObject(mover, 'ball', objLabel);
  root.add(mover);
  interactive.push(mover);

  // Cổng quang điện (kéo thả vào điểm gắn)
  const gate = new THREE.Group();
  const gateM = mat('#1d4ed8');
  const postA = box(0.04, 0.3, 0.04, gateM);
  const postB = postA.clone();
  const top = box(0.04, 0.04, 0.34, gateM);
  postA.position.set(0, 0.15, -0.15);
  postB.position.set(0, 0.15, 0.15);
  top.position.set(0, 0.3, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.6 });
  const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6), beamMat);
  laser.rotation.x = Math.PI / 2;
  laser.position.set(0, 0.09, 0);
  gate.add(postA, postB, top, laser);
  if (vertical) gate.rotation.z = Math.PI / 2;
  gate.position.set(1.2, 0.02, 0.75);
  tagObject(gate, 'gate', String(options.gateLabel ?? 'Cổng quang điện'), true);
  root.add(gate);
  interactive.push(gate);

  // Điểm gắn cổng quang điện: gần cuối đường đi
  const gateTarget = vertical ? new THREE.Vector3(0.0, 0.6, 0) : end.clone().lerp(start, 0.12).setY(end.y - 0.12);
  const marker = makeSnapMarker();
  marker.position.copy(gateTarget);
  root.add(marker);
  const snap: SnapPoint = { id: 'gate-slot', position: gateTarget.clone(), accepts: 'gate', marker, filled: false };
  snapPoints.push(snap);

  // Đồng hồ đo thời gian hiện số
  const timer = new THREE.Group();
  const tBody = box(0.5, 0.28, 0.25, mat('#e5e7eb'));
  const display = makeDisplay(0.4, 0.13);
  display.mesh.position.set(0, 0.03, 0.127);
  const btn = cyl(0.025, 0.025, 0.02, mat('#16a34a'));
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0.17, -0.08, 0.13);
  timer.add(tBody, display.mesh, btn);
  timer.position.set(-1.3, 0.14, 0.7);
  timer.rotation.y = 0.35;
  tagObject(timer, 'timer', `Đồng hồ hiện số (chế độ ${String(options.timerMode ?? 'A')})`);
  root.add(timer);
  interactive.push(timer);

  const readoutLabel = makeLabel('0.000 s');
  readoutLabel.position.set(-1.3, 0.55, 0.7);
  root.add(readoutLabel);

  const anim = new Anim();
  let lastNonce = -1;
  let flash = 0;
  let gateFrac = 0.88;

  /** Vị trí của vật theo tiến trình p ∈ [0,1] (nhanh dần đều: quãng đường ∝ t²) */
  const place = (p: number): void => {
    const s = p * p;
    mover.position.lerpVectors(start, end, s);
    if (!vertical && orientation === 'incline') mover.rotation.z = -s * 25;
  };

  const handle: SceneHandle = {
    root,
    interactive,
    snapPoints,
    cameraPosition: vertical ? new THREE.Vector3(1.8, 1.4, 2.6) : new THREE.Vector3(0.4, 1.4, 3.1),
    cameraTarget: vertical ? new THREE.Vector3(0, 0.95, 0) : new THREE.Vector3(0, 0.35, 0),
    update(v: SceneVisualState, nonce: number) {
      display.set(vis.str(v, 'readout', '0.000 s').replace(' s', ''));
      setLabelText(readoutLabel, vis.str(v, 'readout', '0.000 s'));
      // Vị trí cổng quang điện trên giá thẳng đứng theo quãng đường s
      if (vertical && typeof v.gatePos === 'number') {
        const y = start.y - (start.y - end.y) * Math.min(1, (v.gatePos as number) / 0.85);
        snap.position.set(0, y, 0);
        marker.position.set(0, y, 0);
        if (snap.filled) gate.position.set(0, y - 0.09, 0);
        gateFrac = (start.y - y) / (start.y - end.y);
      }
      // Gia trọng trên xe
      const masses = vis.num(v, 'massCount', 0);
      if (massGroup.children.length !== masses) {
        disposeObject(massGroup);
        massGroup.clear();
        for (let i = 0; i < masses; i++) {
          const m = cyl(0.035, 0.035, 0.03, mat('#a16207', { metalness: 0.6 }));
          m.position.set(-0.1 + (i % 5) * 0.05, 0.07 + Math.floor(i / 5) * 0.035, 0.05);
          massGroup.add(m);
        }
      }
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        if (vis.num(v, 'progress') >= 1 && vis.num(v, 'animMs') > 0) anim.start(vis.num(v, 'animMs'));
        else {
          anim.reset();
          place(0);
        }
      }
    },
    tick(dt: number) {
      if (anim.active) {
        const p = anim.tick(dt);
        // Vật đi hết quãng đường tới cổng quang điện (đối với rơi tự do dừng tại cổng)
        place(vertical ? Math.sqrt(gateFrac) * Math.min(1, p) : p);
        if (p > 0.85 && flash <= 0) flash = 0.4;
      }
      if (flash > 0) flash -= dt;
      beamMat.color.set(flash > 0 ? '#22c55e' : '#ef4444');
      marker.visible = !snap.filled;
      (marker.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.4 * Math.sin(performance.now() / 200);
    },
    dispose() {
      disposeObject(root);
    }
  };
  return handle;
}

/* ======================================================================= */
/* MẠCH ĐIỆN                                                                 */
/* ======================================================================= */
export function buildCircuitScene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4, 2.2));
  const interactive: THREE.Object3D[] = [];
  const snapPoints: SnapPoint[] = [];

  const board = box(3, 0.04, 1.6, mat('#14532d', { roughness: 0.9 }));
  board.position.y = 0.02;
  root.add(board);

  // Pin
  const battery = new THREE.Group();
  const cell = cyl(0.12, 0.12, 0.5, mat('#1f2937'));
  cell.rotation.z = Math.PI / 2;
  const capP = cyl(0.04, 0.04, 0.05, mat('#d4d4d8', { metalness: 0.8 }));
  capP.rotation.z = Math.PI / 2;
  capP.position.x = 0.27;
  const band = cyl(0.122, 0.122, 0.12, mat('#eab308'));
  band.rotation.z = Math.PI / 2;
  band.position.x = 0.18;
  battery.add(cell, capP, band);
  battery.position.set(-0.9, 0.16, -0.45);
  tagObject(battery, 'battery', String(options.batteryLabel ?? 'Pin điện hóa'));
  root.add(battery);
  interactive.push(battery);
  const batLabel = makeLabel(String(options.batteryLabel ?? 'Pin'), { size: 32 });
  batLabel.position.set(-0.9, 0.42, -0.45);
  root.add(batLabel);

  // Khóa K
  const sw = new THREE.Group();
  const swBase = box(0.25, 0.04, 0.12, mat('#78350f'));
  const lever = box(0.24, 0.02, 0.03, mat('#d4d4d8', { metalness: 0.8 }));
  lever.position.set(-0.01, 0.06, 0);
  const pivot = new THREE.Group();
  pivot.position.set(-0.11, 0.04, 0);
  lever.position.set(0.11, 0.0, 0);
  pivot.add(lever);
  sw.add(swBase, pivot);
  sw.position.set(0.9, 0.06, -0.45);
  tagObject(sw, 'switch', 'Khóa K');
  root.add(sw);
  interactive.push(sw);

  // Biến trở con chạy
  const rheo = new THREE.Group();
  const coil = cyl(0.07, 0.07, 0.8, mat('#b45309', { metalness: 0.5 }), 16);
  coil.rotation.z = Math.PI / 2;
  const slideBar = box(0.84, 0.02, 0.02, mat('#9ca3af', { metalness: 0.8 }));
  slideBar.position.y = 0.13;
  const slider = box(0.05, 0.08, 0.1, mat('#1d4ed8'));
  slider.position.y = 0.1;
  rheo.add(coil, slideBar, slider);
  rheo.position.set(0.9, 0.12, 0.35);
  tagObject(rheo, 'rheostat', 'Biến trở R');
  root.add(rheo);
  interactive.push(rheo);

  // Điện trở bảo vệ R₀
  const r0 = new THREE.Group();
  const r0Body = cyl(0.04, 0.04, 0.22, mat('#e7d3a6'));
  r0Body.rotation.z = Math.PI / 2;
  r0.add(r0Body);
  for (const [i, c] of ['#8b4513', '#000000', '#ffd700'].entries()) {
    const b = cyl(0.042, 0.042, 0.02, mat(c));
    b.rotation.z = Math.PI / 2;
    b.position.x = -0.06 + i * 0.05;
    r0.add(b);
  }
  r0.position.set(-0.1, 0.08, 0.35);
  r0.visible = options.showR0 !== false;
  root.add(r0);

  // Đồng hồ đo (ampe kế cố định, vôn kế kéo thả)
  const meter = (label: string, color: string): { g: THREE.Group; disp: ReturnType<typeof makeDisplay> } => {
    const g = new THREE.Group();
    const body = box(0.36, 0.08, 0.28, mat(color));
    const disp = makeDisplay(0.28, 0.1);
    disp.mesh.rotation.x = -Math.PI / 2;
    disp.mesh.position.set(0, 0.041, -0.03);
    const l = makeLabel(label, { size: 30 });
    l.position.set(0, 0.2, 0);
    g.add(body, disp.mesh, l);
    return { g, disp };
  };
  const am = meter('A', '#dc2626');
  am.g.position.set(-0.9, 0.06, 0.35);
  tagObject(am.g, 'ammeter', 'Ampe kế (mắc nối tiếp)');
  root.add(am.g);
  interactive.push(am.g);
  const vm = meter('V', '#2563eb');
  vm.g.position.set(-1.4, 0.06, 0.85);
  tagObject(vm.g, 'voltmeter', 'Vôn kế (mắc song song với pin)', true);
  root.add(vm.g);
  interactive.push(vm.g);

  const vTarget = new THREE.Vector3(-0.9, 0.06, -0.05);
  const marker = makeSnapMarker();
  marker.position.copy(vTarget);
  root.add(marker);
  const snap: SnapPoint = { id: 'voltmeter-slot', position: vTarget.clone(), accepts: 'voltmeter', marker, filled: false };
  snapPoints.push(snap);

  // Dây nối (vòng mạch kín) + hạt dòng điện
  const loop = [
    new THREE.Vector3(-0.62, 0.1, -0.45),
    new THREE.Vector3(0.78, 0.1, -0.45),
    new THREE.Vector3(1.32, 0.1, -0.2),
    new THREE.Vector3(1.32, 0.1, 0.35),
    new THREE.Vector3(0.02, 0.1, 0.35),
    new THREE.Vector3(-0.72, 0.1, 0.35),
    new THREE.Vector3(-1.32, 0.1, 0.1),
    new THREE.Vector3(-1.32, 0.1, -0.45),
    new THREE.Vector3(-1.15, 0.1, -0.45)
  ];
  const curve = new THREE.CatmullRomCurve3(loop, false, 'catmullrom', 0.1);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.012, 6, false), mat('#ef4444'));
  root.add(wire);
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: '#fde047' }), 24);
  root.add(dots);
  const dangerLight = new THREE.PointLight('#ef4444', 0, 2);
  dangerLight.position.set(-0.9, 0.5, -0.45);
  root.add(dangerLight);

  let switchOn = false;
  let current = 0;
  let phase = 0;
  let danger = false;
  const m4 = new THREE.Matrix4();

  return {
    root,
    interactive,
    snapPoints,
    cameraPosition: new THREE.Vector3(0, 2.2, 2.4),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    update(v: SceneVisualState) {
      switchOn = vis.bool(v, 'switchOn');
      current = vis.num(v, 'current');
      danger = vis.bool(v, 'danger');
      am.disp.set(vis.str(v, 'readoutA', '0.000 A').replace(' A', ''), '#f87171');
      vm.disp.set(snap.filled ? vis.str(v, 'readoutV', '---').replace(' V', '') : '---', '#60a5fa');
      slider.position.x = -0.4 + 0.8 * Math.min(1, Math.max(0, vis.num(v, 'rheostat')));
      pivot.rotation.z = switchOn ? 0 : 0.6;
    },
    tick(dt: number) {
      phase += dt * (0.05 + current * 1.5);
      dots.count = switchOn ? 24 : 0;
      for (let i = 0; i < dots.count; i++) {
        const p = curve.getPointAt((phase + i / 24) % 1);
        m4.makeTranslation(p.x, p.y + 0.01, p.z);
        dots.setMatrixAt(i, m4);
      }
      dots.instanceMatrix.needsUpdate = true;
      dangerLight.intensity = danger ? 2 + Math.sin(performance.now() / 80) : 0;
      marker.visible = !snap.filled;
    },
    dispose() {
      disposeObject(root);
    }
  };
}
