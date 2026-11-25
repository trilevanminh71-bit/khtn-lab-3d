/**
 * engines/physics/practicalSolver.ts — 4 bài THỰC HÀNH Vật lí 10 (SGK Kết nối tri thức với cuộc sống).
 *  1) photogate-mc964    (Bài 6) : tốc độ trung bình v = s/t (MODE A↔B) và tức thời v = d/t (MODE A, MODE B)
 *  2) free-fall-2gates   (Bài 11): gᵢ = 2s/tᵢ², ḡ, Δgᵢ = |gᵢ − ḡ|, kết quả g = ḡ ± Δḡ
 *  3) force-composition  (Bài 22): F = √(F₁² + F₂² + 2F₁F₂cosα); song song cùng chiều F = F₁ + F₂, d₁/d₂ = F₂/F₁
 *  4) momentum-collision (Bài 30): v = L/t, p = mv; va chạm mềm và va chạm đàn hồi
 * Đầu vào: tham số hiển thị (cm, g, độ) → đổi SI bên trong. Đầu ra: số đo có nhiễu + cột tự tính + dòng kết luận.
 */
import type { LabSolver, SolveContext, SummaryLine, TrialRecord } from '../../types/lab';
import { gaussian, roundTo } from '../../utils/randomizer';
import { absError, mean } from '../statistics';
import { G_STANDARD, quantize } from './physicsSolver';

const p = (ctx: SolveContext, k: string, d = 0): number => ctx.params[k] ?? d;
const h = (ctx: SolveContext, k: string, d = 0): number => ctx.hidden[k] ?? d;
const vi = (x: number, n = 3): string => (Number.isFinite(x) ? x.toLocaleString('vi-VN', { maximumFractionDigits: n }) : '—');

/** Các lần đo cùng bộ thông số với lần đo cuối */
export function sameConfig(trials: TrialRecord[]): TrialRecord[] {
  if (!trials.length) return [];
  const last = JSON.stringify(trials[trials.length - 1].params);
  return trials.filter((t) => JSON.stringify(t.params) === last);
}

/* ===================== 1) BÀI 6 — MÁNG NGHIÊNG, ĐỒNG HỒ MC964 ===================== */
/** Gia tốc bi lăn trên máng nghiêng: a = k·g·sinθ (k lí tưởng = 5/7) */
export function inclineAcceleration(angleDeg: number, k: number): number {
  return k * G_STANDARD * Math.sin((angleDeg * Math.PI) / 180);
}
/** Thời điểm bi (thả từ nghỉ tại x = 0) đi qua vị trí x (m) */
export function timeAt(xM: number, a: number): number {
  return Math.sqrt((2 * Math.max(0, xM)) / a);
}
/** Độ chia nhỏ nhất của thang đo MC964 */
export const mcScale = (scale: number): number => (Math.round(scale) === 1 ? 0.01 : 0.001);
/** ĐCNN của thước trên máng (cm) */
export const RULER_STEP_CM = 0.1;

function mcIdealTime(ctx: SolveContext): number {
  const a = inclineAcceleration(p(ctx, 'angle', 6), h(ctx, 'k', 5 / 7));
  const xE = p(ctx, 'xE', 20) / 100;
  const xF = p(ctx, 'xF', 70) / 100;
  const mode = Math.round(p(ctx, 'mode'));
  if (mode === 0) return timeAt(xF, a) - timeAt(xE, a);
  const x = mode === 1 ? xE : xF;
  const r = p(ctx, 'd', 2) / 200;
  return timeAt(x + r, a) - timeAt(x - r, a);
}

/** Tốc độ suy ra từ một lần đo: MODE A↔B → s/t; MODE A/B → d/t (m/s) */
export function mcSpeed(trial: TrialRecord): number {
  const t = trial.values.t;
  if (!(t > 0)) return Number.NaN;
  return Math.round(trial.params.mode) === 0 ? trial.values.s / 100 / t : trial.params.d / 100 / t;
}

const MODE_NAMES = ['MODE A ↔ B', 'MODE A', 'MODE B'];

