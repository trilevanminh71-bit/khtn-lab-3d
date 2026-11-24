/**
 * types/lab.ts — Toàn bộ kiểu dữ liệu chuẩn của KHTN-Lab 3D (cấm dùng `any`).
 *
 * Nguyên tắc: một bài thí nghiệm (plugin) là DỮ LIỆU JSON THUẦN (không chứa hàm) để:
 *   - Giáo viên sửa được bằng CMS / No-Code Wizard ngay trên web;
 *   - Tải về qua gói cập nhật Remote JSON (GitHub/Drive);
 *   - Lưu vào IndexedDB và xuất/nhập file .json.
 * Phần "tính toán" nằm ở engines/* và được nối với plugin qua `solverId`.
 */

/** Môn học */
export type SubjectId = 'physics' | 'chemistry' | 'biology';

/** 5 template cảnh 3D có sẵn (dùng cho cả bài mặc định lẫn bài No-Code) */
export type SceneTemplateId = 'track' | 'circuit' | 'beaker' | 'titration' | 'microscope';

/** Trang bị bảo hộ cá nhân trong phòng thí nghiệm */
export type PpeItem = 'goggles' | 'gloves' | 'labelCheck';

/** Nguồn gốc của bài học */
export type PluginSource = 'builtin' | 'cms' | 'wizard' | 'remote';

/** Giá trị có thể gắn cho trạng thái cảnh 3D (đọc bởi sceneBuilder) */
export type VisualValue = number | string | boolean;
export type SceneVisualState = Record<string, VisualValue>;

/** Tham số học sinh được chỉnh (thanh trượt) */
export interface ParamDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  description?: string;
}

/** Thông số ẩn — sinh ngẫu nhiên theo seed từng học sinh để chống chép số liệu */
export interface HiddenParamDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
}

/** Một cột dữ liệu đo trong bảng số liệu */
export interface MeasurementDef {
  key: string;
  label: string;
  unit: string;
  decimals: number;
}

/** Đại lượng kết quả cuối cùng học sinh phải tính và nhập */
export interface ResultTarget {
  key: string;
  label: string;
  unit: string;
  /** Sai số tương đối cho phép (%) để đạt điểm tối đa phần độ chính xác */
  tolerancePercent: number;
  decimals: number;
  hint: string;
}

/** Kiểu thao tác của một bước thí nghiệm */
export type StepAction = 'click' | 'snap' | 'adjust' | 'measure' | 'observe' | 'record';

/** Một bước trong quy trình thí nghiệm */
export interface StepDef {
  id: string;
  title: string;
  instruction: string;
  action: StepAction;
  /** Thẻ đối tượng 3D (click) hoặc id điểm gắn (snap) hoàn thành bước này */
  trigger?: string;
  /** Bước này chỉ làm được khi đã trang bị đủ bảo hộ */
  requiresPpe?: boolean;
  hint?: string;
}

/** Câu hỏi trắc nghiệm trước/sau thí nghiệm (Pre/Post Quiz) */
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Nếu chọn sai → gợi ý ngộ nhận khoa học tương ứng (misconceptionKB) */
  misconceptionId?: string;
}

/** Nhãn hóa chất (kỹ năng "Kiểm tra nhãn hóa chất") */
export interface ChemicalLabel {
  name: string;
  formula: string;
  concentration: string;
  hazards: string[];
}

/** Định nghĩa một sự cố có thể xảy ra (giả lập an toàn) */
export interface IncidentDef {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'danger';
}

/** Tham số riêng cho template 3D (màu, nhãn, hướng...) */
export type SceneOptions = Record<string, VisualValue>;

