/**
 * components/SandboxPanel.tsx — "Thí nghiệm tự do": tủ dụng cụ + bàn thí nghiệm 3D.
 *  - Tủ chia ngăn: Vật lí, Hóa học, Sinh học, Bảo hộ (PPE) + ô tìm nhanh theo tên (tìm trong mọi ngăn).
 *  - Thẻ gọn: tên, 1 dòng mô tả, trạng thái đang dùng, nút "Ra bàn" / "Cất"; kéo thẻ thả thẳng vào khung 3D.
 *  - Bàn: chạm chọn dụng cụ → điều khiển như đồ thật, di chuyển/lắp ghép (SandboxControls).
 *  - Kiểm tra nhẹ nhàng: cặp dụng cụ không nên để gần nhau, bảo hộ còn thiếu → nhắc, KHÔNG chặn.
 *  - Không tạo số liệu đo, không tính vào bài nộp; "Làm bài tập" quay về bài chính thức (số liệu giữ nguyên).
 */
import { useState } from 'react';
import {
  ArrowLeft,
  Atom,
  Boxes,
  Dna,
  FlaskConical,
  Glasses,
  GripVertical,
  Hand,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Undo2
} from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import {
  EQUIPMENT,
  equipmentById,
  SANDBOX_SLOTS,
  sandboxConflicts,
  sandboxMissingPpe,
  type EquipmentDef
} from '../data/equipmentCatalog';
import type { PpeItem, SubjectId } from '../types/lab';
import { SandboxAlerts, SandboxItemControls, SandboxTimeBar } from './SandboxControls';

type Drawer = SubjectId | 'ppe';

/** Kiểu dữ liệu kéo thả thẻ dụng cụ → khung 3D */
export const EQUIP_DRAG_TYPE = 'application/x-khtn-equipment';

const PPE_NAME: Record<PpeItem, string> = {
  goggles: 'Kính bảo hộ',
  gloves: 'Găng tay',
  labelCheck: 'Đọc nhãn hóa chất'
};
const PPE_DESC: Record<PpeItem, string> = {
  goggles: 'Bảo vệ mắt khi đun nóng, dùng acid, chất oxi hóa.',
  gloves: 'Tránh hóa chất, thuốc nhuộm, vi sinh vật dính tay.',
  labelCheck: 'Đọc tên, nồng độ, kí hiệu nguy hiểm trước khi dùng.'
};
const PPE_ICON: Record<PpeItem, typeof Glasses> = { goggles: Glasses, gloves: Hand, labelCheck: Tag };
const DRAWERS: Array<{ key: Drawer; label: string; Icon: typeof Atom }> = [
  { key: 'physics', label: 'Vật lí', Icon: Atom },
  { key: 'chemistry', label: 'Hóa học', Icon: FlaskConical },
  { key: 'biology', label: 'Sinh học', Icon: Dna },
  { key: 'ppe', label: 'Bảo hộ', Icon: ShieldCheck }
];

const st = useLabStore.getState;

/** Lấy dụng cụ ra bàn (kèm nhắc an toàn / bảo hộ nhẹ nhàng) */
export function takeOut(e: EquipmentDef, at?: { x: number; z: number }): void {
  const before = st().sandboxItems;
  const r = st().addSandboxItem(e.id, at);
  if (!r.ok) {
    st().toast('warning', r.message);
    return;
  }
  st().toast(
    'success',
    r.message.startsWith('Đã lắp')
      ? `${e.name}: ${r.message}`
      : `Đã đưa ${e.name} ra bàn — chạm để điều khiển, kéo để di chuyển.`
  );
  const c = sandboxConflicts([...before, e.id]).find((x) => x.a === e.id || x.b === e.id);
  if (c) st().toast('warning', `Lưu ý an toàn: ${c.reason}`);
  const need = e.ppe.filter((k) => !st().ppe[k]);
  if (need.length)
    st().toast(
      'info',
      `Khi dùng ${e.name} nên có: ${need.map((k) => PPE_NAME[k].toLowerCase()).join(', ')} (ngăn Bảo hộ).`
    );
}

