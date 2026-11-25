/**
 * components/DevDebugPanel.tsx — Bảng Debug cho nhóm phát triển (mở bằng ?debug=true):
 * AxesHelper & điểm gắn luôn hiện (ThreeEngineCore.setDebug), JSON Inspector trạng thái, xem thông số ẩn,
 * nhảy tới bước bất kì, xuất Bug Snapshot JSON kèm nhật ký thao tác & FPS.
 */
import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { downloadBugSnapshot } from '../utils/bugSnapshot';
import { getSolver } from '../engines/solverRegistry';

export function DevDebugPanel() {
  const s = useLabStore();
  const [open, setOpen] = useState(true);
  const solver = getSolver(s.plugin.solverId);
  let truth = Number.NaN;
  let est = Number.NaN;
  try {
    const last = s.trials[s.trials.length - 1];
    const ctx = last ? { ...s.solveContext(), params: last.params } : s.solveContext();
    truth = solver.trueResult(ctx);
    est = solver.estimateFromTrials(s.trials, ctx);
  } catch {
    /* công thức lỗi */
  }
  const inspect = { plugin: s.plugin.id, solver: s.plugin.solverId, seed: s.seed, hidden: s.hidden, params: s.params, completedSteps: s.completedSteps, ppe: s.ppe, incidents: s.activeIncidents, trials: s.trials.length, visual: s.visual, quality: s.qualityLevel };
  return (
    <div className="no-print fixed bottom-2 left-2 z-40 w-[min(94vw,360px)] rounded-lg border border-fuchsia-500/60 bg-slate-950/95 text-xs shadow-xl">
      <button className="flex w-full items-center gap-1 p-2 font-bold text-fuchsia-300" onClick={() => setOpen(!open)}>
        <Bug size={14} /> Debug {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <div className="space-y-2 p-2 pt-0">
          <p>
            Đáp án thật: <b className="font-mono">{Number.isFinite(truth) ? truth.toPrecision(5) : '—'}</b> · Ước lượng từ số liệu: <b className="font-mono">{Number.isFinite(est) ? est.toPrecision(5) : '—'}</b>
          </p>
          <div className="flex flex-wrap gap-1">
            {s.plugin.steps.map((st, i) => (
              <button key={st.id} className="rounded bg-slate-700 px-1.5 py-0.5 hover:bg-slate-600" onClick={() => s.jumpToStep(i)} title={st.title}>
                → B{i + 1}
              </button>
            ))}
            <button className="rounded bg-slate-700 px-1.5 py-0.5" onClick={() => s.jumpToStep(s.plugin.steps.length)}>
              Xong hết
            </button>
          </div>
          <pre className="max-h-48 overflow-auto rounded bg-black/60 p-1 text-[10px] leading-tight text-emerald-200">{JSON.stringify(inspect, null, 1)}</pre>
          <div className="flex gap-1">
            <button className="btn flex-1 text-xs" onClick={() => downloadBugSnapshot(inspect, s.perf)}>
              Xuất Bug Snapshot
            </button>
            <button className="btn flex-1 text-xs" onClick={() => s.setDebugMode(false)}>
              Tắt Debug
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
