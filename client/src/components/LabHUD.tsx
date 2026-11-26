/**
 * components/LabHUD.tsx — Bảng điều khiển thí nghiệm, TỰ THÍCH ỨNG màn hình ngang/dọc:
 *  - Mỗi lúc chỉ một hành động chính theo bước; nội dung phụ nằm trong các mục mở rộng.
 *  - Ngang / máy tính: cột bên phải; Dọc / điện thoại: ngăn dưới cảnh 3D, chia tab.
 *  - Chọn bài, phiên học sinh, Pre-Quiz, quy trình các bước, thông số, nút Đo (chống bấm đúp),
 *    bảng số liệu + thống kê, kết quả & kết luận, nút Về góc nhìn chuẩn, Làm lại (xác nhận), Nộp bài.
 *  - Tự lưu nháp mỗi 5 giây vào IndexedDB; thẻ "Tiếp tục bài đang làm dở"; biểu đồ và phiếu thí nghiệm.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bot, Calculator, Camera, CheckCircle2, ChevronDown, Circle, ClipboardCheck, Eye, FileText, Play, Printer, Repeat, RotateCcw, Ruler, TableProperties, UserRound } from 'lucide-react';
import { hasUnsavedWork, useLabStore } from '../store/useLabStore';
import { APP_CONFIG, SUBJECT_COLORS } from '../config/appConfig';
import { clearDraft, saveDraft } from '../offline/db';
import { createGuard } from '../utils/debounceGuard';
import { absError, mean } from '../engines/statistics';
import { fmtVi } from '../services/appServices';
import { sanitizeCode } from '../utils/qrSyncCodec';
import { hashString } from '../utils/randomizer';
import { ModalShell } from './ModalShell';
import { InsightPanel, Mc964Console, OxidationTool, ParamControls, PrincipleBox, ResumeCard, SummaryPanel } from './LessonPanels';
import { ManualRowForm, TrialTable } from './TrialTable';
import { getSolver } from '../engines/solverRegistry';
import { parseViNumber } from '../services/appServices';
import { ChartGrid } from './DataChart';
import type { TrialRecord } from '../types/lab';
import type { QuizQuestion } from '../types/lab';

const measureGuard = createGuard(700);
type Tab = 'steps' | 'data' | 'result';

/* ----------------------------- Phiên học sinh ----------------------------- */
function SessionForm({ onClose }: { onClose: () => void }) {
  const session = useLabStore((s) => s.session);
  const [name, setName] = useState(session?.studentName ?? '');
  const [code, setCode] = useState(session?.studentCode ?? '');
  const [cls, setCls] = useState(session?.classCode ?? '');
  const valid = name.trim().length >= 2 && sanitizeCode(code).length >= 1 && sanitizeCode(cls).length >= 2;
  const save = (): void => {
    if (!valid) return;
    const run = (): void => {
      useLabStore.getState().setSession({ studentName: name.trim(), studentCode: sanitizeCode(code), classCode: sanitizeCode(cls), seed: hashString(`${cls}|${code}`) });
      useLabStore.getState().toast('success', `Xin chào ${name.trim()}! Thông số thí nghiệm đã được sinh riêng cho em.`);
      onClose();
    };
    if (hasUnsavedWork()) {
      useLabStore.getState().askConfirm({ title: 'Đổi thông tin học sinh?', message: 'Đổi mã học sinh sẽ sinh bộ thông số mới và làm lại bài hiện tại.', confirmLabel: 'Đồng ý', onConfirm: run });
    } else run();
  };
  return (
    <ModalShell
      title="Thông tin học sinh"
      onClose={onClose}
      icon={<UserRound size={18} />}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Để sau
          </button>
          <button className="btn-primary" disabled={!valid} onClick={save}>
            Bắt đầu
          </button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label className="label" htmlFor="sv-name">Họ và tên</label>
          <input id="sv-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn An" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="sv-code">Mã học sinh / STT</label>
            <input id="sv-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="HS23" />
          </div>
          <div>
            <label className="label" htmlFor="sv-cls">Mã lớp</label>
            <input id="sv-cls" className="input" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="10T1" />
          </div>
        </div>
        <p className="text-xs text-slate-400">Mỗi học sinh nhận bộ thông số ẩn khác nhau (g, E, r, nồng độ…) để tự đo — không chép được số liệu của bạn.</p>
      </form>
    </ModalShell>
  );
}

