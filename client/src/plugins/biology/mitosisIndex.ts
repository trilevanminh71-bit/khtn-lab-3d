/**
 * Plugin Sinh học 10 — Quan sát tiêu bản nguyên phân ở đỉnh rễ hành và tính chỉ số nguyên phân
 * (SGK KNTT Sinh học 10, Bài 21: Thực hành làm và quan sát tiêu bản quá trình nguyên phân).
 * Bộ giải: mitosis-index. Thông số ẩn: mi (tỉ lệ tế bào đang phân chia), fieldSeed (bố cục vi trường).
 */
import type { LabPluginDef } from '../../types/lab';

export const mitosisIndexPlugin: LabPluginDef = {
  id: 'sh10-chi-so-nguyen-phan',
  version: 1,
  subject: 'biology',
  title: 'Quan sát các kì nguyên phân ở tế bào đỉnh rễ hành và tính chỉ số nguyên phân',
  shortTitle: 'Nguyên phân – rễ hành',
  sgkRef: 'Sinh học 10 – Bài 21: Thực hành làm và quan sát tiêu bản quá trình nguyên phân',
  chapter: 'Chương 5: Chu kì tế bào và phân bào',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Nhận biết tế bào ở kì trung gian và các kì đầu, giữa, sau, cuối của nguyên phân.',
    'Đếm tế bào trên nhiều vi trường, tính chỉ số nguyên phân MI.',
    'Ước lượng thời gian tương đối của từng kì dựa trên tỉ lệ tế bào.'
  ],
  theory:
    'Đỉnh rễ hành có mô phân sinh phân chia mạnh. Sau khi thủy phân bằng HCl và nhuộm bằng thuốc nhuộm (orcein/carmine), nhiễm sắc thể bắt màu đậm. Chỉ số nguyên phân MI = (số tế bào đang phân chia / tổng số tế bào) × 100%. Kì trung gian chiếm phần lớn thời gian chu kì nên phần lớn tế bào ở kì trung gian.',
  equation: 'MI = (đầu + giữa + sau + cuối) / tổng × 100%',
  sceneTemplate: 'microscope',
  sceneOptions: { slideLabel: 'Tiêu bản đỉnh rễ hành', allowSpecimenSwitch: false },
  solverId: 'mitosis-index',
  params: [
    { key: 'field', label: 'Vi trường số', unit: '', min: 1, max: 12, step: 1, default: 1 },
    { key: 'stain', label: 'Thời gian nhuộm', unit: 'phút', min: 1, max: 10, step: 1, default: 5 }
  ],
  hidden: [
    { key: 'mi', label: 'Tỉ lệ tế bào phân chia', unit: '', min: 0.08, max: 0.16, decimals: 3 },
    { key: 'fieldSeed', label: 'Hạt giống vi trường', unit: '', min: 1000, max: 9999, decimals: 0 }
  ],
  measurements: [
    { key: 'total', label: 'Tổng số TB', unit: 'TB', decimals: 0 },
    { key: 'prophase', label: 'Kì đầu', unit: 'TB', decimals: 0 },
    { key: 'metaphase', label: 'Kì giữa', unit: 'TB', decimals: 0 },
    { key: 'anaphase', label: 'Kì sau', unit: 'TB', decimals: 0 },
    { key: 'telophase', label: 'Kì cuối', unit: 'TB', decimals: 0 }
  ],
  minTrials: 5,
  result: { key: 'MI', label: 'Chỉ số nguyên phân MI', unit: '%', tolerancePercent: 20, decimals: 1, hint: 'Cộng dồn trên mọi vi trường khác nhau: MI = Σ(đầu+giữa+sau+cuối)/Σ tổng × 100.' },
  steps: [
    { id: 's1', title: 'Đặt tiêu bản rễ hành', instruction: 'Kéo tiêu bản đỉnh rễ hành đã nhuộm lên bàn kính.', action: 'snap', trigger: 'stage-slot' },
    { id: 's2', title: 'Bật đèn và tìm vùng mô phân sinh', instruction: 'Chạm vào đèn; dùng vật kính 10× tìm vùng tế bào nhỏ, xếp sít.', action: 'click', trigger: 'light' },
    { id: 's3', title: 'Chọn vi trường & thời gian nhuộm', instruction: 'Chọn vi trường quan sát và thời gian nhuộm phù hợp (4–6 phút).', action: 'adjust' },
    { id: 's4', title: 'Đếm tế bào trong vi trường', instruction: 'Chạm vào ốc vi cấp (hoặc nút Đo) để đếm số tế bào ở từng kì.', action: 'measure', trigger: 'fine-knob' },
    { id: 's5', title: 'Tổng hợp nhiều vi trường', instruction: 'Đếm ≥ 5 vi trường khác nhau, tính MI và tỉ lệ từng kì.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Hydrochloric acid', formula: 'HCl', concentration: '1 M', hazards: ['Ăn mòn', 'Kích ứng hô hấp'] },
    { name: 'Thuốc nhuộm orcein acetic', formula: '—', concentration: '2%', hazards: ['Nhuộm màu', 'Kích ứng'] }
  ],
  incidents: [{ id: 'overstain', title: 'Nhuộm quá lâu', message: 'Nhuộm > 8 phút làm cả tế bào chất bắt màu đậm, khó phân biệt nhiễm sắc thể. Giảm thời gian nhuộm.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Kì trung gian là giai đoạn:', options: ['Tế bào nghỉ ngơi, không hoạt động', 'Tế bào sinh trưởng, nhân đôi DNA', 'Nhiễm sắc thể co xoắn cực đại', 'Tế bào chất phân chia'], correctIndex: 1, explanation: 'Kì trung gian là giai đoạn hoạt động mạnh: tổng hợp, nhân đôi DNA.', misconceptionId: 'bio-mitosis-interphase-rest' },
    { id: 'q2', prompt: 'Kì nhiễm sắc thể xếp thành một hàng trên mặt phẳng xích đạo:', options: ['Kì đầu', 'Kì giữa', 'Kì sau', 'Kì cuối'], correctIndex: 1, explanation: 'Kì giữa: NST kép co xoắn cực đại, xếp 1 hàng.' },
    { id: 'q3', prompt: 'Vì sao chọn đỉnh rễ hành để quan sát nguyên phân?', options: ['Vì có nhiều tế bào đang phân chia', 'Vì có màu đẹp', 'Vì dễ cắt', 'Vì có diệp lục'], correctIndex: 0, explanation: 'Mô phân sinh đỉnh rễ phân chia mạnh.' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Đếm 500 tế bào, 60 tế bào đang phân chia. MI =', options: ['12%', '6%', '60%', '8,3%'], correctIndex: 0, explanation: '60/500 × 100% = 12%.' },
    { id: 'p2', prompt: 'Phần lớn tế bào quan sát được ở kì trung gian vì:', options: ['Kì trung gian chiếm thời gian dài nhất', 'Tế bào đã chết', 'Thuốc nhuộm kém', 'Kính hiển vi yếu'], correctIndex: 0, explanation: 'Tỉ lệ số tế bào phản ánh thời gian tương đối của từng giai đoạn.', misconceptionId: 'bio-mitosis-interphase-rest' },
    { id: 'p3', prompt: 'Ở kì sau của nguyên phân:', options: ['NST kép tách thành NST đơn đi về hai cực', 'NST nhân đôi', 'Màng nhân xuất hiện', 'NST xếp 2 hàng'], correctIndex: 0, explanation: 'Các chromatid chị em tách nhau ở tâm động.' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu chỉ số nguyên phân, kì chiếm tỉ lệ lớn nhất và ý nghĩa của nguyên phân.',
  conclusionKeywords: ['chỉ số nguyên phân', 'kì trung gian', 'kì giữa'],
  tags: ['nguyên phân', 'rễ hành', 'chu kì tế bào'],
  source: 'builtin'
};
