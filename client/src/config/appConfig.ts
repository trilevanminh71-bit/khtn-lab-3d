/**
 * config/appConfig.ts — FILE CẤU HÌNH TẬP TRUNG DUY NHẤT.
 * Nhóm chỉ cần sửa file này để đổi tên app, tên trường, thành viên, màu chủ đạo,
 * mã PIN mặc định (SHA-256), hạn mức AI, link cập nhật bài học, địa chỉ API.
 */
import type { AppSettings } from '../types/lab';

/** Cặp cổng cố định của dự án (tránh trùng dự án khác dùng 5173/8000) */
export const FRONTEND_PORT = 5175;
export const BACKEND_PORT = 8001;

export const APP_CONFIG = {
  appName: 'KHTN-Lab 3D',
  appTagline: 'Phòng thí nghiệm 3D ảo siêu nhẹ — Lớp 10',
  schoolName: 'Trường THPT (điền tên trường của nhóm)',
  teamName: 'Nhóm KHKT KHTN-Lab',
  teamMembers: ['Thành viên 1', 'Thành viên 2'],
  advisor: 'Giáo viên hướng dẫn',
  version: '1.0.0',
  /** Màu chủ đạo (đồng bộ với tailwind lab-700) */
  primaryColor: '#0f766e',
  accentColor: '#f59e0b',
  /** SHA-256 của mã PIN mặc định "2026" — đổi PIN trong Cài đặt sẽ lưu băm mới vào IndexedDB/localStorage */
  defaultPinHash: '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab',
  /** Số lượt hỏi AI tối đa mỗi ngày cho mỗi máy (tiết kiệm hạn mức Gemini miễn phí) */
  aiDailyQuota: 30,
  /** Thời gian chờ AI tối đa (ms) trước khi chuyển sang kho gợi mở offline */
  aiTimeoutMs: 8000,
  /** Mô hình Gemini dùng khi học sinh/giáo viên nhập API key riêng */
  geminiModel: 'gemini-2.5-flash',
  /** Chu kỳ tự lưu nháp (ms) */
  autosaveMs: 5000,
  /** Link gói cập nhật bài học JSON (GitHub raw/Drive). Rỗng = tắt */
  remoteUpdateUrl: import.meta.env.VITE_REMOTE_UPDATE_URL ?? '',
  /**
   * URL backend; rỗng = tự dò `<hostname hiện tại>:8001` → mở từ localhost sẽ là http://localhost:8001,
   * học sinh mở qua IP LAN sẽ tự gọi đúng máy giáo viên (không cứng "localhost" để tránh gọi nhầm máy học sinh).
   */
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  /** Ngưỡng FPS: dưới mức này ThreeEngineCore tự hạ chất lượng */
  minFps: 28,
  /** Mã lớp mặc định cho dữ liệu KHKT */
  demoClasses: ['10T1', '10T2'],
  /** Độ dài tối đa chuỗi QR */
  qrMaxLength: 180
} as const;

/** Suy ra URL API mặc định: ưu tiên biến môi trường, sau đó máy chủ hiện tại :8001 (mạng LAN lớp học) */
export function resolveDefaultApiUrl(): string {
  if (APP_CONFIG.apiUrl) return APP_CONFIG.apiUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}

/** Cài đặt mặc định cho lần đầu mở web */
export const DEFAULT_SETTINGS: AppSettings = {
  lowEndGraphics: false,
  autoAdaptiveFps: true,
  fontScale: 1,
  colorBlindMode: 'none',
  highContrast: false,
  reducedMotion: false,
  soundEnabled: true,
  hapticsEnabled: true,
  apiUrl: '',
  geminiApiKey: '',
  pinHash: APP_CONFIG.defaultPinHash,
  remoteUpdateUrl: APP_CONFIG.remoteUpdateUrl,
  showOnboarding: true,
  showTrail: true,
  theme: 'dark'
};

/** Tên môn học hiển thị */
export const SUBJECT_LABELS = {
  physics: 'Vật lí',
  chemistry: 'Hóa học',
  biology: 'Sinh học'
} as const;

/** Màu nhận diện môn học (an toàn cho người mù màu: kèm biểu tượng chữ) */
export const SUBJECT_COLORS = {
  physics: '#3b82f6',
  chemistry: '#f97316',
  biology: '#22c55e'
} as const;
