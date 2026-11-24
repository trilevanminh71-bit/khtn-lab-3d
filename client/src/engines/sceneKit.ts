/**
 * engines/sceneKit.ts — Bộ công cụ dựng mô hình 3D bằng code (0 KB tải file mô hình).
 * Chỉ dùng hình học cơ bản (Box, Cylinder, Sphere, Torus, Lathe) với số đỉnh thấp để chạy mượt trên máy yếu.
 *
 * Quy ước tương tác (đọc bởi ThreeEngineCore):
 *  - object.userData.tag       : thẻ thao tác (khớp với StepDef.trigger) — chạm để thực hiện bước.
 *  - object.userData.draggable : true → kéo thả được; thả gần SnapPoint cùng `accepts` sẽ gắn khớp.
 *  - object.userData.label     : tên tiếng Việt hiển thị khi rê chuột.
 */
import * as THREE from 'three';
import type { SceneVisualState } from '../types/lab';

/** Điểm gắn: vị trí đích để kéo dụng cụ vào */
export interface SnapPoint {
  id: string;
  position: THREE.Vector3;
  /** Thẻ của vật được phép gắn vào điểm này */
  accepts: string;
  marker: THREE.Object3D;
  filled: boolean;
}

/** Tay cầm của một cảnh đã dựng */
export interface SceneHandle {
  root: THREE.Group;
  interactive: THREE.Object3D[];
  snapPoints: SnapPoint[];
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  /** Cập nhật theo trạng thái mô phỏng; nonce đổi = bắt đầu hoạt cảnh đo mới */
  update(visual: SceneVisualState, nonce: number): void;
  /** Gọi mỗi khung hình (dt: giây) cho hoạt cảnh */
  tick(dt: number): void;
  /** Phản ứng cục bộ khi người dùng chạm vào dụng cụ (bật đèn, nháy nút...) */
  react?(tag: string): void;
  /** Thay kết cấu tiêu bản (ảnh người dùng tải lên) — chỉ cảnh kính hiển vi dùng */
  setCustomTexture?(tex: THREE.Texture | null): void;
  dispose(): void;
}

const num = (v: SceneVisualState, k: string, d = 0): number => (typeof v[k] === 'number' ? (v[k] as number) : d);
const str = (v: SceneVisualState, k: string, d = ''): string => (typeof v[k] === 'string' ? (v[k] as string) : d);
const bool = (v: SceneVisualState, k: string): boolean => v[k] === true;
export const vis = { num, str, bool };

/** Vật liệu dùng chung (giảm số lượng shader biên dịch) */
export function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts });
}
export function glassMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
}

export function box(w: number, h: number, d: number, m: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 20, open = false): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m);
  mesh.castShadow = true;
  return mesh;
}
export function sphere(r: number, m: THREE.Material, seg = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), m);
  mesh.castShadow = true;
  return mesh;
}

/** Gắn thẻ tương tác cho một đối tượng (và mọi con của nó) */
export function tagObject(obj: THREE.Object3D, tag: string, label: string, draggable = false): THREE.Object3D {
  obj.userData.tag = tag;
  obj.userData.label = label;
  obj.userData.draggable = draggable;
  obj.traverse((c) => {
    if (c !== obj) c.userData.parentTag = tag;
  });
  return obj;
}

