/**
 * engines/solverRegistry.ts — Bảng tra bộ giải theo `solverId` của plugin.
 * Bao gồm 12 bộ giải chuẩn + bộ giải "custom-formula" cho bài tạo bằng No-Code Wizard.
 * Thêm bài mới cần công thức riêng: viết LabSolver mới trong engines/<môn>/ rồi thêm vào ALL_SOLVERS.
 */
import type { LabSolver, SolveContext, TrialComputation, TrialRecord } from '../types/lab';
import { gaussian, roundTo } from '../utils/randomizer';
import { biologySolvers } from './biology/biologySolver';
import { chemistrySolvers } from './chemistry/chemistrySolver';
import { evaluateFormula } from './formulaEvaluator';
import { physicsSolvers } from './physics/physicsSolver';
import { mean } from './statistics';

/** Bảng biến cho biểu thức = tham số chỉnh + thông số ẩn */
function varsOf(ctx: SolveContext): Record<string, number> {
  return { ...ctx.hidden, ...ctx.params };
}

/**
 * Bộ giải No-Code: mỗi lần đo m = measureExpr·(1 + noise·N(0,1)).
 * Kết quả đúng = resultExpr; ước lượng từ dữ liệu = trung bình estimateExpr(m, tham số) qua các lần đo.
 */
export const customFormulaSolver: LabSolver = {
  id: 'custom-formula',
  description: 'Bài tự tạo: đại lượng đo và kết quả tính bằng biểu thức an toàn do giáo viên nhập.',
  measure(ctx): TrialComputation {
    const f = ctx.plugin.formula;
    if (!f) return { values: {}, visual: {} };
    const raw = evaluateFormula(f.measureExpr, varsOf(ctx));
    const m = raw * (1 + f.noise * gaussian(ctx.rng));
    const dec = ctx.plugin.measurements.find((x) => x.key === f.measureKey)?.decimals ?? 3;
    const progress = Math.min(1, Math.max(0, evaluateFormula(f.visualExpr || '1', varsOf(ctx))));
    return {
      values: { [f.measureKey]: roundTo(m, dec) },
      visual: { progress: 1, intensity: progress, animMs: 1500, readout: `${roundTo(m, dec)}`, gateFlash: true, turbidity: progress, bubbles: progress, liquidLevel: 0.5, liquidColor: '#bae6fd', protoplast: progress, specimen: 'onion', magnification: 100, blur: 0, burettePercent: 1 - progress, addedMl: progress * 25, flaskColor: '#fbcfe8', switchOn: true, current: progress, voltage: progress, rheostat: progress, readoutA: `${roundTo(m, dec)}`, readoutV: '' }
    };
  },
  preview(ctx) {
    const f = ctx.plugin.formula;
    let progress = 0;
    try {
      progress = f ? Math.min(1, Math.max(0, evaluateFormula(f.visualExpr || '0', varsOf(ctx)))) : 0;
    } catch {
      progress = 0;
    }
    return { progress: 0, intensity: progress, animMs: 0, readout: '—', gateFlash: false, turbidity: 0, bubbles: 0, liquidLevel: 0.5, liquidColor: '#bae6fd', protoplast: 0, specimen: 'onion', magnification: 100, blur: 0, burettePercent: 1, addedMl: 0, flaskColor: '#fefce8', switchOn: false, current: 0, voltage: 0, rheostat: progress, readoutA: '—', readoutV: '—' };
  },
  trueResult(ctx) {
    const f = ctx.plugin.formula;
    return f ? evaluateFormula(f.resultExpr, varsOf(ctx)) : Number.NaN;
  },
  estimateFromTrials(trials: TrialRecord[], ctx) {
    const f = ctx.plugin.formula;
    if (!f || !trials.length) return Number.NaN;
    return mean(trials.map((t) => evaluateFormula(f.estimateExpr, { ...t.params, m: t.values[f.measureKey] })));
  },
  incidents() {
    return [];
  }
};

export const ALL_SOLVERS: LabSolver[] = [...physicsSolvers, ...chemistrySolvers, ...biologySolvers, customFormulaSolver];

const MAP = new Map(ALL_SOLVERS.map((s) => [s.id, s]));

export function getSolver(id: string): LabSolver {
  const s = MAP.get(id);
  if (!s) throw new Error(`Không tìm thấy bộ giải "${id}"`);
  return s;
}

export const SOLVER_IDS = ALL_SOLVERS.map((s) => s.id);
