/**
 * Plugin Vật lí 10 — Bài 22: Thực hành tổng hợp lực (hai lực đồng quy; hai lực song song cùng chiều).
 * Bộ giải: force-composition. Thông số ẩn bias (%): sai lệch hệ thống của lực kế.
 */
import type { LabPluginDef } from '../../types/lab';
import { quiz } from '../pluginHelpers';

export const forceCompositionPlugin: LabPluginDef = {
  id: 'vl10-tong-hop-luc',
  version: 1,
  subject: 'physics',
  title: 'Thực hành: Tổng hợp lực',
  shortTitle: 'Bài 22 – Tổng hợp lực',
  sgkRef: 'Vật lí 10 – Bài 22: Thực hành: Tổng hợp lực',
  chapter: 'Chương III. Động lực học',
  grade: 10,
  durationMin: 40,
  objectives: [
    'Nghiệm lại quy tắc hình bình hành cho hai lực đồng quy.',
    'Nghiệm lại quy tắc hợp hai lực song song cùng chiều: F = F₁ + F₂ và d₁/d₂ = F₂/F₁.',
    'Tính sai lệch δ = |F_LT − F_TN|/F_LT × 100% và đánh giá theo mốc 5%.'
  ],
  theory:
    'Hai lực đồng quy: hợp lực là đường chéo hình bình hành, F = √(F₁² + F₂² + 2F₁F₂cosα). Thí nghiệm: hai lực kế kéo vòng dây tới điểm O, sau đó chỉ dùng MỘT lực kế kéo vòng dây về đúng điểm O để có F thực nghiệm. Hai lực song song cùng chiều: F = F₁ + F₂, điểm đặt chia đoạn nối hai giá theo tỉ lệ d₁/d₂ = F₂/F₁.',
  equation: 'F = √(F₁² + F₂² + 2F₁F₂cosα) ; d₁/d₂ = F₂/F₁',
  sceneTemplate: 'force',
  sceneOptions: {},
  solverId: 'force-composition',
  params: [
    { key: 'mode', label: 'Loại hệ lực', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Đồng quy' }, { value: 1, label: 'Song song cùng chiều' }] },
    { key: 'F1', label: 'Lực F₁', unit: 'N', min: 0.5, max: 5, step: 0.5, default: 3 },
    { key: 'F2', label: 'Lực F₂', unit: 'N', min: 0.5, max: 5, step: 0.5, default: 4 },
    { key: 'alpha', label: 'Góc α giữa hai lực', unit: '°', min: 0, max: 180, step: 15, default: 90, showIf: { key: 'mode', in: [0] } },
    { key: 'AB', label: 'Khoảng cách AB', unit: 'cm', min: 20, max: 60, step: 5, default: 40, showIf: { key: 'mode', in: [1] } }
  ],
  hidden: [{ key: 'bias', label: 'Sai lệch lực kế', unit: '%', min: -1.5, max: 1.5, decimals: 2 }],
  measurements: [
    { key: 'Ftn', label: 'F thực nghiệm', unit: 'N', decimals: 2 },
    { key: 'd1', label: 'd₁', unit: 'cm', decimals: 1, showIf: { key: 'mode', in: [1] } },
    { key: 'd2', label: 'd₂', unit: 'cm', decimals: 1, showIf: { key: 'mode', in: [1] } }
  ],
  derived: [
    { key: 'Flt', label: 'F lí thuyết', unit: 'N', decimals: 2 },
    { key: 'delta', label: 'Sai lệch δ', unit: '%', decimals: 2 },
    { key: 'rd', label: 'd₁/d₂', unit: '', decimals: 2, showIf: { key: 'mode', in: [1] } },
    { key: 'rf', label: 'F₂/F₁', unit: '', decimals: 2, showIf: { key: 'mode', in: [1] } }
  ],
  charts: [
    { id: 'f-alpha', title: 'Hợp lực theo góc α', kind: 'scatter', x: 'alpha', y: 'Ftn', xLabel: 'α (°)', yLabel: 'F (N)', showIf: { key: 'mode', in: [0] } },
    { id: 'ratio', title: 'd₁/d₂ theo F₂/F₁', kind: 'scatter', x: 'rf', y: 'rd', xLabel: 'F₂/F₁', yLabel: 'd₁/d₂', showIf: { key: 'mode', in: [1] } },
    { id: 'delta', title: 'Sai lệch δ theo lần đo', kind: 'bar', x: 'index', y: 'delta', xLabel: 'Lần đo', yLabel: 'δ (%)', refLine: { value: 5, label: 'mốc 5%' } }
  ],
  minTrials: 4,
  result: { key: 'F', label: 'Độ lớn hợp lực F (theo thông số lần đo cuối)', unit: 'N', tolerancePercent: 5, decimals: 2, hint: 'Đồng quy: F = √(F₁² + F₂² + 2F₁F₂cosα). Song song cùng chiều: F = F₁ + F₂.' },
  steps: [
    { id: 's1', title: 'Móc lực kế vào hệ', instruction: 'Kéo lực kế vào điểm gắn phát sáng.', action: 'snap', trigger: 'scale-slot' },
    { id: 's2', title: 'Đánh dấu điểm đặt O', instruction: 'Chạm vào vòng dây để đánh dấu vị trí O.', action: 'click', trigger: 'ring' },
    { id: 's3', title: 'Chọn F₁, F₂ và góc α (hoặc AB)', instruction: 'Mỗi lần chỉ thay đổi một đại lượng.', action: 'adjust' },
    { id: 's4', title: 'Đo hợp lực', instruction: 'Chạm vào bảng (hoặc nút Đo): kéo một lực kế về đúng điểm O và đọc số chỉ.', action: 'measure', trigger: 'board' },
    { id: 's5', title: 'So sánh lí thuyết – thực nghiệm', instruction: 'Đo ít nhất 4 lần, thử cả hai loại hệ lực; đánh giá δ ≤ 5%.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'over-scale', title: 'Gần giới hạn đo của lực kế', message: 'Hợp lực trên 9 N gần giới hạn đo 10 N của lực kế. Hãy giảm F₁ hoặc F₂.', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Hai lực 3 N và 4 N đồng quy. Hợp lực của chúng:', ['Luôn bằng 7 N', 'Luôn bằng 5 N', 'Nằm trong khoảng 1 N đến 7 N tùy góc', 'Luôn bằng 1 N'], 2, '|F₁ − F₂| ≤ F ≤ F₁ + F₂.', 'phy-resultant-sum'),
    quiz('q2', 'Khi dùng một lực kế thay hai lực kế, phải kéo vòng dây về:', ['Vị trí bất kì', 'Đúng điểm O đã đánh dấu', 'Mép bảng', 'Vị trí thấp hơn O'], 1, 'Lực thay thế phải gây cùng tác dụng.'),
    quiz('q3', 'Hợp lực hai lực song song cùng chiều đặt gần:', ['Lực nhỏ hơn', 'Lực lớn hơn', 'Luôn ở giữa', 'Ngoài đoạn AB'], 1, 'd₁/d₂ = F₂/F₁.')
  ],
  postQuiz: [
    quiz('p1', 'F₁ = 3 N, F₂ = 4 N, α = 90°. Hợp lực là:', ['7 N', '5 N', '1 N', '3,5 N'], 1, '√(9 + 16) = 5 N.', 'phy-resultant-sum'),
    quiz('p2', 'F_LT = 5,00 N, F_TN = 4,85 N. Sai lệch δ =', ['3%', '0,15%', '15%', '9,7%'], 0, 'δ = 0,15/5,00 = 3%.'),
    quiz('p3', 'F₁ = 2 N, F₂ = 3 N song song cùng chiều, AB = 50 cm. Điểm đặt cách F₁:', ['20 cm', '25 cm', '30 cm', '10 cm'], 2, 'd₁ = AB·F₂/(F₁ + F₂) = 30 cm.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu quy tắc tổng hợp lực đã nghiệm lại, giá trị δ và nguyên nhân sai lệch.',
  conclusionKeywords: ['hợp lực', 'hình bình hành', 'sai lệch'],
  tags: ['tổng hợp lực', 'lực kế', 'đồng quy', 'song song'],
  source: 'builtin'
};
