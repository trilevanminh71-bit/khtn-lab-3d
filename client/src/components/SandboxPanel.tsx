/**
 * components/SandboxPanel.tsx — "Tủ dụng cụ / Tự do thí nghiệm": học sinh tự chọn, đổi, gỡ dụng cụ trên bàn 3D.
 *  - Lọc theo bài đang học, theo môn hoặc tìm theo tên; mỗi dụng cụ có tên, mô tả ngắn, bảo hộ cần có, dụng cụ nên dùng kèm.
 *  - Kiểm tra nhẹ nhàng: dụng cụ không nên đặt cạnh nhau (an toàn) và bảo hộ còn thiếu → nhắc, KHÔNG chặn, không gây lỗi.
 *  - Chế độ này không tạo số liệu đo và không tính vào bài nộp; bấm "Quay lại bài" để tiếp tục bài chính thức (số liệu giữ nguyên).
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Boxes, Glasses, Hand, Plus, Replace, Search, Tag, Trash2, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { SUBJECT_LABELS } from '../config/appConfig';
import { EQUIPMENT, equipmentById, SANDBOX_SLOTS, sandboxConflicts, sandboxMissingPpe, type EquipmentDef } from '../data/equipmentCatalog';
import type { PpeItem, SubjectId } from '../types/lab';

type Filter = 'lesson' | SubjectId | 'all';

const PPE_NAME: Record<PpeItem, string> = { goggles: 'Kính bảo hộ', gloves: 'Găng tay', labelCheck: 'Đọc nhãn' };
const PPE_ICON: Record<PpeItem, typeof Glasses> = { goggles: Glasses, gloves: Hand, labelCheck: Tag };

function PpeChips({ items, ppe }: { items: PpeItem[]; ppe: Record<PpeItem, boolean> }) {
  if (!items.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((k) => {
        const Icon = PPE_ICON[k];
        return (
          <span key={k} className={`chip ${ppe[k] ? 'bg-emerald-900/50 text-emerald-200' : 'bg-amber-900/50 text-amber-200'}`} title={ppe[k] ? 'Đã có' : 'Chưa có'}>
            <Icon size={11} /> {PPE_NAME[k]}
          </span>
        );
      })}
    </span>
  );
}

export function SandboxPanel() {
  const plugin = useLabStore((s) => s.plugin);
  const items = useLabStore((s) => s.sandboxItems);
  const ppe = useLabStore((s) => s.ppe);
  const lessonItems = useMemo(() => EQUIPMENT.filter((e) => e.lessons.includes(plugin.id)), [plugin.id]);
  const [filter, setFilter] = useState<Filter>(lessonItems.length ? 'lesson' : plugin.subject);
  const [q, setQ] = useState('');
  /** Đang chọn dụng cụ để thay vào chỗ số replaceAt */
  const [replaceAt, setReplaceAt] = useState<number | null>(null);
  const st = useLabStore.getState;

  const list = EQUIPMENT.filter((e) => {
    const inFilter = filter === 'all' ? true : filter === 'lesson' ? e.lessons.includes(plugin.id) : e.subjects.includes(filter);
    const text = `${e.name} ${e.description}`.toLowerCase();
    return inFilter && (!q.trim() || text.includes(q.trim().toLowerCase()));
  });
  const conflicts = sandboxConflicts(items);
  const missing = sandboxMissingPpe(items, ppe);

  const place = (e: EquipmentDef): void => {
    const next = replaceAt !== null ? items.map((x, i) => (i === replaceAt ? e.id : x)) : [...items, e.id];
    if (replaceAt !== null) {
      st().replaceSandboxItem(replaceAt, e.id);
      st().toast('success', `Đã đổi chỗ ${replaceAt + 1} thành ${e.name}.`);
      setReplaceAt(null);
    } else {
      const r = st().addSandboxItem(e.id);
      st().toast(r.ok ? 'success' : 'warning', r.ok ? `Đã đặt ${e.name} lên bàn. Chạm vào dụng cụ trong khung 3D để thử.` : r.message);
      if (!r.ok) return;
    }
    // Nhắc nhẹ: an toàn và bảo hộ (không chặn)
    const c = sandboxConflicts(next).find((x) => x.a === e.id || x.b === e.id);
    if (c) st().toast('warning', `Lưu ý an toàn: ${c.reason}`);
    const need = e.ppe.filter((k) => !st().ppe[k]);
    if (need.length) st().toast('info', `Khi dùng ${e.name} nên có: ${need.map((k) => PPE_NAME[k].toLowerCase()).join(', ')}.`);
  };

  const FILTERS: Array<[Filter, string]> = [
    ...(lessonItems.length ? ([['lesson', 'Bài đang học']] as Array<[Filter, string]>) : []),
    ['physics', SUBJECT_LABELS.physics],
    ['chemistry', SUBJECT_LABELS.chemistry],
    ['biology', SUBJECT_LABELS.biology],
    ['all', 'Tất cả']
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-label="Tủ dụng cụ – Tự do thí nghiệm">
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <div className="flex items-center gap-1.5">
          <Boxes size={18} className="text-lab-400" />
          <h2 className="flex-1 text-sm font-bold">Tủ dụng cụ – Tự do thí nghiệm</h2>
          <button className="btn-primary min-h-[40px] px-3 text-sm" onClick={() => st().setSandbox(false)} title="Trở lại bài thí nghiệm chính thức (số liệu đã ghi vẫn giữ nguyên)">
            <ArrowLeft size={15} /> Quay lại bài
          </button>
        </div>
        <p className="rounded bg-sky-900/40 p-1.5 text-xs text-sky-100">
          Chọn dụng cụ đặt lên bàn rồi chạm vào chúng trong khung 3D để xem cách dùng. Chế độ này <b>không đo số liệu và không tính vào bài nộp</b>.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2">
        {/* Bàn thí nghiệm */}
        <section aria-label="Dụng cụ trên bàn">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>
              Trên bàn: {items.length}/{SANDBOX_SLOTS}
            </span>
            {items.length > 0 && (
              <button className="text-slate-400 underline hover:text-slate-200" onClick={() => { st().clearSandbox(); setReplaceAt(null); }}>
                Dọn bàn
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="rounded border border-dashed border-slate-600 p-2 text-center text-xs text-slate-400">Bàn đang trống — chọn dụng cụ ở danh sách bên dưới.</p>
          ) : (
            <ol className="space-y-1">
              {items.map((id, i) => {
                const e = equipmentById(id);
                if (!e) return null;
                return (
                  <li key={`${id}-${i}`} className={`flex items-center gap-1.5 rounded-lg border p-1.5 text-sm ${replaceAt === i ? 'border-lab-400 bg-lab-900/40' : 'border-slate-700'}`}>
                    <span className="w-5 shrink-0 text-center text-xs text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate" title={e.description}>{e.name}</span>
                    <button className={`btn min-h-[32px] px-2 text-xs ${replaceAt === i ? 'border-lab-400' : ''}`} onClick={() => setReplaceAt(replaceAt === i ? null : i)} aria-label={`Đổi dụng cụ ở chỗ ${i + 1}`} title="Đổi: chọn dụng cụ khác ở danh sách bên dưới">
                      <Replace size={13} /> {replaceAt === i ? 'Đang đổi…' : 'Đổi'}
                    </button>
                    <button className="btn min-h-[32px] px-2 text-xs" onClick={() => { st().removeSandboxItem(i); setReplaceAt(null); }} aria-label={`Gỡ ${e.name}`} title="Gỡ khỏi bàn">
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Kiểm tra an toàn nhẹ nhàng */}
        {(conflicts.length > 0 || missing.length > 0) && (
          <section className="space-y-1 rounded-lg border border-amber-500/60 bg-amber-900/30 p-2 text-xs text-amber-100" role="status">
            {conflicts.map((c) => (
              <p key={`${c.a}|${c.b}`}>
                ⚠ <b>{equipmentById(c.a)?.name}</b> và <b>{equipmentById(c.b)?.name}</b>: {c.reason}
              </p>
            ))}
            {missing.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span>🧤 Nên có thêm:</span>
                {missing.map((k) => {
                  const Icon = PPE_ICON[k];
                  return (
                    <button key={k} className="btn min-h-[30px] px-2 text-xs" onClick={() => st().togglePpe(k)} title={`Bật ${PPE_NAME[k].toLowerCase()}`}>
                      <Icon size={12} /> {PPE_NAME[k]}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Danh mục dụng cụ */}
        <section aria-label="Danh mục dụng cụ" className="space-y-1.5">
          {replaceAt !== null && (
            <p className="flex items-center gap-1 rounded bg-lab-900/50 p-1.5 text-xs text-slate-100">
              Chọn một dụng cụ để thay vào chỗ {replaceAt + 1}.
              <button className="ml-auto rounded p-0.5 hover:bg-slate-800" onClick={() => setReplaceAt(null)} aria-label="Hủy đổi">
                <X size={13} />
              </button>
            </p>
          )}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Lọc dụng cụ">
            {FILTERS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={`btn min-h-[32px] px-2 text-xs ${filter === k ? 'border-lab-400 bg-lab-700 text-white' : ''}`} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input py-1.5 pl-7 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm dụng cụ (ví dụ: cốc, burette, kính hiển vi)" aria-label="Tìm dụng cụ" />
          </label>
          {list.length === 0 && <p className="p-2 text-center text-xs text-slate-400">Không có dụng cụ phù hợp.</p>}
          {list.map((e) => {
            const count = items.filter((x) => x === e.id).length;
            const full = replaceAt === null && items.length >= SANDBOX_SLOTS;
            const pairs = e.pairsWith.map((id) => equipmentById(id)?.name).filter((x): x is string => !!x);
            return (
              <article key={e.id} className="rounded-lg border border-slate-700 p-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">
                      {e.name}
                      {count > 0 && <span className="ml-1 text-xs font-normal text-lab-400">· đang có {count}</span>}
                    </h3>
                    <p className="text-xs text-slate-300">{e.description}</p>
                  </div>
                  <button className="btn-primary min-h-[36px] shrink-0 px-2.5 text-xs" onClick={() => place(e)} disabled={full} title={full ? `Bàn đã đủ ${SANDBOX_SLOTS} chỗ` : replaceAt !== null ? `Thay vào chỗ ${replaceAt + 1}` : 'Đặt lên bàn'}>
                    {replaceAt !== null ? <Replace size={14} /> : <Plus size={14} />} {replaceAt !== null ? 'Thay' : 'Đặt'}
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                  <PpeChips items={e.ppe} ppe={ppe} />
                  {pairs.length > 0 && <span>Dùng kèm: {pairs.join(', ')}</span>}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
