/**
 * components/SandboxControls.tsx — Điều khiển dụng cụ trong chế độ "Tự do thí nghiệm".
 *  - SandboxTimeBar: Chạy/Dừng thời gian, Từng bước, Đặt lại, tốc độ thời gian theo nấc (×1 … ×600), đồng hồ mô phỏng.
 *  - SandboxItemControls: công tắc / nấc / thanh trượt / nút thao tác của dụng cụ đang chọn, số đọc thời gian thực, xem cận cảnh.
 *  - SandboxAlerts: cảnh báo tràn đổ, quá nhiệt, quá giới hạn đo, thiếu bảo hộ (nhắc nhẹ, không chặn).
 * Mọi thao tác chỉ đổi store.sandboxWorld — không tạo lần đo, không ghi bảng số liệu, không ảnh hưởng bài nộp chấm điểm.
 */
import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Eraser,
  Focus,
  Info,
  Link2,
  LocateFixed,
  OctagonAlert,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Undo2
} from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { equipmentById } from '../data/equipmentCatalog';
import {
  childOn,
  controlsFor,
  mountOptions,
  microscopeSharpness,
  readoutsFor,
  SANDBOX_SPEEDS,
  sandboxAlerts,
  type SbAlert
} from '../engines/sandboxSim';

const st = useLabStore.getState;

function say(r: { ok: boolean; message: string }): void {
  if (r.message)
    st().toast(r.ok ? (/Nguy hiểm|Tràn|Quá giới hạn/.test(r.message) ? 'warning' : 'info') : 'warning', r.message);
}

function fmtClock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