/** ĐỊNH NGHĨA MỘT BÀI THÍ NGHIỆM (plugin JSON thuần) */
export interface LabPluginDef {
  id: string;
  version: number;
  subject: SubjectId;
  title: string;
  shortTitle: string;
  sgkRef: string;
  chapter: string;
  grade: number;
  durationMin: number;
  objectives: string[];
  theory: string;
  equation?: string;
  sceneTemplate: SceneTemplateId;
  sceneOptions: SceneOptions;
  solverId: string;
  /** Chỉ dùng khi solverId = "custom-formula": biểu thức tính kết quả mỗi lần đo */
  formula?: CustomFormulaDef;
  params: ParamDef[];
  hidden: HiddenParamDef[];
  measurements: MeasurementDef[];
  minTrials: number;
  result: ResultTarget;
  steps: StepDef[];
  ppeRequired: PpeItem[];
  chemicals: ChemicalLabel[];
  incidents: IncidentDef[];
  preQuiz: QuizQuestion[];
  postQuiz: QuizQuestion[];
  meniscusSkill: boolean;
  conclusionPrompt: string;
  /** Từ khóa bắt buộc nên có trong kết luận (chấm tiêu chí "Kết luận") */
  conclusionKeywords: string[];
  tags: string[];
  source: PluginSource;
}

/** Bài No-Code: mỗi lần đo = biểu thức của tham số + thông số ẩn + nhiễu */
export interface CustomFormulaDef {
  /** Biểu thức cho đại lượng đo được, ví dụ "d / v" */
  measureExpr: string;
  /** Khóa của cột đo nhận giá trị measureExpr */
  measureKey: string;
  /** Biểu thức kết quả đúng (đáp án), ví dụ "v" */
  resultExpr: string;
  /** Biểu thức tính lại kết quả từ trung bình cột đo (biến "m" = trung bình đo) */
  estimateExpr: string;
  /** Độ nhiễu tương đối mỗi lần đo (0.02 = 2%) */
  noise: number;
  /** Biểu thức 0..1 điều khiển hoạt cảnh 3D (ví dụ "v / 2") */
  visualExpr: string;
}

/** Trạng thái trang bị bảo hộ */
export type PpeState = Record<PpeItem, boolean>;

/** Một lần đo của học sinh */
export interface TrialRecord {
  index: number;
  params: Record<string, number>;
  values: Record<string, number>;
  at: number;
}

/** Ngữ cảnh đưa vào solver */
export interface SolveContext {
  plugin: LabPluginDef;
  params: Record<string, number>;
  hidden: Record<string, number>;
  ppe: PpeState;
  /** Bộ sinh số ngẫu nhiên [0,1) có seed — dùng cho nhiễu đo */
  rng: () => number;
}

/** Kết quả một lần đo trả về từ solver */
export interface TrialComputation {
  values: Record<string, number>;
  visual: SceneVisualState;
}

/** Giao diện bộ giải (engine) cho một loại thí nghiệm */
export interface LabSolver {
  id: string;
  /** Mô tả tiếng Việt về mô hình toán */
  description: string;
  /** Mô phỏng một lần đo (có nhiễu) */
  measure(ctx: SolveContext): TrialComputation;
  /** Trạng thái cảnh 3D xem trước khi thay đổi thông số (chưa đo) */
  preview(ctx: SolveContext): SceneVisualState;
  /** Đáp án lý tưởng của đại lượng kết quả */
  trueResult(ctx: SolveContext): number;
  /** Ước lượng kết quả từ dữ liệu đo (để so sánh với cách tính của học sinh) */
  estimateFromTrials(trials: TrialRecord[], ctx: SolveContext): number;
  /** Danh sách id sự cố đang xảy ra với thông số hiện tại */
  incidents(ctx: SolveContext): string[];
}

/** Một tiêu chí chấm điểm */
export interface GradeCriterion {
  id: string;
  label: string;
  max: number;
  earned: number;
  explanation: string;
}

/** Phiếu điểm chi tiết */
export interface GradeReport {
  total: number;
  max: number;
  criteria: GradeCriterion[];
  relativeErrorPercent: number;
  trueValue: number;
  studentValue: number;
  rank: 'Xuất sắc' | 'Tốt' | 'Đạt' | 'Chưa đạt';
}

