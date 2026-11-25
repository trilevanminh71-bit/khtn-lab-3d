/**
 * components/DataChart.tsx — Biểu đồ SVG cập nhật theo bảng số liệu (không cần thư viện).
 * Đầu vào: plugin, các lần đo, định nghĩa biểu đồ. Mỗi biểu đồ chỉ có MỘT trục tung.
 * Có chú giải khi từ 2 dãy trở lên, tooltip khi rê/chạm/tiêu điểm bàn phím, bản in màu sáng (mode="print").
 * Bảng màu đã kiểm tra bằng bộ kiểm tra mù màu: nền tối #0f172a và nền giấy #ffffff; hình điểm khác nhau theo dãy.
 */
import { useMemo, useState } from 'react';
import type { ChartDef, LabPluginDef, TrialRecord } from '../types/lab';
import { buildColumns, cellNumber, derivedValues, matchShowIf, optionLabel } from '../utils/trialTable';

const THEME = {
  screen: { series: ['#3987e5', '#d95926', '#199e70'], ink: '#e2e8f0', muted: '#94a3b8', grid: '#1e293b', axis: '#475569', surface: '#0f172a' },
  print: { series: ['#2a78d6', '#eb6834', '#1baf7a'], ink: '#0b0b0b', muted: '#52514e', grid: '#e1e0d9', axis: '#898781', surface: '#ffffff' }
} as const;

const W = 360;
const H = 210;
const M = { l: 48, r: 14, t: 14, b: 38 };
const fmt = (v: number): string => v.toLocaleString('vi-VN', { maximumSignificantDigits: 4 });

/** Các vạch chia "đẹp" bao trọn [lo, hi] */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) {
    const pad = Math.abs(lo) > 0 ? Math.abs(lo) * 0.1 : 1;
    return niceTicks(lo - pad, hi + pad, count);
  }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const start = Math.floor(lo / step + 1e-9) * step;
  const out: number[] = [];
  for (let v = start; out.length < 12; v += step) {
    out.push(Number(v.toPrecision(12)));
    if (v >= hi - 1e-9 * step) break;
  }
  return out;
}

interface Point {
  x: number;
  y: number;
  trial: number;
  xText: string;
}
interface Series {
  name: string;
  slot: number;
  points: Point[];
}

/** Gom dữ liệu thành tối đa 3 dãy; màu gắn cố định với giá trị nhóm (không đổi khi lọc) */
export function chartSeries(plugin: LabPluginDef, trials: TrialRecord[], def: ChartDef): Series[] {
  const cols = buildColumns(plugin, trials);
  const read = (key: string, t: TrialRecord): number => {
    if (key === 'index') return t.index;
    const c = cols.find((x) => x.key === key && x.kind !== 'param') ?? cols.find((x) => x.key === key);
    return c ? cellNumber(c, t, derivedValues(plugin, t, trials)) : Number.NaN;
  };
  const xParam = plugin.params.find((p) => p.key === def.x);
  const groupParam = def.groupBy ? plugin.params.find((p) => p.key === def.groupBy) : undefined;
  const groups = new Map<number, Series>();
  for (const t of trials) {
    if (!matchShowIf(def.showIf, t.params)) continue;
    const x = read(def.x, t);
    const y = read(def.y, t);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const g = groupParam ? Math.round(t.params[groupParam.key]) : 0;
    if (!groups.has(g)) {
      if (groups.size >= 3) continue;
      const order = groupParam?.options ? groupParam.options.findIndex((o) => o.value === g) : groupParam ? g - groupParam.min : 0;
      groups.set(g, { name: groupParam ? (optionLabel(groupParam, g) ?? `${groupParam.label.split(' (')[0]}: ${g}`) : def.yLabel, slot: Math.max(0, order) % 3, points: [] });
    }
    groups.get(g)!.points.push({ x, y, trial: t.index, xText: xParam ? (optionLabel(xParam, x) ?? fmt(x)) : fmt(x) });
  }
  const list = [...groups.values()];
  // Hai nhóm rơi vào cùng ô màu (nhiều hơn 3 lựa chọn) → gán lại ô còn trống
  const used = new Set<number>();
  for (const s of list) {
    while (used.has(s.slot)) s.slot = (s.slot + 1) % 3;
    used.add(s.slot);
  }
  return list;
}

function Marker({ slot, cx, cy, color, surface }: { slot: number; cx: number; cy: number; color: string; surface: string }) {
  const common = { fill: color, stroke: surface, strokeWidth: 2 };
  if (slot === 1) return <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} {...common} />;
  if (slot === 2) return <path d={`M${cx} ${cy - 6} L${cx + 6} ${cy + 4.5} L${cx - 6} ${cy + 4.5} Z`} {...common} />;
  return <circle cx={cx} cy={cy} r={5} {...common} />;
}

