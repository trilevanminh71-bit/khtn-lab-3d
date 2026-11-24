/**
 * components/MeniscusReaderModal.tsx — Rèn kĩ năng đọc mặt khum chất lỏng trong burette.
 * Mô hình sai số thị sai: mắt lệch h (mm) so với đáy mặt khum thì vạch đọc được lệch Δ = h·k (k ≈ 0,012 mL/mm);
 * với burette (số tăng từ trên xuống), mắt cao hơn → đọc nhỏ hơn thật, mắt thấp hơn → đọc lớn hơn thật.
 * Học sinh chỉnh tầm mắt rồi nhập số đọc; sai lệch được lưu vào tiêu chí "Đọc mặt khum".
 */
import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { parseViNumber } from '../services/appServices';
import { soundEngine } from '../audio/soundEngine';
import { ModalShell } from './ModalShell';

const PX_PER_ML = 60;

export default function MeniscusReaderModal() {
  const seed = useLabStore((s) => s.seed);
  // Mức chất lỏng thật (mL) — ngẫu nhiên theo học sinh, ĐCNN 0,05 mL
  const trueLevel = useMemo(() => 10 + Math.round(((seed % 997) / 997) * 40) * 0.05 + 0.5, [seed]);
  const [eye, setEye] = useState(25);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ err: number; apparent: number } | null>(null);
  const parallax = eye * 0.012;
  const apparent = trueLevel - parallax;
  const top = Math.floor(trueLevel) - 1;
  const yOf = (ml: number): number => 30 + (ml - top) * PX_PER_ML;
  const meniscusY = yOf(trueLevel);
  const eyeY = meniscusY - eye * 2.2;

  const check = (): void => {
    const v = parseViNumber(input);
    if (!Number.isFinite(v)) return;
    const err = Math.abs(v - trueLevel);
    setResult({ err, apparent });
    useLabStore.getState().setMeniscusError(err);
    soundEngine.play(err <= 0.05 ? 'success' : 'error');
  };

  const ticks: number[] = [];
  for (let ml = top; ml <= top + 3.0001; ml += 0.1) ticks.push(Math.round(ml * 10) / 10);

  return (
    <ModalShell title="Luyện đọc mặt khum (sai số thị sai)" onClose={() => useLabStore.getState().closeModal()} icon={<Eye size={18} />}>
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <svg viewBox="0 0 220 240" className="w-full rounded-lg bg-slate-100" role="img" aria-label="Phóng to burette và mặt khum">
          <rect x="70" y="0" width="60" height="240" fill="#e0f2fe" stroke="#64748b" />
          <path d={`M70 ${meniscusY - 8} Q100 ${meniscusY + 6} 130 ${meniscusY - 8} L130 240 L70 240 Z`} fill="#c084fc" opacity="0.85" />
          {ticks.map((ml) => {
            const y = yOf(ml);
            const major = Math.abs(ml * 10 - Math.round(ml) * 10) < 0.01;
            const half = Math.abs(ml * 10 - Math.round(ml * 2) * 5) < 0.01;
            return (
              <g key={ml}>
                <line x1="130" x2={major ? 150 : half ? 144 : 138} y1={y} y2={y} stroke="#0f172a" strokeWidth={major ? 1.6 : 0.8} />
                {major && <text x="154" y={y + 4} fontSize="11" fill="#0f172a">{ml.toFixed(0)}</text>}
              </g>
            );
          })}
          <line x1="0" x2="220" y1={eyeY} y2={meniscusY} stroke="#ef4444" strokeDasharray="4 3" />
          <circle cx="12" cy={eyeY} r="8" fill="#fff" stroke="#0f172a" />
          <circle cx="14" cy={eyeY} r="3" fill="#0f172a" />
          <text x="4" y={Math.max(12, eyeY - 12)} fontSize="10" fill="#0f172a">Mắt</text>
        </svg>
        <div className="space-y-3 text-sm">
          <p>Kéo thanh để đặt mắt <b>ngang đáy mặt khum</b>, sau đó đọc số trên vạch chia (ĐCNN 0,1 mL, ước lượng tới 0,05 mL).</p>
          <label className="block">
            Độ cao mắt so với đáy mặt khum: <b>{eye > 0 ? `cao hơn ${eye} mm` : eye < 0 ? `thấp hơn ${-eye} mm` : 'ngang bằng ✓'}</b>
            <input type="range" min={-40} max={40} value={eye} onChange={(e) => setEye(Number(e.target.value))} className="w-full" />
          </label>
          <p className="rounded bg-slate-800 p-2 text-xs">Theo đường ngắm hiện tại, mắt em thấy vạch: <b className="font-mono text-amber-200">{apparent.toFixed(2)} mL</b></p>
          <div className="flex gap-2">
            <input className="input font-mono" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Số đọc (mL), vd 11,35" aria-label="Số đọc burette" />
            <button className="btn-primary" onClick={check}>Kiểm tra</button>
          </div>
          {result && (
            <div className={`rounded p-2 ${result.err <= 0.05 ? 'bg-emerald-900/50 text-ok' : 'bg-amber-900/50 text-warn'}`} role="status">
              Giá trị đúng: <b>{trueLevel.toFixed(2)} mL</b> — em lệch {result.err.toFixed(2)} mL.
              {result.err <= 0.05 ? ' Rất chính xác!' : ' Hãy đặt mắt ngang đáy mặt khum để loại bỏ sai số thị sai rồi thử lại.'}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
