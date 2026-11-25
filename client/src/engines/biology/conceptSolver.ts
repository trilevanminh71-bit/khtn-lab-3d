/**
 * engines/biology/conceptSolver.ts — Các bài Sinh học 10 mở rộng (SGK Kết nối tri thức).
 *  1) prokaryote-sv       (Bài 7) : cấu trúc vi khuẩn, tỉ lệ S/V = 3/r (tế bào hình cầu)
 *  2) membrane-transport  (Bài 10): khuếch tán, thẩm thấu, vận chuyển chủ động, nhập/xuất bào
 *  3) cell-signal         (Bài 12): 4 phương thức truyền tin, 3 giai đoạn; đáp ứng = 100·L/(Kd + L)
 *  4) enzyme-conditions   (Bài 15): protease và amylase ở 4 điều kiện xử lí
 *  5) cell-division-slide (Bài 18): tiêu bản nguyên phân (rễ hành), giảm phân (ống sinh tinh châu chấu)
 *  6) microbe-growth      (Bài 21): Nt = N0·2ⁿ, 4 pha nuôi cấy không liên tục, nuôi cấy liên tục, kháng sinh
 */
import type { InsightBlock, LabSolver, SolveContext, TrialComputation, TrialRecord } from '../../types/lab';
import { gaussian, mulberry32, roundTo } from '../../utils/randomizer';
import { linearRegression, mean } from '../statistics';
import { PHASE_SHARES } from './biologySolver';

const p = (ctx: SolveContext, k: string, d = 0): number => ctx.params[k] ?? d;
const h = (ctx: SolveContext, k: string, d = 0): number => ctx.hidden[k] ?? d;
const vi = (x: number, n = 2): string => (Number.isFinite(x) ? x.toLocaleString('vi-VN', { maximumFractionDigits: n }) : '—');
const at = <T,>(list: T[], i: number): T => list[Math.max(0, Math.min(list.length - 1, Math.round(i)))];

/* ===================== 1) BÀI 7 — TẾ BÀO NHÂN SƠ ===================== */
export const BACTERIA_PARTS: Array<{ id: string; name: string; text: string }> = [
  { id: 'all', name: 'Toàn bộ tế bào', text: 'Tế bào nhân sơ: kích thước nhỏ (khoảng 1–5 µm), chưa có màng nhân, không có hệ thống nội màng và bào quan có màng.' },
  { id: 'flagellum', name: 'Roi', text: 'Cấu tạo từ bó sợi protein, giúp vi khuẩn di chuyển.' },
  { id: 'pili', name: 'Lông', text: 'Ngắn và nhiều hơn roi, giúp bám dính bề mặt; lông giới tính tham gia tiếp hợp truyền DNA.' },
  { id: 'capsule', name: 'Vỏ nhầy', text: 'Bao ngoài thành tế bào ở một số vi khuẩn, giúp bám dính và chống lại thực bào.' },
  { id: 'wall', name: 'Thành tế bào', text: 'Peptidoglycan, quy định hình dạng và chống vỡ tế bào. Gram dương: lớp dày (bắt màu tím). Gram âm: lớp mỏng, có thêm màng ngoài (bắt màu đỏ/hồng).' },
  { id: 'membrane', name: 'Màng tế bào', text: 'Lớp kép phospholipid và protein; trao đổi chất có chọn lọc, là nơi diễn ra hô hấp tế bào ở vi khuẩn.' },
  { id: 'ribosome', name: 'Tế bào chất – ribosome 70S', text: 'Ribosome 70S (30S + 50S) tổng hợp protein; nhiều kháng sinh tác động chọn lọc lên ribosome này.' },
  { id: 'nucleoid', name: 'Vùng nhân', text: 'Thường chứa một phân tử DNA dạng vòng, mạch kép, không có màng bao bọc.' },
  { id: 'plasmid', name: 'Plasmid', text: 'DNA vòng nhỏ, tự nhân đôi, thường mang gene kháng kháng sinh; được dùng làm vector.' }
];
export const sphereSurface = (r: number): number => 4 * Math.PI * r * r;
export const sphereVolume = (r: number): number => (4 / 3) * Math.PI * r ** 3;