export const mc964Solver: LabSolver = {
  id: 'photogate-mc964',
  description: 'Máng nghiêng, hai cổng quang điện E, F, đồng hồ MC964: v̄ = s/t (A↔B); v = d/t (A hoặc B).',
  measure(ctx) {
    const mode = Math.round(p(ctx, 'mode'));
    const step = mcScale(p(ctx, 'scale'));
    const t = Math.max(step, quantize(mcIdealTime(ctx) * (1 + (mode === 0 ? 0.004 : 0.008) * gaussian(ctx.rng)), step));
    const values: Record<string, number> = { t: roundTo(t, 3) };
    if (mode === 0) values.s = roundTo(quantize(p(ctx, 'xF', 70) - p(ctx, 'xE', 20) + 0.05 * gaussian(ctx.rng), RULER_STEP_CM), 1);
    return {
      values,
      visual: { progress: 1, animMs: 1800, xE: p(ctx, 'xE', 20), xF: p(ctx, 'xF', 70), angle: p(ctx, 'angle', 6), readout: t.toFixed(step === 0.01 ? 2 : 3), mode: MODE_NAMES[mode] ?? '', ballD: p(ctx, 'd', 2) }
    };
  },
  preview(ctx) {
    return { progress: 0, animMs: 0, xE: p(ctx, 'xE', 20), xF: p(ctx, 'xF', 70), angle: p(ctx, 'angle', 6), readout: mcScale(p(ctx, 'scale')) === 0.01 ? '0.00' : '0.000', mode: MODE_NAMES[Math.round(p(ctx, 'mode'))] ?? '', ballD: p(ctx, 'd', 2) };
  },
  trueResult(ctx) {
    const a = inclineAcceleration(p(ctx, 'angle', 6), h(ctx, 'k', 5 / 7));
    const mode = Math.round(p(ctx, 'mode'));
    if (mode === 0) return (p(ctx, 'xF', 70) - p(ctx, 'xE', 20)) / 100 / mcIdealTime(ctx);
    return Math.sqrt((2 * a * p(ctx, mode === 1 ? 'xE' : 'xF')) / 100);
  },
  estimateFromTrials(trials) {
    const same = sameConfig(trials);
    if (!same.length) return Number.NaN;
    const t = mean(same.map((x) => x.values.t));
    const dist = Math.round(same[0].params.mode) === 0 ? mean(same.map((x) => x.values.s)) : same[0].params.d;
    return dist / 100 / t;
  },
  incidents(ctx) {
    const gap = p(ctx, 'xF', 70) - p(ctx, 'xE', 20);
    if (gap <= 0) return ['gate-order'];
    return gap < 10 ? ['gate-too-close'] : [];
  },
  derive(trial) {
    return { v: mcSpeed(trial) };
  },
  summarize(trials) {
    const same = sameConfig(trials);
    if (!same.length) return [];
    const mode = Math.round(same[0].params.mode);
    const step = mcScale(same[0].params.scale);
    const ts = same.map((x) => x.values.t);
    const tBar = mean(ts);
    const dt = absError(ts) + step / 2;
    const out: SummaryLine[] = [
      { label: 'Chế độ – số lần đo', value: `${MODE_NAMES[mode]}, n = ${same.length}`, note: same.length < 3 ? 'Cần đo lặp ít nhất 3 lần ở cùng bộ thông số' : undefined, status: same.length < 3 ? 'warn' : 'ok' },
      { label: 't̄ ± Δt', value: `${vi(tBar, 4)} ± ${vi(dt, 4)} s`, note: `Δt = sai số ngẫu nhiên trung bình + nửa ĐCNN (${vi(step / 2, 4)} s)` }
    ];
    if (mode === 0) {
      const sBar = mean(same.map((x) => x.values.s));
      const ds = RULER_STEP_CM / 2;
      const v = sBar / 100 / tBar;
      const dv = v * (ds / sBar + dt / tBar);
      out.push({ label: 's̄ ± Δs', value: `${vi(sBar, 2)} ± ${vi(ds, 2)} cm`, note: 'Δs = nửa độ chia nhỏ nhất của thước (ĐCNN 1 mm)' });
      out.push({ label: 'Tốc độ trung bình v̄ = s̄/t̄', value: `${vi(v)} ± ${vi(dv)} m/s`, note: `Sai số tỉ đối δv = δs + δt = ${vi((dv / v) * 100, 1)}%`, status: 'ok' });
    } else {
      const d = same[0].params.d;
      const v = d / 100 / tBar;
      const dv = v * (0.005 / d + dt / tBar);
      out.push({ label: 'Tốc độ tức thời v = d/t̄', value: `${vi(v)} ± ${vi(dv)} m/s`, note: `d = ${vi(d, 2)} cm; δv = ${vi((dv / v) * 100, 1)}%${step === 0.01 ? ' — thang 0,01 s quá thô cho thời gian chắn cổng, hãy chuyển sang 0,001 s' : ''}`, status: step === 0.01 ? 'warn' : 'ok' });
    }
    return out;
  },
  insight(ctx) {
    const mode = Math.round(p(ctx, 'mode'));
    const body =
      mode === 0
        ? ['MODE A ↔ B: đồng hồ chạy khi bi bắt đầu chắn cổng E và dừng khi bi chắn cổng F.', 'Đo quãng đường s giữa hai cổng trên thước → tốc độ TRUNG BÌNH v̄ = s/t.']
        : [`${MODE_NAMES[mode]}: đồng hồ đo thời gian bi chắn sáng cổng ${mode === 1 ? 'E' : 'F'}.`, 'Trong thời gian rất ngắn đó bi đi được quãng đường bằng đường kính d → tốc độ TỨC THỜI v = d/t.'];
    return [{ title: MODE_NAMES[mode], lines: body, tone: 'info' }];
  }
};

