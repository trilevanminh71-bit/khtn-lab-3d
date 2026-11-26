/**
 * engines/physics/practicalSceneBuilder.ts — Cảnh 3D cho 4 bài thực hành Vật lí 10.
 *  - buildMc964Scene     (Bài 6) : máng nghiêng có thước, nam châm N, bi thép, cổng quang điện E và F TRƯỢT dọc máng, đồng hồ MC964
 *  - buildFreeFall2Scene (Bài 11): giá thẳng đứng, nam châm điện, trụ thép, hai cổng quang điện
 *  - buildForceScene     (Bài 22): bảng từ – lực kế (đồng quy) và thanh treo quả nặng (song song)
 *  - buildAirtrackScene  (Bài 30): băng đệm khí, hai xe có tấm cản quang 0,1 m, hai cổng quang điện
 * Vật kéo trượt theo trục dùng userData.slide (đọc bởi ThreeEngineCore) → cập nhật tham số của bài.
 */
import * as THREE from 'three';
import type { SceneOptions, SceneVisualState } from '../../types/lab';
import { Anim, box, cyl, disposeObject, makeBench, makeDisplay, makeLabel, makeSnapMarker, mat, setLabelText, sphere, tagObject, vis, type SceneHandle, type SlideSpec, type SnapPoint } from '../sceneKit';

const metal = (): THREE.MeshStandardMaterial => mat('#94a3b8', { metalness: 0.7, roughness: 0.3 });

const BEAM_IDLE = '#7f1d1d';
/** Tia cổng quang điện: bị chắn → chớp đỏ sáng */
function setBeam(m: THREE.MeshBasicMaterial, blocked: boolean): void {
  m.color.set(blocked ? '#ff3b3b' : BEAM_IDLE);
  m.opacity = blocked ? 1 : 0.35;
}

/** Vệt quỹ đạo: đường nối các vị trí đã qua của vật chuyển động */
class Trail {
  readonly line: THREE.Line;
  private pts: Float32Array;
  private n = 0;
  constructor(max = 160, color = '#fbbf24') {
    this.pts = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pts, 3));
    g.setDrawRange(0, 0);
    this.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    this.line.frustumCulled = false;
  }
  clear(): void {
    this.n = 0;
    this.line.geometry.setDrawRange(0, 0);
  }
  push(p: THREE.Vector3): void {
    if (this.n * 3 >= this.pts.length) return;
    this.pts.set([p.x, p.y, p.z], this.n * 3);
    this.n++;
    const attr = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.line.geometry.setDrawRange(0, this.n);
  }
}

/** Số hiển thị trên đồng hồ khi đang đếm: cùng số chữ số thập phân với kết quả cuối */
function counting(value: number, final: string): string {
  const dec = final.split('.')[1]?.length ?? 3;
  return Math.max(0, value).toFixed(dec);
}

/** Cổng quang điện dạng chữ U, tia sáng đỏ; trả về vật liệu tia để nháy khi bị chắn */
function makeGate(color: string, name: string): { g: THREE.Group; beam: THREE.MeshBasicMaterial } {
  const g = new THREE.Group();
  const m = mat(color);
  const a = box(0.035, 0.3, 0.035, m);
  a.position.set(0, 0.05, -0.15);
  const b = box(0.035, 0.3, 0.035, m);
  b.position.set(0, 0.05, 0.15);
  const top = box(0.035, 0.035, 0.335, m);
  top.position.set(0, 0.2, 0);
  const beam = new THREE.MeshBasicMaterial({ color: BEAM_IDLE, transparent: true, opacity: 0.35 });
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 6), beam);
  ray.rotation.x = Math.PI / 2;
  const label = makeLabel(name, { size: 34 });
  label.position.set(0, 0.32, 0);
  g.add(a, b, top, ray, label);
  return { g, beam };
}

