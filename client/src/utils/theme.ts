/**
 * utils/theme.ts — Giao diện Sáng / Tối / Theo hệ thống.
 * useIsLight(): true khi đang dùng giao diện sáng (theo Cài đặt, hoặc theo hệ điều hành nếu chọn "Theo hệ thống").
 */
import { useEffect, useState } from 'react';
import { useLabStore } from '../store/useLabStore';

const query = (): MediaQueryList | null => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null);

export function useIsLight(): boolean {
  const theme = useLabStore((s) => s.settings.theme);
  const [systemLight, setSystemLight] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const mq = query();
    if (!mq) return;
    const on = (e: MediaQueryListEvent): void => setSystemLight(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return theme === 'light' || (theme === 'system' && systemLight);
}
