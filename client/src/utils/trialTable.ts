/**
 * utils/trialTable.ts — Mô hình bảng số liệu dùng chung cho HUD, phiếu báo cáo, phiếu in và biểu đồ.
 * Đầu vào: plugin + các lần đo. Đầu ra: danh sách cột (tham số → số đo → cột tự tính), lọc theo `showIf`,
 * và hàm đọc giá trị số / chữ của từng ô. Không làm thay đổi dữ liệu gốc.
 */
import type { LabPluginDef, ParamDef, ShowIf, SummaryLine, TrialRecord } from '../types/lab';
import { evaluateFormula } from '../engines/formulaEvaluator';
import { getSolver } from '../engines/solverRegistry';
import { columnLabel } from './columnLabels';

export interface TableColumn {
  key: string;
  label: string;
  unit: string;
  kind: 'param' | 'measure' | 'derived';
  decimals: number;
  showIf?: ShowIf;
  valueLabels?: Record<string, string>;
}

export function matchShowIf(cond: ShowIf | undefined, params: Record<string, number>): boolean {
  return !cond || cond.in.includes(Math.round(params[cond.key]));
}

/** Nhãn lựa chọn của tham số rời rạc (nếu có) */
export function optionLabel(p: ParamDef, value: number): string | undefined {
  return p.options?.find((o) => o.value === value)?.label;
}

/** Giá trị các cột tự tính của một lần đo; lỗi công thức → NaN (hiển thị "—") */
export function derivedValues(plugin: LabPluginDef, trial: TrialRecord, all: TrialRecord[]): Record<string, number> {
  const defs = plugin.derived ?? [];
  if (!defs.length) return {};
  let bySolver: Record<string, number> = {};
  try {
    bySolver = getSolver(plugin.solverId).derive?.(trial, all, plugin) ?? {};
  } catch {
    bySolver = {};
  }
  const out: Record<string, number> = {};
  for (const d of defs) {
    if (!matchShowIf(d.showIf, trial.params)) {
      out[d.key] = Number.NaN;
      continue;
    }
    if (d.expr) {
      try {
        out[d.key] = evaluateFormula(d.expr, { ...trial.params, ...trial.values, ...out });
      } catch {
        out[d.key] = Number.NaN;
      }
    } else out[d.key] = bySolver[d.key] ?? Number.NaN;
  }
  return out;
}

/** Cột hiển thị: cột có điều kiện chỉ hiện khi ít nhất một lần đo thỏa điều kiện */
export function buildColumns(plugin: LabPluginDef, trials: TrialRecord[]): TableColumn[] {
  const visible = (c: ShowIf | undefined): boolean => !c || trials.length === 0 || trials.some((t) => matchShowIf(c, t.params));
  const cols: TableColumn[] = [];
  for (const p of plugin.params) {
    if (!visible(p.showIf)) continue;
    const labels = p.options ? Object.fromEntries(p.options.map((o) => [String(o.value), o.label])) : undefined;
    cols.push({ key: p.key, label: columnLabel(p), unit: p.unit, kind: 'param', decimals: 3, showIf: p.showIf, valueLabels: labels });
  }
  for (const m of plugin.measurements) if (visible(m.showIf)) cols.push({ ...m, kind: 'measure' });
  for (const d of plugin.derived ?? []) if (visible(d.showIf)) cols.push({ ...d, kind: 'derived' });
  return cols;
}

/** Tiêu đề cột kèm đơn vị; cột không đơn vị không hiện ngoặc thừa với dữ liệu dạng chữ */
export function columnTitle(c: TableColumn): string {
  if (c.valueLabels && !c.unit) return c.label;
  return `${c.label} (${c.unit || '–'})`;
}

/** Giá trị số của một ô; không áp dụng → NaN */
export function cellNumber(c: TableColumn, trial: TrialRecord, derived: Record<string, number>): number {
  if (!matchShowIf(c.showIf, trial.params)) return Number.NaN;
  const v = c.kind === 'param' ? trial.params[c.key] : c.kind === 'measure' ? trial.values[c.key] : derived[c.key];
  return typeof v === 'number' ? v : Number.NaN;
}

