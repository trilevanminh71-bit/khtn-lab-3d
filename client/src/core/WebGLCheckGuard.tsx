/**
 * core/WebGLCheckGuard.tsx — Kiểm tra trình duyệt có WebGL trước khi dựng cảnh 3D.
 * Nếu không có: hướng dẫn bật "tăng tốc phần cứng" trên Chrome/Edge/Firefox/Cốc Cốc cho máy cũ.
 */
import { useMemo, type ReactNode } from 'react';

export function detectWebGL(): { ok: boolean; version: 0 | 1 | 2 } {
  try {
    const c = document.createElement('canvas');
    if (c.getContext('webgl2')) return { ok: true, version: 2 };
    if (c.getContext('webgl') || c.getContext('experimental-webgl')) return { ok: true, version: 1 };
  } catch {
    /* trình duyệt chặn */
  }
  return { ok: false, version: 0 };
}

export function WebGLCheckGuard({ children }: { children: ReactNode }) {
  const status = useMemo(detectWebGL, []);
  if (status.ok) return <>{children}</>;
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 p-6">
      <div className="max-w-lg space-y-3 rounded-xl border border-amber-500/40 bg-slate-800 p-5 text-sm text-slate-200">
        <h2 className="text-lg font-bold text-amber-300">Trình duyệt chưa bật WebGL (đồ họa 3D)</h2>
        <p>Máy tính cũ thường tắt tăng tốc phần cứng. Hãy thử:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <b>Chrome / Edge / Cốc Cốc:</b> Cài đặt → Hệ thống → bật <i>“Sử dụng tính năng tăng tốc phần cứng khi có”</i> → Khởi động lại.
          </li>
          <li>
            <b>Firefox:</b> Cài đặt → Chung → Hiệu suất → bỏ chọn “Sử dụng cài đặt khuyến nghị” → bật tăng tốc phần cứng.
          </li>
          <li>Cập nhật trình điều khiển card đồ họa (driver) hoặc dùng trình duyệt mới hơn.</li>
          <li>Trên điện thoại: cập nhật Chrome/Safari lên bản mới nhất.</li>
        </ol>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Tải lại trang sau khi bật
        </button>
      </div>
    </div>
  );
}
