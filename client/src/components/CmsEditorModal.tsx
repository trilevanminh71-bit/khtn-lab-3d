/**
 * components/CmsEditorModal.tsx — CMS không cần code cho giáo viên:
 *  - Sửa tên bài, mục tiêu, lí thuyết, số lần đo tối thiểu, sai số cho phép, khoảng thông số, câu hỏi Pre/Post.
 *  - Lưu → ghi đè bài trên máy này (IndexedDB); "Khôi phục gốc" xóa bản sửa.
 *  - Xuất / Nhập gói .json (chia sẻ đồng nghiệp, đưa lên GitHub/Drive làm gói cập nhật từ xa).
 *  - Kiểm tra gói cập nhật từ xa ngay.
 */
import { useMemo, useState } from 'react';
import { Download, FilePlus2, RefreshCcw, Save, Upload, Undo2 } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { BUILTIN_PLUGINS } from '../plugins/pluginRegistry';
import { validatePluginDef } from '../plugins/pluginValidator';
import { SOLVER_IDS } from '../engines/solverRegistry';
import { audit, deleteCustomPlugin, listCustomPlugins, saveCustomPlugin } from '../offline/db';
import { parseBundle, RemoteSyncManager } from '../offline/RemoteSyncManager';
import { reloadPlugins } from '../services/appServices';
import { downloadText } from '../utils/bugSnapshot';
import { ModalShell } from './ModalShell';
import type { LabPluginDef, LessonBundle, QuizQuestion } from '../types/lab';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function QuizEditor({ title, list, onChange }: { title: string; list: QuizQuestion[]; onChange: (l: QuizQuestion[]) => void }) {
  const update = (i: number, patch: Partial<QuizQuestion>): void => onChange(list.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">{title}</h4>
        <button className="btn text-xs" onClick={() => onChange([...list, { id: `q${Date.now()}`, prompt: 'Câu hỏi mới?', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctIndex: 0, explanation: '' }])}>
          + Thêm câu
        </button>
      </div>
      {list.map((q, i) => (
        <div key={q.id} className="space-y-1 rounded-lg border border-slate-700 p-2">
          <div className="flex gap-1">
            <input className="input" value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} aria-label={`Nội dung câu ${i + 1}`} />
            <button className="btn-danger px-2 text-xs" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label={`Xóa câu ${i + 1}`}>
              Xóa
            </button>
          </div>
          {q.options.map((o, oi) => (
            <label key={oi} className="flex items-center gap-1 text-xs">
              <input type="radio" checked={q.correctIndex === oi} onChange={() => update(i, { correctIndex: oi })} aria-label={`Đáp án đúng là phương án ${oi + 1}`} />
              <input className="input py-1 text-xs" value={o} onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
            </label>
          ))}
          <input className="input py-1 text-xs" value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Giải thích đáp án" />
        </div>
      ))}
    </div>
  );
}

