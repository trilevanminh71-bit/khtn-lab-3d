/**
 * Plugin Vật lí 10 — Đo gia tốc rơi tự do (SGK KNTT Vật lí 10, Bài 11).
 * Bộ giải: free-fall. Thông số ẩn g ∈ [9,76; 9,83] m/s² theo từng học sinh.
 * Đại lượng kết quả: g = 2s/t² (trung bình các lần đo).
 */
import type { LabPluginDef } from '../../types/lab';

export const freeFallPlugin: LabPluginDef = {
  id: 'vl10-gia-toc-roi-tu-do',
  version: 1,
  subject: 'physics',
  title: 'Đo gia tốc rơi tự do',
  shortTitle: 'Gia tốc rơi tự do',
  sgkRef: 'Vật lí 10 – Bài 11: Thực hành đo gia tốc rơi tự do',
  chapter: 'Chương II. Động học',
  grade: 10,
  durationMin: 25,
  objectives: [
    'Bố trí được thí nghiệm đo thời gian rơi bằng nam châm điện và cổng quang điện.',
    'Xác định được gia tốc rơi tự do g = 2s/t².',
    'Đánh giá sai số và nhận xét kết quả so với giá trị tham khảo 9,8 m/s².'
  ],
  theory:
    'Vật rơi tự do không vận tốc đầu chuyển động nhanh dần đều: s = ½·g·t². Ngắt nam châm điện, vật bắt đầu rơi đồng thời đồng hồ bắt đầu đếm; khi vật chắn cổng quang điện cách điểm thả quãng s, đồng hồ dừng. Từ đó g = 2s/t².',
  equation: 'g = 2s / t²',
  sceneTemplate: 'track',
  sceneOptions: { orientation: 'vertical', objectLabel: 'Trụ thép', gateLabel: 'Cổng quang điện E', timerMode: 'A↔B' },
  solverId: 'free-fall',
  params: [{ key: 's', label: 'Quãng đường rơi s', unit: 'cm', min: 10, max: 80, step: 5, default: 50, description: 'Khoảng cách từ điểm thả đến cổng quang điện' }],
  hidden: [{ key: 'g', label: 'Gia tốc rơi tự do', unit: 'm/s²', min: 9.76, max: 9.83, decimals: 3 }],
  measurements: [{ key: 't', label: 'Thời gian rơi t', unit: 's', decimals: 3 }],
  minTrials: 5,
  result: { key: 'g', label: 'Gia tốc rơi tự do g', unit: 'm/s²', tolerancePercent: 1.5, decimals: 2, hint: 'Với mỗi lần đo tính gᵢ = 2sᵢ/tᵢ² (s đổi sang mét) rồi lấy trung bình.' },
  steps: [
    { id: 's1', title: 'Gắn cổng quang điện', instruction: 'Kéo cổng quang điện vào giá đỡ trên thước thẳng đứng.', action: 'snap', trigger: 'gate-slot' },
    { id: 's2', title: 'Hút vật vào nam châm điện', instruction: 'Chạm vào nam châm điện để hút trụ thép ở vị trí thả.', action: 'click', trigger: 'release' },
    { id: 's3', title: 'Chọn quãng đường s', instruction: 'Dịch cổng quang điện để chọn quãng đường rơi s.', action: 'adjust' },
    { id: 's4', title: 'Ngắt điện – đo t', instruction: 'Chạm vào trụ thép (hoặc nút Đo) để ngắt nam châm, đọc thời gian rơi.', action: 'measure', trigger: 'ball' },
    { id: 's5', title: 'Đo lặp & tính g', instruction: 'Đo ít nhất 5 lần (có thể ở nhiều độ cao), tính g và sai số.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'gate-too-close', title: 'Cổng quang điện quá gần', message: 'Quãng đường < 15 cm khiến thời gian rơi quá ngắn, sai số tương đối rất lớn. Hãy tăng s.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Thả đồng thời viên bi thép và tờ giấy vo tròn chặt cùng cỡ trong không khí, hiện tượng?', options: ['Bi rơi nhanh hơn nhiều', 'Hai vật chạm đất gần như cùng lúc', 'Giấy rơi nhanh hơn', 'Không vật nào rơi'], correctIndex: 1, explanation: 'Khi lực cản không đáng kể, mọi vật rơi với cùng gia tốc g.', misconceptionId: 'phy-heavy-falls-faster' },
    { id: 'q2', prompt: 'Chuyển động rơi tự do là chuyển động:', options: ['Thẳng đều', 'Thẳng nhanh dần đều', 'Thẳng chậm dần đều', 'Tròn đều'], correctIndex: 1, explanation: 'Gia tốc không đổi bằng g, cùng chiều chuyển động.' },
    { id: 'q3', prompt: 'Công thức quãng đường rơi tự do không vận tốc đầu:', options: ['s = g·t', 's = ½·g·t²', 's = g/t²', 's = 2g·t²'], correctIndex: 1, explanation: 's = ½·g·t².' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 's = 0,50 m, t = 0,320 s. Gia tốc g đo được ≈', options: ['9,77 m/s²', '3,13 m/s²', '1,56 m/s²', '19,5 m/s²'], correctIndex: 0, explanation: 'g = 2·0,50/0,320² ≈ 9,77 m/s².' },
    { id: 'p2', prompt: 'Tăng khối lượng trụ thép gấp đôi thì thời gian rơi cùng quãng đường:', options: ['Giảm một nửa', 'Không đổi', 'Tăng gấp đôi', 'Giảm 4 lần'], correctIndex: 1, explanation: 'g không phụ thuộc khối lượng vật.', misconceptionId: 'phy-heavy-falls-faster' },
    { id: 'p3', prompt: 'Nguyên nhân chính gây sai số hệ thống trong thí nghiệm này là:', options: ['Lực cản không khí và trễ nam châm', 'Màu của vật', 'Nhiệt độ phòng', 'Tên học sinh'], correctIndex: 0, explanation: 'Lực cản và thời gian khử từ của nam châm làm t đo lớn hơn thực tế.' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Viết kết quả g = ḡ ± Δg và so sánh với giá trị 9,8 m/s².',
  conclusionKeywords: ['gia tốc', 'sai số', 'khối lượng'],
  tags: ['rơi tự do', 'nam châm điện', 'cổng quang điện'],
  source: 'builtin'
};
