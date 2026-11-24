/**
 * components/NoCodeLessonWizard.tsx — Trình tạo bài thí nghiệm mới trong 4 bước, KHÔNG cần lập trình:
 *  1) Chọn 1 trong 5 template 3D có sẵn  2) Thông tin bài  3) Thông số & công thức (kiểm tra cú pháp + chạy thử)
 *  4) Câu hỏi trắc nghiệm & quy trình → Lưu vào IndexedDB, dùng ngay; xuất .json để chia sẻ.
 * Công thức dùng bộ tính biểu thức an toàn (engines/formulaEvaluator) — không thực thi mã tùy ý.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Save, Wand2 } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { WIZARD_TEMPLATES, type WizardTemplate } from '../plugins/pluginRegistry';
import { checkFormula, evaluateFormula } from '../engines/formulaEvaluator';
import { validatePluginDef } from '../plugins/pluginValidator';
import { SOLVER_IDS } from '../engines/solverRegistry';
import { audit, saveCustomPlugin } from '../offline/db';
import { reloadPlugins, fmtVi } from '../services/appServices';
import { SUBJECT_LABELS } from '../config/appConfig';
import { ModalShell } from './ModalShell';
import type { LabPluginDef, ParamDef, QuizQuestion, StepDef, SubjectId } from '../types/lab';

/** Chuyển tiêu đề tiếng Việt thành mã bài (slug) */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

const STEP_TRIGGERS: Record<WizardTemplate['id'], { snap: string; click: string; measure: string }> = {
  track: { snap: 'gate-slot', click: 'timer', measure: 'ball' },
  circuit: { snap: 'voltmeter-slot', click: 'ammeter', measure: 'switch' },
  beaker: { snap: 'beaker-slot', click: 'reagent-a', measure: 'reagent-b' },
  titration: { snap: 'flask-slot', click: 'acid-bottle', measure: 'stopcock' },
  microscope: { snap: 'stage-slot', click: 'light', measure: 'fine-knob' }
};