/* ------------------------------ Trắc nghiệm ------------------------------ */
export function QuizPanel({ phase, questions, onDone }: { phase: 'pre' | 'post'; questions: QuizQuestion[]; onDone: () => void }) {
  const answers = useLabStore((s) => (phase === 'pre' ? s.preAnswers : s.postAnswers));
  const submitted = useLabStore((s) => (phase === 'pre' ? s.preSubmitted : s.postSubmitted));
  const all = answers.every((a) => a >= 0);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        {phase === 'pre' ? 'Kiểm tra nhanh TRƯỚC thí nghiệm (không tính vào điểm bài, dùng để đo mức tiến bộ).' : 'Kiểm tra SAU thí nghiệm — so sánh với lần trước để thấy em đã tiến bộ thế nào.'}
      </p>
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-lg border border-slate-700 p-3">
          <legend className="px-1 text-sm font-semibold">
            Câu {qi + 1}. {q.prompt}
          </legend>
          <div className="mt-1 grid gap-1">
            {q.options.map((o, oi) => {
              const chosen = answers[qi] === oi;
              const correct = submitted && oi === q.correctIndex;
              const wrong = submitted && chosen && oi !== q.correctIndex;
              return (
                <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${chosen ? 'bg-slate-700' : 'hover:bg-slate-800'} ${correct ? 'ring-1 ring-[var(--ok)]' : ''} ${wrong ? 'ring-1 ring-[var(--danger)]' : ''}`}>
                  <input type="radio" name={`${phase}-${q.id}`} checked={chosen} disabled={submitted} onChange={() => useLabStore.getState().answerQuiz(phase, qi, oi)} />
                  <span>{o}</span>
                  {correct && <span className="ml-auto text-ok">✓</span>}
                  {wrong && <span className="ml-auto text-danger">✗</span>}
                </label>
              );
            })}
          </div>
          {submitted && <p className="mt-1 text-xs text-slate-400">💡 {q.explanation}</p>}
        </fieldset>
      ))}
      <div className="flex justify-end gap-2">
        {!submitted ? (
          <>
            {phase === 'pre' && (
              <button className="btn-ghost" onClick={() => { useLabStore.getState().submitQuiz(phase); onDone(); }}>
                Bỏ qua
              </button>
            )}
            <button className="btn-primary" disabled={!all} onClick={() => useLabStore.getState().submitQuiz(phase)}>
              Nộp câu trả lời
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={onDone}>
            Tiếp tục
          </button>
        )}
      </div>
    </div>
  );
}

/** Mục mở rộng: giữ màn hình thoáng, nội dung phụ chỉ hiện khi cần */
function More({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-700" open={open}>
      <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
        {title}
        <ChevronDown size={16} className="text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-2 p-2 pt-1">{children}</div>
    </details>
  );
}

const MODEL_NOTE = {
  physics: 'Mô phỏng đã làm đơn giản: bỏ qua sức cản không khí, ma sát nhỏ và độ rung của giá đỡ; số đo có thêm sai số ngẫu nhiên nhỏ giống khi đo thật.',
  chemistry: 'Mô phỏng đã làm đơn giản: coi dung dịch luôn khuấy đều, bỏ qua nhiệt toả ra ngoài và hao hụt khi rót; số đo có sai số ngẫu nhiên nhỏ.',
  biology: 'Mô phỏng đã làm đơn giản: tế bào và mẫu vật được vẽ theo mô hình; kết quả mang tính minh hoạ và có dao động ngẫu nhiên nhỏ như mẫu thật.'
} as const;

/** Biểu đồ nhỏ ngay dưới số đo: điểm mới hiện lên khi vật vừa qua cổng / kết thúc lần đo */
function LiveChart({ pending }: { pending: TrialRecord }) {
  const plugin = useLabStore((s) => s.plugin);
  const trials = useLabStore((s) => s.trials);
  const all = useMemo(() => [...trials, { ...pending, index: trials.length + 1 }], [trials, pending]);
  if (!plugin.charts?.length) return null;
  return (
    <div className="mt-1.5 rounded-lg bg-slate-950/60 p-1" aria-label="Biểu đồ cập nhật theo lần đo vừa xong">
      <p className="px-1 text-[11px] text-slate-400">Điểm cuối cùng là lần vừa đo (chưa ghi vào bảng)</p>
      <ChartGrid plugin={plugin} trials={all} limit={1} />
    </div>
  );
}

/** Đối chiếu sau khi nộp: giá trị em nhập – từ số liệu – lí thuyết – sai số tỉ đối */
function ResultCompare() {
  const plugin = useLabStore((s) => s.plugin);
  const trials = useLabStore((s) => s.trials);
  const studentValue = useLabStore((s) => s.studentValue);
  const rows = useMemo(() => {
    const s = useLabStore.getState();
    const solver = getSolver(plugin.solverId);
    const last = trials[trials.length - 1];
    const base = s.solveContext();
    const ctx = last ? { ...base, params: last.params } : base;
    let est = Number.NaN;
    try {
      est = solver.estimateFromTrials(trials, ctx);
    } catch {
      est = Number.NaN;
    }
    return { truth: solver.trueResult(ctx), est, mine: parseViNumber(studentValue) };
  }, [plugin, trials, studentValue]);
  const d = plugin.result.decimals + 1;
  const pct = (x: number): string => (Number.isFinite(x) && Number.isFinite(rows.truth) && rows.truth !== 0 ? `${fmtVi((Math.abs(x - rows.truth) / Math.abs(rows.truth)) * 100, 1)} %` : '—');
  const val = (x: number): string => (Number.isFinite(x) ? fmtVi(x, d) : '—');
  return (
    <section className="rounded-lg border border-slate-700 p-2" aria-label="Đối chiếu kết quả">
      <h3 className="mb-1 text-sm font-semibold">Đối chiếu kết quả {plugin.result.unit ? `(${plugin.result.unit})` : ''}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="p-1">Giá trị</th>
            <th className="p-1">Số</th>
            <th className="p-1">Sai số so với lí thuyết</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          <tr><td className="p-1 font-sans">Em nhập</td><td className="p-1">{val(rows.mine)}</td><td className="p-1">{pct(rows.mine)}</td></tr>
          <tr><td className="p-1 font-sans">Từ số liệu đo</td><td className="p-1">{val(rows.est)}</td><td className="p-1">{pct(rows.est)}</td></tr>
          <tr><td className="p-1 font-sans">Lí thuyết</td><td className="p-1">{val(rows.truth)}</td><td className="p-1">—</td></tr>
        </tbody>
      </table>
    </section>
  );
}

/* --------------------------------- HUD ---------------------------------- */
export function LabHUD() {
  const ppe = useLabStore((s) => s.ppe);
  const subject = useLabStore((s) => s.subject);
  const plugin = useLabStore((s) => s.plugin);
  const session = useLabStore((s) => s.session);
  const trials = useLabStore((s) => s.trials);
  const completed = useLabStore((s) => s.completedSteps);
  const studentValue = useLabStore((s) => s.studentValue);
  const conclusion = useLabStore((s) => s.conclusion);
  const modal = useLabStore((s) => s.modal);
  const submitted = useLabStore((s) => s.submitted);
  const pending = useLabStore((s) => s.pendingTrial);
  const readyAt = useLabStore((s) => s.pendingReadyAt);
  const paused = useLabStore((s) => s.simPaused);
  const [now, setNow] = useState(() => Date.now());
  // Chờ hoạt cảnh tới cổng/kết thúc rồi mới hiện số đo (khớp đồng hồ trong cảnh)
  useEffect(() => {
    if (!pending || paused || Date.now() >= readyAt) return;
    const id = setTimeout(() => setNow(Date.now()), readyAt - Date.now() + 30);
    return () => clearTimeout(id);
  }, [pending, readyAt, paused, now]);
  const pendingReady = !!pending && !paused && Math.max(now, Date.now()) >= readyAt;
  const params = useLabStore((s) => s.params);
  const [tab, setTab] = useState<Tab>('steps');
  const [quizOpen, setQuizOpen] = useState(false);
  const [showPre, setShowPre] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const st = useLabStore.getState;
  const stepIdx = Math.min(plugin.steps.length, plugin.steps.findIndex((s) => !completed.includes(s.id)) === -1 ? plugin.steps.length : plugin.steps.findIndex((s) => !completed.includes(s.id)));
  const currentStep = plugin.steps[stepIdx];
  const lastPluginId = useRef<string>('');

  // Mở bài: hiện Pre-Quiz (nháp dở được mời làm tiếp bằng thẻ ResumeCard)
  useEffect(() => {
    if (lastPluginId.current === plugin.id) return;
    lastPluginId.current = plugin.id;
    setTab('steps');
    setQuizOpen(false);
    setShowPre(!useLabStore.getState().preSubmitted && plugin.preQuiz.length > 0);
  }, [plugin]);

  // Khôi phục nháp / đã bắt đầu làm → không che bằng câu hỏi trước thí nghiệm
  useEffect(() => {
    if (trials.length > 0 || completed.length > 0) setShowPre(false);
  }, [trials.length, completed.length]);

  // Tự lưu nháp mỗi 5 giây
  useEffect(() => {
    const id = setInterval(() => {
      const s = useLabStore.getState();
      if (s.submitted || (s.trials.length === 0 && s.completedSteps.length === 0)) return;
      void saveDraft(s.getDraft())
        .then(() => setSavedAt(Date.now()))
        .catch(() => undefined);
    }, APP_CONFIG.autosaveMs);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (submitted) void clearDraft(plugin.id).catch(() => undefined);
  }, [submitted, plugin.id]);

  // Không có phiên học sinh → mời nhập thông tin
  useEffect(() => {
    if (!useLabStore.getState().session && !useLabStore.getState().settings.showOnboarding) st().openModal('session');
  }, [st]);

  const doStep = (): void => {
    const r = st().performCurrentStep();
    st().toast(r.ok ? 'success' : 'warning', r.message);
  };
  const doMeasure = (): void => {
    void measureGuard.run(() => {
      const r = st().takeMeasurement();
      st().toast(r.ok ? 'info' : 'warning', r.message);
    });
  };
  const doCommit = (): void => {
    const r = st().commitPending();
    st().toast(r.ok ? 'success' : 'warning', r.message);
  };
  const doAuto = (n: number): void => {
    void measureGuard.run(() => {
      const r = st().autoMeasure(n);
      st().toast(r.ok ? 'success' : 'warning', r.message);
    });
  };
  const doReset = (): void =>
    st().askConfirm({
      title: 'Làm lại thí nghiệm?',
      message: 'Toàn bộ số liệu đo, các bước đã làm và kết quả sẽ bị xóa. Không thể hoàn tác.',
      confirmLabel: 'Làm lại',
      onConfirm: () => {
        void clearDraft(plugin.id).catch(() => undefined);
        st().resetLab();
      }
    });

  const stats = useMemo(
    () =>
      plugin.measurements.map((m) => {
        const xs = trials.map((t) => t.values[m.key]).filter((x) => Number.isFinite(x));
        return { m, mean: mean(xs), err: absError(xs), n: xs.length };
      }),
    [trials, plugin]
  );

  const missingPpe = currentStep?.requiresPpe ? plugin.ppeRequired.filter((k) => !ppe[k]) : [];
  const need = Math.max(0, plugin.minTrials - trials.length);
  /** Một hành động chính duy nhất cho bước hiện tại */
  const measureLabel = currentStep?.trigger === 'ball' ? 'Thả bi' : 'Đo';
  const primary: { label: string; run: () => void; icon: typeof Play } = submitted
    ? { label: 'Xem phiếu báo cáo', run: () => st().openModal('report'), icon: FileText }
    : !session
      ? { label: 'Nhập tên và lớp để bắt đầu', run: () => st().openModal('session'), icon: UserRound }
    : pending
      ? { label: pendingReady ? 'Ghi vào bảng' : paused ? 'Đang tạm dừng…' : 'Đang đo…', run: doCommit, icon: TableProperties }
    : !currentStep
      ? { label: 'Ghi kết quả của em', run: () => setTab('result'), icon: CheckCircle2 }
      : currentStep.action === 'measure'
        ? { label: measureLabel, run: doMeasure, icon: Ruler }
        : currentStep.action === 'record'
          ? need > 0
            ? { label: `${measureLabel} tiếp (còn ${need} lần)`, run: doMeasure, icon: Ruler }
            : { label: 'Đủ số lần đo – sang bước sau', run: doStep, icon: CheckCircle2 }
          : currentStep.action === 'adjust'
            ? { label: 'Chỉnh xong – sang bước sau', run: doStep, icon: CheckCircle2 }
            : { label: 'Làm bước này', run: doStep, icon: Play };
  const PrimaryIcon = primary.icon;
  const tuning = !currentStep || ['adjust', 'measure', 'record'].includes(currentStep.action);
  const measured = plugin.steps.some((x) => x.action === 'measure' && completed.includes(x.id));
  const conceptual = ['molecule', 'cell', 'membrane', 'signal'].includes(plugin.sceneTemplate);

  return (
    <aside className="panel no-print m-1 flex min-h-0 flex-col landscape:w-[380px] lg:w-[400px] lg:max-w-[40vw] portrait:max-h-[54vh]" data-tour="hud" aria-label="Bảng điều khiển thí nghiệm">
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <div className="flex gap-1.5">
          <button className="btn min-h-[44px] min-w-0 flex-1 justify-between text-left" onClick={() => st().openLessons(subject)} aria-label={`Đổi bài. Đang mở: ${plugin.shortTitle}`} style={{ borderLeft: `4px solid ${SUBJECT_COLORS[subject]}` }}>
            <span className="truncate font-semibold">{plugin.shortTitle}</span>
            <span className="shrink-0 text-xs text-lab-400">Đổi bài</span>
          </button>
          <button className="btn min-h-[44px] px-2.5" onClick={() => st().openModal('session')} aria-label="Thông tin học sinh" title={session ? `${session.studentName} · ${session.classCode}/${session.studentCode}` : 'Nhập tên và lớp'}>
            <UserRound size={17} /> {!session && <span className="text-xs">Nhập tên</span>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1" role="tablist">
          {(
            [
              ['steps', 'Làm thí nghiệm', ClipboardCheck],
              ['data', `Bảng số liệu (${trials.length})`, FileText],
              ['result', 'Kết quả', CheckCircle2]
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`btn min-h-[40px] px-1 text-xs ${tab === k ? 'border-lab-400 bg-slate-700' : 'border-transparent'}`} onClick={() => setTab(k)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div key={`${plugin.id}-${tab}`} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2">
        <ResumeCard />
        {quizOpen ? (
          <QuizPanel phase="pre" questions={plugin.preQuiz} onDone={() => { setQuizOpen(false); setShowPre(false); }} />
        ) : tab === 'steps' ? (
          <>
            {showPre && (
              <section className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 p-2 text-sm" aria-label="Câu hỏi trước thí nghiệm">
                <span className="min-w-[150px] flex-1">{plugin.preQuiz.length} câu hỏi nhanh trước khi làm</span>
                <button className="btn min-h-[40px]" onClick={() => setQuizOpen(true)}>
                  Trả lời
                </button>
                <button className="btn-ghost min-h-[40px]" onClick={() => { st().submitQuiz('pre'); setShowPre(false); }}>
                  Bỏ qua
                </button>
              </section>
            )}

            {/* Bước hiện tại: một thẻ, một nút chính */}
            <section className="rounded-xl border-2 border-lab-500 bg-lab-900/40 p-3" aria-label="Bước hiện tại">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <b className="text-lab-400">{currentStep ? `Bước ${stepIdx + 1}/${plugin.steps.length}` : 'Xong hết các bước rồi!'}</b>
                <span className="h-1.5 flex-1 overflow-hidden rounded bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={plugin.steps.length} aria-valuenow={stepIdx} aria-label="Tiến độ">
                  <span className="block h-full bg-lab-500" style={{ width: `${(stepIdx / Math.max(1, plugin.steps.length)) * 100}%` }} />
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold leading-snug">{currentStep ? currentStep.title : 'Tính và ghi kết quả'}</h2>
              <p className="mt-0.5 text-sm text-slate-200">{currentStep ? currentStep.instruction : 'Mở thẻ Kết quả, ghi con số em tính được và vài câu nhận xét.'}</p>
              {missingPpe.length > 0 && <p className="mt-1.5 rounded bg-amber-900/50 p-1.5 text-sm text-amber-100" role="status">⚠ Đeo đủ đồ bảo hộ (thanh phía trên) rồi mới làm nhé.</p>}
              {tuning && currentStep?.action === 'adjust' && (
                <div className="mt-2 space-y-2">
                  {plugin.tools?.includes('mc964') && <Mc964Console />}
                  <ParamControls />
                </div>
              )}
              {!session && <p className="mt-1.5 rounded bg-sky-900/40 p-1.5 text-sm text-sky-100">Ghi tên, mã học sinh và lớp của em trước đã nhé.</p>}
              {pending && session && !pendingReady && <p className="mt-1.5 animate-pulse rounded bg-slate-800 p-1.5 text-sm text-slate-200" role="status">⏱ Đang đo – nhìn vật chuyển động và đồng hồ trong khung 3D…</p>}
              {pending && session && pendingReady && (
                <p className="mt-1.5 rounded bg-slate-800 p-1.5 font-mono text-sm text-amber-200" role="status">
                  Số đo vừa có: {Object.entries(pending.values).map(([k, v]) => { const m = plugin.measurements.find((x) => x.key === k); return `${m?.label ?? k} = ${m?.valueLabels?.[String(v)] ?? fmtVi(v, m?.decimals ?? 3)}${m?.unit ? ` ${m.unit}` : ''}`; }).join('; ')}
                </p>
              )}
              <button className="btn-primary mt-2.5 min-h-[50px] w-full text-base" onClick={primary.run} disabled={(missingPpe.length > 0 && !submitted && !!session) || (!!pending && !pendingReady && !!session)}>
                <PrimaryIcon size={19} /> {primary.label}
              </button>
              {pending && session && pendingReady && <LiveChart pending={pending} />}
              {pending && session && (
                <button className="btn-ghost mt-1 w-full text-xs" onClick={() => st().discardPending()} title="Lần đo bất thường — không ghi vào bảng">
                  Bỏ lần này (đo lỗi)
                </button>
              )}
              {!pending && session && measured && !submitted && (!currentStep || (currentStep.action === 'record' && need === 0)) && (
                <button className="btn mt-1.5 w-full" onClick={doMeasure}>
                  <Ruler size={16} /> Đo thêm lần nữa
                </button>
              )}
              {!pending && session && !submitted && currentStep && ['measure', 'record'].includes(currentStep.action) && missingPpe.length === 0 && (
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  {[3, 5].map((n) => (
                    <button key={n} className="btn text-xs" onClick={() => doAuto(n)} title={`Đo và ghi tự động ${n} lần liên tiếp với thông số đang chọn`}>
                      <Repeat size={14} /> Đo lặp ×{n}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {tuning && currentStep?.action !== 'adjust' && (
              <section className="space-y-2 rounded-lg border border-slate-700 p-2" aria-label="Thông số">
                {plugin.tools?.includes('mc964') && <Mc964Console />}
                <PrincipleBox />
                <ParamControls />
              </section>
            )}
            <More title="Vì sao lại thế? (công thức, giải thích)" open={conceptual}>
              <InsightPanel />
              <div className="space-y-1 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">{plugin.title}</p>
                <p className="text-xs text-slate-400">{plugin.sgkRef}</p>
                <ul className="list-disc pl-4">
                  {plugin.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <p>{plugin.theory}</p>
                {plugin.equation && <p className="rounded bg-slate-950 p-1 text-center font-mono text-amber-200">{plugin.equation}</p>}
                <p className="rounded border border-slate-700 p-1.5 text-xs text-slate-400">
                  <b>Lưu ý về mô phỏng:</b> {MODEL_NOTE[plugin.subject]}
                </p>
              </div>
            </More>
            {plugin.tools?.includes('oxidation') && (
              <More title="Tính số oxi hóa">
                <OxidationTool />
              </More>
            )}
            <More title="Xem cả quy trình">
              <ol className="space-y-1">
                {plugin.steps.map((s, i) => {
                  const done = completed.includes(s.id);
                  return (
                    <li key={s.id} className="flex gap-2 text-sm">
                      {done ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" /> : <Circle size={17} className={`mt-0.5 shrink-0 ${i === stepIdx ? 'text-lab-400' : 'text-slate-600'}`} />}
                      <span className={done ? 'text-slate-400' : i === stepIdx ? 'font-semibold' : ''}>
                        {i + 1}. {s.title}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </More>
            <More title="Thêm lựa chọn">
              <div className="grid gap-1.5">
                {!tuning && (
                  <div className="space-y-2">
                    <PrincipleBox />
                    <ParamControls />
                  </div>
                )}
                {plugin.meniscusSkill && (
                  <button className="btn" onClick={() => st().openModal('meniscus')}>
                    <Camera size={15} /> Luyện đọc mặt khum
                  </button>
                )}
                <button className="btn" onClick={() => st().resetCamera()}>
                  <Eye size={15} /> Về góc nhìn ban đầu
                </button>
                <button className="btn" onClick={doReset}>
                  <RotateCcw size={15} /> Làm lại từ đầu
                </button>
                <p className="text-xs text-slate-400">{savedAt ? `Đã tự lưu lúc ${new Date(savedAt).toLocaleTimeString('vi-VN')}` : 'Bài được tự lưu, không lo mất.'}</p>
              </div>
            </More>
          </>
        ) : tab === 'data' ? (
          trials.length === 0 ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p className="text-center">Bảng còn trống. Đo xong, bấm “Ghi vào bảng” là số liệu hiện ở đây.</p>
              <TrialTable plugin={plugin} trials={trials} example={params} />
              <button className="btn-primary min-h-[46px] w-full" onClick={() => setTab('steps')}>
                Đi tới thí nghiệm
              </button>
              <ManualRowForm />
            </div>
          ) : (
            <>
              <p className={`text-sm font-semibold ${need > 0 ? 'text-warn' : 'text-ok'}`}>{need > 0 ? `Đã có ${trials.length} lần đo, cần thêm ${need} lần nữa.` : `✓ Đủ rồi: ${trials.length} lần đo.`}</p>
              <TrialTable plugin={plugin} trials={trials} onDelete={(i) => st().deleteTrial(i)} />
              <ManualRowForm />
              <ChartGrid plugin={plugin} trials={trials} limit={1} />
              <More title="Cách tính chi tiết (công thức, sai số)">
                <SummaryPanel />
              </More>
              <More title="Biểu đồ khác">
                <ChartGrid plugin={plugin} trials={trials} skip={1} empty="Bài này chỉ có một biểu đồ." />
              </More>
              <More title="Trung bình và sai số">
                <div className="space-y-1 text-sm">
                  {stats
                    .filter((x) => x.n > 0 && !x.m.valueLabels)
                    .map(({ m, mean: mu, err, n }) => (
                      <div key={m.key}>
                        {m.label}: trung bình <b className="font-mono">{fmtVi(mu, m.decimals + 1)}</b> {m.unit}, sai số <span className="font-mono">{fmtVi(err, m.decimals + 1)}</span> ({n} lần)
                      </div>
                    ))}
                  <p className="text-xs text-slate-400">Tính chung mọi lần đo, kể cả khi em đã đổi thông số.</p>
                </div>
              </More>
              <button className="btn min-h-[44px] w-full" onClick={() => st().openModal('worksheet')}>
                <Printer size={16} /> In hoặc lưu phiếu
              </button>
            </>
          )
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="student-value">
                {plugin.result.label}
                {plugin.result.unit ? ` (${plugin.result.unit})` : ''}
              </label>
              <input id="student-value" className="input min-h-[46px] font-mono text-base" inputMode="decimal" value={studentValue} onChange={(e) => st().setStudentValue(e.target.value)} placeholder="Ví dụ: 9,78" disabled={submitted} />
              <p className="mt-1 text-sm text-slate-400">💡 {plugin.result.hint}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="conclusion">
                Em rút ra được gì?
              </label>
              <textarea id="conclusion" className="input min-h-[90px]" value={conclusion} onChange={(e) => st().setConclusion(e.target.value)} placeholder={plugin.conclusionPrompt} disabled={submitted} />
            </div>
            <button className="btn-primary min-h-[50px] w-full text-base" onClick={() => st().openModal('report')}>
              <FileText size={18} /> {submitted ? 'Xem phiếu báo cáo' : 'Nộp bài'}
            </button>
            {submitted && <ResultCompare />}
            <More title="Cần trợ giúp?">
              <div className="grid gap-1.5">
                <button className="btn" onClick={() => st().setToolsOpen(true)}>
                  <Calculator size={15} /> Máy tính và sổ tay
                </button>
                <button className="btn" onClick={() => st().setTutorOpen(true)}>
                  <Bot size={15} /> Hỏi trợ lý AI
                </button>
                <button className="btn" onClick={() => st().openModal('worksheet')}>
                  <Printer size={15} /> In hoặc lưu phiếu
                </button>
              </div>
            </More>
          </>
        )}
      </div>
      {modal === 'session' && <SessionForm onClose={() => st().closeModal()} />}
    </aside>
  );
}
