/**
 * App.tsx — Bố cục chính và các dịch vụ nền:
 *  - Nạp bài tùy biến từ IndexedDB, kiểm tra gói cập nhật Remote JSON khi có mạng.
 *  - Theo dõi online/offline, ping máy chủ LAN (/api/health) mỗi 30 giây, đẩy hàng đợi đồng bộ.
 *  - Áp trợ năng: cỡ chữ, mù màu (bảng màu + bộ lọc hiệu chỉnh cho cảnh 3D), tương phản cao, giảm chuyển động.
 *  - Modal lớn nạp lười bằng React.lazy để giảm dung lượng tải lần đầu.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { LessonPicker } from './components/LessonPicker';
import { LabHUD } from './components/LabHUD';
import { TutorErrorBoundary } from './components/TutorErrorBoundary';
import { SafetyPpeBar } from './components/SafetyPpeBar';
import { FloatingLabTools } from './components/FloatingLabTools';
import { SimControls } from './components/SimControls';
import { SceneDock } from './components/SceneDock';
import { ConfirmDialogModal } from './components/ConfirmDialogModal';
import { PinGuardModal } from './components/PinGuardModal';
import { OnboardingTour } from './components/OnboardingTour';
import { KhktDemoOverlay } from './components/KhktDemoOverlay';
import { DevDebugPanel } from './components/DevDebugPanel';
import { LabCanvasHost } from './core/LabCanvasHost';
import { SceneErrorBoundary } from './core/SceneErrorBoundary';
import { WebGLCheckGuard } from './core/WebGLCheckGuard';
import { useLabStore } from './store/useLabStore';
import { flushSyncQueue } from './offline/db';
import { currentApiUrl, reloadPlugins } from './services/appServices';
import { RemoteSyncManager } from './offline/RemoteSyncManager';
import { SOLVER_IDS } from './engines/solverRegistry';
import { useIsLight } from './utils/theme';

const UserGuideModal = lazy(() => import('./components/UserGuideModal'));
const LabReportModal = lazy(() => import('./components/LabReportModal'));
const QrScannerModal = lazy(() => import('./components/QrScannerModal'));
const CmsEditorModal = lazy(() => import('./components/CmsEditorModal'));
const NoCodeLessonWizard = lazy(() => import('./components/NoCodeLessonWizard'));
const AssetOverrideModal = lazy(() => import('./components/AssetOverrideModal'));
const TeacherPortal = lazy(() => import('./components/TeacherPortal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const WorksheetModal = lazy(() => import('./components/WorksheetModal'));
const MeniscusReaderModal = lazy(() => import('./components/MeniscusReaderModal'));
const AiTutorDrawer = lazy(() => import('./components/AiTutorDrawer'));

const TOAST_STYLE = { info: 'border-sky-500', success: 'border-ok', warning: 'border-amber-400', danger: 'border-danger' } as const;

const PPE_TEXT = { goggles: 'đeo kính', gloves: 'đeo găng tay', labelCheck: 'đọc nhãn' } as const;

const closeTutor = (): void => useLabStore.getState().setTutorOpen(false);

export default function App() {
  const modal = useLabStore((s) => s.modal);
  const settings = useLabStore((s) => s.settings);
  const toasts = useLabStore((s) => s.toasts);
  const khkt = useLabStore((s) => s.khktMode);
  const debug = useLabStore((s) => s.debugMode);
  const tutorOpen = useLabStore((s) => s.tutorOpen);
  const activeIncidents = useLabStore((s) => s.activeIncidents);
  const ppe = useLabStore((s) => s.ppe);
  const plugin = useLabStore((s) => s.plugin);
  const [glKey, setGlKey] = useState(0);
  const light = useIsLight();
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
  }, [light]);
  const missingPpe = plugin.ppeRequired.filter((k) => !ppe[k]);
  // Cảnh báo bảo hộ chỉ hiện khi thật sự còn thiếu (trừ khi giám khảo giả lập trong chế độ KHKT)
  const incidents = activeIncidents.filter((id) => id !== 'ppe-missing' || missingPpe.length > 0 || khkt);

  // Khởi động: nạp bài tùy biến + kiểm tra gói cập nhật từ xa
  useEffect(() => {
    void reloadPlugins().then(async () => {
      const url = useLabStore.getState().settings.remoteUpdateUrl;
      if (!url) return;
      const r = await new RemoteSyncManager(SOLVER_IDS).checkForUpdates(url);
      if (r.status === 'updated') {
        await reloadPlugins();
        useLabStore.getState().toast('success', r.message);
      }
    });
  }, []);

  // Online/offline + ping máy chủ LAN + đẩy hàng đợi
  useEffect(() => {
    const st = useLabStore.getState();
    const on = (): void => st.setOnline(true);
    const off = (): void => st.setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    let stop = false;
    const ping = async (): Promise<void> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(`${currentApiUrl()}/api/health`, { signal: ctrl.signal });
        const ok = res.ok;
        if (!stop) useLabStore.getState().setServerOnline(ok);
        if (ok) {
          const n = await flushSyncQueue(currentApiUrl());
          if (n > 0) useLabStore.getState().toast('success', `Đã đồng bộ ${n} bài nộp lên máy chủ lớp.`);
        }
      } catch {
        if (!stop) useLabStore.getState().setServerOnline(false);
      } finally {
        clearTimeout(t);
      }
    };
    void ping();
    const id = setInterval(() => void ping(), 30000);
    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Trợ năng: cỡ chữ & lớp CSS
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale));
  }, [settings.fontScale]);

  const onContextLost = useCallback(() => {
    useLabStore.getState().toast('warning', 'Mất ngữ cảnh đồ họa — đang khôi phục cảnh 3D…');
    useLabStore.getState().setQualityLevel(0);
    setTimeout(() => setGlKey((k) => k + 1), 800);
  }, []);

  const rootClass = [
    'flex h-full flex-col',
    settings.colorBlindMode !== 'none' ? `cb-${settings.colorBlindMode}` : '',
    settings.highContrast ? 'high-contrast' : '',
    settings.reducedMotion ? 'reduced-motion' : ''
  ].join(' ');
  const canvasFilter = settings.colorBlindMode !== 'none' ? `url(#cbf-${settings.colorBlindMode})` : undefined;

  return (
    <div className={rootClass}>
      {/* Bộ lọc hiệu chỉnh màu (daltonize) cho cảnh 3D */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="cbf-deuteranopia">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0.7 0.3 0 0 0  0.7 0 0.3 0 0  0 0 0 1 0" />
        </filter>
        <filter id="cbf-protanopia">
          <feColorMatrix type="matrix" values="0.3 0.7 0 0 0  0 1 0 0 0  0 0.7 0.3 0 0  0 0 0 1 0" />
        </filter>
        <filter id="cbf-tritanopia">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0.3 0.7 0 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      <Navbar />
      <SafetyPpeBar />
      <main className="relative flex min-h-0 flex-1 flex-col landscape:flex-row lg:flex-row">
        <section className="relative min-h-[42vh] flex-1" style={{ filter: canvasFilter }} data-tour="canvas">
          <WebGLCheckGuard>
            <SceneErrorBoundary resetKey={glKey}>
              <LabCanvasHost key={glKey} onContextLost={onContextLost} />
            </SceneErrorBoundary>
          </WebGLCheckGuard>
          {incidents.length > 0 && (
            <div className="absolute inset-x-2 top-2 z-10 space-y-1" role="alert">
              {incidents.map((id) => {
                const def = plugin.incidents.find((d) => d.id === id);
                const title = def?.title ?? (id === 'ppe-missing' ? 'Thiếu trang bị bảo hộ' : 'Sự cố giả lập');
                const msg = def?.message ?? (id === 'ppe-missing' ? `Còn thiếu: ${(missingPpe.length ? missingPpe : plugin.ppeRequired).map((k) => PPE_TEXT[k]).join(', ') || 'trang bị bảo hộ'}.` : 'Giám khảo vừa kích hoạt sự cố giả lập để kiểm tra phản ứng an toàn.');
                return (
                  <div key={id} className="flex items-start gap-2 rounded-lg border-2 border-danger bg-red-950/90 p-2 text-sm text-red-100 shadow-lg">
                    <span className="text-lg" aria-hidden="true">⚠️</span>
                    <div className="flex-1">
                      <b>{title}</b>
                      <p>{msg}</p>
                    </div>
                    <button className="btn min-h-0 px-2 py-1 text-xs" onClick={() => useLabStore.getState().dismissIncident(id)}>
                      Đã hiểu
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {khkt && <KhktDemoOverlay />}
          {incidents.length === 0 && <SceneDock />}
          <SimControls />
          <FloatingLabTools />
        </section>
        <LabHUD />
      </main>

      {debug && <DevDebugPanel />}
      {modal === 'lessons' && <LessonPicker />}
      <ConfirmDialogModal />
      <PinGuardModal />
      {settings.showOnboarding && <OnboardingTour />}

      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white">Đang tải…</div>}>
        {modal === 'guide' && <UserGuideModal />}
        {modal === 'report' && <LabReportModal />}
        {modal === 'scanner' && <QrScannerModal />}
        {modal === 'cms' && <CmsEditorModal />}
        {modal === 'wizard' && <NoCodeLessonWizard />}
        {modal === 'assets' && <AssetOverrideModal />}
        {modal === 'teacher' && <TeacherPortal />}
        {modal === 'settings' && <SettingsModal />}
        {modal === 'meniscus' && <MeniscusReaderModal />}
        {modal === 'worksheet' && <WorksheetModal />}
      </Suspense>

      {/* Trợ lý AI có Suspense + Error Boundary riêng: lỗi ở đây không được làm sập ứng dụng */}
      {tutorOpen && (
        <TutorErrorBoundary onClose={closeTutor}>
          <Suspense fallback={<div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Đang mở trợ lý…</div>}>
            <AiTutorDrawer />
          </Suspense>
        </TutorErrorBoundary>
      )}

      <div className="pointer-events-none fixed top-16 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-lg border-l-4 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg ${TOAST_STYLE[t.kind]}`} onClick={() => useLabStore.getState().dismissToast(t.id)}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
