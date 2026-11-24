/**
 * plugins/pluginValidator.ts — Kiểm tra một bài học JSON (từ CMS, No-Code Wizard, file nhập
 * hoặc gói Remote) trước khi nạp, để dữ liệu sai không làm hỏng ứng dụng.
 * Đầu vào: giá trị `unknown` (đã JSON.parse). Đầu ra: danh sách lỗi tiếng Việt + plugin đã chuẩn hóa.
 */
import type { LabPluginDef, SceneTemplateId, SubjectId } from '../types/lab';

const SUBJECTS: SubjectId[] = ['physics', 'chemistry', 'biology'];
const TEMPLATES: SceneTemplateId[] = ['track', 'circuit', 'beaker', 'titration', 'microscope'];

/** Giá trị mặc định cho các trường tùy chọn của bài tự tạo */
const PLUGIN_DEFAULTS: Omit<LabPluginDef, 'id' | 'title' | 'subject' | 'sceneTemplate' | 'solverId' | 'params' | 'hidden' | 'measurements' | 'result' | 'steps' | 'preQuiz' | 'postQuiz' | 'objectives'> = {
  version: 1,
  shortTitle: '',
  sgkRef: 'Bài tự tạo',
  chapter: 'Mở rộng',
  grade: 10,
  durationMin: 20,
  theory: '',
  sceneOptions: {},
  minTrials: 3,
  ppeRequired: [],
  chemicals: [],
  incidents: [],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu kết luận rút ra từ thí nghiệm.',
  conclusionKeywords: [],
  tags: [],
  source: 'cms'
};

export type ValidationResult = { ok: true; plugin: LabPluginDef } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validatePluginDef(raw: unknown, knownSolvers: string[]): ValidationResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['Dữ liệu bài học không phải đối tượng JSON.'] };
  const r = raw;
  if (!isStr(r.id) || !/^[a-z0-9-]{3,60}$/.test(r.id)) errors.push('Mã bài (id) phải gồm chữ thường, số, gạch ngang (3–60 ký tự).');
  if (!isStr(r.title) || r.title.trim().length < 3) errors.push('Thiếu tên bài thí nghiệm.');
  if (!SUBJECTS.includes(r.subject as SubjectId)) errors.push('Môn học phải là physics, chemistry hoặc biology.');
  if (!TEMPLATES.includes(r.sceneTemplate as SceneTemplateId)) errors.push('Template 3D không hợp lệ.');
  if (!isStr(r.solverId) || !knownSolvers.includes(r.solverId)) errors.push(`Bộ giải "${String(r.solverId)}" không tồn tại.`);
  if (r.solverId === 'custom-formula') {
    const f = r.formula;
    if (!isObj(f) || !isStr(f.measureExpr) || !isStr(f.resultExpr) || !isStr(f.estimateExpr) || !isStr(f.measureKey)) {
      errors.push('Bài No-Code cần đủ biểu thức đo, biểu thức kết quả và biểu thức ước lượng.');
    }
  }
  const arrays = ['params', 'hidden', 'measurements', 'steps', 'preQuiz', 'postQuiz', 'objectives'] as const;
  for (const k of arrays) if (!Array.isArray(r[k])) errors.push(`Trường "${k}" phải là danh sách.`);
  if (Array.isArray(r.params)) {
    r.params.forEach((p, i) => {
      if (!isObj(p) || !isStr(p.key) || !isNum(p.min) || !isNum(p.max) || !isNum(p.default) || !isNum(p.step)) {
        errors.push(`Tham số #${i + 1} thiếu key/min/max/step/default.`);
      } else if (p.min >= p.max) errors.push(`Tham số "${p.key}": min phải nhỏ hơn max.`);
    });
  }
  if (Array.isArray(r.steps) && r.steps.length === 0) errors.push('Bài học cần ít nhất 1 bước.');
  const checkQuiz = (q: unknown, label: string): void => {
    if (!Array.isArray(q)) return;
    q.forEach((item, i) => {
      if (!isObj(item) || !isStr(item.prompt) || !Array.isArray(item.options) || !isNum(item.correctIndex)) {
        errors.push(`${label} câu ${i + 1} sai cấu trúc.`);
      } else if (item.correctIndex < 0 || item.correctIndex >= item.options.length) {
        errors.push(`${label} câu ${i + 1}: đáp án đúng nằm ngoài danh sách lựa chọn.`);
      }
    });
  };
  checkQuiz(r.preQuiz, 'Câu hỏi trước');
  checkQuiz(r.postQuiz, 'Câu hỏi sau');
  if (!isObj(r.result) || !isStr(r.result.key) || !isNum(r.result.tolerancePercent)) {
    errors.push('Thiếu đại lượng kết quả (result.key, result.tolerancePercent).');
  }
  if (errors.length) return { ok: false, errors };
  // Chuẩn hóa các trường tùy chọn
  const plugin: LabPluginDef = { ...PLUGIN_DEFAULTS, ...(r as unknown as LabPluginDef) };
  if (!plugin.shortTitle) plugin.shortTitle = plugin.title;
  return { ok: true, plugin };
}
