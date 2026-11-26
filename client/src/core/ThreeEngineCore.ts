/**
 * core/ThreeEngineCore.ts — Lõi đồ họa Three.js thuần (không dùng react-three-fiber để giữ gói nhẹ).
 *
 * Trách nhiệm:
 *  - WebGLRenderer, PerspectiveCamera, OrbitControls (xoay/zoom bằng chuột & cảm ứng), ánh sáng.
 *  - Raycaster: chạm để thao tác (userData.tag), kéo thả vật (userData.draggable) vào SnapPoint.
 *  - Làm nổi bật dụng cụ của bước hiện tại (phát sáng nhịp nhàng).
 *  - Split-Screen: vẽ 2 cảnh cạnh nhau bằng scissor test (so sánh 2 thí nghiệm 3D).
 *  - Auto-Adaptive FPS: đo FPS mỗi giây, tự hạ/tăng pixelRatio & bóng đổ cho máy yếu.
 *  - dispose(): giải phóng triệt để GPU (geometry, material, texture, context) khi đổi bài / rời trang.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PerfStats } from '../types/lab';
import type { SceneHandle, SlideSpec, SnapPoint } from '../engines/sceneKit';

export interface EngineCallbacks {
  onInteract(tag: string, label: string): void;
  onSnap(snapId: string, tag: string): void;
  /** Vật trượt theo trục (cổng quang điện…) → giá trị tham số mới */
  onSlide(param: string, value: number): void;
  onHover(label: string | null): void;
  onPerf(stats: PerfStats): void;
  onQualityChange(level: number): void;
  onContextLost(): void;
}

export interface EngineOptions {
  quality: number;
  autoAdaptive: boolean;
  minFps: number;
  highContrast: boolean;
  /** Giao diện sáng: nền cảnh 3D màu nhạt */
  light?: boolean;
}

interface View {
  scene: THREE.Scene;
  handle: SceneHandle;
  lights: THREE.DirectionalLight;
}

const PIXEL_RATIOS = [0.75, 1, Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)];

