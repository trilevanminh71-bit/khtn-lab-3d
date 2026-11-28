/**
 * engines/sandboxSim.ts — MÔ PHỎNG THAO TÁC DỤNG CỤ cho chế độ "Tự do thí nghiệm" (hàm thuần, test được).
 * Đầu vào : danh sách dụng cụ trên bàn (mã trong data/equipmentCatalog.ts), trạng thái từng dụng cụ, thời gian mô phỏng.
 * Đầu ra  : trạng thái mới sau thao tác (mở van, bật lửa, đổi vật kính…) hoặc sau dt giây; số đọc trên đồng hồ/bảng hiển thị;
 *           cảnh báo an toàn (tràn đổ, quá nhiệt, quá giới hạn đo, thiếu bảo hộ) ở mức nhắc nhẹ.
 * Ý nghĩa vật lí/hóa học/sinh học (giá trị gần đúng với dụng cụ trong phòng thí nghiệm phổ thông):
 *  - Máng nghiêng: bi lăn không trượt, a = (5/7)·g·sinα; cổng quang điện đo thời gian chắn t = d/v (d = 2 cm).
 *  - Lực kế: lò xo k = 40 N/m, quả nặng 50 g; dao động tắt dần quanh vị trí cân bằng — đợi kim đứng yên mới đọc. Giới hạn đo 5 N.
 *  - Cốc nước + đèn cồn: công suất truyền ~60 W; dT/dt = P/(m·c) − k(T − T₀); sôi ở 100 °C rồi bay hơi (L = 2,26·10⁶ J/kg).
 *  - Burette KMnO₄ 0,02 M: 1 giọt ≈ 0,05 mL; 10 mL mẫu chất khử tương đương 10,00 mL KMnO₄. Thiếu acid → kết tủa nâu MnO₂.
 *  - Hydrogen peroxide 3%: phân hủy bậc 1, nhanh hơn ~100 lần khi có MnO₂; 1 mL tạo tối đa ≈ 10,9 mL O₂.
 *  - Kính hiển vi: độ phóng đại = vật kính × thị kính 10×; vật kính lớn có độ sâu trường ảnh hẹp → chỉ chỉnh ốc vi cấp.
 *  - Đĩa petri: sinh trưởng logistic, tốc độ phụ thuộc nhiệt độ (tối ưu ~37 °C).
 *  - Amylase phân giải tinh bột theo thời gian; tinh bột + iodine → xanh tím.
 * Chế độ này KHÔNG tạo TrialRecord, không ghi vào bảng số liệu và không ảnh hưởng bài nộp chấm điểm.
 */
import type { PpeItem } from '../types/lab';
import { equipmentById } from '../data/equipmentCatalog';

/** Trạng thái một dụng cụ (giá trị số; công tắc = 0/1) */
export type SbState = Record<string, number>;

export interface SandboxWorld {
  /** Thời gian mô phỏng đã trôi (giây) */
  t: number;
  /** Đang chạy thời gian hay dừng */
  running: boolean;
  /** Hệ số tốc độ thời gian (×1 = thời gian thực) */
  speed: number;
  /** Trạng thái theo đúng thứ tự dụng cụ trên bàn */
  states: SbState[];
  /** Thể tích dung dịch đổ ra bàn (mL) và mức nguy hiểm (0 nước, 1 thuốc thử, 2 acid/oxi hóa mạnh) */
  spill: number;
  spillHazard: number;
}

export type SbControl =
  | { kind: 'toggle'; key: string; label: string; on: string; off: string }
  | { kind: 'steps'; key: string; label: string; options: number[]; names?: string[] }
  | { kind: 'range'; key: string; label: string; min: number; max: number; step: number; unit: string }
  | { kind: 'action'; key: string; label: string };

export interface SbReadout {
  label: string;
  value: string;
}

export interface SbAlert {
  level: 'info' | 'warn' | 'danger';
  text: string;
  slot: number;
}

export interface SbActResult {
  world: SandboxWorld;
  ok: boolean;
  message: string;
}

/** Các nấc tốc độ thời gian */
export const SANDBOX_SPEEDS = [1, 5, 20, 60, 600];
export const AMBIENT_C = 25;
const G = 9.8;
/** Chiều dài máng (m), đường kính bi = bề rộng chắn tia (m) */
export const RAIL_LEN = 0.8;
const BALL_D = 0.02;
const SPRING_K = 40;
const WEIGHT_KG = 0.05;
const DROP_ML = 0.05;
const BURETTE_ML = 25;
const BEAKER_ML = 250;
const FLASK_ML = 250;
/** mL KMnO₄ 0,02 M tương đương với 1 mL H₂O₂ 3% (0,88 M; tỉ lệ 2 : 5) */
const KMNO4_PER_H2O2 = 17.6;
/** mL O₂ (25 °C) tạo ra từ 1 mL H₂O₂ 3% */
const O2_PER_ML = 10.9;
const BOTTLES = ['chai-kmno4', 'chai-h2so4', 'chai-h2o2', 'chai-ethanol', 'chai-iodine'];
/** Nguồn hút của ống nhỏ giọt: 1 nước cất, 2 iodine, 3 H₂O₂, 4 KMnO₄ */
const DROPPER_SRC: Record<number, string> = {
  0: 'trống',
  1: 'nước cất',
  2: 'dung dịch iodine',
  3: 'hydrogen peroxide',
  4: 'potassium permanganate'
};
const TUBE_NAMES = ['hồ tinh bột', 'nước cất', 'tinh bột + amylase', 'tinh bột + amylase đã đun sôi'];
/** Tiêu cự rõ nét (vị trí ốc) và độ sâu trường ảnh theo vật kính */
const FOCUS: Record<number, { f: number; w: number }> = {
  4: { f: 40, w: 12 },
  10: { f: 52, w: 6 },
  40: { f: 58, w: 2.5 },
  100: { f: 60, w: 1.2 }
};

const fmt = (v: number, d = 2): string => v.toFixed(d).replace('.', ',');

