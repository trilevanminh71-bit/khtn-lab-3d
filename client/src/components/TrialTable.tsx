/**
 * components/TrialTable.tsx — Bảng số liệu dùng chung (HUD, phiếu báo cáo, phiếu thí nghiệm).
 *  - Cột tham số, số đo, cột tự tính; tiêu đề tiếng Việt; ô không áp dụng hiện "—".
 *  - Tách nhiều bảng theo `plugin.tables` (ví dụ Bảng 6.1 / 6.2 của Bài 6).
 *  - Chưa có số liệu: một dòng VÍ DỤ màu xám để học sinh biết cách đọc bảng.
 *  - Hàng nhập tay (từ thiết bị thật) có dấu ✎.
 *  - ManualRowForm: nút "+ Thêm hàng" để tự nhập số đo.
 */
import { useMemo, useState } from 'react';
import { Flag, Plus, Trash2 } from 'lucide-react';
import type { LabPluginDef, TrialRecord } from '../types/lab';
import { buildColumns, cellText, columnTitle, derivedValues, exampleTrial, matchShowIf, trialIssue } from '../utils/trialTable';
import { parseViNumber } from '../services/appServices';
import { useLabStore } from '../store/useLabStore';

interface Props {
  plugin: LabPluginDef;
  trials: TrialRecord[];
  onDelete?: (index: number) => void;
  /** Bật/tắt cờ đo lỗi */
  onFlag?: (index: number) => void;
  print?: boolean;
  /** Hiện dòng ví dụ khi bảng trống */
  example?: Record<string, number>;
}

