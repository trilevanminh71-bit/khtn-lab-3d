/// <reference types="vitest" />
/**
 * Cấu hình Vite + PWA cho KHTN-Lab 3D.
 * - mode "usb": dùng base "./" để chạy từ USB qua server cục bộ (thư mục con bất kỳ).
 * - Workbox precache toàn bộ JS/CSS/HTML/ảnh → mở offline hoàn toàn sau lần tải đầu.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Cặp cổng cố định của dự án (5173/8000 dành cho dự án khác) */
const FRONTEND_PORT = 5175;
const BACKEND_URL = 'http://localhost:8001';

export default defineConfig(({ mode }) => ({
  base: mode === 'usb' ? './' : '/',
  // Dev server: cố định 5175, báo lỗi thay vì tự nhảy cổng; proxy /api → backend 8001
  server: {
    host: true,
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: { '/api': { target: BACKEND_URL, changeOrigin: true } }
  },
  preview: {
    host: true,
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: { '/api': { target: BACKEND_URL, changeOrigin: true } }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png', 'models/README.md'],
      manifest: {
        name: 'KHTN-Lab 3D — Phòng thí nghiệm ảo Lớp 10',
        short_name: 'KHTN-Lab 3D',
        description: 'Phòng thí nghiệm 3D ảo siêu nhẹ Vật lí – Hóa học – Sinh học Lớp 10, chạy offline.',
        lang: 'vi',
        theme_color: '#0f766e',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
          data: ['dexie', 'zustand']
        }
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts']
  }
}));
