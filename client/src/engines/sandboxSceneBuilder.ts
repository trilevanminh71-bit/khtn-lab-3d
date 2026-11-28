/**
 * engines/sandboxSceneBuilder.ts — Cảnh 3D "Tự do thí nghiệm": bàn thí nghiệm trống + các dụng cụ học sinh tự chọn.
 * Đầu vào : danh sách mã dụng cụ (data/equipmentCatalog.ts) theo thứ tự chỗ trên bàn (tối đa SANDBOX_SLOTS).
 * Đầu ra  : SceneHandle. Chạm vào dụng cụ (thẻ "sb:<mã>") → hiệu ứng minh họa (lửa đèn cồn, giọt burette, đồng hồ đếm…).
 * Ý nghĩa : chỉ để khám phá hình dáng và cách dùng dụng cụ — KHÔNG tạo số liệu đo, không liên quan bài nộp.
 * Mọi mô hình dựng bằng hình học cơ bản (0 KB tải thêm); hoạt cảnh dừng khi người dùng bấm Tạm dừng (engine không gọi tick).
 */
import * as THREE from 'three';
import { equipmentById, SANDBOX_SLOTS } from '../data/equipmentCatalog';
import { box, cyl, disposeObject, glassMat, makeBench, makeDisplay, makeLabel, mat, metalMat, plasticMat, sphere, tagObject, type SceneHandle } from './sceneKit';

/** Vị trí chỗ đặt trên bàn: 2 hàng × 4 cột */
export function slotPosition(i: number): THREE.Vector3 {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return new THREE.Vector3(-1.5 + col, 0, row === 0 ? 0.35 : -0.5);
}

interface Built {
  g: THREE.Group;
  /** Hiệu ứng khi chạm */
  react(): void;
  tick(dt: number): void;
}

const noop = (): void => undefined;

function liquid(color: string, r: number, h: number): THREE.Mesh {
  return cyl(r, r, h, mat(color, { transparent: true, opacity: 0.75, roughness: 0.2 }), 24);
}

function bottle(color: string, label: string): Built {
  const g = new THREE.Group();
  const body = cyl(0.09, 0.09, 0.24, glassMat(), 24);
  body.position.y = 0.12;
  const liq = liquid(color, 0.082, 0.17);
  liq.position.y = 0.095;
  const neck = cyl(0.035, 0.05, 0.06, glassMat(), 16);
  neck.position.y = 0.27;
  const cap = cyl(0.04, 0.04, 0.04, plasticMat('#1f2937'), 16);
  cap.position.y = 0.32;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false }));
  tag.position.set(0, 0.13, 0.092);
  const txt = makeLabel(label, { size: 22, bg: 'rgba(248,250,252,0.95)', color: '#0f172a' });
  txt.scale.multiplyScalar(0.55);
  txt.position.set(0, 0.13, 0.1);
  g.add(body, liq, neck, cap, tag, txt);
  let spin = 0;
  return {
    g,
    react: () => {
      spin = Math.PI * 2;
    },
    tick: (dt) => {
      if (spin <= 0) return;
      const d = Math.min(spin, dt * 6);
      spin -= d;
      g.rotation.y += d;
    }
  };
}

function bubbleVessel(g: THREE.Group, liq: THREE.Mesh, r: number, h: number, y0: number): Built {
  const bubbles: THREE.Mesh[] = [];
  const bm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), bm);
    b.visible = false;
    g.add(b);
    bubbles.push(b);
  }
  let left = 0;
  return {
    g,
    react: () => {
      left = 3;
      bubbles.forEach((b, i) => {
        const a = i * 2.4;
        b.position.set(Math.cos(a) * r * 0.6, y0 + ((i * 0.37) % 1) * h, Math.sin(a) * r * 0.6);
        b.visible = true;
      });
    },
    tick: (dt) => {
      if (left <= 0) return;
      left -= dt;
      for (const b of bubbles) {
        b.position.y += dt * 0.12;
        if (b.position.y > y0 + h) b.position.y = y0;
        b.visible = left > 0;
      }
      liq.scale.y = 1 + Math.sin(left * 12) * 0.02;
    }
  };
}