/** Trạng thái ban đầu của từng loại dụng cụ */
export function initState(id: string): SbState {
  switch (id) {
    case 'mang-nghieng':
      return { angle: 10, s: 0.05, v: 0, rolling: 0, gate: 0.5, tGate: 0 };
    case 'bi-thep':
      return { x: 0, v: 0 };
    case 'cong-quang-dien':
      return { power: 1, flash: 0 };
    case 'dong-ho-so':
      return { mode: 0, t: 0, run: 0, shown: 0 };
    case 'luc-ke':
      return { n: 0, x: 0, vx: 0 };
    case 'pin-von-ke':
      return { k: 0, rev: 0, range: 3, u: 0 };
    case 'coc-thuy-tinh':
      return { vol: 150, T: AMBIENT_C };
    case 'binh-non':
      return { vol: 0, sample: 0, acid: 0, h2o2: 0, cat: 0, kmno4: 0, local: 0, o2: 0, swirl: 0, brown: 0 };
    case 'buret':
      return { valve: 0, left: 0, drops: 0, acc: 0 };
    case 'ong-nghiem':
      return { sel: 1, i1: 0, i2: 0, i3: 0, i4: 0, s1: 1, s2: 0, s3: 1, s4: 1 };
    case 'den-con':
      return { on: 0, fuel: 100 };
    case 'nhiet-ke':
      return { T: AMBIENT_C };
    case 'kinh-hien-vi':
      return { lamp: 0, obj: 4, focus: 20, oil: 0 };
    case 'lam-kinh':
      return { water: 0, cover: 0, bubbles: 0 };
    case 'dia-petri':
      return { temp: 30, lid: 1, cover: 1, contam: 0 };
    case 'ong-nho-giot':
      return { drops: 0, src: 0 };
    default:
      return BOTTLES.includes(id) ? { open: 0, openFor: 0 } : {};
  }
}

export function createWorld(items: string[]): SandboxWorld {
  return { t: 0, running: true, speed: 1, states: items.map(initState), spill: 0, spillHazard: 0 };
}

/** Đồng bộ trạng thái khi danh sách dụng cụ thay đổi (giữ trạng thái dụng cụ còn ở nguyên chỗ) */
export function syncWorld(world: SandboxWorld, prevItems: string[], items: string[]): SandboxWorld {
  return {
    ...world,
    states: items.map((id, i) => (prevItems[i] === id && world.states[i] ? world.states[i] : initState(id)))
  };
}

/** Bảng điều khiển của từng dụng cụ */
export function controlsFor(id: string): SbControl[] {
  switch (id) {
    case 'mang-nghieng':
      return [
        { kind: 'steps', key: 'angle', label: 'Góc nghiêng (°)', options: [5, 10, 15, 20, 30] },
        { kind: 'range', key: 's', label: 'Vị trí đặt bi (kéo bi trong 3D)', min: 0, max: 0.3, step: 0.01, unit: 'm' },
        {
          kind: 'range',
          key: 'gate',
          label: 'Vị trí cổng quang điện trên máng',
          min: 0.2,
          max: 0.75,
          step: 0.01,
          unit: 'm'
        },
        { kind: 'action', key: 'release', label: 'Thả bi' },
        { kind: 'action', key: 'back', label: 'Đưa bi về đầu máng' }
      ];
    case 'bi-thep':
      return [{ kind: 'action', key: 'push', label: 'Đẩy nhẹ cho bi lăn' }];
    case 'cong-quang-dien':
      return [{ kind: 'toggle', key: 'power', label: 'Nguồn cổng', on: 'Đang bật', off: 'Đang tắt' }];
    case 'dong-ho-so':
      return [
        { kind: 'steps', key: 'mode', label: 'Chế độ đo', options: [0, 1], names: ['A ↔ cổng quang', 'Bấm giờ tay'] },
        { kind: 'action', key: 'startStop', label: 'Chạy / Dừng' },
        { kind: 'action', key: 'reset', label: 'Đặt lại 0' }
      ];
    case 'luc-ke':
      return [
        { kind: 'action', key: 'add', label: 'Móc thêm 1 quả nặng' },
        { kind: 'action', key: 'remove', label: 'Tháo 1 quả nặng' }
      ];
    case 'pin-von-ke':
      return [
        { kind: 'toggle', key: 'k', label: 'Khóa K', on: 'Đóng mạch', off: 'Ngắt mạch' },
        { kind: 'toggle', key: 'rev', label: 'Cách mắc', on: 'Đảo cực (sai)', off: 'Đúng cực (+ vào +)' },
        { kind: 'steps', key: 'range', label: 'Thang đo (V)', options: [3, 15] }
      ];
    case 'coc-thuy-tinh':
      return [
        { kind: 'action', key: 'pour', label: 'Rót thêm 50 mL nước' },
        { kind: 'action', key: 'empty', label: 'Đổ bớt 50 mL' }
      ];
    case 'binh-non':
      return [
        { kind: 'action', key: 'sample', label: 'Lấy 10 mL mẫu chất khử' },
        { kind: 'action', key: 'acid', label: 'Thêm 5 mL sulfuric acid' },
        { kind: 'action', key: 'h2o2', label: 'Rót 5 mL hydrogen peroxide' },
        { kind: 'toggle', key: 'cat', label: 'Xúc tác MnO₂', on: 'Đã cho', off: 'Chưa cho' },
        { kind: 'action', key: 'swirl', label: 'Lắc tròn bình' },
        { kind: 'action', key: 'clean', label: 'Đổ bỏ & rửa bình' }
      ];
    case 'buret':
      return [
        { kind: 'action', key: 'fill', label: 'Nạp KMnO₄ tới vạch 0' },
        {
          kind: 'steps',
          key: 'valve',
          label: 'Khóa burette',
          options: [0, 1, 2, 3],
          names: ['Đóng', 'Nhỏ giọt chậm', 'Nhỏ giọt nhanh', 'Mở hết']
        },
        { kind: 'action', key: 'drop', label: 'Nhỏ đúng 1 giọt' }
      ];
    case 'ong-nghiem':
      return [
        {
          kind: 'steps',
          key: 'sel',
          label: 'Chọn ống nhận giọt',
          options: [1, 2, 3, 4],
          names: TUBE_NAMES.map((n, i) => `${i + 1}: ${n}`)
        }
      ];
    case 'den-con':
      return [
        { kind: 'toggle', key: 'on', label: 'Ngọn lửa', on: 'Đang cháy (đậy nắp để tắt)', off: 'Đã tắt (châm lửa)' }
      ];
    case 'kinh-hien-vi':
      return [
        { kind: 'toggle', key: 'lamp', label: 'Đèn chiếu sáng', on: 'Bật', off: 'Tắt' },
        {
          kind: 'steps',
          key: 'obj',
          label: 'Vật kính',
          options: [4, 10, 40, 100],
          names: ['4×', '10×', '40×', '100× (dầu)']
        },
        { kind: 'action', key: 'coarseUp', label: 'Ốc sơ cấp +5' },
        { kind: 'action', key: 'coarseDown', label: 'Ốc sơ cấp −5' },
        { kind: 'action', key: 'fineUp', label: 'Ốc vi cấp +0,5' },
        { kind: 'action', key: 'fineDown', label: 'Ốc vi cấp −0,5' },
        { kind: 'toggle', key: 'oil', label: 'Dầu soi (vật kính 100×)', on: 'Đã nhỏ', off: 'Chưa nhỏ' }
      ];
    case 'lam-kinh':
      return [
        { kind: 'action', key: 'water', label: 'Nhỏ 1 giọt nước lên mẫu' },
        { kind: 'action', key: 'cover', label: 'Đậy lamen nghiêng 45°' },
        { kind: 'action', key: 'reset', label: 'Làm tiêu bản mới' }
      ];
    case 'dia-petri':
      return [
        { kind: 'steps', key: 'temp', label: 'Nhiệt độ tủ ấm (°C)', options: [20, 30, 37, 45] },
        { kind: 'toggle', key: 'lid', label: 'Nắp đĩa', on: 'Đang đậy', off: 'Đang mở' }
      ];
    case 'ong-nho-giot':
      return [
        { kind: 'action', key: 'suck', label: 'Bóp hút dung dịch' },
        { kind: 'action', key: 'drip', label: 'Nhỏ 1 giọt' }
      ];
    default:
      return BOTTLES.includes(id)
        ? [{ kind: 'toggle', key: 'open', label: 'Nắp chai', on: 'Đang mở', off: 'Đang đậy' }]
        : [];
  }
}

