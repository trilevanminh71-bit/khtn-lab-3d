/**
 * utils/haptics.ts — Rung phản hồi cảm ứng qua Web Vibration API.
 * iOS Safari không hỗ trợ navigator.vibrate → hàm tự bỏ qua, không gây lỗi.
 */
export type HapticPattern = 'tap' | 'snap' | 'success' | 'warning' | 'danger';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  snap: [15, 30, 15],
  success: [20, 40, 20, 40, 60],
  warning: [80, 60, 80],
  danger: [200, 100, 200, 100, 300]
};

let hapticsOn = true;

export function setHapticsEnabled(on: boolean): void {
  hapticsOn = on;
}

/** Rung theo mẫu; trả về true nếu thiết bị thực sự rung */
export function vibrate(pattern: HapticPattern): boolean {
  if (!hapticsOn) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}
