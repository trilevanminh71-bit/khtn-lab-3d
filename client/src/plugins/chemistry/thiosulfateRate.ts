/**
 * Plugin Hóa học 10 — Ảnh hưởng của nồng độ và nhiệt độ đến tốc độ phản ứng
 * (SGK KNTT Hóa học 10, Bài 19: Tốc độ phản ứng).
 * Phản ứng: Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + S↓ + SO₂↑ + H₂O (sodium thiosulfate + sulfuric acid).
 * Bộ giải: thiosulfate-rate. Thông số ẩn: A (hằng số thời gian), γ (hệ số nhiệt độ Van't Hoff).
 */
import type { LabPluginDef } from '../../types/lab';

export const thiosulfateRatePlugin: LabPluginDef = {
  id: 'hh10-toc-do-thiosulfate',
  version: 1,
  subject: 'chemistry',
  title: 'Ảnh hưởng của nồng độ, nhiệt độ đến tốc độ phản ứng sodium thiosulfate với sulfuric acid',
  shortTitle: 'Tốc độ phản ứng – thiosulfate',
  sgkRef: 'Hóa học 10 – Bài 19: Tốc độ phản ứng',
  chapter: 'Chương 6. Tốc độ phản ứng',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Tiến hành thí nghiệm "biến mất dấu X" do kết tủa lưu huỳnh.',
    'Nhận xét ảnh hưởng của nồng độ sodium thiosulfate và nhiệt độ đến tốc độ phản ứng.',
    "Xác định hệ số nhiệt độ Van't Hoff γ."
  ],
  theory:
    "Khi trộn dung dịch sodium thiosulfate với sulfuric acid, lưu huỳnh tạo thành làm dung dịch vẩn đục dần đến khi che khuất dấu X dưới cốc. Thời gian t càng ngắn thì tốc độ càng lớn (v ~ 1/t). Quy tắc Van't Hoff: khi nhiệt độ tăng 10 °C, tốc độ tăng γ lần (γ thường từ 2 đến 4).",
  equation: 'Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + S↓ + SO₂↑ + H₂O',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'beaker', reagentA: 'Na₂S₂O₃', reagentB: 'H₂SO₄ 1 M', showCross: true, showThermometer: true },
  solverId: 'thiosulfate-rate',
  params: [
    { key: 'C', label: 'Nồng độ Na₂S₂O₃', unit: 'mol/L', min: 0.02, max: 0.15, step: 0.01, default: 0.1 },
    { key: 'T', label: 'Nhiệt độ', unit: '°C', min: 15, max: 55, step: 5, default: 25 }
  ],
  hidden: [
    { key: 'A', label: 'Hằng số thời gian', unit: 's·mol/L', min: 3, max: 5, decimals: 2 },
    { key: 'gamma', label: "Hệ số Van't Hoff", unit: '', min: 2, max: 3.2, decimals: 2 }
  ],
  measurements: [
    { key: 't', label: 'Thời gian mất dấu X', unit: 's', decimals: 1 },
    { key: 'v', label: 'Tốc độ tương đối 1/t', unit: '1/s', decimals: 4 }
  ],
  minTrials: 4,
  result: { key: 'gamma', label: "Hệ số nhiệt độ Van't Hoff γ", unit: '', tolerancePercent: 8, decimals: 2, hint: 'Giữ nguyên C, đo t ở hai nhiệt độ T₁ < T₂: γ = (t₁/t₂)^(10/(T₂−T₁)).' },
  steps: [
    { id: 's1', title: 'Đeo kính, găng tay & kiểm tra nhãn', instruction: 'Trang bị bảo hộ và kiểm tra nhãn sodium thiosulfate, sulfuric acid.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt cốc lên giấy có dấu X', instruction: 'Kéo cốc thủy tinh vào vị trí trên tờ giấy có dấu X.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn nồng độ và nhiệt độ', instruction: 'Chỉnh nồng độ Na₂S₂O₃ và nhiệt độ bể ổn nhiệt.', action: 'adjust' },
    { id: 's4', title: 'Rót sulfuric acid – bấm giờ', instruction: 'Chạm vào chai H₂SO₄ (hoặc nút Đo) để rót và bấm giờ đến khi mất dấu X.', action: 'measure', trigger: 'reagent-b', requiresPpe: true },
    { id: 's5', title: 'Ghi số liệu và tính γ', instruction: 'Đo ít nhất 4 lần ở ≥ 2 nhiệt độ khác nhau rồi tính γ.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Sodium thiosulfate', formula: 'Na₂S₂O₃', concentration: '0,02–0,15 M', hazards: ['Ít độc', 'Tránh dính mắt'] },
    { name: 'Sulfuric acid', formula: 'H₂SO₄', concentration: '1 M', hazards: ['Ăn mòn', 'Gây bỏng da và mắt'] }
  ],
  incidents: [{ id: 'so2-fumes', title: 'Khí SO₂ thoát ra nhiều', message: 'Ở nhiệt độ > 50 °C, khí sulfur dioxide (mùi hắc, độc) thoát mạnh. Cần làm trong tủ hút hoặc nơi thông gió.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Khi tăng nhiệt độ, tốc độ phản ứng thường:', options: ['Giảm', 'Tăng', 'Không đổi', 'Bằng 0'], correctIndex: 1, explanation: 'Nhiệt độ tăng → số va chạm hiệu quả tăng.', misconceptionId: 'chem-temp-no-effect-rate' },
    { id: 'q2', prompt: 'Chất rắn màu vàng nhạt làm mờ dấu X là:', options: ['Na₂SO₄', 'Lưu huỳnh (S)', 'SO₂', 'H₂O'], correctIndex: 1, explanation: 'S kết tủa không tan tạo vẩn đục.' },
    { id: 'q3', prompt: 'Nồng độ chất phản ứng khác với lượng chất ở điểm:', options: ['Nồng độ là lượng chất trong một đơn vị thể tích', 'Hai khái niệm giống hệt', 'Nồng độ là khối lượng', 'Nồng độ là thể tích'], correctIndex: 0, explanation: 'C = n/V.', misconceptionId: 'chem-concentration-amount' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Ở 25 °C t = 40 s; ở 35 °C t = 16 s (cùng C). γ =', options: ['2,5', '0,4', '24', '1,6'], correctIndex: 0, explanation: 'γ = 40/16 = 2,5.' },
    { id: 'p2', prompt: 'Giảm nồng độ Na₂S₂O₃ một nửa (giữ T) thì thời gian mất dấu X:', options: ['Giảm một nửa', 'Tăng khoảng gấp đôi', 'Không đổi', 'Bằng 0'], correctIndex: 1, explanation: 'Tốc độ tỉ lệ với nồng độ nên t tăng gấp đôi.', misconceptionId: 'chem-concentration-amount' },
    { id: 'p3', prompt: 'Vì sao bảo quản thực phẩm trong tủ lạnh lâu hỏng hơn?', options: ['Nhiệt độ thấp làm giảm tốc độ phản ứng', 'Tủ lạnh có chất xúc tác', 'Ánh sáng tủ lạnh', 'Tủ lạnh tăng nồng độ'], correctIndex: 0, explanation: 'Nhiệt độ thấp làm chậm các phản ứng gây hỏng.', misconceptionId: 'chem-temp-no-effect-rate' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu ảnh hưởng của nồng độ và nhiệt độ tới tốc độ phản ứng, ghi giá trị γ.',
  conclusionKeywords: ['nồng độ', 'nhiệt độ', 'tốc độ phản ứng', 'tăng'],
  tags: ['tốc độ phản ứng', "Van't Hoff", 'sodium thiosulfate'],
  source: 'builtin'
};
