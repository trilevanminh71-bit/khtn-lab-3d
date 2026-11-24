/**
 * engines/chemistry/chemistrySolver.ts — Công thức Hóa học 10 (SGK Kết nối tri thức).
 *
 *  1) thiosulfate-rate : Tốc độ phản ứng sodium thiosulfate + sulfuric acid (Bài 15 – Tốc độ phản ứng)
 *        Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + S↓ + SO₂↑ + H₂O
 *        Thời gian xuất hiện vẩn đục che dấu "X": t = A / C · γ^(−(T−25)/10) (quy tắc Van't Hoff)
 *        ⇒ Kết quả: hệ số nhiệt độ Van't Hoff γ.
 *  2) h2o2-catalyst    : Phân hủy hydrogen peroxide có xúc tác MnO₂ / enzyme catalase (khoai tây)
 *        2H₂O₂ → 2H₂O + O₂↑ ; V(O₂)(t) = Vmax·(1 − e^(−k·t)), Vmax = ½·C·V·24,79 L/mol (đkc 25 °C, 1 bar)
 *        ⇒ Kết quả: nồng độ H₂O₂ ban đầu (mol/L).
 *  3) kmno4-titration  : Chuẩn độ Fe²⁺ bằng potassium permanganate trong môi trường sulfuric acid (Bài 13 – Phản ứng oxi hóa – khử)
 *        5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O ⇒ C(Fe²⁺) = 5·C(KMnO₄)·V(KMnO₄) / V(Fe²⁺)
 *  4) enthalpy-zn-cuso4: Biến thiên enthalpy Zn + copper(II) sulfate (Bài 14 – Năng lượng hóa học)
 *        Zn + CuSO₄ → ZnSO₄ + Cu ; Q = m·c·ΔT ⇒ ΔrH = −Q / n (kJ/mol), Zn dư.
 */
import type { LabSolver, SolveContext, TrialRecord } from '../../types/lab';
import { gaussian, roundTo } from '../../utils/randomizer';
import { linearRegression, mean } from '../statistics';

/** Thể tích mol khí ở điều kiện chuẩn (25 °C, 1 bar) theo SGK Hóa học 10: 24,79 L/mol */
export const MOLAR_VOLUME_L = 24.79;
/** Nhiệt dung riêng của dung dịch loãng ≈ nước: 4,18 J/(g·K) */
export const SPECIFIC_HEAT = 4.18;

const p = (ctx: SolveContext, key: string, fallback = 0): number => ctx.params[key] ?? fallback;
const h = (ctx: SolveContext, key: string, fallback = 0): number => ctx.hidden[key] ?? fallback;

/** Trộn hai màu hex theo tỉ lệ t ∈ [0,1] */
export function mixColor(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number): number => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 1) Tốc độ phản ứng sodium thiosulfate                                */
/* ------------------------------------------------------------------ */
/** Thời gian (s) để kết tủa S che khuất dấu X: t = A/C · γ^(−(T−25)/10) */
export function thiosulfateTime(A: number, C: number, T: number, gamma: number): number {
  return (A / C) * gamma ** (-(T - 25) / 10);
}

/**
 * Ước lượng γ từ dữ liệu: ln(t·C) = ln A − ((T−25)/10)·ln γ ⇒ hồi quy ln(t·C) theo (T−25)/10,
 * hệ số góc = −ln γ. Cần ít nhất 2 nhiệt độ khác nhau.
 */
export function estimateVantHoff(points: Array<{ C: number; T: number; t: number }>): number {
  const distinctT = new Set(points.map((x) => x.T)).size;
  if (distinctT < 2) return Number.NaN;
  const reg = linearRegression(
    points.map((x) => (x.T - 25) / 10),
    points.map((x) => Math.log(x.t * x.C))
  );
  return Math.exp(-reg.slope);
}

