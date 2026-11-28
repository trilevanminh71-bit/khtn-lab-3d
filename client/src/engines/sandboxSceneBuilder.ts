/**
 * engines/sandboxSceneBuilder.ts — Cảnh 3D "Tự do thí nghiệm": bàn thí nghiệm + dụng cụ học sinh tự chọn, VẬN HÀNH THEO THAO TÁC.
 * Đầu vào : danh sách mã dụng cụ (data/equipmentCatalog.ts) theo thứ tự chỗ trên bàn, trạng thái mô phỏng (engines/sandboxSim.ts).
 * Đầu ra  : SandboxSceneHandle — apply(world) cập nhật hình ảnh theo trạng thái (mực chất lỏng, màu, ngọn lửa, kim/màn hình, vị trí bi…);
 *           tick(dt) chạy hoạt cảnh mượt và báo onAdvance để tiến thời gian mô phỏng (engine Tạm dừng → không tick → thời gian dừng).
 * Thao tác trong 3D:
 *  - Chạm dụng cụ (thẻ "sb:<chỗ>:<mã>") → chọn để điều khiển ở bảng bên; kéo dụng cụ sang chỗ khác trên bàn (điểm gắn "sbslot:<chỗ>").
 *  - Kéo viên bi dọc máng (vị trí thả) và kéo cổng quang điện dọc máng (thẻ "sbs:<chỗ>:<khóa>").
 * Ý nghĩa : chỉ để khám phá cách dùng dụng cụ — KHÔNG tạo số liệu bài, không liên quan bài nộp.
 * Mọi mô hình dựng bằng hình học cơ bản (0 KB tải thêm).
 */
import * as THREE from 'three';
import { equipmentById, SANDBOX_SLOTS } from '../data/equipmentCatalog';
import {
  AMBIENT_C,
  BENCH_BOUNDS,
  childOn,
  flaskExcessMl,
  RAIL_LEN,
  type SandboxWorld,
  type SbState
} from './sandboxSim';
import {
  box,
  cyl,
  disposeObject,
  glassMat,
  makeBench,
  makeDisplay,
  makeLabel,
  mat,
  metalMat,
  plasticMat,
  sphere,
  tagObject,
  type SceneHandle,
  type SlideSpec
} from './sceneKit';

/** Vị trí chỗ đặt trên bàn: 2 hàng × 4 cột */
export function slotPosition(i: number): THREE.Vector3 {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return new THREE.Vector3(-1.5 + col, 0, row === 0 ? 0.35 : -0.5);
}

export interface SandboxSceneHandle extends SceneHandle {
  apply(world: SandboxWorld, selected: number | null): void;
}

interface Ctx {
  slot: number;
  items: string[];
}

interface Built {
  g: THREE.Group;
  apply(s: SbState, w: SandboxWorld, items: string[]): void;
  tick(dt: number): void;
}

const noop = (): void => undefined;

function liquid(color: string, r: number, h: number): THREE.Mesh {
  const m = cyl(r, r, h, mat(color, { transparent: true, opacity: 0.75, roughness: 0.2 }), 24);
  m.geometry.translate(0, h / 2, 0); // gốc ở đáy → scale.y = mực chất lỏng
  return m;
}
const liqMat = (m: THREE.Mesh): THREE.MeshStandardMaterial => m.material as THREE.MeshStandardMaterial;

/** Bọt khí nổi lên với cường độ 0..1 */
function bubbles(
  g: THREE.Group,
  r: number,
  y0: number,
  h: number,
  n = 16
): { set(intensity: number, top: number): void; tick(dt: number): void } {
  const list: THREE.Mesh[] = [];
  const bm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.007 + (i % 3) * 0.002, 6, 4), bm);
    const a = i * 2.4;
    b.position.set(
      Math.cos(a) * r * ((i % 4) / 5 + 0.2),
      y0 + ((i * 0.37) % 1) * h,
      Math.sin(a) * r * ((i % 4) / 5 + 0.2)
    );
    b.visible = false;
    g.add(b);
    list.push(b);
  }
  let k = 0;
  let topY = y0 + h;
  return {
    set(intensity, top) {
      k = intensity;
      topY = Math.max(y0 + 0.01, top);
    },
    tick(dt) {
      list.forEach((b, i) => {
        b.visible = k > 0.02 && i < Math.ceil(k * n);
        if (!b.visible) return;
        b.position.y += dt * (0.08 + 0.12 * k);
        if (b.position.y > topY) b.position.y = y0;
      });
    }
  };
}

