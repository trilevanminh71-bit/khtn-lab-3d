/**
 * data/khktBenchmarkSeed.ts — Dữ liệu MẪU đối chứng cho trình diễn KHKT (80 học sinh).
 *  - Lớp 10T1 (thực nghiệm, 40 HS): học với KHTN-Lab 3D.
 *  - Lớp 10T2 (đối chứng, 40 HS): học theo cách truyền thống.
 * Sinh tái lập được bằng seed cố định → mọi máy cho ra cùng bộ số liệu.
 * LƯU Ý TRUNG THỰC KHOA HỌC: đây là dữ liệu mô phỏng để minh họa quy trình phân tích; khi dự thi,
 * nhóm phải thay bằng số liệu thực nghiệm thật thu từ Cổng giáo viên (Xuất CSV).
 */
import type { SubmissionRecord } from '../types/lab';
import { BUILTIN_PLUGINS } from '../plugins/pluginRegistry';
import { MISCONCEPTIONS } from './misconceptionKB';
import { gaussian, mulberry32 } from '../utils/randomizer';

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export function generateBenchmarkSeed(): SubmissionRecord[] {
  const rng = mulberry32(20261010);
  const out: SubmissionRecord[] = [];
  const base = Date.UTC(2026, 9, 5);
  const groups = [
    { cls: '10T1', preMu: 1.35, postMu: 2.45, scoreMu: 82, errMu: 3.5 },
    { cls: '10T2', preMu: 1.4, postMu: 1.85, scoreMu: 66, errMu: 7.5 }
  ];
  for (const g of groups) {
    for (let i = 1; i <= 40; i++) {
      // Cố định 12 bài và 21 ngộ nhận ban đầu để bộ dữ liệu mẫu không đổi khi bổ sung bài mới
      const plugin = BUILTIN_PLUGINS[Math.floor(rng() * 12)];
      const pre = Math.round(clamp(g.preMu + 0.8 * gaussian(rng), 0, 3));
      const post = Math.round(clamp(Math.max(pre, g.postMu + 0.6 * gaussian(rng)), 0, 3));
      const mis = MISCONCEPTIONS.slice(0, 21).filter((m) => m.subject === plugin.subject && rng() < (g.cls === '10T1' ? 0.12 : 0.3)).map((m) => m.id);
      const code = `HS${String(i).padStart(2, '0')}`;
      const err = Math.round(clamp(g.errMu + 2.5 * gaussian(rng), 0.2, 40) * 10) / 10;
      out.push({
        uid: `seed-${g.cls}-${code}`,
        pluginId: plugin.id,
        studentName: `Học sinh ${g.cls}-${i}`,
        studentCode: code,
        classCode: g.cls,
        score: Math.round(clamp(g.scoreMu + 10 * gaussian(rng), 20, 100)),
        preScore: pre,
        preMax: 3,
        postScore: post,
        postMax: 3,
        relErrorPercent: err,
        resultValue: 1 + err / 100,
        trueValue: 1,
        misconceptions: mis,
        likert: [0, 1, 2, 3, 4].map(() => Math.round(clamp((g.cls === '10T1' ? 4.4 : 3.6) + 0.7 * gaussian(rng), 1, 5))),
        durationSec: Math.round(clamp(1200 + 300 * gaussian(rng), 400, 2700)),
        createdAt: base + Math.floor(rng() * 20) * 86400000,
        synced: true,
        source: 'seed'
      });
    }
  }
  return out;
}
