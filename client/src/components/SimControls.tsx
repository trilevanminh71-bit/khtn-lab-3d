/**
 * components/SimControls.tsx — Điều khiển mô phỏng dưới cảnh 3D.
 * Luôn hiện: Chạy/Dừng và Đặt lại. Mục "Thêm": Từng bước và góc nhìn chuẩn (toàn cảnh, chính diện, từ trên, bên cạnh, theo bước).
 */
import { useState } from 'react';
import { Focus, MoreHorizontal, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useLabStore, type CameraViewKind } from '../store/useLabStore';

const VIEWS: Array<[CameraViewKind, string]> = [
  ['overview', 'Toàn cảnh'],
  ['front', 'Chính diện'],
  ['top', 'Từ trên'],
  ['side', 'Bên cạnh']
];
const BTN = 'btn min-h-[40px] px-2.5 py-1 text-xs';

export function SimControls() {
  const paused = useLabStore((s) => s.simPaused);
  const hasRun = useLabStore((s) => s.lastMeasureVisual !== null);
  const plugin = useLabStore((s) => s.plugin);
  const completed = useLabStore((s) => s.completedSteps);
  const [more, setMore] = useState(false);
  const st = useLabStore.getState;
  const current = plugin.steps.findIndex((s) => !completed.includes(s.id));
  const steps = plugin.steps.map((s, i) => ({ s, i })).filter((x) => x.s.trigger);
  const run = (): void => {
    const r = st().simRun();
    if (!r.ok) st().toast('info', r.message);
  };
  return (
    <div className="no-print absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-1.5" data-tour="sim">
      {more && (
        <div className="panel space-y-1.5 p-2">
          <button className={`${BTN} w-full`} onClick={() => st().simStep()}>
            <StepForward size={14} /> Từng bước
          </button>
          <label className="block text-xs text-slate-300">
            Góc nhìn
            <select
              className="input mt-0.5 py-1.5 text-xs"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith('step:')) st().setCameraView('step', plugin.steps[Number(v.slice(5))]?.trigger ?? null);
                else if (v) st().setCameraView(v as CameraViewKind);
              }}
              aria-label="Góc nhìn chuẩn"
            >
              <option value="">Chọn góc nhìn…</option>
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
      )}
      <div className="panel flex items-center gap-1 p-1" role="toolbar" aria-label="Điều khiển mô phỏng">
        {hasRun && !paused && (
          <button className={BTN} onClick={() => st().simPause()}>
            <Pause size={14} /> Dừng
          </button>
        )}
        {(paused || hasRun) && (
          <button className={BTN} onClick={run}>
            <Play size={14} /> {paused ? 'Chạy tiếp' : 'Chạy lại'}
          </button>
        )}
        <button className={BTN} onClick={() => st().simReset()} title="Đưa dụng cụ và đồng hồ về ban đầu, giữ số liệu đã ghi">
          <RotateCcw size={14} /> Đặt lại
        </button>
        <button className={BTN} onClick={() => st().resetCamera()} aria-label="Về góc nhìn ban đầu" title="Về góc nhìn ban đầu">
          <Focus size={15} />
        </button>
        <button className={`${BTN} ${more ? 'border-lab-400' : ''}`} title="Từng bước, chọn góc nhìn" onClick={() => setMore(!more)} aria-expanded={more} aria-label="Thêm điều khiển">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
