/**
 * components/LabHUD.tsx — Bảng điều khiển thí nghiệm, TỰ THÍCH ỨNG màn hình ngang/dọc:
 *  - Ngang / máy tính: cột bên phải; Dọc / điện thoại: ngăn dưới cảnh 3D, chia tab.
 *  - Chọn bài, phiên học sinh, Pre-Quiz, quy trình các bước, thông số, nút Đo (chống bấm đúp),
 *    bảng số liệu + thống kê, kết quả & kết luận, nút Về góc nhìn chuẩn, Làm lại (xác nhận), Nộp bài.
 *  - Tự lưu nháp mỗi 5 giây vào IndexedDB; thẻ "Tiếp tục bài đang làm dở"; biểu đồ và phiếu thí nghiệm.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Calculator, Camera, CheckCircle2, Circle, ClipboardCheck, Eye, FileText, Play, Printer, RotateCcw, Ruler, UserRound } from 'lucide-react';
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
import { TrialTable } from './TrialTable';
import { ChartGrid } from './DataChart';
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

/* --------------------------------- HUD ---------------------------------- */
export function LabHUD() {
  const plugins = useLabStore((s) => s.plugins);
  const subject = useLabStore((s) => s.subject);
  const plugin = useLabStore((s) => s.plugin);
  const session = useLabStore((s) => s.session);
  const trials = useLabStore((s) => s.trials);
  const completed = useLabStore((s) => s.completedSteps);
  const studentValue = useLabStore((s) => s.studentValue);
  const conclusion = useLabStore((s) => s.conclusion);
  const modal = useLabStore((s) => s.modal);
  const submitted = useLabStore((s) => s.submitted);
  const [tab, setTab] = useState<Tab>('steps');
  const [showTheory, setShowTheory] = useState(false);
  const [showPre, setShowPre] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const st = useLabStore.getState;
  const stepIdx = Math.min(plugin.steps.length, plugin.steps.findIndex((s) => !completed.includes(s.id)) === -1 ? plugin.steps.length : plugin.steps.findIndex((s) => !completed.includes(s.id)));
  const currentStep = plugin.steps[stepIdx];
  const list = plugins.filter((p) => p.subject === subject);
  const lastPluginId = useRef<string>('');

  // Mở bài: hiện Pre-Quiz (nháp dở được mời làm tiếp bằng thẻ ResumeCard)
  useEffect(() => {
    if (lastPluginId.current === plugin.id) return;
    lastPluginId.current = plugin.id;
    setTab('steps');
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

  const choosePlugin = (id: string): void => {
    if (id === plugin.id) return;
    if (hasUnsavedWork()) {
      st().askConfirm({ title: 'Chuyển bài thí nghiệm?', message: 'Bài đang làm dở đã được tự lưu nháp. Chuyển sang bài khác?', confirmLabel: 'Chuyển bài', onConfirm: () => st().loadPlugin(id) });
    } else st().loadPlugin(id);
  };

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

  return (
    <aside className="panel no-print m-1 flex min-h-0 flex-col landscape:w-[380px] lg:w-[400px] lg:max-w-[40vw] portrait:max-h-[52vh]" data-tour="hud" aria-label="Bảng điều khiển thí nghiệm">
      {/* Đầu bảng: chọn bài + học sinh */}
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <div className="flex gap-1.5">
          <select className="input py-1.5" value={plugin.id} onChange={(e) => choosePlugin(e.target.value)} aria-label="Chọn bài thí nghiệm" style={{ borderLeft: `4px solid ${SUBJECT_COLORS[subject]}` }}>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortTitle}
                {p.source !== 'builtin' ? ' (tùy biến)' : ''}
              </option>
            ))}
          </select>
          <button className="btn px-2" onClick={() => st().openModal('session')} title="Thông tin học sinh" aria-label="Thông tin học sinh">
            <UserRound size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">{session ? `${session.studentName} · ${session.classCode}/${session.studentCode}` : 'Chưa nhập thông tin học sinh'}</span>
          <span>{savedAt ? `Đã lưu nháp ${new Date(savedAt).toLocaleTimeString('vi-VN')}` : 'Tự lưu mỗi 5 giây'}</span>
        </div>
        <div className="flex gap-1" role="tablist">
          {(
            [
              ['steps', 'Quy trình', ClipboardCheck],
              ['data', `Số liệu (${trials.length})`, FileText],
              ['result', 'Kết quả', CheckCircle2]
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`btn flex-1 px-1 text-xs ${tab === k ? 'border-lab-400 bg-slate-700' : ''}`} onClick={() => setTab(k)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div key={`${plugin.id}-${tab}`} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        <ResumeCard />
        {showPre ? (
          <QuizPanel phase="pre" questions={plugin.preQuiz} onDone={() => setShowPre(false)} />
        ) : tab === 'steps' ? (
          <>
            <div>
              <h2 className="text-sm font-bold leading-snug">{plugin.title}</h2>
              <p className="text-xs text-slate-400">{plugin.sgkRef}</p>
              <button className="mt-1 text-xs text-lab-400 underline" onClick={() => setShowTheory(!showTheory)}>
                {showTheory ? 'Ẩn cơ sở lí thuyết' : 'Xem mục tiêu & cơ sở lí thuyết'}
              </button>
              {showTheory && (
                <div className="mt-1 space-y-1 rounded-lg bg-slate-800/70 p-2 text-xs text-slate-300">
                  <ul className="list-disc pl-4">
                    {plugin.objectives.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                  <p>{plugin.theory}</p>
                  {plugin.equation && <p className="rounded bg-slate-900 p-1 text-center font-mono text-amber-200">{plugin.equation}</p>}
                </div>
              )}
            </div>
            <ol className="space-y-1">
              {plugin.steps.map((s, i) => {
                const done = completed.includes(s.id);
                const cur = i === stepIdx;
                return (
                  <li key={s.id} className={`flex gap-2 rounded-lg p-1.5 text-sm ${cur ? 'border border-lab-500 bg-lab-900/40' : ''}`}>
                    {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" /> : <Circle size={18} className={`mt-0.5 shrink-0 ${cur ? 'text-lab-400' : 'text-slate-600'}`} />}
                    <div>
                      <div className={done ? 'text-slate-400 line-through' : 'font-medium'}>
                        {i + 1}. {s.title}
                        {s.requiresPpe && <span className="ml-1 text-xs text-warn">(cần bảo hộ)</span>}
                      </div>
                      {cur && <p className="text-xs text-slate-300">{s.instruction}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {currentStep && currentStep.action !== 'measure' && currentStep.action !== 'adjust' && (
              <button className="btn-primary w-full" onClick={doStep}>
                <Play size={16} /> Thực hiện bước {stepIdx + 1}: {currentStep.title}
              </button>
            )}
            {!currentStep && <p className="rounded-lg bg-emerald-900/40 p-2 text-sm text-ok">Đã hoàn thành mọi bước! Chuyển sang tab Kết quả để nộp bài.</p>}

            {plugin.tools?.includes('mc964') && <Mc964Console />}
            <PrincipleBox />
            <div className="space-y-2 rounded-lg border border-slate-700 p-2">
              <h3 className="text-xs font-bold uppercase text-slate-400">Thông số thí nghiệm</h3>
              <ParamControls />
              {currentStep?.action === 'adjust' && (
                <button className="btn w-full text-xs" onClick={doStep}>
                  Giữ thông số mặc định và tiếp tục
                </button>
              )}
            </div>
            <InsightPanel />
            {plugin.tools?.includes('oxidation') && <OxidationTool />}
            <div className="grid grid-cols-2 gap-1.5">
              <button className="btn-primary col-span-2 py-2 text-base" onClick={doMeasure} disabled={submitted}>
                <Ruler size={18} /> Đo / ghi số liệu
              </button>
              <button className="btn text-xs" onClick={() => st().resetCamera()}>
                <Eye size={14} /> Về góc nhìn chuẩn
              </button>
              <button className="btn text-xs" onClick={doReset}>
                <RotateCcw size={14} /> Làm lại
              </button>
              {plugin.meniscusSkill && (
                <button className="btn col-span-2 text-xs" onClick={() => st().openModal('meniscus')}>
                  <Camera size={14} /> Luyện đọc mặt khum (chống sai số thị sai)
                </button>
              )}
            </div>
          </>
        ) : tab === 'data' ? (
          <>
            {trials.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có số liệu. Bấm “Đo / ghi số liệu” ở tab Quy trình hoặc chạm vào dụng cụ đo trong cảnh 3D.</p>
            ) : (
              <TrialTable plugin={plugin} trials={trials} onDelete={(i) => st().deleteTrial(i)} />
            )}
            {trials.length > 0 && (
              <button className="btn w-full text-xs" onClick={() => st().openModal('worksheet')}>
                <Printer size={14} /> In / Xuất phiếu thí nghiệm
              </button>
            )}
            <SummaryPanel />
            <ChartGrid plugin={plugin} trials={trials} />
            {trials.length > 0 && (
              <div className="rounded-lg bg-slate-800/60 p-2 text-xs">
                <b>Thống kê nhanh (toàn bộ lần đo):</b>
                {stats.filter((x) => x.n > 0 && !x.m.valueLabels).map(({ m, mean: mu, err, n }) => (
                  <div key={m.key}>
                    {m.label}: trung bình = <b className="font-mono">{fmtVi(mu, m.decimals + 1)}</b> {m.unit}; Δ̄ = <span className="font-mono">{fmtVi(err, m.decimals + 1)}</span> (n = {n})
                  </div>
                ))}
                <p className="mt-1 text-slate-400">Cần tối thiểu {plugin.minTrials} lần đo. Lưu ý: hãy tự tính kết quả theo công thức trong lí thuyết.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="student-value">
                {plugin.result.label} ({plugin.result.unit || 'không đơn vị'})
              </label>
              <input id="student-value" className="input font-mono" inputMode="decimal" value={studentValue} onChange={(e) => st().setStudentValue(e.target.value)} placeholder="Nhập kết quả em tính được, ví dụ 9,78" disabled={submitted} />
              <p className="mt-1 text-xs text-slate-400">💡 {plugin.result.hint}</p>
            </div>
            <div>
              <label className="label" htmlFor="conclusion">Kết luận</label>
              <textarea id="conclusion" className="input min-h-[90px]" value={conclusion} onChange={(e) => st().setConclusion(e.target.value)} placeholder={plugin.conclusionPrompt} disabled={submitted} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button className="btn text-xs" onClick={() => st().setToolsOpen(true)}>
                <Calculator size={14} /> Máy tính & sổ tay
              </button>
              <button className="btn text-xs" onClick={() => st().setTutorOpen(true)}>
                <Bot size={14} /> Hỏi trợ lý AI
              </button>
              <button className="btn col-span-2 text-xs" onClick={() => st().openModal('worksheet')}>
                <Printer size={14} /> In / Xuất phiếu thí nghiệm
              </button>
              <button className="btn-primary col-span-2 py-2" onClick={() => st().openModal('report')}>
                <FileText size={16} /> {submitted ? 'Xem lại phiếu báo cáo' : 'Nộp bài & xem phiếu báo cáo'}
              </button>
            </div>
          </>
        )}
      </div>
      {modal === 'session' && <SessionForm onClose={() => st().closeModal()} />}
    </aside>
  );
}
