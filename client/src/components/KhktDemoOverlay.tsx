/**
 * components/KhktDemoOverlay.tsx — Lớp phủ trình diễn cho Ban giám khảo KHKT:
 * FPS, Draw Calls, số tam giác, geometry/texture trên GPU, RAM JS (nếu trình duyệt cho đọc), pixel ratio;
 * nút giả lập sự cố nhanh (theo danh sách sự cố của bài + thiếu bảo hộ) và đổi mức đồ họa trực tiếp.
 */
import { Activity, Zap } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';

const QUALITY = ['Máy yếu', 'Trung bình', 'Cao'];

export function KhktDemoOverlay() {
  const perf = useLabStore((s) => s.perf);
  const plugin = useLabStore((s) => s.plugin);
  const quality = useLabStore((s) => s.qualityLevel);
  const st = useLabStore.getState;
  const incidents = [...plugin.incidents.map((i) => ({ id: i.id, title: i.title })), { id: 'ppe-missing', title: 'Thiếu bảo hộ' }];
  return (
    <div className="no-print absolute left-2 top-2 z-20 w-56 rounded-lg border border-amber-500/60 bg-black/80 p-2 font-mono text-[11px] text-amber-100 shadow-lg" aria-label="Thông số hiệu năng KHKT">
      <div className="mb-1 flex items-center gap-1 font-sans text-xs font-bold text-amber-300">
        <Activity size={13} /> CHẾ ĐỘ KHKT
      </div>
      {perf ? (
        <dl className="grid grid-cols-2 gap-x-2">
          <dt>FPS</dt>
          <dd className={perf.fps < 28 ? 'text-danger' : 'text-ok'}>{perf.fps}</dd>
          <dt>Draw calls</dt>
          <dd>{perf.drawCalls}</dd>
          <dt>Tam giác</dt>
          <dd>{perf.triangles.toLocaleString('vi-VN')}</dd>
          <dt>Geometry</dt>
          <dd>{perf.geometries}</dd>
          <dt>Texture</dt>
          <dd>{perf.textures}</dd>
          <dt>RAM JS</dt>
          <dd>{perf.memoryMb !== null ? `${perf.memoryMb} MB` : 'không đọc được'}</dd>
          <dt>Pixel ratio</dt>
          <dd>{perf.pixelRatio.toFixed(2)}</dd>
        </dl>
      ) : (
        <p>Đang đo…</p>
      )}
      <div className="mt-2 font-sans">
        <div className="mb-1 text-[10px] uppercase text-slate-400">Đồ họa</div>
        <div className="flex gap-1">
          {QUALITY.map((q, i) => (
            <button key={q} className={`flex-1 rounded px-1 py-0.5 text-[10px] ${quality === i ? 'bg-amber-500 text-black' : 'bg-slate-700'}`} onClick={() => st().setQualityLevel(i)}>
              {q}
            </button>
          ))}
        </div>
        <div className="mb-1 mt-2 text-[10px] uppercase text-slate-400">Giả lập sự cố</div>
        <div className="flex flex-wrap gap-1">
          {incidents.map((i) => (
            <button key={i.id} className="flex items-center gap-0.5 rounded bg-red-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-600" onClick={() => st().simulateIncident(i.id)}>
              <Zap size={10} /> {i.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
