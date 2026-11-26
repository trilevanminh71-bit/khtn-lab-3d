/**
 * components/OnboardingTour.tsx — Tour hướng dẫn 4 bước khi mở web lần đầu (bỏ qua được; xem lại trong Trợ giúp hoặc Cài đặt).
 * Mỗi bước làm nổi bật một vùng giao diện (thuộc tính data-tour) và giải thích cách dùng.
 */
import { useEffect, useState } from 'react';
import { useLabStore } from '../store/useLabStore';

const STEPS = [
  { target: 'subjects', title: '1. Chọn môn học', text: 'Bấm Vật lí, Hóa học hoặc Sinh học để xem danh sách bài và chọn bài.' },
  { target: 'canvas', title: '2. Không gian 3D', text: 'Kéo để xoay, chụm 2 ngón để phóng to. Dụng cụ phát sáng là dụng cụ cần chạm.' },
  { target: 'hud', title: '3. Bảng thí nghiệm', text: 'Nhập tên và lớp trước. Mỗi bước có một nút chính màu xanh; bài có hóa chất cần bật bảo hộ ở thanh phía trên. Bài tự lưu.' },
  { target: 'teacher', title: '4. Menu', text: 'Cài đặt, so sánh thí nghiệm và Cổng giáo viên nằm trong Menu. Làm xong, mở phần Kết quả để nộp bài.' }
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
