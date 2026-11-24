/**
 * engines/biology/biologySolver.ts — Mô hình Sinh học 10 (SGK Kết nối tri thức).
 *
 *  1) cell-microscope : Quan sát tế bào nhân sơ (vi khuẩn sữa chua) & tế bào nhân thực (biểu bì hành, niêm mạc miệng)
 *        Độ phóng đại K = K_vật kính × K_thị kính; kích thước thật = kích thước ảnh / K.
 *        ⇒ Kết quả: chiều dài thật của tế bào biểu bì hành (µm).
 *  2) plasmolysis     : Co nguyên sinh và phản co nguyên sinh ở tế bào biểu bì hành tím
 *        Tỉ lệ tế bào co nguyên sinh f(C) = 1/(1 + e^(−(C − C_đẳng trương)/0,03)) · (1 − e^(−t/3))
 *        Thế nước Ψs = −C·R·T (R = 0,00831 L·MPa/(mol·K)).  ⇒ Kết quả: nồng độ đẳng trương (mol/L).
 *  3) enzyme-amylase  : Ảnh hưởng của nhiệt độ, pH đến hoạt tính enzyme amylase (thử iodine với tinh bột)
 *        Hoạt tính A(T, pH) dạng chuông; thời gian tinh bột bị thủy phân hết t = t₀ / A.
 *        ⇒ Kết quả: nhiệt độ tối ưu (°C).
 *  4) mitosis-index   : Quan sát tiêu bản nguyên phân rễ hành — chỉ số nguyên phân MI = số TB đang phân chia / tổng × 100%.
 */
import type { LabSolver, SolveContext, TrialRecord } from '../../types/lab';
import { gaussian, mulberry32, roundTo } from '../../utils/randomizer';
import { mean } from '../statistics';

const p = (ctx: SolveContext, key: string, fallback = 0): number => ctx.params[key] ?? fallback;
const h = (ctx: SolveContext, key: string, fallback = 0): number => ctx.hidden[key] ?? fallback;

/* ------------------------------------------------------------------ */
/* 1) Kính hiển vi — tế bào nhân sơ & nhân thực                         */
/* ------------------------------------------------------------------ */
export const OBJECTIVES = [4, 10, 40, 100];
export const SPECIMENS = ['bacteria', 'onion', 'cheek'] as const;
export const SPECIMEN_LABELS = ['Vi khuẩn sữa chua (tế bào nhân sơ)', 'Biểu bì vảy hành (tế bào nhân thực)', 'Niêm mạc miệng (tế bào nhân thực)'];

/** Độ phóng đại tổng = vật kính × thị kính */
export function totalMagnification(objIndex: number, eyepiece: number): number {
  return OBJECTIVES[Math.max(0, Math.min(3, Math.round(objIndex)))] * eyepiece;
}
/** Kích thước thật (µm) từ kích thước ảnh (mm) và độ phóng đại */
export function realSizeUm(imageMm: number, magnification: number): number {
  return (imageMm * 1000) / magnification;
}
/** Độ mờ ảnh (0 = nét, 1 = rất mờ) theo độ lệch núm chỉnh tinh so với tiêu cự đúng */
export function focusBlur(focus: number, bestFocus: number): number {
  return Math.min(1, Math.abs(focus - bestFocus) / 25);
}
/** Kích thước thật (µm) của tế bào theo mẫu: vi khuẩn ~2 µm, biểu bì hành = L ẩn, niêm mạc ~60 µm */
function specimenSize(ctx: SolveContext, sp: number): number {
  if (sp === 0) return h(ctx, 'bacteria', 2);
  if (sp === 1) return h(ctx, 'L', 220);
  return h(ctx, 'cheek', 60);
}

