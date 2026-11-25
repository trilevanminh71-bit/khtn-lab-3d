/**
 * Kiểm chứng công thức của các bài thực hành và bài mở rộng (giá trị tính tay theo SGK).
 */
import { describe, expect, it } from 'vitest';
import { collide, deviationPercent, fallTimeBetweenGates, freeFall2Solver, inclineAcceleration, mc964Solver, mcSpeed, momentumOf, parallelD1, resultantForce, timeAt } from '../physics/practicalSolver';
import { bondClass, concentrationDrop, electronegativityGap, ENTHALPY_REACTIONS, HALOGENS, halidePermutation, initialRate, MOLECULES, standardEnthalpy } from '../chemistry/conceptSolver';
import { coefficientSum, equationText, oxidationStates, parseFormula, REDOX_REACTIONS, RedoxError } from '../chemistry/redox';
import { CARRYING_CAPACITY, conditionFactor, countDivisionField, microbeCount, osmoticVolumeChange, receptorResponse, sphereSurface, sphereVolume, transportRate } from '../biology/conceptSolver';
import { PHASE_SHARES } from '../biology/biologySolver';
import type { TrialRecord } from '../../types/lab';

const trial = (params: Record<string, number>, values: Record<string, number>, index = 1): TrialRecord => ({ index, params, values, at: 0 });

describe('Bài 6 – đo tốc độ', () => {
  it('gia tốc máng nghiêng và thời gian qua cổng', () => {
    const a = inclineAcceleration(30, 5 / 7);
    expect(a).toBeCloseTo(3.5, 10);
    expect(timeAt(1.75, a)).toBeCloseTo(1, 10);
  });
  it('MODE A↔B: v = s/t; MODE A, B: v = d/t', () => {
    expect(mcSpeed(trial({ mode: 0, d: 2 }, { s: 50, t: 0.625 }))).toBeCloseTo(0.8, 10);
    expect(mcSpeed(trial({ mode: 1, d: 2 }, { t: 0.025 }))).toBeCloseTo(0.8, 10);
    expect(mcSpeed(trial({ mode: 2, d: 2 }, { t: 0 }))).toBeNaN();
  });
  it('xử lí số liệu: Δs = nửa ĐCNN, có cảnh báo khi đo dưới 3 lần', () => {
    const q = { mode: 0, scale: 0, xE: 20, xF: 70, d: 2, angle: 6 };
    const lines = mc964Solver.summarize!([trial(q, { s: 50, t: 0.64 }), trial(q, { s: 50, t: 0.642 }, 2)], undefined as never);
    expect(lines.find((l) => l.label.startsWith('s̄'))!.value).toContain('0,05');
    expect(lines[0].status).toBe('warn');
  });
});

describe('Bài 11 – rơi tự do', () => {
  it('cổng E sát điểm thả: 2s/t² = g; đặt thấp hơn thì g tính được lớn hơn', () => {
    const t0 = fallTimeBetweenGates(0.5, 9.8, 0);
    expect((2 * 0.5) / t0 ** 2).toBeCloseTo(9.8, 10);
    expect((2 * 0.5) / fallTimeBetweenGates(0.5, 9.8, 0.01) ** 2).toBeGreaterThan(10);
  });
  it('Δg từng lần và kết quả ḡ ± Δḡ', () => {
    const ts = [0.319, 0.32, 0.321].map((t, i) => trial({ s: 50, x0: 0 }, { t }, i + 1));
    const g = ts.map((t) => 1 / t.values.t ** 2);
    const bar = (g[0] + g[1] + g[2]) / 3;
    expect(freeFall2Solver.derive!(ts[0], ts, undefined as never).dg).toBeCloseTo(Math.abs(g[0] - bar), 10);
    expect(freeFall2Solver.summarize!(ts, undefined as never).some((l) => l.value.startsWith('g = 9,77'))).toBe(true);
  });
});

describe('Bài 22 – tổng hợp lực', () => {
  it('quy tắc hình bình hành và lực song song', () => {
    expect(resultantForce(3, 4, 90)).toBeCloseTo(5, 10);
    expect(resultantForce(3, 4, 0)).toBeCloseTo(7, 10);
    expect(resultantForce(3, 4, 180)).toBeCloseTo(1, 10);
    expect(resultantForce(3, 3, 180)).toBeCloseTo(0, 6);
    const d1 = parallelD1(2, 3, 50);
    expect(d1).toBeCloseTo(30, 10);
    expect(d1 / (50 - d1)).toBeCloseTo(3 / 2, 10);
    expect(deviationPercent(5, 4.85)).toBeCloseTo(3, 10);
    expect(deviationPercent(0, 0.1)).toBeNaN();
  });
});

