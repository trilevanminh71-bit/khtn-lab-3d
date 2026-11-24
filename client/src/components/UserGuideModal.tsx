/**
 * components/UserGuideModal.tsx — Trung tâm Hướng dẫn trên web: tìm kiếm không dấu, lọc theo đối tượng, mở lại tour.
 */
import { useMemo, useState } from 'react';
import { BookOpenCheck, Search } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { USER_GUIDES, type GuideSection } from '../data/userGuidesData';
import { normalizeVi } from '../engines/gradingEngine';
import { APP_CONFIG } from '../config/appConfig';
import { ModalShell } from './ModalShell';

const AUDIENCES: Array<GuideSection['audience'] | 'Tất cả mục'> = ['Tất cả mục', 'Học sinh', 'Giáo viên', 'Quản trị'];

export default function UserGuideModal() {
  const [q, setQ] = useState('');
  const [aud, setAud] = useState<(typeof AUDIENCES)[number]>('Tất cả mục');
  const list = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return USER_GUIDES.filter((g) => (aud === 'Tất cả mục' || g.audience === aud || g.audience === 'Tất cả') && (!nq || normalizeVi(`${g.title} ${g.body.join(' ')}`).includes(nq)));
  }, [q, aud]);
  return (
    <ModalShell
      title="Trung tâm hướng dẫn"
      onClose={() => useLabStore.getState().closeModal()}
      icon={<BookOpenCheck size={18} />}
      wide
      footer={
        <button
          className="btn"
          onClick={() => {
            useLabStore.getState().closeModal();
            useLabStore.getState().updateSettings({ showOnboarding: true });
          }}
        >
          Xem lại tour hướng dẫn
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-2 top-2.5 text-slate-500" />
          <input className="input pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm: mặt khum, QR, offline, PIN…" aria-label="Tìm trong hướng dẫn" autoFocus />
        </div>
        {AUDIENCES.map((a) => (
          <button key={a} className={`btn text-xs ${aud === a ? 'border-lab-400 bg-lab-700' : ''}`} onClick={() => setAud(a)}>
            {a}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {list.map((g) => (
          <article key={g.id} className="rounded-lg border border-slate-700 p-3">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="flex-1 font-bold">{g.title}</h3>
              <span className="chip bg-slate-800 text-slate-300">{g.audience}</span>
            </div>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-300">
              {g.body.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-400">Không tìm thấy mục phù hợp.</p>}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {APP_CONFIG.appName} v{APP_CONFIG.version} · {APP_CONFIG.teamName} · {APP_CONFIG.schoolName}
      </p>
    </ModalShell>
  );
}
