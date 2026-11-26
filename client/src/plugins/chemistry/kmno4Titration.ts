/**
 * Plugin Hóa học 10 — Chuẩn độ Fe²⁺ bằng potassium permanganate (phản ứng oxi hóa – khử)
 * (SGK KNTT Hóa học 10, Bài 15: Phản ứng oxi hóa – khử; ứng dụng xác định nồng độ).
 * Phản ứng: 5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O (môi trường sulfuric acid).
 * Bộ giải: kmno4-titration. Thông số ẩn cFe: nồng độ FeSO₄ (mol/L). Kèm luyện kĩ năng đọc mặt khum.
 */
import type { LabPluginDef } from '../../types/lab';

export const kmno4TitrationPlugin: LabPluginDef = {
  id: 'hh10-chuan-do-permanganate',
  version: 2,
  subject: 'chemistry',
  title: 'Chuẩn độ dung dịch iron(II) sulfate bằng potassium permanganate',
  shortTitle: 'Bài 15 – Chuẩn độ KMnO₄',
  sgkRef: 'Hóa học 10 – Bài 15: Phản ứng oxi hóa – khử và ứng dụng trong cuộc sống',
  chapter: 'Chương 4. Phản ứng oxi hóa – khử',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Xác định chất oxi hóa, chất khử và cân bằng phản ứng bằng phương pháp thăng bằng electron.',
    'Thực hiện thao tác chuẩn độ: tráng burette, đọc mặt khum, nhận biết điểm cuối (hồng nhạt bền 30 giây).',
    'Tính nồng độ Fe²⁺ từ thể tích potassium permanganate đã dùng.'
  ],
  theory:
    'MnO₄⁻ (màu tím) bị khử thành Mn²⁺ (gần như không màu) trong môi trường acid; Fe²⁺ bị oxi hóa thành Fe³⁺. Khi Fe²⁺ vừa hết, một giọt KMnO₄ dư làm dung dịch có màu hồng nhạt bền — đó là điểm cuối chuẩn độ. Nếu thiếu sulfuric acid, MnO₄⁻ bị khử thành MnO₂ kết tủa nâu.',
  equation: '5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O',
  sceneTemplate: 'titration',
  sceneOptions: { cKMnO4: 0.02, vFe: 10, titrant: 'KMnO₄ 0,02 M', analyte: 'FeSO₄ 10,00 mL' },
  solverId: 'kmno4-titration',
  params: [
    { key: 'acid', label: 'Thể tích H₂SO₄ 1 M thêm vào', unit: 'mL', min: 0, max: 10, step: 1, default: 5 },
    { key: 'added', label: 'Thể tích KMnO₄ đã nhỏ', unit: 'mL', min: 0, max: 25, step: 0.05, default: 0 }
  ],
  hidden: [{ key: 'cFe', label: 'Nồng độ FeSO₄', unit: 'mol/L', min: 0.08, max: 0.12, decimals: 4 }],
  measurements: [
    { key: 'Vread', label: 'Số đọc burette', unit: 'mL', decimals: 2 },
    { key: 'endpoint', label: 'Hồng bền (1 = có)', unit: '', decimals: 0 }
  ],
  charts: [{ id: 'V', title: 'Số đọc burette theo lần chuẩn độ', kind: 'line', x: 'index', y: 'Vread', xLabel: 'Lần', yLabel: 'V (mL)' }],
  minTrials: 3,
  validity: {
    requireEq: { endpoint: 1 },
    nonZero: ['Vread'],
    fixedParams: ['acid'],
    notReadyMessage: 'Chưa đạt điểm cuối chuẩn độ (dung dịch chưa hồng nhạt bền). Nhỏ thêm KMnO₄ từng giọt rồi đo lại.',
    noManualRows: true,
    requireValidToSubmit: true,
    hideHintUntilSubmit: true
  },
  result: { key: 'cFe', label: 'Nồng độ Fe²⁺ trong dung dịch FeSO₄', unit: 'mol/L', tolerancePercent: 2, decimals: 4, hint: 'Lấy trung bình V(KMnO₄) của các lần đạt điểm cuối: C(Fe²⁺) = 5·0,02·V̄/10,00.' },
  steps: [
    { id: 's1', title: 'Bảo hộ & kiểm tra nhãn', instruction: 'Đeo kính, găng tay; đọc nhãn potassium permanganate và sulfuric acid.', action: 'click', trigger: 'acid-bottle', requiresPpe: true },
    { id: 's2', title: 'Đặt bình nón dưới burette', instruction: 'Kéo bình nón chứa 10,00 mL FeSO₄ vào vị trí dưới khóa burette.', action: 'snap', trigger: 'flask-slot' },
    { id: 's3', title: 'Thêm môi trường acid', instruction: 'Chọn thể tích sulfuric acid cho vào bình nón (cần ≥ 2 mL).', action: 'adjust' },
    { id: 's4', title: 'Mở khóa – nhỏ KMnO₄ & ghi số đọc', instruction: 'Chỉnh thể tích nhỏ; chạm khóa burette (hoặc nút Đo) để ghi số đọc khi dung dịch hồng nhạt bền.', action: 'measure', trigger: 'stopcock', requiresPpe: true },
    { id: 's5', title: 'Chuẩn độ lặp & tính nồng độ', instruction: 'Lặp lại ≥ 3 lần đạt điểm cuối, các lần lệch nhau ≤ 0,1 mL.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Potassium permanganate', formula: 'KMnO₄', concentration: '0,02 M', hazards: ['Chất oxi hóa mạnh', 'Nhuộm màu da'] },
    { name: 'Iron(II) sulfate', formula: 'FeSO₄', concentration: 'Chưa biết (≈ 0,1 M)', hazards: ['Có hại khi nuốt'] },
    { name: 'Sulfuric acid', formula: 'H₂SO₄', concentration: '1 M', hazards: ['Ăn mòn', 'Gây bỏng'] }
  ],
  incidents: [
    { id: 'no-acid', title: 'Thiếu môi trường acid', message: 'Không đủ sulfuric acid: xuất hiện kết tủa nâu MnO₂, phép chuẩn độ sai. Thêm ≥ 2 mL H₂SO₄.', severity: 'warning' },
    { id: 'overshoot', title: 'Quá điểm tương đương', message: 'Đã nhỏ dư nhiều KMnO₄ (tím đậm). Phải làm lại lần chuẩn độ này, nhỏ từng giọt khi gần điểm cuối.', severity: 'warning' }
  ],
  preQuiz: [
    { id: 'q1', prompt: 'Trong phản ứng, Fe²⁺ đóng vai trò:', options: ['Chất oxi hóa', 'Chất khử', 'Môi trường', 'Chất xúc tác'], correctIndex: 1, explanation: 'Fe²⁺ nhường electron → chất khử.' },
    { id: 'q2', prompt: 'Phản ứng oxi hóa – khử là phản ứng:', options: ['Bắt buộc có oxygen tham gia', 'Có sự thay đổi số oxi hóa của nguyên tố', 'Luôn tỏa nhiệt', 'Chỉ xảy ra khi đốt'], correctIndex: 1, explanation: 'Bản chất là sự chuyển electron, không cần oxygen.', misconceptionId: 'chem-redox-oxygen-only' },
    { id: 'q3', prompt: 'Khi đọc thể tích burette, mắt cần đặt:', options: ['Cao hơn mặt chất lỏng', 'Ngang với đáy mặt khum', 'Thấp hơn mặt chất lỏng', 'Bất kì vị trí nào'], correctIndex: 1, explanation: 'Đặt mắt ngang đáy mặt khum để tránh sai số thị sai.' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Dùng 9,80 mL KMnO₄ 0,02 M chuẩn độ 10,00 mL Fe²⁺. C(Fe²⁺) =', options: ['0,098 M', '0,0196 M', '0,49 M', '0,0039 M'], correctIndex: 0, explanation: 'C = 5·0,02·9,80/10,00 = 0,098 M.' },
    { id: 'p2', prompt: 'Điểm cuối chuẩn độ được nhận biết khi:', options: ['Dung dịch mất màu hoàn toàn', 'Xuất hiện màu hồng nhạt bền khoảng 30 giây', 'Có kết tủa trắng', 'Có khí thoát ra'], correctIndex: 1, explanation: 'Một giọt KMnO₄ dư tạo màu hồng bền.', misconceptionId: 'chem-endpoint-color' },
    { id: 'p3', prompt: 'Số oxi hóa của Mn trong KMnO₄ và Mn²⁺ lần lượt là:', options: ['+7 và +2', '+2 và +7', '+4 và +2', '+6 và +2'], correctIndex: 0, explanation: 'Mn⁺⁷ nhận 5e thành Mn⁺².', misconceptionId: 'chem-redox-oxygen-only' }
  ],
  meniscusSkill: true,
  conclusionPrompt: 'Ghi nồng độ Fe²⁺, xác định chất oxi hóa/chất khử và dấu hiệu điểm cuối.',
  conclusionKeywords: ['chất oxi hóa', 'chất khử', 'điểm cuối', 'nồng độ'],
  tags: ['chuẩn độ', 'oxi hóa – khử', 'potassium permanganate'],
  source: 'builtin'
};