/** Chữ hiển thị trong một ô */
export function cellText(c: TableColumn, trial: TrialRecord, derived: Record<string, number>): string {
  const v = cellNumber(c, trial, derived);
  if (!Number.isFinite(v)) return '—';
  const named = c.valueLabels?.[String(v)];
  if (named !== undefined) return named;
  return v.toLocaleString('vi-VN', { maximumFractionDigits: c.decimals });
}

/** Một lần đo VÍ DỤ (thông số ẩn lấy giữa khoảng, không phải của học sinh) để minh họa cách ghi bảng */
export function exampleTrial(plugin: LabPluginDef, params: Record<string, number>): TrialRecord | null {
  try {
    const hidden = Object.fromEntries(plugin.hidden.map((h) => [h.key, Number(((h.min + h.max) / 2).toFixed(h.decimals))]));
    const r = getSolver(plugin.solverId).measure({ plugin, params, hidden, ppe: { goggles: true, gloves: true, labelCheck: true }, rng: () => 0.5 });
    return { index: 0, params: { ...params }, values: r.values, at: 0 };
  } catch {
    return null;
  }
}

/** Lí do một lần đo chưa đạt yêu cầu số đo (endpoint, số đọc 0) — null nếu đạt */
export function valueIssue(plugin: LabPluginDef, values: Record<string, number>): string | null {
  const v = plugin.validity;
  if (!v) return null;
  for (const [k, want] of Object.entries(v.requireEq ?? {})) {
    if (values[k] !== want) {
      const m = plugin.measurements.find((x) => x.key === k);
      return k === 'endpoint' ? 'Chưa đạt điểm cuối' : `${m?.label ?? k} ≠ ${want}`;
    }
  }
  for (const k of v.nonZero ?? []) {
    if (!values[k]) return `${plugin.measurements.find((x) => x.key === k)?.label ?? k} = 0`;
  }
  return null;
}

/** Lí do loại một lần đo khỏi tính toán — null nếu hợp lệ */
export function trialIssue(plugin: LabPluginDef, t: TrialRecord, trials: TrialRecord[]): string | null {
  if (t.flagged) return 'Đánh dấu đo lỗi';
  if (t.paramChanged) return 'Đổi thông số giữa chừng';
  const vi = valueIssue(plugin, t.values);
  if (vi) return vi;
  const fixed = plugin.validity?.fixedParams ?? [];
  if (fixed.length) {
    const ref = trials.find((x) => !x.flagged && !x.paramChanged && !valueIssue(plugin, x.values));
    if (ref && ref !== t) {
      const diff = fixed.filter((k) => ref.params[k] !== t.params[k]);
      if (diff.length) return `Khác thông số lần ${ref.index}: ${diff.map((k) => plugin.params.find((p) => p.key === k)?.label ?? k).join(', ')}`;
    }
  }
  return null;
}

/** Các lần đo hợp lệ (dùng cho trung bình, ước lượng, chấm điểm) */
export function validTrials(plugin: LabPluginDef, trials: TrialRecord[]): TrialRecord[] {
  return trials.filter((t) => !trialIssue(plugin, t, trials));
}

/** Xử lí số liệu tự động của bài; lỗi dữ liệu → danh sách rỗng */
export function safeSummary(plugin: LabPluginDef, trials: TrialRecord[]): SummaryLine[] {
  try {
    return getSolver(plugin.solverId).summarize?.(validTrials(plugin, trials), plugin) ?? [];
  } catch {
    return [];
  }
}

/** Số tham số thay đổi giữa hai lần đo liên tiếp (nguyên tắc: mỗi lần chỉ đổi một đại lượng) */
export function changedParams(plugin: LabPluginDef, a: TrialRecord, b: TrialRecord): string[] {
  return plugin.params
    .filter((p) => matchShowIf(p.showIf, a.params) && matchShowIf(p.showIf, b.params) && a.params[p.key] !== b.params[p.key])
    .map((p) => p.label);
}
