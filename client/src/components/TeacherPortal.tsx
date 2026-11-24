/**
 * components/TeacherPortal.tsx — Cổng giáo viên (bảo vệ bằng PIN):
 *  - Tổng quan đa lớp: bảng bài nộp, lọc theo lớp/bài; Thu bài QR; Đồng bộ LAN từ máy chủ lớp.
 *  - Ngộ nhận khoa học phổ biến của lớp + gợi ý khắc phục.
 *  - Tăng trưởng Pre/Post: % đúng trước/sau và hệ số Hake g trung bình.
 *  - KHKT: so sánh lớp thực nghiệm 10T1 với đối chứng 10T2 — t-test Welch, Cohen's d, biểu đồ cột SVG.
 *  - Xuất CSV UTF-8 BOM (mở thẳng bằng Excel), sao lưu / khôi phục JSON, quản lý nội dung.
 */
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, Download, FileJson, FilePlus2, ImagePlus, PencilRuler, QrCode, RefreshCw, Trash2, Upload, Users } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { audit, db } from '../offline/db';
import { generateBenchmarkSeed } from '../data/khktBenchmarkSeed';
import { getMisconception, MISCONCEPTIONS } from '../data/misconceptionKB';
import { cohenD, describeEffect, mean, normalizedGain, stdDev, welchTTest } from '../engines/statistics';
import { apiFetch, fmtVi } from '../services/appServices';
import { downloadText } from '../utils/bugSnapshot';
import { ModalShell } from './ModalShell';
import type { SubmissionRecord } from '../types/lab';

type Tab = 'overview' | 'misconceptions' | 'growth' | 'khkt' | 'manage';

/** Tạo nội dung CSV có BOM UTF-8 để Excel hiển thị đúng tiếng Việt */
export function toCsv(rows: Array<Array<string | number>>): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

