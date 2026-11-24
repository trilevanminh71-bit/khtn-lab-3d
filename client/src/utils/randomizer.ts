/**
 * utils/randomizer.ts — Sinh thông số ẩn theo seed của từng học sinh (chống chép số liệu).
 * - hashString: băm chuỗi (mã HS + mã lớp + id bài) thành số nguyên 32-bit (FNV-1a).
 * - mulberry32: bộ sinh số giả ngẫu nhiên nhanh, tái lập được: cùng seed → cùng dãy số.
 * - gaussian: nhiễu chuẩn (Box–Muller) mô phỏng sai số ngẫu nhiên của dụng cụ đo.
 * Kết quả: mỗi học sinh có g, E, r, nồng độ... hơi khác nhau nhưng giáo viên tái tạo được.
 */
import type { HiddenParamDef } from '../types/lab';

export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nhiễu phân phối chuẩn N(0,1) từ bộ sinh đều rng */
export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Làm tròn tới số chữ số thập phân */
export function roundTo(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}

/** Seed của phiên học sinh cho một bài cụ thể */
export function sessionSeed(studentCode: string, classCode: string, pluginId: string): number {
  return hashString(`${classCode.trim().toUpperCase()}|${studentCode.trim().toUpperCase()}|${pluginId}`);
}

/** Sinh bộ thông số ẩn trong khoảng [min, max] theo seed */
export function generateHiddenParams(defs: HiddenParamDef[], seed: number): Record<string, number> {
  const rng = mulberry32(seed);
  const out: Record<string, number> = {};
  for (const d of defs) out[d.key] = roundTo(d.min + rng() * (d.max - d.min), d.decimals);
  return out;
}
