/**
 * components/FloatingLabTools.tsx — Công cụ nổi trên cảnh 3D:
 *  - Sổ tay ghi chép thí nghiệm (tự lưu cùng bản nháp).
 *  - Máy tính bỏ túi khoa học: dùng bộ tính biểu thức an toàn (sqrt, ^, ln, sin…), biến "ans" = kết quả trước,
 *    có thể chèn trung bình các cột số liệu đo; nút "Điền vào Kết quả".
 */
import { useState } from 'react';
import { Calculator, NotebookPen, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { evaluateFormula } from '../engines/formulaEvaluator';
import { mean } from '../engines/statistics';
import { fmtVi } from '../services/appServices';

const KEYS = ['7', '8', '9', '/', 'sqrt(', '4', '5', '6', '*', '^', '1', '2', '3', '-', '(', '0', '.', 'ans', '+', ')'];

export function FloatingLabTools() {
  const open = useLabStore((s) => s.toolsOpen);
  const notes = useLabStore((s) => s.notes);
  const trials = useLabStore((s) => s.trials);
  const plugin = useLabStore((s) => s.plugin);
  const [tab, setTab] = useState<'calc' | 'notes'>('calc');
  const [expr, setExpr] = useState('');
  const [ans, setAns] = useState(0);
  const [out, setOut] = useState('');
  const st = useLabStore.getState;

  const evaluate = (): void => {
    try {
      const v = evaluateFormula(expr.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/'), { ans });
      if (!Number.isFinite(v)) throw new Error('Kết quả không xác định');
      setAns(v);
      setOut(`= ${fmtVi(v, 6)}`);
    } catch (e) {
      setOut(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (!open) {
    return (
      <div className="no-print absolute bottom-3 right-3 z-10 flex flex-col gap-2">
        <button className="btn rounded-full p-3 shadow-lg" onClick={() => { setTab('calc'); st().setToolsOpen(true); }} title="Máy tính khoa học" aria-label="Mở máy tính khoa học">
          <Calculator size={20} />
        </button>
        <button className="btn rounded-full p-3 shadow-lg" onClick={() => { setTab('notes'); st().setToolsOpen(true); }} title="Sổ tay thí nghiệm" aria-label="Mở sổ tay thí nghiệm">
          <NotebookPen size={20} />
        </button>
        <button className="btn-primary rounded-full p-3 shadow-lg" onClick={() => st().setTutorOpen(true)} title="Trợ lý AI Socratic" aria-label="Mở trợ lý AI">
          🤖
        </button>
      </div>
    );
  }

  return (
    <div className="no-print absolute bottom-3 right-3 z-20 w-[min(92vw,320px)] card p-2">
      <div className="mb-2 flex items-center gap-1">
        <button className={`btn flex-1 text-xs ${tab === 'calc' ? 'bg-slate-700' : ''}`} onClick={() => setTab('calc')}>
          <Calculator size={14} /> Máy tính
        </button>
        <button className={`btn flex-1 text-xs ${tab === 'notes' ? 'bg-slate-700' : ''}`} onClick={() => setTab('notes')}>
          <NotebookPen size={14} /> Sổ tay
        </button>
        <button className="btn-ghost p-1.5" onClick={() => st().setToolsOpen(false)} aria-label="Đóng công cụ">
          <X size={16} />
        </button>
      </div>
      {tab === 'calc' ? (
        <div className="space-y-1.5">
          <input
            className="input font-mono"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') evaluate();
            }}
            placeholder="vd: 2*0.5/0.32^2"
            aria-label="Biểu thức"
          />
          <div className="min-h-[1.5rem] text-right font-mono text-amber-200" aria-live="polite">{out}</div>
          <div className="grid grid-cols-5 gap-1">
            {KEYS.map((k) => (
              <button key={k} className="btn min-h-[34px] px-0 py-1 font-mono text-xs" onClick={() => setExpr(expr + k)}>
                {k}
              </button>
            ))}
            <button className="btn min-h-[34px] px-0 text-xs" onClick={() => setExpr(expr + 'ln(')}>ln</button>
            <button className="btn min-h-[34px] px-0 text-xs" onClick={() => setExpr(expr + 'PI')}>π</button>
            <button className="btn min-h-[34px] px-0 text-xs" onClick={() => setExpr(expr.slice(0, -1))}>⌫</button>
            <button className="btn min-h-[34px] px-0 text-xs" onClick={() => { setExpr(''); setOut(''); }}>C</button>
            <button className="btn-primary min-h-[34px] px-0 text-xs" onClick={evaluate}>=</button>
          </div>
          {trials.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {plugin.measurements.map((m) => {
                const mu = mean(trials.map((t) => t.values[m.key]));
                return (
                  <button key={m.key} className="chip bg-slate-800 text-slate-200" onClick={() => setExpr(expr + String(Number(mu.toPrecision(6))))} title={`Chèn trung bình ${m.label}`}>
                    x̄ {m.key} = {fmtVi(mu, m.decimals + 1)}
                  </button>
                );
              })}
            </div>
          )}
          <button className="btn w-full text-xs" disabled={!out.startsWith('=')} onClick={() => { st().setStudentValue(String(Number(ans.toPrecision(6))).replace('.', ',')); st().toast('success', 'Đã điền vào ô Kết quả.'); }}>
            Điền kết quả này vào phiếu
          </button>
        </div>
      ) : (
        <textarea className="input min-h-[180px] text-sm" value={notes} onChange={(e) => st().setNotes(e.target.value)} placeholder="Ghi chép hiện tượng quan sát, nhận xét, nháp tính toán… (tự lưu cùng bản nháp)" aria-label="Sổ tay thí nghiệm" />
      )}
    </div>
  );
}