export const microscopeSolver: LabSolver = {
  id: 'cell-microscope',
  description: 'Kích thước thật = ảnh / (K vật kính × K thị kính); độ nét phụ thuộc núm chỉnh tinh.',
  measure(ctx) {
    const sp = Math.round(p(ctx, 'specimen', 1));
    const mag = totalMagnification(p(ctx, 'objective', 1), p(ctx, 'eyepiece', 10));
    const blur = focusBlur(p(ctx, 'focus', 50), h(ctx, 'focusBest', 55));
    const image = (specimenSize(ctx, sp) * mag) / 1000;
    // Ảnh mờ → sai số đo lớn hơn (3% khi nét, tới 15% khi mờ)
    const measured = image * (1 + (0.03 + 0.12 * blur) * gaussian(ctx.rng));
    return {
      values: { image: roundTo(measured, 2), mag },
      visual: { specimen: SPECIMENS[sp] ?? 'onion', magnification: mag, blur, readout: `K = ${mag}×`, animMs: 400, stain: 0.7 }
    };
  },
  preview(ctx) {
    const sp = Math.round(p(ctx, 'specimen', 1));
    const mag = totalMagnification(p(ctx, 'objective', 1), p(ctx, 'eyepiece', 10));
    return { specimen: SPECIMENS[sp] ?? 'onion', magnification: mag, blur: focusBlur(p(ctx, 'focus', 50), h(ctx, 'focusBest', 55)), readout: `K = ${mag}×`, animMs: 0, stain: 0.7 };
  },
  trueResult(ctx) {
    return h(ctx, 'L', 220);
  },
  estimateFromTrials(trials) {
    const onion = trials.filter((t) => Math.round(t.params.specimen) === 1);
    if (!onion.length) return Number.NaN;
    return mean(onion.map((t) => realSizeUm(t.values.image, t.values.mag)));
  },
  incidents(ctx) {
    const out: string[] = [];
    if (Math.round(p(ctx, 'objective', 1)) === 3 && p(ctx, 'oil', 0) < 0.5) out.push('need-oil');
    return out;
  }
};

/* ------------------------------------------------------------------ */
/* 2) Co nguyên sinh — phản co nguyên sinh                              */
/* ------------------------------------------------------------------ */
/** Hằng số khí dùng cho thế nước: R = 0,00831 L·MPa/(mol·K) */
export const R_WATER = 0.00831;

/** Thế thẩm thấu Ψs (MPa) của dung dịch đường saccharose nồng độ C (mol/L) ở T (°C) */
export function osmoticPotential(C: number, Tc = 25): number {
  return -C * R_WATER * (Tc + 273.15);
}
/** Tỉ lệ tế bào co nguyên sinh sau t phút trong dung dịch C (mol/L), C_iso là nồng độ đẳng trương */
export function plasmolysisFraction(C: number, cIso: number, tMin: number): number {
  const eq = 1 / (1 + Math.exp(-(C - cIso) / 0.03));
  return eq * (1 - Math.exp(-tMin / 3));
}
/** Ước lượng nồng độ đẳng trương từ một điểm (C, f): C_iso = C − 0,03·ln(f/(1−f)) */
export function isoFromPoint(C: number, f: number): number {
  return C - 0.03 * Math.log(f / (1 - f));
}

export const plasmolysisSolver: LabSolver = {
  id: 'plasmolysis',
  description: 'f = 1/(1+e^(−(C−C_iso)/0,03)); tìm C tại đó 50% tế bào co nguyên sinh (co nguyên sinh chớm).',
  measure(ctx) {
    const f = plasmolysisFraction(p(ctx, 'C', 0.3), h(ctx, 'cIso', 0.35), p(ctx, 'time', 10));
    // Đếm 50 tế bào trong vi trường (phân phối nhị thức)
    let count = 0;
    for (let i = 0; i < 50; i++) if (ctx.rng() < f) count++;
    return {
      values: { plasmolyzed: count, total: 50, percent: roundTo((count / 50) * 100, 0) },
      visual: { specimen: 'plasmolysis', protoplast: f, magnification: 100, blur: 0, readout: `${count}/50 tế bào co nguyên sinh`, animMs: 2500, stain: 0.9 }
    };
  },
  preview(ctx) {
    return { specimen: 'plasmolysis', protoplast: 0, magnification: 100, blur: 0, readout: `Dung dịch ${p(ctx, 'C', 0.3).toFixed(2)} M`, animMs: 0, stain: 0.9 };
  },
  trueResult(ctx) {
    return h(ctx, 'cIso', 0.35);
  },
  estimateFromTrials(trials: TrialRecord[]) {
    // Chỉ dùng điểm đã cân bằng (t ≥ 8 phút) và không bão hòa (5% < f < 95%)
    const pts = trials
      .filter((t) => t.params.time >= 8)
      .map((t) => ({ C: t.params.C, f: t.values.plasmolyzed / t.values.total / (1 - Math.exp(-t.params.time / 3)) }))
      .filter((x) => x.f > 0.05 && x.f < 0.95);
    if (pts.length) return mean(pts.map((x) => isoFromPoint(x.C, x.f)));
    // Không có điểm trung gian → nội suy giữa nồng độ cao nhất chưa co và thấp nhất đã co hoàn toàn
    const eqTrials = trials.filter((t) => t.params.time >= 8);
    const low = eqTrials.filter((t) => t.values.percent < 50).map((t) => t.params.C);
    const high = eqTrials.filter((t) => t.values.percent >= 50).map((t) => t.params.C);
    if (!low.length || !high.length) return Number.NaN;
    return (Math.max(...low) + Math.min(...high)) / 2;
  },
  incidents() {
    return [];
  }
};