/** Đầu vào để chấm điểm */
export interface GradeInput {
  plugin: LabPluginDef;
  trials: TrialRecord[];
  studentValue: number;
  trueValue: number;
  completedSteps: string[];
  ppe: PpeState;
  incidentCount: number;
  conclusion: string;
  meniscusErrorMl: number | null;
}

/** Phiên học sinh */
export interface StudentSession {
  studentName: string;
  studentCode: string;
  classCode: string;
  seed: number;
}

/** Bài nộp (lưu IndexedDB, đồng bộ LAN, mã hóa QR) */
export interface SubmissionRecord {
  id?: number;
  uid: string;
  pluginId: string;
  studentName: string;
  studentCode: string;
  classCode: string;
  score: number;
  preScore: number;
  preMax: number;
  postScore: number;
  postMax: number;
  resultValue: number;
  trueValue: number;
  relErrorPercent: number;
  misconceptions: string[];
  likert: number[];
  durationSec: number;
  createdAt: number;
  synced: boolean;
  source: 'local' | 'qr' | 'lan' | 'seed';
}

/** Dữ liệu tối giản mã hóa trong QR (< 180 ký tự) */
export interface QrPayload {
  classCode: string;
  studentCode: string;
  pluginIndex: number;
  score: number;
  preScore: number;
  preMax: number;
  postScore: number;
  postMax: number;
  relErrorPercent: number;
  misconceptionMask: number;
  likert: number[];
  durationSec: number;
  createdAtMin: number;
}

/** Kiểu mù màu hỗ trợ */
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

/** Cài đặt người dùng */
export interface AppSettings {
  lowEndGraphics: boolean;
  autoAdaptiveFps: boolean;
  fontScale: number;
  colorBlindMode: ColorBlindMode;
  highContrast: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  apiUrl: string;
  geminiApiKey: string;
  pinHash: string;
  remoteUpdateUrl: string;
  showOnboarding: boolean;
}

/** Ngộ nhận khoa học */
export interface MisconceptionDef {
  id: string;
  subject: SubjectId;
  chapter: string;
  title: string;
  description: string;
  remedy: string;
}

/** Mục kiến thức gợi mở Socratic offline */
export interface TutorKbEntry {
  id: string;
  pluginIds: string[];
  keywords: string[];
  questions: string[];
  hint: string;
}

/** Tin nhắn trong khung Trợ lý AI */
export interface TutorMessage {
  role: 'student' | 'tutor';
  text: string;
  source: 'ai' | 'offline' | 'cache' | 'guardrail' | 'student';
  at: number;
}

/** Nhật ký thao tác (audit log) */
export interface AuditEntry {
  id?: number;
  at: number;
  type: string;
  detail: string;
}

/** Bản nháp tự lưu mỗi 5 giây */
export interface DraftRecord {
  pluginId: string;
  params: Record<string, number>;
  trials: TrialRecord[];
  completedSteps: string[];
  ppe: PpeState;
  notes: string;
  studentValue: string;
  conclusion: string;
  preAnswers: number[];
  postAnswers: number[];
  startedAt: number;
  savedAt: number;
}

/** Tài nguyên tùy biến (ảnh tiêu bản / mô hình .glb) */
export interface CustomAssetRecord {
  id?: number;
  key: string;
  pluginId: string;
  kind: 'image' | 'glb';
  name: string;
  mime: string;
  blob: Blob;
  createdAt: number;
}

/** Khảo sát Likert sau bài học */
export interface SurveyRecord {
  id?: number;
  pluginId: string;
  studentCode: string;
  ratings: number[];
  comment: string;
  createdAt: number;
}

/** Gói nội dung xuất/nhập (.json) */
export interface LessonBundle {
  format: 'khtn-lab-bundle';
  version: number;
  exportedAt: string;
  plugins: LabPluginDef[];
}

/** Thống kê hiệu năng hiển thị cho chế độ KHKT */
export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryMb: number | null;
  pixelRatio: number;
}