/* ------------------------------- Tiện ích ------------------------------- */

function cloneWorld(w: SandboxWorld): SandboxWorld {
  return { ...w, states: w.states.map((s) => ({ ...s })) };
}
const idx = (items: string[], id: string): number => items.indexOf(id);
function bottleOpen(items: string[], w: SandboxWorld, id: string): boolean {
  const i = idx(items, id);
  return i >= 0 && (w.states[i]?.open ?? 0) === 1;
}
function missingPpeFor(id: string, ppe: Record<PpeItem, boolean>): string[] {
  const name: Record<PpeItem, string> = { goggles: 'kính bảo hộ', gloves: 'găng tay', labelCheck: 'đọc nhãn' };
  return (equipmentById(id)?.ppe ?? []).filter((k) => !ppe[k]).map((k) => name[k]);
}
function ppeNote(id: string, ppe: Record<PpeItem, boolean>): string {
  const m = missingPpeFor(id, ppe);
  return m.length ? ` Nhắc nhẹ: nên có ${m.join(', ')}.` : '';
}
function addSpill(w: SandboxWorld, ml: number, hazard: number): void {
  w.spill += ml;
  w.spillHazard = Math.max(w.spillHazard, hazard);
}
/** Lượng KMnO₄ (mL) mà chất khử trong bình nón còn tiêu thụ được */
export function flaskReducerMl(s: SbState): number {
  return (s.sample ?? 0) + (s.h2o2 ?? 0) * KMNO4_PER_H2O2;
}
/** Phần KMnO₄ dư (mL) — dương nghĩa là đã quá điểm tương đương, dung dịch giữ màu hồng/tím */
export function flaskExcessMl(s: SbState): number {
  return Math.max(0, (s.kmno4 ?? 0) - flaskReducerMl(s));
}
/** Độ nét ảnh kính hiển vi (0..1) */
export function microscopeSharpness(s: SbState): number {
  const f = FOCUS[s.obj] ?? FOCUS[4];
  const base = Math.exp(-(((s.focus - f.f) / f.w) ** 2));
  return s.obj === 100 && !s.oil ? base * 0.35 : base;
}
/** Thể tích buret đã chảy ra (mL) = số đọc burette khi nạp tới vạch 0 */
export function buretteReading(s: SbState): number {
  return s.left > 0 || s.drops > 0 ? BURETTE_ML - s.left : 0;
}

/** Thêm một lượng KMnO₄ (mL) từ burette vào bình nón (hoặc ra bàn nếu không có bình) */
function deliverKmno4(w: SandboxWorld, items: string[], ml: number): void {
  const fi = idx(items, 'binh-non');
  if (fi < 0) {
    addSpill(w, ml, 2);
    return;
  }
  const f = w.states[fi];
  f.kmno4 += ml;
  f.vol += ml;
  f.local = Math.min(3, f.local + (ml / DROP_ML) * 0.6);
  if (!f.acid && f.kmno4 > 0) f.brown = 1;
  if (f.vol > FLASK_ML) {
    addSpill(w, f.vol - FLASK_ML, 2);
    f.vol = FLASK_ML;
  }
}

/* ------------------------------- Thao tác ------------------------------- */

