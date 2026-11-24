/**
 * engines/gradingEngine.ts — Chấm điểm phiếu báo cáo thí nghiệm (thang 100) kèm GIẢI THÍCH TỪNG TIÊU CHÍ TRỪ ĐIỂM.
 *
 * Tiêu chí (tổng luôn = 100):
 *  1. Xử lí số liệu (30đ, hoặc 25đ nếu bài có kĩ năng đọc mặt khum): kết quả HS so với giá trị suy ra từ chính số liệu đo.
 *  2. Độ chính xác thực nghiệm (15đ): kết quả HS so với giá trị thực (ẩn) — trong sai số cho phép.
 *  3. Quy trình (20đ): tỉ lệ bước đã hoàn thành đúng thứ tự.
 *  4. Số lần đo (10đ): đủ số lần đo tối thiểu để tính trung bình.
 *  5. An toàn (15đ): trang bị bảo hộ (10đ) + không gây sự cố (5đ).
 *  6. Kết luận (10đ): độ dài tối thiểu + từ khóa khoa học.
 *  7. Đọc mặt khum (5đ, chỉ bài có burette/ống đong).
 */
import type { GradeCriterion, GradeInput, GradeReport } from '../types/lab';

const PPE_NAMES: Record<string, string> = { goggles: 'kính bảo hộ', gloves: 'găng tay', labelCheck: 'kiểm tra nhãn hóa chất' };

/** Sai số tương đối (%) giữa a và chuẩn b */
export function relativeError(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  if (b === 0) return a === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (Math.abs(a - b) / Math.abs(b)) * 100;
}

/** Chuẩn hóa chuỗi tiếng Việt để so khớp từ khóa (bỏ dấu, chữ thường) */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const pct = (x: number): string => x.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const fmt = (x: number): string => (Number.isFinite(x) ? x.toLocaleString('vi-VN', { maximumSignificantDigits: 4 }) : '—');

