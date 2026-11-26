/**
 * core/LabCanvasHost.tsx — Component React gắn ThreeEngineCore vào DOM và đồng bộ với Zustand store:
 *  - Đổi bài → dựng lại cảnh (giải phóng cảnh cũ), áp tài nguyên tùy biến.
 *  - Đổi trạng thái mô phỏng (visual/visualNonce) → handle.update.
 *  - Bước hiện tại → làm nổi bật dụng cụ cần thao tác.
 *  - Split-Screen, chất lượng đồ họa, Debug, Về góc nhìn chuẩn.
 *  - Chạm/kéo thả trong 3D → store.triggerInteraction → thông báo kết quả.
 */
import { useEffect, useRef, useState } from 'react';
import { ThreeEngineCore } from './ThreeEngineCore';
import { useLabStore } from '../store/useLabStore';
import { applyAssetOverrides, buildSceneForPlugin } from '../engines/sceneFactory';
import { getSolver } from '../engines/solverRegistry';
import { generateHiddenParams, mulberry32, sessionSeed } from '../utils/randomizer';
import { APP_CONFIG } from '../config/appConfig';
import { logAction } from '../utils/bugSnapshot';
import { useIsLight } from '../utils/theme';
import type { LabPluginDef } from '../types/lab';

export function LabCanvasHost({ onContextLost }: { onContextLost: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeEngineCore | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  /** Các thẻ đã cho cảnh 3D phản ứng (bật đèn...) khi bước được làm bằng nút bấm */
  const reactedRef = useRef(new Set<string>());
  const plugin = useLabStore((s) => s.plugin);
  const visual = useLabStore((s) => s.visual);
  const nonce = useLabStore((s) => s.visualNonce);
  const quality = useLabStore((s) => s.qualityLevel);
  const debug = useLabStore((s) => s.debugMode);
  const split = useLabStore((s) => s.splitScreen);
  const compareId = useLabStore((s) => s.comparePluginId);
  const camNonce = useLabStore((s) => s.cameraResetNonce);
  const completed = useLabStore((s) => s.completedSteps);
  const settings = useLabStore((s) => s.settings);
  const plugins = useLabStore((s) => s.plugins);
  const light = useIsLight();
  const sceneNonce = useLabStore((s) => s.sceneNonce);
  const paused = useLabStore((s) => s.simPaused);
  const stepNonce = useLabStore((s) => s.simStepNonce);
  const cameraView = useLabStore((s) => s.cameraView);

  // Khởi tạo engine một lần
  useEffect(() => {
    if (!ref.current) return;
    const st = useLabStore.getState();
    const engine = new ThreeEngineCore(
      ref.current,
      {
        onInteract: (tag) => {
          const r = useLabStore.getState().triggerInteraction(tag);
          useLabStore.getState().toast(r.ok ? 'success' : 'warning', r.message);
        },
        onSnap: (snapId) => {
          const r = useLabStore.getState().triggerInteraction(snapId);
          useLabStore.getState().toast(r.ok ? 'success' : 'warning', r.message);
        },
        onSlide: (param, value) => {
          const s = useLabStore.getState();
          const def = s.plugin.params.find((x) => x.key === param);
          if (!def) return;
          const snapped = Math.round(value / def.step) * def.step;
          const next = Math.min(def.max, Math.max(def.min, Number(snapped.toFixed(4))));
          if (next !== s.params[param]) s.setParam(param, next);
        },
        onHover: setHover,
        onPerf: (p) => useLabStore.getState().setPerf(p),
        onQualityChange: (q) => {
          useLabStore.getState().setQualityLevel(q);
          logAction('auto-quality', String(q));
        },
        onContextLost: () => {
          logAction('webgl-context-lost');
          onContextLost();
        }
      },
      { quality: st.qualityLevel, autoAdaptive: st.settings.autoAdaptiveFps, minFps: APP_CONFIG.minFps, highContrast: st.settings.highContrast, light: document.documentElement.classList.contains('theme-light'), showTrail: st.settings.showTrail }
    );
    engineRef.current = engine;
    // Chế độ phát triển: cho phép kiểm tra engine từ DevTools
    if (import.meta.env.DEV) (window as unknown as { __khtnEngine?: ThreeEngineCore }).__khtnEngine = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [onContextLost]);

  // Dựng cảnh chính khi đổi bài
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const handle = buildSceneForPlugin(plugin);
    engine.setMainScene(handle);
    reactedRef.current = new Set();
    const st = useLabStore.getState();
    handle.update(st.visual, st.visualNonce);
    let cleanup: (() => void) | null = null;
    let alive = true;
    void applyAssetOverrides(handle, plugin).then((c) => {
      if (alive) cleanup = c;
      else c();
    });
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [plugin, sceneNonce]);

  // Cảnh so sánh (split-screen)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const other: LabPluginDef | undefined = split && compareId ? plugins.find((p) => p.id === compareId) : undefined;
    if (!other) {
      engine.setCompareScene(null);
      return;
    }
    const h = buildSceneForPlugin(other);
    const session = useLabStore.getState().session;
    const hidden = generateHiddenParams(other.hidden, sessionSeed(session?.studentCode ?? 'KHACH', session?.classCode ?? 'TUDO', other.id));
    const params: Record<string, number> = {};
    for (const p of other.params) params[p.key] = p.default;
    try {
      h.update(getSolver(other.solverId).preview({ plugin: other, params, hidden, ppe: { goggles: true, gloves: true, labelCheck: true }, rng: mulberry32(1) }), 0);
    } catch {
      /* bài lỗi công thức vẫn hiển thị mô hình */
    }
    engine.setCompareScene(h);
  }, [split, compareId, plugins]);

  useEffect(() => {
    engineRef.current?.getMainHandle()?.update(visual, nonce);
  }, [visual, nonce]);

  useEffect(() => {
    engineRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    engineRef.current?.setOptions({ autoAdaptive: settings.autoAdaptiveFps, highContrast: settings.highContrast, light, showTrail: settings.showTrail });
  }, [settings.autoAdaptiveFps, settings.highContrast, light, settings.showTrail]);

  useEffect(() => {
    engineRef.current?.setDebug(debug);
  }, [debug]);

  useEffect(() => {
    if (camNonce > 0) engineRef.current?.resetCamera();
  }, [camNonce]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused, sceneNonce, plugin]);

  useEffect(() => {
    if (stepNonce > 0) engineRef.current?.stepSimulation(0.1);
  }, [stepNonce]);

  useEffect(() => {
    if (cameraView.nonce > 0) engineRef.current?.setView(cameraView.kind, cameraView.tag);
  }, [cameraView]);

  // Làm nổi bật dụng cụ của bước hiện tại; nếu bước "snap" được hoàn thành bằng nút, gắn vật tự động
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const step = plugin.steps.find((s) => !completed.includes(s.id));
    const snapIds = new Set(engine.getMainHandle()?.snapPoints.map((s) => s.id) ?? []);
    for (const s of plugin.steps) {
      if (!completed.includes(s.id) || !s.trigger) continue;
      if (snapIds.has(s.trigger)) engine.autoSnap(s.trigger);
      else if (s.action === 'click' && !reactedRef.current.has(s.trigger)) {
        reactedRef.current.add(s.trigger);
        engine.getMainHandle()?.react?.(s.trigger);
      }
    }
    if (!step?.trigger) {
      engine.setHighlightTag(null);
      return;
    }
    const sp = engine.getMainHandle()?.snapPoints.find((s) => s.id === step.trigger);
    engine.setHighlightTag(sp ? sp.accepts : step.trigger);
  }, [completed, plugin]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1 text-sm text-white shadow">
          {hover}
        </div>
      )}
      {split && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 bg-white/40" aria-hidden="true" />
          <span className="chip pointer-events-none absolute left-2 top-2 z-10 bg-slate-900/90 text-slate-100">Bên trái: {plugin.shortTitle} (đang làm)</span>
          <label className="absolute left-[calc(50%+0.5rem)] top-2 z-10 flex items-center gap-1 rounded-lg bg-slate-900/90 px-2 py-1 text-xs text-slate-100">
            Bên phải (chỉ xem):
            <select className="input w-auto py-0.5 text-xs" value={compareId ?? ''} onChange={(e) => useLabStore.getState().setSplitScreen(true, e.target.value)} aria-label="Chọn bài hiển thị bên phải">
              {plugins.filter((p) => p.id !== plugin.id).map((p) => (
                <option key={p.id} value={p.id}>{p.shortTitle}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
