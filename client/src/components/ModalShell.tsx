/**
 * components/ModalShell.tsx — Khung hộp thoại dùng chung: nền mờ, tiêu đề, nút đóng, phím Esc, khóa cuộn,
 * hỗ trợ trình đọc màn hình (role="dialog", aria-modal).
 */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
  icon?: ReactNode;
}

export function ModalShell({ title, onClose, children, wide, footer, icon }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className={`card flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-xl ${wide ? 'max-w-5xl' : 'max-w-xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
          {icon}
          <h2 className="flex-1 text-base font-bold text-slate-100">{title}</h2>
          <button className="btn-ghost min-h-0 p-1.5" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-700 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
