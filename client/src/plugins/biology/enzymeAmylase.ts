/**
 * Plugin Sinh học 10 — Ảnh hưởng của nhiệt độ và pH đến hoạt tính enzyme amylase
 * (SGK KNTT Sinh học 10, Chương 4: Chuyển hóa năng lượng và enzyme — thực hành thí nghiệm enzyme).
 * Thử tinh bột bằng thuốc thử iodine: còn tinh bột → xanh tím; hết tinh bột → vàng nâu.
 * Bộ giải: enzyme-amylase. Thông số ẩn: tOpt (°C), pHOpt, t0 (phút).
 */
import type { LabPluginDef } from '../../types/lab';

export const enzymeAmylasePlugin: LabPluginDef = {
  id: 'sh10-enzyme-amylase',
  version: 1,
  subject: 'biology',
  title: 'Thí nghiệm hoạt tính enzyme (amylase): ảnh hưởng của nhiệt độ và pH',
  shortTitle: 'Bài 15 – Thí nghiệm hoạt tính enzyme (amylase)',
  sgkRef: 'Sinh học 10 – Bài 15: Thực hành về enzyme (khảo sát nhiệt độ, pH)',
  chapter: 'Chương 4: Chuyển hóa năng lượng và enzyme',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Bố trí dãy ống nghiệm tinh bột + amylase ở các nhiệt độ, pH khác nhau.',
    'Dùng thuốc thử iodine xác định thời điểm tinh bột bị thủy phân hết.',
    'Xác định nhiệt độ tối ưu của enzyme và giải thích sự biến tính ở nhiệt độ cao.'
  ],
  theory:
    'Enzyme amylase (trong nước bọt) xúc tác thủy phân tinh bột thành đường maltose. Mỗi enzyme hoạt động mạnh nhất ở nhiệt độ và pH tối ưu. Nhiệt độ quá cao làm enzyme (bản chất protein) bị biến tính, mất hoạt tính; nhiệt độ thấp chỉ làm enzyme hoạt động yếu.',
  equation: 'Tinh bột + H₂O —(amylase)→ Maltose',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'tubes', reagentA: 'Thuốc thử iodine', reagentB: 'Amylase', showThermometer: true },
  solverId: 'enzyme-amylase',
  params: [
    { key: 'T', label: 'Nhiệt độ bể ổn nhiệt', unit: '°C', min: 0, max: 90, step: 5, default: 25 },
    { key: 'pH', label: 'pH dung dịch đệm', unit: '', min: 3, max: 10, step: 0.5, default: 7 }
  ],
  hidden: [
    { key: 'tOpt', label: 'Nhiệt độ tối ưu', unit: '°C', min: 34, max: 41, decimals: 1 },
    { key: 'pHOpt', label: 'pH tối ưu', unit: '', min: 6.6, max: 7, decimals: 2 },
    { key: 't0', label: 'Thời gian thủy phân tối thiểu', unit: 'phút', min: 2.5, max: 3.5, decimals: 2 }
  ],
  measurements: [{ key: 't', label: 'Thời gian mất màu xanh tím', unit: 'phút', decimals: 1 }],
  charts: [{ id: 't-T', title: 'Thời gian thủy phân theo nhiệt độ', kind: 'scatter', x: 'T', y: 't', xLabel: 'T (°C)', yLabel: 't (phút)' }],
  minTrials: 5,
  result: { key: 'tOpt', label: 'Nhiệt độ tối ưu của amylase', unit: '°C', tolerancePercent: 6, decimals: 0, hint: 'Giữ pH = 7, đo ở ≥ 5 nhiệt độ; nhiệt độ có thời gian ngắn nhất (đỉnh đồ thị 1/t) là nhiệt độ tối ưu.' },
  steps: [
    { id: 's1', title: 'Đeo găng tay, kiểm tra nhãn', instruction: 'Trang bị găng tay; kiểm tra nhãn thuốc thử iodine.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt ống nghiệm vào bể ổn nhiệt', instruction: 'Kéo giá ống nghiệm vào bể ổn nhiệt (điểm gắn).', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn nhiệt độ và pH', instruction: 'Chỉnh nhiệt độ bể và pH dung dịch đệm.', action: 'adjust' },
    { id: 's4', title: 'Thêm amylase – thử iodine', instruction: 'Chạm vào lọ amylase (hoặc nút Đo); thử iodine mỗi phút đến khi hết màu xanh tím.', action: 'measure', trigger: 'reagent-b' },
    { id: 's5', title: 'Vẽ đồ thị & kết luận', instruction: 'Đo ≥ 5 nhiệt độ, vẽ đồ thị 1/t theo T, tìm nhiệt độ tối ưu.', action: 'record' }
  ],
  ppeRequired: ['gloves', 'labelCheck'],
  chemicals: [
    { name: 'Dung dịch iodine', formula: 'I₂/KI', concentration: '0,1%', hazards: ['Nhuộm màu', 'Kích ứng mắt'] },
    { name: 'Tinh bột', formula: '(C₆H₁₀O₅)n', concentration: '1%', hazards: ['Không độc'] }
  ],
  incidents: [{ id: 'hot-water', title: 'Nước nóng > 80 °C', message: 'Bể nước rất nóng, có thể gây bỏng. Dùng kẹp gỗ, đeo găng tay chịu nhiệt.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Tăng nhiệt độ từ 37 °C lên 80 °C thì hoạt tính amylase:', options: ['Tăng mạnh', 'Giảm mạnh do enzyme bị biến tính', 'Không đổi', 'Tăng gấp đôi'], correctIndex: 1, explanation: 'Quá nhiệt độ tối ưu, protein enzyme bị biến tính.', misconceptionId: 'bio-enzyme-higher-temp-better' },
    { id: 'q2', prompt: 'Bản chất hóa học của hầu hết enzyme là:', options: ['Lipid', 'Protein', 'Carbohydrate', 'Muối khoáng'], correctIndex: 1, explanation: 'Phần lớn enzyme là protein.', misconceptionId: 'bio-enzyme-alive' },
    { id: 'q3', prompt: 'Iodine cho màu xanh tím với:', options: ['Glucose', 'Tinh bột', 'Protein', 'Lipid'], correctIndex: 1, explanation: 'Phản ứng màu đặc trưng của tinh bột với iodine.' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Ống ở 0 °C sau khi đưa về 37 °C thì:', options: ['Enzyme hoạt động trở lại', 'Enzyme đã chết vĩnh viễn', 'Tạo tinh bột', 'Không có gì xảy ra'], correctIndex: 0, explanation: 'Nhiệt độ thấp chỉ ức chế tạm thời, không biến tính enzyme.', misconceptionId: 'bio-enzyme-alive' },
    { id: 'p2', prompt: 'Ở 37 °C mất 3 phút, ở 60 °C mất 12 phút. Tốc độ ở 60 °C bằng mấy lần ở 37 °C?', options: ['4 lần', '1/4', '1/2', '2 lần'], correctIndex: 1, explanation: 'v ~ 1/t ⇒ 3/12 = 1/4.', misconceptionId: 'bio-enzyme-higher-temp-better' },
    { id: 'p3', prompt: 'pH tối ưu của amylase nước bọt khoảng:', options: ['2', '6,8–7', '10', '12'], correctIndex: 1, explanation: 'Amylase nước bọt hoạt động tốt ở pH gần trung tính.' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu nhiệt độ tối ưu tìm được và giải thích vì sao hoạt tính giảm khi nhiệt độ quá cao.',
  conclusionKeywords: ['nhiệt độ tối ưu', 'biến tính', 'hoạt tính'],
  tags: ['enzyme', 'amylase', 'iodine'],
  source: 'builtin'
};
