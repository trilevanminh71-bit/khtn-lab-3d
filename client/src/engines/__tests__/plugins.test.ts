/**
 * Kiểm thử tích hợp: mọi bài mặc định hợp lệ, và khi học sinh làm đúng quy trình chuẩn
 * (bộ thông số khuyến nghị dưới đây), kết quả suy ra từ số liệu nằm gần giá trị thực.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_PLUGINS, CUSTOM_INDEX_BASE, mergePlugins, pluginByIndex, pluginIndexOf } from '../../plugins/pluginRegistry';
import { buildColumns, cellText, derivedValues } from '../../utils/trialTable';
import { validatePluginDef } from '../../plugins/pluginValidator';
import { getSolver, SOLVER_IDS } from '../solverRegistry';
import { generateHiddenParams, mulberry32 } from '../../utils/randomizer';
import { relativeError } from '../gradingEngine';
import type { LabPluginDef, TrialRecord } from '../../types/lab';
import { MISCONCEPTIONS } from '../../data/misconceptionKB';

/** Quy trình chuẩn: danh sách bộ thông số cho từng lần đo */
const PROTOCOLS: Record<string, Array<Record<string, number>>> = {
  'vl10-toc-do-cong-quang-dien': Array(5).fill({ mode: 0, scale: 0, xE: 20, xF: 70, d: 2, angle: 6 }),
  'vl10-gia-toc-roi-tu-do': [50, 60, 70, 80, 80].map((s) => ({ s, x0: 0 })),
  'vl10-tong-hop-luc': Array(4).fill({ mode: 0, F1: 3, F2: 4, alpha: 60 }),
  'vl10-dong-luong-va-cham': Array(4).fill({ type: 1, m1: 300, m2: 200, v1: 50, v2: 10 }),
  'hh10-lien-ket-cong-hoa-tri': [0, 2, 3, 6, 13].map((mol) => ({ mol })),
  'hh10-oxi-hoa-khu': [0, 3, 4].map((rxn) => ({ rxn, stage: 4 })),
  'hh10-cac-yeu-to-toc-do': Array(5).fill({ system: 1, C: 0.5, T: 35, cat: 1, dt: 30 }),
  'hh10-nhom-halogen': [0, 1, 2, 3].map((sample) => ({ sample })),
  'sh10-te-bao-nhan-so': [0.5, 1, 2, 4].map((r) => ({ r })),
  'sh10-trao-doi-chat-qua-mang': [0.25, 0.3, 0.35, 0.4, 0.45, 0.5].map((Cout) => ({ process: 2, cell: 1, Cout })),
  'sh10-truyen-tin-te-bao': [10, 20, 40, 60, 100].map((L) => ({ mode: 1, target: 0, L })),
  'sh10-enzyme-protease-amylase': [0, 3, 0, 3, 0, 3].map((cond) => ({ enzyme: 0, cond, time: 50 })),
  'sh10-sinh-truong-vi-sinh-vat': [2, 3, 4, 5, 6, 7].map((t) => ({ culture: 0, t, N0: 10, anti: 0, factor: 0 })),
  'vl10-dinh-luat-2-newton': [0.3, 0.5, 0.8, 1.0, 1.2].map((F) => ({ F, m: 100, s: 80 })),
  'vl10-suat-dien-dong-pin': [2, 4, 7, 10, 14, 19].map((R) => ({ R, R0: 1 })),
  'hh10-toc-do-thiosulfate': [15, 25, 35, 45].map((T) => ({ C: 0.1, T })),
  'hh10-xuc-tac-hydrogen-peroxide': [{ catalyst: 0, V: 10, time: 60 }, { catalyst: 1, V: 10, time: 300 }, { catalyst: 2, V: 10, time: 300 }],
  'hh10-enthalpy-zn-cuso4': Array(4).fill({ rxn: 2, C: 0.8, V: 50 }),
  'sh10-quan-sat-te-bao': Array(5).fill(null).map(() => ({ specimen: 1, objective: 1, eyepiece: 10, oil: 0 })),
  'sh10-co-nguyen-sinh': [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5].map((C) => ({ C, time: 15 })),
  'sh10-enzyme-amylase': [15, 25, 30, 35, 40, 45, 55].map((T) => ({ T, pH: 7 })),
  'sh10-chi-so-nguyen-phan': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((field) => ({ sample: 1, field, fix: 20, stain: 15 }))
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
  it('có 23 bài, id không trùng, thứ tự 12 bài đầu giữ nguyên (mã hóa trong QR)', () => {
    expect(BUILTIN_PLUGINS).toHaveLength(23);
    const count = (s: string) => BUILTIN_PLUGINS.filter((p) => p.subject === s).length;
    expect([count('physics'), count('chemistry'), count('biology')]).toEqual([6, 8, 9]);
    expect(new Set(BUILTIN_PLUGINS.map((p) => p.id)).size).toBe(23);
    expect(BUILTIN_PLUGINS.slice(0, 12).map((p) => p.id)).toEqual([
      'vl10-toc-do-cong-quang-dien', 'vl10-gia-toc-roi-tu-do', 'vl10-dinh-luat-2-newton', 'vl10-suat-dien-dong-pin',
      'hh10-toc-do-thiosulfate', 'hh10-xuc-tac-hydrogen-peroxide', 'hh10-chuan-do-permanganate', 'hh10-enthalpy-zn-cuso4',
      'sh10-quan-sat-te-bao', 'sh10-co-nguyen-sinh', 'sh10-enzyme-amylase', 'sh10-chi-so-nguyen-phan'
    ]);
  });
  it('mã QR của bài tự tạo không phụ thuộc số bài mặc định', () => {
    const all = [...mergePlugins([]), { ...BUILTIN_PLUGINS[0], id: 'tu-tao-a' }];
    expect(pluginIndexOf('tu-tao-a', all)).toBe(CUSTOM_INDEX_BASE);
    expect(pluginByIndex(CUSTOM_INDEX_BASE, all)?.id).toBe('tu-tao-a');
  });
  it('bảng số liệu, biểu đồ và điều kiện hiển thị tham chiếu đúng khóa', () => {
    for (const p of BUILTIN_PLUGINS) {
      const keys = new Set(['index', ...p.params.map((x) => x.key), ...p.measurements.map((x) => x.key), ...(p.derived ?? []).map((x) => x.key)]);
      expect(p.charts?.length, p.id).toBeGreaterThan(0);
      for (const c of p.charts ?? []) for (const k of [c.x, c.y, c.groupBy ?? 'index']) expect(keys.has(k), `${p.id}/${c.id}: ${k}`).toBe(true);
      for (const d of [...p.params, ...p.measurements, ...(p.derived ?? [])]) if (d.showIf) expect(p.params.some((x) => x.key === d.showIf!.key), `${p.id}: ${d.key}`).toBe(true);
      for (const o of p.params) if (o.options) expect(o.options.map((x) => x.value), `${p.id}: ${o.key}`).toContain(o.default);
      // Khóa cột phải duy nhất trong từng loại
      expect(new Set(p.params.map((x) => x.key)).size).toBe(p.params.length);
    }
    expect(MISCONCEPTIONS.length).toBeLessThanOrEqual(31);
  });
  it('mọi lựa chọn rời rạc của mọi bài đều đo được, không sinh giá trị vô hạn', () => {
    for (const p of BUILTIN_PLUGINS) {
      const solver = getSolver(p.solverId);
      const hidden = generateHiddenParams(p.hidden, 99);
      const base = Object.fromEntries(p.params.map((x) => [x.key, x.default]));
      const variants = p.params.flatMap((x) => (x.options ? x.options.map((o) => ({ ...base, [x.key]: o.value })) : [{ ...base, [x.key]: x.min }, { ...base, [x.key]: x.max }]));
      for (const params of [base, ...variants]) {
        const ctx = { plugin: p, params, hidden, ppe: { goggles: true, gloves: true, labelCheck: true }, rng: mulberry32(3) };
        const r = solver.measure(ctx);
        for (const [k, v] of Object.entries(r.values)) expect(Number.isFinite(v), `${p.id} ${k} ${JSON.stringify(params)}`).toBe(true);
        solver.preview(ctx);
        solver.insight?.(ctx);
        const t = { index: 1, params, values: r.values, at: 0 };
        solver.summarize?.([t], p);
        const cols = buildColumns(p, [t]);
        const d = derivedValues(p, t, [t]);
        for (const c of cols) expect(cellText(c, t, d)).not.toContain('NaN');
      }
    }
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
        expect(relativeError(est, truth), `${plugin.id} seed=${seed} est=${est} truth=${truth}`).toBeLessThanOrEqual(plugin.result.tolerancePercent);
      }
    });
  }
});
