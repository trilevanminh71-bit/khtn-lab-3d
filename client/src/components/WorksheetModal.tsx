/**
 * components/WorksheetModal.tsx — PHIẾU THÍ NGHIỆM tự động: thông tin học sinh, bài thực hành, bảng số liệu,
 * xử lí số liệu, biểu đồ, kết quả trắc nghiệm và nhận xét. In / Lưu PDF hoặc xuất file HTML.
 * Không hiển thị đáp án thật; dùng được bất cứ lúc nào, không cần nộp bài.
 */
import { useRef } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { SUBJECT_LABELS } from '../config/appConfig';
import { gradeQuiz } from '../engines/gradingEngine';
import { exportElement, printElement } from '../utils/printSheet';
import { buildColumns, cellText, columnTitle, derivedValues, safeSummary } from '../utils/trialTable';
import { downloadText } from '../utils/bugSnapshot';
import { sanitizeCode } from '../utils/qrSyncCodec';
import { ModalShell } from './ModalShell';
import { TrialTable } from './TrialTable';
import { ChartGrid } from './DataChart';

export default function WorksheetModal() {
  const plugin = useLabStore((s) => s.plugin);
  const session = useLabStore((s) => s.session);
  const trials = useLabStore((s) => s.trials);
  const completed = useLabStore((s) => s.completedSteps);
  const studentValue = useLabStore((s) => s.studentValue);
  const conclusion = useLabStore((s) => s.conclusion);
  const notes = useLabStore((s) => s.notes);
  const preAnswers = useLabStore((s) => s.preAnswers);
  const postAnswers = useLabStore((s) => s.postAnswers);
  const preSubmitted = useLabStore((s) => s.preSubmitted);
  const postSubmitted = useLabStore((s) => s.postSubmitted);
  const ref = useRef<HTMLDivElement>(null);
  const school = useLabStore((s) => s.settings.schoolName ?? '');
  // Đánh số mục liên tục 1, 2, 3… dù một số mục bị ẩn (chưa có số liệu / biểu đồ)
  let sec = 0;
  const no = (): number => ++sec;
  const summary = safeSummary(plugin, trials);
  const pre = gradeQuiz(plugin.preQuiz, preAnswers);
  const post = gradeQuiz(plugin.postQuiz, postAnswers);
  const preDone = preSubmitted && preAnswers.some((a) => a >= 0);
  const postDone = postSubmitted && postAnswers.some((a) => a >= 0);
  const title = `Phiếu thí nghiệm – ${plugin.shortTitle}`;
  const file = `phieu-${plugin.id}-${sanitizeCode(session?.studentCode ?? 'KHACH')}`;

  const exportCsv = (): void => {
    const cols = buildColumns(plugin, trials);
    const esc = (s: string): string => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const rows = [['Lần', ...cols.map(columnTitle)], ...trials.map((t) => [String(t.index), ...cols.map((c) => cellText(c, t, derivedValues(plugin, t, trials)))])];
    downloadText(`${file}.csv`, '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n'), 'text/csv');
  };
  const remarks = [
    trials.length >= plugin.minTrials ? `Đã đo ${trials.length} lần (yêu cầu tối thiểu ${plugin.minTrials}).` : `Mới đo ${trials.length}/${plugin.minTrials} lần — cần đo thêm.`,
    `Hoàn thành ${plugin.steps.filter((s) => completed.includes(s.id)).length}/${plugin.steps.length} bước của quy trình.`,
    ...(postDone ? [post.score > pre.score ? 'Kết quả trắc nghiệm sau thí nghiệm tốt hơn trước.' : post.score === post.max ? 'Trả lời đúng toàn bộ câu hỏi sau thí nghiệm.' : 'Nên xem lại các câu trả lời chưa đúng.'] : [])
  ];

  return (
    <ModalShell
      title="Phiếu thí nghiệm"
      onClose={() => useLabStore.getState().closeModal()}
      wide
      footer={
        <>
          <button className="btn" onClick={exportCsv} disabled={trials.length === 0}>
            <FileSpreadsheet size={16} /> Xuất số liệu CSV
          </button>
          <button className="btn" onClick={() => exportElement(ref.current, title, `${file}.html`)}>
            <Download size={16} /> Xuất phiếu (.html)
          </button>
          <button className="btn-primary" onClick={() => { if (!printElement(ref.current, title)) useLabStore.getState().toast('warning', 'Trình duyệt không hỗ trợ in. Hãy xuất phiếu .html.'); }}>
            <Printer size={16} /> In / Lưu PDF
          </button>
        </>
      }
    >
      <label className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        Tên trường
        <input className="input w-auto min-w-[240px] flex-1" value={school} onChange={(e) => useLabStore.getState().updateSettings({ schoolName: e.target.value.slice(0, 120) })} placeholder="Ví dụ: Trường THPT Nguyễn Du" aria-label="Tên trường" />
      </label>
      <div ref={ref} id="print-report" className="mx-auto max-w-[210mm] space-y-3 bg-white p-4 text-slate-900 sm:p-6">
        <header className="border-b-2 border-slate-800 pb-2 text-center">
          <p className="text-xs uppercase">{school.trim() || 'Trường: ……………………………………'}</p>
          <h1 className="text-lg font-bold uppercase">Phiếu thí nghiệm {SUBJECT_LABELS[plugin.subject]} 10</h1>
          <p className="text-sm font-semibold">{plugin.title}</p>
          <p className="text-xs">{plugin.sgkRef}</p>
        </header>
        <section className="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-4">
          <div><b>Học sinh:</b> {session?.studentName ?? '………………'}</div>
          <div><b>Mã HS:</b> {session?.studentCode ?? '………'}</div>
          <div><b>Lớp:</b> {session?.classCode ?? '………'}</div>
          <div><b>Ngày:</b> {new Date().toLocaleDateString('vi-VN')}</div>
        </section>
        <section className="text-sm">
          <h2 className="font-bold">{no()}. Mục tiêu</h2>
          <ul className="list-disc pl-5">{plugin.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          {plugin.equation && <p className="mt-1">Công thức: <b>{plugin.equation}</b></p>}
        </section>
        <section>
          <h2 className="font-bold">{no()}. Bảng số liệu ({trials.length} lần đo)</h2>
          {trials.length ? <TrialTable plugin={plugin} trials={trials} print /> : <p className="text-sm">Chưa có số liệu.</p>}
        </section>
        {summary.length > 0 && (
          <section className="text-sm">
            <h2 className="font-bold">{no()}. Xử lí số liệu</h2>
            <ul className="list-disc pl-5">{summary.map((l) => <li key={l.label}>{l.label}: <b>{l.value}</b>{l.note ? ` — ${l.note}` : ''}</li>)}</ul>
          </section>
        )}
        {trials.length > 0 && (
          <section>
            <h2 className="mb-1 font-bold">{no()}. Biểu đồ</h2>
            <ChartGrid plugin={plugin} trials={trials} mode="print" />
          </section>
        )}
        <section className="text-sm">
          <h2 className="font-bold">{no()}. Kết quả và kết luận</h2>
          <p>{plugin.result.label}: <b>{studentValue.trim() || '…………'}</b> {plugin.result.unit}</p>
          <p className="mt-1 min-h-[3rem] whitespace-pre-wrap rounded border border-slate-300 p-2">{conclusion || '(Chưa viết kết luận)'}</p>
          {notes.trim() && <p className="mt-1 whitespace-pre-wrap"><b>Ghi chép:</b> {notes}</p>}
        </section>
        <section className="text-sm">
          <h2 className="font-bold">{no()}. Kiểm tra và nhận xét</h2>
          <p>Trắc nghiệm trước: <b>{preDone ? `${pre.score}/${pre.max}` : 'chưa làm'}</b> · sau: <b>{postDone ? `${post.score}/${post.max}` : 'chưa làm'}</b></p>
          <ul className="list-disc pl-5">{remarks.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-2">Nhận xét của giáo viên: ……………………………………………………………………………………</p>
        </section>
      </div>
    </ModalShell>
  );
}
