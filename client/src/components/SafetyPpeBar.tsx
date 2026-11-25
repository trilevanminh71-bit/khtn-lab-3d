/**
 * components/SafetyPpeBar.tsx — Thanh trang bị an toàn: Kính bảo hộ, Găng tay, Kiểm tra nhãn hóa chất.
 * "Kiểm tra nhãn" mở bảng nhãn hóa chất của bài (tên IUPAC, nồng độ, cảnh báo nguy hiểm) — phải đọc rồi xác nhận.
 */
import { useState } from 'react';
import { Glasses, Hand, ShieldAlert, Tag } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { ModalShell } from './ModalShell';
import type { PpeItem } from '../types/lab';

const ITEMS: Array<{ key: PpeItem; label: string; Icon: typeof Glasses }> = [
  { key: 'goggles', label: 'Đeo kính', Icon: Glasses },
  { key: 'gloves', label: 'Đeo găng', Icon: Hand },
  { key: 'labelCheck', label: 'Đọc nhãn', Icon: Tag }
];

export function SafetyPpeBar() {
  const ppe = useLabStore((s) => s.ppe);
  const plugin = useLabStore((s) => s.plugin);
  const [showLabels, setShowLabels] = useState(false);
  const required = plugin.ppeRequired;
  const missing = required.filter((k) => !ppe[k]);

  const onItem = (k: PpeItem): void => {
    if (k === 'labelCheck' && !ppe.labelCheck) setShowLabels(true);
    else useLabStore.getState().togglePpe(k);
  };

  if (required.length === 0) return null;

  return (
    <div className="no-print flex items-center gap-1.5 border-b border-slate-800 bg-slate-900 px-2 py-1" data-tour="ppe">
      <span className={`flex items-center gap-1 text-xs font-semibold ${missing.length ? 'text-warn' : 'text-ok'}`}>
        <ShieldAlert size={15} /> <span className="hidden sm:inline">{missing.length ? 'Bảo hộ trước khi làm:' : 'Đã đủ bảo hộ'}</span>
      </span>
      {ITEMS.filter((x) => required.includes(x.key)).map(({ key, label, Icon }) => {
        const on = ppe[key];
        const need = required.includes(key);
        return (
          <button
            key={key}
            className={`btn min-h-[40px] flex-1 px-2 py-1 text-xs sm:flex-none ${on ? 'border-ok bg-emerald-900/50 text-ok' : need ? 'border-amber-500/70' : ''}`}
            onClick={() => onItem(key)}
            aria-pressed={on}
            title={need ? `${label} (bắt buộc cho bài này)` : label}
          >
            <Icon size={14} /> {label} {on ? '✓' : ''}
          </button>
        );
      })}
      {showLabels && (
        <ModalShell
          title="Kiểm tra nhãn hóa chất"
          onClose={() => setShowLabels(false)}
          icon={<Tag size={18} />}
          footer={
            <>
              <button className="btn" onClick={() => setShowLabels(false)}>
                Đóng
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!useLabStore.getState().ppe.labelCheck) useLabStore.getState().togglePpe('labelCheck');
                  setShowLabels(false);
                }}
              >
                Tôi đã đọc kĩ nhãn
              </button>
            </>
          }
        >
          {plugin.chemicals.length === 0 ? (
            <p className="text-sm text-slate-300">Bài này không dùng hóa chất nguy hiểm. Vẫn cần giữ gìn dụng cụ cẩn thận.</p>
          ) : (
            <ul className="space-y-2">
              {plugin.chemicals.map((c) => (
                <li key={c.name} className="rounded-lg border-2 border-amber-500/60 bg-amber-50 p-3 text-slate-900">
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="text-base">{c.name}</b>
                    <span className="font-mono">{c.formula}</span>
                  </div>
                  <div className="text-sm">Nồng độ: {c.concentration}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.hazards.map((h) => (
                      <span key={h} className="chip bg-red-600 text-white">
                        ⚠ {h}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ModalShell>
      )}
    </div>
  );
}