function OneTable({ plugin, trials, onDelete, onFlag, print, example, title }: Props & { title?: string }) {
  const all = useLabStore((s) => s.trials);
  // Cột tình trạng chỉ hiện ở bài có quy tắc hợp lệ hoặc khi có lần bị đánh dấu lỗi
  const showStatus = !!plugin.validity || trials.some((t) => t.flagged || t.paramChanged);
  const sample = useMemo(() => (example && trials.length === 0 ? exampleTrial(plugin, example) : null), [plugin, example, trials.length]);
  const rows = sample ? [sample] : trials;
  const cols = buildColumns(plugin, rows);
  const cell = print ? 'border border-slate-400 p-1 text-center' : 'p-1';
  const tone = { param: '', measure: print ? '' : 'text-amber-200', derived: print ? 'bg-slate-100' : 'text-lab-400' } as const;
  return (
    <div>
      {title && <h3 className={`mb-1 text-sm font-semibold ${print ? '' : 'text-slate-200'}`}>{title}</h3>}
      <div className="overflow-x-auto">
        <table className={`w-full text-xs ${print ? 'border-collapse' : ''}`}>
          <thead>
            <tr className={print ? '' : 'border-b border-slate-700 text-left text-slate-400'}>
              <th className={cell}>Lần</th>
              {cols.map((c) => (
                <th key={`${c.kind}-${c.key}`} className={`${cell} ${tone[c.kind]}`} title={c.kind === 'derived' ? 'Cột tự tính' : undefined}>
                  {columnTitle(c)}
                </th>
              ))}
              {showStatus && <th className={cell}>Tình trạng</th>}
              {onDelete && <th className={cell} aria-label="Xóa" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const d = derivedValues(plugin, t, rows);
              const isSample = t === sample;
              const issue = isSample ? null : trialIssue(plugin, t, print ? trials : all);
              return (
                <tr key={isSample ? 'vd' : t.index} className={`${print ? '' : 'border-b border-slate-800'} ${isSample ? 'italic text-slate-500' : ''} ${issue ? 'text-slate-500 line-through decoration-slate-500/60' : ''}`} title={isSample ? 'Dòng ví dụ — không phải số liệu của em' : t.manual ? 'Hàng nhập tay' : undefined}>
                  <td className={`${cell} whitespace-nowrap`}>{isSample ? 'Ví dụ' : `${t.index}${t.manual ? ' ✎' : ''}`}</td>
                  {cols.map((c) => (
                    <td key={`${c.kind}-${c.key}`} className={`${cell} whitespace-nowrap ${print || isSample ? '' : 'font-mono'} ${c.kind === 'derived' && !isSample ? tone.derived : ''}`}>
                      {cellText(c, t, d)}
                    </td>
                  ))}
                  {showStatus && (
                  <td className={`${cell} whitespace-nowrap no-underline`} style={{ textDecoration: 'none' }}>
                    {isSample ? '' : issue ? <span className={print ? '' : 'rounded bg-amber-900/50 px-1 text-[11px] text-amber-200'} title="Không tính vào trung bình và kết quả">Loại: {issue}</span> : <span className={print ? '' : 'text-ok'}>Hợp lệ</span>}
                  </td>
                  )}
                  {onDelete && (
                    <td className={`${cell} whitespace-nowrap`} style={{ textDecoration: 'none' }}>
                      {!isSample && onFlag && (
                        <button className={`mr-1 ${t.flagged ? 'text-warn' : 'text-slate-500 hover:text-warn'}`} onClick={() => onFlag(t.index)} aria-label={t.flagged ? `Bỏ đánh dấu lỗi lần ${t.index}` : `Đánh dấu lần ${t.index} đo lỗi`} title={t.flagged ? 'Bỏ đánh dấu đo lỗi' : 'Đánh dấu đo lỗi (không tính)'}>
                          <Flag size={13} />
                        </button>
                      )}
                      {!isSample && (
                        <button className="text-slate-500 hover:text-danger" onClick={() => onDelete(t.index)} aria-label={`Xóa lần đo ${t.index}`} title="Xóa lần đo bất thường">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sample && <p className="mt-1 text-xs italic text-slate-500">Dòng xám là ví dụ cách ghi số liệu, không phải số liệu của em.</p>}
    </div>
  );
}

export function TrialTable(props: Props) {
  const groups = props.plugin.tables ?? [];
  if (!groups.length) return <OneTable {...props} />;
  const shown = groups.filter((g) => props.trials.some((t) => matchShowIf(g.showIf, t.params)) || (props.trials.length === 0 && props.example && matchShowIf(g.showIf, props.example)));
  return (
    <div className="space-y-3">
      {shown.map((g) => (
        <OneTable key={g.title} {...props} title={g.title} trials={props.trials.filter((t) => matchShowIf(g.showIf, t.params))} example={props.trials.length === 0 ? props.example : undefined} />
      ))}
    </div>
  );
}

/** Nhập tay một hàng số đo (ví dụ đọc từ thiết bị thật) với thông số đang chọn */
export function ManualRowForm() {
  const plugin = useLabStore((s) => s.plugin);
  const params = useLabStore((s) => s.params);
  const [open, setOpen] = useState(false);
  // Bài chỉ nhận số liệu từ thao tác đo thật (ví dụ chuẩn độ) → không cho nhập tay
  if (plugin.validity?.noManualRows) return null;
  const [text, setText] = useState<Record<string, string>>({});
  const fields = plugin.measurements.filter((m) => matchShowIf(m.showIf, params));
  const values = Object.fromEntries(fields.map((m) => [m.key, parseViNumber(text[m.key] ?? '')]));
  const ok = fields.length > 0 && fields.every((m) => Number.isFinite(values[m.key]));
  if (!open) {
    return (
      <button className="btn w-full" onClick={() => setOpen(true)}>
        <Plus size={15} /> Thêm hàng
      </button>
    );
  }
  return (
    <form
      className="space-y-2 rounded-lg border border-slate-700 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        useLabStore.getState().addManualTrial(values);
        setText({});
        setOpen(false);
      }}
    >
      <p className="text-xs text-slate-400">Nhập số em đọc được với thông số đang chọn. Hàng nhập tay được đánh dấu ✎.</p>
      {fields.map((m) => (
        <label key={m.key} className="block text-sm">
          {m.label}
          {m.unit ? ` (${m.unit})` : ''}
          {m.valueLabels && <span className="text-xs text-slate-400"> — mã: {Object.entries(m.valueLabels).map(([k, v]) => `${k} = ${v}`).join('; ')}</span>}
          <input className="input mt-0.5 font-mono" inputMode="decimal" value={text[m.key] ?? ''} onChange={(e) => setText({ ...text, [m.key]: e.target.value })} />
        </label>
      ))}
      <div className="flex gap-1.5">
        <button className="btn-primary flex-1" type="submit" disabled={!ok}>
          Lưu hàng
        </button>
        <button className="btn" type="button" onClick={() => setOpen(false)}>
          Hủy
        </button>
      </div>
    </form>
  );
}