export const prokaryoteSolver: LabSolver = {
  id: 'prokaryote-sv',
  description: 'Tế bào hình cầu: S = 4πr², V = 4πr³/3 ⇒ S/V = 3/r.',
  measure(ctx) {
    const r = p(ctx, 'r', 0.5);
    return { values: { S: roundTo(sphereSurface(r), 4), V: roundTo(sphereVolume(r), 4) }, visual: { ...bacteriaVisual(ctx), animMs: 900, readout: `r = ${vi(r)} µm` } };
  },
  preview: (ctx) => ({ ...bacteriaVisual(ctx), animMs: 0, readout: at(BACTERIA_PARTS, p(ctx, 'part')).name }),
  trueResult: (ctx) => 3 / p(ctx, 'r', 0.5),
  estimateFromTrials(trials) {
    const t = trials[trials.length - 1];
    return t ? t.values.S / t.values.V : Number.NaN;
  },
  incidents: () => [],
  insight(ctx) {
    const part = at(BACTERIA_PARTS, p(ctx, 'part'));
    const r = p(ctx, 'r', 0.5);
    return [
      { title: part.name, tone: 'info', lines: [part.text] },
      { title: Math.round(p(ctx, 'gram')) === 0 ? 'Vi khuẩn Gram dương' : 'Vi khuẩn Gram âm', tone: 'info', lines: [Math.round(p(ctx, 'gram')) === 0 ? 'Thành peptidoglycan dày, không có màng ngoài.' : 'Thành peptidoglycan mỏng, bên ngoài có thêm màng ngoài.'] },
      { title: 'Vì sao kích thước nhỏ là lợi thế?', tone: 'ok', lines: [`Bán kính ${vi(r)} µm: diện tích bề mặt trên mỗi đơn vị thể tích càng lớn khi tế bào càng nhỏ.`, 'S/V lớn → trao đổi chất nhanh → sinh trưởng, phân chia nhanh (E. coli: khoảng 20 phút/lần ở điều kiện tối ưu).'] }
    ];
  }
};
const bacteriaVisual = (ctx: SolveContext): Record<string, number | string> => ({ part: at(BACTERIA_PARTS, p(ctx, 'part')).id, gram: Math.round(p(ctx, 'gram')), r: p(ctx, 'r', 0.5) });

/* ===================== 2) BÀI 10 — TRAO ĐỔI CHẤT QUA MÀNG ===================== */
/** Nồng độ chất khảo sát bên trong tế bào (M) dùng cho khuếch tán */
export const INNER_CONC = 0.1;
/** Tốc độ vận chuyển vào tế bào (đơn vị tương đối; âm = đi ra) */
export function transportRate(process: number, cOut: number, vmax: number, km: number): number {
  switch (Math.round(process)) {
    case 0:
      return 10 * (cOut - INNER_CONC);
    case 1:
      return (vmax * cOut) / (km + cOut) - (vmax * INNER_CONC) / (km + INNER_CONC);
    case 3:
      return cOut > 0 ? 2.5 : 0;
    case 4:
      return 1.2;
    default:
      return -1.2;
  }
}
/** Biến thiên thể tích (%) do thẩm thấu: > 0 nước vào, < 0 nước ra. Thực vật: thành tế bào giới hạn trương nước */
export function osmoticVolumeChange(cOut: number, cIso: number, animal: boolean): number {
  return Math.max(-45, Math.min(animal ? 60 : 12, 120 * (cIso - cOut)));
}
const PROCESS_TEXT: Array<[string, string[]]> = [
  ['Khuếch tán đơn giản', ['Chất đi trực tiếp qua lớp kép phospholipid (O₂, CO₂, chất tan trong lipid).', 'Xuôi chiều gradient nồng độ, không tốn ATP; tốc độ tỉ lệ với chênh lệch nồng độ.']],
  ['Khuếch tán tăng cường', ['Qua protein kênh hoặc protein mang (ion, glucose).', 'Xuôi chiều gradient, không tốn ATP; tốc độ bão hòa khi protein vận chuyển đã làm việc tối đa.']],
  ['Thẩm thấu', ['Sự khuếch tán của NƯỚC qua màng, từ nơi thế nước cao đến nơi thế nước thấp.', 'Ưu trương: nước đi ra. Đẳng trương: cân bằng. Nhược trương: nước đi vào.']],
  ['Vận chuyển chủ động', ['Ngược chiều gradient nồng độ, cần protein vận chuyển (bơm) và tiêu tốn ATP.', 'Ví dụ bơm Na⁺/K⁺.']],
  ['Nhập bào', ['Màng lõm vào bao lấy chất tạo túi: thực bào (chất rắn), ẩm bào (chất lỏng).', 'Tiêu tốn năng lượng, có biến dạng màng.']],
  ['Xuất bào', ['Túi vận chuyển dung hợp với màng, giải phóng chất ra ngoài (enzyme, hormone).', 'Tiêu tốn năng lượng, có biến dạng màng.']]
];

