/**
 * offline/RemoteSyncManager.ts — Tự kiểm tra & tải gói cập nhật bài học JSON khi có mạng.
 *
 * Gói cập nhật đặt trên GitHub (raw) hoặc Google Drive (link tải trực tiếp), định dạng:
 *   { "format": "khtn-lab-bundle", "version": 3, "exportedAt": "...", "plugins": [ ...LabPluginDef ] }
 * Quy trình: tải (timeout 8s) → so sánh version với bản đã cài → kiểm tra từng plugin → lưu IndexedDB.
 * Mất mạng / lỗi → bỏ qua, ứng dụng vẫn chạy bằng bài học có sẵn.
 */
import type { LabPluginDef, LessonBundle } from '../types/lab';
import { validatePluginDef } from '../plugins/pluginValidator';
import { audit, kvGet, kvSet, saveCustomPlugin } from './db';

export interface RemoteSyncResult {
  status: 'updated' | 'up-to-date' | 'offline' | 'disabled' | 'error';
  message: string;
  installed: number;
  version?: number;
}

/** Chuyển link chia sẻ Google Drive sang link tải trực tiếp */
export function normalizeRemoteUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  const gh = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
  return url;
}

/** Kiểm tra cấu trúc gói; trả về danh sách plugin hợp lệ và lỗi */
export function parseBundle(
  raw: unknown,
  knownSolvers: string[]
): { bundle: LessonBundle | null; valid: LabPluginDef[]; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) return { bundle: null, valid: [], errors: ['Gói không phải JSON hợp lệ.'] };
  const b = raw as Partial<LessonBundle>;
  if (b.format !== 'khtn-lab-bundle' || !Array.isArray(b.plugins) || typeof b.version !== 'number') {
    return { bundle: null, valid: [], errors: ['Sai định dạng gói (cần format "khtn-lab-bundle", version, plugins).'] };
  }
  const valid: LabPluginDef[] = [];
  b.plugins.forEach((p, i) => {
    const v = validatePluginDef(p, knownSolvers);
    if (v.ok) valid.push(v.plugin);
    else errors.push(`Bài #${i + 1}: ${v.errors.join(' ')}`);
  });
  return { bundle: b as LessonBundle, valid, errors };
}

export class RemoteSyncManager {
  constructor(
    private readonly knownSolvers: string[],
    private readonly fetcher: typeof fetch = (...args) => fetch(...args)
  ) {}

  async checkForUpdates(url: string, force = false): Promise<RemoteSyncResult> {
    if (!url) return { status: 'disabled', message: 'Chưa cấu hình link cập nhật bài học.', installed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'offline', message: 'Đang offline — dùng bài học đã có.', installed: 0 };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await this.fetcher(normalizeRemoteUrl(url), { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Máy chủ trả về mã ${res.status}`);
      const json: unknown = await res.json();
      const { bundle, valid, errors } = parseBundle(json, this.knownSolvers);
      if (!bundle) return { status: 'error', message: errors.join(' '), installed: 0 };
      const current = Number((await kvGet('remoteBundleVersion')) ?? '0');
      if (!force && bundle.version <= current) {
        return { status: 'up-to-date', message: `Bài học đã mới nhất (phiên bản ${current}).`, installed: 0, version: current };
      }
      for (const p of valid) await saveCustomPlugin({ ...p, source: 'remote' });
      await kvSet('remoteBundleVersion', String(bundle.version));
      await audit('remote-update', `Cài ${valid.length} bài từ gói phiên bản ${bundle.version}`);
      const warn = errors.length ? ` (${errors.length} bài lỗi bị bỏ qua)` : '';
      return {
        status: 'updated',
        message: `Đã cập nhật ${valid.length} bài học từ gói phiên bản ${bundle.version}${warn}.`,
        installed: valid.length,
        version: bundle.version
      };
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError' ? 'Hết thời gian chờ 8 giây.' : String(e);
      return { status: 'error', message: `Không tải được gói cập nhật: ${msg}`, installed: 0 };
    } finally {
      clearTimeout(timer);
    }
  }
}
