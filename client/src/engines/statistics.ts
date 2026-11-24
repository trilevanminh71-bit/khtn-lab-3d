/**
 * engines/statistics.ts — Thống kê dùng chung cho xử lí số liệu thí nghiệm và đánh giá KHKT.
 *  - mean, stdDev (độ lệch chuẩn mẫu), absError (sai số tuyệt đối trung bình theo SGK Vật lí 10)
 *  - linearRegression: hồi quy tuyến tính y = a·x + b (bình phương tối thiểu) + hệ số R²
 *  - welchTTest: kiểm định t hai mẫu độc lập (phương sai không bằng nhau)
 *  - cohenD: độ lớn ảnh hưởng (effect size)
 *  - normalizedGain: hệ số tăng trưởng chuẩn hóa Hake g = (post − pre)/(max − pre)
 */
export function mean(xs: number[]): number {
  if (xs.length === 0) return Number.NaN;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Sai số tuyệt đối trung bình: Δx̄ = (Σ|x̄ − xᵢ|)/n (cách tính trong SGK Vật lí 10 Bài 3) */
export function absError(xs: number[]): number {
  if (xs.length === 0) return Number.NaN;
  const m = mean(xs);
  return xs.reduce((s, x) => s + Math.abs(x - m), 0) / xs.length;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(xs: number[], ys: number[]): Regression {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: Number.NaN, intercept: Number.NaN, r2: Number.NaN };
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return { slope: Number.NaN, intercept: Number.NaN, r2: Number.NaN };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

/** Hàm gamma log (xấp xỉ Lanczos) — phục vụ tính p-value */
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (zz + i);
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Hàm beta chưa đầy đủ chuẩn hóa (liên phân số) */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (xx: number, aa: number, bb: number): number => {
    let c = 1;
    let d = 1 - ((aa + bb) * xx) / (aa + 1);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 200; m++) {
      const m2 = 2 * m;
      let num = (m * (bb - m) * xx) / ((aa + m2 - 1) * (aa + m2));
      d = 1 + num * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + num / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      num = (-(aa + m) * (aa + bb + m) * xx) / ((aa + m2) * (aa + m2 + 1));
      d = 1 + num * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + num / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  };
  if (x < (a + 1) / (a + b + 2)) return (bt * cf(x, a, b)) / a;
  return 1 - (bt * cf(1 - x, b, a)) / b;
}

/** p-value hai phía của phân phối Student t với df bậc tự do */
export function tTwoTailedP(t: number, df: number): number {
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

export interface TTestResult {
  t: number;
  df: number;
  p: number;
}

export function welchTTest(a: number[], b: number[]): TTestResult {
  const va = stdDev(a) ** 2 / a.length;
  const vb = stdDev(b) ** 2 / b.length;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  return { t, df, p: tTwoTailedP(Math.abs(t), df) };
}

/** Cohen's d với độ lệch chuẩn gộp */
export function cohenD(a: number[], b: number[]): number {
  const sa = stdDev(a);
  const sb = stdDev(b);
  const pooled = Math.sqrt(((a.length - 1) * sa * sa + (b.length - 1) * sb * sb) / (a.length + b.length - 2));
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}

/** Hệ số tăng trưởng Hake: g = (post − pre) / (max − pre); pre = max → 0 */
export function normalizedGain(pre: number, post: number, max: number): number {
  if (max - pre <= 0) return 0;
  return (post - pre) / (max - pre);
}

/** Diễn giải Cohen's d theo tiếng Việt */
export function describeEffect(d: number): string {
  const a = Math.abs(d);
  if (a < 0.2) return 'rất nhỏ';
  if (a < 0.5) return 'nhỏ';
  if (a < 0.8) return 'trung bình';
  return 'lớn';
}