export const membraneSolver: LabSolver = {
  id: 'membrane-transport',
  description: 'Khuếch tán ~ ΔC; tăng cường bão hòa Vmax·C/(Km + C); thẩm thấu ΔV ~ (C đẳng trương − C ngoài).',
  measure(ctx): TrialComputation {
    const proc = Math.round(p(ctx, 'process'));
    if (proc === 2) {
      const dV = roundTo(osmoticVolumeChange(p(ctx, 'Cout'), h(ctx, 'cIso', 0.32), Math.round(p(ctx, 'cell')) === 1) + 0.6 * gaussian(ctx.rng), 1);
      return { values: { dV }, visual: { ...membraneVisual(ctx), dV, animMs: 2600, readout: `ΔV = ${vi(dV, 1)}%` } };
    }
    const rate = roundTo(transportRate(proc, p(ctx, 'Cout'), h(ctx, 'vmax', 5), h(ctx, 'km', 0.15)) * (1 + 0.02 * gaussian(ctx.rng)), 2);
    return { values: { rate }, visual: { ...membraneVisual(ctx), rate, animMs: 2600, readout: `v = ${vi(rate)}` } };
  },
  preview: (ctx) => ({ ...membraneVisual(ctx), dV: 0, rate: Math.round(p(ctx, 'process')) === 2 ? 0 : transportRate(p(ctx, 'process'), p(ctx, 'Cout'), h(ctx, 'vmax', 5), h(ctx, 'km', 0.15)), animMs: 0, readout: at(PROCESS_TEXT, p(ctx, 'process'))[0] }),
  trueResult: (ctx) => h(ctx, 'cIso', 0.32),
  estimateFromTrials(trials) {
    const pts = trials.filter((t) => Math.round(t.params.process) === 2 && t.values.dV > -43 && t.values.dV < 10.5);
    if (new Set(pts.map((t) => t.params.Cout)).size < 2) return Number.NaN;
    const r = linearRegression(pts.map((t) => t.params.Cout), pts.map((t) => t.values.dV));
    return -r.intercept / r.slope;
  },
  incidents: (ctx) => (Math.round(p(ctx, 'process')) === 2 && Math.round(p(ctx, 'cell')) === 1 && p(ctx, 'Cout') < 0.05 ? ['cell-burst'] : []),
  insight(ctx) {
    const proc = Math.round(p(ctx, 'process'));
    const [title, lines] = at(PROCESS_TEXT, proc);
    const blocks: InsightBlock[] = [{ title, lines, tone: 'info' }];
    if (proc === 2) {
      blocks.push(
        Math.round(p(ctx, 'cell')) === 0
          ? { title: 'Tế bào thực vật (có thành)', tone: 'ok', lines: ['Ưu trương: co nguyên sinh — khối nguyên sinh chất tách khỏi thành tế bào.', 'Nhược trương: trương nước nhưng không vỡ nhờ thành cellulose.'] }
          : { title: 'Tế bào động vật (không có thành)', tone: 'warn', lines: ['Ưu trương: tế bào co lại, nhăn nheo.', 'Nhược trương: tế bào trương lên và có thể vỡ (tan bào).'] }
      );
    }
    return blocks;
  }
};
const membraneVisual = (ctx: SolveContext): Record<string, number> => ({ process: Math.round(p(ctx, 'process')), cell: Math.round(p(ctx, 'cell')), Cout: p(ctx, 'Cout') });

