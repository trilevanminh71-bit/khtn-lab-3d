/**
 * components/Navbar.tsx — Thanh điều hướng: chọn môn, trạng thái (chất lượng render / máy chủ LAN / offline),
 * Hướng dẫn (?), So sánh 3D (split-screen), KHKT Mode (PIN), Cổng giáo viên (PIN), Cài đặt.
 */
import { Atom, BookOpen, Columns2, FlaskConical, GraduationCap, HelpCircle, Microscope, MonitorCog, Settings, Trophy, Wifi, WifiOff } from 'lucide-react';
import { APP_CONFIG, SUBJECT_LABELS } from '../config/appConfig';
import { hasUnsavedWork, useLabStore } from '../store/useLabStore';
import type { SubjectId } from '../types/lab';

const SUBJECT_ICONS = { physics: Atom, chemistry: FlaskConical, biology: Microscope } as const;
const QUALITY_LABEL = ['Máy yếu', 'Trung bình', 'Cao'];

export function Navbar() {
  const subject = useLabStore((s) => s.subject);
  const online = useLabStore((s) => s.online);
  const server = useLabStore((s) => s.serverOnline);
  const quality = useLabStore((s) => s.qualityLevel);
  const split = useLabStore((s) => s.splitScreen);
  const khkt = useLabStore((s) => s.khktMode);
  const st = useLabStore.getState;

  const chooseSubject = (s: SubjectId): void => {
    if (s === subject) return;
    if (hasUnsavedWork()) {
      st().askConfirm({
        title: 'Chuyển môn học?',
        message: 'Em đang làm dở bài thí nghiệm. Bản nháp đã tự lưu, có thể mở lại bài để làm tiếp. Vẫn chuyển?',
        confirmLabel: 'Chuyển môn',
        onConfirm: () => st().setSubject(s)
      });
    } else st().setSubject(s);
  };

  return (
    <header className="no-print flex flex-wrap items-center gap-1.5 border-b border-slate-800 bg-slate-950 px-2 py-1.5 sm:gap-2 sm:px-3" data-tour="navbar">
      <div className="flex items-center gap-2 pr-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lab-700 text-lg" aria-hidden="true">🧪</span>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-bold">{APP_CONFIG.appName}</div>
          <div className="text-[11px] text-slate-400">{APP_CONFIG.appTagline}</div>
        </div>
      </div>
      <nav className="flex gap-1" aria-label="Chọn môn học" data-tour="subjects">
        {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((s) => {
          const Icon = SUBJECT_ICONS[s];
          return (
            <button key={s} className={`btn px-2 sm:px-3 ${subject === s ? 'border-lab-400 bg-lab-700 text-white' : ''}`} onClick={() => chooseSubject(s)} aria-pressed={subject === s}>
              <Icon size={16} />
              <span className="hidden sm:inline">{SUBJECT_LABELS[s]}</span>
            </button>
          );
        })}
      </nav>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <span className="chip hidden bg-slate-800 text-slate-300 md:inline-flex" title="Chất lượng hiển thị 3D (tự thích ứng)">
          <MonitorCog size={13} /> {QUALITY_LABEL[quality]}
        </span>
        <span className={`chip ${server ? 'bg-emerald-900/60 text-ok' : 'bg-slate-800 text-slate-400'}`} title={server ? 'Đã kết nối máy chủ lớp (LAN)' : 'Chưa kết nối máy chủ — bài nộp lưu trên máy & mã QR'}>
          <GraduationCap size={13} /> <span className="hidden sm:inline">{server ? 'LAN' : 'Không LAN'}</span>
        </span>
        <span className={`chip ${online ? 'bg-sky-900/50 text-sky-300' : 'bg-amber-900/60 text-warn'}`} title={online ? 'Đang có Internet' : 'Đang offline — mọi chức năng chính vẫn hoạt động'}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />} <span className="hidden sm:inline">{online ? 'Trực tuyến' : 'Offline'}</span>
        </span>
        <button className="btn-ghost px-2" onClick={() => st().openModal('guide')} title="Trung tâm hướng dẫn" aria-label="Hướng dẫn">
          <HelpCircle size={18} />
        </button>
        <button className={`btn-ghost px-2 ${split ? 'text-lab-400' : ''}`} onClick={() => st().setSplitScreen(!split)} title="So sánh 2 thí nghiệm 3D cạnh nhau" aria-label="So sánh 3D" aria-pressed={split}>
          <Columns2 size={18} />
        </button>
        <button className={`btn-ghost px-2 ${khkt ? 'text-amber-300' : ''}`} onClick={() => (khkt ? st().setKhktMode(false) : st().requestPin('khkt'))} title="Chế độ trình diễn KHKT" aria-label="Chế độ KHKT" aria-pressed={khkt}>
          <Trophy size={18} />
        </button>
        <button className="btn px-2" onClick={() => st().requestPin('teacher')} title="Cổng giáo viên" data-tour="teacher">
          <BookOpen size={16} /> <span className="hidden sm:inline">Cổng GV</span>
        </button>
        <button className="btn-ghost px-2" onClick={() => st().openModal('settings')} title="Cài đặt" aria-label="Cài đặt">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
