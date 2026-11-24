/**
 * Kiểm chứng công thức Lý – Hóa – Sinh của các bộ giải (giá trị tính tay theo SGK).
 */
import { describe, expect, it } from 'vitest';
import {
  circuitCurrent,
  fitEmf,
  freeFallTime,
  gFromFall,
  newtonAcceleration,
  photogateTrueSpeed,
  quantize,
  terminalVoltage
} from '../physics/physicsSolver';
import {
  enthalpyDeltaT,
  enthalpyFromDeltaT,
  estimateVantHoff,
  h2o2ConcFromO2,
  h2o2MaxO2Ml,
  ironConcentration,
  mixColor,
  quantizeBurette,
  thiosulfateTime,
  titrationEquivalenceMl
} from '../chemistry/chemistrySolver';
import {
  amylaseActivity,
  countField,
  estimateOptimum,
  isoFromPoint,
  mitoticIndex,
  osmoticPotential,
  plasmolysisFraction,
  realSizeUm,
  totalMagnification
} from '../biology/biologySolver';

describe('Vật lí', () => {
  it('tốc độ cuối máng: v = √(2ghk)', () => {
    expect(photogateTrueSpeed(20, 5 / 7)).toBeCloseTo(Math.sqrt(2 * 9.8 * 0.2 * (5 / 7)), 10);
  });
  it('rơi tự do: t = √(2s/g) và g = 2s/t² là hai phép ngược nhau', () => {
    const t = freeFallTime(0.5, 9.8);
    expect(t).toBeCloseTo(0.3194, 4);
    expect(gFromFall(0.5, t)).toBeCloseTo(9.8, 10);
  });
  it('định luật II Newton: a = F/(M+m)', () => {
    expect(newtonAcceleration(0.6, 0.5, 0.1)).toBeCloseTo(1, 10);
  });
  it('mạch kín: I = E/(R+R0+r+RA), U = E − Ir', () => {
    const I = circuitCurrent(1.5, 1, 10, 1);
    expect(I).toBeCloseTo(1.5 / 12.2, 10);
    expect(terminalVoltage(1.5, 1, I)).toBeCloseTo(1.5 - I, 10);
  });
  it('hồi quy U(I) khôi phục đúng E và r', () => {
    const pts = [2, 5, 8, 12, 18].map((R) => {
      const I = circuitCurrent(1.52, 1.3, R, 1);
      return { I, U: terminalVoltage(1.52, 1.3, I) };
    });
    const f = fitEmf(pts);
    expect(f.E).toBeCloseTo(1.52, 8);
    expect(f.r).toBeCloseTo(1.3, 8);
    expect(f.r2).toBeCloseTo(1, 8);
  });
  it('lượng tử hóa theo ĐCNN', () => {
    expect(quantize(0.01234, 0.001)).toBeCloseTo(0.012, 10);
  });
});

describe('Hóa học', () => {
  it("quy tắc Van't Hoff: tăng 10 °C thì t giảm γ lần", () => {
    const t25 = thiosulfateTime(4, 0.1, 25, 2.5);
    const t35 = thiosulfateTime(4, 0.1, 35, 2.5);
    expect(t25 / t35).toBeCloseTo(2.5, 10);
    expect(estimateVantHoff([{ C: 0.1, T: 25, t: t25 }, { C: 0.05, T: 35, t: thiosulfateTime(4, 0.05, 35, 2.5) }])).toBeCloseTo(2.5, 8);
  });
  it('H₂O₂: 10 mL 0,6 M → 74,37 mL O₂ và tính ngược nồng độ', () => {
    const v = h2o2MaxO2Ml(0.6, 10);
    expect(v).toBeCloseTo(74.37, 2);
    expect(h2o2ConcFromO2(v, 10)).toBeCloseTo(0.6, 10);
  });
  it('chuẩn độ: 5Fe²⁺ + MnO₄⁻; 10 mL Fe²⁺ 0,1 M cần 10 mL KMnO₄ 0,02 M', () => {
    expect(titrationEquivalenceMl(0.1, 10, 0.02)).toBeCloseTo(10, 10);
    expect(ironConcentration(9.8, 0.02, 10)).toBeCloseTo(0.098, 10);
    expect(quantizeBurette(9.83)).toBeCloseTo(9.85, 10);
  });
  it('enthalpy: ΔT và ΔrH là hai phép ngược nhau khi không thất thoát', () => {
    const dT = enthalpyDeltaT(-217, 0.5, 50, 0);
    expect(dT).toBeCloseTo(25.96, 2);
    expect(enthalpyFromDeltaT(dT, 0.5, 50)).toBeCloseTo(-217, 8);
    expect(enthalpyFromDeltaT(25, 0.5, 50)).toBeCloseTo(-209, 0);
  });
  it('trộn màu', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('Sinh học', () => {
  it('độ phóng đại & kích thước thật', () => {
    expect(totalMagnification(1, 10)).toBe(100);
    expect(realSizeUm(22, 100)).toBeCloseTo(220, 10);
  });
  it('thế thẩm thấu Ψs = −CRT', () => {
    expect(osmoticPotential(0.4, 25)).toBeCloseTo(-0.991, 3);
  });
  it('co nguyên sinh: 50% tại nồng độ đẳng trương khi cân bằng', () => {
    expect(plasmolysisFraction(0.35, 0.35, 1000)).toBeCloseTo(0.5, 6);
    expect(isoFromPoint(0.38, plasmolysisFraction(0.38, 0.35, 1000))).toBeCloseTo(0.35, 6);
  });
  it('enzyme: hoạt tính cực đại tại nhiệt độ & pH tối ưu', () => {
    expect(amylaseActivity(37, 6.8, 37, 6.8)).toBeCloseTo(1, 10);
    expect(amylaseActivity(70, 6.8, 37, 6.8)).toBeLessThan(0.01);
    const pts = [20, 30, 35, 40, 45, 55].map((T) => ({ T, t: 3 / amylaseActivity(T, 6.8, 37, 6.8) }));
    expect(Math.abs(estimateOptimum(pts) - 37)).toBeLessThan(3);
  });
  it('nguyên phân: đếm tái lập được và MI đúng định nghĩa', () => {
    expect(countField(42, 3, 0.12)).toEqual(countField(42, 3, 0.12));
    expect(mitoticIndex(60, 500)).toBeCloseTo(12, 10);
  });
});