/** Đặt giá trị cho công tắc / nấc / thanh trượt của dụng cụ ở chỗ `slot` */
export function setControl(
  world: SandboxWorld,
  items: string[],
  slot: number,
  key: string,
  value: number,
  ppe: Record<PpeItem, boolean>
): SbActResult {
  const id = items[slot];
  const ctl = controlsFor(id).find((c) => c.key === key && c.kind !== 'action');
  if (!id || !ctl || !world.states[slot]) return { world, ok: false, message: 'Không có điều khiển này.' };
  const w = cloneWorld(world);
  const s = w.states[slot];
  let v = value;
  if (ctl.kind === 'range') v = Math.min(ctl.max, Math.max(ctl.min, Math.round(value / ctl.step) * ctl.step));
  if (ctl.kind === 'steps' && !ctl.options.includes(v)) return { world, ok: false, message: 'Nấc không hợp lệ.' };
  if (ctl.kind === 'toggle') v = v ? 1 : 0;
  let msg = '';
  switch (`${id}:${key}`) {
    case 'mang-nghieng:s':
      if (s.rolling) return { world, ok: false, message: 'Bi đang lăn — đợi bi dừng hoặc bấm "Đưa bi về đầu máng".' };
      s.v = 0;
      break;
    case 'mang-nghieng:angle':
      if (s.rolling) return { world, ok: false, message: 'Không chỉnh góc khi bi đang lăn.' };
      msg = `Máng nghiêng ${v}°: gia tốc lí thuyết a = 5/7·g·sinα ≈ ${fmt((5 / 7) * G * Math.sin((v * Math.PI) / 180))} m/s².`;
      break;
    case 'den-con:on':
      if (v && s.fuel <= 0)
        return { world, ok: false, message: 'Đèn hết cồn — cần thêm cồn (khi đèn đã tắt và nguội).' };
      if (v && bottleOpen(items, w, 'chai-ethanol'))
        msg = 'Nguy hiểm: chai cồn đang mở gần ngọn lửa — đậy nắp chai cồn trước!';
      else msg = v ? 'Đã châm đèn cồn bằng que diêm.' : 'Đã đậy nắp để tắt đèn (không thổi).';
      if (v) msg += ppeNote(id, ppe);
      break;
    case 'kinh-hien-vi:obj':
      msg = `Vật kính ${v}× → độ phóng đại ${v * 10}×.`;
      if (v === 100 && !s.oil) msg += ' Vật kính 100× cần nhỏ dầu soi lên lamen.';
      if (v >= 40) msg += ' Chỉ dùng ốc vi cấp để lấy nét.';
      break;
    case 'dia-petri:lid':
      if (!v) msg = 'Đang mở nắp đĩa: mở hé, quay mặt đi, đậy lại ngay để tránh nhiễm khuẩn.' + ppeNote(id, ppe);
      break;
    case 'pin-von-ke:rev':
      if (v && s.k) msg = 'Mắc ngược cực: kim lệch về bên trái vạch 0 — đổi lại dây.';
      break;
    case 'buret:valve':
      if (v > 0 && s.left <= 0) msg = 'Burette chưa có dung dịch — bấm "Nạp KMnO₄ tới vạch 0".';
      else if (v > 0 && idx(items, 'binh-non') < 0) msg = 'Chưa có bình hứng bên dưới — dung dịch sẽ chảy ra bàn!';
      else if (v === 3) msg = 'Mở hết khóa chỉ dùng khi tráng/xả burette; khi chuẩn độ nên nhỏ từng giọt.';
      break;
    case 'binh-non:cat':
      if (v && s.h2o2 > 0) msg = 'Cho MnO₂ vào: bọt khí O₂ thoát ra mạnh.';
      break;
    default:
      if (BOTTLES.includes(id) && key === 'open') {
        msg = v
          ? `Đã mở nắp ${equipmentById(id)?.name ?? ''} — đặt nắp ngửa trên bàn.${ppeNote(id, ppe)}`
          : 'Đã đậy nắp chai.';
        if (v && id === 'chai-ethanol' && (w.states[idx(items, 'den-con')]?.on ?? 0) === 1)
          msg = 'Nguy hiểm: mở chai cồn khi đèn cồn đang cháy — hơi cồn dễ bắt lửa!';
        if (!v) s.openFor = 0;
      }
  }
  s[key] = v;
  return { world: w, ok: true, message: msg };
}