/** Dựng mô hình một dụng cụ; gốc toạ độ = mặt bàn */
function buildEquipment(id: string): Built {
  const g = new THREE.Group();
  switch (id) {
    case 'mang-nghieng': {
      const rail = box(0.9, 0.035, 0.09, metalMat('#b6c2d1', 0.28));
      rail.position.set(0, 0.12, 0);
      rail.rotation.z = -0.12;
      const ruler = box(0.9, 0.006, 0.03, mat('#fde68a'));
      ruler.position.set(0, 0.142, 0.05);
      ruler.rotation.z = -0.12;
      const leg = box(0.03, 0.2, 0.06, metalMat('#475569', 0.4));
      leg.position.set(-0.42, 0.1, 0);
      const ball = sphere(0.025, metalMat('#eef2f7', 0.08), 24);
      ball.position.set(-0.4, 0.2, 0);
      g.add(rail, ruler, leg, ball);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
        },
        tick: (dt) => {
          if (t < 0) return;
          t = Math.min(1, t + dt * 0.8);
          const x = -0.4 + 0.8 * t * t;
          ball.position.set(x, 0.2 - (x + 0.4) * Math.tan(0.12), 0);
          ball.rotation.z -= dt * 12;
          if (t >= 1) t = -1;
        }
      };
    }
    case 'bi-thep': {
      const ball = sphere(0.05, metalMat('#eef2f7', 0.08), 32);
      ball.position.y = 0.05;
      g.add(ball);
      let v = 0;
      return {
        g,
        react: () => {
          v = 0.6;
        },
        tick: (dt) => {
          if (v <= 0.001) return;
          ball.position.x += v * dt;
          ball.rotation.z -= (v * dt) / 0.05;
          v *= Math.pow(0.15, dt);
          if (ball.position.x > 0.3) ball.position.x = -0.3;
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
      const beamM = new THREE.MeshBasicMaterial({ color: '#7f1d1d', transparent: true, opacity: 0.35, toneMapped: false });
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 6), beamM);
      ray.rotation.x = Math.PI / 2;
      ray.position.y = 0.15;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), beamM);
      led.position.set(0.02, 0.32, 0);
      g.add(a, b, top, ray, led);
      let flash = 0;
      return {
        g,
        react: () => {
          flash = 1.2;
        },
        tick: (dt) => {
          flash = Math.max(0, flash - dt);
          const on = flash > 0 && Math.floor(flash * 6) % 2 === 0;
          beamM.color.set(on ? '#ff3b3b' : '#7f1d1d');
          beamM.opacity = on ? 1 : 0.35;
        }
      };
    }
    case 'dong-ho-so': {
      const shell = box(0.36, 0.18, 0.16, plasticMat('#e8ebef'));
      shell.position.y = 0.09;
      const disp = makeDisplay(0.26, 0.08);
      disp.mesh.position.set(0, 0.11, 0.081);
      g.add(shell, disp.mesh);
      let running = false;
      let t = 0;
      disp.set('0.000');
      return {
        g,
        react: () => {
          running = !running;
          if (running) t = 0;
        },
        tick: (dt) => {
          if (!running) return;
          t += dt;
          disp.set(t.toFixed(3));
        }
      };
    }
    case 'luc-ke': {
      const stand = box(0.04, 0.5, 0.04, metalMat('#64748b', 0.4));
      stand.position.set(-0.1, 0.25, 0);
      const arm = box(0.2, 0.025, 0.025, metalMat('#64748b', 0.4));
      arm.position.set(0, 0.49, 0);
      const tube = cyl(0.025, 0.025, 0.18, plasticMat('#f8fafc'), 16);
      tube.position.set(0.08, 0.38, 0);
      const spring = cyl(0.012, 0.012, 0.1, metalMat('#f59e0b', 0.3), 12);
      spring.position.set(0.08, 0.25, 0);
      const hook = sphere(0.02, metalMat('#94a3b8'), 12);
      hook.position.set(0.08, 0.19, 0);
      g.add(stand, arm, tube, spring, hook);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          const s = 1 + 0.6 * Math.sin(Math.min(Math.PI, t * 2.5));
          spring.scale.y = s;
          spring.position.y = 0.3 - 0.05 * s;
          hook.position.y = 0.3 - 0.1 * s - 0.01;
          if (t * 2.5 >= Math.PI) t = -1;
        }
      };
    }
    case 'qua-nang': {
      const weights: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const w = cyl(0.035, 0.035, 0.04, metalMat('#a3a3a3', 0.3), 20);
        w.position.set(-0.09 + i * 0.09, 0.02, 0);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), metalMat('#94a3b8'));
        ring.position.set(-0.09 + i * 0.09, 0.05, 0);
        g.add(w, ring);
        weights.push(w);
      }
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          weights.forEach((w, i) => (w.rotation.z = Math.sin(t * 10 + i) * 0.15 * Math.max(0, 1 - t)));
          if (t > 1) t = -1;
        }
      };
    }
    case 'pin-von-ke': {
      const cell = cyl(0.04, 0.04, 0.14, plasticMat('#16a34a'), 20);
      cell.rotation.z = Math.PI / 2;
      cell.position.set(-0.15, 0.04, 0);
      const meter = box(0.2, 0.16, 0.08, plasticMat('#e2e8f0'));
      meter.position.set(0.08, 0.08, 0);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false }));
      face.position.set(0.08, 0.07, 0.041);
      const needle = box(0.004, 0.055, 0.002, mat('#dc2626'));
      needle.geometry.translate(0, 0.0275, 0);
      needle.position.set(0.08, 0.07, 0.043);
      needle.rotation.z = 1.2;
      g.add(cell, meter, face, needle);
      let target = 1.2;
      return {
        g,
        react: () => {
          target = target > 0 ? -0.6 : 1.2;
        },
        tick: (dt) => {
          needle.rotation.z += (target - needle.rotation.z) * Math.min(1, dt * 4);
        }
      };
    }
    case 'coc-thuy-tinh': {
      const glass = cyl(0.11, 0.1, 0.26, glassMat(), 28, true);
      glass.position.y = 0.13;
      const liq = liquid('#93c5fd', 0.095, 0.14);
      liq.position.y = 0.075;
      g.add(glass, liq);
      return bubbleVessel(g, liq, 0.09, 0.14, 0.01);
    }
    case 'binh-non': {
      const body = cyl(0.04, 0.12, 0.18, glassMat(), 28);
      body.position.y = 0.09;
      const neck = cyl(0.035, 0.035, 0.08, glassMat(), 16, true);
      neck.position.y = 0.22;
      const liq = cyl(0.075, 0.11, 0.07, mat('#fde68a', { transparent: true, opacity: 0.7 }), 24);
      liq.position.y = 0.04;
      g.add(body, neck, liq);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          g.position.x = Math.sin(t * 14) * 0.015 * Math.max(0, 1.5 - t);
          g.position.z = Math.cos(t * 14) * 0.015 * Math.max(0, 1.5 - t);
          if (t > 1.5) {
            t = -1;
            g.position.x = 0;
            g.position.z = 0;
          }
        }
      };
    }
    case 'buret': {
      const base = box(0.22, 0.02, 0.16, metalMat('#334155', 0.45));
      base.position.y = 0.01;
      const rod = cyl(0.01, 0.01, 0.75, metalMat('#94a3b8'), 12);
      rod.position.set(-0.08, 0.38, 0);
      const clamp = box(0.1, 0.02, 0.02, metalMat('#475569'));
      clamp.position.set(-0.03, 0.55, 0);
      const tube = cyl(0.015, 0.015, 0.5, glassMat(), 16);
      tube.position.set(0.02, 0.5, 0);
      const liq = liquid('#7e22ce', 0.012, 0.36);
      liq.position.set(0.02, 0.57, 0);
      const tap = box(0.05, 0.012, 0.012, plasticMat('#0f172a'));
      tap.position.set(0.02, 0.24, 0);
      const drop = sphere(0.008, mat('#7e22ce', { transparent: true, opacity: 0.9 }), 10);
      drop.visible = false;
      g.add(base, rod, clamp, tube, liq, tap, drop);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
          drop.visible = true;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          drop.position.set(0.02, 0.22 - 0.5 * 4.9 * t * t, 0);
          if (drop.position.y < 0.03) {
            drop.visible = false;
            t = -1;
          }
        }
      };
    }
    case 'ong-nghiem': {
      const rack = box(0.36, 0.03, 0.1, mat('#a16207'));
      rack.position.y = 0.1;
      const foot = box(0.36, 0.02, 0.12, mat('#a16207'));
      foot.position.y = 0.01;
      g.add(rack, foot);
      const tubes: THREE.Object3D[] = [];
      ['#fde68a', '#bfdbfe', '#fecaca', '#bbf7d0'].forEach((c, i) => {
        const t = new THREE.Group();
        const glass = cyl(0.018, 0.018, 0.2, glassMat(), 12, true);
        glass.position.y = 0.1;
        const l = liquid(c, 0.015, 0.07);
        l.position.y = 0.04;
        t.add(glass, l);
        t.position.set(-0.13 + i * 0.087, 0.02, 0);
        g.add(t);
        tubes.push(t);
      });
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          tubes.forEach((x, i) => (x.rotation.z = Math.sin(t * 12 + i) * 0.05 * Math.max(0, 1 - t)));
          if (t > 1) t = -1;
        }
      };
    }
    case 'den-con': {
      const body = cyl(0.06, 0.08, 0.1, glassMat(), 24);
      body.position.y = 0.05;
      const fuel = liquid('#e0f2fe', 0.07, 0.05);
      fuel.position.y = 0.03;
      const wick = cyl(0.01, 0.01, 0.04, mat('#f5f5f4'), 8);
      wick.position.y = 0.12;
      const flameM = new THREE.MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.85, toneMapped: false });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 12), flameM);
      flame.position.y = 0.18;
      flame.visible = false;
      const glow = new THREE.PointLight('#fbbf24', 0, 0.8);
      glow.position.y = 0.2;
      g.add(body, fuel, wick, flame, glow);
      let t = 0;
      return {
        g,
        react: () => {
          flame.visible = !flame.visible;
          glow.intensity = flame.visible ? 0.8 : 0;
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
      const col = cyl(0.004, 0.004, 0.1, mat('#dc2626'), 8);
      col.geometry.translate(0, 0.05, 0);
      col.position.y = 0.04;
      g.add(stand, tube, bulb, col);
      let target = 0.6;
      return {
        g,
        react: () => {
          target = target < 2 ? 3 : 0.6;
        },
        tick: (dt) => {
          col.scale.y += (target - col.scale.y) * Math.min(1, dt * 1.5);
        }
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
      const tube = cyl(0.025, 0.025, 0.18, plasticMat('#e2e8f0'), 16);
      tube.position.set(0, 0.32, 0.02);
      tube.rotation.x = -0.25;
      const lens = cyl(0.012, 0.012, 0.05, metalMat('#cbd5e1'), 12);
      lens.position.set(0, 0.2, 0.03);
      const lampM = new THREE.MeshBasicMaterial({ color: '#334155', toneMapped: false });
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), lampM);
      lamp.rotation.x = -Math.PI / 2;
      lamp.position.set(0, 0.032, 0.02);
      g.add(base, arm, stage, tube, lens, lamp);
      let on = false;
      return {
        g,
        react: () => {
          on = !on;
          lampM.color.set(on ? '#fef9c3' : '#334155');
        },
        tick: noop
      };
    }
    case 'lam-kinh': {
      const slide = box(0.26, 0.006, 0.08, glassMat());
      slide.position.y = 0.003;
      const sample = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), mat('#a3e635'));
      sample.rotation.x = -Math.PI / 2;
      sample.position.y = 0.007;
      const cover = box(0.06, 0.002, 0.06, glassMat());
      cover.position.set(0, 0.06, 0);
      cover.rotation.z = 0.6;
      g.add(slide, sample, cover);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
          cover.position.y = 0.06;
          cover.rotation.z = 0.6;
        },
        tick: (dt) => {
          if (t < 0) return;
          t = Math.min(1, t + dt);
          cover.position.y = 0.06 - 0.051 * t;
          cover.rotation.z = 0.6 * (1 - t);
          if (t >= 1) t = -1;
        }
      };
    }
    case 'dia-petri': {
      const dish = cyl(0.1, 0.1, 0.02, glassMat(), 28, true);
      dish.position.y = 0.01;
      const agar = cyl(0.095, 0.095, 0.012, mat('#fef3c7', { roughness: 0.7 }), 28);
      agar.position.y = 0.007;
      g.add(dish, agar);
      const colonies: THREE.Mesh[] = [];
      for (let i = 0; i < 9; i++) {
        const c = new THREE.Mesh(new THREE.CircleGeometry(0.01, 10), mat('#f5f5f4'));
        c.rotation.x = -Math.PI / 2;
        const a = i * 2.1;
        c.position.set(Math.cos(a) * 0.06 * ((i % 3) / 3 + 0.3), 0.0135, Math.sin(a) * 0.06 * ((i % 3) / 3 + 0.3));
        c.scale.setScalar(0.4);
        g.add(c);
        colonies.push(c);
      }
      let grow = 0;
      return {
        g,
        react: () => {
          grow = grow > 0 ? 0 : 1;
          if (grow === 0) colonies.forEach((c) => c.scale.setScalar(0.4));
        },
        tick: (dt) => {
          if (grow <= 0) return;
          colonies.forEach((c) => c.scale.setScalar(Math.min(1.6, c.scale.x + dt * 0.3)));
        }
      };
    }
    case 'ong-nho-giot': {
      const tube = cyl(0.01, 0.006, 0.16, glassMat(), 10);
      tube.position.set(0, 0.1, 0);
      const bulb = sphere(0.02, plasticMat('#dc2626'), 12);
      bulb.position.set(0, 0.19, 0);
      const drop = sphere(0.006, mat('#93c5fd', { transparent: true, opacity: 0.9 }), 8);
      drop.visible = false;
      g.add(tube, bulb, drop);
      let t = -1;
      return {
        g,
        react: () => {
          t = 0;
          drop.visible = true;
        },
        tick: (dt) => {
          if (t < 0) return;
          t += dt;
          bulb.scale.setScalar(1 - 0.25 * Math.sin(Math.min(Math.PI, t * 6)));
          drop.position.set(0, 0.02 - 0.5 * 4.9 * t * t + 0.0, 0);
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
      return { g, react: noop, tick: noop };
    }
  }
}