export default function CmsEditorModal() {
  const plugins = useLabStore((s) => s.plugins);
  const remoteUrl = useLabStore((s) => s.settings.remoteUpdateUrl);
  const [selId, setSelId] = useState(plugins[0].id);
  const original = useMemo(() => plugins.find((p) => p.id === selId) ?? plugins[0], [plugins, selId]);
  const [draft, setDraft] = useState<LabPluginDef>(() => clone(original));
  const [msg, setMsg] = useState('');
  const toast = useLabStore.getState().toast;
  const isBuiltin = BUILTIN_PLUGINS.some((p) => p.id === draft.id);

  const select = (id: string): void => {
    setSelId(id);
    const p = plugins.find((x) => x.id === id);
    if (p) setDraft(clone(p));
    setMsg('');
  };

  const save = async (): Promise<void> => {
    const v = validatePluginDef({ ...draft, source: draft.source === 'builtin' ? 'cms' : draft.source, version: draft.version + 1 }, SOLVER_IDS);
    if (!v.ok) {
      setMsg(v.errors.join(' '));
      return;
    }
    await saveCustomPlugin(v.plugin);
    await audit('cms-save', v.plugin.id);
    await reloadPlugins();
    setDraft(clone(v.plugin));
    toast('success', `Đã lưu bài "${v.plugin.shortTitle}".`);
    setMsg('');
  };

  const restore = async (): Promise<void> => {
    await deleteCustomPlugin(draft.id);
    await audit('cms-restore', draft.id);
    await reloadPlugins();
    const base = BUILTIN_PLUGINS.find((p) => p.id === draft.id);
    if (base) setDraft(clone(base));
    toast('info', isBuiltin ? 'Đã khôi phục bài gốc.' : 'Đã xóa bài tự tạo.');
    if (!isBuiltin) select(BUILTIN_PLUGINS[0].id);
  };

  const exportBundle = async (all: boolean): Promise<void> => {
    const list = all ? plugins : await listCustomPlugins();
    const bundle: LessonBundle = { format: 'khtn-lab-bundle', version: Math.floor(Date.now() / 1000), exportedAt: new Date().toISOString(), plugins: list };
    downloadText(`goi-bai-hoc-khtn-lab-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
  };

  const importBundle = async (file: File): Promise<void> => {
    try {
      const json: unknown = JSON.parse(await file.text());
      const { bundle, valid, errors } = parseBundle(json, SOLVER_IDS);
      if (!bundle) throw new Error(errors.join(' '));
      for (const p of valid) await saveCustomPlugin({ ...p, source: p.source === 'builtin' ? 'cms' : p.source });
      await audit('cms-import', `${valid.length} bài`);
      await reloadPlugins();
      toast('success', `Đã nhập ${valid.length} bài${errors.length ? `, ${errors.length} bài lỗi bị bỏ qua` : ''}.`);
      setMsg(errors.join(' '));
    } catch (e) {
      setMsg(`Không đọc được file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const checkRemote = async (): Promise<void> => {
    const r = await new RemoteSyncManager(SOLVER_IDS).checkForUpdates(remoteUrl, true);
    if (r.status === 'updated') await reloadPlugins();
    setMsg(r.message);
  };

  const setField = <K extends keyof LabPluginDef>(k: K, v: LabPluginDef[K]): void => setDraft({ ...draft, [k]: v });

  return (
    <ModalShell
      title="Chỉnh sửa nội dung bài học (CMS)"
      onClose={() => useLabStore.getState().closeModal()}
      wide
      footer={
        <>
          <label className="btn cursor-pointer">
            <Upload size={16} /> Nhập gói .json
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && void importBundle(e.target.files[0])} />
          </label>
          <button className="btn" onClick={() => void exportBundle(false)}>
            <Download size={16} /> Xuất bài đã sửa
          </button>
          <button className="btn" onClick={() => void exportBundle(true)}>
            <Download size={16} /> Xuất toàn bộ
          </button>
          <button className="btn" onClick={() => void checkRemote()} disabled={!remoteUrl} title={remoteUrl ? remoteUrl : 'Chưa đặt link gói cập nhật trong Cài đặt'}>
            <RefreshCcw size={16} /> Cập nhật từ xa
          </button>
          <button className="btn" onClick={() => useLabStore.getState().openModal('wizard')}>
            <FilePlus2 size={16} /> Tạo bài mới
          </button>
          <button className="btn" onClick={() => void restore()} disabled={draft.source === 'builtin'}>
            <Undo2 size={16} /> {isBuiltin ? 'Khôi phục gốc' : 'Xóa bài'}
          </button>
          <button className="btn-primary" onClick={() => void save()}>
            <Save size={16} /> Lưu
          </button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {plugins.map((p) => (
            <li key={p.id}>
              <button className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${p.id === selId ? 'bg-lab-700' : 'hover:bg-slate-800'}`} onClick={() => select(p.id)}>
                {p.shortTitle}
                {p.source !== 'builtin' && <span className="ml-1 text-xs text-amber-300">({p.source === 'remote' ? 'từ xa' : 'đã sửa'})</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          {msg && <p className="rounded bg-amber-900/40 p-2 text-sm text-amber-200">{msg}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label">Tên bài</label>
              <input className="input" value={draft.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Tên ngắn</label>
              <input className="input" value={draft.shortTitle} onChange={(e) => setField('shortTitle', e.target.value)} />
            </div>
            <div>
              <label className="label">Tham chiếu SGK</label>
              <input className="input" value={draft.sgkRef} onChange={(e) => setField('sgkRef', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Số lần đo tối thiểu</label>
                <input className="input" type="number" min={1} max={20} value={draft.minTrials} onChange={(e) => setField('minTrials', Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Sai số cho phép (%)</label>
                <input className="input" type="number" min={0.1} max={50} step={0.1} value={draft.result.tolerancePercent} onChange={(e) => setField('result', { ...draft.result, tolerancePercent: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Mục tiêu (mỗi dòng một mục)</label>
            <textarea className="input" rows={3} value={draft.objectives.join('\n')} onChange={(e) => setField('objectives', e.target.value.split('\n').filter((x) => x.trim()))} />
          </div>
          <div>
            <label className="label">Cơ sở lí thuyết</label>
            <textarea className="input" rows={3} value={draft.theory} onChange={(e) => setField('theory', e.target.value)} />
          </div>
          <div>
            <label className="label">Từ khóa bắt buộc trong kết luận (phân cách bằng dấu phẩy)</label>
            <input className="input" value={draft.conclusionKeywords.join(', ')} onChange={(e) => setField('conclusionKeywords', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-bold">Khoảng thông số học sinh chỉnh</h4>
            <div className="space-y-1">
              {draft.params.map((p, i) => (
                <div key={p.key} className="grid grid-cols-[1fr_repeat(4,70px)] items-center gap-1 text-xs">
                  <span>{p.label} ({p.unit})</span>
                  {(['min', 'max', 'step', 'default'] as const).map((k) => (
                    <input key={k} className="input px-1 py-1 text-xs" type="number" value={p[k]} aria-label={`${p.label} ${k}`} onChange={(e) => setField('params', draft.params.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) } : x)))} />
                  ))}
                </div>
              ))}
              <p className="text-[11px] text-slate-500">Cột: nhỏ nhất · lớn nhất · bước · mặc định</p>
            </div>
          </div>
          <QuizEditor title="Câu hỏi trước thí nghiệm" list={draft.preQuiz} onChange={(l) => setField('preQuiz', l)} />
          <QuizEditor title="Câu hỏi sau thí nghiệm" list={draft.postQuiz} onChange={(l) => setField('postQuiz', l)} />
        </div>
      </div>
    </ModalShell>
  );
}