/* ===================== 2) BÀI 11 — RƠI TỰ DO QUA HAI CỔNG ===================== */
/** Thời gian đi quãng s (m) giữa hai cổng khi cổng E nằm dưới điểm thả x0 (m) */
export function fallTimeBetweenGates(sM: number, g: number, x0M: number): number {
  return Math.sqrt((2 * (x0M + sM)) / g) - Math.sqrt((2 * x0M) / g);
}
const gOf = (t: TrialRecord): number => (t.values.t > 0 ? (2 * (t.params.s / 100)) / t.values.t ** 2 : Number.NaN);

export const freeFall2Solver: LabSolver = {
  id: 'free-fall-2gates',
  description: 'gᵢ = 2s/tᵢ²; kết quả g = ḡ ± Δḡ. Công thức đúng khi cổng E sát điểm thả (v₀ ≈ 0).',
  measure(ctx) {
    const s = p(ctx, 's', 50) / 100;
    const t = quantize(fallTimeBetweenGates(s, h(ctx, 'g', 9.79), p(ctx, 'x0') / 1000) + 0.0008 * gaussian(ctx.rng), 0.001);
    return { values: { t: roundTo(t, 3) }, visual: { progress: 1, animMs: Math.round(t * 3000), readout: t.toFixed(3), s: p(ctx, 's', 50), x0: p(ctx, 'x0') } };
  },
  preview(ctx) {
    return { progress: 0, animMs: 0, readout: '0.000', s: p(ctx, 's', 50), x0: p(ctx, 'x0') };
  },
  trueResult(ctx) {
    return h(ctx, 'g', 9.79);
  },
  estimateFromTrials(trials) {
    return trials.length ? mean(trials.map(gOf)) : Number.NaN;
  },
  incidents(ctx) {
    return p(ctx, 's', 50) < 15 ? ['gate-too-close'] : [];
  },
  derive(trial, all) {
    const g = gOf(trial);
    return { gi: g, dg: Math.abs(g - mean(all.map(gOf))) };
  },
  summarize(trials) {
    if (!trials.length) return [];
    const gs = trials.map(gOf);
    const gBar = mean(gs);
    const dBar = absError(gs);
    const dev = (Math.abs(gBar - 9.8) / 9.8) * 100;
    return [
      { label: 'Số lần đo', value: `${trials.length}/5`, status: trials.length >= 5 ? 'ok' : 'warn', note: trials.length < 5 ? 'Bài yêu cầu 5 lần đo' : undefined },
      { label: 'ḡ', value: `${vi(gBar)} m/s²` },
      { label: 'Sai số tuyệt đối trung bình Δḡ', value: `${vi(dBar)} m/s²`, note: 'Δḡ = (Σ|gᵢ − ḡ|)/n' },
      { label: 'Kết quả', value: `g = ${vi(gBar, 2)} ± ${vi(dBar, 2)} m/s²`, status: 'ok' },
      { label: 'So với 9,8 m/s²', value: `lệch ${vi(dev, 2)}%`, note: `So với giá trị làm tròn 10 m/s²: lệch ${vi((Math.abs(gBar - 10) / 10) * 100, 2)}%`, status: dev <= 5 ? 'ok' : 'warn' },
      { label: 'Nguồn sai số', value: 'Đặt cổng E, đọc thước, ĐCNN đồng hồ, lực cản', note: 'Cổng E thấp hơn đáy trụ thép → v₀ ≠ 0 → t ngắn lại → g tính được LỚN hơn thực; nam châm nhả chậm (từ dư) → sai số hệ thống' }
    ];
  },
  insight(ctx) {
    const x0 = p(ctx, 'x0');
    return x0 > 0
      ? [{ title: 'Cổng E chưa sát điểm thả', tone: 'warn', lines: [`Cổng E thấp hơn đáy trụ thép ${vi(x0, 0)} mm nên khi đồng hồ bắt đầu chạy vật đã có tốc độ v₀ ≈ ${vi(Math.sqrt((2 * 9.8 * x0) / 1000), 2)} m/s.`, 'Công thức g = 2s/t² giả thiết v₀ = 0 → kết quả sẽ lớn hơn giá trị thực.'] }]
      : [{ title: 'Bố trí đúng', tone: 'ok', lines: ['Cổng E sát đáy trụ thép: đồng hồ chạy đúng lúc vật bắt đầu rơi (v₀ ≈ 0), s = ½gt² ⇒ g = 2s/t².'] }];
  }
};

