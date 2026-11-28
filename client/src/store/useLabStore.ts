/**
 * store/useLabStore.ts — Trạng thái toàn cục (Zustand).
 * Quản lý: danh mục bài, phiên học sinh, thông số chỉnh/ẩn, tiến trình các bước, số liệu đo, PPE,
 * sự cố, trạng thái cảnh 3D, cài đặt (đồ họa máy yếu, trợ năng, API, PIN), chế độ Split-Screen,
 * KHKT Mode, phiên PIN, Auto-Adaptive FPS (mức chất lượng), modal đang mở.
 */
import { SANDBOX_SLOTS } from '../data/equipmentCatalog';
import { advanceWorld, createWorld, doAction, setControl, syncWorld, wipeSpill, type SandboxWorld } from '../engines/sandboxSim';
import { valueIssue } from '../utils/trialTable';
import { create } from 'zustand';
import type {
  AppSettings,
  DraftRecord,
  LabPluginDef,
  PerfStats,
  PpeItem,
  PpeState,
  SceneVisualState,
  SolveContext,
  StudentSession,
  SubjectId,
  TrialRecord
} from '../types/lab';
import { DEFAULT_SETTINGS } from '../config/appConfig';
import { BUILTIN_PLUGINS } from '../plugins/pluginRegistry';
import { getSolver } from '../engines/solverRegistry';
import { generateHiddenParams, hashString, mulberry32, sessionSeed } from '../utils/randomizer';
import { soundEngine } from '../audio/soundEngine';
import { setHapticsEnabled, vibrate } from '../utils/haptics';
import { logAction } from '../utils/bugSnapshot';

export type ModalId =
  | 'guide'
  | 'report'
  | 'scanner'
  | 'cms'
  | 'wizard'
  | 'assets'
  | 'teacher'
  | 'settings'
  | 'meniscus'
  | 'worksheet'
  | 'lessons'
  | 'session'
  | 'onboarding';

/** Góc nhìn chuẩn: toàn cảnh / chính diện / từ trên / bên cạnh / cận cảnh dụng cụ của một bước */
export type CameraViewKind = 'overview' | 'front' | 'top' | 'side' | 'step';

export type PinTarget = 'teacher' | 'cms' | 'wizard' | 'assets' | 'khkt' | 'settings-pin';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'danger';
  text: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

const SETTINGS_KEY = 'khtn-lab-settings';
const SESSION_KEY = 'khtn-lab-session';
const PIN_SESSION_MS = 30 * 60 * 1000;

function loadSettings(): AppSettings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    /* localStorage bị chặn → dùng mặc định */
  }
  return { ...DEFAULT_SETTINGS };
}

function loadSession(): StudentSession | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (raw) return JSON.parse(raw) as StudentSession;
  } catch {
    /* bỏ qua */
  }
  return null;
}

const emptyPpe = (): PpeState => ({ goggles: false, gloves: false, labelCheck: false });

function defaultParams(p: LabPluginDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of p.params) out[d.key] = d.default;
  return out;
}

export interface LabState {
  plugins: LabPluginDef[];
  subject: SubjectId;
  plugin: LabPluginDef;
  session: StudentSession | null;
  seed: number;
  hidden: Record<string, number>;
  params: Record<string, number>;
  trials: TrialRecord[];
  completedSteps: string[];
  ppe: PpeState;
  activeIncidents: string[];
  incidentCount: number;
  visual: SceneVisualState;
  visualNonce: number;
  notes: string;
  studentValue: string;
  conclusion: string;
  preAnswers: number[];
  postAnswers: number[];
  preSubmitted: boolean;
  postSubmitted: boolean;
  startedAt: number;
  meniscusErrorMl: number | null;
  submitted: boolean;
  /** Lần đo vừa thực hiện, chờ học sinh bấm "Ghi vào bảng" */
  pendingTrial: TrialRecord | null;
  /** Số lần đã đo (kể cả lần chưa ghi) — dùng làm mầm nhiễu đo */
  measureSeq: number;
  /** Thời điểm (ms) hoạt cảnh đo kết thúc → lúc đó mới hiện số đo, cho khớp với đồng hồ trong cảnh */
  pendingReadyAt: number;
  pausedAt: number;