export function buildSandboxScene(items: string[]): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(4.2, 2));
  const interactive: THREE.Object3D[] = [];
  const built = new Map<string, Built>();
  // Vạch chỗ trống trên bàn
  for (let i = 0; i < SANDBOX_SLOTS; i++) {
    const p = slotPosition(i);
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.18, 40), new THREE.MeshBasicMaterial({ color: '#94a3b8', transparent: true, opacity: items[i] ? 0.15 : 0.45 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(p.x, 0.002, p.z);
    root.add(pad);
  }
  items.slice(0, SANDBOX_SLOTS).forEach((id, i) => {
    const def = equipmentById(id);
    if (!def) return;
    const b = buildEquipment(id);
    const p = slotPosition(i);
    const holder = new THREE.Group();
    holder.position.copy(p);
    holder.add(b.g);
    const label = makeLabel(def.name, { size: 26 });
    label.scale.multiplyScalar(0.75);
    label.position.set(0, 0.62, 0);
    holder.add(label);
    const tag = `sb:${i}:${id}`;
    tagObject(holder, tag, `${def.name} — chạm để thử`);
    root.add(holder);
    interactive.push(holder);
    built.set(tag, b);
  });
  return {
    root,
    interactive,
    snapPoints: [],
    cameraPosition: new THREE.Vector3(0, 1.75, 3.1),
    cameraTarget: new THREE.Vector3(0, 0.2, -0.05),
    update: noop,
    react(tag) {
      built.get(tag)?.react();
    },
    tick(dt) {
      for (const b of built.values()) b.tick(dt);
    },
    dispose() {
      disposeObject(root);
    }
  };
}
