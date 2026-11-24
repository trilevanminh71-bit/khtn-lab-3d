/**
 * engines/physics/physicsSolver.ts — Công thức Vật lí 10 (tách biệt hoàn toàn khỏi 3D để kiểm thử).
 *
 * 4 bộ giải:
 *  1) photogate-speed : Đo tốc độ tức thời bằng cổng quang điện: v = d / Δt
 *  2) free-fall       : Đo gia tốc rơi tự do: s = ½·g·t² ⇒ g = 2s / t²
 *  3) newton-second   : Định luật II Newton trên đệm khí: a = F / (M + m) ⇒ M = F/a − m, a = 2s/t²
 *  4) battery-emf     : Suất điện động & điện trở trong của pin: U = E − I·r, I = E / (R + R₀ + r + R_A)
 *
 * Quy ước: mọi đại lượng nhập vào dùng đơn vị hiển thị trên thanh trượt (cm, g...) và được đổi sang SI bên trong.
 * Nhiễu đo: Gaussian tương đối (σ ~ 0,5–1%) + lượng tử hóa theo độ chia nhỏ nhất của dụng cụ.
 */
import type { LabSolver, SolveContext, TrialRecord } from '../../types/lab';
import { gaussian, roundTo } from '../../utils/randomizer';
import { linearRegression, mean } from '../statistics';

/** Gia tốc trọng trường dùng để tính vận tốc cuối máng nghiêng (m/s²) */
export const G_STANDARD = 9.8;

/** Lượng tử hóa theo độ chia nhỏ nhất (ĐCNN) của đồng hồ đo thời gian hiện số: 0,001 s */
export function quantize(x: number, step: number): number {
  return Math.round(x / step) * step;
}

const p = (ctx: SolveContext, key: string, fallback = 0): number => ctx.params[key] ?? fallback;
const h = (ctx: SolveContext, key: string, fallback = 0): number => ctx.hidden[key] ?? fallback;

/* ------------------------------------------------------------------ */
/* 1) Đo tốc độ bằng cổng quang điện                                    */
/* ------------------------------------------------------------------ */
/**
 * Viên bi thép lăn từ độ cao h (cm) trên máng nghiêng; khi lăn không trượt, một phần năng lượng chuyển
 * thành động năng quay nên v = √(2·g·h·k) với k (hệ số chuyển hóa, ẩn) ≈ 5/7 ≈ 0,71.
 * Cổng quang điện đo thời gian chắn sáng Δt = d / v (d: đường kính bi, cm).
 */
export function photogateTrueSpeed(hCm: number, k: number): number {
  return Math.sqrt(2 * G_STANDARD * (hCm / 100) * k);
}