  settings: AppSettings;
  splitScreen: boolean;
  comparePluginId: string | null;
  khktMode: boolean;
  debugMode: boolean;
  pinUntil: number;
  pinTarget: PinTarget | null;
  perf: PerfStats | null;
  qualityLevel: number;
  online: boolean;
  serverOnline: boolean;
  modal: ModalId | null;
  confirm: ConfirmRequest | null;
  toasts: Toast[];
  cameraResetNonce: number;
  /** Tăng mỗi khi cần dựng lại cảnh 3D (đổi bài, làm lại, đổi phiên) */
  sceneNonce: number;
  tutorOpen: boolean;
  toolsOpen: boolean;
  /** Hoạt cảnh đang tạm dừng */
  simPaused: boolean;
  /** Tăng mỗi lần bấm Từng bước */
  simStepNonce: number;
  /** Trạng thái hiển thị của lần đo gần nhất (để phát lại) */
  lastMeasureVisual: SceneVisualState | null;
  cameraView: { kind: CameraViewKind; tag: string | null; nonce: number };
  /** Môn đang xem trong danh sách bài */
  pickerSubject: SubjectId;
  /** Chế độ Tự do thí nghiệm (tủ dụng cụ) — tách hẳn khỏi bài chính thức */
  sandboxOn: boolean;
  /** Dụng cụ đang đặt trên bàn tự do (theo thứ tự chỗ) */
  sandboxItems: string[];
  /** Trạng thái mô phỏng các dụng cụ trên bàn tự do (van, lửa, nhiệt độ…) — KHÔNG dùng cho bài nộp */
  sandboxWorld: SandboxWorld;
  /** Chỗ đang chọn để điều khiển */
  sandboxSel: number | null;

  setPlugins(list: LabPluginDef[]): void;
  setSandbox(on: boolean): void;
  addSandboxItem(id: string): ActionResult;
  removeSandboxItem(index: number): void;
  replaceSandboxItem(index: number, id: string): void;
  clearSandbox(): void;
  moveSandboxItem(from: number, to: number): void;
  selectSandbox(i: number | null): void;
  sandboxControl(slot: number, key: string, value: number): ActionResult;
  sandboxAction(slot: number, key: string): ActionResult;
  /** Tiến thời gian mô phỏng (giây thực); force = bỏ qua trạng thái Dừng (nút Từng bước) */
  sandboxAdvance(realDt: number, force?: boolean): void;
  setSandboxRunning(on: boolean): void;
  setSandboxSpeed(x: number): void;
  resetSandboxWorld(): void;
  wipeSandboxSpill(): void;
  setSubject(s: SubjectId): void;
  loadPlugin(id: string): void;
  setSession(s: StudentSession): void;
  setParam(key: string, value: number): void;
  togglePpe(item: PpeItem): void;
  triggerInteraction(tag: string): ActionResult;
  performCurrentStep(): ActionResult;
  takeMeasurement(): ActionResult;
  deleteTrial(index: number): void;
  /** Bật/tắt cờ "đo lỗi" của một lần đo */
  toggleTrialFlag(index: number): void;
  commitPending(): ActionResult;
  discardPending(): void;
  addManualTrial(values: Record<string, number>): void;
  /** Đo và ghi liên tiếp n lần (chế độ đo lặp tự động) */
  autoMeasure(n: number): ActionResult;
  resetLab(): void;
  jumpToStep(index: number): void;
  setNotes(t: string): void;
  setStudentValue(t: string): void;
  setConclusion(t: string): void;
  answerQuiz(phase: 'pre' | 'post', q: number, option: number): void;
  submitQuiz(phase: 'pre' | 'post'): void;
  setMeniscusError(e: number): void;
  markSubmitted(): void;
  restoreDraft(d: DraftRecord): boolean;
  resumeDraft(d: DraftRecord): void;
  simRun(): ActionResult;
  simPause(): void;
  simStep(): void;
  simReset(): void;
  setCameraView(kind: CameraViewKind, tag?: string | null): void;
  getDraft(): DraftRecord;
  simulateIncident(id: string): void;
  dismissIncident(id: string): void;

  updateSettings(patch: Partial<AppSettings>): void;
  setSplitScreen(on: boolean, compareId?: string | null): void;
  setKhktMode(on: boolean): void;
  setDebugMode(on: boolean): void;
  requestPin(target: PinTarget): void;
  pinVerified(): void;
  cancelPin(): void;
  isPinSessionValid(): boolean;
  setPerf(p: PerfStats): void;
  setQualityLevel(q: number): void;
  setOnline(on: boolean): void;
  setServerOnline(on: boolean): void;
  openModal(m: ModalId): void;
  openLessons(s: SubjectId): void;
  closeModal(): void;
  askConfirm(c: ConfirmRequest): void;
  closeConfirm(): void;
  toast(kind: Toast['kind'], text: string): void;
  dismissToast(id: number): void;
  resetCamera(): void;
  setTutorOpen(on: boolean): void;
  setToolsOpen(on: boolean): void;
  currentStepIndex(): number;
  solveContext(rngSeed?: number): SolveContext;
}

