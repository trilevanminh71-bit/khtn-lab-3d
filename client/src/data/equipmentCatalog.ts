/**
 * data/equipmentCatalog.ts — TỦ DỤNG CỤ cho chế độ "Tự do thí nghiệm" (JSON thuần, không chứa hàm).
 * Mỗi dụng cụ: tên tiếng Việt, môn, bài liên quan (để lọc "theo bài"), mô tả ngắn, bảo hộ cần có (PPE),
 * dụng cụ nên dùng cùng và dụng cụ KHÔNG nên đặt cạnh (kèm lí do an toàn).
 * Danh pháp hóa chất theo IUPAC/SGK 2018: potassium permanganate, sulfuric acid, hydrogen peroxide.
 * Chế độ tự do chỉ để khám phá: không tạo số liệu đo, không ảnh hưởng bài nộp chính thức.
 */
import type { PpeItem, SubjectId } from '../types/lab';

export interface EquipmentDef {
  id: string;
  name: string;
  subjects: SubjectId[];
  /** Mã bài dùng dụng cụ này (lọc "Dụng cụ của bài đang học") */
  lessons: string[];
  description: string;
  /** Bảo hộ nên có khi dùng */
  ppe: PpeItem[];
  /** Gợi ý dụng cụ dùng kèm */
  pairsWith: string[];
  /** Không nên đặt cạnh nhau (an toàn) */
  conflicts: Array<{ id: string; reason: string }>;
  /** Mô tả điều xảy ra khi chạm vào dụng cụ trong cảnh 3D */
  action: string;
}

/** Số chỗ trên bàn thí nghiệm tự do */
export const SANDBOX_SLOTS = 8;