/* ===================== 3) BÀI 12 — TRUYỀN TIN TẾ BÀO ===================== */
const SIGNAL_MODES: Array<[string, string, number]> = [
  ['Truyền tin trực tiếp', 'Qua mối nối giữa hai tế bào cạnh nhau (cầu sinh chất ở thực vật, mối nối hở ở động vật) hoặc tiếp xúc bề mặt.', 1],
  ['Truyền tin cận tiết', 'Phân tử tín hiệu tiết ra dịch ngoại bào, tác động lên các tế bào lân cận (ví dụ yếu tố sinh trưởng).', 8],
  ['Truyền tin nội tiết', 'Hormone được máu vận chuyển tới tế bào đích ở xa (ví dụ insulin).', 120],
  ['Truyền tin qua synapse', 'Chất dẫn truyền thần kinh qua khe synapse tới tế bào sau synapse, rất nhanh.', 0.2]
];
/** Đáp ứng (%) theo nồng độ tín hiệu L (nM) — thụ thể bão hòa */
export const receptorResponse = (L: number, kd: number): number => (100 * L) / (kd + L);

export const signalSolver: LabSolver = {
  id: 'cell-signal',
  description: 'Đáp ứng R = 100·L/(Kd + L) khi tế bào có thụ thể phù hợp; không có thụ thể → không đáp ứng.',
  measure(ctx) {
    const has = Math.round(p(ctx, 'target')) === 0;
    const R = has ? Math.max(0, receptorResponse(p(ctx, 'L'), h(ctx, 'kd', 30)) * (1 + 0.02 * gaussian(ctx.rng))) : 0;
    const delay = at(SIGNAL_MODES, p(ctx, 'mode'))[2] * (1 + 0.04 * gaussian(ctx.rng));
    return { values: { R: roundTo(R, 1), delay: has ? roundTo(delay, 2) : 0 }, visual: { ...signalVisual(ctx), response: R / 100, animMs: 2600, readout: has ? `Đáp ứng ${vi(R, 1)}%` : 'Không đáp ứng' } };
  },
  preview: (ctx) => ({ ...signalVisual(ctx), response: 0, animMs: 0, readout: at(SIGNAL_MODES, p(ctx, 'mode'))[0] }),
  trueResult: (ctx) => h(ctx, 'kd', 30),
  estimateFromTrials(trials: TrialRecord[]) {
    const ks = trials.filter((t) => Math.round(t.params.target) === 0 && t.values.R > 10 && t.values.R < 92).map((t) => t.params.L * (100 / t.values.R - 1));
    return ks.length ? mean(ks) : Number.NaN;
  },
  incidents: () => [],
  insight(ctx) {
    const [title, text] = at(SIGNAL_MODES, p(ctx, 'mode'));
    const stages: Array<[string, string]> = [
      ['Giai đoạn 1 – Tiếp nhận', 'Phân tử tín hiệu liên kết đặc hiệu với thụ thể (trên màng hoặc trong tế bào), làm thụ thể thay đổi hình dạng.'],
      ['Giai đoạn 2 – Truyền tin nội bào', 'Chuỗi phản ứng của các phân tử truyền tin (protein kinase, chất truyền tin thứ hai…) khuếch đại tín hiệu.'],
      ['Giai đoạn 3 – Đáp ứng', 'Thay đổi biểu hiện gene, hoạt tính enzyme, chuyển hóa hoặc phân chia tế bào.']
    ];
    const [st, stText] = at(stages, p(ctx, 'stage'));
    return [
      { title, lines: [text], tone: 'info' },
      { title: st, lines: [stText], tone: 'info' },
      Math.round(p(ctx, 'target')) === 0
        ? { title: 'Tế bào đích', tone: 'ok', lines: ['Có thụ thể phù hợp → nhận và đáp ứng tín hiệu.', 'Tính đặc thù: cùng một tín hiệu, các loại tế bào khác nhau có thể đáp ứng khác nhau vì khác thụ thể và protein truyền tin.'] }
        : { title: 'Tế bào không có thụ thể', tone: 'warn', lines: ['Tín hiệu vẫn có mặt nhưng tế bào không tiếp nhận được → không đáp ứng.'] }
    ];
  }
};
const signalVisual = (ctx: SolveContext): Record<string, number> => ({ mode: Math.round(p(ctx, 'mode')), target: Math.round(p(ctx, 'target')), stage: Math.round(p(ctx, 'stage')), L: p(ctx, 'L') });

