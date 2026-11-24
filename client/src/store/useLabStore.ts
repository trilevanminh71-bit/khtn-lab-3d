/**
 * store/useLabStore.ts — Trạng thái toàn cục (Zustand).
 * Quản lý: danh mục bài, phiên học sinh, thông số chỉnh/ẩn, tiến trình các bước, số liệu đo, PPE,
 * sự cố, trạng thái cảnh 3D, cài đặt (đồ họa máy yếu, trợ năng, API, PIN), chế độ Split-Screen,
 * KHKT Mode, phiên PIN, Auto-Adaptive FPS (mức chất lượng), modal đang mở.
 */
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
  | 'session'
  | 'onboarding';

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

  setPlugins(list: LabPluginDef[]): void;
  setSubject(s: SubjectId): void;
  loadPlugin(id: string): void;
  setSession(s: StudentSession): void;
  setParam(key: string, value: number): void;
  togglePpe(item: PpeItem): void;
  triggerInteraction(tag: string): ActionResult;
  performCurrentStep(): ActionResult;
  takeMeasurement(): ActionResult;
  deleteTrial(index: number): void;
  resetLab(): void;
  jumpToStep(index: number): void;
  setNotes(t: string): void;
  setStudentValue(t: string): void;
  setConclusion(t: string): void;
  answerQuiz(phase: 'pre' | 'post', q: number, option: number): void;
  submitQuiz(phase: 'pre' | 'post'): void;
  setMeniscusError(e: number): void;
  markSubmitted(): void;
  restoreDraft(d: DraftRecord): void;
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
    submitted: false
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
    set({ ...freshLabState(p, get().session), cameraResetNonce: get().cameraResetNonce + 1, sceneNonce: get().sceneNonce + 1 });
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
    const params = { ...st.params, [key]: value };
    const solver = getSolver(st.plugin.solverId);
    const ctx: SolveContext = { plugin: st.plugin, params, hidden: st.hidden, ppe: st.ppe, rng: mulberry32(st.seed) };
    let visual = st.visual;
    try {
      visual = solver.preview(ctx);
    } catch {
      /* biểu thức No-Code lỗi → giữ cảnh cũ */
    }
    const cur = st.plugin.steps[st.currentStepIndex()];
    const completed = cur && cur.action === 'adjust' ? [...st.completedSteps, cur.id] : st.completedSteps;
    set({ params, visual, completedSteps: completed });
  },
  togglePpe(item) {
    const ppe = { ...get().ppe, [item]: !get().ppe[item] };
    soundEngine.play('click');
    vibrate('tap');
    logAction('ppe', `${item}=${ppe[item]}`);
    set({ ppe });
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
    const idx = st.currentStepIndex();
    const step = st.plugin.steps[idx];
    logAction('interact', tag);
    // Cho phép đo lại sau khi đã qua bước đo
    const measureStep = st.plugin.steps.find((s) => s.action === 'measure');
    if (measureStep && measureStep.trigger === tag && st.completedSteps.includes(measureStep.id)) {
      return st.takeMeasurement();
    }
    if (!step) return { ok: false, message: 'Đã hoàn thành mọi bước. Hãy nộp phiếu báo cáo.' };
    if (step.trigger && step.trigger !== tag) {
      return { ok: false, message: `Chưa đến lúc thao tác dụng cụ này. Bước hiện tại: "${step.title}".` };
    }
    return st.performCurrentStep();
  },
  performCurrentStep() {
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
        return { ok: false, message: 'Sự cố an toàn: chưa trang bị đủ bảo hộ trên thanh An toàn!' };
      }
    }
    if (step.action === 'measure') return st.takeMeasurement();
    if (step.action === 'record') {
      if (st.trials.length < st.plugin.minTrials) {
        return { ok: false, message: `Cần đo ít nhất ${st.plugin.minTrials} lần (hiện có ${st.trials.length}).` };
      }
    }
    soundEngine.play(step.action === 'snap' ? 'snap' : 'click');
    vibrate(step.action === 'snap' ? 'snap' : 'tap');
    logAction('step', step.id);
    set({ completedSteps: [...st.completedSteps, step.id] });
    return { ok: true, message: `Hoàn thành: ${step.title}` };
  },
  takeMeasurement() {
    const st = get();
    const measureIdx = st.plugin.steps.findIndex((s) => s.action === 'measure');
    const cur = st.currentStepIndex();
    if (measureIdx >= 0 && cur < measureIdx) {
      return { ok: false, message: `Hãy hoàn thành bước "${st.plugin.steps[cur].title}" trước khi đo.` };
    }
    const solver = getSolver(st.plugin.solverId);
    const rngSeed = (st.seed ^ Math.imul(st.trials.length + 1, 2654435761) ^ hashString(JSON.stringify(st.params))) >>> 0;
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
      return { ok: false, message: 'Đã dừng phép đo vì nguy hiểm! Điều chỉnh thông số rồi đo lại.' };
    }
    const measureStep = st.plugin.steps.find((s) => s.action === 'measure');
    if (measureStep?.requiresPpe && st.plugin.ppeRequired.some((k) => !st.ppe[k])) {
      soundEngine.play('alarm');
      set({ activeIncidents: [...new Set([...get().activeIncidents, 'ppe-missing'])], incidentCount: get().incidentCount + 1 });
      return { ok: false, message: 'Sự cố an toàn: cần đủ bảo hộ trước khi thao tác hóa chất!' };
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
    set({ trials: [...st.trials, trial], visual: result.visual, visualNonce: st.visualNonce + 1, completedSteps: completed });
    const describe = Object.entries(result.values)
      .map(([k, v]) => {
        const m = st.plugin.measurements.find((x) => x.key === k);
        return `${m?.label ?? k} = ${String(v).replace('.', ',')}${m?.unit ? ` ${m.unit}` : ''}`;
      })
      .join('; ');
    return { ok: true, message: `Lần đo ${trial.index}: ${describe}` };
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
    logAction('quiz', phase);
    set(phase === 'pre' ? { preSubmitted: true } : { postSubmitted: true });
  },
  setMeniscusError: (e) => set({ meniscusErrorMl: e }),
  markSubmitted: () => set({ submitted: true }),
  restoreDraft(d) {
    const st = get();
    if (d.pluginId !== st.plugin.id) return;
    const solver = getSolver(st.plugin.solverId);
    let visual = st.visual;
    try {
      visual = solver.preview({ ...st.solveContext(), params: d.params });
    } catch {
      /* giữ nguyên */
    }
    set({
      params: d.params,
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
  },
  getDraft() {
    const st = get();
    return {
      pluginId: st.plugin.id,
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
  closeModal: () => set({ modal: null }),
  askConfirm: (c) => set({ confirm: c }),
  closeConfirm: () => set({ confirm: null }),
  toast(kind, text) {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-3), { id, kind, text }] });
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  resetCamera: () => set({ cameraResetNonce: get().cameraResetNonce + 1 }),
  setTutorOpen: (on) => set({ tutorOpen: on }),
  setToolsOpen: (on) => set({ toolsOpen: on })
}));

/** Đang làm dở bài (dùng cho hộp xác nhận trước khi chuyển bài/Reset) */
export function hasUnsavedWork(): boolean {
  const s = useLabStore.getState();
  return !s.submitted && (s.trials.length > 0 || s.completedSteps.length > 0);
}
