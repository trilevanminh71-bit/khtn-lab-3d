/**
 * Plugin Vật lí 10 — Bài 30: Thực hành xác định động lượng của vật trước và sau va chạm.
 * Bộ giải: momentum-collision. Thông số ẩn loss: phần động lượng hao hụt do ma sát còn lại trên băng đệm khí.
 */
import type { LabPluginDef } from '../../types/lab';
import { quiz } from '../pluginHelpers';

export const momentumCollisionPlugin: LabPluginDef = {
  id: 'vl10-dong-luong-va-cham',
  version: 1,
  subject: 'physics',
  title: 'Thực hành: Xác định động lượng của vật trước và sau va chạm',
  shortTitle: 'Bài 30 – Động lượng, va chạm',
  sgkRef: 'Vật lí 10 – Bài 30: Thực hành: Xác định động lượng của vật trước và sau va chạm',
  chapter: 'Chương V. Động lượng',
  grade: 10,
  durationMin: 40,
  objectives: [
    'Đo tốc độ xe bằng tấm cản quang L = 0,1 m và cổng quang điện: v = L/t.',
    'Tính động lượng p = mv của hệ trước và sau va chạm mềm, va chạm đàn hồi.',
    'Đánh giá sai lệch δ = |p trước − p sau|/p trước × 100% theo ngưỡng 5%.'
  ],
  theory:
    'Băng đệm khí làm ma sát rất nhỏ nên hệ hai xe gần như kín theo phương ngang. Va chạm mềm: hai xe dính vào nhau, m₁v₁ + m₂v₂ = (m₁ + m₂)v′. Va chạm đàn hồi: m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′. Tốc độ xe được suy từ thời gian tấm cản quang (dài L) chắn cổng: v = L/t. Trong bảng, t = 0 nghĩa là xe đứng yên.',
  equation: 'v = L/t ; p = m·v',
  sceneTemplate: 'airtrack',
  sceneOptions: {},
  solverId: 'momentum-collision',
  params: [
    { key: 'type', label: 'Loại va chạm', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Mềm' }, { value: 1, label: 'Đàn hồi' }] },
    { key: 'm1', label: 'Khối lượng xe 1', unit: 'g', min: 100, max: 500, step: 50, default: 300 },
    { key: 'm2', label: 'Khối lượng xe 2', unit: 'g', min: 100, max: 500, step: 50, default: 200 },
    { key: 'v1', label: 'Mức đẩy xe 1', unit: 'cm/s', min: 20, max: 80, step: 5, default: 50 },
    { key: 'v2', label: 'Mức đẩy xe 2 (cùng chiều)', unit: 'cm/s', min: 0, max: 40, step: 5, default: 0 }
  ],
  hidden: [{ key: 'loss', label: 'Hao hụt động lượng', unit: '', min: 0.004, max: 0.022, decimals: 4 }],
  measurements: [
    { key: 't1', label: 't₁ (xe 1 trước)', unit: 's', decimals: 3 },
    { key: 't2', label: 't₂ (xe 2 trước)', unit: 's', decimals: 3 },
    { key: 'tp', label: 't′ (hai xe sau)', unit: 's', decimals: 3, showIf: { key: 'type', in: [0] } },
    { key: 't1p', label: 't₁′ (xe 1 sau)', unit: 's', decimals: 3, showIf: { key: 'type', in: [1] } },
    { key: 'dir1', label: 'Chiều xe 1 sau', unit: '', decimals: 0, showIf: { key: 'type', in: [1] }, valueLabels: { '1': 'cùng chiều', '-1': 'bật ngược', '0': 'đứng yên' } },
    { key: 't2p', label: 't₂′ (xe 2 sau)', unit: 's', decimals: 3, showIf: { key: 'type', in: [1] } }
  ],
  derived: [
    { key: 'v1', label: 'v₁', unit: 'm/s', decimals: 3 },
    { key: 'v2', label: 'v₂', unit: 'm/s', decimals: 3 },
    { key: 'va', label: 'v′', unit: 'm/s', decimals: 3, showIf: { key: 'type', in: [0] } },
    { key: 'v1a', label: 'v₁′', unit: 'm/s', decimals: 3, showIf: { key: 'type', in: [1] } },
    { key: 'v2a', label: 'v₂′', unit: 'm/s', decimals: 3, showIf: { key: 'type', in: [1] } },
    { key: 'pb', label: 'p trước', unit: 'kg·m/s', decimals: 4 },
    { key: 'pa', label: 'p sau', unit: 'kg·m/s', decimals: 4 },
    { key: 'delta', label: 'Sai lệch δ', unit: '%', decimals: 2 }
  ],
  charts: [
    { id: 'pb-pa', title: 'Động lượng sau theo động lượng trước', kind: 'scatter', x: 'pb', y: 'pa', xLabel: 'p trước (kg·m/s)', yLabel: 'p sau (kg·m/s)', groupBy: 'type' },
    { id: 'delta', title: 'Sai lệch δ theo lần đo', kind: 'bar', x: 'index', y: 'delta', xLabel: 'Lần đo', yLabel: 'δ (%)', refLine: { value: 5, label: 'ngưỡng 5%' } }
  ],
  minTrials: 4,
  result: { key: 'p', label: 'Tổng động lượng của hệ TRƯỚC va chạm (theo lần đo cuối)', unit: 'kg·m/s', tolerancePercent: 5, decimals: 4, hint: 'v = 0,1/t cho từng xe rồi p = m₁v₁ + m₂v₂ (m đổi sang kg).' },
  steps: [
    { id: 's1', title: 'Bật bơm đệm khí', instruction: 'Chạm vào bơm nén khí để nâng xe.', action: 'click', trigger: 'pump' },
    { id: 's2', title: 'Đặt cổng quang điện 2', instruction: 'Kéo cổng quang điện 2 vào điểm gắn trên băng.', action: 'snap', trigger: 'gate-slot' },
    { id: 's3', title: 'Chọn loại va chạm và khối lượng', instruction: 'Chọn mềm/đàn hồi, khối lượng và mức đẩy; mỗi lần chỉ đổi một đại lượng.', action: 'adjust' },
    { id: 's4', title: 'Đẩy xe – đọc thời gian', instruction: 'Chạm vào bộ đẩy (hoặc nút Đo) và đọc các thời gian chắn cổng.', action: 'measure', trigger: 'launcher' },
    { id: 's5', title: 'Tính động lượng, đánh giá', instruction: 'Đo ít nhất 4 lần, đủ cả hai loại va chạm; so sánh p trước và p sau.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'no-collision', title: 'Hai xe không va chạm', message: 'Xe 2 chạy nhanh bằng hoặc hơn xe 1 nên xe 1 không đuổi kịp. Hãy giảm mức đẩy xe 2.', severity: 'danger' }],
  preQuiz: [
    quiz('q1', 'Động lượng của vật được xác định bằng:', ['p = m·v', 'p = ½mv²', 'p = m·g', 'p = F·s'], 0, 'p = m·v, là đại lượng vectơ cùng hướng với vận tốc.'),
    quiz('q2', 'Trong va chạm mềm của hệ kín:', ['Động lượng mất đi', 'Động lượng bảo toàn, động năng giảm', 'Cả hai đều bảo toàn', 'Động năng bảo toàn, động lượng giảm'], 1, 'Một phần động năng chuyển thành dạng năng lượng khác.', 'phy-momentum-lost'),
    quiz('q3', 'Vai trò của băng đệm khí là:', ['Làm xe nặng hơn', 'Giảm ma sát để hệ gần như kín', 'Tăng tốc độ xe', 'Đo thời gian'], 1, 'Ma sát nhỏ nên ngoại lực theo phương ngang không đáng kể.')
  ],
  postQuiz: [
    quiz('p1', 'Tấm cản quang 0,1 m chắn cổng 0,200 s. Tốc độ xe:', ['0,02 m/s', '0,5 m/s', '2 m/s', '5 m/s'], 1, 'v = 0,1/0,200 = 0,5 m/s.'),
    quiz('p2', 'm₁ = m₂, xe 2 đứng yên, va chạm đàn hồi. Sau va chạm:', ['Hai xe cùng đứng yên', 'Xe 1 dừng, xe 2 chuyển động với tốc độ ban đầu của xe 1', 'Hai xe dính nhau', 'Xe 1 bật ngược cùng tốc độ'], 1, 'Hai vật cùng khối lượng trao đổi vận tốc cho nhau.', 'phy-momentum-lost'),
    quiz('p3', 'p trước = 0,150; p sau = 0,147 kg·m/s. δ =', ['2%', '3%', '0,3%', '20%'], 0, 'δ = 0,003/0,150 = 2%.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Kết luận về sự bảo toàn động lượng trong hai loại va chạm và nguyên nhân sai lệch.',
  conclusionKeywords: ['động lượng', 'bảo toàn', 'va chạm'],
  tags: ['động lượng', 'va chạm mềm', 'va chạm đàn hồi', 'đệm khí'],
  source: 'builtin'
};