/** Thước có vạch chia dọc trục x, dài len (đơn vị cảnh), 0–100 cm */
function makeRuler(len: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(len, 0.012, 0.05, mat('#fde68a')));
  for (let i = 0; i <= 20; i++) {
    const t = box(0.004, 0.004, i % 2 ? 0.02 : 0.035, mat('#1f2937'));
    t.position.set(-len / 2 + (len * i) / 20, 0.008, 0.005);
    g.add(t);
  }
  for (const cm of [0, 50, 100]) {
    const l = makeLabel(`${cm}`, { size: 30 });
    l.scale.multiplyScalar(0.6);
    l.position.set(-len / 2 + (len * cm) / 100, 0.06, 0.06);
    g.add(l);
  }
  return g;
}

/** Đồng hồ đo thời gian hiện số MC964 với nhãn chế độ và nút RESET */
function makeMc964(title: string): { g: THREE.Group; display: ReturnType<typeof makeDisplay>; mode: THREE.Sprite; reset: THREE.Object3D } {
  const g = new THREE.Group();
  g.add(box(0.62, 0.3, 0.28, mat('#e5e7eb')));
  const display = makeDisplay(0.36, 0.14);
  display.mesh.position.set(-0.08, 0.04, 0.142);
  const reset = cyl(0.03, 0.03, 0.03, mat('#dc2626'));
  reset.rotation.x = Math.PI / 2;
  reset.position.set(0.22, 0.06, 0.15);
  tagObject(reset, 'reset', 'Nút RESET');
  const knob = cyl(0.035, 0.035, 0.03, mat('#1f2937'));
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.22, -0.07, 0.15);
  const mode = makeLabel(title, { size: 30 });
  mode.position.set(0, 0.26, 0.1);
  g.add(display.mesh, reset, knob, mode);
  return { g, display, mode, reset };
}