describe('Bài 30 – va chạm', () => {
  it('động lượng bảo toàn; va chạm đàn hồi bảo toàn động năng', () => {
    for (const [m1, m2, v1, v2] of [[0.3, 0.2, 0.5, 0], [0.1, 0.5, 0.8, 0.2], [0.2, 0.2, 0.4, 0]]) {
      for (const type of [0, 1]) {
        const [a, b] = collide(type, m1, m2, v1, v2);
        expect(m1 * a + m2 * b).toBeCloseTo(m1 * v1 + m2 * v2, 12);
        if (type === 1) expect(m1 * a * a + m2 * b * b).toBeCloseTo(m1 * v1 * v1 + m2 * v2 * v2, 12);
        else expect(a).toBe(b);
      }
    }
  });
  it('xe bật ngược được tính dấu âm', () => {
    const m = momentumOf(trial({ type: 1, m1: 100, m2: 300 }, { t1: 0.2, t2: 0, t1p: 0.4, dir1: -1, t2p: 0.4 }));
    expect(m.before).toBeCloseTo(0.05, 10);
    expect(m.after).toBeCloseTo(0.05, 10);
  });
});

describe('Bài 12 – liên kết', () => {
  it('phân loại theo |Δχ| đúng ngưỡng 0,4 và 1,7', () => {
    expect([0, 0.39, 0.4, 1.69, 1.7].map(bondClass)).toEqual([1, 1, 2, 2, 3]);
    const by = (f: string) => MOLECULES.find((m) => m.formula === f)!;
    expect(bondClass(electronegativityGap(by('CO₂')))).toBe(2);
    expect(by('CO₂').polar).toBe(false);
    expect(bondClass(electronegativityGap(by('NaCl')))).toBe(3);
    expect([by('N₂').sigma, by('N₂').pi]).toEqual([1, 2]);
    expect(by('NH₄⁺').dative).toBe(1);
  });
});

describe('Bài 15 – số oxi hóa', () => {
  const ox = (f: string, el: string) => oxidationStates(f).states[el];
  it('tách công thức', () => {
    expect(parseFormula('Fe2(SO4)3').counts).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(parseFormula('SO₄²⁻')).toEqual({ counts: { S: 1, O: 4 }, charge: -2 });
    expect(parseFormula('MnO4^-').charge).toBe(-1);
    expect(parseFormula('Fe3+')).toEqual({ counts: { Fe: 1 }, charge: 3 });
    expect(parseFormula('NH4+')).toEqual({ counts: { N: 1, H: 4 }, charge: 1 });
    expect(parseFormula('Fe^3+')).toEqual({ counts: { Fe: 1 }, charge: 3 });
  });
  it('quy tắc chuẩn và các ngoại lệ', () => {
    expect(ox('KMnO4', 'Mn')).toBe(7);
    expect(ox('K2Cr2O7', 'Cr')).toBe(6);
    expect(ox('H2SO4', 'S')).toBe(6);
    expect(ox('HNO3', 'N')).toBe(5);
    expect(ox('NH3', 'N')).toBe(-3);
    expect(ox('NH4+', 'N')).toBe(-3);
    expect(ox('H2O2', 'O')).toBe(-1);
    expect(ox('Na2O2', 'O')).toBe(-1);
    expect(ox('Na2O', 'O')).toBe(-2);
    expect(ox('OF2', 'O')).toBe(2);
    expect(ox('NaH', 'H')).toBe(-1);
    expect(ox('CaH2', 'H')).toBe(-1);
    expect(ox('Cl2', 'Cl')).toBe(0);
    expect(ox('HClO4', 'Cl')).toBe(7);
    expect(ox('FeCl3', 'Fe')).toBe(3);
    expect(ox('CuS', 'Cu')).toBe(2);
    expect(ox('Fe2(SO4)3', 'Fe')).toBe(3);
    expect(ox('Cu(NO3)2', 'Cu')).toBe(2);
    expect(ox('Fe3O4', 'Fe')).toBeCloseTo(8 / 3, 10);
    expect(ox('S2O3^2-', 'S')).toBe(2);
  });
  it('báo lỗi tiếng Việt khi nhập sai', () => {
    expect(() => parseFormula('Xx2')).toThrow(RedoxError);
    expect(() => parseFormula('Fe2(SO4')).toThrow(/ngoặc/);
    expect(() => parseFormula('')).toThrow(RedoxError);
  });
  it('mọi phản ứng mẫu cân bằng nguyên tố và electron', () => {
    for (const r of REDOX_REACTIONS) {
      const total = (side: Array<[number, string]>) => {
        const out: Record<string, number> = {};
        for (const [k, f] of side) for (const [el, n] of Object.entries(parseFormula(f).counts)) out[el] = (out[el] ?? 0) + k * n;
        return out;
      };
      expect(total(r.left), r.name).toEqual(total(r.right));
      const [x, y] = r.multipliers;
      expect(x * (r.reducer.to - r.reducer.from), r.name).toBe(y * (r.oxidizer.from - r.oxidizer.to));
    }
    expect(coefficientSum(REDOX_REACTIONS[4])).toBe(35);
    expect(equationText(REDOX_REACTIONS[0], true)).toBe('Zn + CuSO₄ → ZnSO₄ + Cu');
  });
  it('số oxi hóa khai báo trong phản ứng khớp bộ tính', () => {
    for (const r of REDOX_REACTIONS) {
      expect(oxidationStates(r.reducer.species).states[r.reducer.element], r.name).toBe(r.reducer.from);
      expect(oxidationStates(r.oxidizer.species).states[r.oxidizer.element], r.name).toBe(r.oxidizer.from);
    }
  });
});