function bottle(color: string, label: string): Built {
  const g = new THREE.Group();
  const body = cyl(0.09, 0.09, 0.24, glassMat(), 24);
  body.position.y = 0.12;
  const liq = liquid(color, 0.082, 0.17);
  liq.position.y = 0.01;
  const neck = cyl(0.035, 0.05, 0.06, glassMat(), 16);
  neck.position.y = 0.27;
  const cap = cyl(0.04, 0.04, 0.04, plasticMat('#1f2937'), 16);
  cap.position.y = 0.32;
  const txt = makeLabel(label, { size: 22, bg: 'rgba(248,250,252,0.95)', color: '#0f172a' });
  txt.scale.multiplyScalar(0.55);
  txt.position.set(0, 0.13, 0.1);
  g.add(body, liq, neck, cap, txt);
  const closed = new THREE.Vector3(0, 0.32, 0);
  const opened = new THREE.Vector3(0.17, 0.02, 0.05);
  let target = closed;
  return {
    g,
    apply: (s) => {
      target = s.open ? opened : closed;
    },
    tick: (dt) => {
      cap.position.lerp(target, Math.min(1, dt * 8));
      cap.rotation.x = target === opened ? Math.PI : 0;
    }
  };
}

/** Dựng mô hình một dụng cụ; gốc toạ độ = mặt bàn tại chỗ đặt */
function buildEquipment(id: string, ctx: Ctx): Built {
  const g = new THREE.Group();
  switch (id) {
    case 'mang-nghieng': {
      // Máng quay quanh đầu dưới (bên phải); đầu trên nâng bởi chân đỡ → góc nghiêng thật
      const rail = new THREE.Group();
      rail.position.set(0.4, 0.03, 0);
      const bar = box(RAIL_LEN + 0.04, 0.03, 0.08, metalMat('#b6c2d1', 0.28));
      bar.position.set(-RAIL_LEN / 2, 0, 0);
      const ruler = box(RAIL_LEN, 0.005, 0.025, mat('#fde68a'));
      ruler.position.set(-RAIL_LEN / 2, 0.017, 0.045);
      for (let k = 0; k <= 8; k++) {
        const tick = box(0.003, 0.006, 0.012, mat('#0f172a'));
        tick.position.set(-RAIL_LEN + k * 0.1, 0.021, 0.045);
        rail.add(tick);
      }
      const ball = sphere(0.02, metalMat('#eef2f7', 0.08), 24);
      tagObject(ball, `sbs:${ctx.slot}:s`, 'Viên bi — kéo dọc máng để chọn vị trí thả');
      ball.userData.slide = {
        param: `sbs:${ctx.slot}:s`,
        start: new THREE.Vector3(-RAIL_LEN, 0.035, 0),
        end: new THREE.Vector3(-RAIL_LEN + 0.3, 0.035, 0),
        min: 0,
        max: 0.3
      } satisfies SlideSpec;
      const gateM = plasticMat('#1d4ed8');
      const gate = new THREE.Group();
      const ga = box(0.012, 0.09, 0.012, gateM);
      ga.position.set(0, 0.045, -0.055);
      const gb = box(0.012, 0.09, 0.012, gateM);
      gb.position.set(0, 0.045, 0.055);
      const gt = box(0.012, 0.012, 0.122, gateM);
      gt.position.y = 0.09;
      const ledM = new THREE.MeshBasicMaterial({ color: '#7f1d1d', toneMapped: false });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), ledM);
      led.position.set(0, 0.1, 0);
      gate.add(ga, gb, gt, led);
      tagObject(gate, `sbs:${ctx.slot}:gate`, 'Cổng quang điện — kéo dọc máng để đổi vị trí');
      gate.userData.slide = {
        param: `sbs:${ctx.slot}:gate`,
        start: new THREE.Vector3(-RAIL_LEN + 0.2, 0, 0),
        end: new THREE.Vector3(-RAIL_LEN + 0.75, 0, 0),
        min: 0.2,
        max: 0.75
      } satisfies SlideSpec;
      rail.add(bar, ruler, ball, gate);
      const leg = box(0.03, 1, 0.05, metalMat('#475569', 0.4));
      leg.geometry.translate(0, 0.5, 0);
      g.add(rail, leg);
      let ang = 10;
      let sPos = 0.05;
      let spin = 0;
      return {
        g,
        apply: (s, _w, items) => {
          ang = s.angle;
          // Bi và cổng quang chỉ hiện trên máng khi đã được lắp vào máng
          ball.visible = childOn(_w, items, 'bi-thep', ctx.slot) >= 0;
          const gi = childOn(_w, items, 'cong-quang-dien', ctx.slot);
          gate.visible = gi >= 0;
          gate.position.x = -RAIL_LEN + s.gate;
          spin = s.rolling ? s.v : 0;
          sPos = s.s;
          ledM.color.set(gi >= 0 && _w.states[gi]?.flash > 0.3 ? '#ff3b3b' : '#7f1d1d');
        },
        tick: (dt) => {
          const cur = -rail.rotation.z;
          const want = (ang * Math.PI) / 180;
          rail.rotation.z = -(cur + (want - cur) * Math.min(1, dt * 6));
          const th = -rail.rotation.z;
          leg.position.set(0.4 - (RAIL_LEN + 0.0) * Math.cos(th), 0, 0);
          leg.scale.y = Math.max(0.03, 0.03 + RAIL_LEN * Math.sin(th));
          ball.position.set(-RAIL_LEN + sPos, 0.035, 0);
          ball.rotation.z -= (spin * dt) / 0.02;
        }
      };
    }
    case 'bi-thep': {
      const ball = sphere(0.05, metalMat('#eef2f7', 0.08), 32);
      ball.position.y = 0.05;
      g.add(ball);
      let x = 0;
      let v = 0;
      return {
        g,
        apply: (s, _w, items) => {
          x = s.x;
          v = s.v;
          ball.visible = items.length > 0;
        },
        tick: (dt) => {
          ball.position.x += (x - ball.position.x) * Math.min(1, dt * 10);
          ball.rotation.z -= (v * dt) / 0.05;
        }
      };
    }
    case 'cong-quang-dien': {
      const m = plasticMat('#1d4ed8');
      const a = box(0.03, 0.3, 0.03, m);
      a.position.set(0, 0.15, -0.13);
      const b = box(0.03, 0.3, 0.03, m);
      b.position.set(0, 0.15, 0.13);
      const top = box(0.03, 0.03, 0.29, m);
      top.position.y = 0.3;
      const beamM = new THREE.MeshBasicMaterial({
        color: '#7f1d1d',
        transparent: true,
        opacity: 0.35,
        toneMapped: false
      });
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 6), beamM);
      ray.rotation.x = Math.PI / 2;
      ray.position.y = 0.15;
      const ledM = new THREE.MeshBasicMaterial({ color: '#14532d', toneMapped: false });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), ledM);
      led.position.set(0.02, 0.32, 0);
      g.add(a, b, top, ray, led);
      return {
        g,
        apply: (s) => {
          const blocked = s.power && s.flash > 0.3;
          ray.visible = s.power === 1;
          beamM.color.set(blocked ? '#ff3b3b' : '#7f1d1d');
          beamM.opacity = blocked ? 1 : 0.35;
          ledM.color.set(!s.power ? '#1f2937' : blocked ? '#ff3b3b' : '#22c55e');
        },
        tick: noop
      };
    }
    case 'dong-ho-so': {
      const shell = box(0.36, 0.18, 0.16, plasticMat('#e8ebef'));
      shell.position.y = 0.09;
      const disp = makeDisplay(0.26, 0.08);
      disp.mesh.position.set(0, 0.11, 0.081);
      g.add(shell, disp.mesh);
      disp.set('0.000');
      return {
        g,
        apply: (s) => disp.set(s.t.toFixed(3), s.mode === 1 && s.run ? '#fbbf24' : '#22d3ee'),
        tick: noop
      };
    }
    case 'luc-ke': {
      const stand = box(0.04, 0.55, 0.04, metalMat('#64748b', 0.4));
      stand.position.set(-0.1, 0.275, 0);
      const arm = box(0.2, 0.025, 0.025, metalMat('#64748b', 0.4));
      arm.position.set(0, 0.54, 0);
      const tube = cyl(0.025, 0.025, 0.14, plasticMat('#f8fafc'), 16);
      tube.position.set(0.08, 0.46, 0);
      const spring = cyl(0.012, 0.012, 0.1, metalMat('#f59e0b', 0.3), 12);
      spring.geometry.translate(0, -0.05, 0);
      spring.position.set(0.08, 0.39, 0);
      const hook = sphere(0.012, metalMat('#94a3b8'), 12);
      const stack = cyl(0.03, 0.03, 0.012, metalMat('#a3a3a3', 0.3), 20);
      stack.geometry.translate(0, -0.006, 0);
      g.add(stand, arm, tube, spring, hook, stack);
      let x = 0;
      let n = 0;
      return {
        g,
        apply: (s) => {
          x = s.x;
          n = s.n;
        },
        tick: () => {
          const len = 0.06 + x * 1.2;
          spring.scale.y = len / 0.1;
          const end = 0.39 - len;
          hook.position.set(0.08, end - 0.01, 0);
          stack.visible = n > 0;
          stack.scale.y = Math.max(1, n);
          stack.position.set(0.08, end - 0.02, 0);
        }
      };
    }
    case 'qua-nang': {
      for (let i = 0; i < 3; i++) {
        const w = cyl(0.035, 0.035, 0.04, metalMat('#a3a3a3', 0.3), 20);
        w.position.set(-0.09 + i * 0.09, 0.02, 0);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), metalMat('#94a3b8'));
        ring.position.set(-0.09 + i * 0.09, 0.05, 0);
        g.add(w, ring);
      }
      return { g, apply: noop, tick: noop };
    }
    case 'pin-von-ke': {
      const cell = cyl(0.04, 0.04, 0.14, plasticMat('#16a34a'), 20);
      cell.rotation.z = Math.PI / 2;
      cell.position.set(-0.15, 0.04, 0);
      const meter = box(0.2, 0.16, 0.08, plasticMat('#e2e8f0'));
      meter.position.set(0.08, 0.08, 0);
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 24, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false })
      );
      face.position.set(0.08, 0.07, 0.041);
      const needle = box(0.004, 0.055, 0.002, mat('#dc2626'));
      needle.geometry.translate(0, 0.0275, 0);
      needle.position.set(0.08, 0.07, 0.043);
      needle.rotation.z = 1.2;
      const sw = box(0.05, 0.01, 0.02, metalMat('#94a3b8'));
      sw.position.set(-0.05, 0.1, 0.03);
      g.add(cell, meter, face, needle, sw);
      return {
        g,
        apply: (s) => {
          const f = Math.max(-0.12, Math.min(1.05, s.u / s.range));
          needle.rotation.z = 1.2 - f * 2.4;
          sw.rotation.z = s.k ? 0 : 0.5;
        },
        tick: noop
      };
    }
    case 'coc-thuy-tinh': {
      const glass = cyl(0.11, 0.1, 0.26, glassMat(), 28, true);
      glass.position.y = 0.13;
      const liq = liquid('#93c5fd', 0.095, 0.24);
      liq.position.y = 0.005;
      const bub = bubbles(g, 0.09, 0.01, 0.2);
      const steamM = new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0 });
      const steam = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 16, 1, true), steamM);
      steam.position.y = 0.36;
      steam.rotation.x = Math.PI;
      g.add(glass, liq, steam);
      let t = 0;
      return {
        g,
        apply: (s) => {
          const f = Math.max(0.001, s.vol / 250);
          liq.visible = s.vol > 0.5;
          liq.scale.y = f;
          const hot = Math.max(0, Math.min(1, (s.T - AMBIENT_C) / 75));
          liqMat(liq).color.setRGB(0.58 + 0.3 * hot, 0.77 - 0.1 * hot, 0.99 - 0.25 * hot);
          bub.set(s.T >= 99.5 ? 1 : Math.max(0, (s.T - 70) / 60), 0.005 + 0.24 * f);
          steamM.opacity = s.T > 80 ? Math.min(0.35, (s.T - 80) / 50) : 0;
        },
        tick: (dt) => {
          t += dt;
          bub.tick(dt);
          steam.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
        }
      };
    }
    case 'binh-non': {
      const body = cyl(0.04, 0.12, 0.18, glassMat(), 28);
      body.position.y = 0.09;
      const neck = cyl(0.035, 0.035, 0.08, glassMat(), 16, true);
      neck.position.y = 0.22;
      const liq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.112, 0.1, 24),
        mat('#f1f5f9', { transparent: true, opacity: 0.45 })
      );
      liq.geometry.translate(0, 0.05, 0);
      liq.position.y = 0.004;
      const bub = bubbles(g, 0.08, 0.01, 0.12, 20);
      g.add(body, neck, liq);
      let swirl = 0;
      let t = 0;
      return {
        g,
        apply: (s) => {
          liq.visible = s.vol > 0.5;
          liq.scale.y = Math.min(1.6, Math.max(0.05, s.vol / 60));
          const ex = flaskExcessMl(s);
          const m = liqMat(liq);
          if (s.brown) {
            m.color.set('#92400e');
            m.opacity = 0.9;
          } else if (ex > 0.5) {
            m.color.set('#a21caf');
            m.opacity = 0.85;
          } else if (ex > 0) {
            m.color.set('#f472b6');
            m.opacity = 0.7;
          } else {
            m.color.set('#f1f5f9').lerp(new THREE.Color('#f9a8d4'), Math.min(1, s.local / 2));
            m.opacity = 0.45 + Math.min(0.3, s.local * 0.15);
          }
          const rate = s.h2o2 * (s.cat ? 0.02 : 2e-5);
          bub.set(Math.min(1, rate * 4), 0.004 + 0.1 * liq.scale.y);
          swirl = s.swirl;
        },
        tick: (dt) => {
          bub.tick(dt);
          t += dt;
          const a = swirl > 0 ? 0.012 : 0;
          g.position.x = Math.sin(t * 14) * a;
          g.position.z = Math.cos(t * 14) * a;
        }
      };
    }
    case 'buret': {
      const base = box(0.22, 0.02, 0.16, metalMat('#334155', 0.45));
      base.position.y = 0.01;
      const rod = cyl(0.01, 0.01, 0.95, metalMat('#94a3b8'), 12);
      rod.position.set(-0.08, 0.48, 0);
      const clamp = box(0.1, 0.02, 0.02, metalMat('#475569'));
      clamp.position.set(-0.03, 0.72, 0);
      const tube = cyl(0.015, 0.015, 0.5, glassMat(), 16);
      tube.position.set(0.02, 0.63, 0);
      const liq = liquid('#7e22ce', 0.012, 0.42);
      liq.position.set(0.02, 0.42, 0);
      const tip = cyl(0.006, 0.003, 0.05, glassMat(), 8);
      tip.position.set(0.02, 0.345, 0);
      const tap = box(0.05, 0.012, 0.012, plasticMat('#0f172a'));
      tap.position.set(0.02, 0.375, 0);
      const dropM = mat('#7e22ce', { transparent: true, opacity: 0.9 });
      const drop = sphere(0.007, dropM, 10);
      drop.visible = false;
      const stream = cyl(0.003, 0.003, 0.2, dropM, 6);
      stream.position.set(0.02, 0.22, 0);
      stream.visible = false;
      g.add(base, rod, clamp, tube, liq, tip, tap, drop, stream);
      let lastDrops = 0;
      let fall = -1;
      let floor = 0.03;
      return {
        g,
        apply: (s, _w, items) => {
          liq.visible = s.left > 0.01;
          liq.scale.y = Math.max(0.001, s.left / 25);
          tap.rotation.y = s.valve > 0 ? Math.PI / 2 : 0;
          stream.visible = s.valve === 3 && s.left > 0;
          // Có bình nón lắp dưới vòi → dòng chảy dừng ở miệng bình; không có → chảy xuống bàn
          const hasFlask = childOn(_w, items, 'binh-non', ctx.slot) >= 0;
          stream.scale.y = hasFlask ? 0.45 : 1.6;
          stream.position.y = hasFlask ? 0.29 : 0.17;
          floor = hasFlask ? 0.27 : 0.03;
          if (s.drops > lastDrops && s.valve < 3) fall = 0;
          lastDrops = s.drops;
        },
        tick: (dt) => {
          if (fall < 0) {
            drop.visible = false;
            return;
          }
          fall += dt;
          drop.visible = true;
          drop.position.set(0.02, 0.33 - 0.5 * 9.8 * fall * fall, 0);
          if (drop.position.y < floor) fall = -1;
        }
      };
    }
    case 'ong-nghiem': {
      const rack = box(0.36, 0.03, 0.1, mat('#a16207'));
      rack.position.y = 0.1;
      const foot = box(0.36, 0.02, 0.12, mat('#a16207'));
      foot.position.y = 0.01;
      g.add(rack, foot);
      const base = ['#fef9c3', '#e0f2fe', '#fef9c3', '#fef9c3'];
      const liqs: THREE.Mesh[] = [];
      const holders: THREE.Group[] = [];
      base.forEach((c, i) => {
        const tg = new THREE.Group();
        const glass = cyl(0.018, 0.018, 0.2, glassMat(), 12, true);
        glass.position.y = 0.1;
        const l = liquid(c, 0.015, 0.07);
        l.position.y = 0.005;
        tg.add(glass, l);
        tg.position.set(-0.13 + i * 0.087, 0.02, 0);
        g.add(tg);
        liqs.push(l);
        holders.push(tg);
      });
      return {
        g,
        apply: (s) => {
          liqs.forEach((l, i) => {
            const k = i + 1;
            const iod = s[`i${k}`] > 0;
            liqMat(l).color.set(iod ? (s[`s${k}`] > 0.3 ? '#312e81' : '#b45309') : base[i]);
            holders[i].position.y = s.sel === k ? 0.05 : 0.02;
          });
        },
        tick: noop
      };
    }
    case 'den-con': {
      const body = cyl(0.06, 0.08, 0.1, glassMat(), 24);
      body.position.y = 0.05;
      const fuel = liquid('#e0f2fe', 0.07, 0.08);
      fuel.position.y = 0.005;
      const wick = cyl(0.01, 0.01, 0.04, mat('#f5f5f4'), 8);
      wick.position.y = 0.12;
      const flameM = new THREE.MeshBasicMaterial({
        color: '#60a5fa',
        transparent: true,
        opacity: 0.85,
        toneMapped: false
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 12), flameM);
      flame.position.y = 0.18;
      flame.visible = false;
      const glow = new THREE.PointLight('#fbbf24', 0, 0.8);
      glow.position.y = 0.2;
      const lid = cyl(0.02, 0.022, 0.04, plasticMat('#e5e7eb'), 12);
      const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 28), metalMat('#334155', 0.4));
      ringT.rotation.x = Math.PI / 2;
      ringT.position.y = 0.22;
      const gauze = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 24),
        mat('#9ca3af', { side: THREE.DoubleSide, roughness: 0.9 })
      );
      gauze.rotation.x = -Math.PI / 2;
      gauze.position.y = 0.222;
      g.add(body, fuel, wick, flame, glow, lid, ringT, gauze);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const legK = cyl(0.005, 0.005, 0.23, metalMat('#334155', 0.4), 6);
        legK.position.set(Math.cos(a) * 0.1, 0.11, Math.sin(a) * 0.1);
        g.add(legK);
      }
      let t = 0;
      return {
        g,
        apply: (s) => {
          flame.visible = s.on === 1;
          glow.intensity = flame.visible ? 0.8 : 0;
          fuel.scale.y = Math.max(0.02, s.fuel / 100);
          lid.position.set(s.on ? 0.12 : 0, s.on ? 0.02 : 0.14, 0);
        },
        tick: (dt) => {
          if (!flame.visible) return;
          t += dt;
          flame.scale.set(1 + Math.sin(t * 23) * 0.08, 1 + Math.sin(t * 17) * 0.12, 1);
          flameM.color.set(Math.sin(t * 9) > 0.6 ? '#fbbf24' : '#60a5fa');
        }
      };
    }
    case 'nhiet-ke': {
      const stand = box(0.08, 0.015, 0.08, metalMat('#334155'));
      stand.position.y = 0.008;
      const tube = cyl(0.008, 0.008, 0.36, glassMat(), 10);
      tube.position.y = 0.2;
      const bulb = sphere(0.014, mat('#dc2626'), 12);
      bulb.position.y = 0.03;
      const col = cyl(0.004, 0.004, 0.3, mat('#dc2626'), 8);
      col.geometry.translate(0, 0.15, 0);
      col.position.y = 0.04;
      const disp = makeDisplay(0.12, 0.045);
      disp.mesh.position.set(0, 0.42, 0.01);
      g.add(stand, tube, bulb, col, disp.mesh);
      return {
        g,
        apply: (s) => {
          col.scale.y = Math.max(0.03, Math.min(1, s.T / 110));
          disp.set(`${s.T.toFixed(1)}°C`, '#fca5a5');
        },
        tick: noop
      };
    }
    case 'chai-kmno4':
      return bottle('#7e22ce', 'KMnO₄');
    case 'chai-h2so4':
      return bottle('#f1f5f9', 'H₂SO₄');
    case 'chai-h2o2':
      return bottle('#e0f2fe', 'H₂O₂');
    case 'chai-ethanol':
      return bottle('#f8fafc', 'Cồn 96°');
    case 'chai-iodine':
      return bottle('#92400e', 'Iodine');
    case 'kinh-hien-vi': {
      const base = box(0.2, 0.03, 0.24, plasticMat('#1e293b'));
      base.position.y = 0.015;
      const arm = box(0.05, 0.32, 0.05, plasticMat('#e2e8f0'));
      arm.position.set(0, 0.18, -0.08);
      const stage = box(0.16, 0.015, 0.14, plasticMat('#1e293b'));
      stage.position.set(0, 0.14, 0.02);
      const head = cyl(0.025, 0.025, 0.18, plasticMat('#e2e8f0'), 16);
      head.position.set(0, 0.34, 0.02);
      head.rotation.x = -0.25;
      const turret = new THREE.Group();
      turret.position.set(0, 0.24, 0.03);
      const objLens: THREE.Mesh[] = [];
      [0.03, 0.04, 0.05, 0.06].forEach((len, i) => {
        const l = cyl(0.008, 0.01, len, metalMat(i === 3 ? '#f8fafc' : '#cbd5e1'), 10);
        const a = (i / 4) * Math.PI * 2;
        l.position.set(Math.cos(a) * 0.025, -len / 2, Math.sin(a) * 0.025);
        turret.add(l);
        objLens.push(l);
      });
      const knob = cyl(0.03, 0.03, 0.02, plasticMat('#0f172a'), 16);
      knob.rotation.z = Math.PI / 2;
      knob.position.set(0.04, 0.12, -0.08);
      const lampM = new THREE.MeshBasicMaterial({ color: '#334155', toneMapped: false });
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), lampM);
      lamp.rotation.x = -Math.PI / 2;
      lamp.position.set(0, 0.032, 0.02);
      g.add(base, arm, stage, head, turret, knob, lamp);
      let turretWant = 0;
      let stageWant = 0.14;
      return {
        g,
        apply: (s) => {
          lampM.color.set(s.lamp ? '#fef9c3' : '#334155');
          turretWant = -[4, 10, 40, 100].indexOf(s.obj) * (Math.PI / 2);
          stageWant = 0.12 + (s.focus / 100) * 0.04;
          knob.rotation.x = s.focus * 0.2;
        },
        tick: (dt) => {
          turret.rotation.y += (turretWant - turret.rotation.y) * Math.min(1, dt * 6);
          stage.position.y += (stageWant - stage.position.y) * Math.min(1, dt * 8);
        }
      };
    }
    case 'lam-kinh': {
      const slide = box(0.26, 0.006, 0.08, glassMat());
      slide.position.y = 0.003;
      const sample = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), mat('#a3e635'));
      sample.rotation.x = -Math.PI / 2;
      sample.position.y = 0.007;
      const water = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        mat('#bae6fd', { transparent: true, opacity: 0.6 })
      );
      water.position.y = 0.006;
      water.visible = false;
      const cover = box(0.06, 0.002, 0.06, glassMat());
      cover.position.set(0.05, 0.03, 0);
      cover.rotation.z = 0.785;
      g.add(slide, sample, water, cover);
      let want = 0;
      let k = 0;
      return {
        g,
        apply: (s) => {
          want = s.cover;
          water.visible = s.water > 0;
          water.scale.set(1 + s.water * 0.3, 0.5 + 0.15 * s.water, 1 + s.water * 0.3);
        },
        tick: (dt) => {
          k += (want - k) * Math.min(1, dt * 3);
          cover.position.set(0.05 * (1 - k), 0.03 - 0.021 * k, 0);
          cover.rotation.z = 0.785 * (1 - k);
        }
      };
    }
    case 'dia-petri': {
      const dish = cyl(0.1, 0.1, 0.02, glassMat(), 28, true);
      dish.position.y = 0.01;
      const agar = cyl(0.095, 0.095, 0.012, mat('#fef3c7', { roughness: 0.7 }), 28);
      agar.position.y = 0.007;
      const lid = cyl(0.105, 0.105, 0.006, glassMat(), 28);
      lid.position.y = 0.025;
      g.add(dish, agar, lid);
      const colonies: THREE.Mesh[] = [];
      for (let i = 0; i < 14; i++) {
        const c = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), mat(i >= 11 ? '#65a30d' : '#f5f5f4'));
        c.rotation.x = -Math.PI / 2;
        const a = i * 2.1;
        const r = 0.075 * (((i * 7) % 10) / 10);
        c.position.set(Math.cos(a) * r, 0.0135, Math.sin(a) * r);
        g.add(c);
        colonies.push(c);
      }
      let lidWant = new THREE.Vector3(0, 0.025, 0);
      return {
        g,
        apply: (s) => {
          const sc = 0.2 + Math.sqrt(s.cover / 100) * 2.2;
          colonies.forEach((c, i) => {
            if (i >= 11) {
              c.visible = s.contam > (i - 10) * 15;
              c.scale.setScalar(0.8);
            } else c.scale.setScalar(sc * (0.7 + (i % 3) * 0.15));
          });
          lidWant = s.lid ? new THREE.Vector3(0, 0.025, 0) : new THREE.Vector3(0.12, 0.08, 0);
        },
        tick: (dt) => {
          lid.position.lerp(lidWant, Math.min(1, dt * 6));
          lid.rotation.z = lid.position.x > 0.05 ? 0.6 : 0;
        }
      };
    }
    case 'ong-nho-giot': {
      const tube = cyl(0.01, 0.006, 0.16, glassMat(), 10);
      tube.position.set(0, 0.1, 0);
      const bulb = sphere(0.02, plasticMat('#dc2626'), 12);
      bulb.position.set(0, 0.19, 0);
      const inside = liquid('#93c5fd', 0.006, 0.12);
      inside.position.set(0, 0.03, 0);
      const drop = sphere(0.006, mat('#93c5fd', { transparent: true, opacity: 0.9 }), 8);
      drop.visible = false;
      g.add(tube, bulb, inside, drop);
      const SRC_COLOR: Record<number, string> = { 1: '#bae6fd', 2: '#92400e', 3: '#e0f2fe', 4: '#7e22ce' };
      let last = 0;
      let t = -1;
      return {
        g,
        apply: (s) => {
          inside.visible = s.drops > 0;
          inside.scale.y = Math.max(0.01, s.drops / 20);
          const c = SRC_COLOR[s.src] ?? '#bae6fd';
          liqMat(inside).color.set(c);
          (drop.material as THREE.MeshStandardMaterial).color.set(c);
          if (s.drops < last) t = 0;
          last = s.drops;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          drop.visible = true;
          bulb.scale.setScalar(1 - 0.25 * Math.sin(Math.min(Math.PI, t * 6)));
          drop.position.set(0, 0.02 - 0.5 * 4.9 * t * t, 0);
          if (t > 0.25) {
            drop.visible = false;
            t = -1;
          }
        }
      };
    }
    default: {
      const crate = box(0.15, 0.15, 0.15, plasticMat('#64748b'));
      crate.position.y = 0.075;
      g.add(crate);
      return { g, apply: noop, tick: noop };
    }
  }
}