/* ========================= BÀI 6 ========================= */
export function buildMc964Scene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4.2, 2));
  const interactive: THREE.Object3D[] = [];
  const len = 2.6;
  // Máng nghiêng: nhóm xoay quanh đầu dưới; trục x cục bộ chạy từ N (trái, cao) xuống phải
  const incline = new THREE.Group();
  incline.position.set(len / 2, 0.22, 0);
  root.add(incline);
  const beam = box(len + 0.1, 0.05, 0.14, metal());
  beam.position.set(-len / 2, 0, 0);
  const groove = box(len, 0.012, 0.045, mat('#475569'));
  groove.position.set(-len / 2, 0.03, 0);
  const ruler = makeRuler(len);
  ruler.position.set(-len / 2, 0.01, 0.1);
  incline.add(beam, groove, ruler);
  const legHigh = box(0.05, 1, 0.1, mat('#334155'));
  const legLow = box(0.05, 0.22, 0.1, mat('#334155'));
  legLow.position.set(len / 2, 0.11, 0);
  root.add(legHigh, legLow);

  const magnet = box(0.1, 0.14, 0.12, mat('#dc2626'));
  magnet.position.set(-len - 0.06, 0.1, 0);
  tagObject(magnet, 'release', 'Nam châm điện N');
  incline.add(magnet);
  const magLabel = makeLabel('N', { size: 34 });
  magLabel.position.set(-len - 0.06, 0.28, 0);
  incline.add(magLabel);

  const ball = sphere(0.055, mat('#e5e7eb', { metalness: 0.9, roughness: 0.15 }), 20);
  tagObject(ball, 'ball', String(options.objectLabel ?? 'Viên bi thép'));
  incline.add(ball);

  const E = makeGate('#1d4ed8', 'E');
  const F = makeGate('#0f766e', 'F');
  incline.add(E.g, F.g);
  const slideOf = (param: string): SlideSpec => ({ param, start: new THREE.Vector3(-len, 0.1, 0), end: new THREE.Vector3(0, 0.1, 0), min: 0, max: 100 });
  tagObject(E.g, 'gate-e', 'Cổng quang điện E — kéo để trượt');
  tagObject(F.g, 'gate-f', 'Cổng quang điện F — kéo để trượt');
  E.g.userData.slide = slideOf('xE');
  F.g.userData.slide = slideOf('xF');

  const mc = makeMc964('MC964');
  mc.g.position.set(-0.6, 0.15, 0.75);
  mc.g.rotation.y = 0.2;
  tagObject(mc.g, 'timer', 'Đồng hồ đo thời gian hiện số MC964');
  mc.reset.userData.tag = 'reset';
  root.add(mc.g);
  interactive.push(magnet, ball, E.g, F.g, mc.g);

  const anim = new Anim();
  let lastNonce = -1;
  let xE = 20;
  let xF = 70;
  let shown = '0.000';
  let modeText = '';
  let ballD = 2;
  const trail = new Trail();
  incline.add(trail.line);
  const xOf = (cm: number): number => -len + (len * cm) / 100;
  const place = (cm: number): void => {
    ball.position.set(xOf(cm), 0.09, 0);
    ball.rotation.z = -cm * 0.6;
  };
  place(0);
  return {
    root,
    interactive,
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0.2, 1.5, 3.1),
    cameraTarget: new THREE.Vector3(0, 0.4, 0),
    react(tag) {
      if (tag === 'reset') mc.display.set('0.000');
    },
    update(v: SceneVisualState, nonce: number) {
      const ang = (vis.num(v, 'angle', 6) * Math.PI) / 180;
      incline.rotation.z = -ang;
      const top = 0.22 + Math.sin(ang) * len;
      legHigh.scale.y = top;
      legHigh.position.set(len / 2 - Math.cos(ang) * len, top / 2, 0);
      xE = vis.num(v, 'xE', 20);
      xF = vis.num(v, 'xF', 70);
      E.g.position.set(xOf(xE), 0.1, 0);
      F.g.position.set(xOf(xF), 0.1, 0);
      const s = vis.num(v, 'ballD', 2) / 2;
      ball.scale.setScalar(s);
      shown = vis.str(v, 'readout', '0.000');
      modeText = vis.str(v, 'mode', 'MC964');
      ballD = vis.num(v, 'ballD', 2);
      setLabelText(mc.mode, modeText, { size: 30 });
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        trail.clear();
        if (vis.num(v, 'animMs') > 0) {
          anim.start(vis.num(v, 'animMs'));
          mc.display.set(counting(0, shown));
          place(0);
        } else {
          anim.reset();
          place(0);
          mc.display.set(shown);
        }
      } else if (!anim.active && vis.num(v, 'animMs') === 0) {
        place(0);
        mc.display.set(shown);
      }
    },
    tick(dt) {
      if (anim.active) {
        const q = anim.tick(dt);
        const cm = q * q * 100;
        place(cm);
        trail.push(ball.position);
        // Đồng hồ chạy số theo thời gian thực của hoạt cảnh (q tỉ lệ với thời gian: x = 100·q²)
        const final = Number(shown);
        const r = ballD / 2;
        if (modeText.includes('↔')) {
          const qE = Math.sqrt(xE / 100);
          const qF = Math.sqrt(xF / 100);
          mc.display.set(q < qE ? counting(0, shown) : q < qF ? counting(((q - qE) / (qF - qE)) * final, shown) : shown);
        } else {
          const x = modeText.endsWith('B') ? xF : xE;
          const q0 = Math.sqrt(Math.max(0, x - r) / 100);
          const q1 = Math.sqrt((x + r) / 100);
          mc.display.set(q < q0 ? counting(0, shown) : q < q1 ? counting(((q - q0) / (q1 - q0)) * final, shown) : shown);
        }
        if (!anim.active) mc.display.set(shown);
        setBeam(E.beam, Math.abs(cm - xE) < r);
        setBeam(F.beam, Math.abs(cm - xF) < r);
      } else {
        setBeam(E.beam, false);
        setBeam(F.beam, false);
      }
    },
    dispose: () => disposeObject(root)
  };
}