function putBack(id: string): void {
  const items = st().sandboxItems;
  const i = items.lastIndexOf(id);
  if (i < 0) return;
  st().removeSandboxItem(i);
  st().toast('info', `Đã cất ${equipmentById(id)?.name ?? id} vào tủ.`);
}

export function SandboxPanel() {
  const plugin = useLabStore((s) => s.plugin);
  const items = useLabStore((s) => s.sandboxItems);
  const ppe = useLabStore((s) => s.ppe);
  const sel = useLabStore((s) => s.sandboxSel);
  const [drawer, setDrawer] = useState<Drawer>(plugin.subject);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const list = EQUIPMENT.filter((e) =>
    query
      ? e.name.toLowerCase().includes(query) || e.id.includes(query)
      : drawer !== 'ppe' && e.subjects.includes(drawer)
  );
  const ppeList = (Object.keys(PPE_NAME) as PpeItem[]).filter((k) =>
    query ? PPE_NAME[k].toLowerCase().includes(query) : drawer === 'ppe'
  );
  const conflicts = sandboxConflicts(items);
  const missing = sandboxMissingPpe(items, ppe);
  const full = items.length >= SANDBOX_SLOTS;

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-label="Thí nghiệm tự do – Tủ dụng cụ">
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <div className="flex items-center gap-1.5">
          <Boxes size={18} className="text-lab-400" />
          <h2 className="flex-1 text-sm font-bold">Thí nghiệm tự do</h2>
          <button
            className="btn min-h-[40px] px-2.5 text-xs"
            onClick={() => st().setSandbox(false)}
            title="Sang chế độ Làm bài tập (số liệu bài đã ghi vẫn giữ nguyên)"
          >
            <ArrowLeft size={14} /> Làm bài tập
          </button>
        </div>
        <p className="rounded bg-sky-900/40 p-1.5 text-[11px] text-sky-100">
          Lấy dụng cụ từ tủ (bấm "Ra bàn" hoặc kéo thẻ vào khung 3D). Bấm giữ & kéo dụng cụ để di chuyển, giữ{' '}
          <b>Shift</b> để nâng/hạ; đưa sát chỗ lắp (bình dưới burette, cốc trên kiềng…) sẽ tự khớp.{' '}
          <b>Không tính vào bài nộp.</b>
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2">
        {items.length > 0 && <SandboxTimeBar />}
        <SandboxAlerts />

        {/* Bàn thí nghiệm */}
        <section aria-label="Dụng cụ trên bàn">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>
              Trên bàn: {items.length}/{SANDBOX_SLOTS}
            </span>
            {items.length > 0 && (
              <button className="text-slate-400 underline hover:text-slate-200" onClick={() => st().clearSandbox()}>
                Cất hết vào tủ
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="rounded border border-dashed border-slate-600 p-2 text-center text-xs text-slate-400">
              Bàn đang trống — lấy dụng cụ từ tủ bên dưới.
            </p>
          ) : (
            <ol className="space-y-1">
              {items.map((id, i) => {
                const e = equipmentById(id);
                if (!e) return null;
                return (
                  <li
                    key={`${id}-${i}`}
                    className={`rounded-lg border p-1.5 text-sm ${sel === i ? 'border-sky-500' : 'border-slate-700'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 shrink-0 text-center text-xs text-slate-400">{i + 1}</span>
                      <button
                        className="min-w-0 flex-1 truncate text-left hover:text-white"
                        aria-expanded={sel === i}
                        onClick={() => st().selectSandbox(sel === i ? null : i)}
                        title={sel === i ? 'Thu gọn điều khiển' : 'Chọn để điều khiển'}
                      >
                        {sel === i ? '▾ ' : '▸ '}
                        {e.name}
                      </button>
                      <button
                        className="btn min-h-[32px] px-2 text-xs"
                        onClick={() => st().removeSandboxItem(i)}
                        aria-label={`Cất ${e.name} vào tủ`}
                        title="Cất vào tủ"
                      >
                        <Undo2 size={13} /> Cất
                      </button>
                    </div>
                    {sel === i && <SandboxItemControls slot={i} />}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Kiểm tra an toàn nhẹ nhàng */}
        {(conflicts.length > 0 || missing.length > 0) && (
          <section
            className="space-y-1 rounded-lg border border-amber-500/60 bg-amber-900/30 p-2 text-xs text-amber-100"
            role="status"
          >
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
                    <button
                      key={k}
                      className="btn min-h-[30px] px-2 text-xs"
                      onClick={() => st().togglePpe(k)}
                      title={`Dùng ${PPE_NAME[k].toLowerCase()}`}
                    >
                      <Icon size={12} /> {PPE_NAME[k]}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tủ dụng cụ */}
        <section aria-label="Tủ dụng cụ" className="space-y-1.5">
          <h3 className="text-xs font-semibold text-slate-300">Tủ dụng cụ</h3>
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input py-1.5 pl-7 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm nhanh theo tên (cốc, burette, kính…)"
              aria-label="Tìm dụng cụ theo tên"
            />
          </label>
          {!query && (
            <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Ngăn tủ">
              {DRAWERS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={drawer === key}
                  className={`btn min-h-[40px] flex-col gap-0 px-1 py-0.5 text-[11px] ${drawer === key ? 'border-lab-400 bg-lab-700 text-white' : ''}`}
                  onClick={() => setDrawer(key)}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          )}
          {list.length === 0 && ppeList.length === 0 && (
            <p className="p-2 text-center text-xs text-slate-400">Không có dụng cụ phù hợp.</p>
          )}
          <ul className="space-y-1">
            {ppeList.map((k) => {
              const Icon = PPE_ICON[k];
              return (
                <li
                  key={k}
                  className={`flex items-center gap-2 rounded-lg border p-1.5 text-sm ${ppe[k] ? 'border-emerald-600/70' : 'border-slate-700'}`}
                >
                  <Icon size={16} className="shrink-0 text-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">
                      {PPE_NAME[k]}{' '}
                      {ppe[k] && <span className="text-[11px] font-normal text-emerald-300">· đang dùng</span>}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{PPE_DESC[k]}</p>
                  </div>
                  <button
                    className={`${ppe[k] ? 'btn' : 'btn-primary'} min-h-[32px] shrink-0 px-2 text-xs`}
                    onClick={() => st().togglePpe(k)}
                  >
                    {ppe[k] ? 'Tháo' : 'Dùng'}
                  </button>
                </li>
              );
            })}
            {list.map((e) => {
              const count = items.filter((x) => x === e.id).length;
              return (
                <li
                  key={e.id}
                  draggable={!full}
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData(EQUIP_DRAG_TYPE, e.id);
                    ev.dataTransfer.setData('text/plain', e.name);
                    ev.dataTransfer.effectAllowed = 'copy';
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border p-1.5 text-sm ${count ? 'border-lab-500/70' : 'border-slate-700'} ${full ? '' : 'cursor-grab'}`}
                  title={`${e.description}${full ? '' : ' — kéo thả vào khung 3D để đặt đúng chỗ'}`}
                >
                  <GripVertical size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">
                      {e.name}
                      {count > 0 && (
                        <span className="ml-1 text-[11px] font-normal text-lab-400">
                          · đang dùng{count > 1 ? ` ×${count}` : ''}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{e.description}</p>
                  </div>
                  {count > 0 && (
                    <button
                      className="btn min-h-[32px] shrink-0 px-2 text-xs"
                      onClick={() => putBack(e.id)}
                      aria-label={`Cất ${e.name} vào tủ`}
                    >
                      <Undo2 size={13} /> Cất
                    </button>
                  )}
                  <button
                    className="btn-primary min-h-[32px] shrink-0 px-2 text-xs"
                    onClick={() => takeOut(e)}
                    disabled={full}
                    title={full ? `Bàn đã đủ ${SANDBOX_SLOTS} dụng cụ` : 'Đưa ra bàn'}
                    aria-label={`Đưa ${e.name} ra bàn`}
                  >
                    <Plus size={13} /> Ra bàn
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
