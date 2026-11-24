/**
 * utils/bugSnapshot.ts — Xuất "Bug Snapshot" JSON để nhóm tái hiện lỗi nhanh.
 * Ghi kèm: phiên bản app, trình duyệt, kích thước màn hình, thông tin WebGL, FPS/draw calls,
 * trạng thái bài đang làm và 200 thao tác gần nhất (nhật ký vòng).
 */
import { APP_CONFIG } from '../config/appConfig';
import type { PerfStats } from '../types/lab';

export interface ActionLogItem {
  at: number;
  type: string;
  detail: string;
}

const MAX_LOG = 200;
const actionLog: ActionLogItem[] = [];

/** Ghi một thao tác vào nhật ký vòng (bộ nhớ RAM, tối đa 200 mục) */
export function logAction(type: string, detail = ''): void {
  actionLog.push({ at: Date.now(), type, detail: detail.slice(0, 300) });
  if (actionLog.length > MAX_LOG) actionLog.splice(0, actionLog.length - MAX_LOG);
}

export function getActionLog(): ActionLogItem[] {
  return actionLog.slice();
}

export interface BugSnapshot {
  format: 'khtn-lab-bug-snapshot';
  appVersion: string;
  createdAt: string;
  userAgent: string;
  screen: { width: number; height: number; dpr: number; orientation: string };
  online: boolean;
  webgl: { renderer: string; vendor: string; version: string } | null;
  perf: PerfStats | null;
  state: Record<string, unknown>;
  actions: ActionLogItem[];
  errors: string[];
}

const capturedErrors: string[] = [];

/** Gắn bộ bắt lỗi toàn cục (gọi 1 lần trong main.tsx) */
export function installGlobalErrorCapture(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    capturedErrors.push(`${e.message} @ ${e.filename}:${e.lineno}`);
    if (capturedErrors.length > 50) capturedErrors.shift();
  });
  window.addEventListener('unhandledrejection', (e) => {
    capturedErrors.push(`Promise: ${String(e.reason)}`);
    if (capturedErrors.length > 50) capturedErrors.shift();
  });
}

/** Đọc thông tin card đồ họa (nếu trình duyệt cho phép) */
function readWebglInfo(): BugSnapshot['webgl'] {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
      vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      version: String(gl.getParameter(gl.VERSION))
    };
  } catch {
    return null;
  }
}

export function buildBugSnapshot(state: Record<string, unknown>, perf: PerfStats | null): BugSnapshot {
  return {
    format: 'khtn-lab-bug-snapshot',
    appVersion: APP_CONFIG.version,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
      orientation: window.innerWidth > window.innerHeight ? 'ngang' : 'dọc'
    },
    online: navigator.onLine,
    webgl: readWebglInfo(),
    perf,
    state,
    actions: getActionLog(),
    errors: capturedErrors.slice()
  };
}

/** Tải file JSON xuống máy (dùng chung cho bug snapshot, gói bài học, sao lưu) */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadBugSnapshot(state: Record<string, unknown>, perf: PerfStats | null): void {
  const snap = buildBugSnapshot(state, perf);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadText(`bao-cao-loi-khtn-lab-${stamp}.json`, JSON.stringify(snap, null, 2));
}
