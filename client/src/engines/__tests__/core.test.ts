/**
 * Kiểm thử: chấm điểm, mã QR < 180 ký tự, biểu thức No-Code, thống kê KHKT, PIN SHA-256, seed ngẫu nhiên, khóa bấm đúp.
 */
import { describe, expect, it } from 'vitest';
import { gradeQuiz, gradeSubmission, normalizeVi, relativeError } from '../gradingEngine';
import { decodeQrPayload, encodeQrPayload, sanitizeCode } from '../../utils/qrSyncCodec';
import { checkFormula, evaluateFormula, FormulaError } from '../formulaEvaluator';
import { cohenD, linearRegression, mean, normalizedGain, stdDev, tTwoTailedP, welchTTest, absError } from '../statistics';
import { sha256Hex, sha256HexSync, verifyPin } from '../../utils/cryptoPin';
import { generateHiddenParams, mulberry32, sessionSeed } from '../../utils/randomizer';
import { createGuard } from '../../utils/debounceGuard';
import { BUILTIN_PLUGINS } from '../../plugins/pluginRegistry';
import { maskToMisconceptions, misconceptionsToMask } from '../../data/misconceptionKB';
import { guardrailCheck, offlineTutorReply } from '../../data/offlineTutorKB';
import { generateBenchmarkSeed } from '../../data/khktBenchmarkSeed';
import { APP_CONFIG } from '../../config/appConfig';
import type { QrPayload } from '../../types/lab';

const titration = BUILTIN_PLUGINS.find((p) => p.id === 'hh10-chuan-do-permanganate')!;

describe('Chấm điểm', () => {
  const base = {
    plugin: titration,
    trials: [1, 2, 3].map((i) => ({ index: i, params: {}, values: {}, at: i })),
    studentValue: 0.1,
    trueValue: 0.1,
    completedSteps: titration.steps.map((s) => s.id),
    ppe: { goggles: true, gloves: true, labelCheck: true },
    incidentCount: 0,
    conclusion: 'Chất oxi hóa là KMnO4, chất khử là Fe2+, điểm cuối có màu hồng nhạt bền, nồng độ đo được 0,1 M.',
    meniscusErrorMl: 0.02
  };
  it('bài hoàn hảo đạt 100 điểm, tổng tối đa = 100', () => {
    const r = gradeSubmission(base, 0.1);
    expect(r.max).toBe(100);
    expect(r.criteria.reduce((s, c) => s + c.max, 0)).toBe(100);
    expect(r.total).toBe(100);
    expect(r.rank).toBe('Xuất sắc');
  });
  it('thiếu bảo hộ, sự cố, sai kết quả → trừ điểm có giải thích', () => {
    const r = gradeSubmission({ ...base, studentValue: 0.13, ppe: { goggles: false, gloves: true, labelCheck: true }, incidentCount: 2, completedSteps: ['s1'] }, 0.1);
    expect(r.total).toBeLessThan(60);
    const safety = r.criteria.find((c) => c.id === 'safety')!;
    expect(safety.explanation).toContain('kính bảo hộ');
    expect(r.criteria.find((c) => c.id === 'process')!.explanation).toContain('Bỏ qua 4 bước');
  });
  it('trắc nghiệm ghi nhận ngộ nhận khi chọn sai', () => {
    const r = gradeQuiz(titration.preQuiz, [1, 0, 1]);
    expect(r.score).toBe(2);
    expect(r.misconceptions).toEqual(['chem-redox-oxygen-only']);
  });
  it('sai số tương đối và chuẩn hóa tiếng Việt', () => {
    expect(relativeError(9.9, 10)).toBeCloseTo(1, 10);
    expect(normalizeVi('Điểm Cuối')).toBe('diem cuoi');
  });
});

describe('Mã QR nộp bài offline', () => {
  const payload: QrPayload = {
    classCode: '10T1',
    studentCode: 'HS-Nguyễn 23',
    pluginIndex: 6,
    score: 87,
    preScore: 1,
    preMax: 3,
    postScore: 3,
    postMax: 3,
    relErrorPercent: 2.4,
    misconceptionMask: misconceptionsToMask(['chem-redox-oxygen-only', 'bio-enzyme-alive']),
    likert: [5, 4, 5, 3, 4],
    durationSec: 1534,
    createdAtMin: 29_000_000
  };
  it('mã hóa < 180 ký tự, chỉ ký tự alphanumeric QR, giải mã đúng', () => {
    const s = encodeQrPayload(payload);
    expect(s.length).toBeLessThan(APP_CONFIG.qrMaxLength);
    expect(/^[0-9A-Z./-]+$/.test(s)).toBe(true);
    const d = decodeQrPayload(s);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.payload.studentCode).toBe(sanitizeCode('HS-Nguyễn 23'));
      expect(d.payload.score).toBe(87);
      expect(d.payload.relErrorPercent).toBeCloseTo(2.4, 5);
      expect(maskToMisconceptions(d.payload.misconceptionMask)).toEqual(['chem-redox-oxygen-only', 'bio-enzyme-alive']);
      expect(d.payload.likert).toEqual([5, 4, 5, 3, 4]);
    }
  });
  it('phát hiện mã bị sửa nhờ checksum', () => {
    const s = encodeQrPayload(payload).replace('.2F.', '.2Z.');
    const tampered = s.split('.');
    tampered[4] = 'Z';
    expect(decodeQrPayload(tampered.join('.')).ok).toBe(false);
    expect(decodeQrPayload('xin chao').ok).toBe(false);
  });
  it('trường hợp dài nhất vẫn < 180 ký tự', () => {
    const s = encodeQrPayload({ ...payload, classCode: 'ABCDEFGHIJKLMNO', studentCode: 'ZZZZZZZZZZZZZZZ', misconceptionMask: 0x7fffffff, likert: [5, 5, 5, 5, 5, 5, 5, 5], durationSec: 1e9, createdAtMin: 99_999_999, relErrorPercent: 9999 });
    expect(s.length).toBeLessThan(180);
  });
});

