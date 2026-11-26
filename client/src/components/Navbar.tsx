/**
 * components/Navbar.tsx — Thanh trên cùng gọn: 3 môn học (mở danh sách bài), Trợ giúp và menu phụ.
 * Menu phụ chứa: So sánh 3D, Cổng giáo viên (PIN), Chế độ KHKT (PIN), Cài đặt, trạng thái mạng / máy chủ / đồ họa.
 */
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Columns2, HelpCircle, Menu, Moon, Settings, Sun, Trophy, WifiOff } from 'lucide-react';
import { useIsLight } from '../utils/theme';
import { APP_CONFIG, SUBJECT_LABELS } from '../config/appConfig';
import { useLabStore } from '../store/useLabStore';
import { SUBJECT_ICONS } from './LessonPicker';
import type { SubjectId } from '../types/lab';

const QUALITY_LABEL = ['Máy yếu', 'Trung bình', 'Cao'];

export function Navbar() {
  const subject = useLabStore((s) => s.subject);
  const online = useLabStore((s) => s.online);
  const server = useLabStore((s) => s.serverOnline);
  const quality = useLabStore((s) => s.qualityLevel);
  const split = useLabStore((s) => s.splitScreen);
  const khkt = useLabStore((s) => s.khktMode);
  const [open, setOpen] = useState(false);
  const light = useIsLight();
  const menuRef = useRef<HTMLDivElement>(null);
  const st = useLabStore.getState;

  // Bấm ra ngoài hoặc Esc → đóng menu
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: Array<{ label: string; Icon: typeof Settings; on?: boolean; run: () => void }> = [
    { label: 'Cổng giáo viên', Icon: BookOpen, run: () => st().requestPin('teacher') },
    { label: split ? 'Tắt xem song song 2 bài' : 'Xem song song 2 bài (chỉ quan sát)', Icon: Columns2, on: split, run: () => st().setSplitScreen(!split) },
    { label: khkt ? 'Tắt chế độ KHKT' : 'Chế độ KHKT', Icon: Trophy, on: khkt, run: () => (khkt ? st().setKhktMode(false) : st().requestPin('khkt')) },
    { label: 'Cài đặt', Icon: Settings, run: () => st().openModal('settings') }
  ];

  return (
    <header className="no-print flex items-center gap-1.5 border-b border-slate-800 bg-slate-950 px-2 py-1.5 sm:gap-2 sm:px-3" data-tour="navbar">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lab-700 text-lg" aria-hidden="true">🧪</span>
      <span className="hidden text-sm font-bold md:block">{APP_CONFIG.appName}</span>
      <nav className="flex min-w-0 flex-1 justify-center gap-1" aria-label="Chọn môn học" data-tour="subjects">
        {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((s) => {
          const Icon = SUBJECT_ICONS[s];
          return (
            <button key={s} className={`btn min-h-[44px] flex-col gap-0 px-2 py-0.5 text-[11px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${subject === s ? 'border-lab-400 bg-lab-700 text-white' : ''}`} onClick={() => st().openLessons(s)} aria-current={subject === s} title={`Danh sách bài ${SUBJECT_LABELS[s]}`}>
              <Icon size={17} /> {SUBJECT_LABELS[s]}
            </button>
          );
        })}
      </nav>
      {!online && (
        <span className="chip bg-amber-900/60 text-warn" title="Không có mạng — vẫn làm thí nghiệm bình thường">
          <WifiOff size={13} /> <span className="hidden sm:inline">Không có mạng</span>
        </span>
      )}
      <button className="btn min-h-[44px] px-2.5" onClick={() => st().updateSettings({ theme: light ? 'dark' : 'light' })} aria-label={light ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng'} title={light ? 'Giao diện tối' : 'Giao diện sáng'}>
        {light ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <button className="btn min-h-[44px] px-2.5" onClick={() => st().openModal('guide')} aria-label="Trợ giúp" title="Trợ giúp và hướng dẫn">
        <HelpCircle size={18} /> <span className="hidden sm:inline">Trợ giúp</span>
      </button>
      <div className="relative" ref={menuRef}>
        <button className="btn min-h-[44px] px-2.5" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Menu" title="Menu: Cổng giáo viên, Cài đặt…" data-tour="teacher">
          <Menu size={18} /> <span className="hidden sm:inline">Menu</span>
        </button>
        {open && (
          <div className="card absolute right-0 top-full z-40 mt-1 w-60 p-1.5" role="menu">
            {items.map(({ label, Icon, on, run }) => (
              <button
                key={label}
                role="menuitem"
                className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-800 ${on ? 'text-lab-400' : ''}`}
                onClick={() => {
                  setOpen(false);
                  run();
                }}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
            <p className="mt-1 border-t border-slate-700 px-3 py-2 text-xs text-slate-400">
              Mạng: {online ? 'có' : 'không có'} · Máy chủ lớp: {server ? 'đã kết nối' : 'chưa kết nối'} · Đồ họa: {QUALITY_LABEL[quality]}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
