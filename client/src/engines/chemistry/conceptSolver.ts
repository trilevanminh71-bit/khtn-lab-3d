/**
 * engines/chemistry/conceptSolver.ts — Các bài Hóa học 10 mở rộng (SGK Kết nối tri thức).
 *  1) covalent-bond   (Bài 12): |Δχ|, cặp electron dùng chung, liên kết σ/π, cho – nhận, phân cực phân tử
 *  2) redox-balance   (Bài 15): số oxi hóa, chất khử / chất oxi hóa, thăng bằng electron
 *  3) enthalpy-multi  (Bài 17): phản ứng tỏa nhiệt (ΔrH < 0) / thu nhiệt (ΔrH > 0), ΔrH°₂₉₈ = ΣΔfH°(sp) − ΣΔfH°(cđ)
 *  4) rate-factors    (Bài 19): v = |ΔC|/Δt theo nồng độ, nhiệt độ, áp suất, diện tích bề mặt, chất xúc tác
 *  5) halogen-id      (Bài 23): nhóm halogen và nhận biết ion halide bằng AgNO₃
 */
import type { InsightBlock, LabSolver, SolveContext, SummaryLine, TrialRecord } from '../../types/lab';
import { gaussian, roundTo } from '../../utils/randomizer';
import { mean } from '../statistics';
import { sameConfig } from '../physics/practicalSolver';
import { SPECIFIC_HEAT } from './chemistrySolver';
import { coefficientSum, equationText, formatSigned, REDOX_REACTIONS } from './redox';

const p = (ctx: SolveContext, k: string, d = 0): number => ctx.params[k] ?? d;
const h = (ctx: SolveContext, k: string, d = 0): number => ctx.hidden[k] ?? d;
const vi = (x: number, n = 2): string => (Number.isFinite(x) ? x.toLocaleString('vi-VN', { maximumFractionDigits: n }) : '—');
const at = <T,>(list: T[], i: number): T => list[Math.max(0, Math.min(list.length - 1, Math.round(i)))];