/* ========================= BÀI 11 ========================= */
export function buildFreeFall2Scene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.2, 2));
  const H = 1.9; // 100 cm ↔ 1,9 đơn vị
  const topY = 2.0;
  const y = (cm: number): number => topY - (cm / 100) * H;
  const pole = box(0.07, 2.25, 0.07, metal());
  pole.position.set(0, 1.12, -0.25);
  const base = box(0.6, 0.06, 0.6, mat('#334155'));
  base.position.set(0, 0.03, -0.1);
  root.add(pole, base);
  const ruler = makeRuler(H);
  ruler.rotation.z = -Math.PI / 2;
  ruler.position.set(0.09, topY - H / 2, -0.2);
  root.add(ruler);
  const magnet = cyl(0.07, 0.07, 0.12, mat('#dc2626'));
  magnet.position.set(0, topY + 0.15, 0);
  const arm = box(0.05, 0.04, 0.3, metal());
  arm.position.set(0, topY + 0.2, -0.12);
  tagObject(magnet, 'release', 'Nam châm điện N');
  root.add(magnet, arm);
  const body = cyl(0.035, 0.035, 0.12, mat('#cbd5e1', { metalness: 0.8, roughness: 0.25 }));
  tagObject(body, 'ball', 'Trụ thép');
  root.add(body);
  const E = makeGate('#1d4ed8', 'E');
  const F = makeGate('#0f766e', 'F');
  tagObject(E.g, 'gate-e', 'Cổng quang điện E (sát điểm thả)');
  tagObject(F.g, 'gate-f', 'Cổng quang điện F — kéo để trượt');
  root.add(E.g, F.g);
  F.g.userData.slide = { param: 's', start: new THREE.Vector3(0, y(0), 0), end: new THREE.Vector3(0, y(100), 0), min: 0, max: 100 } satisfies SlideSpec;
  const tray = cyl(0.16, 0.12, 0.08, mat('#78350f'));
  tray.position.set(0, 0.1, 0);
  root.add(tray);
  const mc = makeMc964('MODE A ↔ B');
  mc.g.position.set(-1, 0.15, 0.5);
  mc.g.rotation.y = 0.35;
  tagObject(mc.g, 'timer', 'Đồng hồ MC964 (MODE A ↔ B)');
  mc.reset.userData.tag = 'reset';
  root.add(mc.g);
  const anim = new Anim();
  let lastNonce = -1;
  let shown = '0.000';
  let s = 50;
  const trail = new Trail(160, '#fbbf24');
  root.add(trail.line);
  const start = topY + 0.02;
  body.position.set(0, start, 0);
  return {
    root,
    interactive: [magnet, body, E.g, F.g, mc.g],
    snapPoints: [],
    cameraPosition: new THREE.Vector3(1.6, 1.5, 3),
    cameraTarget: new THREE.Vector3(-0.1, 1, 0),
    react(tag) {
      if (tag === 'reset') mc.display.set('0.000');
    },
    update(v, nonce) {
      s = vis.num(v, 's', 50);
      E.g.position.set(0, start - 0.06 - (vis.num(v, 'x0') / 1000) * H, 0);
      F.g.position.set(0, y(s) - 0.04, 0);
      shown = vis.str(v, 'readout', '0.000');
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        body.position.y = start;
        trail.clear();
        if (vis.num(v, 'animMs') > 0) {
          anim.start(vis.num(v, 'animMs') * 1.15);
          mc.display.set(counting(0, shown));
        } else {
          anim.reset();
          mc.display.set(shown);
        }
      } else if (!anim.active && vis.num(v, 'animMs') === 0) {
        body.position.y = start;
        mc.display.set(shown);
      }
    },
    tick(dt) {
      if (!anim.active) {
        setBeam(F.beam, false);
        setBeam(E.beam, false);
        return;
      }
      const q = anim.tick(dt) * 1.15;
      const cm = s * q * q;
      body.position.y = Math.max(0.2, start - (cm / 100) * H);
      trail.push(new THREE.Vector3(0.06, body.position.y, 0));
      // Đồng hồ chạy số: E sát điểm thả nên thời gian tỉ lệ với q
      mc.display.set(q >= 1 ? shown : counting(q * Number(shown), shown));
      setBeam(E.beam, q < 0.12);
      setBeam(F.beam, Math.abs(q - 1) < 0.06);
    },
    dispose: () => disposeObject(root)
  };
}