/* ------------------------------------------------------------------ */
/* 3) Enzyme amylase                                                    */
/* ------------------------------------------------------------------ */
/**
 * Hoạt tính tương đối A ∈ (0,1]: dạng chuông theo nhiệt độ (bên trên tối ưu giảm nhanh do enzyme
 * bị biến tính) nhân với dạng chuông theo pH.
 */
export function amylaseActivity(T: number, pH: number, tOpt: number, pHOpt: number): number {
  const width = T > tOpt ? 9 : 14;
  return Math.exp(-(((T - tOpt) / width) ** 2)) * Math.exp(-(((pH - pHOpt) / 1.4) ** 2));
}
/** Thời gian (phút) đến khi dung dịch hết phản ứng màu xanh tím với iodine; tối đa 30 phút */
export function starchClearTime(t0: number, activity: number): number {
  return Math.min(30, t0 / Math.max(activity, 1e-6));
}

/**
 * Ước lượng nhiệt độ tối ưu: hồi quy bậc hai ln(1/t) theo T (cực đại = −b/2a); nếu không đủ dữ liệu
 * hoặc đường cong không lồi, lấy nhiệt độ có thời gian ngắn nhất.
 */
export function estimateOptimum(points: Array<{ T: number; t: number }>): number {
  const valid = points.filter((x) => x.t < 30);
  if (!valid.length) return Number.NaN;
  // Gộp các lần đo cùng nhiệt độ (lấy trung bình thời gian) rồi sắp xếp theo T
  const byT = new Map<number, number[]>();
  for (const p of valid) byT.set(p.T, [...(byT.get(p.T) ?? []), p.t]);
  const pts = [...byT.entries()].map(([T, ts]) => ({ T, y: Math.log(1 / mean(ts)) })).sort((a, b) => a.T - b.T);
  let bi = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].y > pts[bi].y) bi = i;
  if (bi === 0 || bi === pts.length - 1) return pts[bi].T;
  // Parabol qua 3 điểm quanh đỉnh: đỉnh x = x₂ − ½·[(x₂−x₁)²(y₂−y₃) − (x₂−x₃)²(y₂−y₁)] / [(x₂−x₁)(y₂−y₃) − (x₂−x₃)(y₂−y₁)]
  const [a, b, c] = [pts[bi - 1], pts[bi], pts[bi + 1]];
  const num = (b.T - a.T) ** 2 * (b.y - c.y) - (b.T - c.T) ** 2 * (b.y - a.y);
  const den = (b.T - a.T) * (b.y - c.y) - (b.T - c.T) * (b.y - a.y);
  if (Math.abs(den) < 1e-12) return b.T;
  const v = b.T - 0.5 * (num / den);
  return Math.min(c.T, Math.max(a.T, v));
}