/* ===================== 1) BÀI 12 — LIÊN KẾT CỘNG HÓA TRỊ ===================== */
export interface MoleculeInfo {
  name: string;
  formula: string;
  bond: string;
  /** Độ âm điện Pauling của hai nguyên tử tạo liên kết */
  chiA: number;
  chiB: number;
  sigma: number;
  pi: number;
  dative: number;
  geometry: string;
  polar: boolean;
  why: string;
  order: string;
}
export const MOLECULES: MoleculeInfo[] = [
  { name: 'Hydrogen', formula: 'H₂', bond: 'H–H', chiA: 2.2, chiB: 2.2, sigma: 1, pi: 0, dative: 0, order: 'đơn', geometry: 'thẳng', polar: false, why: 'Hai nguyên tử giống nhau, cặp electron không bị lệch.' },
  { name: 'Chlorine', formula: 'Cl₂', bond: 'Cl–Cl', chiA: 3.16, chiB: 3.16, sigma: 1, pi: 0, dative: 0, order: 'đơn', geometry: 'thẳng', polar: false, why: 'Hai nguyên tử giống nhau, cặp electron không bị lệch.' },
  { name: 'Hydrogen chloride', formula: 'HCl', bond: 'H–Cl', chiA: 2.2, chiB: 3.16, sigma: 1, pi: 0, dative: 0, order: 'đơn', geometry: 'thẳng', polar: true, why: 'Cặp electron lệch về phía Cl.' },
  { name: 'Nước', formula: 'H₂O', bond: 'H–O', chiA: 2.2, chiB: 3.44, sigma: 2, pi: 0, dative: 0, order: 'đơn', geometry: 'gấp khúc (≈ 104,5°)', polar: true, why: 'Phân tử gấp khúc nên hai moment lưỡng cực liên kết không triệt tiêu.' },
  { name: 'Ammonia', formula: 'NH₃', bond: 'H–N', chiA: 2.2, chiB: 3.04, sigma: 3, pi: 0, dative: 0, order: 'đơn', geometry: 'chóp tam giác', polar: true, why: 'Dạng chóp, còn một cặp electron riêng trên N.' },
  { name: 'Methane', formula: 'CH₄', bond: 'H–C', chiA: 2.2, chiB: 2.55, sigma: 4, pi: 0, dative: 0, order: 'đơn', geometry: 'tứ diện đều', polar: false, why: 'Liên kết gần như không phân cực và phân tử đối xứng tứ diện.' },
  { name: 'Carbon dioxide', formula: 'CO₂', bond: 'C=O', chiA: 2.55, chiB: 3.44, sigma: 2, pi: 2, dative: 0, order: 'đôi', geometry: 'thẳng (180°)', polar: false, why: 'Liên kết C=O phân cực nhưng phân tử thẳng nên hai moment lưỡng cực triệt tiêu → phân tử không phân cực.' },
  { name: 'Oxygen', formula: 'O₂', bond: 'O=O', chiA: 3.44, chiB: 3.44, sigma: 1, pi: 1, dative: 0, order: 'đôi', geometry: 'thẳng', polar: false, why: 'Hai nguyên tử giống nhau.' },
  { name: 'Nitrogen', formula: 'N₂', bond: 'N≡N', chiA: 3.04, chiB: 3.04, sigma: 1, pi: 2, dative: 0, order: 'ba', geometry: 'thẳng', polar: false, why: 'Hai nguyên tử giống nhau; liên kết ba rất bền.' },
  { name: 'Ethylene', formula: 'C₂H₄', bond: 'C=C', chiA: 2.55, chiB: 2.55, sigma: 5, pi: 1, dative: 0, order: 'đôi (C=C)', geometry: 'phẳng', polar: false, why: 'Phân tử phẳng, đối xứng.' },
  { name: 'Acetylene', formula: 'C₂H₂', bond: 'C≡C', chiA: 2.55, chiB: 2.55, sigma: 3, pi: 2, dative: 0, order: 'ba (C≡C)', geometry: 'thẳng', polar: false, why: 'Phân tử thẳng, đối xứng.' },
  { name: 'Ion ammonium', formula: 'NH₄⁺', bond: 'H–N', chiA: 2.2, chiB: 3.04, sigma: 4, pi: 0, dative: 1, order: 'đơn (có 1 liên kết cho – nhận)', geometry: 'tứ diện đều', polar: false, why: 'N dùng cặp electron riêng tạo liên kết cho – nhận với H⁺; sau khi hình thành, 4 liên kết N–H như nhau.' },
  { name: 'Hydrogen fluoride', formula: 'HF', bond: 'H–F', chiA: 2.2, chiB: 3.98, sigma: 1, pi: 0, dative: 0, order: 'đơn', geometry: 'thẳng', polar: true, why: 'Ngoại lệ: |Δχ| = 1,78 ≥ 1,7 nhưng HF vẫn là hợp chất cộng hóa trị phân cực mạnh.' },
  { name: 'Sodium chloride', formula: 'NaCl', bond: 'Na–Cl', chiA: 0.93, chiB: 3.16, sigma: 0, pi: 0, dative: 0, order: 'liên kết ion', geometry: 'tinh thể ion', polar: true, why: 'Na nhường 1 electron cho Cl, tạo ion Na⁺ và Cl⁻ hút nhau bằng lực tĩnh điện.' }
];
export const electronegativityGap = (m: MoleculeInfo): number => roundTo(Math.abs(m.chiA - m.chiB), 2);
/** Phân loại theo |Δχ|: 1 cộng hóa trị không phân cực (< 0,4), 2 phân cực (0,4 ≤ … < 1,7), 3 ion (≥ 1,7) */
export function bondClass(gap: number): 1 | 2 | 3 {
  return gap < 0.4 ? 1 : gap < 1.7 ? 2 : 3;
}
const CLASS_TEXT = { 1: 'cộng hóa trị không phân cực', 2: 'cộng hóa trị phân cực', 3: 'ion' } as const;