export function SandboxTimeBar() {
  const running = useLabStore((s) => s.sandboxWorld.running);
  const speed = useLabStore((s) => s.sandboxWorld.speed);
  const t = useLabStore((s) => s.sandboxWorld.t);
  const paused = useLabStore((s) => s.simPaused);
  const on = running && !paused;
  return (
    <section className="rounded-lg border border-slate-700 p-1.5" aria-label="Điều khiển thời gian thí nghiệm tự do">
      <div className="flex flex-wrap items-center gap-1">
        <button
          className={`btn min-h-[36px] px-2 text-xs ${on ? '' : 'border-emerald-500'}`}
          onClick={() => st().setSandboxRunning(!on)}
          title={on ? 'Dừng thời gian (dụng cụ đứng yên)' : 'Cho thời gian chạy tiếp'}
        >
          {on ? <Pause size={14} /> : <Play size={14} />} {on ? 'Dừng' : 'Chạy'}
        </button>
        <button
          className="btn min-h-[36px] px-2 text-xs"
          onClick={() => st().sandboxAdvance(1, true)}
          title={`Tiến thêm ${speed} giây rồi đứng lại`}
        >
          <StepForward size={14} /> +{speed >= 60 ? `${speed / 60} phút` : `${speed} s`}
        </button>
        <button
          className="btn min-h-[36px] px-2 text-xs"
          onClick={() => st().resetSandboxWorld()}
          title="Đưa mọi dụng cụ về trạng thái ban đầu (giữ dụng cụ trên bàn)"
        >
          <RotateCcw size={14} /> Đặt lại
        </button>
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-300">
          Tốc độ
          <select
            className="input w-auto py-1 text-xs"
            value={speed}
            onChange={(e) => st().setSandboxSpeed(Number(e.target.value))}
            aria-label="Tốc độ thời gian"
          >
            {SANDBOX_SPEEDS.map((x) => (
              <option key={x} value={x}>
                ×{x}
                {x === 1 ? ' (thực)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Thời gian thí nghiệm: <b className="font-mono text-slate-200">{fmtClock(t)}</b>
        {!on && <span className="ml-1 text-amber-300">· đang dừng</span>}
        {speed > 1 && <span className="ml-1">· tua nhanh ×{speed} (đun nóng, nuôi cấy, phản ứng chậm)</span>}
      </p>
    </section>
  );
}

/** Thị trường kính hiển vi: độ phóng đại, độ nét, đèn, tiêu bản */
function MicroscopeView({ slot }: { slot: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = useLabStore((x) => x.sandboxWorld.states[slot]);
  const items = useLabStore((x) => x.sandboxItems);
  // Chỉ thấy mẫu khi lam kính đã đặt trên bàn kính của chính kính hiển vi này
  const slideIdx = useLabStore((x) => childOn(x.sandboxWorld, x.sandboxItems, 'lam-kinh', slot));
  const slide = useLabStore((x) => x.sandboxWorld.states[slideIdx]);
  const sharp = s ? microscopeSharpness(s) : 0;
  const hasSample = slideIdx >= 0 && items.length > 0;
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !s) return;
    const W = c.width;
    ctx.fillStyle = s.lamp ? '#f8fafc' : '#020617';
    ctx.fillRect(0, 0, W, W);
    if (!s.lamp || !hasSample) return;
    // Tế bào biểu bì hành: các ô chữ nhật, kích thước tỉ lệ với độ phóng đại
    const cell = 6 * (s.obj / 4) ** 0.85;
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = Math.max(1, cell / 18);
    ctx.fillStyle = slide?.water ? '#fde68a' : '#fef3c7';
    for (let y = -cell; y < W + cell; y += cell * 0.9) {
      const off = (Math.round(y / cell) % 2) * cell * 0.8;
      for (let x = -cell * 2; x < W + cell; x += cell * 1.6) {
        ctx.fillRect(x + off, y, cell * 1.55, cell * 0.85);
        ctx.strokeRect(x + off, y, cell * 1.55, cell * 0.85);
        if (cell > 12) {
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.arc(x + off + cell * 0.6, y + cell * 0.4, cell * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = slide?.water ? '#fde68a' : '#fef3c7';
        }
      }
    }
    if (slide?.bubbles || !slide?.cover) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      [0.3, 0.7, 0.55].forEach((k, i) => {
        ctx.beginPath();
        ctx.arc(W * k, W * (0.3 + i * 0.2), 10 + i * 6, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }, [s, hasSample, slide]);
  if (!s) return null;
  return (
    <figure className="flex items-center gap-2">
      <canvas
        ref={ref}
        width={160}
        height={160}
        className="h-28 w-28 shrink-0 rounded-full border-4 border-slate-800"
        style={{ filter: `blur(${((1 - sharp) * 6).toFixed(1)}px)` }}
        aria-label="Thị trường kính hiển vi"
      />
      <figcaption className="text-[11px] text-slate-400">
        {!s.lamp
          ? 'Đèn tắt — thị trường tối.'
          : !hasSample
            ? 'Chưa đặt lam kính lên bàn kính — kéo lam kính tới kính hiển vi.'
            : sharp > 0.85
              ? 'Ảnh rõ nét.'
              : sharp > 0.4
                ? 'Hơi mờ — chỉnh ốc vi cấp.'
                : 'Mờ — chỉnh ốc sơ cấp (vật kính nhỏ) rồi ốc vi cấp.'}
      </figcaption>
    </figure>
  );
}

export function SandboxItemControls({ slot }: { slot: number }) {
  const id = useLabStore((s) => s.sandboxItems[slot]);
  const state = useLabStore((s) => s.sandboxWorld.states[slot]);
  const world = useLabStore((s) => s.sandboxWorld);
  const items = useLabStore((s) => s.sandboxItems);
  const def = id ? equipmentById(id) : undefined;
  if (!id || !state || !def) return null;
  const controls = controlsFor(id);
  const readouts = readoutsFor(world, items, slot);
  return (
    <div className="mt-1 space-y-1.5 rounded-lg bg-slate-900/60 p-2" aria-label={`Điều khiển ${def.name}`}>
      <div className="flex items-start gap-1">
        <p className="flex-1 text-[11px] text-slate-400">{def.description}</p>
        <button
          className="btn min-h-[30px] shrink-0 px-2 text-[11px]"
          onClick={() => st().setCameraView('step', `sb:${slot}:${id}`)}
          title="Đưa camera tới gần dụng cụ này"
        >
          <Focus size={12} /> Xem gần
        </button>
      </div>
      <PositionControls slot={slot} />
      {readouts.length > 0 && (
        <dl className="grid grid-cols-2 gap-1" aria-live="polite">
          {readouts.map((r) => (
            <div key={r.label} className="rounded bg-slate-950/70 px-1.5 py-1">
              <dt className="truncate text-[10px] text-slate-400" title={r.label}>
                {r.label}
              </dt>
              <dd className="font-mono text-xs text-cyan-200">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {id === 'kinh-hien-vi' && <MicroscopeView slot={slot} />}
      {controls.map((c) => {
        if (c.kind === 'toggle') {
          const on = state[c.key] === 1;
          return (
            <div key={c.key} className="flex items-center gap-1.5 text-xs">
              <span className="flex-1">{c.label}</span>
              <button
                role="switch"
                aria-checked={on}
                className={`btn min-h-[32px] px-2 text-xs ${on ? 'border-emerald-500 text-emerald-200' : ''}`}
                onClick={() => say(st().sandboxControl(slot, c.key, on ? 0 : 1))}
              >
                {on ? c.on : c.off}
              </button>
            </div>
          );
        }
        if (c.kind === 'steps') {
          return (
            <div key={c.key} className="text-xs">
              <span className="mb-0.5 block text-slate-300">{c.label}</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={c.label}>
                {c.options.map((o, k) => (
                  <button
                    key={o}
                    role="radio"
                    aria-checked={state[c.key] === o}
                    className={`btn min-h-[30px] px-2 text-[11px] ${state[c.key] === o ? 'border-lab-400 bg-lab-700 text-white' : ''}`}
                    onClick={() => say(st().sandboxControl(slot, c.key, o))}
                  >
                    {c.names?.[k] ?? o}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (c.kind === 'range') {
          if (id === 'mang-nghieng' && c.key === 'gate' && !items.includes('cong-quang-dien')) return null;
          return (
            <label key={c.key} className="block text-xs">
              <span className="flex justify-between">
                <span>{c.label}</span>
                <b className="font-mono text-amber-200">
                  {(state[c.key] * (c.unit === 'm' ? 100 : 1)).toFixed(c.unit === 'm' ? 0 : 1)}{' '}
                  {c.unit === 'm' ? 'cm' : c.unit}
                </b>
              </span>
              <input
                type="range"
                className="w-full"
                min={c.min}
                max={c.max}
                step={c.step}
                value={state[c.key]}
                onChange={(e) => say({ ...st().sandboxControl(slot, c.key, Number(e.target.value)), message: '' })}
                aria-label={c.label}
              />
            </label>
          );
        }
        return null;
      })}
      {controls.some((c) => c.kind === 'action') && (
        <div className="flex flex-wrap gap-1">
          {controls.map((c) =>
            c.kind === 'action' ? (
              <button
                key={c.key}
                className="btn-primary min-h-[34px] px-2 text-xs"
                onClick={() => say(st().sandboxAction(slot, c.key))}
              >
                {c.label}
              </button>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

const ALERT_STYLE: Record<SbAlert['level'], { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-sky-600/60 bg-sky-900/30 text-sky-100', Icon: Info },
  warn: { cls: 'border-amber-500/60 bg-amber-900/30 text-amber-100', Icon: AlertTriangle },
  danger: { cls: 'border-rose-500/70 bg-rose-900/40 text-rose-100', Icon: OctagonAlert }
};

export function SandboxAlerts() {
  const world = useLabStore((s) => s.sandboxWorld);
  const items = useLabStore((s) => s.sandboxItems);
  const ppe = useLabStore((s) => s.ppe);
  const alerts = sandboxAlerts(world, items, ppe);
  if (!alerts.length) return null;
  const order = { danger: 0, warn: 1, info: 2 };
  return (
    <section className="space-y-1" role="status" aria-label="Cảnh báo an toàn thí nghiệm tự do">
      {[...alerts]
        .sort((a, b) => order[a.level] - order[b.level])
        .map((a) => {
          const { cls, Icon } = ALERT_STYLE[a.level];
          return (
            <p
              key={`${a.slot}-${a.text}`}
              className={`flex items-start gap-1.5 rounded-lg border p-1.5 text-xs ${cls}`}
            >
              <Icon size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">
                {a.slot >= 0 && <b>{a.slot + 1}. </b>}
                {a.text}
              </span>
              {a.slot < 0 && (
                <button className="btn min-h-[28px] shrink-0 px-2 text-[11px]" onClick={() => st().wipeSandboxSpill()}>
                  <Eraser size={12} /> Lau bàn
                </button>
              )}
              {a.slot >= 0 && (
                <button className="shrink-0 text-[11px] underline" onClick={() => st().selectSandbox(a.slot)}>
                  Chọn
                </button>
              )}
            </p>
          );
        })}
    </section>
  );
}

/** Vị trí 3D của dụng cụ: độ cao, lắp vào dụng cụ chủ, tháo / đặt lại vị trí, cất vào tủ */
function PositionControls({ slot }: { slot: number }) {
  const items = useLabStore((s) => s.sandboxItems);
  const pos = useLabStore((s) => s.sandboxWorld.pos[slot]);
  const link = useLabStore((s) => s.sandboxWorld.links[slot] ?? -1);
  if (!pos) return null;
  const opts = mountOptions(items, slot);
  const hostName = link >= 0 ? equipmentById(items[link])?.name : '';
  const mountLabel = opts.find((o) => o.host === link)?.def.label;
  return (
    <div className="space-y-1 rounded border border-slate-700/70 p-1.5 text-xs" aria-label="Vị trí dụng cụ">
      <p className="text-[11px] text-slate-400">
        {link >= 0 ? (
          <span className="text-emerald-300">
            <Link2 size={11} className="inline" /> Đã lắp {mountLabel} ({link + 1}. {hostName})
          </span>
        ) : (
          'Đứng tự do trên bàn'
        )}{' '}
        · x {pos[0].toFixed(2)} · z {pos[2].toFixed(2)} m
      </p>
      {link < 0 && (
        <label className="block">
          <span className="flex justify-between">
            <span>Độ cao (Shift + kéo trong 3D)</span>
            <b className="font-mono text-amber-200">{Math.round(pos[1] * 100)} cm</b>
          </span>
          <input
            type="range"
            className="w-full"
            min={0}
            max={1}
            step={0.01}
            value={pos[1]}
            onChange={(e) => st().sandboxPlace(slot, pos[0], Number(e.target.value), pos[2])}
            aria-label="Độ cao dụng cụ"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-1">
        {opts
          .filter((o) => o.host !== link)
          .map((o) => (
            <button
              key={`${o.host}-${o.def.label}`}
              className="btn min-h-[30px] px-2 text-[11px]"
              onClick={() => {
                const h = useLabStore.getState().sandboxWorld.pos[o.host];
                const r = st().sandboxPlace(slot, h[0], h[1], h[2], o.host);
                if (r.message) st().toast('success', r.message);
              }}
            >
              <Link2 size={12} /> Lắp {o.def.label} ({o.host + 1})
            </button>
          ))}
        <button
          className="btn min-h-[30px] px-2 text-[11px]"
          onClick={() => st().resetSandboxPos(slot)}
          title={link >= 0 ? 'Tháo ra và đặt về chỗ trống trên bàn' : 'Đặt về chỗ trống trên bàn'}
        >
          <LocateFixed size={12} /> {link >= 0 ? 'Tháo ra' : 'Đặt lại vị trí'}
        </button>
        <button className="btn min-h-[30px] px-2 text-[11px]" onClick={() => st().removeSandboxItem(slot)}>
          <Undo2 size={12} /> Cất vào tủ
        </button>
      </div>
    </div>
  );
}