/* ===================== 4) BÀI 15 — ENZYME: 4 ĐIỀU KIỆN ===================== */
/** Hệ số hoạt tính: 0 đối chứng, 1 pH kiềm, 2 đun sôi, 3 nước đá */
export function conditionFactor(enzyme: number, cond: number, cold: number): number {
  return [1, Math.round(enzyme) === 0 ? 0.1 : 0.15, 0, cold][Math.round(cond)] ?? 1;
}
const COND_TEXT = [
  ['Đối chứng', 'Nhiệt độ, pH thích hợp: enzyme hoạt động mạnh.'],
  ['pH kiềm', 'pH lệch xa tối ưu làm thay đổi cấu hình trung tâm hoạt động → hoạt tính giảm mạnh.'],
  ['Đun sôi', 'Protein enzyme biến tính, mất cấu hình không gian → mất hoạt tính, không phục hồi khi để nguội.'],
  ['Nước đá', 'Phân tử chuyển động chậm → hoạt tính giảm nhưng enzyme KHÔNG biến tính; ấm lên sẽ hoạt động lại.']
];
export const enzymeConditionsSolver: LabSolver = {
  id: 'enzyme-conditions',
  description: 'Mức thủy phân = k·t·f (f: hệ số theo điều kiện). Hoạt tính tương đối = (mức/t)ₓ : (mức/t)đối chứng.',
  measure(ctx) {
    const f = conditionFactor(p(ctx, 'enzyme'), p(ctx, 'cond'), h(ctx, 'cold', 0.25));
    const x = f === 0 ? 0 : Math.max(0, Math.min(100, h(ctx, 'k', 1.4) * p(ctx, 'time', 30) * f * (1 + 0.015 * gaussian(ctx.rng))));
    const prot = Math.round(p(ctx, 'enzyme')) === 0;
    return { values: { degree: roundTo(x, 1) }, visual: { ...enzymeVisual(ctx), tubeColor: prot ? (x > 30 ? '#f0f9ff' : x > 8 ? '#e2e8f0' : '#ffffff') : x > 30 ? '#d6b26e' : x > 8 ? '#7c6ca8' : '#312e81', tubeIndex: Math.round(p(ctx, 'cond')), animMs: 2600, readout: `Thủy phân ${vi(x, 1)}%` } };
  },
  preview: (ctx) => ({ ...enzymeVisual(ctx), tubeColor: Math.round(p(ctx, 'enzyme')) === 0 ? '#ffffff' : '#312e81', tubeIndex: Math.round(p(ctx, 'cond')), animMs: 0, readout: at(COND_TEXT, p(ctx, 'cond'))[0] }),
  trueResult: (ctx) => h(ctx, 'cold', 0.25) * 100,
  estimateFromTrials(trials) {
    const last = trials[trials.length - 1];
    if (!last) return Number.NaN;
    const speed = (c: number): number => mean(trials.filter((t) => t.params.enzyme === last.params.enzyme && Math.round(t.params.cond) === c && t.values.degree < 99).map((t) => t.values.degree / t.params.time));
    return (speed(3) / speed(0)) * 100;
  },
  incidents: (ctx) => (Math.round(p(ctx, 'cond')) === 2 ? ['boiling'] : []),
  derive: (trial) => ({ speed: trial.values.degree / trial.params.time }),
  insight(ctx) {
    const [t, text] = at(COND_TEXT, p(ctx, 'cond')) as [string, string];
    return Math.round(p(ctx, 'enzyme')) === 0
      ? [{ title: 'Protease – lòng trắng trứng', tone: 'info', lines: ['Protease (nước ép dứa/đu đủ) thủy phân protein thành peptide, amino acid → dung dịch lòng trắng trứng đục trở nên trong dần.', 'Thực tiễn: ướp thịt với dứa giúp thịt mềm; đun chín dứa thì mất tác dụng.'] }, { title: t, tone: 'ok', lines: [text] }]
      : [{ title: 'Amylase – đĩa thạch tinh bột', tone: 'info', lines: ['Amylase thủy phân tinh bột; nhỏ iodine: vùng còn tinh bột xanh tím, vùng đã thủy phân (vòng phân giải) không màu/vàng nâu.', 'Thực tiễn: nhai kĩ cơm thấy ngọt; bảo quản thực phẩm trong tủ lạnh để hạn chế enzyme.'] }, { title: t, tone: 'ok', lines: [text] }];
  }
};
const enzymeVisual = (ctx: SolveContext): Record<string, number | string> => ({ temperature: [37, 37, 100, 0][Math.round(p(ctx, 'cond'))] ?? 37, liquidLevel: 0.5, liquidColor: '#dbeafe', bubbles: Math.round(p(ctx, 'cond')) === 2 ? 0.6 : 0 });

