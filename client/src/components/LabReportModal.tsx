/**
 * components/LabReportModal.tsx — Phiếu báo cáo thí nghiệm khổ A4:
 *  1) Câu hỏi sau thí nghiệm (Post-Quiz) → 2) Chấm điểm chi tiết từng tiêu chí + GIẢI THÍCH LÍ DO TRỪ ĐIỂM
 *  → 3) Khảo sát Likert 5 sao → 4) Nộp: lưu IndexedDB, xếp hàng đồng bộ LAN, sinh MÃ QR < 180 ký tự để GV quét offline.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, Send, Star } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { getSolver } from '../engines/solverRegistry';
import { gradeQuiz, gradeSubmission } from '../engines/gradingEngine';
import { addSubmission, audit, db, enqueueSync, flushSyncQueue } from '../offline/db';
import { encodeQrPayload } from '../utils/qrSyncCodec';
import { misconceptionsToMask, getMisconception } from '../data/misconceptionKB';
import { pluginIndexOf } from '../plugins/pluginRegistry';
import { currentApiUrl, fmtVi, parseViNumber } from '../services/appServices';
import { APP_CONFIG, SUBJECT_LABELS } from '../config/appConfig';
import { createGuard } from '../utils/debounceGuard';
import { soundEngine } from '../audio/soundEngine';
import { vibrate } from '../utils/haptics';
import { ModalShell } from './ModalShell';
import { QuizPanel } from './LabHUD';
import { TrialTable } from './TrialTable';
import { ChartGrid } from './DataChart';
import { printElement } from '../utils/printSheet';
import type { SubmissionRecord } from '../types/lab';

const LIKERT_QUESTIONS = [
  'Thí nghiệm 3D giúp em hiểu bài rõ hơn',
  'Giao diện dễ sử dụng trên thiết bị của em',
  'Em tự tin hơn khi làm thí nghiệm thật',
  'Trợ lý AI / gợi ý giúp ích cho em',
  'Em muốn tiếp tục học bằng KHTN-Lab 3D'
];

const submitGuard = createGuard(2000);
const submittedCache = new Map<string, { rec: SubmissionRecord; qrText: string; qrUrl: string }>();

export default function LabReportModal() {
  const s = useLabStore();
  const [likert, setLikert] = useState<number[]>([0, 0, 0, 0, 0]);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(submittedCache.get(`${s.plugin.id}:${s.startedAt}`) ?? null);
  const close = (): void => s.closeModal();
  const sheetRef = useRef<HTMLDivElement>(null);

  const computed = useMemo(() => {
    const solver = getSolver(s.plugin.solverId);
    // Đại lượng kết quả ứng với thông số của LẦN ĐO CUỐI (không phụ thuộc thanh trượt chỉnh sau khi đo)
    const last = s.trials[s.trials.length - 1];
    const base = s.solveContext();
    const ctx = last ? { ...base, params: last.params } : base;
    const trueValue = solver.trueResult(ctx);
    let dataEstimate = Number.NaN;
    try {
      dataEstimate = solver.estimateFromTrials(s.trials, ctx);
    } catch {
      dataEstimate = Number.NaN;
    }
    const studentValue = parseViNumber(s.studentValue);
    const report = gradeSubmission(
      { plugin: s.plugin, trials: s.trials, studentValue, trueValue, completedSteps: s.completedSteps, ppe: s.ppe, incidentCount: s.incidentCount, conclusion: s.conclusion, meniscusErrorMl: s.meniscusErrorMl },
      dataEstimate
    );
    const pre = gradeQuiz(s.plugin.preQuiz, s.preAnswers);
    const post = gradeQuiz(s.plugin.postQuiz, s.postAnswers);
    return { report, pre, post, dataEstimate };
  }, [s.plugin, s.trials, s.studentValue, s.completedSteps, s.ppe, s.incidentCount, s.conclusion, s.meniscusErrorMl, s.preAnswers, s.postAnswers, s]);

  useEffect(() => {
    if (done) return;
    if (s.postSubmitted) soundEngine.play(computed.report.total >= 50 ? 'success' : 'error');
  }, [s.postSubmitted, computed.report.total, done]);

  if (!s.postSubmitted && s.plugin.postQuiz.length > 0) {
    return (
      <ModalShell title="Câu hỏi sau thí nghiệm" onClose={close}>
        <QuizPanel phase="post" questions={s.plugin.postQuiz} onDone={() => undefined} />
      </ModalShell>
    );
  }

  const { report, pre, post } = computed;
  const session = s.session;

  const submit = (): void => {
    void submitGuard.run(async () => {
      const uid = `${session?.classCode ?? 'TUDO'}-${session?.studentCode ?? 'KHACH'}-${s.plugin.id}-${s.startedAt}`;
      const rec: SubmissionRecord = {
        uid,
        pluginId: s.plugin.id,
        studentName: session?.studentName ?? 'Khách',
        studentCode: session?.studentCode ?? 'KHACH',
        classCode: session?.classCode ?? 'TUDO',
        score: report.total,
        preScore: pre.score,
        preMax: pre.max,
        postScore: post.score,
        postMax: post.max,
        resultValue: report.studentValue,
        trueValue: report.trueValue,
        relErrorPercent: Math.min(999, Math.round(report.relativeErrorPercent * 10) / 10),
        misconceptions: post.misconceptions,
        likert,
        durationSec: Math.round((Date.now() - s.startedAt) / 1000),
        createdAt: Date.now(),
        synced: false,
        source: 'local'
      };
      const qrText = encodeQrPayload({
        classCode: rec.classCode,
        studentCode: rec.studentCode,
        pluginIndex: pluginIndexOf(rec.pluginId, s.plugins),
        score: rec.score,
        preScore: rec.preScore,
        preMax: rec.preMax,
        postScore: rec.postScore,
        postMax: rec.postMax,
        relErrorPercent: rec.relErrorPercent,
        misconceptionMask: misconceptionsToMask(rec.misconceptions),
        likert: rec.likert,
        durationSec: rec.durationSec,
        createdAtMin: Math.floor(rec.createdAt / 60000)
      });
      const qrUrl = await QRCode.toDataURL(qrText, { errorCorrectionLevel: 'L', margin: 2, width: 320 });
      try {
        await addSubmission(rec);
        await db.surveys.add({ pluginId: rec.pluginId, studentCode: rec.studentCode, ratings: likert, comment, createdAt: rec.createdAt });
        await enqueueSync(rec);
        await audit('submit', `${uid} điểm ${rec.score}`);
        const n = await flushSyncQueue(currentApiUrl(), 4000);
        s.toast(n > 0 ? 'success' : 'info', n > 0 ? 'Đã gửi bài về máy chủ lớp.' : 'Chưa kết nối máy chủ — bài đã lưu trên máy, hãy đưa mã QR cho thầy cô quét.');
      } catch {
        s.toast('warning', 'Không lưu được vào bộ nhớ trình duyệt (chế độ ẩn danh?). Hãy đưa mã QR cho thầy cô quét.');
      }
      const result = { rec, qrText, qrUrl };
      submittedCache.set(`${s.plugin.id}:${s.startedAt}`, result);
      setDone(result);
      s.markSubmitted();
      vibrate('success');
    });
  };

  const fmtResult = (x: number): string => (Number.isFinite(x) ? fmtVi(x, s.plugin.result.decimals + 1) : 'chưa nhập');

  return (
    <ModalShell
      title="Phiếu báo cáo thí nghiệm"
      onClose={close}
      wide
      footer={
        <>
          <button className="btn" onClick={() => printElement(sheetRef.current, `Phiếu báo cáo – ${s.plugin.shortTitle}`)}>
            <Printer size={16} /> In / Lưu PDF
          </button>
          {!done && (
            <button className="btn-primary" onClick={submit} disabled={likert.some((x) => x === 0)} title={likert.some((x) => x === 0) ? 'Hãy đánh giá đủ 5 câu khảo sát' : ''}>
              <Send size={16} /> Xác nhận nộp bài
            </button>
          )}
        </>
      }
    >
      <div ref={sheetRef} id="print-report" className="mx-auto max-w-[210mm] space-y-3 bg-white p-4 text-slate-900 sm:p-6">
        <header className="border-b-2 border-slate-800 pb-2 text-center">
          <p className="text-xs uppercase">{APP_CONFIG.schoolName}</p>
          <h1 className="text-lg font-bold uppercase">Phiếu báo cáo thí nghiệm {SUBJECT_LABELS[s.plugin.subject]} 10</h1>
          <p className="text-sm font-semibold">{s.plugin.title}</p>
          <p className="text-xs">{s.plugin.sgkRef}</p>
        </header>
        <section className="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-4">
          <div><b>Học sinh:</b> {session?.studentName ?? 'Khách'}</div>
          <div><b>Mã HS:</b> {session?.studentCode ?? '—'}</div>
          <div><b>Lớp:</b> {session?.classCode ?? '—'}</div>
          <div><b>Ngày:</b> {new Date().toLocaleDateString('vi-VN')}</div>
        </section>
        <section>
          <h2 className="font-bold">1. Bảng số liệu ({s.trials.length} lần đo)</h2>
          <TrialTable plugin={s.plugin} trials={s.trials} print />
          <div className="mt-2">
            <ChartGrid plugin={s.plugin} trials={s.trials} mode="print" />
          </div>
        </section>
        <section className="text-sm">
          <h2 className="font-bold">2. Kết quả & kết luận</h2>
          <p>
            {s.plugin.result.label}: <b>{fmtResult(report.studentValue)}</b> {s.plugin.result.unit}
            {(done || s.submitted) && (
              <>
                {' '}— Giá trị thực (ẩn) của em: <b>{fmtVi(report.trueValue, s.plugin.result.decimals + 1)}</b> {s.plugin.result.unit}; sai số tương đối: <b>{report.relativeErrorPercent >= 999 ? '—' : `${fmtVi(report.relativeErrorPercent, 1)}%`}</b>
              </>
            )}
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded border border-slate-300 p-2">{s.conclusion || '(Chưa viết kết luận)'}</p>
        </section>
        <section>
          <h2 className="font-bold">
            3. Đánh giá: <span className="text-lab-700">{report.total}/100 — {report.rank}</span>
          </h2>
          <table className="mt-1 w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-slate-400 p-1 text-left">Tiêu chí</th>
                <th className="border border-slate-400 p-1">Điểm</th>
                <th className="border border-slate-400 p-1 text-left">Giải thích chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {report.criteria.map((c) => (
                <tr key={c.id} className={c.earned < c.max ? 'bg-amber-50' : ''}>
                  <td className="border border-slate-400 p-1 font-semibold">{c.label}</td>
                  <td className="border border-slate-400 p-1 text-center font-mono">{c.earned}/{c.max}</td>
                  <td className="border border-slate-400 p-1">{c.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-sm">
            Trắc nghiệm trước: <b>{pre.score}/{pre.max}</b> → sau: <b>{post.score}/{post.max}</b>
            {post.score > pre.score ? ' 📈 Tiến bộ!' : ''}
          </p>
          {post.misconceptions.length > 0 && (
            <div className="mt-1 rounded border border-amber-400 bg-amber-50 p-2 text-xs">
              <b>Ngộ nhận cần lưu ý:</b>
              <ul className="list-disc pl-4">
                {post.misconceptions.map((id) => {
                  const m = getMisconception(id);
                  return m ? <li key={id}><b>{m.title}</b> — {m.remedy}</li> : null;
                })}
              </ul>
            </div>
          )}
        </section>
        <section className="no-print">
          <h2 className="font-bold">4. Khảo sát (đánh giá 1–5 sao)</h2>
          {LIKERT_QUESTIONS.map((q, qi) => (
            <div key={q} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-1 text-sm">
              <span>{q}</span>
              <div className="flex" role="radiogroup" aria-label={q}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} role="radio" aria-checked={likert[qi] === v} aria-label={`${v} sao`} disabled={!!done} onClick={() => setLikert((prev) => prev.map((x, i) => (i === qi ? v : x)))} className="p-0.5">
                    <Star size={20} className={v <= likert[qi] ? 'fill-amber-400 text-amber-500' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <textarea className="mt-2 w-full rounded border border-slate-300 p-2 text-sm text-slate-900" placeholder="Góp ý thêm (không bắt buộc)" value={comment} onChange={(e) => setComment(e.target.value)} disabled={!!done} />
        </section>
        {done && (
          <section className="flex flex-col items-center gap-2 border-t-2 border-dashed border-slate-400 pt-3 sm:flex-row sm:items-start">
            <img src={done.qrUrl} alt="Mã QR nộp bài" className="h-48 w-48" />
            <div className="text-sm">
              <h2 className="font-bold">Mã QR nộp bài offline</h2>
              <p>Đưa mã này cho thầy cô quét bằng Cổng giáo viên → Thu bài QR. Không cần Internet.</p>
              <p className="mt-1 break-all rounded bg-slate-100 p-1 font-mono text-[11px]">{done.qrText}</p>
              <p className="text-xs text-slate-500">{done.qrText.length} ký tự · mã kiểm tra chống sửa điểm</p>
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
}
