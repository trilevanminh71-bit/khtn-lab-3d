/**
 * components/SceneDock.tsx — Thanh chỉnh nhanh đặt ngay trên cảnh 3D.
 * Kéo thanh trượt tới đâu, dụng cụ trong cảnh di chuyển / đổi trạng thái tới đó (store.setParam → solver.preview → cảnh 3D).
 * Chỉ hiện các thông số dạng thanh trượt đang áp dụng; thông số đang bị khóa ở bước hiện tại thì mờ đi.
 */
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { fmtVi } from '../services/appServices';
import { matchShowIf } from '../utils/trialTable';

export function SceneDock() {
  const plugin = useLabStore((s) => s.plugin);
  const params = useLabStore((s) => s.params);
  const completed = useLabStore((s) => s.completedSteps);
  const submitted = useLabStore((s) => s.submitted);
  const sandboxOn = useLabStore((s) => s.sandboxOn);
  // Màn hình hẹp (điện thoại): mặc định thu gọn để không che cảnh 3D
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900);
  const sliders = plugin.params.filter((p) => !p.options && matchShowIf(p.showIf, params));
  if (!sliders.length || submitted || sandboxOn) return null;
  const locked = plugin.steps.find((s) => !completed.includes(s.id))?.lockParams ?? [];
  if (!open) {
    return (
      <button className="btn no-print absolute right-2 top-2 z-10 min-h-[40px] px-2.5 text-xs shadow-lg" onClick={() => setOpen(true)} title="Mở thanh chỉnh nhanh">
        <SlidersHorizontal size={15} /> Chỉnh nhanh
      </button>
    );
  }
  return (
    <div className="panel no-print absolute right-2 top-2 z-10 w-[min(250px,calc(100%-1rem))] space-y-1.5 p-2 shadow-xl" aria-label="Chỉnh nhanh thí nghiệm">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
        <span className="flex items-center gap-1">
          <SlidersHorizontal size={14} /> Kéo để chỉnh – xem dụng cụ đổi theo
        </span>
        <button className="rounded p-1 text-slate-400 hover:bg-slate-800" onClick={() => setOpen(false)} aria-label="Thu gọn thanh chỉnh nhanh" title="Thu gọn">
          <X size={14} />
        </button>
      </div>
      {sliders.map((p) => {
        const value = params[p.key] ?? p.default;
        const lock = locked.includes(p.key);
        return (
          <label key={p.key} className="block text-xs" title={p.description}>
            <span className="flex justify-between gap-2">
              <span className="truncate">
                {p.label}
                {lock && <span className="text-slate-400"> 🔒</span>}
              </span>
              <b className="shrink-0 font-mono text-amber-200">
                {fmtVi(value, 3)} {p.unit}
              </b>
            </span>
            <input type="range" className="w-full disabled:opacity-40" disabled={lock} min={p.min} max={p.max} step={p.step} value={value} onChange={(e) => useLabStore.getState().setParam(p.key, Number(e.target.value))} aria-valuetext={`${value} ${p.unit}`} />
          </label>
        );
      })}
    </div>
  );
}
