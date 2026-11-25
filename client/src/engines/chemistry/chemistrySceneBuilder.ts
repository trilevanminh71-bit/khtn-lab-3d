/**
 * engines/chemistry/chemistrySceneBuilder.ts — Dựng cảnh 3D cho các bài Hóa học (và bài enzyme dạng ống nghiệm).
 *  - buildBeakerScene   : các biến thể "beaker" (cốc + giấy dấu X), "flask-syringe" (bình + xi lanh thu khí),
 *                         "calorimeter" (cốc xốp + nhiệt kế), "tubes" (giá ống nghiệm + bể ổn nhiệt).
 *  - buildTitrationScene: giá đỡ, burette có khóa, bình nón, chai sulfuric acid, giọt rơi.
 * Trạng thái đọc từ solver: liquidColor, liquidLevel, turbidity, bubbles, temperature, gasVolume, tubeColor,
 * readout, animMs, burettePercent, flaskColor, drip.
 */
import * as THREE from 'three';
import type { SceneOptions, SceneVisualState } from '../../types/lab';
import {
  Anim,
  box,
  cyl,
  disposeObject,
  glassMat,
  lerp,
  makeBench,
  makeBubbles,
  makeLabel,
  makeSnapMarker,
  mat,
  setLabelText,
  tagObject,
  vis,
  type SceneHandle,
  type SnapPoint
} from '../sceneKit';

/** Bình nón (erlenmeyer) bằng LatheGeometry — profile xoay quanh trục y */
function makeFlaskGeometry(scale = 1): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.21, 0.02),
    new THREE.Vector2(0.07, 0.3),
    new THREE.Vector2(0.06, 0.42),
    new THREE.Vector2(0.065, 0.44)
  ].map((p) => p.multiplyScalar(scale));
  return new THREE.LatheGeometry(pts, 24);
}

/** Chai hóa chất có nhãn */
function makeBottle(label: string, color: string, tag: string, title: string): THREE.Group {
  const g = new THREE.Group();
  const body = cyl(0.11, 0.11, 0.32, mat(color, { transparent: true, opacity: 0.85 }));
  body.position.y = 0.16;
  const neck = cyl(0.04, 0.06, 0.08, mat(color));
  neck.position.y = 0.36;
  const cap = cyl(0.045, 0.045, 0.05, mat('#111827'));
  cap.position.y = 0.42;
  const sticker = box(0.16, 0.12, 0.005, mat('#f8fafc'));
  sticker.position.set(0, 0.17, 0.11);
  const l = makeLabel(label, { size: 30 });
  l.position.set(0, 0.6, 0);
  g.add(body, neck, cap, sticker, l);
  tagObject(g, tag, title);
  return g;
}

function makeThermometer(): { g: THREE.Group; setTemp(t: number): void } {
  const g = new THREE.Group();
  const tube = cyl(0.012, 0.012, 0.6, glassMat(), 10);
  tube.position.y = 0.3;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), mat('#dc2626'));
  const colMat = mat('#dc2626', { emissive: '#7f1d1d' });
  const col = cyl(0.006, 0.006, 1, colMat, 6);
  g.add(tube, bulb, col);
  const setTemp = (t: number): void => {
    const h = Math.max(0.02, Math.min(0.58, ((t + 10) / 110) * 0.58));
    col.scale.y = h;
    col.position.y = h / 2;
  };
  setTemp(25);
  return { g, setTemp };
}