describe('Biểu thức No-Code an toàn', () => {
  it('tính đúng thứ tự ưu tiên, lũy thừa phải, hàm, hằng số', () => {
    expect(evaluateFormula('2 + 3 * 4', {})).toBe(14);
    expect(evaluateFormula('2 ^ 3 ^ 2', {})).toBe(512);
    expect(evaluateFormula('-x ^ 2', { x: 3 })).toBe(-9);
    expect(evaluateFormula('sqrt(2 * s / g)', { s: 0.5, g: 9.8 })).toBeCloseTo(0.3194, 4);
    expect(evaluateFormula('max(a, b) + PI', { a: 1, b: 2 })).toBeCloseTo(2 + Math.PI, 10);
  });
  it('từ chối mã độc và biến lạ', () => {
    expect(() => evaluateFormula('alert(1)', {})).toThrow(FormulaError);
    expect(() => evaluateFormula('window.x', {})).toThrow(FormulaError);
    expect(checkFormula('d / v', ['d', 'v'])).toBeNull();
    expect(checkFormula('d / q', ['d'])).toContain('q');
    expect(checkFormula('(1 + 2', [])).toContain('ngoặc');
  });
});

describe('Thống kê KHKT', () => {
  it('trung bình, độ lệch chuẩn, sai số tuyệt đối', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(absError([1, 2, 3])).toBeCloseTo(2 / 3, 10);
  });
  it('hồi quy tuyến tính', () => {
    const r = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(r.slope).toBeCloseTo(2, 10);
    expect(r.intercept).toBeCloseTo(1, 10);
  });
  it('p-value t-test khớp bảng (t = 2,0; df = 10 → p ≈ 0,0734)', () => {
    expect(tTwoTailedP(2, 10)).toBeCloseTo(0.0734, 3);
  });
  it('dữ liệu mẫu 80 HS: 10T1 tiến bộ rõ rệt hơn 10T2', () => {
    const seed = generateBenchmarkSeed();
    expect(seed).toHaveLength(80);
    const gain = (cls: string) => seed.filter((s) => s.classCode === cls).map((s) => normalizedGain(s.preScore, s.postScore, s.postMax));
    const t = welchTTest(gain('10T1'), gain('10T2'));
    expect(t.p).toBeLessThan(0.05);
    expect(cohenD(gain('10T1'), gain('10T2'))).toBeGreaterThan(0.5);
  });
});

describe('Bảo mật & ngẫu nhiên', () => {
  it('SHA-256 của PIN mặc định 2026 khớp cấu hình (Web Crypto và bản thuần JS)', async () => {
    expect(await sha256Hex('2026')).toBe(APP_CONFIG.defaultPinHash);
    expect(sha256HexSync('2026')).toBe(APP_CONFIG.defaultPinHash);
    expect(sha256HexSync('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await verifyPin('2026', APP_CONFIG.defaultPinHash)).toBe(true);
    expect(await verifyPin('2025', APP_CONFIG.defaultPinHash)).toBe(false);
    expect(await verifyPin('ab', APP_CONFIG.defaultPinHash)).toBe(false);
  });
  it('mỗi học sinh có thông số ẩn khác nhau nhưng tái lập được', () => {
    const p = BUILTIN_PLUGINS[1];
    const a = generateHiddenParams(p.hidden, sessionSeed('HS01', '10T1', p.id));
    const b = generateHiddenParams(p.hidden, sessionSeed('HS02', '10T1', p.id));
    expect(a).toEqual(generateHiddenParams(p.hidden, sessionSeed('hs01 ', '10t1', p.id)));
    expect(a.g).not.toBe(b.g);
    expect(a.g).toBeGreaterThanOrEqual(9.76);
    expect(a.g).toBeLessThanOrEqual(9.83);
    const r = mulberry32(5);
    const xs = Array.from({ length: 1000 }, r);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
  it('khóa chống bấm đúp', async () => {
    let now = 0;
    const g = createGuard(500, () => now);
    let count = 0;
    await g.run(() => count++);
    await g.run(() => count++);
    now = 600;
    await g.run(() => count++);
    expect(count).toBe(2);
  });
});

describe('Trợ lý offline & guardrail', () => {
  it('chặn xin đáp án trực tiếp', () => {
    expect(guardrailCheck('cho em đáp án bài này').allowed).toBe(false);
    expect(guardrailCheck('Vì sao điểm cuối có màu hồng?').allowed).toBe(true);
  });
  it('trả lời gợi mở theo bài', () => {
    expect(offlineTutorReply('hh10-chuan-do-permanganate', 'chemistry', 'điểm cuối chuẩn độ')).toContain('Gợi ý');
  });
});