/** Thực hiện một thao tác (nút bấm) trên dụng cụ ở chỗ `slot` */
export function doAction(
  world: SandboxWorld,
  items: string[],
  slot: number,
  key: string,
  ppe: Record<PpeItem, boolean>
): SbActResult {
  const id = items[slot];
  if (!id || !world.states[slot]) return { world, ok: false, message: 'Chưa có dụng cụ ở chỗ này.' };
  const w = cloneWorld(world);
  const s = w.states[slot];
  const ok = (message: string): SbActResult => ({ world: w, ok: true, message });
  const no = (message: string): SbActResult => ({ world, ok: false, message });
  switch (`${id}:${key}`) {
    case 'mang-nghieng:release':
      if (idx(items, 'bi-thep') < 0) return no('Cần đặt "Viên bi thép" lên bàn để thả trên máng.');
      if (s.rolling) return no('Bi đang lăn.');
      if (s.s >= RAIL_LEN - 0.01) return no('Bi đang ở cuối máng — bấm "Đưa bi về đầu máng".');
      s.rolling = 1;
      s.v = 0;
      return ok('Đã thả bi (không đẩy) — bi lăn nhanh dần xuống máng.');
    case 'mang-nghieng:back':
      s.rolling = 0;
      s.v = 0;
      s.s = 0.05;
      return ok('Đã đưa bi về đầu máng.');
    case 'bi-thep:push':
      s.v = 0.5;
      return ok('Bi lăn chậm dần do lực cản lăn rồi dừng.');
    case 'dong-ho-so:startStop':
      if (s.mode === 0)
        return no('Đang ở chế độ A ↔ cổng quang: đồng hồ tự đếm khi bi chắn tia. Đổi sang "Bấm giờ tay" để bấm.');
      s.run = s.run ? 0 : 1;
      return ok(s.run ? 'Đồng hồ bắt đầu đếm.' : `Dừng: ${fmt(s.t, 3)} s (phản xạ tay có sai số khoảng 0,1–0,2 s).`);
    case 'dong-ho-so:reset':
      s.t = 0;
      s.run = 0;
      s.shown = 0;
      return ok('Đồng hồ về 0,000.');
    case 'luc-ke:add': {
      if (idx(items, 'qua-nang') < 0) return no('Cần đặt "Bộ quả nặng 50 g" lên bàn.');
      if (s.n >= 12) return no('Đã hết quả nặng trong bộ.');
      s.n += 1;
      const f = s.n * WEIGHT_KG * G;
      return ok(
        f > 5
          ? `Quá giới hạn đo 5 N (${fmt(f)} N) — tháo bớt để không hỏng lò xo!`
          : `Móc ${s.n} quả nặng: lò xo dao động rồi đứng yên ở ≈ ${fmt(f)} N.`
      );
    }
    case 'luc-ke:remove':
      if (s.n <= 0) return no('Lực kế chưa móc quả nặng nào.');
      s.n -= 1;
      return ok(`Còn ${s.n} quả nặng.`);
    case 'coc-thuy-tinh:pour':
      s.vol += 50;
      if (s.vol > BEAKER_ML) {
        addSpill(w, s.vol - BEAKER_ML, 0);
        s.vol = BEAKER_ML;
        return ok('Tràn cốc! Nước đổ ra bàn — chỉ rót tới khoảng 2/3 cốc.');
      }
      s.T = (s.T * (s.vol - 50) + AMBIENT_C * 50) / s.vol;
      return ok(`Cốc có ${s.vol} mL nước.`);
    case 'coc-thuy-tinh:empty':
      if (s.vol <= 0) return no('Cốc đã rỗng.');
      if (s.T > 60) return no('Nước còn nóng — tắt lửa và đợi nguội bớt rồi mới đổ.');
      s.vol = Math.max(0, s.vol - 50);
      return ok(`Còn ${Math.round(s.vol)} mL.`);
    case 'binh-non:sample':
      s.sample += 10;
      s.vol += 10;
      return ok('Đã lấy 10,00 mL mẫu chất khử bằng pipette (tương đương 10,00 mL KMnO₄ 0,02 M).');
    case 'binh-non:acid':
      if (idx(items, 'chai-h2so4') < 0) return no('Cần đặt chai sulfuric acid lên bàn.');
      if (!bottleOpen(items, w, 'chai-h2so4')) return no('Mở nắp chai sulfuric acid trước.');
      s.acid += 5;
      s.vol += 5;
      return ok(`Đã thêm 5 mL sulfuric acid (môi trường acid để MnO₄⁻ → Mn²⁺ không màu).${ppeNote('chai-h2so4', ppe)}`);
    case 'binh-non:h2o2':
      if (idx(items, 'chai-h2o2') < 0) return no('Cần đặt chai hydrogen peroxide lên bàn.');
      if (!bottleOpen(items, w, 'chai-h2o2')) return no('Mở nắp chai hydrogen peroxide trước.');
      s.h2o2 += 5;
      s.vol += 5;
      return ok(
        `Đã rót 5 mL hydrogen peroxide 3%.${s.cat ? ' Có MnO₂ nên sủi bọt mạnh.' : ' Chưa có xúc tác: phân hủy rất chậm.'}${ppeNote('chai-h2o2', ppe)}`
      );
    case 'binh-non:swirl':
      if (s.vol <= 0) return no('Bình đang rỗng.');
      s.swirl = 2;
      return ok('Lắc tròn cổ tay để dung dịch trộn đều, không bắn ra ngoài.');
    case 'binh-non:clean':
      Object.assign(s, initState('binh-non'));
      return ok('Đã đổ bỏ vào bình thải và tráng bình bằng nước cất.');
    case 'buret:fill':
      if (idx(items, 'chai-kmno4') < 0) return no('Cần đặt chai potassium permanganate lên bàn.');
      if (!bottleOpen(items, w, 'chai-kmno4')) return no('Mở nắp chai potassium permanganate trước.');
      if (s.valve > 0) return no('Khóa burette trước khi nạp dung dịch.');
      s.left = BURETTE_ML;
      s.drops = 0;
      s.acc = 0;
      return ok(
        `Đã nạp KMnO₄ và chỉnh tới vạch 0,00 mL (mắt ngang mép trên mặt khum vì dung dịch màu đậm).${ppeNote('buret', ppe)}`
      );
    case 'buret:drop':
      if (s.left < DROP_ML) return no('Burette hết dung dịch.');
      if (s.valve > 0) return no('Đang mở khóa — chuyển về "Đóng" rồi mới nhỏ từng giọt.');
      s.left -= DROP_ML;
      s.drops += 1;
      deliverKmno4(w, items, DROP_ML);
      return ok(
        idx(items, 'binh-non') < 0
          ? 'Giọt rơi ra bàn — đặt bình nón bên dưới!'
          : 'Một giọt KMnO₄ rơi vào bình — lắc tròn và quan sát màu.'
      );
    case 'kinh-hien-vi:coarseUp':
    case 'kinh-hien-vi:coarseDown': {
      if (s.obj >= 40) return no(`Ở vật kính ${s.obj}× không dùng ốc sơ cấp — dễ đâm vỡ lam kính. Dùng ốc vi cấp.`);
      s.focus = Math.min(100, Math.max(0, s.focus + (key === 'coarseUp' ? 5 : -5)));
      return ok(`Ốc sơ cấp: vị trí ${fmt(s.focus, 1)}.`);
    }
    case 'kinh-hien-vi:fineUp':
    case 'kinh-hien-vi:fineDown':
      s.focus = Math.min(100, Math.max(0, s.focus + (key === 'fineUp' ? 0.5 : -0.5)));
      return ok(`Ốc vi cấp: vị trí ${fmt(s.focus, 1)}.`);
    case 'lam-kinh:water':
      if (s.cover) return no('Đã đậy lamen — làm tiêu bản mới nếu muốn nhỏ lại.');
      s.water += 1;
      return ok(s.water > 2 ? 'Nhiều nước quá sẽ tràn ra mép lamen — 1 giọt là đủ.' : 'Đã nhỏ 1 giọt nước lên mẫu.');
    case 'lam-kinh:cover':
      if (s.cover) return no('Lamen đã đậy.');
      s.cover = 1;
      s.bubbles = s.water ? 0 : 1;
      return ok(
        s.water
          ? 'Đậy lamen nghiêng 45° rồi hạ từ từ — không có bọt khí.'
          : 'Đậy khi chưa nhỏ nước: mẫu khô và có nhiều bọt khí.'
      );
    case 'lam-kinh:reset':
      Object.assign(s, initState('lam-kinh'));
      return ok('Đã làm tiêu bản mới.');
    case 'ong-nho-giot:suck': {
      const src = bottleOpen(items, w, 'chai-iodine')
        ? 2
        : bottleOpen(items, w, 'chai-h2o2')
          ? 3
          : bottleOpen(items, w, 'chai-kmno4')
            ? 4
            : 1;
      s.src = src;
      s.drops = 20;
      return ok(
        `Đã hút khoảng 1 mL ${DROPPER_SRC[src]}${src === 1 ? ' (mở nắp chai iodine nếu muốn hút iodine)' : ''}.`
      );
    }
    case 'ong-nho-giot:drip': {
      if (s.drops <= 0) return no('Ống nhỏ giọt đang rỗng — bóp hút dung dịch trước.');
      s.drops -= 1;
      const ti = idx(items, 'ong-nghiem');
      const li = idx(items, 'lam-kinh');
      if (ti >= 0) {
        const t = w.states[ti];
        if (s.src === 2) t[`i${t.sel}`] += 1;
        const starch = t[`s${t.sel}`] ?? 0;
        if (s.src !== 2) return ok(`Nhỏ 1 giọt ${DROPPER_SRC[s.src]} vào ống ${t.sel}.`);
        return ok(
          starch > 0.3
            ? `Ống ${t.sel} (${TUBE_NAMES[t.sel - 1]}) chuyển xanh tím: còn tinh bột.`
            : `Ống ${t.sel} (${TUBE_NAMES[t.sel - 1]}) giữ màu vàng nâu của iodine: không còn tinh bột.`
        );
      }
      if (li >= 0 && s.src === 1) return doAction(w, items, li, 'water', ppe);
      addSpill(w, DROP_ML, s.src >= 2 ? 1 : 0);
      return ok('Không có ống nghiệm/lam kính để hứng — giọt rơi ra bàn.');
    }
    default:
      return no('Thao tác chưa hỗ trợ.');
  }
}