/* ======================================================================= */
export function buildBeakerScene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.6, 2));
  const variant = String(options.variant ?? 'beaker');
  const interactive: THREE.Object3D[] = [];
  const snapPoints: SnapPoint[] = [];

  // Bình chứa chính (kéo thả)
  const vessel = new THREE.Group();
  const liquidMat = mat('#e0f2fe', { transparent: true, opacity: 0.75, roughness: 0.2 });
  let liquid: THREE.Mesh;
  const tubeMats: THREE.MeshStandardMaterial[] = [];
  if (variant === 'tubes') {
    const rack = box(0.7, 0.04, 0.18, mat('#a16207'));
    rack.position.y = 0.2;
    vessel.add(rack);
    for (let i = 0; i < 5; i++) {
      const tube = cyl(0.04, 0.04, 0.38, glassMat(), 12, true);
      tube.position.set(-0.26 + i * 0.13, 0.2, 0);
      const tm = mat(String(options.tubeBase ?? '#312e81'), { transparent: true, opacity: 0.85 });
      tubeMats.push(tm);
      const fill = cyl(0.036, 0.036, 0.18, tm, 12);
      fill.position.set(-0.26 + i * 0.13, 0.1, 0);
      vessel.add(tube, fill);
    }
    liquid = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), liquidMat);
  } else if (variant === 'flask-syringe') {
    const flask = new THREE.Mesh(makeFlaskGeometry(0.9), glassMat());
    vessel.add(flask);
    liquid = cyl(0.17, 0.18, 0.12, liquidMat, 20);
    liquid.position.y = 0.06;
    vessel.add(liquid);
  } else if (variant === 'calorimeter') {
    const cup = cyl(0.2, 0.16, 0.42, mat('#f8fafc', { roughness: 1 }), 24, true);
    cup.position.y = 0.21;
    const lid = cyl(0.21, 0.21, 0.03, mat('#e2e8f0'));
    lid.position.y = 0.43;
    vessel.add(cup, lid);
    liquid = cyl(0.185, 0.16, 0.25, liquidMat, 20);
    liquid.position.y = 0.13;
    vessel.add(liquid);
  } else {
    const glass = cyl(0.2, 0.2, 0.42, glassMat(), 28, true);
    glass.position.y = 0.21;
    vessel.add(glass);
    liquid = cyl(0.19, 0.19, 0.25, liquidMat, 24);
    liquid.position.y = 0.13;
    vessel.add(liquid);
  }
  const bubbles = makeBubbles(60, 0.15, 0.25);
  bubbles.mesh.position.y = 0.02;
  if (variant !== 'tubes') vessel.add(bubbles.mesh);
  vessel.position.set(-0.9, 0, 0.55);
  tagObject(vessel, 'beaker', variant === 'tubes' ? 'Giá ống nghiệm' : variant === 'calorimeter' ? 'Cốc nhiệt lượng kế' : 'Bình phản ứng', true);
  root.add(vessel);
  interactive.push(vessel);

  // Vị trí đích: giấy dấu X / giá đỡ / bể ổn nhiệt
  const target = new THREE.Vector3(0, 0.01, 0);
  if (variant === 'beaker' && options.showCross !== false) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(98, 98);
    ctx.moveTo(98, 30);
    ctx.lineTo(30, 98);
    ctx.stroke();
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    paper.rotation.x = -Math.PI / 2;
    paper.position.set(0, 0.002, 0);
    root.add(paper);
  }
  let bath: THREE.Mesh | null = null;
  if (variant === 'tubes' && options.showBath !== false) {
    bath = box(0.9, 0.22, 0.4, mat('#38bdf8', { transparent: true, opacity: 0.45 }));
    bath.position.set(0, 0.11, 0);
    tagObject(bath, 'water-bath', 'Bể ổn nhiệt');
    root.add(bath);
    interactive.push(bath);
  }
  const marker = makeSnapMarker();
  marker.position.copy(target).setY(0.03);
  root.add(marker);
  const snap: SnapPoint = { id: 'beaker-slot', position: target.clone(), accepts: 'beaker', marker, filled: false };
  snapPoints.push(snap);

  // Chai hóa chất
  const bottleA = makeBottle(String(options.reagentA ?? 'A'), '#bae6fd', 'reagent-a', `Chai ${String(options.reagentA ?? 'A')} — kiểm tra nhãn`);
  bottleA.position.set(0.8, 0, -0.45);
  const bottleB = makeBottle(String(options.reagentB ?? 'B'), variant === 'calorimeter' ? '#9ca3af' : '#fef9c3', variant === 'flask-syringe' ? 'catalyst' : 'reagent-b', `${String(options.reagentB ?? 'B')}`);
  bottleB.position.set(1.2, 0, -0.1);
  root.add(bottleA, bottleB);
  interactive.push(bottleA, bottleB);

  // Nhiệt kế
  const thermo = makeThermometer();
  thermo.g.position.set(0.12, 0.05, 0.05);
  thermo.g.rotation.z = -0.25;
  thermo.g.visible = options.showThermometer === true || variant === 'calorimeter';
  root.add(thermo.g);

  // Xi lanh thu khí
  const syringe = new THREE.Group();
  const plunger = box(0.04, 0.04, 0.04, mat('#1f2937'));
  if (variant === 'flask-syringe') {
    const barrel = cyl(0.05, 0.05, 0.6, glassMat(), 14, true);
    barrel.rotation.z = Math.PI / 2;
    const pipe = cyl(0.01, 0.01, 0.4, mat('#94a3b8'), 6);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-0.45, -0.25, 0);
    plunger.position.set(-0.28, 0, 0);
    syringe.add(barrel, plunger);
    syringe.position.set(0.55, 0.65, 0);
    const stand = box(0.04, 0.65, 0.04, mat('#475569'));
    stand.position.set(0.55, 0.33, -0.1);
    root.add(stand, syringe);
  }

  const readout = makeLabel('—');
  readout.position.set(0, 0.95, 0);
  root.add(readout);

  const anim = new Anim();
  let lastNonce = -1;
  let from = { turb: 0, temp: 25, gas: 0, color: new THREE.Color('#e0f2fe'), tube: new THREE.Color('#312e81') };
  let to = { ...from, color: from.color.clone(), tube: from.tube.clone() };
  let bubbleRate = 0;
  let tubeIdx = 0;

  const apply = (p: number): void => {
    const turb = lerp(from.turb, to.turb, p);
    const c = from.color.clone().lerp(to.color, p);
    liquidMat.color.copy(c).lerp(new THREE.Color('#fde68a'), turb * 0.8);
    liquidMat.opacity = 0.55 + 0.45 * turb;
    thermo.setTemp(lerp(from.temp, to.temp, p));
    plunger.position.x = -0.28 + 0.5 * Math.min(1, lerp(from.gas, to.gas, p) / 100);
    if (tubeMats.length) tubeMats[tubeIdx].color.copy(from.tube.clone().lerp(to.tube, p));
  };

  return {
    root,
    interactive,
    snapPoints,
    cameraPosition: new THREE.Vector3(0.3, 1.5, 2.4),
    cameraTarget: new THREE.Vector3(0, 0.3, 0),
    update(v: SceneVisualState, nonce: number) {
      // Chuỗi rỗng = chưa có kết quả → ẩn nhãn nổi
      const text = vis.str(v, 'readout', '—');
      readout.visible = text !== '';
      if (text) setLabelText(readout, text);
      const level = vis.num(v, 'liquidLevel', 0.5);
      if (variant !== 'tubes' && variant !== 'flask-syringe') {
        liquid.scale.y = Math.max(0.1, level / 0.55);
        liquid.position.y = (0.25 * liquid.scale.y) / 2 + 0.005;
      }
      if (bath) (bath.material as THREE.MeshStandardMaterial).color.set(vis.num(v, 'temperature', 25) > 60 ? '#f87171' : vis.num(v, 'temperature', 25) < 10 ? '#bfdbfe' : '#38bdf8');
      bubbleRate = vis.num(v, 'bubbles');
      const target = {
        turb: vis.num(v, 'turbidity'),
        temp: vis.num(v, 'temperature', 25),
        gas: vis.num(v, 'gasVolume'),
        color: new THREE.Color(vis.str(v, 'liquidColor', '#e0f2fe')),
        tube: new THREE.Color(vis.str(v, 'tubeColor', '#312e81'))
      };
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        // Đo tiếp khi hoạt cảnh trước chưa xong → chốt ngay màu cuối của ống trước
        if (anim.active) apply(1);
        if (variant === 'tubes') {
          const wanted = typeof v.tubeIndex === 'number' ? v.tubeIndex : Math.max(0, nonce - 1);
          tubeIdx = ((wanted % tubeMats.length) + tubeMats.length) % tubeMats.length;
        }
        from = { turb: 0, temp: 25, gas: 0, color: liquidMat.color.clone(), tube: tubeMats.length ? tubeMats[tubeIdx].color.clone() : new THREE.Color('#312e81') };
        to = target;
        anim.start(vis.num(v, 'animMs'));
        if (vis.num(v, 'animMs') === 0) apply(1);
      } else if (!anim.active) {
        // Xem trước thông số: không đổi màu ống đã phản ứng
        target.tube = tubeMats.length ? tubeMats[tubeIdx].color.clone() : target.tube;
        from = target;
        to = target;
        apply(1);
      }
    },
    tick(dt: number) {
      if (anim.active) apply(anim.tick(dt));
      bubbles.tick(dt, anim.active ? Math.max(bubbleRate, 0.15) : bubbleRate * 0.3);
      marker.visible = !snap.filled;
    },
    dispose() {
      disposeObject(root);
    }
  };
}