export const covalentSolver: LabSolver = {
  id: 'covalent-bond',
  description: 'Phân loại liên kết theo |Δχ| = |χA − χB| (độ âm điện Pauling).',
  measure(ctx) {
    const m = at(MOLECULES, p(ctx, 'mol'));
    return { values: { chiA: m.chiA, chiB: m.chiB, sigma: m.sigma, pi: m.pi, cls: bondClass(electronegativityGap(m)), polar: m.polar ? 1 : 0 }, visual: { mol: m.formula, mode: 'bond', readout: `${m.formula}: ${m.bond}`, animMs: 800 } };
  },
  preview(ctx) {
    const m = at(MOLECULES, p(ctx, 'mol'));
    return { mol: m.formula, mode: 'bond', readout: `${m.formula} — ${m.name}`, animMs: 0 };
  },
  trueResult: (ctx) => electronegativityGap(at(MOLECULES, p(ctx, 'mol'))),
  estimateFromTrials(trials) {
    const t = trials[trials.length - 1];
    return t ? roundTo(Math.abs(t.values.chiA - t.values.chiB), 2) : Number.NaN;
  },
  incidents: () => [],
  insight(ctx) {
    const m = at(MOLECULES, p(ctx, 'mol'));
    const gap = electronegativityGap(m);
    const cls = bondClass(gap);
    const pairs = m.sigma + m.pi;
    const blocks: InsightBlock[] = [
      {
        title: `${m.name} (${m.formula})`,
        tone: 'info',
        lines:
          pairs > 0
            ? [`Liên kết ${m.bond}: liên kết ${m.order}.`, `Số cặp electron dùng chung: ${pairs} = ${m.sigma} liên kết σ (xen phủ trục) + ${m.pi} liên kết π (xen phủ bên).`, ...(m.dative ? ['Có 1 liên kết cho – nhận: cặp electron chung do một nguyên tử đóng góp.'] : []), 'Liên kết đơn = 1σ; liên kết đôi = 1σ + 1π; liên kết ba = 1σ + 2π.']
            : ['Không có cặp electron dùng chung: liên kết tạo bởi lực hút tĩnh điện giữa các ion.']
      },
      { title: `|Δχ| theo bảng: ${vi(m.chiB)} và ${vi(m.chiA)}`, tone: 'info', lines: [`Thang phân loại: |Δχ| < 0,4 không phân cực; 0,4 ≤ |Δχ| < 1,7 phân cực; ≥ 1,7 ion.`, `Theo thang này liên kết ${m.bond} thuộc loại ${CLASS_TEXT[cls]}.`] },
      { title: `Hình học: ${m.geometry}`, tone: m.polar ? 'warn' : 'ok', lines: [m.why, m.sigma === 0 ? 'Hợp chất ion.' : m.polar ? 'Phân tử phân cực.' : 'Phân tử (ion) không phân cực toàn phần.'] }
    ];
    return blocks;
  }
};