export function gradeSubmission(input: GradeInput, dataEstimate: number): GradeReport {
  const { plugin, trials, studentValue, trueValue } = input;
  const criteria: GradeCriterion[] = [];
  const calcMax = plugin.meniscusSkill ? 25 : 30;

  // 1. Xử lí số liệu
  const calcErr = relativeError(studentValue, dataEstimate);
  let calc = 0;
  let calcExp: string;
  if (!Number.isFinite(studentValue)) {
    calcExp = `Chưa nhập kết quả ${plugin.result.label} → trừ ${calcMax} điểm.`;
  } else if (!Number.isFinite(dataEstimate)) {
    calcExp = `Số liệu chưa đủ để suy ra ${plugin.result.label} (${plugin.result.hint}) → trừ ${calcMax} điểm.`;
  } else {
    calc = calcErr <= 1 ? calcMax : Math.max(0, Math.round(calcMax * (1 - (calcErr - 1) / 19)));
    calcExp =
      calc === calcMax
        ? `Tính đúng từ số liệu (${fmt(studentValue)} ≈ ${fmt(dataEstimate)} ${plugin.result.unit}).`
        : `Kết quả ${fmt(studentValue)} lệch ${pct(calcErr)}% so với giá trị suy ra từ chính số liệu của em (${fmt(dataEstimate)} ${plugin.result.unit}) → trừ ${calcMax - calc} điểm. Gợi ý: ${plugin.result.hint}`;
  }
  criteria.push({ id: 'calc', label: 'Xử lí số liệu', max: calcMax, earned: calc, explanation: calcExp });

  // 2. Độ chính xác thực nghiệm
  const relErr = relativeError(studentValue, trueValue);
  const tol = plugin.result.tolerancePercent;
  let acc = 0;
  if (relErr <= tol) acc = 15;
  else if (relErr <= 2 * tol) acc = 10;
  else if (relErr <= 4 * tol) acc = 5;
  criteria.push({
    id: 'accuracy',
    label: 'Độ chính xác thực nghiệm',
    max: 15,
    earned: acc,
    explanation:
      acc === 15
        ? `Sai số tương đối ${pct(relErr)}% ≤ ${tol}% cho phép.`
        : Number.isFinite(relErr)
          ? `Sai số tương đối ${pct(relErr)}% vượt mức ${tol}% → trừ ${15 - acc} điểm. Nguyên nhân thường gặp: ít lần đo, đọc sai dụng cụ, chưa loại bỏ lần đo bất thường.`
          : 'Không xác định được sai số do thiếu kết quả → trừ 15 điểm.'
  });

  // 3. Quy trình
  const done = plugin.steps.filter((s) => input.completedSteps.includes(s.id));
  const missing = plugin.steps.filter((s) => !input.completedSteps.includes(s.id));
  const proc = plugin.steps.length ? Math.round((done.length / plugin.steps.length) * 20) : 20;
  criteria.push({
    id: 'process',
    label: 'Quy trình thí nghiệm',
    max: 20,
    earned: proc,
    explanation: missing.length
      ? `Bỏ qua ${missing.length} bước: ${missing.map((s) => `"${s.title}"`).join(', ')} → trừ ${20 - proc} điểm.`
      : `Hoàn thành đủ ${plugin.steps.length} bước theo đúng trình tự.`
  });

  // 4. Số lần đo
  const tr = Math.round(Math.min(1, trials.length / Math.max(1, plugin.minTrials)) * 10);
  criteria.push({
    id: 'trials',
    label: 'Số lần đo lặp lại',
    max: 10,
    earned: tr,
    explanation:
      tr === 10
        ? `Đã đo ${trials.length} lần (tối thiểu ${plugin.minTrials}) — đủ để tính giá trị trung bình và sai số.`
        : `Chỉ đo ${trials.length}/${plugin.minTrials} lần → trừ ${10 - tr} điểm. Đo lặp nhiều lần giúp giảm sai số ngẫu nhiên.`
  });

  // 5. An toàn
  const req = plugin.ppeRequired;
  const missingPpe = req.filter((k) => !input.ppe[k]);
  const ppeScore = req.length ? Math.round(((req.length - missingPpe.length) / req.length) * 10) : 10;
  const incScore = Math.max(0, 5 - Math.round(input.incidentCount * 2.5));
  const safetyParts: string[] = [];
  if (missingPpe.length) safetyParts.push(`thiếu ${missingPpe.map((k) => PPE_NAMES[k]).join(', ')} (−${10 - ppeScore}đ)`);
  if (input.incidentCount) safetyParts.push(`gây ${input.incidentCount} sự cố trong lúc làm (−${5 - incScore}đ)`);
  criteria.push({
    id: 'safety',
    label: 'An toàn phòng thí nghiệm',
    max: 15,
    earned: ppeScore + incScore,
    explanation: safetyParts.length ? `Trừ điểm vì ${safetyParts.join('; ')}.` : 'Trang bị bảo hộ đầy đủ, không gây sự cố.'
  });

  // 6. Kết luận
  const conc = normalizeVi(input.conclusion.trim());
  const kws = plugin.conclusionKeywords;
  const hits = kws.filter((k) => conc.includes(normalizeVi(k)));
  const lenScore = conc.length >= 40 ? 4 : conc.length >= 15 ? 2 : 0;
  const kwScore = kws.length ? Math.round((hits.length / kws.length) * 6) : conc.length >= 40 ? 6 : 0;
  const missKw = kws.filter((k) => !hits.includes(k));
  criteria.push({
    id: 'conclusion',
    label: 'Kết luận khoa học',
    max: 10,
    earned: lenScore + kwScore,
    explanation:
      lenScore + kwScore === 10
        ? 'Kết luận đầy đủ, dùng đúng thuật ngữ khoa học.'
        : [
            lenScore < 4 ? `Kết luận quá ngắn (${conc.length} ký tự, cần ≥ 40) → −${4 - lenScore}đ` : '',
            missKw.length ? `chưa nêu các ý: ${missKw.map((k) => `"${k}"`).join(', ')} → −${6 - kwScore}đ` : ''
          ]
            .filter(Boolean)
            .join('; ') + '.'
  });

  // 7. Đọc mặt khum
  if (plugin.meniscusSkill) {
    const e = input.meniscusErrorMl;
    const m = e === null ? 0 : e <= 0.05 ? 5 : e <= 0.1 ? 3 : 1;
    criteria.push({
      id: 'meniscus',
      label: 'Kĩ năng đọc mặt khum',
      max: 5,
      earned: m,
      explanation:
        e === null
          ? 'Chưa luyện tập đọc mặt khum chất lỏng → trừ 5 điểm.'
          : m === 5
            ? `Đọc chính xác (sai lệch ${e.toFixed(2)} mL), mắt đặt ngang đáy mặt khum.`
            : `Sai lệch ${e.toFixed(2)} mL do sai số thị sai (mắt chưa ngang đáy mặt khum) → trừ ${5 - m} điểm.`
    });
  }

  const total = criteria.reduce((s, c) => s + c.earned, 0);
  const rank: GradeReport['rank'] = total >= 90 ? 'Xuất sắc' : total >= 75 ? 'Tốt' : total >= 50 ? 'Đạt' : 'Chưa đạt';
  return {
    total,
    max: 100,
    criteria,
    relativeErrorPercent: Number.isFinite(relErr) ? relErr : 999,
    trueValue,
    studentValue,
    rank
  };
}

/** Chấm một bộ câu hỏi trắc nghiệm: trả về số câu đúng và danh sách id ngộ nhận phát hiện được */
export function gradeQuiz(
  questions: Array<{ correctIndex: number; misconceptionId?: string }>,
  answers: number[]
): { score: number; max: number; misconceptions: string[] } {
  let score = 0;
  const mis = new Set<string>();
  questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) score++;
    else if (q.misconceptionId && answers[i] !== undefined && answers[i] >= 0) mis.add(q.misconceptionId);
  });
  return { score, max: questions.length, misconceptions: [...mis] };
}
