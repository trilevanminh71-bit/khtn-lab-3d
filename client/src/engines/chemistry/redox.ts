/**
 * engines/chemistry/redox.ts — Số oxi hóa và phản ứng oxi hóa – khử (Hóa học 10, Bài 15).
 *  - parseFormula: tách công thức hóa học (có ngoặc, có điện tích) thành số nguyên tử từng nguyên tố.
 *  - oxidationStates: xác định số oxi hóa theo quy tắc SGK (đơn chất 0; F −1; kim loại IA +1, IIA +2, Al +3;
 *    H +1 (−1 trong hydride kim loại); O −2 (−1 trong peroxide, +2 trong OF₂); tổng số oxi hóa = điện tích).
 *  - REDOX_REACTIONS: phản ứng mẫu đã cân bằng, kèm các bước thăng bằng electron.
 */
export class RedoxError extends Error {}

const ELEMENTS = new Set(
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Ag Cd Sn Sb I Xe Cs Ba Pt Au Hg Pb Bi'.split(' ')
);
const FIXED: Record<string, number> = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Al: 3, Zn: 2, Ag: 1 };
const METALS = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Al', 'Zn', 'Ag', 'Fe', 'Cu', 'Mn', 'Cr', 'Ni', 'Co', 'Pb', 'Sn', 'Hg', 'Ti', 'V', 'Cd', 'Sc', 'Au', 'Pt', 'Bi']);
const HALOGENS = ['Cl', 'Br', 'I'];
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

/** Chuẩn hóa chỉ số dưới Unicode (H₂O → H2O) và dấu điện tích (MnO4^-, SO4 2- → tách điện tích) */
function normalize(raw: string): { body: string; charge: number } {
  let s = raw.trim().replace(/[₀-₉]/g, (c) => String(SUBSCRIPTS.indexOf(c)));
  s = s.replace(/[⁰¹²³⁴-⁹]/g, (c) => `^${'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)}`).replace(/[⁺]/g, '+').replace(/[⁻−–]/g, '-');
  // Ion đơn nguyên tố viết liền: Fe3+, Cl-, S2- → chữ số là độ lớn điện tích
  const mono = s.match(/^([A-Z][a-z]?)(\d?)([+-])$/);
  if (mono) return { body: mono[1], charge: Number(mono[2] || '1') * (mono[3] === '+' ? 1 : -1) };
  const m = s.match(/^(.*?)(?:\^\s*(\d*)|\s+(\d+)|\[(\d*)|(?=[+-]))([+-])\]?$/);
  if (!m) return { body: s.replace(/\s+/g, ''), charge: 0 };
  const n = Number(m[2] || m[3] || m[4] || '1');
  return { body: m[1].replace(/[\s^]+/g, ''), charge: m[5] === '+' ? n : -n };
}

/** "Fe2(SO4)3" → { counts: {Fe:2,S:3,O:12}, charge: 0 } */
export function parseFormula(raw: string): { counts: Record<string, number>; charge: number } {
  const { body, charge } = normalize(raw);
  if (!body) throw new RedoxError('Hãy nhập công thức hóa học.');
  const stack: Array<Record<string, number>> = [{}];
  const re = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/y;
  let pos = 0;
  while (pos < body.length) {
    re.lastIndex = pos;
    const m = re.exec(body);
    if (!m) throw new RedoxError(`Không hiểu kí hiệu "${body[pos]}" trong công thức.`);
    pos = re.lastIndex;
    if (m[1]) {
      if (!ELEMENTS.has(m[1])) throw new RedoxError(`Không có nguyên tố "${m[1]}".`);
      const top = stack[stack.length - 1];
      top[m[1]] = (top[m[1]] ?? 0) + Number(m[2] || '1');
    } else if (m[3]) stack.push({});
    else {
      if (stack.length < 2) throw new RedoxError('Thừa dấu ngoặc đóng.');
      const inner = stack.pop() as Record<string, number>;
      const k = Number(m[5] || '1');
      const top = stack[stack.length - 1];
      for (const [el, n] of Object.entries(inner)) top[el] = (top[el] ?? 0) + n * k;
    }
  }
  if (stack.length !== 1) throw new RedoxError('Thiếu dấu ngoặc đóng.');
  return { counts: stack[0], charge };
}

