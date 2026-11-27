/**
 * components/FloatingLabTools.tsx — Công cụ nổi trên cảnh 3D:
 *  - Sổ tay ghi chép thí nghiệm (tự lưu cùng bản nháp).
 *  - Máy tính bỏ túi khoa học: dùng bộ tính biểu thức an toàn (sqrt, ^, ln, sin…), biến "ans" = kết quả trước,
 *    có thể chèn trung bình các cột số liệu đo; nút "Điền vào Kết quả".
 */
import { useEffect, useRef, useState } from 'react';
import { Bot, Calculator, NotebookPen, Wrench, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { evaluateFormula } from '../engines/formulaEvaluator';
import { mean } from '../engines/statistics';
import { fmtVi } from '../services/appServices';
import { columnLabel } from '../utils/columnLabels';
import { kvGet, kvSet } from '../offline/db';

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
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'fail' | 'restored'>('idle');
  const loadedFor = useRef('');
  const st = useLabStore.getState;
  const dec = plugin.result.decimals;

  // Sổ tay: khôi phục ghi chép của bài khi mở lại trang (lưu riêng, không phụ thuộc bản nháp)
  useEffect(() => {
    let alive = true;
    loadedFor.current = '';
    void kvGet(`notes:${plugin.id}`)
      .then((v) => {
        if (!alive) return;
        loadedFor.current = plugin.id;
        if (v && !useLabStore.getState().notes.trim()) {
          useLabStore.getState().setNotes(v);
          setSaved('restored');
        }
      })
      .catch(() => {
        loadedFor.current = plugin.id;
      });
    return () => {
      alive = false;
    };
  }, [plugin.id]);

  // Sổ tay: tự lưu sau 0,6 giây ngừng gõ
  useEffect(() => {
    if (loadedFor.current !== plugin.id) return;
    setSaved((x) => (x === 'restored' && notes ? x : 'saving'));
    const id = setTimeout(() => {
      kvSet(`notes:${plugin.id}`, notes)
        .then(() => setSaved((x) => (x === 'restored' ? x : 'ok')))
        .catch(() => setSaved('fail'));
    }, 600);
    return () => clearTimeout(id);
  }, [notes, plugin.id]);

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
      <div className="no-print absolute bottom-2 right-2 z-10 flex flex-col items-end gap-1.5">
        {menu && (
          <div className="panel flex flex-col gap-1 p-1.5">
            <button className="btn min-h-[44px] justify-start" onClick={() => { setMenu(false); st().setTutorOpen(true); }}>
              <Bot size={17} /> Hỏi trợ lý AI
            </button>
            <button className="btn min-h-[44px] justify-start" onClick={() => { setMenu(false); setTab('calc'); st().setToolsOpen(true); }}>
              <Calculator size={17} /> Máy tính
            </button>
            <button className="btn min-h-[44px] justify-start" onClick={() => { setMenu(false); setTab('notes'); st().setToolsOpen(true); }}>
              <NotebookPen size={17} /> Sổ tay
            </button>
          </div>
        )}
        <button className="btn min-h-[46px] rounded-full px-3 shadow-lg" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Công cụ" title="Trợ lý AI, máy tính, sổ tay">
          {menu ? <X size={18} /> : <Wrench size={18} />} <span className="hidden sm:inline">Công cụ</span>
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
                    x̄ {columnLabel(m)} = {fmtVi(mu, m.decimals + 1)}
                  </button>
                );
              })}
            </div>
          )}
          <button
            className="btn w-full text-xs"
            disabled={!out.startsWith('=')}
            onClick={() => {
              // Làm tròn theo đúng số chữ số thập phân của đại lượng kết quả bài học
              const text = ans.toFixed(dec).replace('.', ',');
              st().setStudentValue(text);
              st().toast('success', `Đã điền ${text} ${plugin.result.unit} vào ô Kết quả (làm tròn ${dec} chữ số thập phân).`);
            }}
          >
            Điền vào phiếu: {out.startsWith('=') ? `${ans.toFixed(dec).replace('.', ',')} ${plugin.result.unit}` : '—'} ({dec} chữ số thập phân)
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <textarea className="input min-h-[180px] text-sm" value={notes} onChange={(e) => st().setNotes(e.target.value)} placeholder="Ghi chép hiện tượng quan sát, nhận xét, nháp tính toán…" aria-label="Sổ tay thí nghiệm" />
          <p className={`text-xs ${saved === 'fail' ? 'text-warn' : 'text-slate-400'}`} role="status">
            {saved === 'fail'
              ? '⚠ Không lưu được (trình duyệt chặn bộ nhớ, ví dụ chế độ ẩn danh) — tải lại trang sẽ mất ghi chép.'
              : saved === 'restored'
                ? '✓ Đã khôi phục ghi chép lần trước của bài này.'
                : saved === 'saving'
                  ? 'Đang lưu…'
                  : '✓ Đã lưu trên máy này — tải lại trang vẫn còn.'}
          </p>
        </div>
      )}
    </div>
  );
}