/* ===================== 3) BÀI 22 — TỔNG HỢP LỰC ===================== */
/** Hợp lực hai lực đồng quy (quy tắc hình bình hành) */
export function resultantForce(F1: number, F2: number, alphaDeg: number): number {
  return Math.sqrt(Math.max(0, F1 * F1 + F2 * F2 + 2 * F1 * F2 * Math.cos((alphaDeg * Math.PI) / 180)));
}
/** Hai lực song song cùng chiều đặt tại A, B cách nhau AB: khoảng cách từ điểm đặt hợp lực tới A */
export function parallelD1(F1: number, F2: number, AB: number): number {
  return (AB * F2) / (F1 + F2);
}
const theoreticalForce = (q: Record<string, number>): number => (Math.round(q.mode) === 0 ? resultantForce(q.F1, q.F2, q.alpha) : q.F1 + q.F2);
/** Sai lệch δ (%) giữa lí thuyết và thực nghiệm */
export const deviationPercent = (lt: number, tn: number): number => (lt > 0.05 ? (Math.abs(lt - tn) / lt) * 100 : Number.NaN);

export const forceSolver: LabSolver = {
  id: 'force-composition',
  description: 'F = √(F₁² + F₂² + 2F₁F₂cosα) (đồng quy); F = F₁ + F₂, d₁/d₂ = F₂/F₁ (song song cùng chiều).',
  measure(ctx) {
    const lt = theoreticalForce(ctx.params);
    const tn = Math.max(0, quantize(lt * (1 + h(ctx, 'bias') / 100) * (1 + 0.008 * gaussian(ctx.rng)), 0.05));
    const values: Record<string, number> = { Ftn: roundTo(tn, 2) };
    if (Math.round(p(ctx, 'mode')) === 1) {
      const d1 = quantize(parallelD1(p(ctx, 'F1'), p(ctx, 'F2'), p(ctx, 'AB')) + 0.12 * gaussian(ctx.rng), 0.1);
      values.d1 = roundTo(d1, 1);
      values.d2 = roundTo(p(ctx, 'AB') - d1, 1);
    }
    return { values, visual: { ...forceVisual(ctx), measured: true, Ftn: tn, animMs: 900, readout: `${vi(tn, 2)} N` } };
  },
  preview(ctx) {
    return { ...forceVisual(ctx), measured: false, Ftn: 0, animMs: 0, readout: '— N' };
  },
  trueResult(ctx) {
    return theoreticalForce(ctx.params);
  },
  estimateFromTrials(trials) {
    const same = sameConfig(trials);
    return same.length ? mean(same.map((t) => t.values.Ftn)) : Number.NaN;
  },
  incidents(ctx) {
    return theoreticalForce(ctx.params) > 9 ? ['over-scale'] : [];
  },
  derive(trial) {
    const lt = theoreticalForce(trial.params);
    return {
      Flt: lt,
      delta: deviationPercent(lt, trial.values.Ftn),
      rd: trial.values.d1 / trial.values.d2,
      rf: trial.params.F2 / trial.params.F1
    };
  },
  summarize(trials) {
    if (!trials.length) return [];
    const out: SummaryLine[] = [];
    for (const mode of [0, 1]) {
      const list = trials.filter((t) => Math.round(t.params.mode) === mode);
      if (!list.length) continue;
      const ds = list.map((t) => deviationPercent(theoreticalForce(t.params), t.values.Ftn)).filter(Number.isFinite);
      const d = mean(ds);
      out.push({ label: mode === 0 ? 'Đồng quy: sai lệch trung bình δ̄' : 'Song song: sai lệch trung bình δ̄', value: `${vi(d, 2)}% (n = ${list.length})`, note: d <= 5 ? 'Đạt mốc ≤ 5%: quy tắc được nghiệm đúng trong phạm vi sai số' : 'Vượt mốc 5%: kiểm tra điểm O, phương lực kế, số 0 của lực kế', status: d <= 5 ? 'ok' : 'warn' });
      if (mode === 1) {
        const r = mean(list.map((t) => t.values.d1 / t.values.d2 / (t.params.F2 / t.params.F1)));
        out.push({ label: 'Tỉ số (d₁/d₂) : (F₂/F₁)', value: vi(r, 3), note: 'Càng gần 1 thì quy tắc d₁/d₂ = F₂/F₁ càng được nghiệm đúng', status: Math.abs(r - 1) <= 0.05 ? 'ok' : 'warn' });
      }
    }
    return out;
  },
  insight(ctx) {
    if (Math.round(p(ctx, 'mode')) === 0) {
      const a = p(ctx, 'alpha');
      const lines = ['Hợp lực là đường chéo hình bình hành dựng từ F₁ và F₂ tại điểm đồng quy O.', 'Bỏ hai lực, kéo một lực kế duy nhất về ĐÚNG điểm O → số chỉ là F thực nghiệm.'];
      if (a === 0) lines.push('α = 0°: F = F₁ + F₂ (lớn nhất).');
      if (a === 90) lines.push('α = 90°: F = √(F₁² + F₂²).');
      if (a === 180) lines.push('α = 180°: F = |F₁ − F₂| (nhỏ nhất).');
      return [{ title: 'Hai lực đồng quy', lines, tone: 'info' }];
    }
    return [{ title: 'Hai lực song song cùng chiều', tone: 'info', lines: ['F = F₁ + F₂, cùng chiều hai lực thành phần.', 'Điểm đặt O chia đoạn AB theo tỉ lệ nghịch: d₁/d₂ = F₂/F₁ (gần lực lớn hơn).'] }];
  }
};