export const EQUIPMENT: EquipmentDef[] = [
  // ----------------------------- Vật lí -----------------------------
  { id: 'mang-nghieng', name: 'Máng nghiêng có thước', subjects: ['physics'], lessons: ['vl10-toc-do-cong-quang-dien'], description: 'Máng nhôm dài, có thước chia mm để bi lăn và đo quãng đường.', ppe: [], pairsWith: ['bi-thep', 'cong-quang-dien'], conflicts: [], action: 'Viên bi lăn xuống máng.' },
  { id: 'bi-thep', name: 'Viên bi thép', subjects: ['physics'], lessons: ['vl10-toc-do-cong-quang-dien', 'vl10-gia-toc-roi-tu-do'], description: 'Bi thép đường kính khoảng 2 cm, dùng chắn tia cổng quang điện.', ppe: [], pairsWith: ['mang-nghieng'], conflicts: [], action: 'Bi lăn một đoạn rồi dừng.' },
  { id: 'cong-quang-dien', name: 'Cổng quang điện', subjects: ['physics'], lessons: ['vl10-toc-do-cong-quang-dien', 'vl10-gia-toc-roi-tu-do', 'vl10-dong-luong-va-cham'], description: 'Phát tia hồng ngoại; khi vật chắn tia, đèn đỏ sáng và đồng hồ bắt đầu/dừng đếm.', ppe: [], pairsWith: ['dong-ho-so'], conflicts: [], action: 'Đèn tín hiệu chớp đỏ như khi bị chắn tia.' },
  { id: 'dong-ho-so', name: 'Đồng hồ đo thời gian hiện số', subjects: ['physics'], lessons: ['vl10-toc-do-cong-quang-dien', 'vl10-gia-toc-roi-tu-do', 'vl10-dong-luong-va-cham'], description: 'Đo thời gian chính xác tới 0,001 s, nối với cổng quang điện.', ppe: [], pairsWith: ['cong-quang-dien'], conflicts: [], action: 'Đồng hồ bắt đầu đếm; chạm lần nữa để dừng.' },
  { id: 'luc-ke', name: 'Lực kế lò xo', subjects: ['physics'], lessons: ['vl10-tong-hop-luc', 'vl10-dinh-luat-2-newton'], description: 'Đo lực theo độ giãn lò xo, thang 0–5 N.', ppe: [], pairsWith: ['qua-nang'], conflicts: [], action: 'Lò xo giãn ra rồi co lại.' },
  { id: 'qua-nang', name: 'Bộ quả nặng 50 g', subjects: ['physics'], lessons: ['vl10-tong-hop-luc', 'vl10-dinh-luat-2-newton'], description: 'Các quả nặng móc được, mỗi quả 50 g (trọng lượng ≈ 0,5 N).', ppe: [], pairsWith: ['luc-ke'], conflicts: [], action: 'Quả nặng lắc nhẹ.' },
  { id: 'pin-von-ke', name: 'Pin và vôn kế', subjects: ['physics'], lessons: ['vl10-suat-dien-dong-pin'], description: 'Pin điện hóa nối vôn kế để đo hiệu điện thế giữa hai cực.', ppe: [], pairsWith: [], conflicts: [{ id: 'chai-h2so4', reason: 'Để thiết bị điện xa dung dịch acid để tránh đổ, chập điện.' }], action: 'Kim vôn kế lệch sang phải.' },
  // ----------------------------- Hóa học -----------------------------
  { id: 'coc-thuy-tinh', name: 'Cốc thủy tinh 250 mL', subjects: ['chemistry', 'biology'], lessons: ['hh10-toc-do-thiosulfate', 'hh10-enthalpy-zn-cuso4', 'hh10-cac-yeu-to-toc-do'], description: 'Cốc có vạch chia, dùng pha và đựng dung dịch.', ppe: [], pairsWith: ['nhiet-ke'], conflicts: [], action: 'Dung dịch sủi bọt nhẹ.' },
  { id: 'binh-non', name: 'Bình tam giác (bình nón)', subjects: ['chemistry'], lessons: ['hh10-chuan-do-permanganate', 'hh10-xuc-tac-hydrogen-peroxide'], description: 'Miệng hẹp, lắc tròn không bị bắn — dùng khi chuẩn độ.', ppe: [], pairsWith: ['buret'], conflicts: [], action: 'Bình được lắc tròn.' },
  { id: 'buret', name: 'Burette trên giá', subjects: ['chemistry'], lessons: ['hh10-chuan-do-permanganate'], description: 'Ống chia vạch 25 mL có khóa, nhỏ từng giọt khi chuẩn độ; đọc ngang đáy mặt khum.', ppe: ['goggles'], pairsWith: ['binh-non', 'chai-kmno4'], conflicts: [], action: 'Một giọt rơi xuống từ khóa burette.' },
  { id: 'ong-nghiem', name: 'Giá ống nghiệm', subjects: ['chemistry', 'biology'], lessons: ['hh10-nhom-halogen', 'sh10-enzyme-amylase', 'sh10-enzyme-protease-amylase'], description: 'Giá gỗ với 4 ống nghiệm để làm phản ứng nhỏ.', ppe: [], pairsWith: ['ong-nho-giot'], conflicts: [], action: 'Các ống nghiệm rung nhẹ.' },
  { id: 'den-con', name: 'Đèn cồn', subjects: ['chemistry', 'biology'], lessons: ['hh10-toc-do-thiosulfate'], description: 'Đun nóng nhẹ. Đậy nắp để tắt, không thổi.', ppe: ['goggles'], pairsWith: ['coc-thuy-tinh'], conflicts: [{ id: 'chai-ethanol', reason: 'Không đặt chai cồn cạnh ngọn lửa — hơi cồn dễ bắt cháy.' }, { id: 'chai-h2o2', reason: 'Hydrogen peroxide phân hủy nhanh khi nóng — để xa nguồn nhiệt.' }], action: 'Bật/tắt ngọn lửa.' },
  { id: 'nhiet-ke', name: 'Nhiệt kế', subjects: ['chemistry', 'biology'], lessons: ['hh10-enthalpy-zn-cuso4', 'hh10-toc-do-thiosulfate', 'sh10-enzyme-amylase'], description: 'Nhiệt kế rượu 0–100 °C.', ppe: [], pairsWith: ['coc-thuy-tinh'], conflicts: [], action: 'Cột chất lỏng dâng lên.' },
  { id: 'chai-kmno4', name: 'Dung dịch potassium permanganate 0,02 M', subjects: ['chemistry'], lessons: ['hh10-chuan-do-permanganate'], description: 'Chất oxi hóa mạnh, màu tím; nhuộm màu da.', ppe: ['goggles', 'gloves', 'labelCheck'], pairsWith: ['buret'], conflicts: [{ id: 'chai-ethanol', reason: 'Chất oxi hóa mạnh để xa chất dễ cháy.' }], action: 'Xoay chai cho nhãn hướng ra ngoài.' },
  { id: 'chai-h2so4', name: 'Dung dịch sulfuric acid 1 M', subjects: ['chemistry'], lessons: ['hh10-chuan-do-permanganate'], description: 'Acid ăn mòn — luôn rót acid vào nước, không làm ngược lại.', ppe: ['goggles', 'gloves', 'labelCheck'], pairsWith: ['binh-non'], conflicts: [], action: 'Xoay chai cho nhãn hướng ra ngoài.' },
  { id: 'chai-h2o2', name: 'Dung dịch hydrogen peroxide 3%', subjects: ['chemistry'], lessons: ['hh10-xuc-tac-hydrogen-peroxide'], description: 'Tự phân hủy chậm tạo O₂; nhanh hơn khi có xúc tác MnO₂.', ppe: ['goggles', 'gloves'], pairsWith: ['binh-non'], conflicts: [], action: 'Vài bọt khí nhỏ nổi lên.' },
  { id: 'chai-ethanol', name: 'Cồn 96°', subjects: ['chemistry', 'biology'], lessons: [], description: 'Chất dễ cháy, dùng làm nhiên liệu đèn cồn và sát khuẩn.', ppe: ['labelCheck'], pairsWith: [], conflicts: [{ id: 'den-con', reason: 'Không đặt chai cồn cạnh ngọn lửa — hơi cồn dễ bắt cháy.' }, { id: 'chai-kmno4', reason: 'Chất dễ cháy để xa chất oxi hóa mạnh.' }], action: 'Xoay chai cho nhãn hướng ra ngoài.' },
  // ----------------------------- Sinh học -----------------------------
  { id: 'kinh-hien-vi', name: 'Kính hiển vi quang học', subjects: ['biology'], lessons: ['sh10-quan-sat-te-bao', 'sh10-co-nguyen-sinh', 'sh10-chi-so-nguyen-phan', 'sh10-te-bao-nhan-so'], description: 'Phóng đại 40–1000 lần; độ phóng đại = vật kính × thị kính.', ppe: [], pairsWith: ['lam-kinh'], conflicts: [], action: 'Bật/tắt đèn chiếu sáng.' },
  { id: 'lam-kinh', name: 'Lam kính và lamen', subjects: ['biology'], lessons: ['sh10-quan-sat-te-bao', 'sh10-co-nguyen-sinh', 'sh10-chi-so-nguyen-phan'], description: 'Đặt mẫu vật mỏng, đậy lamen nghiêng 45° để tránh bọt khí.', ppe: ['gloves'], pairsWith: ['kinh-hien-vi', 'ong-nho-giot'], conflicts: [], action: 'Lamen hạ xuống mẫu vật.' },
  { id: 'dia-petri', name: 'Đĩa petri có môi trường', subjects: ['biology'], lessons: ['sh10-sinh-truong-vi-sinh-vat'], description: 'Nuôi cấy vi sinh vật; đậy nắp, không mở gần mặt.', ppe: ['gloves'], pairsWith: [], conflicts: [{ id: 'den-con', reason: 'Đĩa nhựa để xa ngọn lửa.' }], action: 'Khuẩn lạc lớn dần.' },
  { id: 'ong-nho-giot', name: 'Ống nhỏ giọt', subjects: ['biology', 'chemistry'], lessons: ['sh10-enzyme-amylase', 'hh10-nhom-halogen'], description: 'Lấy và nhỏ từng giọt dung dịch.', ppe: [], pairsWith: ['ong-nghiem'], conflicts: [], action: 'Một giọt được nhỏ ra.' },
  { id: 'chai-iodine', name: 'Dung dịch iodine', subjects: ['biology'], lessons: ['sh10-enzyme-amylase', 'sh10-enzyme-protease-amylase'], description: 'Thuốc thử tinh bột: tinh bột + iodine → xanh tím.', ppe: ['gloves', 'labelCheck'], pairsWith: ['ong-nghiem'], conflicts: [], action: 'Xoay chai cho nhãn hướng ra ngoài.' }
];

export function equipmentById(id: string): EquipmentDef | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

/** Các cặp dụng cụ đặt cạnh nhau không an toàn trên bàn (mỗi cặp chỉ báo một lần) */
export function sandboxConflicts(items: string[]): Array<{ a: string; b: string; reason: string }> {
  const out: Array<{ a: string; b: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const a of items) {
    for (const c of equipmentById(a)?.conflicts ?? []) {
      if (!items.includes(c.id)) continue;
      const key = [a, c.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a, b: c.id, reason: c.reason });
    }
  }
  return out;
}

/** Bảo hộ còn thiếu cho các dụng cụ đang đặt trên bàn */
export function sandboxMissingPpe(items: string[], ppe: Record<PpeItem, boolean>): PpeItem[] {
  const need = new Set<PpeItem>();
  for (const id of items) for (const k of equipmentById(id)?.ppe ?? []) need.add(k);
  return [...need].filter((k) => !ppe[k]);
}
