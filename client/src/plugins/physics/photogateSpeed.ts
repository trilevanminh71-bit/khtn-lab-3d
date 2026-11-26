/**
 * Plugin Vật lí 10 — Bài 6: Thực hành đo tốc độ của vật chuyển động.
 * Bộ giải: photogate-mc964. Thông số ẩn k: hệ số gia tốc của bi lăn trên máng (lí tưởng 5/7).
 * Kết quả: tốc độ (m/s) ứng với chế độ đo và bộ thông số của lần đo cuối.
 */
import type { LabPluginDef } from '../../types/lab';
import { quiz } from '../pluginHelpers';

export const photogateSpeedPlugin: LabPluginDef = {
  id: 'vl10-toc-do-cong-quang-dien',
  version: 2,
  subject: 'physics',
  title: 'Thực hành: Đo tốc độ của vật chuyển động',
  shortTitle: 'Bài 6 – Thực hành: Đo tốc độ',
  sgkRef: 'Vật lí 10 – Bài 6: Thực hành: Đo tốc độ của vật chuyển động',
  chapter: 'Chương II. Động học',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Sử dụng được đồng hồ đo thời gian hiện số MC964 với các chế độ MODE A ↔ B, MODE A, MODE B và hai thang đo 0,001 s / 0,01 s.',
    'Đo tốc độ trung bình: đo lặp 3 lần quãng đường s và thời gian t giữa hai cổng quang điện E, F.',
    'Đo tốc độ tức thời dựa vào đường kính viên bi d và thời gian chắn cổng: v = d/t.',
    'Tính giá trị trung bình, sai số Δs, Δt và viết kết quả v = v̄ ± Δv.'
  ],
  theory:
    'Viên bi thép được nam châm điện N giữ ở đầu máng nghiêng; ngắt điện thì bi lăn xuống qua hai cổng quang điện E và F. MODE A ↔ B: đồng hồ đo thời gian bi đi từ E đến F → tốc độ trung bình v̄ = s/t. MODE A (hoặc B): đồng hồ đo thời gian bi chắn cổng E (hoặc F); trong thời gian rất ngắn đó bi đi quãng đường bằng đường kính d → tốc độ tức thời v = d/t. Nhấn RESET để đưa đồng hồ về 0 trước mỗi lần đo.',
  equation: 'v̄ = s / t ; v = d / t',
  sceneTemplate: 'track',
  sceneOptions: { rig: 'mc964', objectLabel: 'Viên bi thép' },
  solverId: 'photogate-mc964',
  params: [
    { key: 'mode', label: 'Chế độ đồng hồ', unit: '', min: 0, max: 2, step: 1, default: 0, options: [{ value: 0, label: 'MODE A ↔ B' }, { value: 1, label: 'MODE A' }, { value: 2, label: 'MODE B' }] },
    { key: 'scale', label: 'Thang đo', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: '0,001 s' }, { value: 1, label: '0,01 s' }] },
    { key: 'xE', label: 'Vị trí cổng E', unit: 'cm', min: 10, max: 60, step: 1, default: 20 },
    { key: 'xF', label: 'Vị trí cổng F', unit: 'cm', min: 30, max: 100, step: 1, default: 70 },
    { key: 'd', label: 'Đường kính viên bi d', unit: 'cm', min: 1, max: 3, step: 0.1, default: 2 },
    { key: 'angle', label: 'Góc nghiêng của máng', unit: '°', min: 3, max: 15, step: 1, default: 6 }
  ],
  hidden: [{ key: 'k', label: 'Hệ số gia tốc lăn', unit: '', min: 0.68, max: 0.735, decimals: 3 }],
  measurements: [
    { key: 's', label: 'Quãng đường s', unit: 'cm', decimals: 1, showIf: { key: 'mode', in: [0] } },
    { key: 't', label: 'Thời gian t', unit: 's', decimals: 3 }
  ],
  derived: [{ key: 'v', label: 'Tốc độ v', unit: 'm/s', decimals: 3 }],
  charts: [
    { id: 'v-trial', title: 'Tốc độ theo lần đo', kind: 'line', x: 'index', y: 'v', xLabel: 'Lần đo', yLabel: 'v (m/s)', groupBy: 'mode' },
    { id: 't-trial', title: 'Thời gian theo lần đo', kind: 'line', x: 'index', y: 't', xLabel: 'Lần đo', yLabel: 't (s)', groupBy: 'mode' }
  ],
  tools: ['mc964'],
  tables: [
    { title: 'Bảng 6.1 – Đo tốc độ trung bình (MODE A ↔ B)', showIf: { key: 'mode', in: [0] } },
    { title: 'Bảng 6.2 – Đo tốc độ tức thời qua đường kính bi d (MODE A, MODE B)', showIf: { key: 'mode', in: [1, 2] } }
  ],
  minTrials: 3,
  result: { key: 'v', label: 'Tốc độ của viên bi (theo chế độ và thông số lần đo cuối)', unit: 'm/s', tolerancePercent: 3, decimals: 3, hint: 'MODE A ↔ B: v̄ = s̄/t̄ (3 lần đo). MODE A/B: v = d/t̄. Đổi cm sang m.' },
  steps: [
    { id: 's1', title: 'Bật đồng hồ, chọn chế độ và thang đo', instruction: 'Chạm vào đồng hồ MC964; chọn MODE và thang đo ở bảng điều khiển đồng hồ.', action: 'click', trigger: 'timer' },
    { id: 's2', title: 'Giữ bi bằng nam châm điện N', instruction: 'Chạm vào nam châm N để giữ viên bi ở đầu máng.', action: 'click', trigger: 'release' },
    { id: 's3', title: 'Đặt cổng E, F và góc nghiêng', instruction: 'Kéo cổng E, F trượt dọc máng (hoặc dùng thanh trượt), đọc s trên thước.', action: 'adjust' },
    { id: 's4', title: 'Thả bi – đọc đồng hồ', instruction: 'Nhấn RESET rồi chạm vào viên bi (hoặc nút Đo) để thả bi, đọc t.', action: 'measure', trigger: 'ball' },
    { id: 's5', title: 'Đo lặp 3 lần, xử lí số liệu', instruction: 'Giữ nguyên bố trí, đo ít nhất 3 lần; xem bảng xử lí số liệu và tính v̄ ± Δv.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [
    { id: 'gate-order', title: 'Cổng F phải ở sau cổng E', message: 'Cổng F đang đặt trước hoặc trùng cổng E nên đồng hồ không đo được. Kéo F về phía chân máng.', severity: 'danger' },
    { id: 'gate-too-close', title: 'Hai cổng quá gần nhau', message: 'Khoảng cách E–F dưới 10 cm khiến sai số tỉ đối của s và t lớn. Hãy tăng khoảng cách.', severity: 'warning' }
  ],
  preQuiz: [
    quiz('q1', 'MODE A ↔ B của đồng hồ MC964 đo:', ['Thời gian chắn cổng E', 'Thời gian vật đi từ cổng E đến cổng F', 'Tốc độ của vật', 'Quãng đường giữa hai cổng'], 1, 'Đồng hồ chạy khi vật tới cổng E và dừng khi vật tới cổng F.'),
    quiz('q2', 'Vì sao v = d/t ở MODE A được coi là tốc độ tức thời?', ['Vì d rất nhỏ nên t rất nhỏ', 'Vì vật chuyển động đều', 'Vì đồng hồ chính xác', 'Vì không có ma sát'], 0, 'Trong khoảng thời gian rất ngắn, tốc độ trung bình gần bằng tốc độ tức thời.', 'phy-speed-avg-instant'),
    quiz('q3', 'Vì sao phải đo lặp lại ít nhất 3 lần?', ['Để giảm sai số ngẫu nhiên', 'Để bi lăn nhanh hơn', 'Để đồng hồ nóng máy', 'Không cần thiết'], 0, 'Lấy trung bình nhiều lần đo làm giảm sai số ngẫu nhiên.', 'phy-error-one-trial')
  ],
  postQuiz: [
    quiz('p1', 's = 50,0 cm, t̄ = 0,640 s. Tốc độ trung bình là:', ['0,78 m/s', '7,8 m/s', '0,32 m/s', '1,28 m/s'], 0, 'v̄ = 0,500/0,640 ≈ 0,78 m/s.'),
    quiz('p2', 'Bi d = 2,0 cm chắn cổng F trong 0,020 s. Tốc độ tức thời tại F:', ['0,1 m/s', '1,0 m/s', '10 m/s', '0,4 m/s'], 1, 'v = 0,020/0,020 = 1,0 m/s.', 'phy-speed-avg-instant'),
    quiz('p3', 'Thước có ĐCNN 1 mm thì sai số dụng cụ Δs lấy bằng:', ['1 cm', '0,5 mm', '0,1 mm', '2 mm'], 1, 'Sai số dụng cụ thường lấy bằng nửa độ chia nhỏ nhất.', 'phy-error-one-trial')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Viết kết quả v = v̄ ± Δv, so sánh tốc độ trung bình với tốc độ tức thời và nêu nguyên nhân sai số.',
  conclusionKeywords: ['tốc độ', 'sai số', 'trung bình'],
  tags: ['cổng quang điện', 'MC964', 'tốc độ trung bình', 'tốc độ tức thời'],
  source: 'builtin'
};