function forceVisual(ctx: SolveContext): Record<string, number | boolean> {
  return { mode: Math.round(p(ctx, 'mode')), F1: p(ctx, 'F1'), F2: p(ctx, 'F2'), alpha: p(ctx, 'alpha'), AB: p(ctx, 'AB'), Flt: theoreticalForce(ctx.params), d1: parallelD1(p(ctx, 'F1'), p(ctx, 'F2'), p(ctx, 'AB')) };
}

/* ===================== 4) BÀI 30 — ĐỘNG LƯỢNG, VA CHẠM ===================== */
/** Chiều dài tấm cản quang (m) */
export const FLAG_LENGTH = 0.1;
/** Tốc độ sau va chạm. type 0: mềm (dính nhau); 1: đàn hồi */
export function collide(type: number, m1: number, m2: number, v1: number, v2: number): [number, number] {
  if (Math.round(type) === 0) {
    const v = (m1 * v1 + m2 * v2) / (m1 + m2);
    return [v, v];
  }
  return [((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2), ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)];
}
/** Thời gian chắn cổng (ms chia 0,001 s); tốc độ < 1 cm/s coi như đứng yên → 0 */
function flagTime(v: number, noise: number): number {
  return Math.abs(v) < 0.01 ? 0 : roundTo(quantize((FLAG_LENGTH / Math.abs(v)) * (1 + noise), 0.001), 3);
}
const speedOf = (t: number): number => (t > 0 ? FLAG_LENGTH / t : 0);

/** Động lượng trước / sau (kg·m/s) suy ra từ số đo; chiều dương là chiều chuyển động ban đầu */
export function momentumOf(trial: TrialRecord): { before: number; after: number } {
  const q = trial.params;
  const x = trial.values;
  const m1 = q.m1 / 1000;
  const m2 = q.m2 / 1000;
  const before = m1 * speedOf(x.t1) + m2 * speedOf(x.t2);
  const after = Math.round(q.type) === 0 ? (m1 + m2) * speedOf(x.tp) : m1 * speedOf(x.t1p) * x.dir1 + m2 * speedOf(x.t2p);
  return { before, after };
}

