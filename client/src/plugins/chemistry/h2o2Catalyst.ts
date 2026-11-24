/**
 * Plugin Hóa học 10 — Ảnh hưởng của chất xúc tác: phân hủy hydrogen peroxide
 * (SGK KNTT Hóa học 10, Bài 19: Tốc độ phản ứng).
 * Phản ứng: 2H₂O₂ → 2H₂O + O₂↑ (xúc tác MnO₂ hoặc enzyme catalase trong khoai tây).
 * Bộ giải: h2o2-catalyst. Thông số ẩn C: nồng độ H₂O₂ ban đầu (mol/L).
 */
import type { LabPluginDef } from '../../types/lab';

export const h2o2CatalystPlugin: LabPluginDef = {
  id: 'hh10-xuc-tac-hydrogen-peroxide',
  version: 1,
  subject: 'chemistry',
  title: 'Ảnh hưởng của chất xúc tác đến tốc độ phân hủy hydrogen peroxide',
  shortTitle: 'Xúc tác – H₂O₂',
  sgkRef: 'Hóa học 10 – Bài 19: Tốc độ phản ứng (yếu tố chất xúc tác)',
  chapter: 'Chương 6. Tốc độ phản ứng',
  grade: 10,
  durationMin: 25,
  objectives: [
    'So sánh tốc độ thoát khí O₂ khi không có xúc tác, có MnO₂ và có khoai tây (enzyme catalase).',
    'Hiểu chất xúc tác làm tăng tốc độ nhưng không bị tiêu hao và không làm tăng lượng sản phẩm.',
    'Xác định nồng độ hydrogen peroxide ban đầu từ thể tích O₂ khi phản ứng hoàn toàn.'
  ],
  theory:
    'Hydrogen peroxide phân hủy chậm ở điều kiện thường. MnO₂ hoặc enzyme catalase làm phản ứng xảy ra nhanh. Khí O₂ thu bằng xi lanh. Khi phản ứng hoàn toàn: n(O₂) = ½·n(H₂O₂); ở điều kiện chuẩn (25 °C, 1 bar) 1 mol khí chiếm 24,79 L.',
  equation: '2H₂O₂ → 2H₂O + O₂↑',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'flask-syringe', reagentA: 'H₂O₂', reagentB: 'MnO₂', showSyringe: true },
  solverId: 'h2o2-catalyst',
  params: [
    { key: 'catalyst', label: 'Xúc tác (0: không · 1: MnO₂ · 2: khoai tây)', unit: '', min: 0, max: 2, step: 1, default: 0 },
    { key: 'V', label: 'Thể tích dung dịch H₂O₂', unit: 'mL', min: 5, max: 40, step: 5, default: 10 },
    { key: 'time', label: 'Thời gian thu khí', unit: 's', min: 10, max: 300, step: 10, default: 60 }
  ],
  hidden: [{ key: 'C', label: 'Nồng độ H₂O₂', unit: 'mol/L', min: 0.5, max: 0.9, decimals: 3 }],
  measurements: [{ key: 'VO2', label: 'Thể tích O₂ thu được', unit: 'mL', decimals: 1 }],
  minTrials: 3,
  result: { key: 'C', label: 'Nồng độ H₂O₂ ban đầu', unit: 'mol/L', tolerancePercent: 4, decimals: 3, hint: 'Dùng MnO₂, thu khí đủ lâu (≥ 120 s) đến khi V(O₂) không tăng: C = 2·V(O₂)/(24 790·V) với V theo lít.' },
  steps: [
    { id: 's1', title: 'Trang bị bảo hộ & đọc nhãn', instruction: 'Đeo kính, găng tay; kiểm tra nhãn hydrogen peroxide.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Lắp bình với xi lanh thu khí', instruction: 'Kéo bình tam giác vào giá, nối với xi lanh (điểm gắn).', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn xúc tác, thể tích, thời gian', instruction: 'Chọn loại xúc tác, thể tích H₂O₂ và thời gian thu khí.', action: 'adjust' },
    { id: 's4', title: 'Cho xúc tác vào – đo V(O₂)', instruction: 'Chạm vào lọ xúc tác (hoặc nút Đo) và đọc thể tích khí trên xi lanh.', action: 'measure', trigger: 'catalyst', requiresPpe: true },
    { id: 's5', title: 'So sánh & tính nồng độ', instruction: 'Đo với ít nhất 2 loại xúc tác; dùng lần đo hoàn toàn để tính C.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Hydrogen peroxide', formula: 'H₂O₂', concentration: '≈ 3% (~0,9 M)', hazards: ['Gây kích ứng da, mắt', 'Chất oxi hóa'] },
    { name: 'Manganese dioxide', formula: 'MnO₂', concentration: 'Bột rắn', hazards: ['Có hại khi hít bụi'] }
  ],
  incidents: [{ id: 'foam-overflow', title: 'Bọt khí trào ra', message: 'Thể tích H₂O₂ lớn với MnO₂ tạo khí rất mạnh, bọt trào khỏi bình. Dùng ít dung dịch hơn (≤ 25 mL).', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Sau phản ứng, khối lượng MnO₂:', options: ['Giảm dần', 'Không đổi', 'Tăng lên', 'Biến mất'], correctIndex: 1, explanation: 'Chất xúc tác không bị tiêu hao sau phản ứng.', misconceptionId: 'chem-catalyst-consumed' },
    { id: 'q2', prompt: 'Chất xúc tác làm tăng:', options: ['Tốc độ phản ứng', 'Tổng lượng O₂ thu được', 'Nồng độ H₂O₂', 'Nhiệt độ phòng'], correctIndex: 0, explanation: 'Xúc tác chỉ làm phản ứng nhanh hơn.', misconceptionId: 'chem-catalyst-more-product' },
    { id: 'q3', prompt: 'Khoai tây sống làm H₂O₂ sủi bọt vì có:', options: ['Tinh bột', 'Enzyme catalase', 'Muối ăn', 'Nước'], correctIndex: 1, explanation: 'Catalase là chất xúc tác sinh học.' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Phân hủy hoàn toàn 10 mL H₂O₂ thu được 74,4 mL O₂ (đkc). C(H₂O₂) ≈', options: ['0,60 M', '0,30 M', '1,20 M', '0,06 M'], correctIndex: 0, explanation: 'n(O₂) = 0,0744/24,79 = 0,003 mol ⇒ n(H₂O₂) = 0,006 mol ⇒ C = 0,6 M.' },
    { id: 'p2', prompt: 'Với cùng lượng H₂O₂, đủ lâu, thể tích O₂ khi có và không có xúc tác:', options: ['Có xúc tác nhiều hơn', 'Bằng nhau', 'Không xúc tác nhiều hơn', 'Không xác định'], correctIndex: 1, explanation: 'Xúc tác không làm thay đổi lượng sản phẩm cuối.', misconceptionId: 'chem-catalyst-more-product' },
    { id: 'p3', prompt: 'Thể tích mol khí ở điều kiện chuẩn (25 °C, 1 bar) là:', options: ['22,4 L', '24,79 L', '1 L', '12,4 L'], correctIndex: 1, explanation: 'SGK Hóa học 10 dùng 24,79 L/mol ở đkc.' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'So sánh tốc độ thoát khí với các xúc tác và nêu vai trò của chất xúc tác.',
  conclusionKeywords: ['xúc tác', 'tốc độ', 'không bị tiêu hao'],
  tags: ['xúc tác', 'hydrogen peroxide', 'catalase'],
  source: 'builtin'
};
