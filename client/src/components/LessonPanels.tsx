/**
 * components/LessonPanels.tsx — Các khối sư phạm trong bảng thí nghiệm:
 *  - PrincipleBox: nguyên tắc "thay đổi một đại lượng mỗi lần" và nhắc khi vừa đổi nhiều đại lượng.
 *  - ResumeCard: thẻ "Tiếp tục bài đang làm dở" từ nháp tự lưu.
 *  - ParamControls: thanh trượt / nút chọn tham số theo điều kiện hiển thị.
 *  - InsightPanel, SummaryPanel: giải thích theo thông số; xử lí số liệu tự động.
 *  - Mc964Console, OxidationTool: công cụ riêng của bài.
 */
import { useEffect, useMemo, useState } from 'react';
import { History, Lightbulb, RotateCcw, Sigma } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { clearDraft, db } from '../offline/db';
import { fmtVi } from '../services/appServices';
import { getSolver } from '../engines/solverRegistry';
import { formatOxidation, oxidationStates } from '../engines/chemistry/redox';
import { changedParams, matchShowIf, optionLabel, safeSummary } from '../utils/trialTable';
import type { DraftRecord, InsightBlock, ParamDef } from '../types/lab';

/* ------------------------------ Nguyên tắc ------------------------------ */
export function PrincipleBox() {
  const plugin = useLabStore((s) => s.plugin);
  const trials = useLabStore((s) => s.trials);
  const changed = trials.length > 1 ? changedParams(plugin, trials[trials.length - 2], trials[trials.length - 1]) : [];
  const many = changed.length > 1;
  return (
    <div className={`rounded-lg border p-2 text-xs ${many ? 'border-amber-500/70 bg-amber-900/30 text-amber-100' : 'border-lab-600/60 bg-lab-900/40 text-slate-200'}`} role="note">
      <p className="flex gap-1.5">
        <Lightbulb size={14} className="mt-0.5 shrink-0" />
        <span>
          Mẹo: mỗi lần chỉ đổi <b>một</b> thứ, giữ nguyên các thứ khác – như vậy mới biết cái gì làm kết quả thay đổi.
          {many && <b> Em vừa đổi cùng lúc {changed.length} thứ: {changed.join(', ')}.</b>}
        </span>
      </p>
    </div>
  );
}

