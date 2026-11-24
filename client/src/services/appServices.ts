/**
 * services/appServices.ts — Dịch vụ dùng chung giữa các component (tránh import vòng với App.tsx).
 *  - reloadPlugins: nạp lại danh mục bài sau khi CMS / Wizard / Remote lưu bài.
 *  - currentApiUrl: URL backend hiện hành (Cài đặt hoặc tự dò máy chủ LAN).
 *  - apiFetch: fetch có thời gian chờ, trả JSON.
 */
import { useLabStore } from '../store/useLabStore';
import { listCustomPlugins } from '../offline/db';
import { mergePlugins } from '../plugins/pluginRegistry';
import { resolveDefaultApiUrl } from '../config/appConfig';

export async function reloadPlugins(): Promise<void> {
  try {
    const custom = await listCustomPlugins();
    useLabStore.getState().setPlugins(mergePlugins(custom));
  } catch {
    /* IndexedDB không khả dụng → giữ bài mặc định */
  }
}

export function currentApiUrl(): string {
  return (useLabStore.getState().settings.apiUrl || resolveDefaultApiUrl()).replace(/\/$/, '');
}

/** Gọi API với thời gian chờ (mặc định 8 giây). Ném lỗi tiếng Việt khi thất bại. */
export async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${currentApiUrl()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`Máy chủ trả lỗi ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Hết thời gian chờ máy chủ.');
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    clearTimeout(timer);
  }
}

/** Định dạng số kiểu Việt Nam (dấu phẩy thập phân) */
export function fmtVi(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

/** Đọc số người dùng nhập (chấp nhận dấu phẩy hoặc chấm) */
export function parseViNumber(s: string): number {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return Number.NaN;
  return Number(t);
}
