/**
 * Kiểm thử tích hợp: mọi bài mặc định hợp lệ, và khi học sinh làm đúng quy trình chuẩn
 * (bộ thông số khuyến nghị dưới đây), kết quả suy ra từ số liệu nằm gần giá trị thực.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_PLUGINS, mergePlugins, pluginByIndex, pluginIndexOf } from '../../plugins/pluginRegistry';
import { validatePluginDef } from '../../plugins/pluginValidator';
import { getSolver, SOLVER_IDS } from '../solverRegistry';
import { generateHiddenParams, mulberry32 } from '../../utils/randomizer';
import { relativeError } from '../gradingEngine';
import type { LabPluginDef, TrialRecord } from '../../types/lab';
import { MISCONCEPTIONS } from '../../data/misconceptionKB';

/** Quy trình chuẩn: danh sách bộ thông số cho từng lần đo */
const PROTOCOLS: Record<string, Array<Record<string, number>>> = {
  'vl10-toc-do-cong-quang-dien': Array(6).fill({ h: 15, d: 2 }),
  'vl10-gia-toc-roi-tu-do': [30, 40, 50, 60, 70, 80].map((s) => ({ s })),
  'vl10-dinh-luat-2-newton': [0.3, 0.5, 0.8, 1.0, 1.2].map((F) => ({ F, m: 100, s: 80 })),
  'vl10-suat-dien-dong-pin': [2, 4, 7, 10, 14, 19].map((R) => ({ R, R0: 1 })),
  'hh10-toc-do-thiosulfate': [15, 25, 35, 45].map((T) => ({ C: 0.1, T })),
  'hh10-xuc-tac-hydrogen-peroxide': [{ catalyst: 0, V: 10, time: 60 }, { catalyst: 1, V: 10, time: 300 }, { catalyst: 2, V: 10, time: 300 }],
  'hh10-enthalpy-zn-cuso4': Array(4).fill({ C: 0.5, V: 50 }),
  'sh10-quan-sat-te-bao': Array(5).fill(null).map(() => ({ specimen: 1, objective: 1, eyepiece: 10, oil: 0 })),
  'sh10-co-nguyen-sinh': [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5].map((C) => ({ C, time: 15 })),
  'sh10-enzyme-amylase': [15, 25, 30, 35, 40, 45, 55].map((T) => ({ T, pH: 7 })),
  'sh10-chi-so-nguyen-phan': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((field) => ({ field, stain: 5 }))
};

function runProtocol(plugin: LabPluginDef, seed: number): { est: number; truth: number } {
  const solver = getSolver(plugin.solverId);
  const hidden = generateHiddenParams(plugin.hidden, seed);
  const base: Record<string, number> = {};
  for (const p of plugin.params) base[p.key] = p.default;
  const ppe = { goggles: true, gloves: true, labelCheck: true };
  let protocol = PROTOCOLS[plugin.id];
  if (plugin.id === 'sh10-quan-sat-te-bao') protocol = protocol.map((x) => ({ ...x, focus: hidden.focusBest }));
  if (plugin.id === 'hh10-chuan-do-permanganate') {
    const eq = (hidden.cFe * 10) / (5 * 0.02);
    const added = Math.ceil(eq / 0.05) * 0.05;
    protocol = [0, 1, 2].map(() => ({ acid: 5, added }));
  }
  const trials: TrialRecord[] = protocol.map((params, i) => {
    const full = { ...base, ...params };
    const r = solver.measure({ plugin, params: full, hidden, ppe, rng: mulberry32(seed + i * 97) });
    return { index: i + 1, params: full, values: r.values, at: i };
  });
  const ctx = { plugin, params: trials[trials.length - 1].params, hidden, ppe, rng: mulberry32(seed) };
  return { est: solver.estimateFromTrials(trials, ctx), truth: solver.trueResult(ctx) };
}

describe('Danh mục bài học', () => {
  it('có đúng 12 bài, 4 bài mỗi môn, id không trùng', () => {
    expect(BUILTIN_PLUGINS).toHaveLength(12);
    for (const s of ['physics', 'chemistry', 'biology']) expect(BUILTIN_PLUGINS.filter((p) => p.subject === s)).toHaveLength(4);
    expect(new Set(BUILTIN_PLUGINS.map((p) => p.id)).size).toBe(12);
  });
  it('mọi bài vượt qua bộ kiểm tra cấu trúc và tham chiếu ngộ nhận tồn tại', () => {
    const misIds = new Set(MISCONCEPTIONS.map((m) => m.id));
    for (const p of BUILTIN_PLUGINS) {
      const v = validatePluginDef(p, SOLVER_IDS);
      expect(v.ok, `${p.id}: ${v.ok ? '' : v.errors.join(';')}`).toBe(true);
      for (const q of [...p.preQuiz, ...p.postQuiz]) if (q.misconceptionId) expect(misIds.has(q.misconceptionId), q.misconceptionId).toBe(true);
      for (const s of p.steps) expect(['click', 'snap', 'adjust', 'measure', 'observe', 'record']).toContain(s.action);
    }
  });
  it('chỉ số QR của bài là song ánh', () => {
    const all = mergePlugins([]);
    BUILTIN_PLUGINS.forEach((p, i) => {
      expect(pluginIndexOf(p.id, all)).toBe(i);
      expect(pluginByIndex(i, all)?.id).toBe(p.id);
    });
  });
});

describe('Quy trình chuẩn cho kết quả trong sai số cho phép', () => {
  for (const plugin of BUILTIN_PLUGINS) {
    it(plugin.shortTitle, () => {
      for (const seed of [11, 2026, 987654]) {
        const { est, truth } = runProtocol(plugin, seed);
        expect(Number.isFinite(est), `${plugin.id} est=${est}`).toBe(true);
        // Enthalpy có sai số hệ thống do thất thoát nhiệt — vẫn phải nằm trong ngưỡng cho phép
        expect(relativeError(est, truth), `${plugin.id} est=${est} truth=${truth}`).toBeLessThanOrEqual(plugin.result.tolerancePercent);
      }
    });
  }
});