let toastId = 1;

function computeSeed(session: StudentSession | null, pluginId: string): number {
  return sessionSeed(session?.studentCode ?? 'KHACH', session?.classCode ?? 'TUDO', pluginId);
}

function freshLabState(plugin: LabPluginDef, session: StudentSession | null) {
  const seed = computeSeed(session, plugin.id);
  const hidden = generateHiddenParams(plugin.hidden, seed);
  const params = defaultParams(plugin);
  const solver = getSolver(plugin.solverId);
  const ctx: SolveContext = { plugin, params, hidden, ppe: emptyPpe(), rng: mulberry32(seed) };
  let visual: SceneVisualState = {};
  try {
    visual = solver.preview(ctx);
  } catch {
    visual = {};
  }
  return {
    plugin,
    subject: plugin.subject,
    seed,
    hidden,
    params,
    trials: [] as TrialRecord[],
    completedSteps: [] as string[],
    ppe: emptyPpe(),
    activeIncidents: [] as string[],
    incidentCount: 0,
    visual,
    visualNonce: 0,
    notes: '',
    studentValue: '',
    conclusion: '',
    preAnswers: plugin.preQuiz.map(() => -1),
    postAnswers: plugin.postQuiz.map(() => -1),
    preSubmitted: false,
    postSubmitted: false,
    startedAt: Date.now(),
    meniscusErrorMl: null as number | null,
    submitted: false,
    pendingTrial: null as TrialRecord | null,
    measureSeq: 0,
    pendingReadyAt: 0,
    pausedAt: 0,
    simPaused: false,
    lastMeasureVisual: null as SceneVisualState | null
  };
}

const initialSettings = loadSettings();
const initialSession = loadSession();
soundEngine.setEnabled(initialSettings.soundEnabled);
setHapticsEnabled(initialSettings.hapticsEnabled);

