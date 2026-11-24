/**
 * utils/columnLabels.ts — Tiêu đề cột tiếng Việt cho bảng số liệu (dùng chung Vật lí, Hóa học, Sinh học).
 * Đầu vào: định nghĩa tham số (key, label). Đầu ra: tên cột ngắn gọn. Chỉ đổi TÊN HIỂN THỊ, không đổi khóa dữ liệu hay giá trị.
 * Thứ tự: (1) bảng ánh xạ tiếng Việt → (2) kí hiệu khoa học ngắn (h, d, F, R0, pH…) giữ nguyên
 *   → (3) nhãn tiếng Việt của tham số, bỏ phần chú thích trong ngoặc → (4) chính khóa dữ liệu.
 */
const COLUMN_LABELS: Record<string, string> = {
  // Sinh học
  specimen: 'Mẫu vật',
  objective: 'Vật kính',
  eyepiece: 'Thị kính',
  focus: 'Ốc vi cấp',
  oil: 'Dầu soi',
  field: 'Vi trường',
  stain: 'Thời gian nhuộm',
  // Dùng chung Hóa học – Sinh học
  time: 'Thời gian',
  // Hóa học
  catalyst: 'Xúc tác',
  acid: 'V(H₂SO₄)',
  added: 'V(KMnO₄) đã nhỏ'
};

/** Kí hiệu đại lượng: 1–2 chữ cái, có thể kèm một chữ số (h, F, R0, Va, pH) */
const SYMBOL = /^[A-Za-z]{1,2}\d?$/;

export function columnLabel(def: { key: string; label?: string }): string {
  if (Object.prototype.hasOwnProperty.call(COLUMN_LABELS, def.key)) return COLUMN_LABELS[def.key];
  if (SYMBOL.test(def.key)) return def.key;
  const short = (def.label ?? '').replace(/\s*\([^)]*\)/g, '').trim();
  return short || def.key;
}