/** Lau khô dung dịch đổ ra bàn */
export function wipeSpill(world: SandboxWorld): SandboxWorld {
  return { ...world, spill: 0, spillHazard: 0 };
}

/* ---------------------------- Tiến theo thời gian ---------------------------- */

/**
 * Tiến mô phỏng thêm dt giây (đã nhân tốc độ). Các quá trình nhanh (bi lăn, lò xo, kim đồng hồ) tích phân bước nhỏ;
 * khi bước quá lớn (tua nhanh) thì đặt thẳng về trạng thái cân bằng để luôn ổn định.
 */
export function advanceWorld(world: SandboxWorld, items: string[], dt: number): SandboxWorld {
  if (!(dt > 0)) return world;
  const w = cloneWorld(world);
  w.t += dt;
  const at = (id: string): SbState | undefined => {
    const i = idx(items, id);
    return i >= 0 ? w.states[i] : undefined;
  };
  const lamp = at('den-con');
  const flameOn = !!lamp && lamp.on === 1 && lamp.fuel > 0;
  const gate = at('cong-quang-dien');
  const clock = at('dong-ho-so');

  items.forEach((id, i) => {
    const s = w.states[i];
    if (!s) return;
    switch (id) {
      case 'mang-nghieng': {
        if (!s.rolling) break;
        const a = (5 / 7) * G * Math.sin((s.angle * Math.PI) / 180);
        const s0 = s.s;
        const v0 = s.v;
        let s1 = s0 + v0 * dt + 0.5 * a * dt * dt;
        let v1 = v0 + a * dt;
        if (s1 >= RAIL_LEN) {
          s1 = RAIL_LEN;
          v1 = 0;
          s.rolling = 0;
        }
        // Bi chắn tia cổng quang: thời gian chắn = d / v tại cổng
        if (gate && s0 < s.gate && s1 >= s.gate) {
          const vg = Math.sqrt(v0 * v0 + 2 * a * (s.gate - s0));
          s.tGate = vg > 0 ? BALL_D / vg : 0;
          if (gate.power) {
            gate.flash = 1;
            if (clock && clock.mode === 0) {
              clock.t = s.tGate;
              clock.shown = 1;
            }
          }
        }
        s.s = s1;
        s.v = v1;
        break;
      }
      case 'bi-thep': {
        if (s.v <= 0) break;
        const dec = 0.02 * G;
        const tStop = s.v / dec;
        const h = Math.min(dt, tStop);
        s.x += s.v * h - 0.5 * dec * h * h;
        s.v = Math.max(0, s.v - dec * h);
        if (s.x > 0.3) {
          s.x = 0.3;
          s.v = 0;
        }
        break;
      }
      case 'cong-quang-dien':
        s.flash = Math.max(0, s.flash - dt * 2);
        break;
      case 'dong-ho-so':
        if (s.mode === 1 && s.run) s.t = Math.min(99.999, s.t + dt);
        break;
      case 'luc-ke': {
        const m = s.n * WEIGHT_KG + 0.01;
        const xeq = (s.n * WEIGHT_KG * G) / SPRING_K;
        if (dt > 1.5) {
          s.x = xeq;
          s.vx = 0;
          break;
        }
        const om = Math.sqrt(SPRING_K / m);
        const steps = Math.min(600, Math.ceil(dt / 0.002));
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          const ax = -(SPRING_K / m) * (s.x - xeq) - 2 * 0.12 * om * s.vx;
          s.vx += ax * h;
          s.x += s.vx * h;
        }
        break;
      }
      case 'pin-von-ke': {
        const target = s.k ? (s.rev ? -1.5 : 1.5) : 0;
        s.u += (target - s.u) * (1 - Math.exp(-dt / 0.25));
        break;
      }
      case 'coc-thuy-tinh': {
        const P = flameOn ? 60 : 0;
        const m = Math.max(1, s.vol) / 1000;
        if (s.vol > 1) {
          s.T += (P / (m * 4186) - 0.0004 * (s.T - AMBIENT_C)) * dt;
          if (s.T >= 100) {
            const excess = (s.T - 100) * m * 4186;
            s.T = 100;
            s.vol = Math.max(0, s.vol - (excess / 2.26e6) * 1000);
          }
        } else {
          // Cốc cạn mà vẫn đun → thủy tinh nóng lên nhanh
          s.vol = 0;
          s.T += (flameOn ? 2 : -0.05 * (s.T - AMBIENT_C)) * dt;
        }
        break;
      }
      case 'nhiet-ke': {
        const target = at('coc-thuy-tinh')?.T ?? AMBIENT_C;
        s.T += (target - s.T) * (1 - Math.exp(-dt / 6));
        break;
      }
      case 'den-con':
        if (flameOn) s.fuel = Math.max(0, s.fuel - 0.02 * dt);
        if (s.fuel <= 0) s.on = 0;
        break;
      case 'buret': {
        if (s.valve <= 0 || s.left <= 0) break;
        const rate = s.valve === 1 ? 1 : s.valve === 2 ? 3 : 10; // giọt/giây
        s.acc += rate * dt;
        const n = Math.floor(s.acc);
        if (n <= 0) break;
        s.acc -= n;
        const ml = Math.min(s.left, n * DROP_ML);
        s.left -= ml;
        s.drops += Math.round(ml / DROP_ML);
        deliverKmno4(w, items, ml);
        break;
      }
      case 'binh-non': {
        // Phân hủy H₂O₂ bậc 1: k ≈ 2·10⁻⁵ s⁻¹ (không xúc tác), 0,02 s⁻¹ với MnO₂
        if (s.h2o2 > 0) {
          const k = s.cat ? 0.02 : 2e-5;
          const d = s.h2o2 * (1 - Math.exp(-k * dt));
          s.h2o2 -= d;
          s.o2 += d * O2_PER_ML;
        }
        s.local = Math.max(0, s.local - dt * (s.swirl > 0 ? 1.5 : 0.25));
        s.swirl = Math.max(0, s.swirl - dt);
        break;
      }
      case 'ong-nghiem':
        // Amylase phân giải tinh bột ở ống 3 (t½ ≈ 3,5 phút ở nhiệt độ phòng); ống 4 enzyme đã biến tính
        s.s3 = s.s3 * Math.exp(-dt / 300);
        break;
      case 'dia-petri': {
        const r = ({ 20: 0.15, 30: 0.35, 37: 0.5, 45: 0.05 } as Record<number, number>)[s.temp] ?? 0.3;
        const k = r / 3600;
        s.cover = 100 / (1 + ((100 - s.cover) / Math.max(0.01, s.cover)) * Math.exp(-k * dt));
        if (!s.lid) s.contam = Math.min(100, s.contam + dt * 0.05);
        break;
      }
      default:
        if (BOTTLES.includes(id) && s.open) s.openFor += dt;
    }
  });
  return w;
}

