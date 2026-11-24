/**
 * utils/debounceGuard.ts — Khóa chống bấm đúp cho thao tác đo số liệu, nộp bài, gọi AI.
 * createGuard(ms): trả về đối tượng có run(fn) — chỉ thực thi fn nếu đã qua ít nhất `ms`
 * kể từ lần chạy trước VÀ không có lời gọi async nào đang chạy dở. Bị chặn → trả về undefined.
 */
export interface Guard {
  run<T>(fn: () => T | Promise<T>): Promise<T | undefined>;
  isLocked(): boolean;
}

export function createGuard(ms: number, now: () => number = () => Date.now()): Guard {
  let last = -Infinity;
  let busy = false;
  return {
    isLocked: () => busy || now() - last < ms,
    async run<T>(fn: () => T | Promise<T>): Promise<T | undefined> {
      if (busy || now() - last < ms) return undefined;
      busy = true;
      last = now();
      try {
        return await fn();
      } finally {
        busy = false;
      }
    }
  };
}