export interface OxidationResult {
  states: Record<string, number>;
  steps: string[];
}

const signed = (x: number): string => (x > 0 ? `+${x}` : x < 0 ? `−${Math.abs(x)}` : '0');
export const formatOxidation = (x: number): string => (Number.isInteger(x) ? signed(x) : `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(2).replace('.', ',')} (trung bình)`);

/** Xác định số oxi hóa; ném RedoxError khi quy tắc phổ thông không đủ để kết luận */
export function oxidationStates(raw: string): OxidationResult {
  const { counts, charge } = parseFormula(raw);
  const els = Object.keys(counts);
  const steps: string[] = [];
  const states: Record<string, number> = {};
  if (els.length === 1) {
    states[els[0]] = charge / counts[els[0]];
    steps.push(charge === 0 ? 'Đơn chất: số oxi hóa bằng 0.' : `Ion đơn nguyên tố: tổng số oxi hóa bằng điện tích (${signed(charge)}).`);
    return { states, steps };
  }
  const set = (el: string, v: number, why: string): void => {
    states[el] = v;
    steps.push(`${el}: ${signed(v)} (${why})`);
  };
  if (counts.F) set('F', -1, 'F luôn là −1 trong hợp chất');
  for (const el of els) if (FIXED[el] !== undefined) set(el, FIXED[el], 'kim loại có số oxi hóa không đổi');
  const onlyMetalBesides = (x: string): boolean => els.every((e) => e === x || METALS.has(e));
  if (counts.H && states.H === undefined) {
    if (onlyMetalBesides('H')) set('H', -1, 'hydride kim loại');
    else set('H', 1, 'quy tắc thông thường của H');
  }
  if (counts.O && states.O === undefined) {
    if (counts.F) steps.push('O: tính theo điều kiện tổng (hợp chất với F)');
    else {
      const others = els.filter((e) => e !== 'O');
      const known = others.every((e) => states[e] !== undefined);
      const sumOthers = others.reduce((a, e) => a + (states[e] ?? 0) * counts[e], 0);
      // Peroxide: mọi nguyên tố khác đã biết và O phải nhận −1 để tổng khớp (H₂O₂, Na₂O₂, BaO₂)
      if (known && sumOthers - counts.O === charge) set('O', -1, 'peroxide: liên kết O–O');
      else set('O', -2, 'quy tắc thông thường của O');
    }
  }
  let unknown = els.filter((e) => states[e] === undefined);
  if (unknown.length > 1) {
    // Muối halide kim loại – phi kim không có oxygen: halogen nhận −1
    for (const x of HALOGENS) if (unknown.length > 1 && counts[x] && !counts.O) set(x, -1, 'halogen trong hợp chất không có O, F');
    unknown = els.filter((e) => states[e] === undefined);
    if (unknown.length === 2 && counts.S && !counts.O && unknown.includes('S')) {
      set('S', -2, 'sulfide');
      unknown = els.filter((e) => states[e] === undefined);
    }
    // Muối của kim loại nhiều hóa trị với gốc acid quen thuộc
    const ANIONS: Array<[string, string, number, number, number]> = [['S', 'SO₄', 4, -2, 6], ['N', 'NO₃', 3, -1, 5], ['C', 'CO₃', 3, -2, 4], ['P', 'PO₄', 4, -3, 5]];
    for (const [el, name, o, , ox] of ANIONS) {
      if (unknown.length === 2 && unknown.includes(el) && counts.O === o * counts[el] && unknown.some((e) => METALS.has(e))) {
        set(el, ox, `trong gốc ${name}`);
        unknown = els.filter((e) => states[e] === undefined);
      }
    }
  }
  if (unknown.length > 1) throw new RedoxError(`Chưa đủ quy tắc để xác định đồng thời ${unknown.join(', ')}. Hãy tách thành các ion rồi thử lại.`);
  const sum = els.reduce((a, e) => a + (states[e] ?? 0) * counts[e], 0);
  if (unknown.length === 1) {
    const el = unknown[0];
    const v = (charge - sum) / counts[el];
    states[el] = v;
    steps.push(`${el}: tổng số oxi hóa = ${signed(charge)} ⇒ ${counts[el]}·x + (${signed(sum)}) = ${signed(charge)} ⇒ x = ${formatOxidation(v)}`);
  } else if (sum !== charge) throw new RedoxError('Công thức hoặc điện tích không khớp với các quy tắc số oxi hóa.');
  return { states, steps };
}

