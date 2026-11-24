/**
 * components/AssetOverrideModal.tsx — Giáo viên tải lên NGAY TRÊN WEB:
 *  - Ảnh tiêu bản kính hiển vi thật (JPG/PNG/WebP ≤ 3 MB) → thay hình procedural trong thị trường.
 *  - Mô hình .glb (≤ 8 MB, khuyến nghị nén Draco) → đặt lên bàn thí nghiệm của bài.
 * Lưu dạng Blob trong IndexedDB (customAssets), dùng được offline; xóa bất cứ lúc nào.
 */
import { useEffect, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { audit, db, deleteAsset, saveAsset } from '../offline/db';
import { assetKey } from '../engines/sceneFactory';
import { ModalShell } from './ModalShell';
import type { CustomAssetRecord } from '../types/lab';

const LIMIT = { image: 3 * 1024 * 1024, glb: 8 * 1024 * 1024 };

export default function AssetOverrideModal() {
  const plugins = useLabStore((s) => s.plugins);
  const current = useLabStore((s) => s.plugin);
  const [pluginId, setPluginId] = useState(current.id);
  const [assets, setAssets] = useState<CustomAssetRecord[]>([]);
  const [msg, setMsg] = useState('');

  const refresh = async (): Promise<void> => setAssets(await db.customAssets.toArray());
  useEffect(() => {
    void refresh();
  }, []);

  const upload = async (file: File, kind: 'image' | 'glb'): Promise<void> => {
    setMsg('');
    if (kind === 'image' && !/^image\/(png|jpeg|webp)$/.test(file.type)) return setMsg('Chỉ nhận ảnh PNG, JPG hoặc WebP.');
    if (kind === 'glb' && !file.name.toLowerCase().endsWith('.glb')) return setMsg('Chỉ nhận file mô hình .glb.');
    if (file.size > LIMIT[kind]) return setMsg(`File quá lớn (${(file.size / 1048576).toFixed(1)} MB). Giới hạn ${LIMIT[kind] / 1048576} MB.`);
    if (kind === 'glb') {
      const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (String.fromCharCode(...head) !== 'glTF') return setMsg('File không phải định dạng glTF nhị phân hợp lệ.');
    }
    try {
      await saveAsset({ key: assetKey(pluginId, kind), pluginId, kind, name: file.name, mime: file.type || 'model/gltf-binary', blob: file, createdAt: Date.now() });
      await audit('asset-upload', `${pluginId}:${kind}:${file.name}`);
      await refresh();
      useLabStore.getState().toast('success', 'Đã lưu tài nguyên. Mở lại bài để thấy thay đổi.');
      if (pluginId === current.id) useLabStore.getState().resetLab();
    } catch (e) {
      setMsg(`Không lưu được (bộ nhớ trình duyệt đầy?): ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const remove = async (key: string): Promise<void> => {
    await deleteAsset(key);
    await audit('asset-delete', key);
    await refresh();
    if (key.startsWith(`${current.id}:`)) useLabStore.getState().resetLab();
  };

  const selected = plugins.find((p) => p.id === pluginId);
  return (
    <ModalShell title="Tài nguyên 3D tùy biến" onClose={() => useLabStore.getState().closeModal()} icon={<ImagePlus size={18} />}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="label">Áp dụng cho bài</label>
          <select className="input" value={pluginId} onChange={(e) => setPluginId(e.target.value)}>
            {plugins.map((p) => (
              <option key={p.id} value={p.id}>{p.shortTitle}</option>
            ))}
          </select>
        </div>
        {selected?.sceneTemplate === 'microscope' && (
          <label className="btn w-full cursor-pointer">
            <Upload size={16} /> Tải ảnh tiêu bản kính hiển vi (≤ 3 MB)
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0], 'image')} />
          </label>
        )}
        <label className="btn w-full cursor-pointer">
          <Upload size={16} /> Tải mô hình .glb (≤ 8 MB)
          <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0], 'glb')} />
        </label>
        {msg && <p className="text-warn">{msg}</p>}
        <h3 className="font-bold">Tài nguyên đã lưu ({assets.length})</h3>
        <ul className="space-y-1">
          {assets.length === 0 && <li className="text-slate-400">Chưa có. Mặc định mọi mô hình được dựng bằng code (0 KB).</li>}
          {assets.map((a) => (
            <li key={a.key} className="flex items-center gap-2 rounded bg-slate-800 p-2">
              <span className="chip bg-slate-700">{a.kind === 'image' ? 'Ảnh' : 'GLB'}</span>
              <span className="flex-1 truncate">
                {plugins.find((p) => p.id === a.pluginId)?.shortTitle ?? a.pluginId} — {a.name} ({(a.blob.size / 1024).toFixed(0)} KB)
              </span>
              <button className="btn-danger min-h-0 px-2 py-1" onClick={() => void remove(a.key)} aria-label={`Xóa ${a.name}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  );
}