export const amylaseSolver: LabSolver = {
  id: 'enzyme-amylase',
  description: 'A(T,pH) dạng chuông; t = t₀/A; nhiệt độ tối ưu = đỉnh đường cong ln(1/t) theo T.',
  measure(ctx) {
    const A = amylaseActivity(p(ctx, 'T', 37), p(ctx, 'pH', 7), h(ctx, 'tOpt', 37), h(ctx, 'pHOpt', 6.8));
    const t = starchClearTime(h(ctx, 't0', 3), A) * (1 + 0.03 * gaussian(ctx.rng));
    const tm = roundTo(Math.min(30, t), 1);
    return {
      values: { t: tm },
      visual: { variant: 'tubes', progress: 1, animMs: 3000, tubeColor: tm >= 30 ? '#312e81' : '#d6b26e', temperature: p(ctx, 'T', 37), readout: tm >= 30 ? '> 30 phút (vẫn xanh tím)' : `${tm.toFixed(1)} phút`, liquidLevel: 0.5, liquidColor: '#dbeafe', bubbles: 0 }
    };
  },
  preview(ctx) {
    return { variant: 'tubes', progress: 0, animMs: 0, tubeColor: '#312e81', temperature: p(ctx, 'T', 37), readout: `${p(ctx, 'T', 37)} °C — pH ${p(ctx, 'pH', 7)}`, liquidLevel: 0.5, liquidColor: '#dbeafe', bubbles: 0 };
  },
  trueResult(ctx) {
    return h(ctx, 'tOpt', 37);
  },
  estimateFromTrials(trials) {
    return estimateOptimum(trials.map((tr) => ({ T: tr.params.T, t: tr.values.t })));
  },
  incidents(ctx) {
    return p(ctx, 'T', 37) > 80 ? ['hot-water'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 4) Chỉ số nguyên phân                                                */
/* ------------------------------------------------------------------ */
/** Tỉ lệ thời gian các kì trong pha phân chia (đầu, giữa, sau, cuối) của tế bào đỉnh rễ hành */
export const PHASE_SHARES = [0.45, 0.2, 0.12, 0.23];

/** Đếm tế bào trong một vi trường: tái lập được theo (seed, số thứ tự vi trường) */
export function countField(seed: number, field: number, mi: number): { total: number; phases: number[] } {
  const rng = mulberry32((seed ^ (field * 2654435761)) >>> 0);
  const total = 40 + Math.floor(rng() * 21);
  const phases = [0, 0, 0, 0];
  // Số tế bào đang phân chia dao động ±15% quanh tỉ lệ thực của mô (khác nhau giữa các vi trường)
  const dividing = Math.round(total * mi * (0.85 + 0.3 * rng()));
  for (let i = 0; i < dividing; i++) {
    const r = rng();
    let acc = 0;
    for (let k = 0; k < 4; k++) {
      acc += PHASE_SHARES[k];
      if (r < acc || k === 3) {
        phases[k]++;
        break;
      }
    }
  }
  return { total, phases };
}
/** Chỉ số nguyên phân (%) */
export function mitoticIndex(dividing: number, total: number): number {
  return total > 0 ? (dividing / total) * 100 : Number.NaN;
}

export const mitosisSolver: LabSolver = {
  id: 'mitosis-index',
  description: 'MI = Σ(kì đầu + giữa + sau + cuối) / Σ tổng tế bào × 100% trên nhiều vi trường.',
  measure(ctx) {
    const field = Math.round(p(ctx, 'field', 1));
    const { total, phases } = countField(Math.round(h(ctx, 'fieldSeed', 1234)), field, h(ctx, 'mi', 0.12));
    const stain = p(ctx, 'stain', 5);
    return {
      values: { total, prophase: phases[0], metaphase: phases[1], anaphase: phases[2], telophase: phases[3] },
      visual: { specimen: 'root-tip', magnification: 400, blur: 0, fieldSeed: field, stain: Math.min(1, stain / 6), mitoticIndex: h(ctx, 'mi', 0.12), readout: `Vi trường ${field}: ${total} tế bào`, animMs: 300 }
    };
  },
  preview(ctx) {
    const field = Math.round(p(ctx, 'field', 1));
    return { specimen: 'root-tip', magnification: 400, blur: 0, fieldSeed: field, stain: Math.min(1, p(ctx, 'stain', 5) / 6), mitoticIndex: h(ctx, 'mi', 0.12), readout: `Vi trường ${field}`, animMs: 0 };
  },
  trueResult(ctx) {
    return h(ctx, 'mi', 0.12) * 100;
  },
  estimateFromTrials(trials) {
    // Không đếm trùng một vi trường hai lần
    const byField = new Map<number, TrialRecord>();
    for (const t of trials) byField.set(Math.round(t.params.field), t);
    let div = 0;
    let tot = 0;
    for (const t of byField.values()) {
      div += t.values.prophase + t.values.metaphase + t.values.anaphase + t.values.telophase;
      tot += t.values.total;
    }
    return mitoticIndex(div, tot);
  },
  incidents(ctx) {
    return p(ctx, 'stain', 5) > 8 ? ['overstain'] : [];
  }
};

export const biologySolvers: LabSolver[] = [microscopeSolver, plasmolysisSolver, amylaseSolver, mitosisSolver];