export function DataChart({ plugin, trials, def, mode = 'screen' }: { plugin: LabPluginDef; trials: TrialRecord[]; def: ChartDef; mode?: 'screen' | 'print' }) {
  const [active, setActive] = useState<{ s: number; i: number } | null>(null);
  const C = THEME[mode];
  const series = useMemo(() => chartSeries(plugin, trials, def), [plugin, trials, def]);
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const bar = def.kind === 'bar';
  const ys = all.map((q) => q.y).concat(def.refLine ? [def.refLine.value] : [], bar ? [0] : []);
  const yT = niceTicks(Math.min(...ys), Math.max(...ys));
  const [y0, y1] = [yT[0], yT[yT.length - 1]];
  const sy = (v: number): number => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  // Trục hoành: biểu đồ cột dùng nhóm rời rạc; còn lại dùng thang liên tục
  const cats = bar ? [...new Set(all.map((q) => q.x))].sort((a, b) => a - b) : [];
  const xT = bar ? [] : def.x === 'index' ? [...new Set(all.map((q) => q.x))].sort((a, b) => a - b) : niceTicks(Math.min(...all.map((q) => q.x)), Math.max(...all.map((q) => q.x)));
  const xLo = def.x === 'index' ? (xT[0] ?? 1) - 0.4 : (xT[0] ?? 0);
  const xHi = def.x === 'index' ? (xT[xT.length - 1] ?? 1) + 0.4 : (xT[xT.length - 1] ?? 1);
  const plotW = W - M.l - M.r;
  const band = bar ? plotW / cats.length : 0;
  const sx = (v: number): number => (bar ? M.l + band * (cats.indexOf(v) + 0.5) : M.l + ((v - xLo) / (xHi - xLo || 1)) * plotW);
  const barW = bar ? Math.max(4, Math.min(26, (band * 0.72) / series.length - 2)) : 0;
  const tickEvery = Math.max(1, Math.ceil(xT.length / 10));
  // Cột: lấy trung bình các lần đo cùng nhóm
  const bars = bar
    ? series.flatMap((s, si) =>
        cats.flatMap((c) => {
          const pts = s.points.filter((q) => q.x === c);
          if (!pts.length) return [];
          return [{ si, x: c, y: pts.reduce((a, q) => a + q.y, 0) / pts.length, n: pts.length, xText: pts[0].xText, i: s.points.indexOf(pts[0]) }];
        })
      )
    : [];
  const tip = active ? (bar ? bars.find((b) => b.si === active.s && b.i === active.i) : series[active.s]?.points[active.i]) : undefined;
  const tipX = tip ? sx(tip.x) : 0;
  const tipText = tip ? [`${def.xLabel}: ${tip.xText}`, `${def.yLabel}: ${fmt(tip.y)}${bar && 'n' in tip && tip.n > 1 ? ` (TB ${tip.n} lần)` : ''}`] : [];
  const tipW = Math.max(...tipText.map((t) => t.length), 0) * 5.6 + 14;
  const interact = (s: number, i: number, label: string): React.SVGProps<SVGGElement> =>
    mode === 'print'
      ? {}
      : {
          tabIndex: 0,
          role: 'img',
          'aria-label': label,
          onPointerEnter: () => setActive({ s, i }),
          onPointerLeave: () => setActive(null),
          onClick: () => setActive({ s, i }),
          onFocus: () => setActive({ s, i }),
          onBlur: () => setActive(null)
        };

  return (
    <figure className="m-0">
      <figcaption className="text-xs font-semibold" style={{ color: C.ink }}>
        {def.title}
      </figcaption>
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: C.muted }}>
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1">
              <svg width="14" height="14" aria-hidden="true">
                <Marker slot={bar ? 1 : s.slot} cx={7} cy={7} color={C.series[s.slot]} surface={C.surface} />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label={`${def.title}: ${all.length} điểm dữ liệu`} style={{ background: C.surface, borderRadius: 8, maxWidth: 560 }}>
        {yT.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke={C.grid} strokeWidth={1} />
            <text x={M.l - 6} y={sy(v) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {bar
          ? cats.map((c, i) => {
              const text = all.find((q) => q.x === c)?.xText ?? fmt(c);
              const maxChars = Math.max(3, Math.floor(band / 5.4));
              return (
                <text key={c} x={M.l + band * (i + 0.5)} y={H - M.b + 13} textAnchor="middle" fontSize="10" fill={C.muted}>
                  {text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text}
                </text>
              );
            })
          : xT.map((v, i) =>
              i % tickEvery ? null : (
                <text key={v} x={sx(v)} y={H - M.b + 13} textAnchor="middle" fontSize="10" fill={C.muted}>
                  {fmt(v)}
                </text>
              )
            )}
        <line x1={M.l} x2={W - M.r} y1={sy(bar ? Math.max(y0, 0) : y0)} y2={sy(bar ? Math.max(y0, 0) : y0)} stroke={C.axis} strokeWidth={1} />
        <text x={M.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill={C.muted}>
          {def.xLabel}
        </text>
        <text x={12} y={M.t + (H - M.t - M.b) / 2} textAnchor="middle" fontSize="10.5" fill={C.muted} transform={`rotate(-90 12 ${M.t + (H - M.t - M.b) / 2})`}>
          {def.yLabel}
        </text>
        {bar &&
          bars.map((b) => {
            const base = sy(Math.max(y0, 0));
            const top = sy(b.y);
            const h = Math.max(1, Math.abs(base - top));
            const x = sx(b.x) + (b.si - (series.length - 1) / 2) * (barW + 2) - barW / 2;
            const r = Math.min(4, h, barW / 2);
            const up = b.y >= 0;
            const yTop = Math.min(base, top);
            const path = up
              ? `M${x} ${yTop + h} V${yTop + r} Q${x} ${yTop} ${x + r} ${yTop} H${x + barW - r} Q${x + barW} ${yTop} ${x + barW} ${yTop + r} V${yTop + h} Z`
              : `M${x} ${yTop} V${yTop + h - r} Q${x} ${yTop + h} ${x + r} ${yTop + h} H${x + barW - r} Q${x + barW} ${yTop + h} ${x + barW} ${yTop + h - r} V${yTop} Z`;
            return (
              <g key={`${b.si}-${b.x}`} {...interact(b.si, b.i, `${series[b.si].name}, ${b.xText}: ${fmt(b.y)}`)} style={{ outline: 'none' }}>
                <rect x={sx(b.x) - band / 2} y={M.t} width={band} height={H - M.t - M.b} fill="transparent" pointerEvents={series.length > 1 ? 'none' : 'all'} />
                <path d={path} fill={C.series[series[b.si].slot]} opacity={active && !(active.s === b.si && active.i === b.i) ? 0.55 : 1} />
                {(mode === 'print' || bars.length <= 6) && (
                  <text x={x + barW / 2} y={up ? yTop - 3 : yTop + h + 10} textAnchor="middle" fontSize="9.5" fill={C.ink}>
                    {fmt(b.y)}
                  </text>
                )}
              </g>
            );
          })}
        {def.refLine && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={sy(def.refLine.value)} y2={sy(def.refLine.value)} stroke={C.ink} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            <text x={W - M.r - 2} y={sy(def.refLine.value) - 4} textAnchor="end" fontSize="10" fill={C.ink}>
              {def.refLine.label}
            </text>
          </g>
        )}
        {!bar &&
          series.map((s, si) => {
            const sorted = [...s.points].sort((a, b) => a.x - b.x || a.trial - b.trial);
            return (
              <g key={s.name}>
                {def.kind === 'line' && sorted.length > 1 && <polyline points={sorted.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} fill="none" stroke={C.series[s.slot]} strokeWidth={2} strokeLinejoin="round" />}
                {s.points.map((q, i) => (
                  <g key={q.trial} {...interact(si, i, `${s.name}, lần đo ${q.trial}: ${def.xLabel} ${q.xText}, ${def.yLabel} ${fmt(q.y)}`)} style={{ outline: 'none' }}>
                    <circle cx={sx(q.x)} cy={sy(q.y)} r={13} fill="transparent" />
                    <Marker slot={s.slot} cx={sx(q.x)} cy={sy(q.y)} color={C.series[s.slot]} surface={C.surface} />
                  </g>
                ))}
              </g>
            );
          })}
        {tip && (
          <g pointerEvents="none">
            {!bar && <line x1={tipX} x2={tipX} y1={M.t} y2={H - M.b} stroke={C.muted} strokeWidth={1} strokeDasharray="2 3" />}
            <g transform={`translate(${Math.max(2, Math.min(W - tipW - 2, tipX - tipW / 2))} ${Math.max(2, sy(tip.y) - 46)})`}>
              <rect width={tipW} height={34} rx={5} fill="#020617" stroke={C.axis} />
              {tipText.map((t, i) => (
                <text key={t} x={7} y={14 + i * 14} fontSize="10.5" fill="#f1f5f9">
                  {t}
                </text>
              ))}
            </g>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** Các biểu đồ có dữ liệu của bài */
export function ChartGrid({ plugin, trials, mode = 'screen' }: { plugin: LabPluginDef; trials: TrialRecord[]; mode?: 'screen' | 'print' }) {
  const charts = useMemo(() => {
    const defs = plugin.charts?.length
      ? plugin.charts
      : plugin.measurements.slice(0, 1).map((m): ChartDef => ({ id: 'auto', title: `${m.label} theo lần đo`, kind: 'line', x: 'index', y: m.key, xLabel: 'Lần đo', yLabel: m.unit ? `${m.label} (${m.unit})` : m.label }));
    return defs.filter((d) => chartSeries(plugin, trials, d).length > 0);
  }, [plugin, trials]);
  if (!charts.length) return null;
  return (
    <div className={`grid gap-3 ${mode === 'print' ? 'sm:grid-cols-2' : ''}`}>
      {charts.map((d) => (
        <DataChart key={d.id} plugin={plugin} trials={trials} def={d} mode={mode} />
      ))}
    </div>
  );
}