/** Biểu đồ cột đơn giản bằng SVG (không cần thư viện) */
function BarChart({ data, max, unit }: { data: Array<{ label: string; value: number; color: string }>; max: number; unit: string }) {
  const h = 160;
  const w = Math.max(240, data.length * 70);
  return (
    <svg viewBox={`0 0 ${w} ${h + 40}`} className="w-full max-w-xl" role="img" aria-label="Biểu đồ cột">
      <line x1="30" x2={w} y1={h} y2={h} stroke="#64748b" />
      {data.map((d, i) => {
        const bh = max > 0 ? (Math.max(0, d.value) / max) * (h - 20) : 0;
        const x = 40 + i * 70;
        return (
          <g key={d.label}>
            <rect x={x} y={h - bh} width="44" height={bh} rx="4" fill={d.color} />
            <text x={x + 22} y={h - bh - 4} textAnchor="middle" fontSize="11" fill="#e2e8f0">
              {fmtVi(d.value, 2)}
              {unit}
            </text>
            <text x={x + 22} y={h + 16} textAnchor="middle" fontSize="11" fill="#cbd5e1">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TeacherPortal() {
  const plugins = useLabStore((s) => s.plugins);
  const [tab, setTab] = useState<Tab>('overview');
  const [rows, setRows] = useState<SubmissionRecord[]>([]);
  const [cls, setCls] = useState('Tất cả');
  const [pluginFilter, setPluginFilter] = useState('Tất cả');
  const [msg, setMsg] = useState('');
  const st = useLabStore.getState;

  const refresh = async (): Promise<void> => {
    try {
      setRows(await db.submissions.orderBy('createdAt').reverse().toArray());
    } catch {
      setMsg('Không đọc được IndexedDB (trình duyệt đang chặn bộ nhớ).');
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const classes = useMemo(() => ['Tất cả', ...new Set(rows.map((r) => r.classCode))].sort(), [rows]);
  const filtered = rows.filter((r) => (cls === 'Tất cả' || r.classCode === cls) && (pluginFilter === 'Tất cả' || r.pluginId === pluginFilter));
  const pName = (id: string): string => plugins.find((p) => p.id === id)?.shortTitle ?? id;

  const exportCsv = (): void => {
    const data: Array<Array<string | number>> = [['Lớp', 'Mã HS', 'Họ tên', 'Bài', 'Điểm', 'Trước (đúng/tổng)', 'Sau (đúng/tổng)', 'Hệ số Hake g', 'Sai số (%)', 'Thời gian (phút)', 'Ngộ nhận', 'Khảo sát TB', 'Nguồn', 'Ngày nộp']];
    for (const r of filtered) {
      data.push([
        r.classCode,
        r.studentCode,
        r.studentName,
        pName(r.pluginId),
        r.score,
        `${r.preScore}/${r.preMax}`,
        `${r.postScore}/${r.postMax}`,
        fmtVi(normalizedGain(r.preScore, r.postScore, r.postMax), 2),
        fmtVi(r.relErrorPercent, 1),
        fmtVi(r.durationSec / 60, 1),
        r.misconceptions.map((m) => getMisconception(m)?.title ?? m).join(' | '),
        r.likert.length ? fmtVi(mean(r.likert), 2) : '',
        r.source,
        new Date(r.createdAt).toLocaleString('vi-VN')
      ]);
    }
    downloadText(`ket-qua-${cls === 'Tất cả' ? 'tat-ca-lop' : cls}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data), 'text/csv');
    void audit('export-csv', `${filtered.length} dòng`);
  };

  const syncLan = async (): Promise<void> => {
    setMsg('Đang lấy dữ liệu từ máy chủ lớp…');
    try {
      const targets = cls === 'Tất cả' ? classes.filter((c) => c !== 'Tất cả') : [cls];
      if (targets.length === 0) throw new Error('Chưa có mã lớp — hãy chọn lớp hoặc nhập bài trước.');
      let added = 0;
      for (const c of targets) {
        const data = await apiFetch<{ submissions: SubmissionRecord[] }>(`/api/analytics/class/${encodeURIComponent(c)}`);
        for (const r of data.submissions) {
          const exists = await db.submissions.where('uid').equals(r.uid).first();
          if (!exists) {
            await db.submissions.add({ ...r, id: undefined, source: 'lan', synced: true });
            added++;
          }
        }
      }
      await refresh();
      setMsg(`Đồng bộ LAN xong: thêm ${added} bài mới.`);
    } catch (e) {
      setMsg(`Không đồng bộ được: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const loadSeed = async (): Promise<void> => {
    const seed = generateBenchmarkSeed();
    let n = 0;
    for (const r of seed) {
      const exists = await db.submissions.where('uid').equals(r.uid).first();
      if (!exists) {
        await db.submissions.add(r);
        n++;
      }
    }
    await audit('seed-load', `${n} bài mẫu`);
    await refresh();
    setMsg(`Đã nạp ${n} bài mẫu (80 học sinh 10T1 & 10T2).`);
  };
  const clearSeed = async (): Promise<void> => {
    await db.submissions.where('source').equals('seed').delete();
    await refresh();
    setMsg('Đã xóa dữ liệu mẫu.');
  };

  const backup = async (): Promise<void> => {
    const data = { format: 'khtn-lab-backup', exportedAt: new Date().toISOString(), submissions: await db.submissions.toArray(), surveys: await db.surveys.toArray(), auditLog: await db.auditLog.toArray() };
    downloadText(`sao-luu-khtn-lab-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    void audit('backup-export', `${data.submissions.length} bài`);
  };
  const restore = async (file: File): Promise<void> => {
    try {
      const json = JSON.parse(await file.text()) as { format?: string; submissions?: SubmissionRecord[] };
      if (json.format !== 'khtn-lab-backup' || !Array.isArray(json.submissions)) throw new Error('Sai định dạng file sao lưu.');
      let n = 0;
      for (const r of json.submissions) {
        if (!(await db.submissions.where('uid').equals(r.uid).first())) {
          await db.submissions.add({ ...r, id: undefined });
          n++;
        }
      }
      await refresh();
      setMsg(`Khôi phục ${n} bài nộp.`);
    } catch (e) {
      setMsg(`Không khôi phục được: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const pushBackup = async (): Promise<void> => {
    try {
      const subs = await db.submissions.toArray();
      const r = await apiFetch<{ stored: number }>('/api/backup', { method: 'POST', body: JSON.stringify({ submissions: subs }) }, 15000);
      setMsg(`Máy chủ đã lưu ${r.stored} bài.`);
    } catch (e) {
      setMsg(`Không gửi được sao lưu: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const clearAll = (): void =>
    st().askConfirm({
      title: 'Xóa toàn bộ bài nộp trên máy này?',
      message: `Sẽ xóa vĩnh viễn ${rows.length} bài nộp trong trình duyệt này (không ảnh hưởng máy chủ). Nên Sao lưu JSON trước. Không thể hoàn tác.`,
      confirmLabel: 'Xóa vĩnh viễn',
      onConfirm: () => {
        void db.submissions.clear().then(async () => {
          await audit('clear-submissions', String(rows.length));
          await refresh();
        });
      }
    });

  // Thống kê ngộ nhận
  const misStats = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of filtered) for (const m of r.misconceptions) count.set(m, (count.get(m) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Tăng trưởng theo lớp
  const growth = useMemo(() => {
    const by = new Map<string, SubmissionRecord[]>();
    for (const r of rows) by.set(r.classCode, [...(by.get(r.classCode) ?? []), r]);
    return [...by.entries()].map(([c, list]) => {
      const valid = list.filter((r) => r.postMax > 0);
      return {
        cls: c,
        n: list.length,
        pre: mean(valid.map((r) => (r.preScore / r.preMax) * 100)),
        post: mean(valid.map((r) => (r.postScore / r.postMax) * 100)),
        g: mean(valid.map((r) => normalizedGain(r.preScore, r.postScore, r.postMax))),
        score: mean(list.map((r) => r.score))
      };
    });
  }, [rows]);

  // KHKT: 10T1 (thực nghiệm) vs 10T2 (đối chứng)
  const khkt = useMemo(() => {
    const a = rows.filter((r) => r.classCode === '10T1' && r.postMax > 0);
    const b = rows.filter((r) => r.classCode === '10T2' && r.postMax > 0);
    if (a.length < 3 || b.length < 3) return null;
    const ga = a.map((r) => normalizedGain(r.preScore, r.postScore, r.postMax));
    const gb = b.map((r) => normalizedGain(r.preScore, r.postScore, r.postMax));
    const sa = a.map((r) => r.score);
    const sb = b.map((r) => r.score);
    return {
      na: a.length,
      nb: b.length,
      gain: { a: mean(ga), b: mean(gb), sdA: stdDev(ga), sdB: stdDev(gb), t: welchTTest(ga, gb), d: cohenD(ga, gb) },
      score: { a: mean(sa), b: mean(sb), t: welchTTest(sa, sb), d: cohenD(sa, sb) },
      err: { a: mean(a.map((r) => r.relErrorPercent)), b: mean(b.map((r) => r.relErrorPercent)) },
      likert: { a: mean(a.flatMap((r) => r.likert)), b: mean(b.flatMap((r) => r.likert)) },
      seeded: a.some((r) => r.source === 'seed') || b.some((r) => r.source === 'seed')
    };
  }, [rows]);

  const TABS: Array<[Tab, string, typeof Users]> = [
    ['overview', 'Tổng quan lớp', Users],
    ['misconceptions', 'Ngộ nhận', PencilRuler],
    ['growth', 'Tăng trưởng Pre/Post', BarChart3],
    ['khkt', 'Số liệu KHKT', Database],
    ['manage', 'Quản lý', FileJson]
  ];

  return (
    <ModalShell title="Cổng giáo viên" onClose={() => st().closeModal()} wide icon={<Users size={18} />}>
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} className={`btn text-xs ${tab === k ? 'border-lab-400 bg-lab-700' : ''}`} onClick={() => setTab(k)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {msg && <p className="mb-2 rounded bg-slate-800 p-2 text-sm text-amber-200">{msg}</p>}

      {tab !== 'manage' && tab !== 'khkt' && (
        <div className="mb-2 flex flex-wrap gap-2">
          <select className="input w-auto" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Lọc theo lớp">
            {classes.map((c) => <option key={c} value={c}>{c === 'Tất cả' ? 'Tất cả lớp' : `Lớp ${c}`}</option>)}
          </select>
          <select className="input w-auto" value={pluginFilter} onChange={(e) => setPluginFilter(e.target.value)} aria-label="Lọc theo bài">
            <option value="Tất cả">Tất cả bài</option>
            {plugins.map((p) => <option key={p.id} value={p.id}>{p.shortTitle}</option>)}
          </select>
          <button className="btn" onClick={() => st().openModal('scanner')}><QrCode size={16} /> Thu bài QR</button>
          <button className="btn" onClick={() => void syncLan()}><RefreshCw size={16} /> Đồng bộ LAN</button>
          <button className="btn" onClick={exportCsv} disabled={filtered.length === 0}><Download size={16} /> Xuất CSV</button>
        </div>
      )}

      {tab === 'overview' && (
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs text-slate-400">
            {filtered.length} bài · điểm TB {fmtVi(mean(filtered.map((r) => r.score)), 1)} · sai số TB {fmtVi(mean(filtered.map((r) => r.relErrorPercent)), 1)}%
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="p-1">Lớp</th><th className="p-1">Mã HS</th><th className="p-1">Họ tên</th><th className="p-1">Bài</th><th className="p-1">Điểm</th><th className="p-1">Trước→Sau</th><th className="p-1">Sai số</th><th className="p-1">Nguồn</th><th className="p-1">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((r) => (
                <tr key={r.uid} className="border-b border-slate-800">
                  <td className="p-1">{r.classCode}</td>
                  <td className="p-1">{r.studentCode}</td>
                  <td className="p-1">{r.studentName}</td>
                  <td className="p-1">{pName(r.pluginId)}</td>
                  <td className={`p-1 font-bold ${r.score >= 75 ? 'text-ok' : r.score < 50 ? 'text-danger' : ''}`}>{r.score}</td>
                  <td className="p-1">{r.preScore}/{r.preMax} → {r.postScore}/{r.postMax}</td>
                  <td className="p-1">{fmtVi(r.relErrorPercent, 1)}%</td>
                  <td className="p-1">{{ local: 'Máy này', qr: 'QR', lan: 'LAN', seed: 'Mẫu' }[r.source]}</td>
                  <td className="p-1">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-3 text-sm text-slate-400">Chưa có bài nộp. Dùng “Thu bài QR”, “Đồng bộ LAN”, hoặc nạp dữ liệu mẫu ở tab Số liệu KHKT.</p>}
        </div>
      )}

      {tab === 'misconceptions' && (
        <div className="space-y-2">
          {misStats.length === 0 && <p className="text-sm text-slate-400">Chưa phát hiện ngộ nhận nào trong dữ liệu đã chọn.</p>}
          {misStats.map(([id, n]) => {
            const m = getMisconception(id);
            const pct = (n / Math.max(1, filtered.length)) * 100;
            return (
              <div key={id} className="rounded-lg border border-slate-700 p-2 text-sm">
                <div className="flex items-center gap-2">
                  <b className="flex-1">{m?.title ?? id}</b>
                  <span className="font-mono">{n} HS ({fmtVi(pct, 0)}%)</span>
                </div>
                <div className="my-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-warn" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <p className="text-xs text-slate-400">{m?.chapter} — {m?.description}</p>
                <p className="text-xs text-lab-400">Gợi ý khắc phục: {m?.remedy}</p>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">Kho có {MISCONCEPTIONS.length} ngộ nhận phổ biến phân loại theo chương SGK Kết nối tri thức 10.</p>
        </div>
      )}

      {tab === 'growth' && (
        <div className="space-y-3">
          <BarChart
            unit="%"
            max={100}
            data={growth.flatMap((g) => [
              { label: `${g.cls} trước`, value: g.pre, color: '#64748b' },
              { label: `${g.cls} sau`, value: g.post, color: '#14b8a6' }
            ])}
          />
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700 text-left text-slate-400"><th className="p-1">Lớp</th><th className="p-1">Số bài</th><th className="p-1">% đúng trước</th><th className="p-1">% đúng sau</th><th className="p-1">Hake g TB</th><th className="p-1">Điểm TB</th></tr></thead>
            <tbody>
              {growth.map((g) => (
                <tr key={g.cls} className="border-b border-slate-800">
                  <td className="p-1">{g.cls}</td><td className="p-1">{g.n}</td><td className="p-1">{fmtVi(g.pre, 1)}%</td><td className="p-1">{fmtVi(g.post, 1)}%</td>
                  <td className="p-1 font-bold">{fmtVi(g.g, 2)} <span className="text-xs font-normal text-slate-400">({g.g >= 0.7 ? 'cao' : g.g >= 0.3 ? 'trung bình' : 'thấp'})</span></td>
                  <td className="p-1">{fmtVi(g.score, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500">Hệ số Hake g = (sau − trước)/(tối đa − trước); g ≥ 0,7: cao; 0,3–0,7: trung bình; &lt; 0,3: thấp.</p>
        </div>
      )}

      {tab === 'khkt' && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => void loadSeed()}><Database size={16} /> Nạp dữ liệu mẫu 80 HS (10T1 & 10T2)</button>
            <button className="btn" onClick={() => void clearSeed()}><Trash2 size={16} /> Xóa dữ liệu mẫu</button>
          </div>
          {!khkt ? (
            <p className="text-slate-400">Cần ít nhất 3 bài nộp của mỗi lớp 10T1 (thực nghiệm) và 10T2 (đối chứng).</p>
          ) : (
            <>
              {khkt.seeded && <p className="rounded border border-amber-500 bg-amber-900/30 p-2 text-xs text-amber-200">⚠ Đang hiển thị có DỮ LIỆU MẪU mô phỏng. Khi dự thi phải dùng số liệu thực nghiệm thật thu từ học sinh.</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <h4 className="font-bold">Hệ số tăng trưởng Hake g trung bình</h4>
                  <BarChart unit="" max={1} data={[{ label: `10T1 (n=${khkt.na})`, value: khkt.gain.a, color: '#14b8a6' }, { label: `10T2 (n=${khkt.nb})`, value: khkt.gain.b, color: '#64748b' }]} />
                </div>
                <div>
                  <h4 className="font-bold">Điểm phiếu báo cáo trung bình</h4>
                  <BarChart unit="" max={100} data={[{ label: '10T1', value: khkt.score.a, color: '#14b8a6' }, { label: '10T2', value: khkt.score.b, color: '#64748b' }]} />
                </div>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-700 text-left text-slate-400"><th className="p-1">Chỉ số</th><th className="p-1">10T1 (thực nghiệm)</th><th className="p-1">10T2 (đối chứng)</th><th className="p-1">Kiểm định</th></tr></thead>
                <tbody>
                  <tr className="border-b border-slate-800"><td className="p-1">Hake g (TB ± SD)</td><td className="p-1">{fmtVi(khkt.gain.a, 2)} ± {fmtVi(khkt.gain.sdA, 2)}</td><td className="p-1">{fmtVi(khkt.gain.b, 2)} ± {fmtVi(khkt.gain.sdB, 2)}</td><td className="p-1">t = {fmtVi(khkt.gain.t.t, 2)}, df = {fmtVi(khkt.gain.t.df, 1)}, p {khkt.gain.t.p < 0.001 ? '< 0,001' : `= ${fmtVi(khkt.gain.t.p, 3)}`}; d = {fmtVi(khkt.gain.d, 2)} ({describeEffect(khkt.gain.d)})</td></tr>
                  <tr className="border-b border-slate-800"><td className="p-1">Điểm báo cáo</td><td className="p-1">{fmtVi(khkt.score.a, 1)}</td><td className="p-1">{fmtVi(khkt.score.b, 1)}</td><td className="p-1">p {khkt.score.t.p < 0.001 ? '< 0,001' : `= ${fmtVi(khkt.score.t.p, 3)}`}; d = {fmtVi(khkt.score.d, 2)}</td></tr>
                  <tr className="border-b border-slate-800"><td className="p-1">Sai số đo TB</td><td className="p-1">{fmtVi(khkt.err.a, 1)}%</td><td className="p-1">{fmtVi(khkt.err.b, 1)}%</td><td className="p-1" /></tr>
                  <tr><td className="p-1">Khảo sát Likert TB</td><td className="p-1">{fmtVi(khkt.likert.a, 2)}/5</td><td className="p-1">{fmtVi(khkt.likert.b, 2)}/5</td><td className="p-1" /></tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-400">
                Kết luận tự động: {khkt.gain.t.p < 0.05 ? `Khác biệt về mức tăng trưởng CÓ ý nghĩa thống kê (p < 0,05), độ lớn ảnh hưởng ${describeEffect(khkt.gain.d)}.` : 'Chưa đủ bằng chứng thống kê về khác biệt (p ≥ 0,05).'}
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'manage' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn justify-start" onClick={() => st().openModal('cms')}><PencilRuler size={16} /> Sửa đề, câu hỏi, thông số (CMS)</button>
          <button className="btn justify-start" onClick={() => st().openModal('wizard')}><FilePlus2 size={16} /> Tạo bài mới không cần code</button>
          <button className="btn justify-start" onClick={() => st().openModal('assets')}><ImagePlus size={16} /> Ảnh tiêu bản / mô hình .glb</button>
          <button className="btn justify-start" onClick={() => void backup()}><Download size={16} /> Sao lưu JSON toàn bộ</button>
          <label className="btn cursor-pointer justify-start">
            <Upload size={16} /> Khôi phục từ file sao lưu
            <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
          </label>
          <button className="btn justify-start" onClick={() => void pushBackup()}><RefreshCw size={16} /> Gửi sao lưu lên máy chủ</button>
          <button className="btn-danger justify-start sm:col-span-2" onClick={clearAll}><Trash2 size={16} /> Xóa toàn bộ bài nộp trên máy này</button>
        </div>
      )}
    </ModalShell>
  );
}