/** Vẽ hình chữ nhật bo góc (thay cho ctx.roundRect — chưa có trên Safari/Chrome đời cũ) */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Nhãn chữ dạng sprite vẽ bằng canvas (hỗ trợ tiếng Việt, font hệ thống) */
export function makeLabel(text: string, opts: { color?: string; bg?: string; size?: number } = {}): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const font = `600 ${opts.size ?? 40}px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 32;
  canvas.width = w;
  canvas.height = 64;
  ctx.font = font;
  ctx.fillStyle = opts.bg ?? 'rgba(15,23,42,0.82)';
  roundRectPath(ctx, 0, 0, w, 64, 14);
  ctx.fill();
  ctx.fillStyle = opts.color ?? '#f8fafc';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 16, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set((w / 64) * 0.12, 0.12, 1);
  sprite.renderOrder = 10;
  sprite.userData.labelText = text;
  return sprite;
}

/** Cập nhật chữ của nhãn (vẽ lại canvas) */
export function setLabelText(sprite: THREE.Sprite, text: string, opts: { color?: string; bg?: string; size?: number } = {}): void {
  if (sprite.userData.labelText === text) return;
  const fresh = makeLabel(text, opts);
  const oldMat = sprite.material as THREE.SpriteMaterial;
  oldMat.map?.dispose();
  oldMat.dispose();
  sprite.material = fresh.material;
  sprite.scale.copy(fresh.scale);
  sprite.userData.labelText = text;
}

/** Màn hình hiển thị số (đồng hồ hiện số, đồng hồ đo điện) */
export function makeDisplay(width: number, height: number): { mesh: THREE.Mesh; set(text: string, color?: string): void } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }));
  let last = '';
  const set = (text: string, color = '#22d3ee'): void => {
    if (text === last) return;
    last = text;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = color;
    ctx.font = 'bold 44px Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 50);
    tex.needsUpdate = true;
  };
  set('0.000');
  return { mesh, set };
}

/** Bàn thí nghiệm + sàn (dùng chung mọi cảnh) */
export function makeBench(width = 4, depth = 2.2): THREE.Group {
  const g = new THREE.Group();
  const top = box(width, 0.08, depth, mat('#e2e8f0', { roughness: 0.8 }));
  top.position.y = -0.04;
  g.add(top);
  const legM = mat('#475569');
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = box(0.08, 0.9, 0.08, legM);
    leg.position.set((x * width) / 2.15, -0.5, (z * depth) / 2.3);
    g.add(leg);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat('#1e293b', { roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.95;
  floor.receiveShadow = true;
  g.add(floor);
  return g;
}

/** Vòng đánh dấu điểm gắn (nhấp nháy khi đang chờ gắn) */
export function makeSnapMarker(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 8, 32),
    new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.85 })
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

/** Hạt bọt khí (InstancedMesh để chỉ tốn 1 draw call) */
export function makeBubbles(count: number, radius: number, height: number): { mesh: THREE.InstancedMesh; tick(dt: number, rate: number): void } {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), count);
  const ys = new Float32Array(count);
  const xs = new Float32Array(count);
  const zs = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    ys[i] = Math.random() * height;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    xs[i] = Math.cos(a) * r;
    zs[i] = Math.sin(a) * r;
  }
  const m4 = new THREE.Matrix4();
  const tick = (dt: number, rate: number): void => {
    const visible = Math.floor(count * Math.min(1, rate));
    mesh.count = visible;
    for (let i = 0; i < visible; i++) {
      ys[i] += dt * (0.15 + (i % 5) * 0.04);
      if (ys[i] > height) ys[i] = 0;
      m4.makeTranslation(xs[i], ys[i], zs[i]);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  tick(0, 0);
  return { mesh, tick };
}

/** Giải phóng triệt để bộ nhớ GPU của một cây đối tượng */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const m = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    const list = Array.isArray(m) ? m : m ? [m] : [];
    for (const mm of list) {
      for (const v of Object.values(mm)) if (v instanceof THREE.Texture) v.dispose();
      if (mm instanceof THREE.ShaderMaterial) for (const u of Object.values(mm.uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
      mm.dispose();
    }
  });
}

/** Nội suy tuyến tính có giới hạn */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.min(1, Math.max(0, t));

/** Bộ đếm hoạt cảnh: chạy từ 0 → 1 trong durationMs */
export class Anim {
  value = 0;
  private dur = 0;
  private running = false;
  start(ms: number): void {
    this.dur = Math.max(1, ms) / 1000;
    this.value = 0;
    this.running = ms > 0;
    if (ms <= 0) this.value = 1;
  }
  reset(): void {
    this.value = 0;
    this.running = false;
  }
  tick(dt: number): number {
    if (this.running) {
      this.value = Math.min(1, this.value + dt / this.dur);
      if (this.value >= 1) this.running = false;
    }
    return this.value;
  }
  get active(): boolean {
    return this.running;
  }
}