/* ========================= BÀI 22 ========================= */
/** Mũi tên lực trong mặt phẳng bảng: gốc, độ dài, góc (rad) */
class ForceArrow {
  readonly g = new THREE.Group();
  private shaft: THREE.Mesh;
  private head: THREE.Mesh;
  readonly label: THREE.Sprite;
  constructor(color: string, text: string) {
    const m = mat(color, { emissive: color, emissiveIntensity: 0.25 });
    this.shaft = cyl(0.014, 0.014, 1, m, 8);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), m);
    this.label = makeLabel(text, { size: 34 });
    this.g.add(this.shaft, this.head, this.label);
  }
  set(origin: THREE.Vector3, length: number, angle: number): void {
    const L = Math.max(0.02, length);
    this.g.position.copy(origin);
    this.g.rotation.z = angle - Math.PI / 2;
    this.shaft.scale.y = Math.max(0.01, L - 0.08);
    this.shaft.position.y = (L - 0.08) / 2;
    this.head.position.y = L - 0.05;
    this.label.position.y = L + 0.1;
  }
}
const FORCE_UNIT = 0.11; // đơn vị cảnh trên 1 N

export function buildForceScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.8, 1.8));
  const interactive: THREE.Object3D[] = [];
  const boardY = 1.05;
  const board = box(2.4, 1.9, 0.04, mat('#f8fafc', { roughness: 0.9 }));
  board.position.set(0, boardY, -0.25);
  tagObject(board, 'board', 'Bảng thí nghiệm — chạm để đọc lực kế');
  root.add(board);
  interactive.push(board);
  const O = new THREE.Vector3(0, boardY + 0.1, -0.2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24), mat('#dc2626'));
  ring.position.copy(O);
  tagObject(ring, 'ring', 'Vòng dây tại điểm đồng quy O');
  root.add(ring);
  interactive.push(ring);
  const lo = makeLabel('O', { size: 32 });
  lo.position.copy(O).add(new THREE.Vector3(-0.12, 0.1, 0.02));
  root.add(lo);
  const a1 = new ForceArrow('#2a78d6', 'F₁');
  const a2 = new ForceArrow('#d95926', 'F₂');
  const aR = new ForceArrow('#0f9d58', 'F');
  root.add(a1.g, a2.g, aR.g);
  const lineMat = new THREE.LineDashedMaterial({ color: '#334155', dashSize: 0.04, gapSize: 0.03 });
  const para = new THREE.Line(new THREE.BufferGeometry().setFromPoints([O, O, O]), lineMat);
  root.add(para);
  // Thanh AB cho lực song song
  const bar = box(1, 0.035, 0.035, mat('#a16207'));
  root.add(bar);
  // Lực kế kéo vào điểm O
  const dyn = new THREE.Group();
  const tube = cyl(0.05, 0.05, 0.45, mat('#e0f2fe', { transparent: true, opacity: 0.7 }));
  tube.position.y = 0.22;
  const spring = cyl(0.02, 0.02, 0.3, mat('#f59e0b'));
  spring.position.y = 0.2;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16), metal());
  dyn.add(tube, spring, hook);
  dyn.position.set(1.35, 0.02, 0.45);
  tagObject(dyn, 'dynamometer', 'Lực kế — kéo vào điểm O', true);
  root.add(dyn);
  interactive.push(dyn);
  const target = new THREE.Vector3(0.55, 0.02, 0.15);
  const marker = makeSnapMarker();
  marker.position.copy(target).setY(0.04);
  root.add(marker);
  const snap: SnapPoint = { id: 'scale-slot', position: target.clone(), accepts: 'dynamometer', marker, filled: false };
  const readout = makeLabel('— N');
  readout.position.set(0, boardY + 1.08, -0.15);
  root.add(readout);
  return {
    root,
    interactive,
    snapPoints: [snap],
    cameraPosition: new THREE.Vector3(0.2, 1.35, 3),
    cameraTarget: new THREE.Vector3(0, 1, 0),
    update(v) {
      const mode = vis.num(v, 'mode');
      const F1 = vis.num(v, 'F1', 3);
      const F2 = vis.num(v, 'F2', 4);
      const measured = vis.bool(v, 'measured');
      setLabelText(readout, `Lực kế: ${vis.str(v, 'readout', '— N')}`);
      para.visible = mode === 0;
      bar.visible = mode === 1;
      ring.visible = true;
      aR.g.visible = measured;
      if (mode === 0) {
        const al = (vis.num(v, 'alpha', 90) * Math.PI) / 180;
        const base = Math.PI / 2 - al / 2;
        const th1 = base + al;
        const th2 = base;
        a1.set(O, F1 * FORCE_UNIT, th1);
        a2.set(O, F2 * FORCE_UNIT, th2);
        const v1 = new THREE.Vector3(Math.cos(th1), Math.sin(th1), 0).multiplyScalar(F1 * FORCE_UNIT);
        const v2 = new THREE.Vector3(Math.cos(th2), Math.sin(th2), 0).multiplyScalar(F2 * FORCE_UNIT);
        const sum = v1.clone().add(v2);
        aR.set(O, vis.num(v, 'Ftn') * FORCE_UNIT, Math.atan2(sum.y, sum.x));
        para.geometry.setFromPoints([O.clone().add(v1), O.clone().add(sum), O.clone().add(v2)]);
        para.computeLineDistances();
        ring.position.copy(O);
        lo.position.copy(O).add(new THREE.Vector3(-0.12, -0.1, 0.02));
      } else {
        const AB = vis.num(v, 'AB', 40) / 40;
        const d1 = (vis.num(v, 'd1', 20) / Math.max(1, vis.num(v, 'AB', 40))) * AB;
        const A = new THREE.Vector3(-AB / 2, boardY + 0.5, -0.2);
        bar.scale.x = AB;
        bar.position.copy(A).setX(0);
        a1.set(A, F1 * FORCE_UNIT, -Math.PI / 2);
        a2.set(A.clone().setX(AB / 2), F2 * FORCE_UNIT, -Math.PI / 2);
        const P = A.clone().setX(-AB / 2 + d1);
        aR.set(P, vis.num(v, 'Ftn') * FORCE_UNIT, -Math.PI / 2);
        ring.position.copy(P);
        lo.position.copy(P).add(new THREE.Vector3(0, 0.12, 0.02));
      }
    },
    tick() {
      marker.visible = !snap.filled;
    },
    dispose: () => disposeObject(root)
  };
}

