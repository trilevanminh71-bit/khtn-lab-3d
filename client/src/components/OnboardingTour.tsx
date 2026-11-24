/**
 * components/OnboardingTour.tsx — Tour hướng dẫn tương tác 5 bước khi mở web lần đầu.
 * Mỗi bước làm nổi bật một vùng giao diện (thuộc tính data-tour) và giải thích cách dùng.
 */
import { useEffect, useState } from 'react';
import { useLabStore } from '../store/useLabStore';

const STEPS = [
  { target: 'subjects', title: '1. Chọn môn học', text: 'Chọn Vật lí, Hóa học hoặc Sinh học. Mỗi môn có 4 bài thí nghiệm chuẩn SGK Kết nối tri thức 10.' },
  { target: 'canvas', title: '2. Không gian 3D', text: 'Kéo để xoay, cuộn hoặc chụm 2 ngón để phóng to. Dụng cụ phát sáng xanh là dụng cụ cần thao tác ở bước hiện tại. Kéo dụng cụ vào vòng tròn xanh để lắp ráp.' },
  { target: 'ppe', title: '3. An toàn trước tiên', text: 'Bật kính bảo hộ, găng tay và kiểm tra nhãn hóa chất trước khi làm thí nghiệm hóa – sinh. Thiếu bảo hộ sẽ bị trừ điểm.' },
  { target: 'hud', title: '4. Bảng thí nghiệm', text: 'Theo dõi các bước, chỉnh thông số, bấm Đo để ghi số liệu, tự tính kết quả và viết kết luận. Bài tự lưu mỗi 5 giây.' },
  { target: 'teacher', title: '5. Nộp bài & Cổng giáo viên', text: 'Nộp bài để nhận phiếu điểm chi tiết và mã QR. Giáo viên quét QR để thu bài không cần mạng.' }
];

export function OnboardingTour() {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const finish = (): void => useLabStore.getState().updateSettings({ showOnboarding: false });

  useEffect(() => {
    const update = (): void => {
      const el = document.querySelector(`[data-tour="${STEPS[i].target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [i]);

  const step = STEPS[i];
  const boxTop = rect ? Math.min(window.innerHeight - 200, rect.bottom + 8) : window.innerHeight / 2 - 100;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Hướng dẫn nhanh">
      <div className="absolute inset-0 bg-black/55" onClick={finish} />
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-lab-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: Math.min(rect.height + 8, window.innerHeight - rect.top) }}
        />
      )}
      <div className="card absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 p-4" style={{ top: Math.max(12, boxTop) }}>
        <h3 className="mb-1 font-bold text-lab-400">{step.title}</h3>
        <p className="text-sm text-slate-200">{step.text}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {i + 1}/{STEPS.length}
          </span>
          <button className="btn-ghost ml-auto" onClick={finish}>
            Bỏ qua
          </button>
          {i > 0 && (
            <button className="btn" onClick={() => setI(i - 1)}>
              Trước
            </button>
          )}
          <button className="btn-primary" onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : finish())}>
            {i < STEPS.length - 1 ? 'Tiếp' : 'Bắt đầu'}
          </button>
        </div>
      </div>
    </div>
  );
}