export const useLabStore = create<LabState>((set, get) => ({
  plugins: BUILTIN_PLUGINS,
  session: initialSession,
  ...freshLabState(BUILTIN_PLUGINS[0], initialSession),

  settings: initialSettings,
  splitScreen: false,
  comparePluginId: null,
  khktMode: false,
  debugMode: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true',
  pinUntil: 0,
  pinTarget: null,
  perf: null,
  qualityLevel: initialSettings.lowEndGraphics ? 0 : 2,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  serverOnline: false,
  modal: null,
  confirm: null,
  toasts: [],
  cameraResetNonce: 0,
  sceneNonce: 0,
  tutorOpen: false,
  toolsOpen: false,
  simPaused: false,
  simStepNonce: 0,
  cameraView: { kind: 'overview', tag: null, nonce: 0 },
  pickerSubject: BUILTIN_PLUGINS[0].subject,
  sandboxOn: false,
  sandboxItems: [],
  sandboxWorld: createWorld([]),
  sandboxSel: null,

  setSandbox(on) {
    logAction(on ? 'sandbox-on' : 'sandbox-off');
    // Bỏ lần đo đang chờ ghi để không lẫn sang chế độ khác; về góc nhìn chuẩn của cảnh mới
    set({ sandboxOn: on, pendingTrial: null, simPaused: false, cameraView: { kind: 'overview', tag: null, nonce: get().cameraView.nonce } });
  },
  addSandboxItem(id) {
    const st = get();
    if (st.sandboxItems.length >= SANDBOX_SLOTS) return { ok: false, message: `Bàn đã đủ ${SANDBOX_SLOTS} dụng cụ — gỡ bớt hoặc bấm Đổi ở một chỗ.` };
    logAction('sandbox-add', id);
    const items = [...st.sandboxItems, id];
    set({ sandboxItems: items, sandboxWorld: syncWorld(st.sandboxWorld, st.sandboxItems, items), sandboxSel: items.length - 1 });
    return { ok: true, message: 'Đã đặt lên bàn.' };
  },
  removeSandboxItem(index) {
    logAction('sandbox-remove', String(index));
    const st = get();
    set({ sandboxItems: st.sandboxItems.filter((_, i) => i !== index), sandboxWorld: { ...st.sandboxWorld, states: st.sandboxWorld.states.filter((_, i) => i !== index) }, sandboxSel: null });
  },
  replaceSandboxItem(index, id) {
    logAction('sandbox-replace', `${index}:${id}`);
    const st = get();
    const items = st.sandboxItems.map((x, i) => (i === index ? id : x));
    set({ sandboxItems: items, sandboxWorld: syncWorld(st.sandboxWorld, st.sandboxItems, items), sandboxSel: index });
  },
  clearSandbox() {
    logAction('sandbox-clear');
    set({ sandboxItems: [], sandboxWorld: createWorld([]), sandboxSel: null });
  },
  moveSandboxItem(from, to) {
    const st = get();
    const n = st.sandboxItems.length;
    if (from === to || from < 0 || from >= n || to < 0 || to >= SANDBOX_SLOTS) return;
    const t2 = Math.min(to, n - 1);
    const items = [...st.sandboxItems];
    const states = [...st.sandboxWorld.states];
    [items[from], items[t2]] = [items[t2], items[from]];
    [states[from], states[t2]] = [states[t2], states[from]];
    logAction('sandbox-move', `${from}>${t2}`);
    set({ sandboxItems: items, sandboxWorld: { ...st.sandboxWorld, states }, sandboxSel: t2 });
  },
  selectSandbox: (i) => set({ sandboxSel: i }),
  sandboxControl(slot, key, value) {
    const st = get();
    const r = setControl(st.sandboxWorld, st.sandboxItems, slot, key, value, st.ppe);
    if (r.ok) set({ sandboxWorld: r.world });
    return { ok: r.ok, message: r.message };
  },
  sandboxAction(slot, key) {
    const st = get();
    const r = doAction(st.sandboxWorld, st.sandboxItems, slot, key, st.ppe);
    if (r.ok) set({ sandboxWorld: r.world });
    return { ok: r.ok, message: r.message };
  },
  sandboxAdvance(realDt, force = false) {
    const st = get();
    if (!st.sandboxOn || !st.sandboxItems.length || (!force && (!st.sandboxWorld.running || st.simPaused))) return;
    set({ sandboxWorld: advanceWorld(st.sandboxWorld, st.sandboxItems, realDt * st.sandboxWorld.speed) });
  },
  setSandboxRunning: (on) => set({ sandboxWorld: { ...get().sandboxWorld, running: on }, simPaused: false }),
  setSandboxSpeed: (x) => set({ sandboxWorld: { ...get().sandboxWorld, speed: x } }),
  resetSandboxWorld() {
    logAction('sandbox-reset');
    set({ sandboxWorld: createWorld(get().sandboxItems) });
  },
  wipeSandboxSpill: () => set({ sandboxWorld: wipeSpill(get().sandboxWorld) }),

  setPlugins(list) {
    const cur = get().plugin.id;
    const updated = list.find((p) => p.id === cur);
    set({ plugins: list });
    if (updated && updated !== get().plugin) set({ ...freshLabState(updated, get().session), sceneNonce: get().sceneNonce + 1 });
  },
  setSubject(s) {
    const first = get().plugins.find((p) => p.subject === s);
    set({ subject: s });
    if (first && get().plugin.subject !== s) get().loadPlugin(first.id);
  },
  loadPlugin(id) {
    const p = get().plugins.find((x) => x.id === id);
    if (!p) return;
    logAction('load-plugin', id);
    set({ ...freshLabState(p, get().session), sandboxOn: false, cameraResetNonce: get().cameraResetNonce + 1, sceneNonce: get().sceneNonce + 1 });
  },
  setSession(s) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
      /* bỏ qua */
    }
    logAction('session', `${s.classCode}/${s.studentCode}`);
    set({ session: s, ...freshLabState(get().plugin, s), sceneNonce: get().sceneNonce + 1 });
  },
  setParam(key, value) {
    const st = get();
    // Bước hiện tại yêu cầu giữ nguyên đại lượng này
    if (st.plugin.steps[st.currentStepIndex()]?.lockParams?.includes(key)) return;
    const params = { ...st.params, [key]: value };
    const solver = getSolver(st.plugin.solverId);
    const ctx: SolveContext = { plugin: st.plugin, params, hidden: st.hidden, ppe: st.ppe, rng: mulberry32(st.seed) };
    let visual = st.visual;
    try {
      visual = solver.preview(ctx);
    } catch {
      /* biểu thức No-Code lỗi → giữ cảnh cũ */
    }
    // Bước chọn thông số chỉ hoàn thành khi bấm nút chính, để bảng không nhảy giữa lúc đang kéo
    set({ params, visual });
  },
  togglePpe(item) {
    const ppe = { ...get().ppe, [item]: !get().ppe[item] };
    soundEngine.play('click');
    vibrate('tap');
    logAction('ppe', `${item}=${ppe[item]}`);
    // Đã đủ bảo hộ → gỡ cảnh báo thiếu bảo hộ
    const enough = get().plugin.ppeRequired.every((k) => ppe[k]);
    set({ ppe, activeIncidents: enough ? get().activeIncidents.filter((x) => x !== 'ppe-missing') : get().activeIncidents });
  },
  currentStepIndex() {
    const { plugin, completedSteps } = get();
    const i = plugin.steps.findIndex((s) => !completedSteps.includes(s.id));
    return i === -1 ? plugin.steps.length : i;
  },
  solveContext(rngSeed) {
    const st = get();
    return { plugin: st.plugin, params: st.params, hidden: st.hidden, ppe: st.ppe, rng: mulberry32(rngSeed ?? st.seed) };
  },
  triggerInteraction(tag) {
    const st = get();
    if (st.sandboxOn) return { ok: false, message: 'Đang ở chế độ Tự do thí nghiệm — bấm "Quay lại bài" để đo và ghi số liệu chính thức.' };
    const idx = st.currentStepIndex();
    const step = st.plugin.steps[idx];
    logAction('interact', tag);
    if (tag === 'reset') {
      st.simReset();
      return { ok: true, message: 'Đã RESET đồng hồ về 0.' };
    }
    // Chạm một cấu trúc của mô hình tế bào → chọn cấu trúc đó để xem chức năng
    if (tag.startsWith('part-') && typeof st.plugin.sceneOptions.partOrder === 'string') {
      const i = st.plugin.sceneOptions.partOrder.split(',').indexOf(tag.slice(5));
      const def = st.plugin.params.find((x) => x.key === 'part');
      if (i >= 0 && def) {
        st.setParam('part', i);
        return { ok: true, message: def.options?.find((o) => o.value === i)?.label ?? 'Đã chọn cấu trúc.' };
      }
    }
    // Cho phép đo lại sau khi đã qua bước đo
    const measureStep = st.plugin.steps.find((s) => s.action === 'measure');
    if (measureStep && measureStep.trigger === tag && st.completedSteps.includes(measureStep.id)) {
      return st.takeMeasurement();
    }
    if (!step) return { ok: false, message: 'Đã hoàn thành mọi bước. Hãy nộp phiếu báo cáo.' };
    if (step.trigger && step.trigger !== tag) {
      return { ok: false, message: `Chưa tới dụng cụ này. Hãy làm: ${step.title}.` };
    }
    return st.performCurrentStep();
  },
  performCurrentStep() {
    if (get().sandboxOn) return { ok: false, message: 'Đang ở chế độ Tự do thí nghiệm — bấm "Quay lại bài" để đo và ghi số liệu chính thức.' };
    const st = get();
    const idx = st.currentStepIndex();
    const step = st.plugin.steps[idx];
    if (!step) return { ok: false, message: 'Đã hoàn thành mọi bước.' };
    if (step.requiresPpe) {
      const missing = st.plugin.ppeRequired.filter((k) => !st.ppe[k]);
      if (missing.length) {
        soundEngine.play('alarm');
        vibrate('danger');
        const inc = st.activeIncidents.includes('ppe-missing') ? st.activeIncidents : [...st.activeIncidents, 'ppe-missing'];
        set({ activeIncidents: inc, incidentCount: st.incidentCount + 1 });
        logAction('incident', 'ppe-missing');
        return { ok: false, message: 'Chưa đủ bảo hộ! Bật ở thanh phía trên.' };
      }
    }
    if (step.action === 'measure') return st.takeMeasurement();
    if (step.action === 'record') {
      if (st.trials.length < st.plugin.minTrials) {
        return { ok: false, message: `Cần đo thêm ${st.plugin.minTrials - st.trials.length} lần.` };
      }
    }
    soundEngine.play(step.action === 'snap' ? 'snap' : 'click');
    vibrate(step.action === 'snap' ? 'snap' : 'tap');
    logAction('step', step.id);
    set({ completedSteps: [...st.completedSteps, step.id] });
    return { ok: true, message: `✓ Xong: ${step.title}` };
  },
  takeMeasurement() {
    if (get().sandboxOn) return { ok: false, message: 'Đang ở chế độ Tự do thí nghiệm — bấm "Quay lại bài" để đo và ghi số liệu chính thức.' };
    const st = get();
    const measureIdx = st.plugin.steps.findIndex((s) => s.action === 'measure');
    const cur = st.currentStepIndex();
    if (measureIdx >= 0 && cur < measureIdx) {
      return { ok: false, message: `Trước khi đo, hãy làm: ${st.plugin.steps[cur].title}.` };
    }
    const solver = getSolver(st.plugin.solverId);
    const rngSeed = (st.seed ^ Math.imul(st.measureSeq + 1, 2654435761) ^ hashString(JSON.stringify(st.params))) >>> 0;
    const ctx = st.solveContext(rngSeed);
    const incidents = solver.incidents(ctx);
    const newOnes = incidents.filter((i) => !st.activeIncidents.includes(i));
    const defs = st.plugin.incidents;
    const danger = incidents.some((i) => defs.find((d) => d.id === i)?.severity === 'danger');
    if (newOnes.length) {
      soundEngine.play('alarm');
      vibrate(danger ? 'danger' : 'warning');
      logAction('incident', newOnes.join(','));
      set({ activeIncidents: [...st.activeIncidents, ...newOnes], incidentCount: st.incidentCount + newOnes.length });
    }
    if (danger) {
      set({ visual: { ...st.visual, danger: true }, visualNonce: st.visualNonce + 1 });
      return { ok: false, message: 'Dừng đo vì không an toàn. Chỉnh lại thông số.' };
    }
    const measureStep = st.plugin.steps.find((s) => s.action === 'measure');
    if (measureStep?.requiresPpe && st.plugin.ppeRequired.some((k) => !st.ppe[k])) {
      soundEngine.play('alarm');
      set({ activeIncidents: [...new Set([...get().activeIncidents, 'ppe-missing'])], incidentCount: get().incidentCount + 1 });
      return { ok: false, message: 'Chưa đủ bảo hộ! Bật ở thanh phía trên.' };
    }
    let result;
    try {
      result = solver.measure(ctx);
    } catch (e) {
      return { ok: false, message: `Lỗi công thức bài học: ${e instanceof Error ? e.message : String(e)}` };
    }
    const trial: TrialRecord = { index: st.trials.length + 1, params: { ...st.params }, values: result.values, at: Date.now() };
    const completed =
      measureStep && !get().completedSteps.includes(measureStep.id) ? [...get().completedSteps, measureStep.id] : get().completedSteps;
    soundEngine.play(st.plugin.subject === 'chemistry' ? 'bubble' : 'tick');
    vibrate('tap');
    logAction('measure', JSON.stringify(result.values));
    const animMs = typeof result.visual.animMs === 'number' ? result.visual.animMs : 0;
    set({ pendingReadyAt: Date.now() + animMs * 1.15, pendingTrial: trial, measureSeq: st.measureSeq + 1, visual: result.visual, visualNonce: st.visualNonce + 1, completedSteps: completed, simPaused: false, lastMeasureVisual: result.visual });
    const describe = Object.entries(result.values)
      .map(([k, v]) => {
        const m = st.plugin.measurements.find((x) => x.key === k);
        return `${m?.label ?? k}: ${m?.valueLabels?.[String(v)] ?? `${String(v).replace('.', ',')}${m?.unit ? ` ${m.unit}` : ''}`}`;
      })
      .join('; ');
    if (animMs > 0) return { ok: true, message: 'Đang đo… nhìn dụng cụ và đồng hồ nhé!' };
    return { ok: true, message: Object.keys(result.values).length > 2 ? 'Đo xong rồi! Bấm "Ghi vào bảng".' : `${describe}. Bấm "Ghi vào bảng".` };
  },
  commitPending() {
    if (get().sandboxOn) return { ok: false, message: 'Đang ở chế độ Tự do thí nghiệm — bấm "Quay lại bài" để đo và ghi số liệu chính thức.' };
    const st = get();
    if (!st.pendingTrial) return { ok: false, message: 'Chưa có lần đo nào để ghi.' };
    const issue = valueIssue(st.plugin, st.pendingTrial.values);
    if (issue) return { ok: false, message: st.plugin.validity?.notReadyMessage ?? `Lần đo chưa đạt: ${issue}.` };
    const fixed = st.plugin.validity?.fixedParams ?? [];
    const changed = fixed.some((k) => st.pendingTrial !== null && st.pendingTrial.params[k] !== st.params[k]);
    const trial = { ...st.pendingTrial, index: st.trials.length + 1, ...(changed ? { paramChanged: true } : {}) };
    logAction('commit-trial', String(trial.index));
    set({ trials: [...st.trials, trial], pendingTrial: null });
    return { ok: true, message: `✓ Đã ghi lần ${trial.index} vào bảng.` };
  },
  discardPending: () => set({ pendingTrial: null }),
  addManualTrial(values) {
    if (get().sandboxOn) return;
    const st = get();
    const trial: TrialRecord = { index: st.trials.length + 1, params: { ...st.params }, values, at: Date.now(), manual: true };
    logAction('manual-trial', JSON.stringify(values));
    set({ trials: [...st.trials, trial] });
    st.toast('success', `✓ Đã thêm hàng ${trial.index} (nhập tay).`);
  },
  autoMeasure(n) {
    let done = 0;
    for (let i = 0; i < n; i++) {
      const r = get().takeMeasurement();
      if (!r.ok) return done ? { ok: true, message: `Đã đo và ghi ${done} lần. ${r.message}` } : r;
      const c = get().commitPending();
      if (!c.ok) {
        get().discardPending();
        return done ? { ok: true, message: `Đã đo và ghi ${done} lần. ${c.message}` } : c;
      }
      done++;
    }
    return { ok: true, message: `✓ Đã đo và ghi ${done} lần.` };
  },
  toggleTrialFlag(index) {
    logAction('flag-trial', String(index));
    set({ trials: get().trials.map((t) => (t.index === index ? { ...t, flagged: !t.flagged } : t)) });
  },
  deleteTrial(index) {
    const trials = get()
      .trials.filter((t) => t.index !== index)
      .map((t, i) => ({ ...t, index: i + 1 }));
    logAction('delete-trial', String(index));
    set({ trials });
  },
  resetLab() {
    logAction('reset', get().plugin.id);
    set({ ...freshLabState(get().plugin, get().session), cameraResetNonce: get().cameraResetNonce + 1, sceneNonce: get().sceneNonce + 1 });
  },
  jumpToStep(index) {
    const steps = get().plugin.steps.slice(0, Math.max(0, index)).map((s) => s.id);
    logAction('debug-jump', String(index));
    set({ completedSteps: steps });
  },
  setNotes: (t) => set({ notes: t }),
  setStudentValue: (t) => set({ studentValue: t }),
  setConclusion: (t) => set({ conclusion: t }),
  answerQuiz(phase, q, option) {
    if (phase === 'pre') {
      const a = [...get().preAnswers];
      a[q] = option;
      set({ preAnswers: a });
    } else {
      const a = [...get().postAnswers];
      a[q] = option;
      set({ postAnswers: a });
    }
  },
  submitQuiz(phase) {
    const st = get();
    const answers = phase === 'pre' ? st.preAnswers : st.postAnswers;
    logAction(answers.every((a) => a < 0) ? 'quiz-skip' : 'quiz', phase);
    set(phase === 'pre' ? { preSubmitted: true } : { postSubmitted: true });
  },
  setMeniscusError: (e) => set({ meniscusErrorMl: e }),
  markSubmitted: () => set({ submitted: true }),
  restoreDraft(d) {
    const st = get();
    // Bài đã đổi thông số (khác phiên bản) → nháp cũ không còn dùng được
    if (d.pluginId !== st.plugin.id || (d.pluginVersion ?? 1) !== st.plugin.version) return false;
    const params = { ...defaultParams(st.plugin), ...d.params };
    const solver = getSolver(st.plugin.solverId);
    let visual = st.visual;
    try {
      visual = solver.preview({ ...st.solveContext(), params });
    } catch {
      /* giữ nguyên */
    }
    set({
      params,
      trials: d.trials,
      completedSteps: d.completedSteps,
      ppe: d.ppe,
      notes: d.notes,
      studentValue: d.studentValue,
      conclusion: d.conclusion,
      preAnswers: d.preAnswers,
      postAnswers: d.postAnswers,
      preSubmitted: d.preAnswers.every((x) => x >= 0),
      startedAt: d.startedAt,
      visual
    });
    return true;
  },
  resumeDraft(d) {
    const p = get().plugins.find((x) => x.id === d.pluginId);
    if (!p) return;
    if (get().plugin.id !== p.id) get().loadPlugin(p.id);
    const ok = get().restoreDraft(d);
    get().toast(ok ? 'success' : 'warning', ok ? `Đã mở lại bài "${p.shortTitle}".` : 'Bản nháp thuộc phiên bản bài cũ nên không khôi phục được.');
  },
  simRun() {
    const st = get();
    if (st.simPaused) {
      set({ simPaused: false, pendingReadyAt: st.pendingReadyAt + (st.pausedAt ? Date.now() - st.pausedAt : 0), pausedAt: 0 });
      return { ok: true, message: 'Chạy tiếp.' };
    }
    if (!st.lastMeasureVisual) return { ok: false, message: 'Chưa đo lần nào. Hãy làm theo bước trên bảng bên phải trước.' };
    set({ visual: st.lastMeasureVisual, visualNonce: st.visualNonce + 1 });
    return { ok: true, message: 'Phát lại lần đo gần nhất.' };
  },
  simPause: () => set({ simPaused: true, pausedAt: get().pausedAt || Date.now() }),
  simStep: () => set({ simPaused: true, pausedAt: get().pausedAt || Date.now(), simStepNonce: get().simStepNonce + 1 }),
  simReset() {
    const st = get();
    let visual = st.visual;
    try {
      visual = getSolver(st.plugin.solverId).preview(st.solveContext());
    } catch {
      /* bài No-Code lỗi công thức → giữ nguyên cảnh */
    }
    soundEngine.play('click');
    set({ visual, visualNonce: st.visualNonce + 1, simPaused: false });
  },
  setCameraView: (kind, tag = null) => set({ cameraView: { kind, tag, nonce: get().cameraView.nonce + 1 } }),
  getDraft() {
    const st = get();
    return {
      pluginId: st.plugin.id,
      pluginVersion: st.plugin.version,
      params: st.params,
      trials: st.trials,
      completedSteps: st.completedSteps,
      ppe: st.ppe,
      notes: st.notes,
      studentValue: st.studentValue,
      conclusion: st.conclusion,
      preAnswers: st.preAnswers,
      postAnswers: st.postAnswers,
      startedAt: st.startedAt,
      savedAt: Date.now()
    };
  },
  simulateIncident(id) {
    const st = get();
    soundEngine.play('alarm');
    vibrate('danger');
    logAction('simulate-incident', id);
    set({ activeIncidents: [...new Set([...st.activeIncidents, id])], visual: { ...st.visual, danger: true }, visualNonce: st.visualNonce + 1 });
  },
  dismissIncident(id) {
    set({ activeIncidents: get().activeIncidents.filter((x) => x !== id), visual: { ...get().visual, danger: false } });
  },

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* bỏ qua */
    }
    soundEngine.setEnabled(settings.soundEnabled);
    setHapticsEnabled(settings.hapticsEnabled);
    const q = patch.lowEndGraphics === undefined ? get().qualityLevel : patch.lowEndGraphics ? 0 : 2;
    set({ settings, qualityLevel: q });
  },
  setSplitScreen(on, compareId) {
    const other = compareId ?? get().plugins.find((p) => p.id !== get().plugin.id && p.subject === get().plugin.subject)?.id ?? null;
    set({ splitScreen: on, comparePluginId: on ? other : null });
  },
  setKhktMode: (on) => set({ khktMode: on }),
  setDebugMode: (on) => set({ debugMode: on }),
  requestPin(target) {
    if (target !== 'settings-pin' && get().isPinSessionValid()) {
      set({ pinTarget: target });
      get().pinVerified();
      return;
    }
    set({ pinTarget: target });
  },
  pinVerified() {
    const t = get().pinTarget;
    set({ pinUntil: Date.now() + PIN_SESSION_MS, pinTarget: null });
    logAction('pin-ok', String(t));
    if (t === 'khkt') set({ khktMode: true });
    else if (t === 'teacher') set({ modal: 'teacher' });
    else if (t === 'cms') set({ modal: 'cms' });
    else if (t === 'wizard') set({ modal: 'wizard' });
    else if (t === 'assets') set({ modal: 'assets' });
  },
  cancelPin: () => set({ pinTarget: null }),
  isPinSessionValid: () => Date.now() < get().pinUntil,
  setPerf: (p) => set({ perf: p }),
  setQualityLevel: (q) => set({ qualityLevel: Math.max(0, Math.min(2, q)) }),
  setOnline: (on) => set({ online: on }),
  setServerOnline: (on) => set({ serverOnline: on }),
  openModal: (m) => set({ modal: m }),
  openLessons: (s) => set({ modal: 'lessons', pickerSubject: s }),
  closeModal: () => set({ modal: null }),
  askConfirm: (c) => set({ confirm: c }),
  closeConfirm: () => set({ confirm: null }),
  toast(kind, text) {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-1), { id, kind, text }] });
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  // Về góc nhìn ban đầu: nhãn góc nhìn cũng trở về "Toàn cảnh"
  resetCamera: () => set({ cameraResetNonce: get().cameraResetNonce + 1, cameraView: { kind: 'overview', tag: null, nonce: get().cameraView.nonce } }),
  setTutorOpen: (on) => set({ tutorOpen: on }),
  setToolsOpen: (on) => set({ toolsOpen: on })
}));

/** Đang làm dở bài (dùng cho hộp xác nhận trước khi chuyển bài/Reset) */
export function hasUnsavedWork(): boolean {
  const s = useLabStore.getState();
  return !s.submitted && (s.trials.length > 0 || s.completedSteps.length > 0);
}