export class ThreeEngineCore {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private main: View | null = null;
  private compare: View | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private resizeObs: ResizeObserver;
  private highlightTag: string | null = null;
  private debug = false;
  private axes: THREE.AxesHelper | null = null;
  private quality: number;
  private frames = 0;
  private fpsTimer = 0;
  private lowStreak = 0;
  private highStreak = 0;
  private disposed = false;
  private camTween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t: number } | null = null;

  // Trạng thái kéo thả
  private drag: { obj: THREE.Object3D; plane: THREE.Plane; origin: THREE.Vector3; offset: THREE.Vector3 } | null = null;
  private down: { x: number; y: number; t: number; hit: THREE.Object3D | null } | null = null;
  private hovered: THREE.Object3D | null = null;
  private slide: { obj: THREE.Object3D; spec: SlideSpec; moved: boolean } | null = null;
  private paused = false;
  private pendingStep = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly cb: EngineCallbacks,
    private opts: EngineOptions
  ) {
    this.quality = opts.quality;
    this.renderer = new THREE.WebGLRenderer({
      antialias: opts.quality >= 2,
      powerPreference: opts.quality === 0 ? 'low-power' : 'high-performance',
      alpha: false,
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(PIXEL_RATIOS[this.quality]);
    this.renderer.shadowMap.enabled = this.quality >= 2;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(this.bg());
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('aria-label', 'Không gian thí nghiệm 3D');
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
    this.camera.position.set(0, 1.6, 3);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('webglcontextlost', this.onContextLost, false);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    this.loop();
  }

  /* --------------------------- Quản lý cảnh --------------------------- */
  private makeView(handle: SceneHandle): View {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.bg());
    scene.fog = new THREE.Fog(scene.background as THREE.Color, 8, 18);
    scene.add(new THREE.HemisphereLight('#e0f2fe', '#1e293b', 1.1));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(2.5, 4, 2.5);
    sun.castShadow = this.quality >= 2;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -3;
    sun.shadow.camera.right = 3;
    sun.shadow.camera.top = 3;
    sun.shadow.camera.bottom = -3;
    scene.add(sun);
    scene.add(handle.root);
    return { scene, handle, lights: sun };
  }

  setMainScene(handle: SceneHandle): void {
    if (this.main) this.disposeView(this.main);
    this.main = this.makeView(handle);
    if (this.debug) this.attachDebug();
    this.resetCamera(true);
  }

  setCompareScene(handle: SceneHandle | null): void {
    if (this.compare) this.disposeView(this.compare);
    this.compare = handle ? this.makeView(handle) : null;
    this.resize();
  }

  getMainHandle(): SceneHandle | null {
    return this.main?.handle ?? null;
  }
  getCompareHandle(): SceneHandle | null {
    return this.compare?.handle ?? null;
  }

  private disposeView(v: View): void {
    v.scene.remove(v.handle.root);
    v.handle.dispose();
    v.lights.shadow.map?.dispose();
    v.lights.dispose();
    if (this.axes && this.axes.parent === v.scene) {
      v.scene.remove(this.axes);
    }
  }

  /** Về góc nhìn chuẩn của bài (có hoạt cảnh mượt) */
  resetCamera(instant = false): void {
    const h = this.main?.handle;
    if (!h) return;
    if (instant) {
      this.camera.position.copy(h.cameraPosition);
      this.controls.target.copy(h.cameraTarget);
      this.controls.update();
      this.camTween = null;
      return;
    }
    this.flyTo(h.cameraPosition, h.cameraTarget);
  }

  private flyTo(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camTween = { from: this.camera.position.clone(), to: position.clone(), tFrom: this.controls.target.clone(), tTo: target.clone(), t: 0 };
  }

  /** Góc nhìn chuẩn; 'step' = cận cảnh dụng cụ (thẻ tag hoặc điểm gắn) của một bước thí nghiệm */
  setView(kind: 'overview' | 'front' | 'top' | 'side' | 'step', tag: string | null): void {
    const h = this.main?.handle;
    if (!h) return;
    if (kind === 'overview') {
      this.resetCamera();
      return;
    }
    if (kind === 'step' && tag) {
      const bounds = new THREE.Box3();
      const snap = h.snapPoints.find((s) => s.id === tag);
      for (const o of h.interactive) if (o.userData.tag === tag || (snap && o.userData.tag === snap.accepts)) bounds.expandByObject(o);
      if (snap) bounds.expandByPoint(snap.position);
      if (bounds.isEmpty()) {
        this.resetCamera();
        return;
      }
      const center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(0.25, bounds.getSize(new THREE.Vector3()).length() / 2);
      const dir = h.cameraPosition.clone().sub(h.cameraTarget).normalize();
      this.flyTo(center.clone().addScaledVector(dir, Math.max(0.9, radius * 2.6)), center);
      return;
    }
    const dist = h.cameraPosition.distanceTo(h.cameraTarget);
    const offset = kind === 'top' ? new THREE.Vector3(0, 1, 0.12) : kind === 'side' ? new THREE.Vector3(1, 0.18, 0.05) : new THREE.Vector3(0, 0.12, 1);
    this.flyTo(h.cameraTarget.clone().addScaledVector(offset.normalize(), dist), h.cameraTarget);
  }

  /** Tạm dừng / chạy tiếp hoạt cảnh (camera và thao tác vẫn hoạt động) */
  setPaused(on: boolean): void {
    this.paused = on;
  }
  /** Tiến hoạt cảnh thêm `seconds` giây khi đang tạm dừng */
  stepSimulation(seconds: number): void {
    this.pendingStep += seconds;
  }

  /** Giá trị tham số ứng với vị trí con trỏ trên trục trượt */
  private slideValue(obj: THREE.Object3D, spec: SlideSpec): number {
    const parent = obj.parent;
    const a = spec.start.clone();
    const b = spec.end.clone();
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.localToWorld(a);
      parent.localToWorld(b);
    }
    const onAxis = new THREE.Vector3();
    this.raycaster.ray.distanceSqToSegment(a, b, undefined, onAxis);
    return spec.min + (spec.max - spec.min) * (a.distanceTo(onAxis) / Math.max(1e-6, a.distanceTo(b)));
  }

  setHighlightTag(tag: string | null): void {
    this.highlightTag = tag;
  }

  setQuality(level: number): void {
    this.quality = Math.max(0, Math.min(2, level));
    this.renderer.setPixelRatio(PIXEL_RATIOS[this.quality]);
    this.renderer.shadowMap.enabled = this.quality >= 2;
    for (const v of [this.main, this.compare]) if (v) v.lights.castShadow = this.quality >= 2;
    this.resize();
  }

  setOptions(opts: Partial<EngineOptions>): void {
    this.opts = { ...this.opts, ...opts };
    this.renderer.setClearColor(this.bg());
    for (const v of [this.main, this.compare]) {
      if (!v) continue;
      v.scene.background = new THREE.Color(this.bg());
      v.scene.fog = new THREE.Fog(this.bg(), 8, 18);
    }
  }

  /** Màu nền cảnh theo tương phản cao / giao diện sáng */
  private bg(): string {
    return this.opts.highContrast ? '#000000' : this.opts.light ? '#dbe4ee' : '#0b1220';
  }

  setDebug(on: boolean): void {
    this.debug = on;
    if (on) this.attachDebug();
    else if (this.axes) {
      this.axes.parent?.remove(this.axes);
      this.axes.dispose();
      this.axes = null;
    }
  }

  private attachDebug(): void {
    if (!this.main) return;
    if (!this.axes) this.axes = new THREE.AxesHelper(1.2);
    this.main.scene.add(this.axes);
  }

  /* ----------------------------- Kích thước ---------------------------- */
  resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = (this.compare ? w / 2 : w) / h;
    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------ Tương tác ---------------------------- */
  private setPointer(e: PointerEvent): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const w = this.compare ? rect.width / 2 : rect.width;
    const x = e.clientX - rect.left;
    if (this.compare && x > w) return false; // nửa phải chỉ để xem so sánh
    this.pointer.set((x / w) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    return true;
  }

  /** Tìm đối tượng có thẻ gần nhất (đi ngược lên cây cha) */
  private findTagged(o: THREE.Object3D | null): THREE.Object3D | null {
    let cur = o;
    while (cur) {
      if (typeof cur.userData.tag === 'string') return cur;
      cur = cur.parent;
    }
    return null;
  }

  private pick(): THREE.Object3D | null {
    if (!this.main) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.main.handle.interactive, true);
    for (const h of hits) {
      const t = this.findTagged(h.object);
      if (t) return t;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.setPointer(e)) return;
    const hit = this.pick();
    this.down = { x: e.clientX, y: e.clientY, t: performance.now(), hit };
    if (hit && hit.userData.slide) {
      this.slide = { obj: hit, spec: hit.userData.slide as SlideSpec, moved: false };
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      return;
    }
    if (hit && hit.userData.draggable) {
      const snapped = this.main?.handle.snapPoints.find((s) => s.filled && s.accepts === hit.userData.tag);
      if (snapped) return; // đã gắn rồi thì không kéo ra nữa
      this.controls.enabled = false;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.position.y);
      const p = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, p);
      this.drag = { obj: hit, plane, origin: hit.position.clone(), offset: hit.position.clone().sub(p) };
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.setPointer(e)) return;
    if (this.slide) {
      if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 4 && !this.slide.moved) return;
      this.slide.moved = true;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.cb.onSlide(this.slide.spec.param, this.slideValue(this.slide.obj, this.slide.spec));
      return;
    }
    if (this.drag) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const p = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.drag.plane, p)) {
        this.drag.obj.position.set(p.x + this.drag.offset.x, this.drag.origin.y + 0.08, p.z + this.drag.offset.z);
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const hit = this.pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        this.cb.onHover(hit ? String(hit.userData.label ?? hit.userData.tag) : null);
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const down = this.down;
    this.down = null;
    if (this.slide) {
      const { moved } = this.slide;
      this.slide = null;
      this.controls.enabled = true;
      try {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* con trỏ đã được giải phóng */
      }
      if (moved) return;
    }
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      this.controls.enabled = true;
      try {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* con trỏ đã được giải phóng */
      }
      const snap = this.findSnap(d.obj);
      if (snap) {
        d.obj.position.set(snap.position.x, snap.position.y, snap.position.z);
        snap.filled = true;
        this.cb.onSnap(snap.id, String(d.obj.userData.tag));
        return;
      }
      const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 99;
      d.obj.position.copy(d.origin);
      if (moved < 6) this.cb.onInteract(String(d.obj.userData.tag), String(d.obj.userData.label ?? ''));
      return;
    }
    if (!down || !down.hit) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 8 && performance.now() - down.t < 600) {
      const tag = String(down.hit.userData.tag);
      this.main?.handle.react?.(tag);
      this.cb.onInteract(tag, String(down.hit.userData.label ?? ''));
    }
  };

  /** Điểm gắn gần nhất (theo mặt phẳng ngang) nhận vật đang kéo, bán kính 0,45 */
  private findSnap(obj: THREE.Object3D): SnapPoint | null {
    if (!this.main) return null;
    let best: SnapPoint | null = null;
    let bestD = 0.45;
    for (const s of this.main.handle.snapPoints) {
      if (s.filled || s.accepts !== obj.userData.tag) continue;
      const d = Math.hypot(s.position.x - obj.position.x, s.position.z - obj.position.z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /** Gắn vật vào điểm gắn bằng lệnh (nút "Thực hiện bước" — hỗ trợ trợ năng / bàn phím) */
  autoSnap(snapId: string): boolean {
    const s = this.main?.handle.snapPoints.find((x) => x.id === snapId);
    if (!s || s.filled || !this.main) return false;
    const obj = this.main.handle.interactive.find((o) => o.userData.tag === s.accepts);
    if (!obj) return false;
    obj.position.copy(s.position);
    s.filled = true;
    return true;
  }

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.cb.onContextLost();
  };

  private onVisibility = (): void => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else if (!this.disposed) {
      this.clock.getDelta();
      this.loop();
    }
  };

  /* ------------------------------ Vòng lặp ----------------------------- */
  private applyHighlight(root: THREE.Object3D, time: number): void {
    const glow = 0.35 + 0.35 * Math.sin(time * 5);
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || !(m instanceof THREE.MeshStandardMaterial)) return;
      if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = m.emissive.getHex();
      let tagged: THREE.Object3D | null = o;
      while (tagged && typeof tagged.userData.tag !== 'string') tagged = tagged.parent;
      const on = tagged !== null && this.highlightTag !== null && tagged.userData.tag === this.highlightTag;
      if (on) m.emissive.setRGB(glow * 0.2, glow * 0.8, glow * 0.4);
      else m.emissive.setHex(m.userData.baseEmissive as number);
    });
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    // Giới hạn dt 0,5 s: máy rất chậm vẫn chạy hoạt cảnh đúng thời lượng, không "nhảy cóc" quá xa
    const dt = Math.min(0.5, this.clock.getDelta());
    const time = this.clock.elapsedTime;

    if (this.camTween) {
      this.camTween.t = Math.min(1, this.camTween.t + dt / 0.6);
      const k = 1 - (1 - this.camTween.t) ** 3;
      this.camera.position.lerpVectors(this.camTween.from, this.camTween.to, k);
      this.controls.target.lerpVectors(this.camTween.tFrom, this.camTween.tTo, k);
      if (this.camTween.t >= 1) this.camTween = null;
    }
    this.controls.update();

    const simDt = this.paused ? this.pendingStep : dt;
    this.pendingStep = 0;
    if (this.main) {
      this.main.handle.tick(simDt);
      this.applyHighlight(this.main.handle.root, time);
      if (this.debug) for (const s of this.main.handle.snapPoints) s.marker.visible = true;
    }
    this.compare?.handle.tick(simDt);

    const w = this.renderer.domElement.width / this.renderer.getPixelRatio();
    const h = this.renderer.domElement.height / this.renderer.getPixelRatio();
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    if (this.compare && this.main) {
      this.renderer.setScissorTest(true);
      this.renderer.setViewport(0, 0, w / 2, h);
      this.renderer.setScissor(0, 0, w / 2, h);
      this.renderer.render(this.main.scene, this.camera);
      this.renderer.setViewport(w / 2, 0, w / 2, h);
      this.renderer.setScissor(w / 2, 0, w / 2, h);
      this.renderer.render(this.compare.scene, this.camera);
      this.renderer.setScissorTest(false);
    } else if (this.main) {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.render(this.main.scene, this.camera);
    }
    this.measureFps(dt);
  };

  /** Đo FPS & tự thích ứng chất lượng */
  private measureFps(dt: number): void {
    this.frames++;
    this.fpsTimer += dt;
    if (this.fpsTimer < 1) return;
    const fps = this.frames / this.fpsTimer;
    this.frames = 0;
    this.fpsTimer = 0;
    if (this.opts.autoAdaptive) {
      if (fps < this.opts.minFps) {
        this.lowStreak++;
        this.highStreak = 0;
        if (this.lowStreak >= 2 && this.quality > 0) {
          this.setQuality(this.quality - 1);
          this.cb.onQualityChange(this.quality);
          this.lowStreak = 0;
        }
      } else if (fps > 55) {
        this.highStreak++;
        this.lowStreak = 0;
        if (this.highStreak >= 8 && this.quality < this.opts.quality) {
          this.setQuality(this.quality + 1);
          this.cb.onQualityChange(this.quality);
          this.highStreak = 0;
        }
      }
    }
    const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const info = this.renderer.info;
    this.cb.onPerf({
      fps: Math.round(fps),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      memoryMb: perfMem ? Math.round(perfMem.usedJSHeapSize / 1048576) : null,
      pixelRatio: this.renderer.getPixelRatio()
    });
  }

  /* ------------------------------ Giải phóng --------------------------- */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('webglcontextlost', this.onContextLost);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObs.disconnect();
    this.controls.dispose();
    if (this.main) this.disposeView(this.main);
    if (this.compare) this.disposeView(this.compare);
    this.axes?.dispose();
    this.main = null;
    this.compare = null;
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    el.remove();
  }
}