/* ===================== 2) BÀI 15 — OXI HÓA – KHỬ ===================== */
export const redoxSolver: LabSolver = {
  id: 'redox-balance',
  description: 'Thăng bằng electron: tổng số electron nhường = tổng số electron nhận.',
  measure(ctx) {
    const r = at(REDOX_REACTIONS, p(ctx, 'rxn'));
    return { values: { redFrom: r.reducer.from, redTo: r.reducer.to, oxFrom: r.oxidizer.from, oxTo: r.oxidizer.to }, visual: { ...redoxVisual(ctx), transfer: true, animMs: 2200 } };
  },
  preview(ctx) {
    return { ...redoxVisual(ctx), transfer: false, animMs: 0 };
  },
  trueResult: (ctx) => coefficientSum(at(REDOX_REACTIONS, p(ctx, 'rxn'))),
  estimateFromTrials(trials) {
    const t = trials[trials.length - 1];
    return t ? coefficientSum(at(REDOX_REACTIONS, t.params.rxn)) : Number.NaN;
  },
  incidents: () => [],
  derive(trial) {
    return { give: trial.values.redTo - trial.values.redFrom, take: trial.values.oxFrom - trial.values.oxTo };
  },
  insight(ctx) {
    const r = at(REDOX_REACTIONS, p(ctx, 'rxn'));
    const stage = Math.round(p(ctx, 'stage'));
    const { reducer: a, oxidizer: b } = r;
    const [x, y] = r.multipliers;
    const blocks: InsightBlock[] = [{ title: equationText(r, stage >= 4), tone: stage >= 4 ? 'ok' : 'info', lines: [r.note] }];
    if (stage >= 1) blocks.push({ title: 'Bước 1 – Số oxi hóa thay đổi', tone: 'info', lines: [`${a.element}: ${formatSigned(a.from)} → ${formatSigned(a.to)} (tăng)`, `${b.element}: ${formatSigned(b.from)} → ${formatSigned(b.to)} (giảm)`] });
    if (stage >= 2) blocks.push({ title: 'Bước 2 – Chất khử, chất oxi hóa', tone: 'info', lines: [`Chất khử: ${a.species} (chứa ${a.element} nhường e, số oxi hóa tăng) → quá trình oxi hóa.`, `Chất oxi hóa: ${b.species} (chứa ${b.element} nhận e, số oxi hóa giảm) → quá trình khử.`] });
    if (stage >= 3) blocks.push({ title: 'Bước 3 – Thăng bằng electron', tone: 'info', lines: [`${x} × | ${a.element} (${formatSigned(a.from)}) → ${a.element} (${formatSigned(a.to)}) + ${a.to - a.from}e`, `${y} × | ${b.element} (${formatSigned(b.from)}) + ${b.from - b.to}e → ${b.element} (${formatSigned(b.to)})`, `Tổng electron nhường = nhận = ${x * (a.to - a.from)}.`] });
    if (stage >= 4) blocks.push({ title: 'Bước 4 – Đặt hệ số và kiểm tra', tone: 'ok', lines: [equationText(r, true), 'Đếm lại số nguyên tử từng nguyên tố ở hai vế, sau đó cộng các hệ số.'] });
    return blocks;
  }
};
function redoxVisual(ctx: SolveContext): Record<string, number | string> {
  const r = at(REDOX_REACTIONS, p(ctx, 'rxn'));
  return { mode: 'redox', donor: r.reducer.element, acceptor: r.oxidizer.element, electrons: Math.min(8, r.reducer.to - r.reducer.from), readout: r.name };
}

