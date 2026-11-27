/**
 * components/SimControls.tsx — Điều khiển mô phỏng dưới cảnh 3D.
 * Luôn hiện: Tạm dừng/Tiếp tục, Xem lại, Đặt lại, Về góc nhìn ban đầu. Mục "Thêm": Từng bước và góc nhìn chuẩn (toàn cảnh, chính diện, từ trên, bên cạnh, theo bước).
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
  const showTrail = useLabStore((s) => s.settings.showTrail !== false);
  const view = useLabStore((s) => s.cameraView);
  const st = useLabStore.getState;
  const current = plugin.steps.findIndex((s) => !completed.includes(s.id));
  const steps = plugin.steps.map((s, i) => ({ s, i })).filter((x) => x.s.trigger);
  // Giá trị đang chọn của ô góc nhìn (khớp với góc nhìn thật của camera)
  const stepIdx = view.kind === 'step' ? plugin.steps.findIndex((s) => s.trigger === view.tag) : -1;
  const viewValue = view.kind === 'step' ? (stepIdx >= 0 ? `step:${stepIdx}` : 'overview') : view.kind;
  const viewText = view.kind === 'step' && stepIdx >= 0 ? `Bước ${stepIdx + 1}` : VIEWS.find(([k]) => k === view.kind)?.[1] ?? 'Toàn cảnh';
  const run = (): void => {
    const r = st().simRun();
    if (!r.ok) st().toast('info', r.message);
  };
  return (
    <div className="no-print absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-1.5" data-tour="sim">
      {more && (
        <div className="panel space-y-1.5 p-2">
          <label className="flex min-h-[36px] cursor-pointer items-center gap-2 px-1 text-xs text-slate-200">
            <input type="checkbox" className="h-4 w-4" checked={showTrail} onChange={(e) => st().updateSettings({ showTrail: e.target.checked })} />
            Hiện vệt chuyển động
          </label>
          <button className={`${BTN} w-full`} onClick={() => st().simStep()}>
            <StepForward size={14} /> Từng bước
          </button>
          <label className="block text-xs text-slate-300">
            Góc nhìn đang xem: <b className="text-slate-100">{viewText}</b>
            <select
              className="input mt-0.5 py-1.5 text-xs"
              value={viewValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith('step:')) st().setCameraView('step', plugin.steps[Number(v.slice(5))]?.trigger ?? null);
                else if (v) st().setCameraView(v as CameraViewKind);
              }}
              aria-label="Góc nhìn chuẩn"
            >
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
        {paused ? (
          <button className={`${BTN} border-lab-400`} onClick={run} title="Cho hoạt cảnh chạy tiếp">
            <Play size={14} /> Tiếp tục
          </button>
        ) : (
          <button className={BTN} onClick={() => st().simPause()} disabled={!hasRun} title={hasRun ? 'Dừng hình để quan sát kĩ' : 'Đo một lần rồi mới tạm dừng được'}>
            <Pause size={14} /> Tạm dừng
          </button>
        )}
        {hasRun && (
          <button
            className={BTN}
            onClick={() => {
              // Đang tạm dừng: bỏ dừng rồi phát lại từ đầu
              if (paused) st().simRun();
              run();
            }}
            title="Xem lại lần đo vừa rồi từ đầu"
          >
            <RotateCcw size={14} /> Xem lại
          </button>
        )}
        <button className={BTN} onClick={() => st().simReset()} title="Đưa dụng cụ và đồng hồ về ban đầu, số liệu đã ghi vẫn giữ">
          <RotateCcw size={14} /> Đặt lại
        </button>
        <button className={BTN} onClick={() => st().resetCamera()} aria-label="Về góc nhìn ban đầu (toàn cảnh)" title="Về góc nhìn ban đầu: đưa camera về toàn cảnh bàn thí nghiệm">
          <Focus size={15} />
        </button>
        <button className={`${BTN} ${more ? 'border-lab-400' : ''}`} title={`Từng bước, chọn góc nhìn (đang xem: ${viewText})`} onClick={() => setMore(!more)} aria-expanded={more} aria-label="Thêm điều khiển">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