/* ===================== 5) BÀI 18 — TIÊU BẢN NGUYÊN PHÂN, GIẢM PHÂN ===================== */
const MEIOSIS_SHARES = [0.4, 0.15, 0.1, 0.1, 0.25];
/** Đếm tế bào theo kì trong một vi trường (tái lập theo seed, mẫu và số vi trường) */
export function countDivisionField(seed: number, field: number, ratio: number, shares: number[]): { total: number; phases: number[] } {
  const rng = mulberry32((seed ^ Math.imul(field, 2654435761) ^ shares.length) >>> 0);
  const total = 40 + Math.floor(rng() * 21);
  const phases = shares.map(() => 0);
  const n = Math.round(total * ratio * (0.88 + 0.24 * rng()));
  for (let i = 0; i < n; i++) {
    const r = rng();
    let acc = 0;
    for (let k = 0; k < shares.length; k++) {
      acc += shares[k];
      if (r < acc || k === shares.length - 1) {
        phases[k]++;
        break;
      }
    }
  }
  return { total, phases };
}
const divisionRatio = (ctx: SolveContext): number => (Math.round(p(ctx, 'sample')) === 0 ? h(ctx, 'mi', 0.12) : h(ctx, 'mei', 0.4));

export const divisionSolver: LabSolver = {
  id: 'cell-division-slide',
  description: 'Tỉ lệ tế bào đang phân chia = Σ tế bào ở các kì / Σ tổng tế bào × 100%.',
  measure(ctx) {
    const onion = Math.round(p(ctx, 'sample')) === 0;
    const { total, phases } = countDivisionField(Math.round(h(ctx, 'fieldSeed', 1234)), Math.round(p(ctx, 'field', 1)), divisionRatio(ctx), onion ? PHASE_SHARES : MEIOSIS_SHARES);
    const values: Record<string, number> = { total };
    (onion ? ['pro', 'meta', 'ana', 'telo'] : ['pro1', 'meta1', 'ana1', 'telo1', 'mei2']).forEach((k, i) => (values[k] = phases[i]));
    return { values, visual: { ...divisionVisual(ctx), animMs: 300, readout: `Vi trường ${Math.round(p(ctx, 'field', 1))}: ${total} tế bào` } };
  },
  preview: (ctx) => ({ ...divisionVisual(ctx), animMs: 0, readout: Math.round(p(ctx, 'sample')) === 0 ? 'Đầu rễ hành (2n = 16)' : 'Ống sinh tinh châu chấu' }),
  trueResult: (ctx) => divisionRatio(ctx) * 100,
  estimateFromTrials(trials) {
    const last = trials[trials.length - 1];
    if (!last) return Number.NaN;
    const byField = new Map<number, TrialRecord>();
    for (const t of trials) if (t.params.sample === last.params.sample) byField.set(Math.round(t.params.field), t);
    let div = 0;
    let tot = 0;
    for (const t of byField.values()) {
      tot += t.values.total;
      div += Object.entries(t.values).reduce((a, [k, v]) => (k === 'total' ? a : a + v), 0);
    }
    return tot > 0 ? (div / tot) * 100 : Number.NaN;
  },
  incidents(ctx) {
    const out: string[] = [];
    if (p(ctx, 'fix', 20) < 10) out.push('poor-fix');
    if (p(ctx, 'stain', 15) > 25) out.push('overstain');
    return out;
  },
  derive: (trial) => ({ ratio: (Object.entries(trial.values).reduce((a, [k, v]) => (k === 'total' ? a : a + v), 0) / trial.values.total) * 100 }),
  insight(ctx) {
    const blocks: InsightBlock[] = [
      { title: 'Làm tiêu bản', tone: 'info', lines: ['Cố định mẫu bằng dung dịch Carnoy (ethanol : acetic acid) để giữ nguyên trạng thái tế bào.', 'Nhuộm acetocarmine 2%: nhiễm sắc thể bắt màu đỏ. Đặt lam kính, dàn mỏng (ép nhẹ) để các tế bào tách rời.'] },
      Math.round(p(ctx, 'sample')) === 0
        ? { title: 'Nguyên phân – đầu rễ hành', tone: 'info', lines: ['Kì đầu: NST co xoắn, màng nhân tiêu biến dần.', 'Kì giữa: NST kép xếp MỘT hàng ở mặt phẳng xích đạo.', 'Kì sau: chromatid tách nhau về hai cực. Kì cuối: hình thành hai nhân con.'] }
        : { title: 'Giảm phân – ống sinh tinh châu chấu đực', tone: 'info', lines: ['Kì đầu I: NST tương đồng tiếp hợp, có thể trao đổi chéo.', 'Kì giữa I: các cặp NST kép xếp HAI hàng. Kì sau I: NST kép tương đồng phân li.', 'Giảm phân II: giống nguyên phân nhưng số NST đã giảm một nửa → 4 tế bào con.'] }
    ];
    if (p(ctx, 'stain', 15) < 8) blocks.push({ title: 'Nhuộm chưa đủ', tone: 'warn', lines: ['Thời gian nhuộm quá ngắn: NST bắt màu nhạt, khó phân biệt các kì.'] });
    return blocks;
  }
};
const divisionVisual = (ctx: SolveContext): Record<string, number | string> => ({
  specimen: Math.round(p(ctx, 'sample')) === 0 ? 'root-tip' : 'meiosis',
  magnification: 400,
  blur: p(ctx, 'fix', 20) < 10 ? 0.5 : 0,
  stain: Math.min(1, p(ctx, 'stain', 15) / 20),
  mitoticIndex: divisionRatio(ctx),
  fieldSeed: Math.round(p(ctx, 'field', 1))
});