export const thiosulfateSolver: LabSolver = {
  id: 'thiosulfate-rate',
  description: "t = A/C·γ^(−ΔT/10); ước lượng γ bằng hồi quy ln(t·C) theo ΔT/10 (quy tắc Van't Hoff).",
  measure(ctx) {
    const t = thiosulfateTime(h(ctx, 'A', 4), p(ctx, 'C', 0.1), p(ctx, 'T', 25), h(ctx, 'gamma', 2.5));
    const tm = Math.max(1, t * (1 + 0.02 * gaussian(ctx.rng)));
    return {
      values: { t: roundTo(tm, 1), v: roundTo(1 / tm, 4) },
      visual: { turbidity: 1, animMs: Math.min(6000, Math.round(tm * 60)), crossVisible: false, liquidColor: '#fef3c7', liquidLevel: 0.55, temperature: p(ctx, 'T', 25), readout: `${tm.toFixed(1)} s`, bubbles: 0.2 }
    };
  },
  preview(ctx) {
    return { turbidity: 0, animMs: 0, crossVisible: true, liquidColor: '#e0f2fe', liquidLevel: 0.55, temperature: p(ctx, 'T', 25), readout: '0.0 s', bubbles: 0 };
  },
  trueResult(ctx) {
    return h(ctx, 'gamma', 2.5);
  },
  estimateFromTrials(trials) {
    return estimateVantHoff(trials.map((tr) => ({ C: tr.params.C, T: tr.params.T, t: tr.values.t })));
  },
  incidents(ctx) {
    return p(ctx, 'T', 25) > 50 ? ['so2-fumes'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 2) Phân hủy hydrogen peroxide có xúc tác                             */
/* ------------------------------------------------------------------ */
/** Hằng số tốc độ k (1/s) theo loại xúc tác: 0 = không, 1 = MnO₂, 2 = khoai tây (catalase) */
export function h2o2RateConstant(catalyst: number): number {
  if (catalyst >= 1.5) return 0.025;
  if (catalyst >= 0.5) return 0.06;
  return 0.0004;
}
/** Thể tích O₂ tối đa (mL): Vmax = ½·n(H₂O₂)·24,79 L/mol·1000 */
export function h2o2MaxO2Ml(C: number, Vml: number): number {
  return 0.5 * C * (Vml / 1000) * MOLAR_VOLUME_L * 1000;
}
/** Thể tích O₂ thu được sau t giây */
export function h2o2VolumeAt(C: number, Vml: number, catalyst: number, t: number): number {
  return h2o2MaxO2Ml(C, Vml) * (1 - Math.exp(-h2o2RateConstant(catalyst) * t));
}
/** Từ thể tích O₂ thu được khi phản ứng hoàn toàn suy ra nồng độ: C = 2·V(O₂)/(24790·V) */
export function h2o2ConcFromO2(VO2Ml: number, Vml: number): number {
  return (2 * (VO2Ml / 1000 / MOLAR_VOLUME_L)) / (Vml / 1000);
}

const CATALYST_NAMES = ['không xúc tác', 'MnO₂', 'khoai tây (catalase)'];

export const h2o2Solver: LabSolver = {
  id: 'h2o2-catalyst',
  description: 'V(O₂) = Vmax(1 − e^(−kt)); Vmax = ½·C·V·24,79 ⇒ C = 2V(O₂)/(24,79·V) khi phản ứng hoàn toàn.',
  measure(ctx) {
    const C = h(ctx, 'C', 0.7);
    const V = p(ctx, 'V', 10);
    const cat = p(ctx, 'catalyst', 1);
    const t = p(ctx, 'time', 120);
    const vol = Math.max(0, h2o2VolumeAt(C, V, cat, t) + 0.25 * gaussian(ctx.rng));
    return {
      values: { VO2: roundTo(vol, 1) },
      visual: { bubbles: Math.min(1, h2o2RateConstant(cat) * 15), gasVolume: vol, animMs: 2500, liquidColor: '#f0f9ff', liquidLevel: 0.25 + V / 200, readout: `${vol.toFixed(1)} mL O₂`, catalyst: CATALYST_NAMES[Math.round(cat)] ?? '' }
    };
  },
  preview(ctx) {
    return { bubbles: 0, gasVolume: 0, animMs: 0, liquidColor: '#f0f9ff', liquidLevel: 0.25 + p(ctx, 'V', 10) / 200, readout: '0.0 mL O₂', catalyst: CATALYST_NAMES[Math.round(p(ctx, 'catalyst', 1))] ?? '' };
  },
  trueResult(ctx) {
    return h(ctx, 'C', 0.7);
  },
  estimateFromTrials(trials) {
    if (!trials.length) return Number.NaN;
    return Math.max(...trials.map((tr) => h2o2ConcFromO2(tr.values.VO2, tr.params.V)));
  },
  incidents(ctx) {
    return p(ctx, 'catalyst', 1) >= 0.5 && p(ctx, 'catalyst', 1) < 1.5 && p(ctx, 'V', 10) > 25 ? ['foam-overflow'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 3) Chuẩn độ Fe²⁺ bằng potassium permanganate                         */
/* ------------------------------------------------------------------ */
/** Thể tích KMnO₄ tại điểm tương đương: V = C(Fe)·V(Fe) / (5·C(KMnO₄)) */
export function titrationEquivalenceMl(cFe: number, vFeMl: number, cMn: number): number {
  return (cFe * vFeMl) / (5 * cMn);
}
/** Nồng độ Fe²⁺ từ thể tích KMnO₄ đã dùng */
export function ironConcentration(vMnMl: number, cMn: number, vFeMl: number): number {
  return (5 * cMn * vMnMl) / vFeMl;
}
/** Màu dung dịch trong bình nón theo lượng KMnO₄ đã thêm so với điểm tương đương */
export function titrationColor(added: number, eq: number, acidMl: number): string {
  if (acidMl < 2 && added > 0.5) return '#92400e';
  if (added < eq - 0.02) return mixColor('#fefce8', '#fde68a', Math.min(1, added / Math.max(eq, 0.01)) * 0.4);
  const excess = added - eq;
  return mixColor('#fbcfe8', '#a21caf', Math.min(1, excess / 1.5));
}

export const titrationSolver: LabSolver = {
  id: 'kmno4-titration',
  description: '5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O; C(Fe²⁺) = 5·C(KMnO₄)·V(KMnO₄)/V(Fe²⁺).',
  measure(ctx) {
    const cMn = Number(ctx.plugin.sceneOptions.cKMnO4 ?? 0.02);
    const vFe = Number(ctx.plugin.sceneOptions.vFe ?? 10);
    const eq = titrationEquivalenceMl(h(ctx, 'cFe', 0.1), vFe, cMn);
    const added = p(ctx, 'added', 0);
    // Đọc vạch burette: ĐCNN 0,05 mL, sai số đọc ngẫu nhiên ±0,02 mL
    const reading = quantizeBurette(added + 0.02 * gaussian(ctx.rng));
    const pink = added >= eq - 0.02 ? 1 : 0;
    return {
      values: { Vread: reading, endpoint: pink },
      visual: { addedMl: added, burettePercent: 1 - added / 25, flaskColor: titrationColor(added, eq, p(ctx, 'acid', 5)), readout: `${reading.toFixed(2)} mL`, animMs: 800, drip: true }
    };
  },
  preview(ctx) {
    const cMn = Number(ctx.plugin.sceneOptions.cKMnO4 ?? 0.02);
    const vFe = Number(ctx.plugin.sceneOptions.vFe ?? 10);
    const eq = titrationEquivalenceMl(h(ctx, 'cFe', 0.1), vFe, cMn);
    const added = p(ctx, 'added', 0);
    return { addedMl: added, burettePercent: 1 - added / 25, flaskColor: titrationColor(added, eq, p(ctx, 'acid', 5)), readout: `${added.toFixed(2)} mL`, animMs: 300, drip: false };
  },
  trueResult(ctx) {
    return h(ctx, 'cFe', 0.1);
  },
  estimateFromTrials(trials: TrialRecord[], ctx) {
    const cMn = Number(ctx.plugin.sceneOptions.cKMnO4 ?? 0.02);
    const vFe = Number(ctx.plugin.sceneOptions.vFe ?? 10);
    const ends = trials.filter((t) => t.values.endpoint === 1);
    if (!ends.length) return Number.NaN;
    return ironConcentration(mean(ends.map((t) => t.values.Vread)), cMn, vFe);
  },
  incidents(ctx) {
    const out: string[] = [];
    const cMn = Number(ctx.plugin.sceneOptions.cKMnO4 ?? 0.02);
    const vFe = Number(ctx.plugin.sceneOptions.vFe ?? 10);
    const eq = titrationEquivalenceMl(h(ctx, 'cFe', 0.1), vFe, cMn);
    if (p(ctx, 'acid', 5) < 2 && p(ctx, 'added', 0) > 0.5) out.push('no-acid');
    if (p(ctx, 'added', 0) > eq + 1) out.push('overshoot');
    return out;
  }
};

/** Làm tròn số đọc burette theo ĐCNN 0,05 mL */
export function quantizeBurette(v: number): number {
  return roundTo(Math.max(0, Math.round(v / 0.05) * 0.05), 2);
}

/* ------------------------------------------------------------------ */
/* 4) Enthalpy phản ứng Zn + copper(II) sulfate                         */
/* ------------------------------------------------------------------ */
/**
 * Độ tăng nhiệt độ: ΔT = −ΔH·n·(1 − loss)/(m·c), m = V (g, d ≈ 1 g/mL), n = C·V/1000 (Zn dư).
 * loss: phần nhiệt thất thoát ra môi trường của nhiệt lượng kế đơn giản (ẩn).
 */
export function enthalpyDeltaT(dHkJ: number, C: number, Vml: number, loss: number): number {
  const n = (C * Vml) / 1000;
  return (-dHkJ * 1000 * n * (1 - loss)) / (Vml * SPECIFIC_HEAT);
}
/** ΔrH (kJ/mol) = −m·c·ΔT / n / 1000 */
export function enthalpyFromDeltaT(dT: number, C: number, Vml: number): number {
  const n = (C * Vml) / 1000;
  return -(Vml * SPECIFIC_HEAT * dT) / n / 1000;
}

export const enthalpySolver: LabSolver = {
  id: 'enthalpy-zn-cuso4',
  description: 'Q = m·c·ΔT; ΔrH = −Q/n (kJ/mol). Có thất thoát nhiệt ẩn ⇒ sai số hệ thống.',
  measure(ctx) {
    const dT = enthalpyDeltaT(h(ctx, 'dH', -217), p(ctx, 'C', 0.5), p(ctx, 'V', 50), h(ctx, 'loss', 0.08));
    const T0 = roundTo(25 + 0.3 * gaussian(ctx.rng), 1);
    const Tmax = roundTo(T0 + dT + 0.1 * gaussian(ctx.rng), 1);
    return {
      values: { T0, Tmax, dT: roundTo(Tmax - T0, 1) },
      visual: { temperature: Tmax, liquidColor: '#cbd5e1', liquidLevel: 0.3 + p(ctx, 'V', 50) / 250, animMs: 3000, readout: `${Tmax.toFixed(1)} °C`, bubbles: 0.05, solid: 'zn' }
    };
  },
  preview(ctx) {
    const blue = mixColor('#e0f2fe', '#1d4ed8', Math.min(1, p(ctx, 'C', 0.5)));
    return { temperature: 25, liquidColor: blue, liquidLevel: 0.3 + p(ctx, 'V', 50) / 250, animMs: 0, readout: '25.0 °C', bubbles: 0, solid: 'none' };
  },
  trueResult(ctx) {
    return h(ctx, 'dH', -217);
  },
  estimateFromTrials(trials) {
    if (!trials.length) return Number.NaN;
    return mean(trials.map((tr) => enthalpyFromDeltaT(tr.values.dT, tr.params.C, tr.params.V)));
  },
  incidents(ctx) {
    return p(ctx, 'C', 0.5) > 0.9 ? ['hot-splash'] : [];
  }
};

export const chemistrySolvers: LabSolver[] = [thiosulfateSolver, h2o2Solver, titrationSolver, enthalpySolver];
