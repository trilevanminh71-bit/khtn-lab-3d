/**
 * components/ModeChooser.tsx — Màn hình mở đầu chọn chế độ:
 *  1) Thí nghiệm tự do (tủ dụng cụ, không chấm điểm) 2) Làm bài tập (23 bài chuẩn) 3) Phần dành cho giáo viên (vẫn qua mã PIN).
 * Mở lại bất cứ lúc nào bằng nút "Chế độ" trên thanh trên cùng.
 */
import { Boxes, ClipboardList, GraduationCap, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';

const st = useLabStore.getState;

export function ModeChooser() {
  const sandboxOn = useLabStore((s) => s.sandboxOn);
  const choices = [
    {
      key: 'free',
      Icon: Boxes,
      title: 'Thí nghiệm tự do',
      text: 'Mở tủ dụng cụ, tự bày dụng cụ ra bàn 3D, lắp ghép và vận hành như đồ thật. Không chấm điểm.',
      run: () => st().setSandbox(true),
      cls: 'border-emerald-500/70 hover:bg-emerald-900/30'
    },
    {
      key: 'lesson',
      Icon: ClipboardList,
      title: 'Làm bài tập',
      text: '23 bài thí nghiệm chuẩn SGK: làm theo bước, đo số liệu, viết kết luận và nộp bài.',
      run: () => st().setSandbox(false),
      cls: 'border-sky-500/70 hover:bg-sky-900/30'
    },
    {
      key: 'teacher',
      Icon: GraduationCap,
      title: 'Phần dành cho giáo viên',
      text: 'Giao bài, xem bài nộp và thống kê lớp (cần mã PIN giáo viên).',
      run: () => {
        st().setSandbox(false);
        st().requestPin('teacher');
      },
      cls: 'border-amber-500/70 hover:bg-amber-900/30'
    }
  ];
  return (
    <div
      className="modal-backdrop fixed inset-0 z-[78] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-title"
    >
      <div className="modal-card card relative w-full max-w-3xl p-4 sm:p-6">
        <button
          className="absolute right-2 top-2 rounded p-2 text-slate-400 hover:bg-slate-800"
          onClick={() => st().setModeChooser(false)}
          aria-label="Đóng, giữ chế độ hiện tại"
          title="Đóng"
        >
          <X size={18} />
        </button>
        <h1 id="mode-title" className="text-center text-xl font-bold">
          🧪 Em muốn làm gì hôm nay?
        </h1>
        <p className="mb-4 text-center text-sm text-slate-400">
          Có thể đổi chế độ bất cứ lúc nào bằng nút "Chế độ" ở góc trên.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {choices.map(({ key, Icon, title, text, run, cls }) => (
            <button
              key={key}
              className={`flex min-h-[150px] flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${cls} ${key === 'free' && sandboxOn ? 'ring-2 ring-emerald-400' : ''}`}
              onClick={() => {
                st().setModeChooser(false);
                run();
              }}
            >
              <Icon size={36} />
              <span className="text-base font-bold">{title}</span>
              <span className="text-xs text-slate-300">{text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