/* ===================== 6) BÀI 21 — SINH TRƯỞNG VI SINH VẬT ===================== */
/** Sức chứa của bình nuôi cấy không liên tục (tế bào/mL) */
export const CARRYING_CAPACITY = 1e9;
/** Số tế bào/mL sau t giờ */
export function microbeCount(q: Record<string, number>, gMin: number, lagH: number): number {
  const n0 = q.N0 * 1000;
  if (Math.round(q.factor) === 1) return n0;
  if (Math.round(q.anti) === 1) return n0 * Math.exp(-0.6 * q.t);
  if (q.t <= lagH) return n0;
  const tStat = lagH + (Math.log2(CARRYING_CAPACITY / n0) * gMin) / 60;
  const growth = n0 * 2 ** (((q.t - lagH) * 60) / gMin);
  if (Math.round(q.culture) === 1) return Math.min(growth, CARRYING_CAPACITY / 2);
  if (q.t <= tStat) return growth;
  if (q.t <= tStat + 6) return CARRYING_CAPACITY;
  return CARRYING_CAPACITY * Math.exp(-0.25 * (q.t - tStat - 6));
}
export const growthSolver: LabSolver = {
  id: 'microbe-growth',
  description: 'Pha lũy thừa: Nt = N0·2ⁿ, n = t/g ⇒ g = độ dốc của t theo n.',
  measure(ctx) {
    const n = microbeCount(ctx.params, h(ctx, 'g', 35), h(ctx, 'lag', 1));
    const logN = roundTo(Math.log10(Math.max(1, n)) + 0.015 * gaussian(ctx.rng), 2);
    return { values: { logN }, visual: { ...growthVisual(logN), animMs: 1800, readout: `lg N = ${vi(logN)}` } };
  },
  preview: (ctx) => ({ ...growthVisual(Math.log10(Math.max(1, p(ctx, 'N0', 10) * 1000))), animMs: 0, readout: `t = ${vi(p(ctx, 't'), 1)} giờ` }),
  trueResult: (ctx) => h(ctx, 'g', 35),
  estimateFromTrials(trials) {
    const pts = trials
      .filter((t) => Math.round(t.params.culture) === 0 && Math.round(t.params.anti) !== 1 && Math.round(t.params.factor) === 0)
      .map((t) => ({ t: t.params.t, n: (t.values.logN - Math.log10(t.params.N0 * 1000)) / Math.log10(2), logN: t.values.logN }))
      .filter((x) => x.n > 1 && x.logN < 8.7 && x.t < 14);
    if (new Set(pts.map((x) => x.t)).size < 2) return Number.NaN;
    return linearRegression(pts.map((x) => x.n), pts.map((x) => x.t)).slope * 60;
  },
  incidents: () => [],
  derive: (trial) => ({ n: (trial.values.logN - Math.log10(trial.params.N0 * 1000)) / Math.log10(2) }),
  insight(ctx) {
    const blocks: InsightBlock[] = [
      Math.round(p(ctx, 'culture')) === 0
        ? { title: 'Nuôi cấy không liên tục – 4 pha', tone: 'info', lines: ['Tiềm phát: thích nghi, tổng hợp enzyme, số lượng chưa tăng.', 'Lũy thừa: phân chia mạnh nhất, Nt = N0·2ⁿ.', 'Cân bằng: số sinh ra = số chết đi (dinh dưỡng cạn, chất độc tích lũy).', 'Suy vong: số chết nhiều hơn số sinh ra.'] }
        : { title: 'Nuôi cấy liên tục', tone: 'info', lines: ['Thường xuyên bổ sung môi trường mới và lấy ra dịch nuôi tương đương.', 'Không có pha suy vong; duy trì mật độ ổn định, dùng trong sản xuất sinh khối, enzyme, vitamin.'] }
    ];
    const anti = Math.round(p(ctx, 'anti'));
    if (anti === 1) blocks.push({ title: 'Kháng sinh – vi khuẩn mẫn cảm', tone: 'warn', lines: ['Kháng sinh ức chế tổng hợp thành tế bào, protein, nucleic acid… → số lượng giảm.'] });
    if (anti === 2) blocks.push({ title: 'Vi khuẩn kháng thuốc', tone: 'warn', lines: ['Mang gene kháng (thường trên plasmid) nên vẫn sinh trưởng. Lạm dụng kháng sinh làm tăng chọn lọc chủng kháng thuốc.'] });
    if (Math.round(p(ctx, 'factor')) === 1) blocks.push({ title: 'Thiếu nhân tố sinh trưởng', tone: 'warn', lines: ['Vi sinh vật khuyết dưỡng không tự tổng hợp được chất cần thiết (amino acid, vitamin…) nên không sinh trưởng.'] });
    const repro: Array<[string, string]> = [
      ['Phân đôi', 'Hình thức sinh sản chủ yếu của vi khuẩn: DNA nhân đôi, tế bào chia hai.'],
      ['Nảy chồi', 'Chồi mọc từ tế bào mẹ rồi tách ra (nấm men, một số vi khuẩn).'],
      ['Bào tử', 'Bào tử vô tính/hữu tính ở nấm, xạ khuẩn: dùng để sinh sản và phát tán.'],
      ['Nội bào tử (không phải sinh sản)', 'Hình thành trong tế bào vi khuẩn khi điều kiện bất lợi, vỏ dày, chứa calcium dipicolinate, rất bền nhiệt; một tế bào chỉ tạo một nội bào tử nên KHÔNG phải hình thức sinh sản.']
    ];
    const [t, text] = at(repro, p(ctx, 'repro'));
    blocks.push({ title: `Sinh sản: ${t}`, lines: [text], tone: 'info' });
    blocks.push({ title: 'Trao đổi chất', tone: 'info', lines: ['Đồng hóa: tổng hợp chất phức tạp, tích lũy năng lượng. Dị hóa: phân giải chất hữu cơ, giải phóng năng lượng (ATP) cho đồng hóa.'] });
    return blocks;
  }
};
function growthVisual(logN: number): Record<string, number | string> {
  return { turbidity: Math.max(0, Math.min(1, (logN - 4) / 5)), liquidColor: '#fde68a', liquidLevel: 0.55, temperature: 37, bubbles: 0.1 };
}

export const conceptBiologySolvers: LabSolver[] = [prokaryoteSolver, membraneSolver, signalSolver, enzymeConditionsSolver, divisionSolver, growthSolver];