/* ======================================================================= */
export function buildTitrationScene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.4, 2));
  const interactive: THREE.Object3D[] = [];
  const snapPoints: SnapPoint[] = [];

  // Giá đỡ
  const standM = mat('#475569', { metalness: 0.5 });
  const base = box(0.5, 0.04, 0.35, standM);
  base.position.set(0, 0.02, -0.1);
  const rod = cyl(0.015, 0.015, 1.9, standM, 8);
  rod.position.set(0, 0.95, -0.22);
  const clamp = box(0.2, 0.03, 0.03, standM);
  clamp.position.set(0, 1.5, -0.12);
  root.add(base, rod, clamp);
  const tile = box(0.34, 0.01, 0.3, mat('#ffffff'));
  tile.position.set(0, 0.045, 0.02);
  root.add(tile);

  // Burette: ống thủy tinh dài 1 m, chất lỏng tím (KMnO₄)
  const buretteTop = 1.85;
  const buretteLen = 1.1;
  const glass = cyl(0.03, 0.03, buretteLen, glassMat(), 14, true);
  glass.position.set(0, buretteTop - buretteLen / 2, 0);
  const titrantMat = mat('#7e22ce', { transparent: true, opacity: 0.85 });
  const titrant = cyl(0.026, 0.026, 1, titrantMat, 12);
  root.add(glass, titrant);
  for (let i = 0; i <= 25; i++) {
    const t = box(i % 5 === 0 ? 0.03 : 0.015, 0.002, 0.002, mat('#111827'));
    t.position.set(0.032, buretteTop - 0.05 - i * 0.04, 0.012);
    root.add(t);
  }
  const tip = cyl(0.008, 0.004, 0.1, glassMat(), 8);
  tip.position.set(0, buretteTop - buretteLen - 0.05, 0);
  root.add(tip);
  const stopcock = new THREE.Group();
  const cockBody = cyl(0.02, 0.02, 0.12, mat('#1e3a8a'), 10);
  cockBody.rotation.z = Math.PI / 2;
  stopcock.add(cockBody);
  stopcock.position.set(0, buretteTop - buretteLen + 0.01, 0);
  tagObject(stopcock, 'stopcock', 'Khóa burette');
  root.add(stopcock);
  interactive.push(stopcock);
  const burLabel = makeLabel(String(options.titrant ?? 'KMnO₄'), { size: 30 });
  burLabel.position.set(0.3, 1.75, 0);
  root.add(burLabel);

  // Bình nón (kéo vào dưới burette)
  const flask = new THREE.Group();
  flask.add(new THREE.Mesh(makeFlaskGeometry(0.75), glassMat()));
  const flaskLiquidMat = mat('#fefce8', { transparent: true, opacity: 0.85 });
  const flaskLiquid = cyl(0.11, 0.15, 0.1, flaskLiquidMat, 20);
  flaskLiquid.position.y = 0.05;
  flask.add(flaskLiquid);
  const flaskLabel = makeLabel(String(options.analyte ?? 'FeSO₄'), { size: 28 });
  flaskLabel.position.y = 0.5;
  flask.add(flaskLabel);
  flask.position.set(-0.9, 0, 0.5);
  tagObject(flask, 'flask', 'Bình nón chứa dung dịch cần chuẩn độ', true);
  root.add(flask);
  interactive.push(flask);
  const target = new THREE.Vector3(0, 0.05, 0.02);
  const marker = makeSnapMarker();
  marker.position.copy(target).setY(0.06);
  root.add(marker);
  const snap: SnapPoint = { id: 'flask-slot', position: target.clone(), accepts: 'flask', marker, filled: false };
  snapPoints.push(snap);

  const acid = makeBottle('H₂SO₄ 1 M', '#fef3c7', 'acid-bottle', 'Chai sulfuric acid 1 M — kiểm tra nhãn');
  acid.position.set(0.9, 0, -0.3);
  root.add(acid);
  interactive.push(acid);

  // Giọt rơi
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), titrantMat);
  drop.visible = false;
  root.add(drop);

  const readout = makeLabel('0.00 mL');
  readout.position.set(-0.4, 1.3, 0.1);
  root.add(readout);

  let dropT = -1;
  let dripping = false;
  const color = new THREE.Color('#fefce8');
  const targetColor = new THREE.Color('#fefce8');

  return {
    root,
    interactive,
    snapPoints,
    cameraPosition: new THREE.Vector3(0.9, 1.4, 2.2),
    cameraTarget: new THREE.Vector3(0, 0.8, 0),
    update(v: SceneVisualState) {
      const pct = Math.min(1, Math.max(0, vis.num(v, 'burettePercent', 1)));
      const h = Math.max(0.001, (buretteLen - 0.05) * pct);
      titrant.scale.y = h;
      titrant.position.set(0, buretteTop - 0.05 - (buretteLen - 0.05) + h / 2, 0);
      targetColor.set(vis.str(v, 'flaskColor', '#fefce8'));
      setLabelText(readout, `Burette: ${vis.str(v, 'readout', '0.00 mL')}`);
      dripping = vis.bool(v, 'drip');
      if (dripping) dropT = 0;
      stopcock.rotation.x = dripping ? Math.PI / 2 : 0;
    },
    tick(dt: number) {
      color.lerp(targetColor, Math.min(1, dt * 3));
      flaskLiquidMat.color.copy(color);
      if (dropT >= 0) {
        dropT += dt;
        drop.visible = snap.filled;
        drop.position.set(0, tip.position.y - 0.05 - dropT * dropT * 4.9, 0);
        if (drop.position.y < 0.12) {
          // Mỗi lần mở khóa chỉ rơi một giọt minh họa
          dropT = -1;
          drop.visible = false;
        }
      }
      marker.visible = !snap.filled;
    },
    dispose() {
      disposeObject(root);
    }
  };
}
