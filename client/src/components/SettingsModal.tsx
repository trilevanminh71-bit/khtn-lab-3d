/**
 * components/SettingsModal.tsx — Cài đặt: đồ họa máy yếu & tự thích ứng FPS, trợ năng (cỡ chữ, mù màu,
 * tương phản cao, giảm chuyển động), âm thanh/rung, địa chỉ máy chủ LAN/API (kiểm tra kết nối),
 * Gemini API key riêng, link gói cập nhật bài học, đổi mã PIN (phải nhập PIN cũ), xem lại tour.
 */
import { useState } from 'react';
import { KeyRound, Settings } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { resolveDefaultApiUrl } from '../config/appConfig';
import { isValidPinFormat, sha256Hex, verifyPin } from '../utils/cryptoPin';
import { audit } from '../offline/db';
import { apiFetch } from '../services/appServices';
import { ModalShell } from './ModalShell';
import type { AppSettings, ColorBlindMode } from '../types/lab';

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export default function SettingsModal() {
  const settings = useLabStore((s) => s.settings);
  const update = (p: Partial<AppSettings>): void => useLabStore.getState().updateSettings(p);
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [apiMsg, setApiMsg] = useState('');
  const [key, setKey] = useState(settings.geminiApiKey);
  const [remote, setRemote] = useState(settings.remoteUpdateUrl);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const testApi = async (): Promise<void> => {
    update({ apiUrl: apiUrl.trim() });
    setApiMsg('Đang kiểm tra…');
    try {
      const r = await apiFetch<{ status: string; database: string }>('/api/health', {}, 5000);
      setApiMsg(`✓ Kết nối được máy chủ (CSDL: ${r.database}).`);
      useLabStore.getState().setServerOnline(true);
    } catch (e) {
      setApiMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
      useLabStore.getState().setServerOnline(false);
    }
  };

  const changePin = async (): Promise<void> => {
    if (!(await verifyPin(oldPin, settings.pinHash))) return setPinMsg('Mã PIN hiện tại không đúng.');
    if (!isValidPinFormat(newPin)) return setPinMsg('PIN mới phải gồm 4–8 chữ số.');
    update({ pinHash: await sha256Hex(newPin) });
    await audit('pin-change', 'Đổi mã PIN');
    setOldPin('');
    setNewPin('');
    setPinMsg('✓ Đã đổi mã PIN (chỉ lưu dạng băm SHA-256).');
  };

  return (
    <ModalShell title="Cài đặt" onClose={() => useLabStore.getState().closeModal()} icon={<Settings size={18} />} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="label">Đồ họa</h3>
          <Toggle label="Đồ họa máy yếu" hint="Giảm độ phân giải, tắt bóng đổ — cho máy tính cũ / điện thoại giá rẻ." checked={settings.lowEndGraphics} onChange={(v) => update({ lowEndGraphics: v })} />
          <Toggle label="Tự thích ứng FPS" hint="Tự hạ chất lượng khi FPS dưới 28 và tăng lại khi máy rảnh." checked={settings.autoAdaptiveFps} onChange={(v) => update({ autoAdaptiveFps: v })} />
          <h3 className="label mt-3">Trợ năng</h3>
          <label className="block text-sm">
            Cỡ chữ: <b>{Math.round(settings.fontScale * 100)}%</b>
            <input type="range" min={0.9} max={1.4} step={0.05} value={settings.fontScale} onChange={(e) => update({ fontScale: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="mt-1 block text-sm">
            Chế độ mù màu
            <select className="input mt-1" value={settings.colorBlindMode} onChange={(e) => update({ colorBlindMode: e.target.value as ColorBlindMode })}>
              <option value="none">Tắt</option>
              <option value="deuteranopia">Mù màu lục (Deuteranopia)</option>
              <option value="protanopia">Mù màu đỏ (Protanopia)</option>
              <option value="tritanopia">Mù màu lam – vàng (Tritanopia)</option>
            </select>
          </label>
          <Toggle label="Tương phản cao" checked={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
          <Toggle label="Giảm chuyển động" checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
          <Toggle label="Âm thanh hiệu ứng" checked={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
          <Toggle label="Rung phản hồi (điện thoại Android)" checked={settings.hapticsEnabled} onChange={(v) => update({ hapticsEnabled: v })} />
          <button className="btn mt-2 text-xs" onClick={() => { update({ showOnboarding: true }); useLabStore.getState().closeModal(); }}>
            Xem lại tour hướng dẫn
          </button>
        </section>
        <section className="space-y-3">
          <div>
            <h3 className="label">Máy chủ lớp học (LAN) / API</h3>
            <div className="flex gap-1">
              <input className="input font-mono text-xs" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder={resolveDefaultApiUrl()} aria-label="Địa chỉ API" />
              <button className="btn" onClick={() => void testApi()}>Lưu & thử</button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Để trống = tự dò {resolveDefaultApiUrl()}. Ví dụ mạng LAN: http://192.168.1.10:8000</p>
            {apiMsg && <p className="text-xs">{apiMsg}</p>}
          </div>
          <div>
            <h3 className="label">Gemini API key riêng (tùy chọn)</h3>
            <div className="flex gap-1">
              <input className="input font-mono text-xs" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Dán khóa từ Google AI Studio" aria-label="Gemini API key" autoComplete="off" />
              <button className="btn" onClick={() => { update({ geminiApiKey: key.trim() }); useLabStore.getState().toast('success', key.trim() ? 'Đã lưu API key trên máy này.' : 'Đã xóa API key.'); }}>Lưu</button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Chỉ dùng khi máy chủ lớp không có AI. Khóa lưu trên trình duyệt này, gửi trong header tới Google.</p>
          </div>
          <div>
            <h3 className="label">Link gói cập nhật bài học (GitHub/Drive)</h3>
            <div className="flex gap-1">
              <input className="input font-mono text-xs" value={remote} onChange={(e) => setRemote(e.target.value)} placeholder="https://raw.githubusercontent.com/.../bundle.json" aria-label="Link gói cập nhật" />
              <button className="btn" onClick={() => { update({ remoteUpdateUrl: remote.trim() }); useLabStore.getState().toast('success', 'Đã lưu link — sẽ kiểm tra khi khởi động có mạng.'); }}>Lưu</button>
            </div>
          </div>
          <div>
            <h3 className="label flex items-center gap-1"><KeyRound size={12} /> Đổi mã PIN giáo viên</h3>
            <div className="grid grid-cols-2 gap-1">
              <input className="input" type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN hiện tại" aria-label="PIN hiện tại" />
              <input className="input" type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN mới (4–8 số)" aria-label="PIN mới" />
            </div>
            <button className="btn mt-1 w-full" onClick={() => void changePin()} disabled={!oldPin || !newPin}>Đổi PIN</button>
            {pinMsg && <p className="mt-1 text-xs">{pinMsg}</p>}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
