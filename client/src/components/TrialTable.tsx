/**
 * components/TrialTable.tsx — Bảng số liệu dùng chung (HUD, phiếu báo cáo, phiếu thí nghiệm).
 * Gồm cột tham số, số đo và cột tự tính; tiêu đề tiếng Việt; ô không áp dụng hiện "—".
 */
import { Trash2 } from 'lucide-react';
import type { LabPluginDef, TrialRecord } from '../types/lab';
import { buildColumns, cellText, columnTitle, derivedValues } from '../utils/trialTable';

export function TrialTable({ plugin, trials, onDelete, print }: { plugin: LabPluginDef; trials: TrialRecord[]; onDelete?: (index: number) => void; print?: boolean }) {
  const cols = buildColumns(plugin, trials);
  const cell = print ? 'border border-slate-400 p-1 text-center' : 'p-1';
  const tone = { param: '', measure: print ? '' : 'text-amber-200', derived: print ? 'bg-slate-100' : 'text-lab-400' } as const;
  return (
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
            {onDelete && <th className={cell} aria-label="Xóa" />}
          </tr>
        </thead>
        <tbody>
          {trials.map((t) => {
            const d = derivedValues(plugin, t, trials);
            return (
              <tr key={t.index} className={print ? '' : 'border-b border-slate-800'}>
                <td className={cell}>{t.index}</td>
                {cols.map((c) => (
                  <td key={`${c.kind}-${c.key}`} className={`${cell} whitespace-nowrap ${print ? '' : 'font-mono'} ${c.kind === 'derived' ? tone.derived : ''}`}>
                    {cellText(c, t, d)}
                  </td>
                ))}
                {onDelete && (
                  <td className={cell}>
                    <button className="text-slate-500 hover:text-danger" onClick={() => onDelete(t.index)} aria-label={`Xóa lần đo ${t.index}`} title="Loại bỏ lần đo bất thường">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