/** Dụng cụ con bị ẩn mô hình riêng khi đã lắp vào dụng cụ chủ (vì dụng cụ chủ vẽ sẵn phần lắp) */
const HIDE_WHEN_MOUNTED: Record<string, string> = { 'bi-thep': 'mang-nghieng', 'cong-quang-dien': 'mang-nghieng' };

/**
 * Dựng bàn tự do. Mỗi dụng cụ đặt theo toạ độ world.pos (kéo tự do: X-Z, giữ Shift để nâng/hạ Y), có vòng định vị
 * dưới chân trên mặt bàn. onAdvance(dt) được gọi khoảng 10 lần/giây với thời gian thực đã trôi
 * (engine đang Tạm dừng thì không tick → thời gian mô phỏng cũng dừng).
 */
export function buildSandboxScene(
  items: string[],
  world: SandboxWorld | null,
  selected: number | null,
  onAdvance: (dt: number) => void
): SandboxSceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4.2, 2));
  const interactive: THREE.Object3D[] = [];
  const built: Built[] = [];
  const holders: THREE.Group[] = [];
  const rings: THREE.Mesh[] = [];
  const list = items.slice(0, SANDBOX_SLOTS);
  list.forEach((id, i) => {
    const def = equipmentById(id);
    const b = buildEquipment(def ? id : 'khac', { slot: i, items: list });
    const holder = new THREE.Group();
    const p = world?.pos[i] ?? [0, 0, 0];
    holder.position.set(p[0], p[1], p[2]);
    holder.add(b.g);
    // Nhãn đặt trên đỉnh dụng cụ
    const top = new THREE.Box3().setFromObject(b.g).max.y;
    const label = makeLabel(`${i + 1}. ${def?.name ?? id}`, { size: 26 });
    label.scale.multiplyScalar(0.75);
    label.position.set(0, Math.max(0.3, top) + 0.14, 0);
    holder.add(label);
    // Vòng định vị (bóng) luôn nằm trên mặt bàn ngay dưới chân dụng cụ
    const ringM = new THREE.MeshBasicMaterial({
      color: '#94a3b8',
      transparent: true,
      opacity: 0.35,
      toneMapped: false,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 40), ringM);
    ring.rotation.x = -Math.PI / 2;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 32),
      new THREE.MeshBasicMaterial({
        color: '#0f172a',
        transparent: true,
        opacity: 0.18,
        toneMapped: false,
        depthWrite: false
      })
    );
    shadow.position.z = 0.0005;
    ring.add(shadow);
    holder.add(ring);
    const tag = `sb:${i}:${id}`;
    tagObject(holder, tag, `${def?.name ?? id} — chạm để điều khiển, bấm giữ & kéo để di chuyển (Shift: nâng/hạ)`);
    holder.userData.freeDrag = true;
    holder.userData.bounds = { ...BENCH_BOUNDS };
    root.add(holder);
    interactive.push(holder);
    built.push(b);
    holders.push(holder);
    rings.push(ring);
  });
  let acc = 0;
  let last: SandboxWorld | null = world;
  const apply = (w: SandboxWorld, sel: number | null): void => {
    last = w;
    built.forEach((b, i) => {
      const s = w.states[i];
      if (s) b.apply(s, w, list);
      const h = holders[i];
      const p = w.pos[i];
      // Không giật dụng cụ đang được kéo về vị trí cũ
      if (p && !h.userData.dragging) h.position.set(p[0], p[1], p[2]);
      const host = w.links[i] ?? -1;
      b.g.visible = !(HIDE_WHEN_MOUNTED[list[i]] && list[host] === HIDE_WHEN_MOUNTED[list[i]]);
      const rm = rings[i].material as THREE.MeshBasicMaterial;
      rm.color.set(sel === i ? '#38bdf8' : host >= 0 ? '#22c55e' : '#94a3b8');
      rm.opacity = sel === i ? 0.95 : host >= 0 ? 0.6 : 0.35;
    });
  };
  if (world) apply(world, selected);
  return {
    root,
    interactive,
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0, 1.75, 3.1),
    cameraTarget: new THREE.Vector3(0, 0.2, -0.05),
    update: noop,
    apply,
    tick(dt) {
      for (const b of built) b.tick(dt);
      // Vòng định vị bám mặt bàn kể cả khi dụng cụ được nâng lên
      holders.forEach((h, i) => {
        rings[i].position.set(0, 0.003 - h.position.y, 0);
        rings[i].visible = h.position.y > 0.004 || last?.links[i] === -1 || h.userData.dragging === true;
      });
      acc += dt;
      if (acc >= 0.1) {
        onAdvance(Math.min(acc, 0.5));
        acc = 0;
      }
    },
    dispose() {
      disposeObject(root);
    }
  };
}
