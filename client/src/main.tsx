/**
 * main.tsx — Điểm vào ứng dụng: đăng ký Service Worker (PWA offline), bắt lỗi toàn cục, gắn React.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { installGlobalErrorCapture } from './utils/bugSnapshot';
import { useLabStore } from './store/useLabStore';

installGlobalErrorCapture();

// Service Worker: tự cập nhật khi có bản mới, báo khi đã sẵn sàng chạy offline
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      useLabStore.getState().askConfirm({
        title: 'Có phiên bản mới',
        message: 'KHTN-Lab 3D vừa có bản cập nhật. Tải lại để dùng bản mới? (Bài làm đã được tự lưu nháp.)',
        confirmLabel: 'Cập nhật ngay',
        onConfirm: () => void updateSW(true)
      });
    },
    onOfflineReady() {
      useLabStore.getState().toast('success', 'Ứng dụng đã sẵn sàng chạy hoàn toàn offline.');
    }
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
