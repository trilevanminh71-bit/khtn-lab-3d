/**
 * components/IntegrityPanel.tsx — Trong Cổng giáo viên: danh sách bài bị máy chủ từ chối và trình xem nhật kí thao tác
 * của một bài nộp (lấy từ máy chủ, học sinh không xóa được).
 */
import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { apiFetch } from '../services/appServices';

export interface RejectedRow {
  uid: string;
  classCode: string;
  studentCode: string;
  pluginId: string;
  reasons: string[];
  receivedAt: number;
}

interface EventRow {
  at: number;
  type: string;
  detail: string;
}

/** Tên thao tác dễ đọc cho giáo viên */
const EVENT_NAMES: Record<string, string> = {
  measure: 'Đo',
  'commit-trial': 'Ghi vào bảng',
  'manual-trial': 'Nhập tay',
  'delete-trial': 'Xóa lần đo',
  'flag-trial': 'Đánh dấu lỗi',
  quiz: 'Trắc nghiệm',
  reset: 'Làm lại',
  step: 'Làm bước',
  param: 'Chỉnh thông số'
};

function EventsViewer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('khtn-admin-token') ?? '';
    } catch {
      return '';
    }
  });
  const [data, setData] = useState<{ flags: string[]; events: EventRow[] } | null>(null);
  const [err, setErr] = useState('');
  const load = async (t: string): Promise<void> => {
    setErr('');
    try {
      const r = await apiFetch<{ flags: string[]; events: EventRow[] }>(`/api/submissions/${encodeURIComponent(uid)}/events`, t ? { headers: { 'X-Admin-Token': t } } : {});
      setData({ flags: Array.isArray(r.flags) ? r.flags : [], events: Array.isArray(r.events) ? r.events : [] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    void load(token);
    // Chỉ tải lại khi đổi bài; mã quản trị được gửi khi bấm "Xem"
  }, [uid]);
  return (
    <section className="mb-2 rounded-lg border border-slate-600 p-2" aria-label="Nhật kí thao tác">
      <div className="mb-1 flex items-center justify-between text-sm font-semibold">
        <span>Nhật kí thao tác · {uid}</span>
        <button className="rounded p-1 hover:bg-slate-800" onClick={onClose} aria-label="Đóng nhật kí">
          <X size={14} />
        </button>
      </div>
      {err && (
        <form
          className="flex flex-wrap items-center gap-1 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem('khtn-admin-token', token);
            } catch {
              /* trình duyệt chặn bộ nhớ phiên → vẫn dùng mã cho lần này */
            }
            void load(token);
          }}
        >
          <span className="text-warn">{err}</span>
          <input className="input w-48 py-1 text-xs" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Mã quản trị máy chủ (ADMIN_TOKEN)" aria-label="Mã quản trị máy chủ" autoComplete="off" />
          <button className="btn py-1 text-xs" type="submit">Xem</button>
        </form>
      )}
      {data && (
        <div className="max-h-52 overflow-y-auto text-xs">
          {data.events.length === 0 ? (
            <p className="text-slate-400">Bài này không kèm nhật kí (gửi từ phiên bản cũ).</p>
          ) : (
            <table className="w-full">
              <tbody>
                {data.events.map((e, i) => (
                  <tr key={`${e.at}-${i}`} className="border-b border-slate-800">
                    <td className="whitespace-nowrap p-0.5 font-mono text-slate-400">{new Date(e.at).toLocaleTimeString('vi-VN')}</td>
                    <td className="whitespace-nowrap p-0.5">{EVENT_NAMES[e.type] ?? e.type}</td>
                    <td className="break-all p-0.5 text-slate-300">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

export function IntegrityPanel({ rejected, pName, eventsUid, onCloseEvents }: { rejected: RejectedRow[]; pName: (id: string) => string; eventsUid: string | null; onCloseEvents: () => void }) {
  return (
    <>
      {eventsUid && <EventsViewer uid={eventsUid} onClose={onCloseEvents} />}
      {rejected.length > 0 && (
        <details className="mb-2 rounded-lg border border-red-700/70 p-2">
          <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red-200">
            <ShieldAlert size={15} /> {rejected.length} bài bị máy chủ từ chối (không tính vào thống kê)
          </summary>
          <table className="mt-1 w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="p-1">Lớp</th>
                <th className="p-1">Mã HS</th>
                <th className="p-1">Bài</th>
                <th className="p-1">Lí do</th>
                <th className="p-1">Lúc</th>
              </tr>
            </thead>
            <tbody>
              {rejected.map((r) => (
                <tr key={r.uid} className="border-b border-slate-800">
                  <td className="p-1">{r.classCode}</td>
                  <td className="p-1">{r.studentCode}</td>
                  <td className="p-1">{pName(r.pluginId)}</td>
                  <td className="p-1">{r.reasons.join(' ')}</td>
                  <td className="whitespace-nowrap p-1">{r.receivedAt ? new Date(r.receivedAt).toLocaleString('vi-VN') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
