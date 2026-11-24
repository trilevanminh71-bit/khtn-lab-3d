/**
 * Plugin Vật lí 10 — Đo tốc độ tức thời bằng cổng quang điện (SGK KNTT Vật lí 10, Bài 6).
 * Bộ giải: photogate-speed. Thông số ẩn k: hệ số chuyển hóa thế năng → động năng tịnh tiến của bi lăn.
 * Đại lượng kết quả: v (m/s) = d / Δt̄ tại độ cao đã chọn.
 */
import type { LabPluginDef } from '../../types/lab';

export const photogateSpeedPlugin: LabPluginDef = {
  id: 'vl10-toc-do-cong-quang-dien',
  version: 1,
  subject: 'physics',
  title: 'Đo tốc độ của vật chuyển động thẳng bằng cổng quang điện',
  shortTitle: 'Tốc độ – cổng quang điện',
  sgkRef: 'Vật lí 10 – Bài 6: Thực hành đo tốc độ của vật chuyển động thẳng',
  chapter: 'Chương II. Động học',
  grade: 10,
  durationMin: 20,
  objectives: [
    'Sử dụng được đồng hồ đo thời gian hiện số và cổng quang điện.',
    'Đo được tốc độ tức thời của viên bi tại cổng quang điện: v = d/Δt.',
    'Tính được giá trị trung bình và sai số tuyệt đối của phép đo.'
  ],
  theory:
    'Khi viên bi có đường kính d đi qua cổng quang điện, đồng hồ đo thời gian chắn sáng Δt. Vì d rất nhỏ nên tốc độ trung bình trên đoạn d xấp xỉ tốc độ tức thời: v ≈ d/Δt. Đo lặp lại nhiều lần để tính Δt̄ và sai số Δ(Δt).',
  equation: 'v = d / Δt',
  sceneTemplate: 'track',
  sceneOptions: { orientation: 'incline', objectLabel: 'Viên bi thép', gateLabel: 'Cổng quang điện', timerMode: 'A' },
  solverId: 'photogate-speed',
  params: [
    { key: 'h', label: 'Độ cao thả bi', unit: 'cm', min: 5, max: 40, step: 1, default: 15, description: 'Độ cao điểm thả so với cổng quang điện' },
    { key: 'd', label: 'Đường kính viên bi', unit: 'cm', min: 1, max: 3, step: 0.1, default: 2, description: 'Đo bằng thước kẹp' }
  ],
  hidden: [{ key: 'k', label: 'Hệ số chuyển hóa năng lượng', unit: '', min: 0.66, max: 0.74, decimals: 3 }],
  measurements: [{ key: 'dt', label: 'Thời gian chắn sáng Δt', unit: 's', decimals: 4 }],
  minTrials: 5,
  result: {
    key: 'v',
    label: 'Tốc độ tức thời v tại cổng quang điện',
    unit: 'm/s',
    tolerancePercent: 3,
    decimals: 3,
    hint: 'Tính Δt̄ của các lần đo cùng độ cao rồi lấy v = d/Δt̄ (đổi d sang mét).'
  },
  steps: [
    { id: 's1', title: 'Lắp cổng quang điện', instruction: 'Kéo cổng quang điện vào vị trí cuối máng nghiêng (điểm gắn phát sáng).', action: 'snap', trigger: 'gate-slot' },
    { id: 's2', title: 'Bật đồng hồ hiện số', instruction: 'Chạm vào đồng hồ đo thời gian để bật, chọn chế độ A.', action: 'click', trigger: 'timer' },
    { id: 's3', title: 'Chọn độ cao và đường kính bi', instruction: 'Chỉnh độ cao thả bi h và nhập đường kính d đo bằng thước kẹp.', action: 'adjust' },
    { id: 's4', title: 'Thả bi và đọc Δt', instruction: 'Chạm vào viên bi (hoặc nút Đo) để thả bi, đọc thời gian chắn sáng.', action: 'measure', trigger: 'ball' },
    { id: 's5', title: 'Lặp lại và ghi số liệu', instruction: 'Thả bi ít nhất 5 lần ở cùng độ cao, ghi vào bảng rồi tính v.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [
    { id: 'ball-jump', title: 'Bi văng khỏi máng', message: 'Độ cao quá lớn (> 35 cm) làm bi nảy khỏi máng, có thể rơi vỡ cổng quang điện. Hãy giảm độ cao.', severity: 'warning' }
  ],
  preQuiz: [
    { id: 'q1', prompt: 'Cổng quang điện dùng để đo đại lượng nào?', options: ['Quãng đường', 'Thời gian vật chắn chùm tia sáng', 'Khối lượng', 'Lực'], correctIndex: 1, explanation: 'Cổng quang điện phát hiện khi vật chắn tia hồng ngoại; đồng hồ hiện số đo khoảng thời gian chắn sáng.' },
    { id: 'q2', prompt: 'Vì sao v = d/Δt được xem là tốc độ tức thời?', options: ['Vì d rất nhỏ nên Δt rất nhỏ', 'Vì vật chuyển động đều', 'Vì đồng hồ rất đắt', 'Vì không có ma sát'], correctIndex: 0, explanation: 'Khi Δt rất nhỏ, tốc độ trung bình trên đoạn d tiến tới tốc độ tức thời.', misconceptionId: 'phy-speed-avg-instant' },
    { id: 'q3', prompt: 'Đo Δt mấy lần là hợp lí?', options: ['1 lần là đủ', 'Nhiều lần rồi lấy trung bình', 'Chỉ khi kết quả sai', 'Không cần đo'], correctIndex: 1, explanation: 'Đo nhiều lần giúp giảm sai số ngẫu nhiên.', misconceptionId: 'phy-error-one-trial' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Bi đường kính 2,0 cm chắn sáng 0,020 s. Tốc độ tức thời là:', options: ['0,1 m/s', '1,0 m/s', '10 m/s', '0,4 m/s'], correctIndex: 1, explanation: 'v = 0,020 m / 0,020 s = 1,0 m/s.' },
    { id: 'p2', prompt: 'Tăng độ cao thả bi thì Δt đo được sẽ:', options: ['Tăng', 'Giảm', 'Không đổi', 'Bằng 0'], correctIndex: 1, explanation: 'Độ cao lớn → tốc độ lớn → thời gian chắn sáng ngắn hơn.' },
    { id: 'p3', prompt: 'Sai số tuyệt đối trung bình được tính bằng:', options: ['Giá trị lớn nhất trừ nhỏ nhất', 'Trung bình các |x̄ − xᵢ|', 'Giá trị đầu tiên', 'Tổng các lần đo'], correctIndex: 1, explanation: 'Δx̄ = (Σ|x̄ − xᵢ|)/n theo SGK.', misconceptionId: 'phy-error-one-trial' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu giá trị tốc độ đo được (kèm sai số) và nhận xét ảnh hưởng của độ cao thả bi.',
  conclusionKeywords: ['tốc độ', 'sai số', 'độ cao'],
  tags: ['cổng quang điện', 'tốc độ tức thời', 'đồng hồ hiện số'],
  source: 'builtin'
};