export interface RedoxReaction {
  name: string;
  /** Vế trái / vế phải: [hệ số, công thức] */
  left: Array<[number, string]>;
  right: Array<[number, string]>;
  reducer: { species: string; element: string; from: number; to: number };
  oxidizer: { species: string; element: string; from: number; to: number };
  /** Hệ số nhân của quá trình oxi hóa và quá trình khử */
  multipliers: [number, number];
  note: string;
}

export const REDOX_REACTIONS: RedoxReaction[] = [
  { name: 'Zn + CuSO₄', left: [[1, 'Zn'], [1, 'CuSO4']], right: [[1, 'ZnSO4'], [1, 'Cu']], reducer: { species: 'Zn', element: 'Zn', from: 0, to: 2 }, oxidizer: { species: 'CuSO₄', element: 'Cu', from: 2, to: 0 }, multipliers: [1, 1], note: 'Kẽm đẩy đồng ra khỏi dung dịch copper(II) sulfate.' },
  { name: 'Fe₂O₃ + CO', left: [[1, 'Fe2O3'], [3, 'CO']], right: [[2, 'Fe'], [3, 'CO2']], reducer: { species: 'CO', element: 'C', from: 2, to: 4 }, oxidizer: { species: 'Fe₂O₃', element: 'Fe', from: 3, to: 0 }, multipliers: [3, 2], note: 'Phản ứng luyện gang trong lò cao.' },
  { name: 'Cu + HNO₃ đặc', left: [[1, 'Cu'], [4, 'HNO3']], right: [[1, 'Cu(NO3)2'], [2, 'NO2'], [2, 'H2O']], reducer: { species: 'Cu', element: 'Cu', from: 0, to: 2 }, oxidizer: { species: 'HNO₃', element: 'N', from: 5, to: 4 }, multipliers: [1, 2], note: 'Khí NO₂ nâu đỏ, độc. Một phần HNO₃ làm môi trường tạo muối.' },
  { name: 'MnO₂ + HCl đặc', left: [[1, 'MnO2'], [4, 'HCl']], right: [[1, 'MnCl2'], [1, 'Cl2'], [2, 'H2O']], reducer: { species: 'HCl', element: 'Cl', from: -1, to: 0 }, oxidizer: { species: 'MnO₂', element: 'Mn', from: 4, to: 2 }, multipliers: [2, 1], note: 'Điều chế chlorine trong phòng thí nghiệm.' },
  { name: 'KMnO₄ + HCl đặc', left: [[2, 'KMnO4'], [16, 'HCl']], right: [[2, 'KCl'], [2, 'MnCl2'], [5, 'Cl2'], [8, 'H2O']], reducer: { species: 'HCl', element: 'Cl', from: -1, to: 0 }, oxidizer: { species: 'KMnO₄', element: 'Mn', from: 7, to: 2 }, multipliers: [5, 1], note: 'Potassium permanganate oxi hóa HCl ngay ở nhiệt độ thường.' },
  { name: 'NH₃ + O₂ (xúc tác Pt)', left: [[4, 'NH3'], [5, 'O2']], right: [[4, 'NO'], [6, 'H2O']], reducer: { species: 'NH₃', element: 'N', from: -3, to: 2 }, oxidizer: { species: 'O₂', element: 'O', from: 0, to: -2 }, multipliers: [2, 5], note: 'Giai đoạn đầu của sản xuất nitric acid.' }
];

const SUB = (f: string): string => f.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]);
export function equationText(r: RedoxReaction, balanced: boolean): string {
  const side = (s: Array<[number, string]>): string => s.map(([k, f]) => `${balanced && k > 1 ? k : ''}${SUB(f)}`).join(' + ');
  return `${side(r.left)} → ${side(r.right)}`;
}
export function coefficientSum(r: RedoxReaction): number {
  return [...r.left, ...r.right].reduce((a, [k]) => a + k, 0);
}
export { signed as formatSigned };
