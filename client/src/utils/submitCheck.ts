/**
 * utils/submitCheck.ts — Kiểm tra bài trước khi cho nộp (chống nộp bài rỗng / bất thường).
 * Đầu vào: bài học, các lần đo, kết quả & kết luận học sinh nhập, thời điểm bắt đầu, câu trả lời Pre-Quiz.
 * Đầu ra: blockers (lí do KHÓA nút Nộp bài) và warnings (cảnh báo, vẫn cho nộp).
 * Ý nghĩa: không cho nộp khi chưa đủ lần đo hợp lệ, thiếu kết quả/kết luận, hoặc kết quả lệch bất thường so với chính số liệu đo.
 */
import type { LabPluginDef, SolveContext, TrialRecord } from '../types/lab';
import { getSolver } from '../engines/solverRegistry';
import { parseViNumber } from '../services/appServices';
import { validTrials } from './trialTable';

/** Thời gian làm bài tối thiểu hợp lí (giây) — ngắn hơn thì cảnh báo */
export const MIN_REASONABLE_SEC = 180;
/** Kết quả nhập lệch quá mức này so với giá trị tính từ chính số liệu đo → coi là bất thường */
export const MAX_DATA_DEVIATION_PERCENT = 50;

export interface SubmitCheck {
  blockers: string[];
  warnings: string[];
  validCount: number;
}

export function checkSubmission(input: {
  plugin: LabPluginDef;
  trials: TrialRecord[];
  studentValue: string;
  conclusion: string;
  startedAt: number;
  preAnswers: number[];
  ctx: SolveContext;
}): SubmitCheck {
  const { plugin, trials } = input;
  const valid = validTrials(plugin, trials);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (valid.length < plugin.minTrials) blockers.push(`Cần ít nhất ${plugin.minTrials} lần đo hợp lệ (đang có ${valid.length}).`);
  const value = parseViNumber(input.studentValue);
  if (!Number.isFinite(value)) blockers.push(`Chưa nhập ${plugin.result.label.toLowerCase()}.`);
  if (input.conclusion.trim().length < 15) blockers.push('Chưa viết kết luận (ít nhất một câu).');
  if (valid.length > 0 && Number.isFinite(value)) {
    let est = Number.NaN;
    try {
      const last = valid[valid.length - 1];
      est = getSolver(plugin.solverId).estimateFromTrials(valid, { ...input.ctx, params: last.params });
    } catch {
      est = Number.NaN;
    }
    if (!Number.isFinite(est)) blockers.push('Số liệu đo chưa đủ để tính kết quả — kiểm tra lại các lần đo.');
    else if (est !== 0 && (Math.abs(value - est) / Math.abs(est)) * 100 > MAX_DATA_DEVIATION_PERCENT)
      blockers.push('Kết quả em nhập lệch quá xa so với số liệu em đã đo — kiểm tra lại phép tính và đơn vị.');
  }
  const sec = (Date.now() - input.startedAt) / 1000;
  if (sec < MIN_REASONABLE_SEC) warnings.push(`Em mới làm ${Math.max(1, Math.round(sec / 60))} phút — thời gian ngắn bất thường, giáo viên sẽ thấy điều này.`);
  if (plugin.preQuiz.length > 0 && input.preAnswers.every((a) => a < 0)) warnings.push('Em đã bỏ qua câu hỏi trước thí nghiệm — phần "tiến bộ" sẽ ghi là chưa làm.');
  return { blockers, warnings, validCount: valid.length };
}
