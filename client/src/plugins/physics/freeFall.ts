/**
 * Plugin Vật lí 10 — Bài 11: Thực hành đo gia tốc rơi tự do.
 * Bộ giải: free-fall-2gates. Thông số ẩn g theo từng học sinh. Kết quả: g = ḡ ± Δḡ (5 lần đo).
 */
import type { LabPluginDef } from '../../types/lab';
import { quiz } from '../pluginHelpers';

export const freeFallPlugin: LabPluginDef = {
  id: 'vl10-gia-toc-roi-tu-do',
  version: 2,
  subject: 'physics',
  title: 'Thực hành: Đo gia tốc rơi tự do',
  shortTitle: 'Bài 11 – Gia tốc rơi tự do',
  sgkRef: 'Vật lí 10 – Bài 11: Thực hành: Đo gia tốc rơi tự do',
  chapter: 'Chương II. Động học',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Bố trí thí nghiệm rơi thẳng đứng với nam châm điện, trụ thép và hai cổng quang điện cách nhau quãng đường s.',
    'Đo 5 lần, tính gᵢ = 2s/tᵢ², ḡ, sai số từng lần Δgᵢ = |gᵢ − ḡ| và sai số trung bình.',
    'Viết kết quả g = ḡ ± Δḡ (m/s²), so sánh với 9,8 m/s² và phân tích nguồn sai số.'
  ],
  theory:
    'Nam châm điện N giữ trụ thép; cổng quang điện E đặt sát đáy trụ để đồng hồ chạy đúng lúc vật bắt đầu rơi (v₀ ≈ 0), cổng F cách E quãng đường s. Vật rơi tự do: s = ½gt² ⇒ g = 2s/t². Nếu đặt E thấp hơn điểm thả thì v₀ ≠ 0, công thức không còn đúng và g tính được lớn hơn thực.',
  equation: 'gᵢ = 2s / tᵢ² ; g = ḡ ± Δḡ',
  sceneTemplate: 'track',
  sceneOptions: { rig: 'freefall2' },
  solverId: 'free-fall-2gates',
  params: [
    { key: 's', label: 'Quãng đường s giữa hai cổng', unit: 'cm', min: 10, max: 80, step: 5, default: 50 },
    { key: 'x0', label: 'Cổng E thấp hơn đáy trụ thép', unit: 'mm', min: 0, max: 20, step: 1, default: 0, description: 'Khảo sát sai số hệ thống khi đặt cổng E sai' }
  ],
  hidden: [{ key: 'g', label: 'Gia tốc rơi tự do', unit: 'm/s²', min: 9.76, max: 9.83, decimals: 3 }],
  measurements: [{ key: 't', label: 'Thời gian t', unit: 's', decimals: 3 }],
  derived: [
    { key: 'gi', label: 'gᵢ = 2s/t²', unit: 'm/s²', decimals: 3 },
    { key: 'dg', label: 'Δgᵢ = |gᵢ − ḡ|', unit: 'm/s²', decimals: 3 }
  ],
  charts: [
    { id: 'g-trial', title: 'gᵢ theo lần đo', kind: 'line', x: 'index', y: 'gi', xLabel: 'Lần đo', yLabel: 'g (m/s²)', refLine: { value: 9.8, label: '9,8' } },
    { id: 't-s', title: 'Thời gian rơi theo quãng đường', kind: 'scatter', x: 's', y: 't', xLabel: 's (cm)', yLabel: 't (s)' }
  ],
  minTrials: 5,
  result: { key: 'g', label: 'Gia tốc rơi tự do ḡ', unit: 'm/s²', tolerancePercent: 1.5, decimals: 2, hint: 'Với mỗi lần đo tính gᵢ = 2s/tᵢ² (s đổi sang mét) rồi lấy trung bình 5 lần.' },
  steps: [
    { id: 's1', title: 'Bật đồng hồ MODE A ↔ B', instruction: 'Chạm vào đồng hồ, chọn MODE A ↔ B, thang 0,001 s.', action: 'click', trigger: 'timer' },
    { id: 's2', title: 'Hút trụ thép vào nam châm N', instruction: 'Chạm vào nam châm điện để giữ trụ thép.', action: 'click', trigger: 'release' },
    { id: 's3', title: 'Đặt quãng đường s', instruction: 'Kéo cổng F dọc giá (hoặc thanh trượt) để chọn s; giữ cổng E sát đáy trụ (0 mm).', action: 'adjust' },
    { id: 's4', title: 'Ngắt điện – đọc t', instruction: 'Chạm vào trụ thép (hoặc nút Đo) để thả rơi.', action: 'measure', trigger: 'ball' },
    { id: 's5', title: 'Đo đủ 5 lần, tính g', instruction: 'Đo 5 lần, đọc bảng gᵢ, Δgᵢ và viết kết quả g = ḡ ± Δḡ.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'gate-too-close', title: 'Quãng đường rơi quá ngắn', message: 's < 15 cm khiến t rất nhỏ, sai số tỉ đối lớn. Hãy tăng s.', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Thả đồng thời viên bi thép và tờ giấy vo tròn chặt cùng cỡ trong không khí:', ['Bi rơi nhanh hơn nhiều', 'Hai vật chạm đất gần như cùng lúc', 'Giấy rơi nhanh hơn', 'Không vật nào rơi'], 1, 'Khi lực cản không đáng kể, mọi vật rơi với cùng gia tốc g.', 'phy-heavy-falls-faster'),
    quiz('q2', 'Vì sao cổng E phải đặt sát đáy trụ thép?', ['Để vận tốc lúc bắt đầu đo bằng 0', 'Để dễ nhìn', 'Để trụ thép không rơi', 'Để s lớn hơn'], 0, 'Công thức s = ½gt² giả thiết v₀ = 0.'),
    quiz('q3', 'Công thức quãng đường rơi tự do không vận tốc đầu:', ['s = g·t', 's = ½·g·t²', 's = g/t²', 's = 2g·t²'], 1, 's = ½gt².')
  ],
  postQuiz: [
    quiz('p1', 's = 0,50 m, t = 0,320 s. Gia tốc g đo được ≈', ['9,77 m/s²', '3,13 m/s²', '1,56 m/s²', '19,5 m/s²'], 0, 'g = 2·0,50/0,320² ≈ 9,77 m/s².'),
    quiz('p2', 'Tăng khối lượng trụ thép gấp đôi thì thời gian rơi cùng quãng đường:', ['Giảm một nửa', 'Không đổi', 'Tăng gấp đôi', 'Giảm 4 lần'], 1, 'g không phụ thuộc khối lượng.', 'phy-heavy-falls-faster'),
    quiz('p3', 'Cổng E đặt thấp hơn điểm thả vài milimét thì g tính theo 2s/t² sẽ:', ['Nhỏ hơn thực', 'Lớn hơn thực', 'Không đổi', 'Bằng 0'], 1, 'Vật đã có vận tốc khi qua E nên t ngắn hơn → g tính được lớn hơn.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Viết kết quả g = ḡ ± Δḡ, so sánh với 9,8 m/s² và nêu nguồn sai số.',
  conclusionKeywords: ['gia tốc', 'sai số', '9,8'],
  tags: ['rơi tự do', 'nam châm điện', 'cổng quang điện'],
  source: 'builtin'
};
