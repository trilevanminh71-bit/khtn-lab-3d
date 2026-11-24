/**
 * components/PinGuardModal.tsx — Khóa mã PIN (băm SHA-256, mặc định 2026) bảo vệ Cổng GV, CMS, No-Code Wizard,
 * Tài nguyên 3D và KHKT Mode. Sai 5 lần → khóa 30 giây. Phiên PIN hợp lệ 30 phút.
 */
import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { verifyPin } from '../utils/cryptoPin';
import { audit } from '../offline/db';
import { soundEngine } from '../audio/soundEngine';
import { vibrate } from '../utils/haptics';
import { ModalShell } from './ModalShell';

const TARGET_LABEL = {
  teacher: 'Cổng giáo viên',
  cms: 'Trình chỉnh sửa nội dung (CMS)',
  wizard: 'Trình tạo bài No-Code',
  assets: 'Tài nguyên 3D',
  khkt: 'Chế độ trình diễn KHKT',
  'settings-pin': 'Đổi mã PIN'
} as const;

let failures = 0;
let lockedUntil = 0;

export function PinGuardModal() {
  const target = useLabStore((s) => s.pinTarget);
  const pinHash = useLabStore((s) => s.settings.pinHash);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPin('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [target]);

  if (!target || target === 'settings-pin') return null;

  const submit = async (): Promise<void> => {
    if (Date.now() < lockedUntil) {
      setError(`Đã nhập sai quá nhiều. Thử lại sau ${Math.ceil((lockedUntil - Date.now()) / 1000)} giây.`);
      return;
    }
    setBusy(true);
    const ok = await verifyPin(pin, pinHash);
    setBusy(false);
    if (ok) {
      failures = 0;
      soundEngine.play('success');
      void audit('pin-ok', target);
      useLabStore.getState().pinVerified();
    } else {
      failures++;
      soundEngine.play('error');
      vibrate('warning');
      void audit('pin-fail', target);
      if (failures >= 5) {
        lockedUntil = Date.now() + 30000;
        failures = 0;
        setError('Sai 5 lần — tạm khóa 30 giây.');
      } else setError(`Mã PIN không đúng (còn ${5 - failures} lần thử).`);
      setPin('');
    }
  };

  return (
    <ModalShell
      title={`Nhập mã PIN — ${TARGET_LABEL[target]}`}
      onClose={() => useLabStore.getState().cancelPin()}
      icon={<Lock size={18} className="text-amber-300" />}
      footer={
        <>
          <button className="btn" onClick={() => useLabStore.getState().cancelPin()}>
            Hủy
          </button>
          <button className="btn-primary" disabled={busy || pin.length < 4} onClick={() => void submit()}>
            Mở khóa
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-3"
      >
        <p className="text-sm text-slate-300">Khu vực dành cho giáo viên. Mã PIN mặc định khi cài đặt là <b>2026</b> — hãy đổi trong Cài đặt.</p>
        <input
          ref={inputRef}
          className="input text-center text-2xl tracking-[0.5em]"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-label="Mã PIN"
        />
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </form>
    </ModalShell>
  );
}