/* ===================== 3) BÀI 17 — ENTHALPY ===================== */
export interface EnthalpyReaction {
  label: string;
  equation: string;
  /** [hệ số, chất, ΔfH°₂₉₈ kJ/mol] */
  products: Array<[number, string, number]>;
  reactants: Array<[number, string, number]>;
  color: string;
  bubbles: number;
}
export const ENTHALPY_REACTIONS: EnthalpyReaction[] = [
  { label: 'Zn + CuSO₄', equation: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)', reactants: [[1, 'Zn(s)', 0], [1, 'Cu²⁺(aq)', 64.8]], products: [[1, 'Zn²⁺(aq)', -153.9], [1, 'Cu(s)', 0]], color: '#cbd5e1', bubbles: 0.05 },
  { label: 'HCl + NaOH', equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)', reactants: [[1, 'H⁺(aq)', 0], [1, 'OH⁻(aq)', -230]], products: [[1, 'H₂O(l)', -285.8]], color: '#f0f9ff', bubbles: 0 },
  { label: 'NaHCO₃ + HCl', equation: 'NaHCO₃(s) + H⁺(aq) → Na⁺(aq) + CO₂(g) + H₂O(l)', reactants: [[1, 'NaHCO₃(s)', -950.8], [1, 'H⁺(aq)', 0]], products: [[1, 'Na⁺(aq)', -240.1], [1, 'CO₂(g)', -393.5], [1, 'H₂O(l)', -285.8]], color: '#f8fafc', bubbles: 0.9 },
  { label: 'Hòa tan NH₄NO₃', equation: 'NH₄NO₃(s) → NH₄⁺(aq) + NO₃⁻(aq)', reactants: [[1, 'NH₄NO₃(s)', -365.6]], products: [[1, 'NH₄⁺(aq)', -132.5], [1, 'NO₃⁻(aq)', -207.4]], color: '#f0f9ff', bubbles: 0 }
];
/** ΔrH°₂₉₈ = ΣΔfH°(sản phẩm) − ΣΔfH°(chất đầu) (kJ) */
export function standardEnthalpy(r: EnthalpyReaction): number {
  const sum = (s: Array<[number, string, number]>): number => s.reduce((a, [k, , v]) => a + k * v, 0);
  return roundTo(sum(r.products) - sum(r.reactants), 1);
}

export const enthalpyMultiSolver: LabSolver = {
  id: 'enthalpy-multi',
  description: 'Q = m·c·ΔT; ΔrH = −Q/n. ΔT > 0: tỏa nhiệt; ΔT < 0: thu nhiệt.',
  measure(ctx) {
    const r = at(ENTHALPY_REACTIONS, p(ctx, 'rxn'));
    const C = p(ctx, 'C', 0.5);
    const V = p(ctx, 'V', 50);
    const dT = (-standardEnthalpy(r) * C * (1 - h(ctx, 'loss', 0.06))) / SPECIFIC_HEAT;
    const T0 = roundTo(25 + 0.3 * gaussian(ctx.rng), 1);
    const T1 = roundTo(T0 + dT + 0.06 * gaussian(ctx.rng), 1);
    return { values: { T0, T1, dT: roundTo(T1 - T0, 1) }, visual: { temperature: T1, liquidColor: r.color, liquidLevel: 0.3 + V / 250, animMs: 3000, readout: `${vi(T1, 1)} °C`, bubbles: r.bubbles } };
  },
  preview(ctx) {
    const r = at(ENTHALPY_REACTIONS, p(ctx, 'rxn'));
    return { temperature: 25, liquidColor: Math.round(p(ctx, 'rxn')) === 0 ? '#3b82f6' : r.color, liquidLevel: 0.3 + p(ctx, 'V', 50) / 250, animMs: 0, readout: '25,0 °C', bubbles: 0 };
  },
  trueResult: (ctx) => standardEnthalpy(at(ENTHALPY_REACTIONS, p(ctx, 'rxn'))),
  estimateFromTrials(trials) {
    const last = trials[trials.length - 1];
    if (!last) return Number.NaN;
    return mean(trials.filter((t) => t.params.rxn === last.params.rxn).map((t) => (-SPECIFIC_HEAT * t.values.dT) / t.params.C));
  },
  incidents: (ctx) => (Math.round(p(ctx, 'rxn')) === 0 && p(ctx, 'C') > 0.9 ? ['hot-splash'] : []),
  derive(trial) {
    return { n: (trial.params.C * trial.params.V) / 1000, Q: trial.params.V * SPECIFIC_HEAT * trial.values.dT };
  },
  insight(ctx) {
    const r = at(ENTHALPY_REACTIONS, p(ctx, 'rxn'));
    const exo = standardEnthalpy(r) < 0;
    const side = (s: Array<[number, string, number]>): string => s.map(([k, n, v]) => `${k > 1 ? `${k}·` : ''}ΔfH°(${n}) = ${vi(v, 1)}`).join('; ');
    return [
      { title: r.equation, tone: exo ? 'warn' : 'info', lines: [exo ? 'Phản ứng TỎA NHIỆT: hệ nhường nhiệt cho dung dịch → nhiệt độ tăng, ΔrH < 0.' : 'Quá trình THU NHIỆT: hệ lấy nhiệt của dung dịch → nhiệt độ giảm, ΔrH > 0.'] },
      { title: 'Tra cứu ΔfH°₂₉₈ (kJ/mol)', tone: 'info', lines: [`Sản phẩm: ${side(r.products)}`, `Chất đầu: ${side(r.reactants)}`, 'ΔrH°₂₉₈ = ΣΔfH°(sản phẩm) − ΣΔfH°(chất đầu)', 'Điều kiện chuẩn: 1 bar (chất khí), 1 mol/L (chất tan), thường chọn 25 °C (298 K).'] }
    ];
  }
};

