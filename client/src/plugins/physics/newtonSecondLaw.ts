/**
 * Plugin Vật lí 10 — Định luật II Newton trên đệm khí (SGK KNTT Vật lí 10, Bài 15).
 * Bộ giải: newton-second. Thông số ẩn M: khối lượng xe trượt (kg) — học sinh phải xác định.
 * Đại lượng kết quả: M = F/a − m, với a = 2s/t².
 */
import type { LabPluginDef } from '../../types/lab';

export const newtonSecondLawPlugin: LabPluginDef = {
  id: 'vl10-dinh-luat-2-newton',
  version: 1,
  subject: 'physics',
  title: 'Định luật II Newton — Xác định khối lượng xe trượt trên đệm khí',
  shortTitle: 'Bài 15 – Định luật 2 Newton',
  sgkRef: 'Vật lí 10 – Bài 15: Định luật 2 Newton',
  chapter: 'Chương III. Động lực học',
  grade: 10,
  durationMin: 25,
  objectives: [
    'Kiểm chứng gia tốc tỉ lệ thuận với lực và tỉ lệ nghịch với khối lượng: a = F/m.',
    'Đo gia tốc bằng cổng quang điện: a = 2s/t² (xe xuất phát từ nghỉ).',
    'Vận dụng để xác định khối lượng chưa biết của xe trượt.'
  ],
  theory:
    'Trên đệm khí, ma sát gần như bằng 0. Lực kéo F (do quả nặng qua ròng rọc) làm xe khối lượng (M + m) chuyển động nhanh dần đều với a = F/(M + m). Đo thời gian t xe đi quãng s từ nghỉ: a = 2s/t². Suy ra M = F/a − m.',
  equation: 'a = F / (M + m)',
  sceneTemplate: 'track',
  sceneOptions: { orientation: 'horizontal', objectLabel: 'Xe trượt', gateLabel: 'Cổng quang điện', timerMode: 'A↔B' },
  solverId: 'newton-second',
  params: [
    { key: 'F', label: 'Lực kéo F', unit: 'N', min: 0.1, max: 2, step: 0.05, default: 0.5 },
    { key: 'm', label: 'Gia trọng thêm m', unit: 'g', min: 0, max: 500, step: 50, default: 0 },
    { key: 's', label: 'Quãng đường s', unit: 'cm', min: 20, max: 100, step: 10, default: 50 }
  ],
  hidden: [{ key: 'M', label: 'Khối lượng xe trượt', unit: 'kg', min: 0.35, max: 0.65, decimals: 3 }],
  measurements: [{ key: 't', label: 'Thời gian đi hết s', unit: 's', decimals: 3 }],
  derived: [{ key: 'a', label: 'Gia tốc a', unit: 'm/s²', decimals: 3, expr: '2 * s / 100 / t ^ 2' }],
  charts: [{ id: 'a-F', title: 'Gia tốc theo lực kéo', kind: 'scatter', fit: 'linear', x: 'F', y: 'a', xLabel: 'F (N)', yLabel: 'a (m/s²)' }, { id: 't-s', title: 'Thời gian theo quãng đường', kind: 'scatter', x: 's', y: 't', xLabel: 's (cm)', yLabel: 't (s)' }],
  minTrials: 4,
  result: { key: 'M', label: 'Khối lượng xe trượt M', unit: 'kg', tolerancePercent: 3, decimals: 3, hint: 'Mỗi lần đo: a = 2s/t² (s theo mét), M = F/a − m (m theo kg), rồi lấy trung bình.' },
  steps: [
    { id: 's1', title: 'Bật bơm đệm khí', instruction: 'Chạm vào máy bơm để tạo lớp đệm khí giảm ma sát.', action: 'click', trigger: 'timer' },
    { id: 's2', title: 'Đặt cổng quang điện', instruction: 'Kéo cổng quang điện tới điểm gắn cách vị trí xuất phát quãng s.', action: 'snap', trigger: 'gate-slot' },
    { id: 's3', title: 'Chọn lực kéo và gia trọng', instruction: 'Chỉnh lực kéo F và khối lượng gia trọng m.', action: 'adjust' },
    { id: 's4', title: 'Thả xe – đo t', instruction: 'Chạm vào xe (hoặc nút Đo) để thả xe, đọc thời gian.', action: 'measure', trigger: 'ball' },
    { id: 's5', title: 'Ghi số liệu và tính M', instruction: 'Đo ít nhất 4 lần với F hoặc m khác nhau, tính a và M.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'cart-crash', title: 'Xe va đập mạnh', message: 'Gia tốc > 5 m/s²: xe đâm mạnh vào cuối đệm khí, có thể hỏng xe. Giảm lực kéo hoặc thêm gia trọng.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Một vật đang chuyển động, nếu mọi lực tác dụng mất đi thì vật sẽ:', options: ['Dừng lại ngay', 'Chuyển động chậm dần rồi dừng', 'Tiếp tục chuyển động thẳng đều', 'Rơi xuống'], correctIndex: 2, explanation: 'Định luật I Newton: không cần lực để duy trì chuyển động.', misconceptionId: 'phy-force-needed-motion' },
    { id: 'q2', prompt: 'Giữ nguyên lực, tăng khối lượng gấp đôi thì gia tốc:', options: ['Tăng gấp đôi', 'Giảm một nửa', 'Không đổi', 'Tăng 4 lần'], correctIndex: 1, explanation: 'a = F/m tỉ lệ nghịch với m.' },
    { id: 'q3', prompt: 'Khối lượng là đại lượng đặc trưng cho:', options: ['Trọng lượng vật', 'Mức quán tính của vật', 'Thể tích vật', 'Tốc độ vật'], correctIndex: 1, explanation: 'Khối lượng đặc trưng cho mức quán tính; trọng lượng là lực hút của Trái Đất.', misconceptionId: 'phy-mass-weight' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'F = 0,5 N, s = 0,5 m, t = 1,00 s, m = 0. Khối lượng xe là:', options: ['0,25 kg', '0,50 kg', '1,0 kg', '0,125 kg'], correctIndex: 1, explanation: 'a = 2s/t² = 2·0,5/1,00² = 1,0 m/s² ⇒ M = F/a − m = 0,5/1,0 − 0 = 0,50 kg.' },
    { id: 'p2', prompt: 'Vì sao dùng đệm khí trong thí nghiệm?', options: ['Để xe nặng hơn', 'Để giảm ma sát tới mức bỏ qua được', 'Để đo nhiệt độ', 'Để tăng lực kéo'], correctIndex: 1, explanation: 'Đệm khí nâng xe, gần như loại bỏ ma sát.' },
    { id: 'p3', prompt: 'Đồ thị a theo F (m không đổi) có dạng:', options: ['Đường thẳng qua gốc tọa độ', 'Parabol', 'Hyperbol', 'Đường nằm ngang'], correctIndex: 0, explanation: 'a = F/m: a tỉ lệ thuận với F.', misconceptionId: 'phy-force-needed-motion' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu mối quan hệ giữa gia tốc, lực và khối lượng; ghi kết quả M.',
  conclusionKeywords: ['gia tốc', 'tỉ lệ thuận', 'tỉ lệ nghịch', 'khối lượng'],
  tags: ['định luật Newton', 'đệm khí', 'gia tốc'],
  source: 'builtin'
};
