/**
 * Kiểm thử Tủ dụng cụ (chế độ Tự do thí nghiệm): danh mục hợp lệ, kiểm tra an toàn/bảo hộ, chặn nộp bài.
 */
import { describe, expect, it } from 'vitest';
import { EQUIPMENT, equipmentById, sandboxConflicts, sandboxMissingPpe } from '../../data/equipmentCatalog';
import { BUILTIN_PLUGINS } from '../../plugins/pluginRegistry';
import { checkSubmission } from '../../utils/submitCheck';
import { mulberry32 } from '../../utils/randomizer';

describe('Tủ dụng cụ – Tự do thí nghiệm', () => {
  it('mã dụng cụ duy nhất, tham chiếu dụng cụ và bài học đều tồn tại', () => {
    const ids = new Set(EQUIPMENT.map((e) => e.id));
    expect(ids.size).toBe(EQUIPMENT.length);
    const lessons = new Set(BUILTIN_PLUGINS.map((p) => p.id));
    for (const e of EQUIPMENT) {
      expect(e.name.length).toBeGreaterThan(2);
      expect(e.description.length).toBeGreaterThan(10);
      for (const id of e.pairsWith) expect(ids.has(id), `${e.id} → ${id}`).toBe(true);
      for (const c of e.conflicts) expect(ids.has(c.id), `${e.id} ✗ ${c.id}`).toBe(true);
      for (const l of e.lessons) expect(lessons.has(l), `${e.id} bài ${l}`).toBe(true);
    }
    expect(equipmentById('khong-co')).toBeUndefined();
  });
  it('báo cặp không an toàn một lần, bảo hộ còn thiếu', () => {
    const c = sandboxConflicts(['den-con', 'chai-ethanol', 'coc-thuy-tinh']);
    expect(c).toHaveLength(1);
    expect(sandboxConflicts(['coc-thuy-tinh', 'nhiet-ke'])).toHaveLength(0);
    expect(sandboxMissingPpe(['chai-kmno4'], { goggles: true, gloves: false, labelCheck: false }).sort()).toEqual(['gloves', 'labelCheck']);
    expect(sandboxMissingPpe(['khong-co'], { goggles: false, gloves: false, labelCheck: false })).toEqual([]);
  });
  it('đang ở chế độ tự do thì không nộp được bài', () => {
    const plugin = BUILTIN_PLUGINS[0];
    const r = checkSubmission({ plugin, trials: [], studentValue: '', conclusion: '', startedAt: Date.now(), preAnswers: [], sandbox: true, ctx: { plugin, params: {}, hidden: {}, ppe: { goggles: true, gloves: true, labelCheck: true }, rng: mulberry32(1) } });
    expect(r.blockers[0]).toContain('Tự do thí nghiệm');
  });
});