/* ---------------------------- Số đọc & cảnh báo ---------------------------- */

/** Số đọc hiển thị cho dụng cụ ở chỗ `slot` */
export function readoutsFor(world: SandboxWorld, items: string[], slot: number): SbReadout[] {
  const id = items[slot];
  const s = world.states[slot];
  if (!id || !s) return [];
  switch (id) {
    case 'mang-nghieng':
      return [
        { label: 'Bi cách đầu máng', value: `${fmt(s.s * 100, 1)} cm` },
        { label: 'Tốc độ bi', value: `${fmt(s.v)} m/s` },
        { label: 'Thời gian chắn cổng', value: s.tGate ? `${fmt(s.tGate, 3)} s` : '—' },
        { label: 'Tốc độ tại cổng (d/t)', value: s.tGate ? `${fmt(BALL_D / s.tGate)} m/s` : '—' }
      ];
    case 'bi-thep':
      return [{ label: 'Tốc độ', value: `${fmt(s.v)} m/s` }];
    case 'cong-quang-dien':
      return [{ label: 'Tia hồng ngoại', value: !s.power ? 'Tắt nguồn' : s.flash > 0.5 ? 'Bị chắn' : 'Thông' }];
    case 'dong-ho-so':
      return [{ label: 'Màn hình', value: `${fmt(s.t, 3)} s` }];
    case 'luc-ke':
      return [
        { label: 'Số quả nặng', value: `${s.n} × 50 g` },
        { label: 'Số chỉ lực kế', value: `${fmt(Math.max(0, s.x * SPRING_K), 2)} N` },
        { label: 'Độ giãn lò xo', value: `${fmt(s.x * 100, 1)} cm` }
      ];
    case 'pin-von-ke': {
      const res = s.range === 3 ? 0.05 : 0.5;
      const shown = Math.max(-0.2 * s.range, Math.round(s.u / res) * res);
      return [{ label: `Vôn kế (thang ${s.range} V)`, value: `${fmt(shown, s.range === 3 ? 2 : 1)} V` }];
    }
    case 'coc-thuy-tinh':
      return [
        { label: 'Thể tích', value: `${Math.round(s.vol)} mL` },
        { label: 'Nhiệt độ thật', value: `${fmt(s.T, 1)} °C (đọc bằng nhiệt kế)` }
      ];
    case 'nhiet-ke':
      return [{ label: 'Nhiệt kế', value: `${fmt(s.T, 1)} °C` }];
    case 'den-con':
      return [{ label: 'Cồn trong đèn', value: `${fmt(s.fuel, 0)}%` }];
    case 'buret':
      return [
        { label: 'Số đọc burette', value: `${fmt(buretteReading(s))} mL` },
        { label: 'Đã nhỏ', value: `${s.drops} giọt` }
      ];
    case 'binh-non': {
      const ex = flaskExcessMl(s);
      const color = s.brown
        ? 'nâu đục (kết tủa MnO₂)'
        : ex > 0.5
          ? 'tím hồng (dư KMnO₄)'
          : ex > 0
            ? 'hồng nhạt bền — điểm tương đương'
            : s.local > 0.3
              ? 'hồng thoáng qua rồi mất'
              : 'không màu';
      return [
        { label: 'Thể tích', value: `${fmt(s.vol, 1)} mL` },
        { label: 'Màu dung dịch', value: s.vol > 0 ? color : '—' },
        { label: 'Khí O₂ thoát ra', value: `${fmt(s.o2, 1)} mL` }
      ];
    }
    case 'ong-nghiem':
      return [1, 2, 3, 4].map((k) => ({
        label: `Ống ${k}: ${TUBE_NAMES[k - 1]}`,
        value: s[`i${k}`] ? (s[`s${k}`] > 0.3 ? 'xanh tím' : 'vàng nâu') : 'chưa nhỏ iodine'
      }));
    case 'kinh-hien-vi':
      return [
        { label: 'Độ phóng đại', value: `${s.obj * 10}×` },
        { label: 'Độ nét', value: `${Math.round(microscopeSharpness(s) * 100)}%` }
      ];
    case 'lam-kinh':
      return [
        {
          label: 'Tiêu bản',
          value: s.cover
            ? s.bubbles
              ? 'đã đậy, có bọt khí'
              : 'đã đậy, đạt'
            : s.water
              ? 'đã nhỏ nước, chưa đậy'
              : 'mẫu khô'
        }
      ];
    case 'dia-petri': {
      const h = Math.floor(world.t / 3600);
      const m = Math.floor((world.t % 3600) / 60);
      return [
        { label: 'Thời gian nuôi', value: `${h} giờ ${m} phút` },
        { label: 'Khuẩn lạc phủ', value: `${fmt(s.cover, 1)}% mặt thạch` }
      ];
    }
    case 'ong-nho-giot':
      return [{ label: 'Trong ống', value: s.drops > 0 ? `${s.drops} giọt ${DROPPER_SRC[s.src]}` : 'rỗng' }];
    default:
      return BOTTLES.includes(id) ? [{ label: 'Nắp', value: s.open ? 'đang mở' : 'đang đậy' }] : [];
  }
}

