/**
 * components/LessonPicker.tsx — Danh sách bài theo môn: 3 nút môn, mỗi bài một dòng lớn dễ chạm,
 * đánh dấu bài đang mở / đang làm dở; thẻ "Tiếp tục bài đang làm dở" luôn ở trên cùng.
 */
import { useEffect, useState } from 'react';
import { Atom, ChevronRight, FlaskConical, ListChecks, Microscope } from 'lucide-react';
import { hasUnsavedWork, useLabStore } from '../store/useLabStore';
import { SUBJECT_COLORS, SUBJECT_LABELS } from '../config/appConfig';
import { db } from '../offline/db';
import { ModalShell } from './ModalShell';
import { ResumeCard } from './LessonPanels';
import type { LabPluginDef, SubjectId } from '../types/lab';

export const SUBJECT_ICONS = { physics: Atom, chemistry: FlaskConical, biology: Microscope } as const;

/** Số bài trong tên ngắn ("Bài 22 – …") để sắp xếp; bài không đánh số xếp cuối */
const lessonNo = (p: LabPluginDef): number => Number(p.shortTitle.match(/^Bài (\d+)/)?.[1] ?? 999);

export function LessonPicker() {
  const plugins = useLabStore((s) => s.plugins);
  const currentId = useLabStore((s) => s.plugin.id);
  const subject = useLabStore((s) => s.pickerSubject);
  const [drafts, setDrafts] = useState<string[]>([]);
  const st = useLabStore.getState;

  useEffect(() => {
    void db.drafts
      .toArray()
      .then((list) => setDrafts(list.filter((d) => d.trials.length > 0 || d.completedSteps.length > 0).filter((d) => plugins.find((p) => p.id === d.pluginId)?.version === (d.pluginVersion ?? 1)).map((d) => d.pluginId)))
      .catch(() => undefined);
  }, [plugins]);

  const choose = (id: string): void => {
    const go = (): void => {
      if (id !== st().plugin.id) st().loadPlugin(id);
      st().closeModal();
    };
    if (id !== currentId && hasUnsavedWork()) {
      st().askConfirm({ title: 'Chuyển sang bài khác?', message: 'Bài đang làm đã được lưu nháp, em có thể quay lại làm tiếp.', confirmLabel: 'Chuyển bài', onConfirm: go });
    } else go();
  };
  const list = plugins.filter((p) => p.subject === subject).sort((a, b) => lessonNo(a) - lessonNo(b));

  return (
    <ModalShell title="Chọn bài thí nghiệm" onClose={() => st().closeModal()} icon={<ListChecks size={18} />}>
      <div className="space-y-3">
        <ResumeCard onResume={() => st().closeModal()} />
        <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Môn học">
          {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((s) => {
            const Icon = SUBJECT_ICONS[s];
            return (
              <button key={s} role="tab" aria-selected={s === subject} className={`btn min-h-[48px] px-1 ${s === subject ? 'border-lab-400 bg-lab-700 text-white' : ''}`} onClick={() => st().openLessons(s)}>
                <Icon size={18} /> {SUBJECT_LABELS[s]}
              </button>
            );
          })}
        </div>
        <ul className="space-y-1.5">
          {list.map((p) => (
            <li key={p.id}>
              <button
                className={`flex min-h-[56px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-slate-800 ${p.id === currentId ? 'border-lab-400 bg-lab-900/50' : 'border-slate-700'}`}
                style={{ borderLeft: `4px solid ${SUBJECT_COLORS[p.subject]}` }}
                onClick={() => choose(p.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.shortTitle}</span>
                  <span className="block text-xs text-slate-400">
                    Khoảng {p.durationMin} phút{p.source !== 'builtin' ? ' · bài của giáo viên' : ''}
                  </span>
                </span>
                {p.id === currentId ? <span className="chip bg-lab-700 text-white">Đang mở</span> : drafts.includes(p.id) ? <span className="chip bg-amber-500 text-slate-950">Đang làm dở</span> : null}
                <ChevronRight size={18} className="shrink-0 text-slate-500" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  );
}
