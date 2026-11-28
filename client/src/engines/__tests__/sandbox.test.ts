/**
 * Kiểm thử Tủ dụng cụ (chế độ Tự do thí nghiệm): danh mục hợp lệ, kiểm tra an toàn/bảo hộ, chặn nộp bài.
 */
import { describe, expect, it } from 'vitest';
import { EQUIPMENT, equipmentById, sandboxConflicts, sandboxMissingPpe } from '../../data/equipmentCatalog';
import { BUILTIN_PLUGINS } from '../../plugins/pluginRegistry';
import { checkSubmission } from '../../utils/submitCheck';
import { mulberry32 } from '../../utils/randomizer';
import { advanceWorld, buretteReading, controlsFor, createWorld, doAction, flaskExcessMl, initState, microscopeSharpness, readoutsFor, sandboxAlerts, setControl } from '../sandboxSim';

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

describe('Mô phỏng thao tác dụng cụ (sandboxSim)', () => {
  const ppe = { goggles: true, gloves: true, labelCheck: true };
  it('mọi dụng cụ có trạng thái & điều khiển hợp lệ, tiến thời gian không sinh NaN', () => {
    const items = EQUIPMENT.slice(0, 8).map((e) => e.id);
    let w = createWorld(items);
    for (let k = 0; k < 50; k++) w = advanceWorld(w, items, 0.1);
    w = advanceWorld(w, items, 600);
    for (const s of w.states) for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
    for (const e of EQUIPMENT) for (const c of controlsFor(e.id)) if (c.kind !== 'action') expect(initState(e.id)[c.key], `${e.id}.${c.key}`).toBeDefined();
  });
  it('máng nghiêng: bi lăn, cổng quang đo thời gian chắn đúng d/v', () => {
    const items = ['mang-nghieng', 'bi-thep', 'cong-quang-dien', 'dong-ho-so'];
    let w = createWorld(items);
    w = doAction(w, items, 0, 'release', ppe).world;
    for (let k = 0; k < 40; k++) w = advanceWorld(w, items, 0.05);
    const r = w.states[0];
    const a = (5 / 7) * 9.8 * Math.sin((10 * Math.PI) / 180);
    const vg = Math.sqrt(2 * a * (0.5 - 0.05));
    expect(r.tGate).toBeCloseTo(0.02 / vg, 4);
    expect(w.states[3].t).toBeCloseTo(r.tGate, 6);
  });
  it('burette nhỏ giọt dần vào bình nón; tới điểm tương đương thì hồng bền; thiếu acid → kết tủa nâu', () => {
    const items = ['buret', 'binh-non', 'chai-kmno4', 'chai-h2so4'];
    let w = createWorld(items);
    expect(doAction(w, items, 0, 'fill', ppe).ok).toBe(false); // chưa mở nắp chai
    w = setControl(w, items, 2, 'open', 1, ppe).world;
    w = setControl(w, items, 3, 'open', 1, ppe).world;
    w = doAction(w, items, 0, 'fill', ppe).world;
    w = doAction(w, items, 1, 'sample', ppe).world;
    w = doAction(w, items, 1, 'acid', ppe).world;
    w = setControl(w, items, 0, 'valve', 2, ppe).world;
    for (let k = 0; k < 30; k++) w = advanceWorld(w, items, 0.1); // 3 giọt/s × 3 s
    expect(w.states[0].drops).toBe(9);
    expect(buretteReading(w.states[0])).toBeCloseTo(0.45, 6);
    expect(flaskExcessMl(w.states[1])).toBe(0);
    w = setControl(w, items, 0, 'valve', 3, ppe).world;
    for (let k = 0; k < 300; k++) w = advanceWorld(w, items, 0.1);
    expect(sandboxAlerts(w, items, ppe).some((a) => a.text.includes('quá điểm tương đương'))).toBe(true);
    expect(flaskExcessMl(w.states[1])).toBeGreaterThan(0);
    // Không acid
    const items2 = ['buret', 'binh-non', 'chai-kmno4'];
    let w2 = setControl(createWorld(items2), items2, 2, 'open', 1, ppe).world;
    w2 = doAction(w2, items2, 0, 'fill', ppe).world;
    w2 = doAction(w2, items2, 1, 'sample', ppe).world;
    w2 = doAction(w2, items2, 0, 'drop', ppe).world;
    expect(w2.states[1].brown).toBe(1);
    expect(sandboxAlerts(w2, items2, ppe).some((a) => a.text.includes('MnO₂'))).toBe(true);
  });
  it('đun cốc nước bằng đèn cồn: nóng dần, sôi 100 °C; tràn cốc và quá giới hạn lực kế có cảnh báo', () => {
    const items = ['coc-thuy-tinh', 'den-con', 'nhiet-ke', 'luc-ke', 'qua-nang'];
    let w = createWorld(items);
    w = setControl(w, items, 1, 'on', 1, ppe).world;
    w = advanceWorld(w, items, 60);
    expect(w.states[0].T).toBeGreaterThan(27);
    expect(w.states[0].T).toBeLessThan(35);
    for (let k = 0; k < 30; k++) w = advanceWorld(w, items, 60);
    expect(w.states[0].T).toBe(100);
    expect(w.states[2].T).toBeGreaterThan(95);
    for (let k = 0; k < 3; k++) w = doAction(w, items, 0, 'pour', ppe).world;
    expect(w.spill).toBeGreaterThan(0);
    for (let k = 0; k < 11; k++) w = doAction(w, items, 3, 'add', ppe).world;
    w = advanceWorld(w, items, 3);
    expect(sandboxAlerts(w, items, ppe).some((a) => a.level === 'danger' && a.text.includes('5 N'))).toBe(true);
    expect(readoutsFor(w, items, 3)[1].value).toContain('5,39');
  });
  it('kính hiển vi: đúng tiêu cự thì nét; vật kính lớn không cho dùng ốc sơ cấp; thiếu bảo hộ được nhắc', () => {
    const items = ['kinh-hien-vi', 'chai-kmno4'];
    let w = createWorld(items);
    w = setControl(w, items, 0, 'obj', 10, ppe).world;
    for (let k = 0; k < 6; k++) w = doAction(w, items, 0, 'coarseUp', ppe).world;
    for (let k = 0; k < 4; k++) w = doAction(w, items, 0, 'fineUp', ppe).world;
    expect(microscopeSharpness(w.states[0])).toBeGreaterThan(0.95);
    w = setControl(w, items, 0, 'obj', 40, ppe).world;
    expect(doAction(w, items, 0, 'coarseUp', ppe).ok).toBe(false);
    const noGloves = { goggles: true, gloves: false, labelCheck: true };
    const r = setControl(w, items, 1, 'open', 1, noGloves);
    expect(r.message).toContain('găng tay');
    expect(sandboxAlerts(r.world, items, noGloves).some((a) => a.text.includes('găng tay'))).toBe(true);
  });
});