/** Cảnh báo an toàn / thao tác (nhắc nhẹ — không chặn, không ảnh hưởng chấm điểm) */
export function sandboxAlerts(world: SandboxWorld, items: string[], ppe: Record<PpeItem, boolean>): SbAlert[] {
  const out: SbAlert[] = [];
  if (world.spill > 0) {
    const what = world.spillHazard >= 2 ? 'hóa chất ăn mòn/oxi hóa' : world.spillHazard === 1 ? 'thuốc thử' : 'nước';
    out.push({
      level: world.spillHazard >= 2 ? 'danger' : 'warn',
      text: `Có ${fmt(world.spill, 1)} mL ${what} đổ ra bàn — bấm "Lau bàn" trước khi làm tiếp.`,
      slot: -1
    });
  }
  const lampOn = (world.states[idx(items, 'den-con')]?.on ?? 0) === 1;
  items.forEach((id, i) => {
    const s = world.states[i];
    if (!s) return;
    const add = (level: SbAlert['level'], text: string): void => {
      out.push({ level, text, slot: i });
    };
    switch (id) {
      case 'coc-thuy-tinh':
        if (s.vol <= 1 && s.T > 60)
          add('danger', 'Cốc đã cạn mà vẫn đun — thủy tinh quá nóng có thể nứt. Tắt đèn cồn!');
        else if (s.T >= 99.5 && s.vol < 40)
          add('warn', 'Nước sôi và sắp cạn — tắt lửa hoặc rót thêm nước (khi đã tắt lửa).');
        else if (s.T >= 90) add('info', 'Nước gần sôi — cẩn thận bỏng hơi nước, dùng kẹp khi cầm cốc.');
        break;
      case 'den-con':
        if (s.on && s.fuel < 10) add('info', 'Đèn sắp hết cồn.');
        if (s.on && !ppe.goggles) add('warn', 'Đèn cồn đang cháy mà chưa đeo kính bảo hộ.');
        break;
      case 'buret':
        if (s.valve > 0 && s.left <= 0) add('info', 'Burette đã hết dung dịch — khóa van lại.');
        if (s.valve >= 2) {
          const f = world.states[idx(items, 'binh-non')];
          if (f && f.sample > 0 && flaskReducerMl(f) - f.kmno4 < 1.5)
            add('warn', 'Sắp tới điểm tương đương — chuyển sang nhỏ từng giọt và lắc đều.');
        }
        break;
      case 'binh-non':
        if (s.brown) add('warn', 'Kết tủa nâu MnO₂: chưa acid hóa bằng sulfuric acid trước khi chuẩn độ.');
        if (s.vol > FLASK_ML * 0.8) add('warn', 'Bình sắp đầy — dễ tràn khi lắc.');
        if (s.sample > 0 && flaskExcessMl(s) > 1) add('info', 'Đã quá điểm tương đương (dung dịch tím rõ).');
        if (s.h2o2 > 0 && s.cat) add('info', 'Khí O₂ đang thoát ra — để miệng bình thoáng, không bịt kín.');
        break;
      case 'luc-ke':
        if (s.n * WEIGHT_KG * G > 5) add('danger', 'Lực kế quá giới hạn đo 5 N — tháo bớt quả nặng.');
        break;
      case 'pin-von-ke':
        if (s.k && s.rev) add('warn', 'Vôn kế mắc ngược cực — kim lệch về phía dưới vạch 0.');
        break;
      case 'kinh-hien-vi':
        if (s.obj === 100 && !s.oil) add('info', 'Vật kính 100× cần dầu soi để ảnh rõ.');
        if (!s.lamp) add('info', 'Đèn kính hiển vi đang tắt — bật đèn để quan sát.');
        break;
      case 'dia-petri':
        if (!s.lid) add('warn', 'Đĩa petri đang mở nắp — dễ nhiễm khuẩn, không đưa gần mặt.');
        if (s.temp >= 45) add('info', '45 °C cao hơn nhiệt độ thích hợp của đa số vi khuẩn — sinh trưởng chậm.');
        break;
      default:
        if (BOTTLES.includes(id) && s.open) {
          if (id === 'chai-ethanol' && lampOn) add('danger', 'Chai cồn đang mở gần ngọn lửa — đậy nắp ngay!');
          const miss = missingPpeFor(id, ppe);
          if (miss.length) add('warn', `Đang mở ${equipmentById(id)?.name ?? id} khi chưa có ${miss.join(', ')}.`);
          if (s.openFor > 120) add('info', `${equipmentById(id)?.name ?? id} mở đã lâu — đậy nắp khi không dùng.`);
        }
    }
  });
  return out;
}