/* ------------------------------- Nháp dở -------------------------------- */
export function ResumeCard({ onResume }: { onResume?: () => void }) {
  const plugins = useLabStore((s) => s.plugins);
  const plugin = useLabStore((s) => s.plugin);
  const trials = useLabStore((s) => s.trials.length);
  const steps = useLabStore((s) => s.completedSteps.length);
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [hidden, setHidden] = useState(false);
  const busy = trials > 0 || steps > 0;

  useEffect(() => {
    let alive = true;
    void db.drafts
      .orderBy('savedAt')
      .reverse()
      .toArray()
      .then((list) => {
        const usable = list.filter((d) => {
          const p = plugins.find((x) => x.id === d.pluginId);
          return p && (d.pluginVersion ?? 1) === p.version && (d.trials.length > 0 || d.completedSteps.length > 0);
        });
        // Ưu tiên nháp của bài đang mở, sau đó là nháp mới nhất
        if (alive) setDraft(usable.find((d) => d.pluginId === plugin.id) ?? usable[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [plugins, plugin.id, busy]);

  if (!draft || hidden || busy) return null;
  const p = plugins.find((x) => x.id === draft.pluginId);
  if (!p) return null;
  const st = useLabStore.getState;
  return (
    <section className="rounded-xl border-2 border-amber-400 bg-amber-950/60 p-3 shadow-lg" aria-label="Tiếp tục bài đang làm dở">
      <h3 className="flex items-center gap-2 text-base font-bold text-amber-200">
        <History size={18} /> Tiếp tục bài đang làm dở
      </h3>
      <p className="mt-0.5 text-sm text-slate-200">
        <b>{p.shortTitle}</b> · bước {Math.min(draft.completedSteps.length + 1, p.steps.length)}/{p.steps.length} · {draft.trials.length} lần đo
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          className="btn min-h-[46px] flex-1 border-amber-400 bg-amber-400 text-base font-bold text-slate-950 hover:bg-amber-300"
          onClick={() => {
            st().resumeDraft(draft);
            onResume?.();
          }}
        >
          Làm tiếp
        </button>
        <button className="btn-ghost min-h-[46px]" onClick={() => setHidden(true)}>
          Để sau
        </button>
        <button
          className="btn-ghost min-h-[46px]"
          onClick={() =>
            st().askConfirm({
              title: 'Xóa bản nháp?',
              message: `Xóa bài làm dở "${p.shortTitle}"? Không lấy lại được.`,
              confirmLabel: 'Xóa nháp',
              onConfirm: () => void clearDraft(draft.pluginId).then(() => setDraft(null)).catch(() => undefined)
            })
          }
        >
          Xóa nháp
        </button>
      </div>
    </section>
  );
}

/* ------------------------------- Tham số -------------------------------- */
function OptionParam({ p, value }: { p: ParamDef; value: number }) {
  const options = p.options ?? [];
  const set = (v: number): void => useLabStore.getState().setParam(p.key, v);
  if (options.length > 5) {
    return (
      <label className="block text-xs">
        {p.label}
        <select id={`param-${p.key}`} className="input mt-0.5 py-1.5 text-xs" value={value} onChange={(e) => set(Number(e.target.value))}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="text-xs">
      <div className="mb-0.5">{p.label}</div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={p.label}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={`btn min-h-[34px] flex-1 px-2 py-1 text-xs ${value === o.value ? 'border-lab-400 bg-lab-700 text-white' : ''}`} onClick={() => set(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ParamControls() {
  const plugin = useLabStore((s) => s.plugin);
  const params = useLabStore((s) => s.params);
  const completed = useLabStore((s) => s.completedSteps);
  const lockedKeys = plugin.steps.find((s) => !completed.includes(s.id))?.lockParams ?? [];
  return (
    <>
      {plugin.params
        .filter((p) => matchShowIf(p.showIf, params))
        .map((p) => {
          const value = params[p.key] ?? p.default;
          const locked = lockedKeys.includes(p.key);
          if (p.options) return <OptionParam key={p.key} p={p} value={value} />;
          return (
            <div key={p.key}>
              <label className="flex justify-between text-xs" htmlFor={`param-${p.key}`} title={p.description}>
                <span>
                  {p.label}
                  {locked && <span className="ml-1 text-slate-400">🔒 giữ nguyên</span>}
                </span>
                <b className="font-mono text-amber-200">
                  {fmtVi(value, 3)} {p.unit}
                </b>
              </label>
              <input id={`param-${p.key}`} type="range" className="w-full disabled:cursor-not-allowed disabled:opacity-40" disabled={locked} min={p.min} max={p.max} step={p.step} value={value} onChange={(e) => useLabStore.getState().setParam(p.key, Number(e.target.value))} aria-valuetext={`${value} ${p.unit}`} />
            </div>
          );
        })}
    </>
  );
}

/* ------------------------- Giải thích & xử lí số liệu ------------------------- */
const TONE = { info: 'border-slate-600', ok: 'border-ok', warn: 'border-amber-500' } as const;

export function InsightPanel() {
  const plugin = useLabStore((s) => s.plugin);
  const params = useLabStore((s) => s.params);
  const hidden = useLabStore((s) => s.hidden);
  const blocks = useMemo<InsightBlock[]>(() => {
    try {
      return getSolver(plugin.solverId).insight?.({ ...useLabStore.getState().solveContext(), plugin, params, hidden }) ?? [];
    } catch {
      return [];
    }
  }, [plugin, params, hidden]);
  if (!blocks.length) return null;
  return (
    <section aria-label="Kiến thức theo thông số đang chọn">
        <div className="space-y-1.5">
          {blocks.map((b) => (
            <div key={b.title} className={`rounded-lg border-l-4 bg-slate-800/70 p-2 text-sm ${TONE[b.tone]}`}>
              <b>{b.title}</b>
              <ul className="mt-0.5 space-y-0.5 text-slate-300">
                {b.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
    </section>
  );
}

export function SummaryPanel() {
  const plugin = useLabStore((s) => s.plugin);
  const trials = useLabStore((s) => s.trials);
  const lines = useMemo(() => safeSummary(plugin, trials), [plugin, trials]);
  if (!lines.length) return null;
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-xs" aria-label="Xử lí số liệu tự động">
      <h3 className="mb-1 flex items-center gap-1 font-bold text-lab-400">
        <Sigma size={13} /> Máy tính sẵn giúp em
      </h3>
      <dl className="space-y-1">
        {lines.map((l) => (
          <div key={l.label}>
            <dt className="inline text-slate-400">{l.label}: </dt>
            <dd className={`inline font-semibold ${l.status === 'warn' ? 'text-warn' : l.status === 'ok' ? 'text-ok' : ''}`}>
              {l.status === 'ok' ? '✓ ' : l.status === 'warn' ? '⚠ ' : ''}
              {l.value}
            </dd>
            {l.note && <div className="text-slate-400">{l.note}</div>}
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------- Đồng hồ MC964 ----------------------------- */
export function Mc964Console() {
  const plugin = useLabStore((s) => s.plugin);
  const params = useLabStore((s) => s.params);
  const visual = useLabStore((s) => s.visual);
  const mode = plugin.params.find((p) => p.key === 'mode');
  const scale = plugin.params.find((p) => p.key === 'scale');
  if (!mode || !scale) return null;
  const text = typeof visual.readout === 'string' ? visual.readout.replace('.', ',') : '0,000';
  return (
    <section className="rounded-lg border-2 border-slate-500 bg-slate-200 p-2 text-slate-900" aria-label="Đồng hồ đo thời gian hiện số MC964">
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded bg-slate-950 px-3 py-1 text-right font-mono text-2xl text-cyan-300" aria-live="polite">
          {text} <span className="text-sm">s</span>
        </div>
        <button className="btn-danger min-h-[38px] px-3 text-xs" onClick={() => useLabStore.getState().simReset()}>
          <RotateCcw size={13} /> RESET
        </button>
      </div>
      <p className="mt-1 text-[11px] font-semibold">
        MC964 · {optionLabel(mode, params.mode)} · thang {optionLabel(scale, params.scale)}
      </p>
    </section>
  );
}

/* ------------------------- Máy xác định số oxi hóa ------------------------- */
export function OxidationTool() {
  const [text, setText] = useState('KMnO4');
  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { ok: true as const, ...oxidationStates(text) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }, [text]);
  return (
    <section className="rounded-lg border border-slate-700 p-2 text-xs" aria-label="Máy xác định số oxi hóa">
      <h3 className="mb-1 font-bold text-lab-400">Máy xác định số oxi hóa</h3>
      <input className="input py-1.5 font-mono" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ví dụ: K2Cr2O7, SO4^2-, NH4+" aria-label="Công thức hóa học" autoCapitalize="off" spellCheck={false} />
      <div className="mt-1 flex flex-wrap gap-1">
        {['KMnO4', 'H2SO4', 'K2Cr2O7', 'H2O2', 'NH4+', 'SO4^2-', 'Fe2(SO4)3'].map((x) => (
          <button key={x} className="chip bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={() => setText(x)}>
            {x}
          </button>
        ))}
      </div>
      {result && !result.ok && <p className="mt-1 text-warn">{result.error}</p>}
      {result?.ok && (
        <div className="mt-1">
          <p className="font-mono text-amber-200">{Object.entries(result.states).map(([el, v]) => `${el}: ${formatOxidation(v)}`).join('   ')}</p>
          <ol className="list-decimal pl-4 text-slate-300">
            {result.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