/* ===================== 4) BÀI 19 — CÁC YẾU TỐ ẢNH HƯỞNG TỐC ĐỘ ===================== */
const AREA_FACTOR = [1, 2.5, 6];
const CAT_FACTOR = [1, 40, 25];
/** Tốc độ tức thời ban đầu (mol/(L·s)) theo hệ phản ứng */
export function initialRate(q: Record<string, number>, k: number, gamma: number): number {
  const kT = gamma ** ((q.T - 25) / 10);
  switch (Math.round(q.system)) {
    case 0:
      return k * q.C * kT * (AREA_FACTOR[Math.round(q.area)] ?? 1);
    case 1:
      return 0.15 * k * q.C * kT * (CAT_FACTOR[Math.round(q.cat)] ?? 1);
    default:
      return 0.02 * k * q.P ** 3 * kT;
  }
}
/** Độ giảm nồng độ (mol/L) trong Δt, không vượt quá 90% lượng ban đầu */
export function concentrationDrop(q: Record<string, number>, k: number, gamma: number): number {
  const c0 = Math.round(q.system) === 2 ? 0.02 * q.P : q.C;
  return Math.min(0.9 * c0, initialRate(q, k, gamma) * q.dt);
}
export const rateFactorsSolver: LabSolver = {
  id: 'rate-factors',
  description: 'v̄ = |ΔC|/Δt; nồng độ, nhiệt độ (Van’t Hoff), áp suất (v ~ p³ với 2NO + O₂), diện tích bề mặt, xúc tác.',
  measure(ctx) {
    const dC = concentrationDrop(ctx.params, h(ctx, 'k', 4e-4), h(ctx, 'gamma', 2)) * (1 + 0.012 * gaussian(ctx.rng));
    return { values: { dC: roundTo(dC * 1000, 2) }, visual: { ...rateVisual(ctx), bubbles: Math.min(1, 0.1 + dC * 8), gasVolume: Math.min(95, dC * 250), animMs: 2500, readout: `ΔC = ${vi(dC * 1000)} mmol/L` } };
  },
  preview(ctx) {
    return { ...rateVisual(ctx), bubbles: 0, gasVolume: 0, animMs: 0, readout: '—' };
  },
  trueResult(ctx) {
    return (concentrationDrop(ctx.params, h(ctx, 'k', 4e-4), h(ctx, 'gamma', 2)) * 1000) / p(ctx, 'dt', 30);
  },
  estimateFromTrials(trials) {
    const same = sameConfig(trials);
    return same.length ? mean(same.map((t) => t.values.dC / t.params.dt)) : Number.NaN;
  },
  incidents: (ctx) => (Math.round(p(ctx, 'system')) === 2 && p(ctx, 'P') > 4 ? ['over-pressure'] : []),
  insight(ctx) {
    const sys = Math.round(p(ctx, 'system'));
    const name = ['CaCO₃(s) + 2HCl → CaCl₂ + CO₂↑ + H₂O', '2H₂O₂ → 2H₂O + O₂↑', '2NO(g) + O₂(g) → 2NO₂(g)'][sys] ?? '';
    const lines = [
      ['Nồng độ HCl tăng → nhiều va chạm hiệu quả hơn → tốc độ tăng.', 'Đá vôi càng nhỏ, diện tích bề mặt tiếp xúc càng lớn → tốc độ tăng.'],
      ['Chất xúc tác (MnO₂, catalase) làm giảm năng lượng hoạt hóa, không bị tiêu hao.', 'Nồng độ H₂O₂ và nhiệt độ tăng → tốc độ tăng.'],
      ['Tăng áp suất chất khí = tăng nồng độ các chất khí → tốc độ tăng; với v = k·[NO]²[O₂], p tăng 2 lần thì v tăng 2³ = 8 lần.', 'Áp suất không ảnh hưởng đáng kể khi phản ứng không có chất khí tham gia.']
    ][sys] ?? [];
    return [{ title: name, tone: 'info', lines: [...lines, 'Tăng 10 °C, tốc độ thường tăng 2–4 lần (hệ số Van’t Hoff γ).', 'Chỉ thay đổi MỘT yếu tố mỗi lần để so sánh đúng.'] }];
  }
};
function rateVisual(ctx: SolveContext): Record<string, number | string> {
  const sys = Math.round(p(ctx, 'system'));
  return { temperature: p(ctx, 'T', 25), liquidLevel: 0.5, liquidColor: sys === 2 ? '#b45309' : sys === 1 ? '#f0f9ff' : '#e2e8f0' };
}