/* ========================= BÀI 30 ========================= */
export function buildAirtrackScene(): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4.4, 1.8));
  const trackY = 0.4;
  const rail = box(3.6, 0.1, 0.2, mat('#0ea5e9', { metalness: 0.3 }));
  rail.position.y = trackY;
  root.add(rail);
  for (const x of [-1.5, 1.5]) {
    const leg = box(0.1, trackY, 0.3, mat('#334155'));
    leg.position.set(x, trackY / 2, 0);
    root.add(leg);
  }
  const pump = box(0.4, 0.28, 0.32, mat('#0369a1'));
  pump.position.set(-1.6, 0.14, 0.6);
  tagObject(pump, 'pump', 'Bơm nén khí');
  const launcher = box(0.12, 0.2, 0.22, mat('#dc2626'));
  launcher.position.set(-1.78, trackY + 0.12, 0);
  tagObject(launcher, 'launcher', 'Bộ đẩy xe 1');
  root.add(pump, launcher);
  const cart = (color: string, name: string): { g: THREE.Group; body: THREE.Mesh } => {
    const g = new THREE.Group();
    const body = box(0.26, 0.1, 0.24, mat(color));
    body.position.y = 0.08;
    const flag = box(0.1, 0.14, 0.01, mat('#111827'));
    flag.position.y = 0.2;
    const l = makeLabel(name, { size: 32 });
    l.position.y = 0.38;
    g.add(body, flag, l);
    g.position.y = trackY + 0.04;
    return { g, body };
  };
  const c1 = cart('#f97316', 'Xe 1');
  const c2 = cart('#8b5cf6', 'Xe 2');
  tagObject(c1.g, 'cart1', 'Xe 1 (tấm cản quang L = 0,1 m)');
  tagObject(c2.g, 'cart2', 'Xe 2 (tấm cản quang L = 0,1 m)');
  root.add(c1.g, c2.g);
  const G1 = makeGate('#1d4ed8', 'Cổng 1');
  const G2 = makeGate('#0f766e', 'Cổng 2');
  G1.g.position.set(-0.75, trackY + 0.22, 0);
  G2.g.position.set(2.0, 0.1, 0.65);
  tagObject(G1.g, 'gate1', 'Cổng quang điện 1');
  tagObject(G2.g, 'gate', 'Cổng quang điện 2 — kéo vào điểm gắn', true);
  root.add(G1.g, G2.g);
  const target = new THREE.Vector3(0.85, trackY + 0.22, 0);
  const marker = makeSnapMarker();
  marker.position.copy(target).setY(trackY + 0.08);
  root.add(marker);
  const snap: SnapPoint = { id: 'gate-slot', position: target.clone(), accepts: 'gate', marker, filled: false };
  const mc = makeMc964('Đồng hồ hiện số');
  mc.g.position.set(0.2, 0.15, 0.72);
  tagObject(mc.g, 'timer', 'Đồng hồ đo thời gian hiện số');
  mc.reset.userData.tag = 'reset';
  root.add(mc.g);
  const anim = new Anim();
  let lastNonce = -1;
  let cur: SceneVisualState = {};
  const home1 = -1.35;
  const home2 = 0.1;
  const gap = 0.27;
  /** Vị trí hai xe theo tiến trình q: chuyển động đều → va chạm ở q = 0,5 → chuyển động đều */
  const place = (q: number): void => {
    const v1 = vis.num(cur, 'v1', 0.5);
    const v2 = vis.num(cur, 'v2');
    const u1 = vis.num(cur, 'u1');
    const u2 = vis.num(cur, 'u2');
    const rel = Math.max(0.05, v1 - v2);
    const tHit = (home2 - home1 - gap) / rel;
    const x2Hit = home2 + v2 * tHit;
    if (q <= 0.5) {
      const t = (q / 0.5) * tHit;
      c1.g.position.x = home1 + v1 * t;
      c2.g.position.x = home2 + v2 * t;
    } else {
      const t = ((q - 0.5) / 0.5) * Math.min(tHit, 1.5 / Math.max(0.1, Math.abs(u2), Math.abs(u1)));
      c1.g.position.x = x2Hit - gap + u1 * t;
      c2.g.position.x = x2Hit + u2 * t;
    }
    c1.g.position.x = Math.max(-1.6, Math.min(1.5, c1.g.position.x));
    c2.g.position.x = Math.max(-1.3, Math.min(1.72, c2.g.position.x));
  };
  const near = (g: THREE.Group): boolean => Math.abs(c1.g.position.x - g.position.x) < 0.06 || Math.abs(c2.g.position.x - g.position.x) < 0.06;
  return {
    root,
    interactive: [pump, launcher, c1.g, c2.g, G1.g, G2.g, mc.g],
    snapPoints: [snap],
    cameraPosition: new THREE.Vector3(0, 1.4, 3.2),
    cameraTarget: new THREE.Vector3(0, 0.4, 0),
    react(tag) {
      if (tag === 'reset') mc.display.set('0.000');
    },
    update(v, nonce) {
      cur = v;
      c1.body.scale.set(1, 0.7 + vis.num(v, 'm1', 300) / 500, 1);
      c2.body.scale.set(1, 0.7 + vis.num(v, 'm2', 200) / 500, 1);
      mc.display.set(vis.str(v, 'readout', '0.000'));
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        if (vis.num(v, 'animMs') > 0) anim.start(vis.num(v, 'animMs'));
        else {
          anim.reset();
          place(0);
        }
      } else if (!anim.active && vis.num(v, 'animMs') === 0) place(0);
    },
    tick(dt) {
      if (anim.active) place(anim.tick(dt));
      setBeam(G1.beam, near(G1.g));
      setBeam(G2.beam, snap.filled && near(G2.g));
      marker.visible = !snap.filled;
    },
    dispose: () => disposeObject(root)
  };
}