export const photogateSolver: LabSolver = {
  id: 'photogate-speed',
  description: 'v = d / Δt; vận tốc thực v = √(2·g·h·k) với k ẩn theo học sinh.',
  measure(ctx) {
    const d = p(ctx, 'd', 2) / 100;
    const v = photogateTrueSpeed(p(ctx, 'h', 15), h(ctx, 'k', 0.71));
    // Đồng hồ hiện số chế độ A hiển thị tới 0,0001 s cho thời gian chắn sáng ngắn
    const dt = quantize((d / v) * (1 + 0.012 * gaussian(ctx.rng)), 0.0001);
    return {
      values: { dt: roundTo(dt, 4) },
      visual: { progress: 1, animMs: 1400, gateFlash: true, readout: `${dt.toFixed(4)} s`, orientation: 'incline' }
    };
  },
  preview(ctx) {
    return { progress: 0, animMs: 0, gateFlash: false, readout: '0.0000 s', orientation: 'incline', height: p(ctx, 'h', 15) };
  },
  trueResult(ctx) {
    return photogateTrueSpeed(p(ctx, 'h', 15), h(ctx, 'k', 0.71));
  },
  estimateFromTrials(trials) {
    // Chỉ dùng các lần đo ở cùng độ cao với lần đo cuối (đại lượng kết quả: v tại độ cao đó)
    if (!trials.length) return Number.NaN;
    const last = trials[trials.length - 1];
    const same = trials.filter((t) => t.params.h === last.params.h && t.params.d === last.params.d);
    return last.params.d / 100 / mean(same.map((t) => t.values.dt));
  },
  incidents(ctx) {
    return p(ctx, 'h', 15) > 35 ? ['ball-jump'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 2) Đo gia tốc rơi tự do                                              */
/* ------------------------------------------------------------------ */
/** Thời gian rơi quãng đường s (m) với gia tốc g: t = √(2s/g) */
export function freeFallTime(sM: number, g: number): number {
  return Math.sqrt((2 * sM) / g);
}
/** Gia tốc từ quãng đường và thời gian: g = 2s/t² */
export function gFromFall(sM: number, t: number): number {
  return (2 * sM) / (t * t);
}

export const freeFallSolver: LabSolver = {
  id: 'free-fall',
  description: 'g = 2s / t²; g ẩn trong khoảng 9,76–9,83 m/s².',
  measure(ctx) {
    const s = p(ctx, 's', 50) / 100;
    const t = quantize(freeFallTime(s, h(ctx, 'g', 9.79)) + 0.0015 * gaussian(ctx.rng), 0.001);
    return {
      values: { t: roundTo(t, 3) },
      visual: { progress: 1, animMs: Math.round(t * 1000 * 3), gateFlash: true, readout: `${t.toFixed(3)} s`, orientation: 'vertical' }
    };
  },
  preview(ctx) {
    return { progress: 0, animMs: 0, gateFlash: false, readout: '0.000 s', orientation: 'vertical', gatePos: p(ctx, 's', 50) / 100 };
  },
  trueResult(ctx) {
    return h(ctx, 'g', 9.79);
  },
  estimateFromTrials(trials) {
    if (!trials.length) return Number.NaN;
    return mean(trials.map((tr) => gFromFall(tr.params.s / 100, tr.values.t)));
  },
  incidents(ctx) {
    return p(ctx, 's', 50) < 15 ? ['gate-too-close'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 3) Định luật II Newton trên đệm khí                                  */
/* ------------------------------------------------------------------ */
/** Gia tốc xe: a = F / (M + m) (bỏ qua ma sát nhờ đệm khí) */
export function newtonAcceleration(F: number, M: number, mAdd: number): number {
  return F / (M + mAdd);
}

export const newtonSolver: LabSolver = {
  id: 'newton-second',
  description: 'a = F/(M+m); đo t trên quãng s ⇒ a = 2s/t² ⇒ M = F/a − m (M ẩn).',
  measure(ctx) {
    const F = p(ctx, 'F', 0.5);
    const mAdd = p(ctx, 'm', 0) / 1000;
    const s = p(ctx, 's', 50) / 100;
    const a = newtonAcceleration(F, h(ctx, 'M', 0.5), mAdd);
    const t = quantize(Math.sqrt((2 * s) / a) * (1 + 0.006 * gaussian(ctx.rng)), 0.001);
    return {
      values: { t: roundTo(t, 3) },
      visual: { progress: 1, animMs: Math.round(Math.min(4000, t * 1000)), gateFlash: true, readout: `${t.toFixed(3)} s`, orientation: 'horizontal', massCount: Math.round(p(ctx, 'm', 0) / 50) }
    };
  },
  preview(ctx) {
    return { progress: 0, animMs: 0, gateFlash: false, readout: '0.000 s', orientation: 'horizontal', massCount: Math.round(p(ctx, 'm', 0) / 50), forceLabel: `F = ${p(ctx, 'F', 0.5).toFixed(2)} N` };
  },
  trueResult(ctx) {
    return h(ctx, 'M', 0.5);
  },
  estimateFromTrials(trials) {
    if (!trials.length) return Number.NaN;
    return mean(
      trials.map((tr) => {
        const a = (2 * (tr.params.s / 100)) / tr.values.t ** 2;
        return tr.params.F / a - tr.params.m / 1000;
      })
    );
  },
  incidents(ctx) {
    const a = newtonAcceleration(p(ctx, 'F', 0.5), h(ctx, 'M', 0.5), p(ctx, 'm', 0) / 1000);
    return a > 5 ? ['cart-crash'] : [];
  }
};

/* ------------------------------------------------------------------ */
/* 4) Suất điện động và điện trở trong của pin                          */
/* ------------------------------------------------------------------ */
/** Điện trở ampe kế (Ω) — đưa vào mạch để mô phỏng thực tế */
export const AMMETER_R = 0.2;

/** Cường độ dòng điện mạch kín (định luật Ohm toàn mạch): I = E / (R + R₀ + r + R_A) */
export function circuitCurrent(E: number, r: number, R: number, R0: number): number {
  return E / (R + R0 + r + AMMETER_R);
}
/** Hiệu điện thế hai cực pin: U = E − I·r */
export function terminalVoltage(E: number, r: number, I: number): number {
  return E - I * r;
}
/** Từ dãy (I, U) suy ra E (tung độ gốc) và r (= −hệ số góc) bằng hồi quy tuyến tính */
export function fitEmf(points: Array<{ I: number; U: number }>): { E: number; r: number; r2: number } {
  const reg = linearRegression(
    points.map((x) => x.I),
    points.map((x) => x.U)
  );
  return { E: reg.intercept, r: -reg.slope, r2: reg.r2 };
}

export const batterySolver: LabSolver = {
  id: 'battery-emf',
  description: 'U = E − I·r; hồi quy U(I) ⇒ E (giao trục U) và r (−độ dốc).',
  measure(ctx) {
    const E = h(ctx, 'E', 1.5);
    const r = h(ctx, 'r', 1);
    const I = circuitCurrent(E, r, p(ctx, 'R', 10), p(ctx, 'R0', 1));
    const U = terminalVoltage(E, r, I);
    const Im = quantize(I * (1 + 0.004 * gaussian(ctx.rng)), 0.001);
    const Um = quantize(U * (1 + 0.003 * gaussian(ctx.rng)), 0.001);
    return {
      values: { I: roundTo(Im, 3), U: roundTo(Um, 3) },
      visual: { switchOn: true, current: Im, voltage: Um, rheostat: p(ctx, 'R', 10) / 20, readoutA: `${Im.toFixed(3)} A`, readoutV: `${Um.toFixed(3)} V`, danger: false }
    };
  },
  preview(ctx) {
    return { switchOn: false, current: 0, voltage: h(ctx, 'E', 1.5), rheostat: p(ctx, 'R', 10) / 20, readoutA: '0.000 A', readoutV: '---', danger: false };
  },
  trueResult(ctx) {
    return h(ctx, 'r', 1);
  },
  estimateFromTrials(trials: TrialRecord[]) {
    const pts = trials.map((t) => ({ I: t.values.I, U: t.values.U }));
    const distinct = new Set(pts.map((x) => x.I.toFixed(3))).size;
    if (distinct < 2) return Number.NaN;
    return fitEmf(pts).r;
  },
  incidents(ctx) {
    return p(ctx, 'R', 10) + p(ctx, 'R0', 1) < 0.5 ? ['short-circuit'] : [];
  }
};

export const physicsSolvers: LabSolver[] = [photogateSolver, freeFallSolver, newtonSolver, batterySolver];