/* ===================== 5) BÀI 23 — HALOGEN ===================== */
export interface HalogenInfo {
  symbol: string;
  name: string;
  Z: number;
  config: string;
  radius: number;
  chi: number;
  state: string;
  color: string;
  hxBoil: number;
  hxAcid: string;
  precipitate: 0 | 1 | 2 | 3;
  precipitateColor: string;
}
export const HALOGENS: HalogenInfo[] = [
  { symbol: 'F', name: 'Fluorine', Z: 9, config: '2s²2p⁵', radius: 72, chi: 3.98, state: 'khí, lục nhạt', color: '#d9f99d', hxBoil: 20, hxAcid: 'HF: acid yếu, ăn mòn thủy tinh (4HF + SiO₂ → SiF₄ + 2H₂O), sôi cao bất thường do liên kết hydrogen', precipitate: 0, precipitateColor: '#7dd3fc' },
  { symbol: 'Cl', name: 'Chlorine', Z: 17, config: '3s²3p⁵', radius: 100, chi: 3.16, state: 'khí, vàng lục', color: '#bef264', hxBoil: -85, hxAcid: 'HCl: acid mạnh', precipitate: 1, precipitateColor: '#ffffff' },
  { symbol: 'Br', name: 'Bromine', Z: 35, config: '4s²4p⁵', radius: 114, chi: 2.96, state: 'lỏng, nâu đỏ', color: '#9a3412', hxBoil: -67, hxAcid: 'HBr: acid mạnh hơn HCl', precipitate: 2, precipitateColor: '#fde68a' },
  { symbol: 'I', name: 'Iodine', Z: 53, config: '5s²5p⁵', radius: 133, chi: 2.66, state: 'rắn, tím đen (thăng hoa)', color: '#4c1d95', hxBoil: -35, hxAcid: 'HI: acid mạnh nhất dãy HX', precipitate: 3, precipitateColor: '#eab308' }
];
/** Hoán vị thứ k (0..23) của 4 ion — xác định ion trong từng lọ, riêng cho mỗi học sinh */
export function halidePermutation(k: number): number[] {
  const pool = [0, 1, 2, 3];
  let n = ((Math.round(k) % 24) + 24) % 24;
  const out: number[] = [];
  for (const f of [6, 2, 1, 1]) {
    const i = Math.floor(n / f);
    n %= f;
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
  }
  return out;
}
const halideOf = (ctx: SolveContext, sample: number): HalogenInfo => HALOGENS[halidePermutation(h(ctx, 'perm'))[Math.max(0, Math.min(3, Math.round(sample)))]];
/** Lọ cần xác định trong phiếu (lọ C) */
export const TARGET_SAMPLE = 2;