describe('Bài 17, 19, 23', () => {
  it('ΔrH° từ ΔfH°: tỏa nhiệt âm, thu nhiệt dương', () => {
    expect(ENTHALPY_REACTIONS.map(standardEnthalpy)).toEqual([-218.7, -55.8, 31.4, 25.7]);
  });
  it('các yếu tố ảnh hưởng tốc độ', () => {
    const q = { system: 0, C: 0.5, T: 25, area: 0, cat: 0, P: 1, dt: 30 };
    const v = (x: Partial<typeof q>) => initialRate({ ...q, ...x }, 4e-4, 2);
    expect(v({ C: 1 }) / v({})).toBeCloseTo(2, 10);
    expect(v({ T: 45 }) / v({})).toBeCloseTo(4, 10);
    expect(v({ area: 2 })).toBeGreaterThan(v({ area: 1 }));
    expect(v({ system: 1, cat: 1 })).toBeGreaterThan(v({ system: 1 }));
    expect(v({ system: 2, P: 2 }) / v({ system: 2 })).toBeCloseTo(8, 10);
    expect(concentrationDrop({ ...q, T: 55, area: 2, dt: 60, C: 0.1 }, 5e-4, 3)).toBeLessThanOrEqual(0.09 + 1e-12);
  });
  it('hoán vị ion halide: 24 cách, đủ 4 ion', () => {
    const all = Array.from({ length: 24 }, (_, k) => halidePermutation(k).join(''));
    expect(new Set(all).size).toBe(24);
    for (const s of all) expect([...s].sort().join('')).toBe('0123');
    expect(HALOGENS.map((x) => x.precipitate)).toEqual([0, 1, 2, 3]);
  });
});

describe('Sinh học mở rộng', () => {
  it('S/V = 3/r', () => {
    expect(sphereSurface(0.5) / sphereVolume(0.5)).toBeCloseTo(6, 10);
  });
  it('vận chuyển qua màng', () => {
    expect(transportRate(0, 0.1, 5, 0.15)).toBe(0);
    expect(transportRate(0, 0.05, 5, 0.15)).toBeLessThan(0);
    expect(transportRate(1, 0.8, 5, 0.15) - transportRate(1, 0.7, 5, 0.15)).toBeLessThan(transportRate(1, 0.2, 5, 0.15) - transportRate(1, 0.1, 5, 0.15));
    expect(osmoticVolumeChange(0.32, 0.32, false)).toBe(0);
    expect(osmoticVolumeChange(0, 0.32, false)).toBe(12);
    expect(osmoticVolumeChange(0, 0.32, true)).toBeGreaterThan(12);
  });
  it('đáp ứng 50% tại L = Kd; điều kiện enzyme', () => {
    expect(receptorResponse(30, 30)).toBe(50);
    expect(conditionFactor(0, 2, 0.25)).toBe(0);
    expect(conditionFactor(1, 3, 0.25)).toBe(0.25);
  });
  it('đường cong sinh trưởng có đủ 4 pha; nuôi cấy liên tục không suy vong', () => {
    const q = { N0: 10, culture: 0, anti: 0, factor: 0, t: 0 };
    const N = (t: number, x: object = {}) => microbeCount({ ...q, t, ...x }, 30, 1);
    expect(N(0.5)).toBe(1e4);
    expect(N(2) / N(1.5)).toBeCloseTo(2, 10);
    expect(N(12)).toBe(CARRYING_CAPACITY);
    expect(N(28)).toBeLessThan(CARRYING_CAPACITY);
    expect(N(28, { culture: 1 })).toBe(CARRYING_CAPACITY / 2);
    expect(N(5, { anti: 1 })).toBeLessThan(1e4);
    expect(N(5, { anti: 2 })).toBe(N(5));
    expect(N(5, { factor: 1 })).toBe(1e4);
  });
  it('đếm vi trường tái lập được', () => {
    expect(countDivisionField(7, 3, 0.15, PHASE_SHARES)).toEqual(countDivisionField(7, 3, 0.15, PHASE_SHARES));
  });
});
