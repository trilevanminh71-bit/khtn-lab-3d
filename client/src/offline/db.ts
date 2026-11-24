/**
 * offline/db.ts — Cơ sở dữ liệu IndexedDB (Dexie.js) chạy hoàn toàn offline trên trình duyệt.
 *
 * Bảng:
 *  - drafts        : bản nháp tự lưu mỗi 5 giây (khóa = pluginId)
 *  - submissions   : bài nộp (điểm, pre/post, ngộ nhận, khảo sát) — nguồn dữ liệu cho Cổng GV & KHKT
 *  - auditLog      : nhật ký thao tác quan trọng (nộp bài, đổi PIN, nhập gói...)
 *  - syncQueue     : hàng đợi gửi lên server LAN khi có mạng
 *  - customPlugins : bài học do CMS / No-Code Wizard / Remote JSON tạo (ghi đè bài mặc định cùng id)
 *  - customAssets  : ảnh tiêu bản kính hiển vi / mô hình .glb tải lên
 *  - aiCache       : bộ nhớ đệm câu trả lời AI (tiết kiệm hạn mức)
 *  - surveys       : khảo sát Likert 5 sao
 *  - kv            : cặp khóa–giá trị (phiên bản gói remote, quota AI theo ngày...)
 */
import Dexie, { type Table } from 'dexie';
import type {
  AuditEntry,
  CustomAssetRecord,
  DraftRecord,
  LabPluginDef,
  SubmissionRecord,
  SurveyRecord
} from '../types/lab';

export interface SyncQueueItem {
  id?: number;
  kind: 'submission';
  uid: string;
  payload: SubmissionRecord;
  tries: number;
  createdAt: number;
}

export interface CustomPluginRecord {
  id: string;
  plugin: LabPluginDef;
  source: LabPluginDef['source'];
  updatedAt: number;
}

export interface AiCacheRecord {
  key: string;
  answer: string;
  at: number;
}

export interface KvRecord {
  key: string;
  value: string;
}

class LabDatabase extends Dexie {
  drafts!: Table<DraftRecord, string>;
  submissions!: Table<SubmissionRecord, number>;
  auditLog!: Table<AuditEntry, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  customPlugins!: Table<CustomPluginRecord, string>;
  customAssets!: Table<CustomAssetRecord, number>;
  aiCache!: Table<AiCacheRecord, string>;
  surveys!: Table<SurveyRecord, number>;
  kv!: Table<KvRecord, string>;

  constructor() {
    super('khtn-lab-3d');
    this.version(1).stores({
      drafts: 'pluginId, savedAt',
      submissions: '++id, &uid, pluginId, classCode, studentCode, createdAt, synced, source',
      auditLog: '++id, at, type',
      syncQueue: '++id, uid, createdAt',
      customPlugins: 'id, source, updatedAt',
      customAssets: '++id, &key, pluginId, kind',
      aiCache: 'key, at',
      surveys: '++id, pluginId, createdAt',
      kv: 'key'
    });
  }
}

export const db = new LabDatabase();

/* ------------------------------ Nháp ------------------------------ */
export async function saveDraft(draft: DraftRecord): Promise<void> {
  await db.drafts.put(draft);
}
export async function loadDraft(pluginId: string): Promise<DraftRecord | undefined> {
  return db.drafts.get(pluginId);
}
export async function clearDraft(pluginId: string): Promise<void> {
  await db.drafts.delete(pluginId);
}

/* ---------------------------- Nhật ký ----------------------------- */
export async function audit(type: string, detail: string): Promise<void> {
  try {
    await db.auditLog.add({ at: Date.now(), type, detail });
    const count = await db.auditLog.count();
    if (count > 2000) {
      const old = await db.auditLog.orderBy('at').limit(count - 2000).primaryKeys();
      await db.auditLog.bulkDelete(old);
    }
  } catch {
    /* IndexedDB có thể bị chặn ở chế độ ẩn danh — bỏ qua để không làm hỏng thao tác chính */
  }
}

