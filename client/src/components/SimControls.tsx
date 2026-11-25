/**
 * components/SimControls.tsx — Thanh điều khiển dưới cảnh 3D:
 *  - Chạy / Dừng / Từng bước / Đặt lại hoạt cảnh (số liệu đã ghi không bị xóa).
 *  - Góc nhìn chuẩn: Toàn cảnh, Chính diện, Từ trên, Bên cạnh và góc nhìn cận cảnh theo từng bước thí nghiệm.
 */
import { Pause, Play, RotateCcw, StepForward, Video } from 'lucide-react';
import { useLabStore, type CameraViewKind } from '../store/useLabStore';

const VIEWS: Array<[CameraViewKind, string]> = [
  ['overview', 'Toàn cảnh'],
  ['front', 'Chính diện'],
  ['top', 'Từ trên'],
  ['side', 'Bên cạnh']
];

export function SimControls() {
  const paused = useLabStore((s) => s.simPaused);
  const plugin = useLabStore((s) => s.plugin);
  const completed = useLabStore((s) => s.completedSteps);
  const st = useLabStore.getState;
  const current = plugin.steps.findIndex((s) => !completed.includes(s.id));
  const steps = plugin.steps.map((s, i) => ({ s, i })).filter((x) => x.s.trigger);
  const run = (): void => {
    const r = st().simRun();
    if (!r.ok) st().toast('info', r.message);
  };
  return (
    <div className="no-print absolute bottom-3 left-2 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-1.5" data-tour="sim">
      <div className="panel flex flex-wrap items-center gap-1 p-1" role="toolbar" aria-label="Điều khiển mô phỏng">
        <button className={`btn min-h-[36px] px-2.5 py-1 text-xs ${paused ? '' : 'border-lab-500'}`} onClick={run} aria-label="Chạy" title="Chạy tiếp hoặc phát lại hoạt cảnh lần đo gần nhất">
          <Play size={14} /> <span className="hidden sm:inline">Chạy</span>
        </button>
        <button className={`btn min-h-[36px] px-2.5 py-1 text-xs ${paused ? 'border-amber-400 text-warn' : ''}`} onClick={() => st().simPause()} aria-pressed={paused} aria-label="Dừng" title="Tạm dừng hoạt cảnh">
          <Pause size={14} /> <span className="hidden sm:inline">Dừng</span>
        </button>
        <button className="btn min-h-[36px] px-2.5 py-1 text-xs" onClick={() => st().simStep()} aria-label="Từng bước" title="Tiến 0,1 giây rồi dừng">
          <StepForward size={14} /> <span className="hidden sm:inline">Từng bước</span>
        </button>
        <button className="btn min-h-[36px] px-2.5 py-1 text-xs" onClick={() => st().simReset()} aria-label="Đặt lại" title="Đưa dụng cụ và đồng hồ về trạng thái ban đầu (giữ số liệu đã ghi)">
          <RotateCcw size={14} /> <span className="hidden sm:inline">Đặt lại</span>
        </button>
      </div>
      <label className="panel flex w-fit items-center gap-1 p-1 text-xs text-slate-300">
        <Video size={14} className="ml-1 shrink-0" />
        <span className="sr-only">Góc nhìn chuẩn</span>
        <select
          className="input w-auto max-w-[210px] py-1 text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith('step:')) st().setCameraView('step', plugin.steps[Number(v.slice(5))]?.trigger ?? null);
            else if (v) st().setCameraView(v as CameraViewKind);
          }}
          aria-label="Góc nhìn chuẩn"
        >
          <option value="">Góc nhìn…</option>
          {VIEWS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
          {steps.map(({ s, i }) => (
            <option key={s.id} value={`step:${i}`}>
              {i === current ? '▶ ' : ''}Bước {i + 1}: {s.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