export const momentumSolver: LabSolver = {
  id: 'momentum-collision',
  description: 'Đệm khí, tấm cản quang L = 0,1 m: v = L/t, p = mv; so sánh động lượng trước và sau va chạm.',
  measure(ctx) {
    const [m1, m2] = [p(ctx, 'm1') / 1000, p(ctx, 'm2') / 1000];
    const [v1, v2] = [p(ctx, 'v1') / 100, p(ctx, 'v2') / 100];
    const type = Math.round(p(ctx, 'type'));
    const keep = 1 - h(ctx, 'loss', 0.01);
    const [u1, u2] = collide(type, m1, m2, v1, v2).map((v) => v * keep);
    const n = (): number => 0.003 * gaussian(ctx.rng);
    const values: Record<string, number> = { t1: flagTime(v1, n()), t2: flagTime(v2, n()) };
    if (type === 0) values.tp = flagTime(u1, n());
    else {
      values.t1p = flagTime(u1, n());
      values.dir1 = values.t1p === 0 ? 0 : u1 > 0 ? 1 : -1;
      values.t2p = flagTime(u2, n());
    }
    return { values, visual: { ...collisionVisual(ctx), progress: 1, animMs: 3200, u1, u2, readout: `${values.t1.toFixed(3)}` } };
  },
  preview(ctx) {
    return { ...collisionVisual(ctx), progress: 0, animMs: 0, u1: 0, u2: 0, readout: '0.000' };
  },
  trueResult(ctx) {
    return (p(ctx, 'm1') * p(ctx, 'v1') + p(ctx, 'm2') * p(ctx, 'v2')) / 1e5;
  },
  estimateFromTrials(trials) {
    const same = sameConfig(trials);
    return same.length ? mean(same.map((t) => momentumOf(t).before)) : Number.NaN;
  },
  incidents(ctx) {
    return p(ctx, 'v2') >= p(ctx, 'v1') ? ['no-collision'] : [];
  },
  derive(trial) {
    const { before, after } = momentumOf(trial);
    const x = trial.values;
    return {
      v1: speedOf(x.t1),
      v2: speedOf(x.t2),
      va: speedOf(x.tp),
      v1a: speedOf(x.t1p) * x.dir1,
      v2a: speedOf(x.t2p),
      pb: before,
      pa: after,
      delta: before > 0 ? (Math.abs(before - after) / before) * 100 : Number.NaN
    };
  },
  summarize(trials) {
    const out: SummaryLine[] = [];
    for (const type of [0, 1]) {
      const list = trials.filter((t) => Math.round(t.params.type) === type);
      if (!list.length) continue;
      const d = mean(list.map((t) => { const m = momentumOf(t); return (Math.abs(m.before - m.after) / m.before) * 100; }));
      out.push({ label: type === 0 ? 'Va chạm mềm: δ̄' : 'Va chạm đàn hồi: δ̄', value: `${vi(d, 2)}% (n = ${list.length})`, note: d <= 5 ? 'δ ≤ 5%: động lượng của hệ được bảo toàn trong phạm vi sai số' : 'δ > 5%: kiểm tra cân bằng đệm khí, ma sát, vị trí cổng quang điện', status: d <= 5 ? 'ok' : 'warn' });
    }
    return out;
  },
  insight(ctx) {
    return Math.round(p(ctx, 'type')) === 0
      ? [{ title: 'Va chạm mềm', tone: 'info', lines: ['Hai xe dính vào nhau: m₁v₁ + m₂v₂ = (m₁ + m₂)v′.', 'Động lượng bảo toàn, động năng giảm (chuyển thành nhiệt, biến dạng).'] }]
      : [{ title: 'Va chạm đàn hồi', tone: 'info', lines: ['Hai xe nảy ra: m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′.', 'm₁ < m₂: xe 1 bật ngược lại (v₁′ < 0); m₁ = m₂ và xe 2 đứng yên: xe 1 dừng, xe 2 nhận toàn bộ tốc độ.'] }];
  }
};

function collisionVisual(ctx: SolveContext): Record<string, number> {
  return { type: Math.round(p(ctx, 'type')), m1: p(ctx, 'm1'), m2: p(ctx, 'm2'), v1: p(ctx, 'v1') / 100, v2: p(ctx, 'v2') / 100 };
}

export const practicalPhysicsSolvers: LabSolver[] = [mc964Solver, freeFall2Solver, forceSolver, momentumSolver];