export const halogenSolver: LabSolver = {
  id: 'halogen-id',
  description: 'Ag⁺ + X⁻ → AgX↓: AgCl trắng, AgBr vàng nhạt, AgI vàng; AgF tan.',
  measure(ctx) {
    const x = halideOf(ctx, p(ctx, 'sample'));
    return { values: { color: x.precipitate }, visual: { tubeColor: x.precipitateColor, tubeIndex: Math.round(p(ctx, 'sample')), liquidLevel: 0.5, liquidColor: '#e0f2fe', animMs: 2500, bubbles: 0, readout: ['Không có kết tủa', 'Kết tủa trắng', 'Kết tủa vàng nhạt', 'Kết tủa vàng'][x.precipitate] } };
  },
  preview(ctx) {
    const e = at(HALOGENS, p(ctx, 'element'));
    return { tubeColor: '#7dd3fc', tubeIndex: Math.round(p(ctx, 'sample')), liquidLevel: 0.5, liquidColor: e.color, animMs: 0, bubbles: 0, readout: `Lọ ${'ABCD'[Math.round(p(ctx, 'sample'))] ?? 'A'}` };
  },
  trueResult: (ctx) => halideOf(ctx, TARGET_SAMPLE).Z,
  estimateFromTrials(trials: TrialRecord[]) {
    const t = trials.find((x) => Math.round(x.params.sample) === TARGET_SAMPLE);
    return t ? (HALOGENS.find((x) => x.precipitate === t.values.color)?.Z ?? Number.NaN) : Number.NaN;
  },
  incidents: () => [],
  summarize(trials) {
    const done = new Set(trials.map((t) => Math.round(t.params.sample)));
    const out: SummaryLine[] = [{ label: 'Số lọ đã thử', value: `${done.size}/4`, status: done.size === 4 ? 'ok' : 'warn' }];
    if (done.size === 4) out.push({ label: 'Kết luận', value: 'Đối chiếu màu kết tủa với bảng AgX để gọi tên ion trong từng lọ', status: 'ok' });
    return out;
  },
  insight(ctx) {
    const e = at(HALOGENS, p(ctx, 'element'));
    return [
      { title: `${e.name} (${e.symbol}, Z = ${e.Z})`, tone: 'info', lines: [`Lớp electron ngoài cùng ${e.config} (dạng ns²np⁵), dễ nhận thêm 1 electron.`, `Bán kính ≈ ${e.radius} pm; độ âm điện ${vi(e.chi)}; đơn chất X₂: ${e.state}.`, `${e.hxAcid}; nhiệt độ sôi của H${e.symbol}: ${vi(e.hxBoil, 0)} °C.`] },
      { title: 'Xu hướng F → I', tone: 'info', lines: ['Bán kính tăng, độ âm điện và tính oxi hóa giảm.', 'Màu đơn chất đậm dần; trạng thái khí → lỏng → rắn; nhiệt độ sôi tăng.', 'Tính acid: HF < HCl < HBr < HI. HF sôi cao bất thường vì có liên kết hydrogen.'] },
      { title: 'Nhận biết ion halide bằng AgNO₃', tone: 'ok', lines: ['F⁻: không kết tủa · Cl⁻: AgCl trắng · Br⁻: AgBr vàng nhạt · I⁻: AgI vàng.'] }
    ];
  }
};

export const conceptChemistrySolvers: LabSolver[] = [covalentSolver, redoxSolver, enthalpyMultiSolver, rateFactorsSolver, halogenSolver];