/* ---------------------------- Bài nộp ----------------------------- */
/** Thêm bài nộp; bỏ qua nếu trùng uid (quét QR 2 lần) — trả về true nếu là bài mới */
export async function addSubmission(rec: SubmissionRecord): Promise<boolean> {
  const exist = await db.submissions.where('uid').equals(rec.uid).first();
  if (exist) return false;
  await db.submissions.add(rec);
  return true;
}

export async function enqueueSync(rec: SubmissionRecord): Promise<void> {
  await db.syncQueue.add({ kind: 'submission', uid: rec.uid, payload: rec, tries: 0, createdAt: Date.now() });
}

/**
 * Gửi toàn bộ hàng đợi lên server LAN/Cloud.
 * Đầu vào: apiUrl. Đầu ra: số bài gửi thành công. Lỗi mạng → giữ lại để thử sau.
 */
export async function flushSyncQueue(apiUrl: string, timeoutMs = 6000): Promise<number> {
  const items = await db.syncQueue.toArray();
  if (items.length === 0) return 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/api/submissions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions: items.map((i) => i.payload) }),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = items.map((i) => i.id).filter((x): x is number => typeof x === 'number');
    await db.syncQueue.bulkDelete(ids);
    for (const it of items) {
      await db.submissions.where('uid').equals(it.uid).modify({ synced: true });
    }
    return items.length;
  } catch {
    await db.syncQueue.toCollection().modify((it) => {
      it.tries += 1;
    });
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------- Bài tùy biến -------------------------- */
export async function listCustomPlugins(): Promise<LabPluginDef[]> {
  const rows = await db.customPlugins.toArray();
  return rows.map((r) => r.plugin);
}
export async function saveCustomPlugin(plugin: LabPluginDef): Promise<void> {
  await db.customPlugins.put({ id: plugin.id, plugin, source: plugin.source, updatedAt: Date.now() });
}
export async function deleteCustomPlugin(id: string): Promise<void> {
  await db.customPlugins.delete(id);
}

/* --------------------------- Tài nguyên --------------------------- */
export async function saveAsset(rec: Omit<CustomAssetRecord, 'id'>): Promise<void> {
  const exist = await db.customAssets.where('key').equals(rec.key).first();
  if (exist?.id !== undefined) await db.customAssets.delete(exist.id);
  await db.customAssets.add(rec);
}
export async function getAsset(key: string): Promise<CustomAssetRecord | undefined> {
  return db.customAssets.where('key').equals(key).first();
}
export async function deleteAsset(key: string): Promise<void> {
  await db.customAssets.where('key').equals(key).delete();
}

/* ---------------------------- Cache AI ---------------------------- */
export async function getAiCache(key: string): Promise<string | undefined> {
  const r = await db.aiCache.get(key);
  if (!r) return undefined;
  // Hết hạn sau 30 ngày
  if (Date.now() - r.at > 30 * 86400000) {
    await db.aiCache.delete(key);
    return undefined;
  }
  return r.answer;
}
export async function setAiCache(key: string, answer: string): Promise<void> {
  await db.aiCache.put({ key, answer, at: Date.now() });
}

/* ------------------------------ KV ------------------------------- */
export async function kvGet(key: string): Promise<string | undefined> {
  return (await db.kv.get(key))?.value;
}
export async function kvSet(key: string, value: string): Promise<void> {
  await db.kv.put({ key, value });
}

/** Đếm & tăng lượt dùng AI trong ngày (quota). Trả về số lượt đã dùng sau khi tăng. */
export async function bumpAiQuota(): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `aiQuota:${day}`;
  const used = Number((await kvGet(key)) ?? '0') + 1;
  await kvSet(key, String(used));
  return used;
}
export async function getAiQuotaUsed(): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  return Number((await kvGet(`aiQuota:${day}`)) ?? '0');
}
