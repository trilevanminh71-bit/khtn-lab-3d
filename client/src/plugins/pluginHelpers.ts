/**
 * plugins/pluginHelpers.ts — Hàm rút gọn khi khai báo bài học (kết quả vẫn là JSON thuần).
 */
import type { QuizQuestion, StepDef } from '../types/lab';

/** Câu hỏi trắc nghiệm: đáp án đúng là chỉ số `correct` trong `options` */
export const quiz = (id: string, prompt: string, options: string[], correct: number, explanation: string, misconceptionId?: string): QuizQuestion => ({
  id,
  prompt,
  options,
  correctIndex: correct,
  explanation,
  ...(misconceptionId ? { misconceptionId } : {})
});

/** Quy trình 4 bước cho bài khám phá mô hình: quan sát → chọn thông số → ghi số liệu → xử lí */
export function exploreSteps(opts: { observe: string; click: string; adjust: string; measure: string; trigger: string; record: string; ppe?: boolean }): StepDef[] {
  return [
    { id: 's1', title: 'Quan sát mô hình', instruction: opts.observe, action: 'click', trigger: opts.click, requiresPpe: opts.ppe },
    { id: 's2', title: 'Chọn đại lượng khảo sát', instruction: `${opts.adjust} Mỗi lần chỉ thay đổi một đại lượng.`, action: 'adjust' },
    { id: 's3', title: 'Ghi số liệu', instruction: opts.measure, action: 'measure', trigger: opts.trigger, requiresPpe: opts.ppe },
    { id: 's4', title: 'Xử lí số liệu và kết luận', instruction: opts.record, action: 'record' }
  ];
}
