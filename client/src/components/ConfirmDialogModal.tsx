/**
 * components/ConfirmDialogModal.tsx — Hộp xác nhận trước thao tác khó hoàn tác (Làm lại bài, chuyển bài khi đang làm dở,
 * xóa dữ liệu, cập nhật phiên bản). Nội dung lấy từ store.confirm.
 */
import { AlertTriangle } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { ModalShell } from './ModalShell';

export function ConfirmDialogModal() {
  const confirm = useLabStore((s) => s.confirm);
  const close = useLabStore((s) => s.closeConfirm);
  if (!confirm) return null;
  return (
    <ModalShell
      title={confirm.title}
      onClose={close}
      icon={<AlertTriangle size={18} className="text-warn" />}
      footer={
        <>
          <button className="btn" onClick={close} autoFocus>
            Hủy
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              const fn = confirm.onConfirm;
              close();
              fn();
            }}
          >
            {confirm.confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-200">{confirm.message}</p>
    </ModalShell>
  );
}
