/**
 * components/QrScannerModal.tsx — Giáo viên dùng camera trình duyệt quét mã QR nộp bài của học sinh (không cần mạng).
 * Dùng getUserMedia (camera sau) + jsQR giải mã từng khung hình ~6 lần/giây. Có ô dán chuỗi mã thủ công dự phòng.
 * Mỗi mã hợp lệ (đúng checksum) → lưu IndexedDB (bỏ qua mã trùng).
 */
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ClipboardPaste, QrCode } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { decodeQrPayload } from '../utils/qrSyncCodec';
import { addSubmission, audit } from '../offline/db';
import { pluginByIndex } from '../plugins/pluginRegistry';
import { maskToMisconceptions } from '../data/misconceptionKB';
import { soundEngine } from '../audio/soundEngine';
import { vibrate } from '../utils/haptics';
import { ModalShell } from './ModalShell';
import type { QrPayload, SubmissionRecord } from '../types/lab';

/** Chuyển payload QR thành bài nộp đầy đủ */
export function payloadToSubmission(p: QrPayload, pluginId: string): SubmissionRecord {
  return {
    uid: `${p.classCode}-${p.studentCode}-${pluginId}-${p.createdAtMin}`,
    pluginId,
    studentName: p.studentCode,
    studentCode: p.studentCode,
    classCode: p.classCode,
    score: p.score,
    preScore: p.preScore,
    preMax: p.preMax,
    postScore: p.postScore,
    postMax: p.postMax,
    resultValue: Number.NaN,
    trueValue: Number.NaN,
    relErrorPercent: p.relErrorPercent,
    misconceptions: maskToMisconceptions(p.misconceptionMask),
    likert: p.likert,
    durationSec: p.durationSec,
    createdAt: p.createdAtMin * 60000,
    synced: false,
    source: 'qr'
  };
}

export default function QrScannerModal() {
  const plugins = useLabStore((s) => s.plugins);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const [log, setLog] = useState<Array<{ ok: boolean; text: string }>>([]);
  const seen = useRef(new Set<string>());

  const handleCode = async (raw: string): Promise<void> => {
    const text = raw.trim();
    if (!text || seen.current.has(text)) return;
    seen.current.add(text);
    const d = decodeQrPayload(text);
    if (!d.ok) {
      soundEngine.play('error');
      setLog((l) => [{ ok: false, text: d.error }, ...l]);
      return;
    }
    const plugin = pluginByIndex(d.payload.pluginIndex, plugins);
    const rec = payloadToSubmission(d.payload, plugin?.id ?? `bai-${d.payload.pluginIndex}`);
    const isNew = await addSubmission(rec).catch(() => false);
    void audit('qr-scan', rec.uid);
    soundEngine.play(isNew ? 'success' : 'tick');
    vibrate('success');
    setLog((l) => [{ ok: true, text: `${isNew ? '✔ Đã thu' : '↺ Trùng, bỏ qua'}: ${rec.classCode}/${rec.studentCode} — ${plugin?.shortTitle ?? 'Bài #' + d.payload.pluginIndex} — ${rec.score} điểm` }, ...l]);
  };

  useEffect(() => {
    if (!camOn) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const start = async (): Promise<void> => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const scan = (): void => {
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c || stopped) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, c.width, c.height);
              const img = ctx.getImageData(0, 0, c.width, c.height);
              const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (code?.data) void handleCode(code.data);
            }
          }
          timer = window.setTimeout(scan, 160);
        };
        scan();
      } catch (e) {
        setCamError(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}. Camera chỉ hoạt động trên HTTPS hoặc localhost — có thể dán chuỗi mã ở bên dưới.`);
        setCamOn(false);
      }
    };
    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camOn]);

  return (
    <ModalShell title="Thu bài bằng mã QR (offline)" onClose={() => (useLabStore.getState().isPinSessionValid() ? useLabStore.getState().openModal('teacher') : useLabStore.getState().closeModal())} icon={<QrCode size={18} />} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            {!camOn && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Camera đang tắt</div>}
            {camOn && <div className="pointer-events-none absolute inset-[18%] rounded-xl border-4 border-lab-400/80" />}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button className={camOn ? 'btn-danger w-full' : 'btn-primary w-full'} onClick={() => { setCamError(''); setCamOn(!camOn); }}>
            <Camera size={16} /> {camOn ? 'Tắt camera' : 'Bật camera quét QR'}
          </button>
          {camError && <p className="text-xs text-warn">{camError}</p>}
          <label className="label" htmlFor="qr-manual">Hoặc dán chuỗi mã (mỗi dòng một mã)</label>
          <textarea id="qr-manual" className="input font-mono text-xs" rows={3} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="K1.10T1.HS23...." />
          <button className="btn w-full" onClick={() => { manual.split(/\s+/).forEach((x) => void handleCode(x)); setManual(''); }}>
            <ClipboardPaste size={16} /> Nhập mã đã dán
          </button>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-bold">Kết quả quét ({log.filter((l) => l.ok).length})</h3>
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto text-sm">
            {log.length === 0 && <li className="text-slate-400">Chưa quét mã nào. Đưa mã QR trên phiếu báo cáo của học sinh vào khung.</li>}
            {log.map((l, i) => (
              <li key={i} className={`rounded p-1.5 ${l.ok ? 'bg-emerald-900/40' : 'bg-red-900/40 text-red-200'}`}>
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}