export default function NoCodeLessonWizard() {
  const [step, setStep] = useState(0);
  const [tpl, setTpl] = useState<WizardTemplate>(WIZARD_TEMPLATES[0]);
  const ex = tpl.example;
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectId>('physics');
  const [objectives, setObjectives] = useState('');
  const [theory, setTheory] = useState('');
  const [param, setParam] = useState({ key: ex.paramKey, label: ex.paramLabel, unit: ex.paramUnit, min: 1, max: 10, step: 0.5, def: 5 });
  const [hidden, setHidden] = useState({ key: ex.hiddenKey, label: ex.hiddenLabel, min: 1, max: 2, decimals: 3 });
  const [measure, setMeasure] = useState({ expr: ex.measureExpr, label: ex.measureLabel, unit: ex.measureUnit });
  const [result, setResult] = useState({ expr: ex.resultExpr, estimate: ex.estimateExpr, label: ex.resultLabel, unit: ex.resultUnit, tol: 5 });
  const [noise, setNoise] = useState(0.02);
  const [visualExpr, setVisualExpr] = useState(ex.visualExpr);
  const [ppe, setPpe] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([{ id: 'q1', prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]);
  const [errors, setErrors] = useState<string[]>([]);

  const chooseTemplate = (t: WizardTemplate): void => {
    setTpl(t);
    setSubject(t.subject);
    const e = t.example;
    setParam({ key: e.paramKey, label: e.paramLabel, unit: e.paramUnit, min: 1, max: 10, step: 0.5, def: 5 });
    setHidden({ key: e.hiddenKey, label: e.hiddenLabel, min: 1, max: 2, decimals: 3 });
    setMeasure({ expr: e.measureExpr, label: e.measureLabel, unit: e.measureUnit });
    setResult({ expr: e.resultExpr, estimate: e.estimateExpr, label: e.resultLabel, unit: e.resultUnit, tol: 5 });
    setVisualExpr(e.visualExpr);
  };

  const vars = [param.key, hidden.key];
  const formulaErrors = useMemo(() => {
    const out: string[] = [];
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(param.key)) out.push('Kí hiệu tham số chỉ gồm chữ cái không dấu, số, gạch dưới.');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(hidden.key) || hidden.key === param.key) out.push('Kí hiệu thông số ẩn không hợp lệ hoặc trùng tham số.');
    const e1 = checkFormula(measure.expr, vars);
    if (e1) out.push(`Công thức đo: ${e1}`);
    const e2 = checkFormula(result.expr, vars);
    if (e2) out.push(`Công thức kết quả: ${e2}`);
    const e3 = checkFormula(result.estimate, [param.key, 'm']);
    if (e3) out.push(`Công thức tính từ số liệu (chỉ dùng ${param.key} và m): ${e3}`);
    const e4 = checkFormula(visualExpr, vars);
    if (e4) out.push(`Công thức hoạt cảnh: ${e4}`);
    if (param.min >= param.max) out.push('Tham số: giá trị nhỏ nhất phải nhỏ hơn lớn nhất.');
    if (hidden.min >= hidden.max) out.push('Thông số ẩn: khoảng không hợp lệ.');
    return out;
  }, [param, hidden, measure.expr, result.expr, result.estimate, visualExpr]);

  /** Chạy thử: giá trị đo lí tưởng tại giá trị mặc định, và kiểm tra biểu thức ước lượng khôi phục đúng kết quả */
  const preview = useMemo(() => {
    if (formulaErrors.length) return null;
    try {
      const h = (hidden.min + hidden.max) / 2;
      const v = { [param.key]: param.def, [hidden.key]: h };
      const m = evaluateFormula(measure.expr, v);
      const truth = evaluateFormula(result.expr, v);
      const est = evaluateFormula(result.estimate, { [param.key]: param.def, m });
      return { m, truth, est, ok: Math.abs(est - truth) <= Math.abs(truth) * 1e-6 + 1e-9 };
    } catch {
      return null;
    }
  }, [formulaErrors, param, hidden, measure.expr, result.expr, result.estimate]);

  const buildPlugin = (): LabPluginDef => {
    const t = STEP_TRIGGERS[tpl.id];
    const steps: StepDef[] = [
      { id: 's1', title: 'Lắp dụng cụ', instruction: 'Kéo dụng cụ vào điểm gắn phát sáng.', action: 'snap', trigger: t.snap },
      { id: 's2', title: 'Chuẩn bị', instruction: 'Chạm vào dụng cụ phát sáng để chuẩn bị.', action: 'click', trigger: t.click, requiresPpe: ppe },
      { id: 's3', title: `Chọn ${param.label.toLowerCase()}`, instruction: `Chỉnh ${param.label} bằng thanh trượt.`, action: 'adjust' },
      { id: 's4', title: `Đo ${measure.label.toLowerCase()}`, instruction: 'Bấm Đo hoặc chạm dụng cụ đo.', action: 'measure', trigger: t.measure, requiresPpe: ppe },
      { id: 's5', title: 'Ghi số liệu & tính kết quả', instruction: `Đo nhiều lần rồi tính ${result.label}.`, action: 'record' }
    ];
    const params: ParamDef[] = [{ key: param.key, label: param.label, unit: param.unit, min: param.min, max: param.max, step: param.step, default: Math.min(param.max, Math.max(param.min, param.def)) }];
    const cleanQuiz = quiz.filter((q) => q.prompt.trim() && q.options.filter((o) => o.trim()).length >= 2).map((q, i) => ({ ...q, id: `q${i + 1}`, options: q.options.filter((o) => o.trim()) }));
    return {
      id: `tu-tao-${slugify(title) || 'bai'}-${Date.now().toString(36)}`,
      version: 1,
      subject,
      title: title.trim(),
      shortTitle: title.trim().slice(0, 40),
      sgkRef: 'Bài tự tạo bằng No-Code Wizard',
      chapter: 'Mở rộng',
      grade: 10,
      durationMin: 20,
      objectives: objectives.split('\n').map((x) => x.trim()).filter(Boolean),
      theory,
      sceneTemplate: tpl.id,
      sceneOptions: tpl.sceneOptions,
      solverId: 'custom-formula',
      formula: { measureExpr: measure.expr, measureKey: 'm', resultExpr: result.expr, estimateExpr: result.estimate, noise, visualExpr },
      params,
      hidden: [{ key: hidden.key, label: hidden.label, unit: result.unit, min: hidden.min, max: hidden.max, decimals: hidden.decimals }],
      measurements: [{ key: 'm', label: measure.label, unit: measure.unit, decimals: 3 }],
      minTrials: 3,
      result: { key: 'result', label: result.label, unit: result.unit, tolerancePercent: result.tol, decimals: 3, hint: `Dùng công thức: ${result.label} = ${result.estimate.replace(/\bm\b/g, measure.label)}` },
      steps,
      ppeRequired: ppe ? ['goggles', 'gloves', 'labelCheck'] : [],
      chemicals: [],
      incidents: [],
      preQuiz: cleanQuiz,
      postQuiz: cleanQuiz,
      meniscusSkill: false,
      conclusionPrompt: `Nêu giá trị ${result.label} đo được và nhận xét sai số.`,
      conclusionKeywords: [result.label.split(' ')[0] ?? 'kết quả', 'sai số'],
      tags: ['tự tạo'],
      source: 'wizard'
    };
  };

  const save = async (): Promise<void> => {
    const p = buildPlugin();
    const v = validatePluginDef(p, SOLVER_IDS);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    await saveCustomPlugin(v.plugin);
    await audit('wizard-create', v.plugin.id);
    await reloadPlugins();
    const st = useLabStore.getState();
    st.setSubject(v.plugin.subject);
    st.loadPlugin(v.plugin.id);
    st.toast('success', `Đã tạo bài "${v.plugin.shortTitle}" — có thể mở ngay trong danh sách bài.`);
    st.closeModal();
  };

  const canNext = [true, title.trim().length >= 5, formulaErrors.length === 0 && (preview?.ok ?? false), true][step];

  return (
    <ModalShell
      title={`Tạo bài thí nghiệm mới — Bước ${step + 1}/4`}
      onClose={() => useLabStore.getState().closeModal()}
      wide
      icon={<Wand2 size={18} className="text-lab-400" />}
      footer={
        <>
          {step > 0 && (
            <button className="btn" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Quay lại
            </button>
          )}
          {step < 3 ? (
            <button className="btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Tiếp <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn-primary" onClick={() => void save()}>
              <Save size={16} /> Lưu bài mới
            </button>
          )}
        </>
      }
    >
      <ol className="mb-3 flex gap-1 text-xs">
        {['Template 3D', 'Thông tin', 'Thông số & công thức', 'Câu hỏi'].map((s, i) => (
          <li key={s} className={`flex-1 rounded px-2 py-1 text-center ${i === step ? 'bg-lab-700 text-white' : i < step ? 'bg-slate-700' : 'bg-slate-800 text-slate-400'}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WIZARD_TEMPLATES.map((t) => (
            <button key={t.id} className={`rounded-xl border p-3 text-left ${tpl.id === t.id ? 'border-lab-400 bg-lab-900/40' : 'border-slate-700 hover:bg-slate-800'}`} onClick={() => chooseTemplate(t)}>
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-slate-400">{t.description}</div>
              <div className="mt-1 text-[11px] text-slate-500">Môn gợi ý: {SUBJECT_LABELS[t.subject]}</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <div>
            <label className="label">Tên bài thí nghiệm (≥ 5 ký tự)</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Đo điện trở bằng vôn kế và ampe kế" autoFocus />
          </div>
          <div>
            <label className="label">Môn học</label>
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}>
              {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((s) => (
                <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mục tiêu (mỗi dòng một mục)</label>
            <textarea className="input" rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </div>
          <div>
            <label className="label">Cơ sở lí thuyết</label>
            <textarea className="input" rows={3} value={theory} onChange={(e) => setTheory(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ppe} onChange={(e) => setPpe(e.target.checked)} /> Bài có dùng hóa chất (bắt buộc kính, găng tay, kiểm tra nhãn)
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 text-sm">
          <fieldset className="grid gap-2 rounded-lg border border-slate-700 p-2 sm:grid-cols-4">
            <legend className="px-1 font-semibold">Tham số học sinh chỉnh (thanh trượt)</legend>
            <input className="input" value={param.key} onChange={(e) => setParam({ ...param, key: e.target.value })} aria-label="Kí hiệu" placeholder="Kí hiệu" />
            <input className="input sm:col-span-2" value={param.label} onChange={(e) => setParam({ ...param, label: e.target.value })} aria-label="Tên" placeholder="Tên" />
            <input className="input" value={param.unit} onChange={(e) => setParam({ ...param, unit: e.target.value })} aria-label="Đơn vị" placeholder="Đơn vị" />
            {(['min', 'max', 'step', 'def'] as const).map((k) => (
              <label key={k} className="text-xs">
                {{ min: 'Nhỏ nhất', max: 'Lớn nhất', step: 'Bước', def: 'Mặc định' }[k]}
                <input className="input" type="number" value={param[k]} onChange={(e) => setParam({ ...param, [k]: Number(e.target.value) })} />
              </label>
            ))}
          </fieldset>
          <fieldset className="grid gap-2 rounded-lg border border-slate-700 p-2 sm:grid-cols-4">
            <legend className="px-1 font-semibold">Thông số ẩn (sinh ngẫu nhiên riêng cho từng học sinh)</legend>
            <input className="input" value={hidden.key} onChange={(e) => setHidden({ ...hidden, key: e.target.value })} aria-label="Kí hiệu ẩn" />
            <input className="input" value={hidden.label} onChange={(e) => setHidden({ ...hidden, label: e.target.value })} aria-label="Tên thông số ẩn" />
            <label className="text-xs">Nhỏ nhất<input className="input" type="number" value={hidden.min} onChange={(e) => setHidden({ ...hidden, min: Number(e.target.value) })} /></label>
            <label className="text-xs">Lớn nhất<input className="input" type="number" value={hidden.max} onChange={(e) => setHidden({ ...hidden, max: Number(e.target.value) })} /></label>
          </fieldset>
          <fieldset className="grid gap-2 rounded-lg border border-slate-700 p-2 sm:grid-cols-3">
            <legend className="px-1 font-semibold">Đại lượng đo được mỗi lần (m)</legend>
            <input className="input font-mono" value={measure.expr} onChange={(e) => setMeasure({ ...measure, expr: e.target.value })} aria-label="Công thức đo" />
            <input className="input" value={measure.label} onChange={(e) => setMeasure({ ...measure, label: e.target.value })} aria-label="Tên đại lượng đo" />
            <input className="input" value={measure.unit} onChange={(e) => setMeasure({ ...measure, unit: e.target.value })} aria-label="Đơn vị đo" />
            <label className="text-xs">Nhiễu đo (%)<input className="input" type="number" min={0} max={20} step={0.5} value={noise * 100} onChange={(e) => setNoise(Number(e.target.value) / 100)} /></label>
            <label className="text-xs sm:col-span-2">Hoạt cảnh 3D (0→1)<input className="input font-mono" value={visualExpr} onChange={(e) => setVisualExpr(e.target.value)} /></label>
          </fieldset>
          <fieldset className="grid gap-2 rounded-lg border border-slate-700 p-2 sm:grid-cols-3">
            <legend className="px-1 font-semibold">Kết quả học sinh phải tìm</legend>
            <label className="text-xs">Đáp án đúng (theo thông số ẩn)<input className="input font-mono" value={result.expr} onChange={(e) => setResult({ ...result, expr: e.target.value })} /></label>
            <label className="text-xs">Cách tính từ số liệu (dùng m)<input className="input font-mono" value={result.estimate} onChange={(e) => setResult({ ...result, estimate: e.target.value })} /></label>
            <label className="text-xs">Sai số cho phép (%)<input className="input" type="number" value={result.tol} onChange={(e) => setResult({ ...result, tol: Number(e.target.value) })} /></label>
            <input className="input" value={result.label} onChange={(e) => setResult({ ...result, label: e.target.value })} aria-label="Tên kết quả" />
            <input className="input" value={result.unit} onChange={(e) => setResult({ ...result, unit: e.target.value })} aria-label="Đơn vị kết quả" />
          </fieldset>
          <p className="text-xs text-slate-400">Cho phép: + − * / ^ ( ), sqrt, abs, sin, cos, tan, ln, log10, exp, min, max, pow, round, PI, G (9,8).</p>
          {formulaErrors.length > 0 ? (
            <ul className="list-disc rounded bg-red-950/50 p-2 pl-6 text-xs text-red-200">{formulaErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          ) : preview ? (
            <p className={`rounded p-2 text-xs ${preview.ok ? 'bg-emerald-900/40 text-ok' : 'bg-amber-900/40 text-warn'}`}>
              Chạy thử ({param.key} = {param.def}, {hidden.key} = {fmtVi((hidden.min + hidden.max) / 2)}): m = {fmtVi(preview.m, 4)} {measure.unit}; đáp án = {fmtVi(preview.truth, 4)}; tính lại từ m = {fmtVi(preview.est, 4)}
              {preview.ok ? ' ✓ Công thức nhất quán.' : ' ✗ Cách tính từ số liệu không khôi phục được đáp án — hãy kiểm tra lại.'}
            </p>
          ) : null}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">Câu hỏi dùng cho cả kiểm tra trước và sau thí nghiệm. Bỏ trống nếu không cần.</p>
          {quiz.map((q, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-slate-700 p-2">
              <input className="input" value={q.prompt} placeholder={`Câu hỏi ${i + 1}`} onChange={(e) => setQuiz(quiz.map((x, k) => (k === i ? { ...x, prompt: e.target.value } : x)))} />
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-1 text-xs">
                  <input type="radio" checked={q.correctIndex === oi} onChange={() => setQuiz(quiz.map((x, k) => (k === i ? { ...x, correctIndex: oi } : x)))} aria-label={`Đáp án đúng ${oi + 1}`} />
                  <input className="input py-1 text-xs" value={o} placeholder={`Phương án ${String.fromCharCode(65 + oi)}`} onChange={(e) => setQuiz(quiz.map((x, k) => (k === i ? { ...x, options: x.options.map((y, j) => (j === oi ? e.target.value : y)) } : x)))} />
                </label>
              ))}
              <input className="input py-1 text-xs" value={q.explanation} placeholder="Giải thích" onChange={(e) => setQuiz(quiz.map((x, k) => (k === i ? { ...x, explanation: e.target.value } : x)))} />
            </div>
          ))}
          <button className="btn text-xs" onClick={() => setQuiz([...quiz, { id: `q${quiz.length + 1}`, prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }])}>
            + Thêm câu hỏi
          </button>
          {errors.length > 0 && <ul className="list-disc rounded bg-red-950/50 p-2 pl-6 text-xs text-red-200">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
    </ModalShell>
  );
}
