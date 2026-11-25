/**
 * Plugin Sinh học 10 mở rộng: Bài 7 (tế bào nhân sơ), Bài 10 (trao đổi chất qua màng), Bài 12 (truyền tin tế bào),
 * Bài 15 (thực hành enzyme), Bài 21 (vi sinh vật). Bộ giải ở engines/biology/conceptSolver.ts.
 */
import type { LabPluginDef } from '../../types/lab';
import { BACTERIA_PARTS } from '../../engines/biology/conceptSolver';
import { exploreSteps, quiz } from '../pluginHelpers';

export const prokaryotePlugin: LabPluginDef = {
  id: 'sh10-te-bao-nhan-so',
  version: 1,
  subject: 'biology',
  title: 'Tế bào nhân sơ: cấu trúc vi khuẩn và tỉ lệ S/V',
  shortTitle: 'Bài 7 – Tế bào nhân sơ',
  sgkRef: 'Sinh học 10 – Bài 7: Tế bào nhân sơ',
  chapter: 'Chương 2: Cấu trúc tế bào',
  grade: 10,
  durationMin: 25,
  objectives: [
    'Mô tả cấu trúc tế bào vi khuẩn: lông, roi, vỏ nhầy, màng ngoài, thành peptidoglycan, màng tế bào, ribosome 70S, vùng nhân, plasmid.',
    'Phân biệt vi khuẩn Gram dương và Gram âm.',
    'Giải thích vì sao kích thước nhỏ (S/V lớn) giúp vi khuẩn trao đổi chất và phân chia nhanh.'
  ],
  theory:
    'Tế bào nhân sơ nhỏ (khoảng 1–5 µm), chưa có màng nhân và bào quan có màng. Thành tế bào cấu tạo từ peptidoglycan: Gram dương có lớp dày (bắt màu tím), Gram âm có lớp mỏng và thêm màng ngoài (bắt màu đỏ/hồng). Tế bào chất chứa ribosome 70S; vùng nhân thường có một DNA vòng; nhiều vi khuẩn có plasmid. Với tế bào hình cầu bán kính r: S/V = 3/r, tế bào càng nhỏ S/V càng lớn.',
  equation: 'S = 4πr² ; V = 4πr³/3 ; S/V = 3/r',
  sceneTemplate: 'cell',
  sceneOptions: { partOrder: BACTERIA_PARTS.map((x) => x.id).join(',') },
  solverId: 'prokaryote-sv',
  params: [
    { key: 'part', label: 'Cấu trúc đang xem', unit: '', min: 0, max: BACTERIA_PARTS.length - 1, step: 1, default: 0, options: BACTERIA_PARTS.map((x, i) => ({ value: i, label: x.name })) },
    { key: 'gram', label: 'Nhóm vi khuẩn', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Gram dương' }, { value: 1, label: 'Gram âm' }] },
    { key: 'r', label: 'Bán kính tế bào', unit: 'µm', min: 0.25, max: 10, step: 0.25, default: 0.5 }
  ],
  hidden: [],
  measurements: [
    { key: 'S', label: 'Diện tích bề mặt S', unit: 'µm²', decimals: 3 },
    { key: 'V', label: 'Thể tích V', unit: 'µm³', decimals: 3 }
  ],
  derived: [{ key: 'sv', label: 'S/V', unit: 'µm⁻¹', decimals: 2, expr: 'S / V' }],
  charts: [{ id: 'sv-r', title: 'Tỉ lệ S/V theo bán kính tế bào', kind: 'line', x: 'r', y: 'sv', xLabel: 'r (µm)', yLabel: 'S/V (µm⁻¹)' }],
  minTrials: 4,
  result: { key: 'sv', label: 'Tỉ lệ S/V của tế bào ở lần ghi cuối', unit: 'µm⁻¹', tolerancePercent: 2, decimals: 2, hint: 'Lấy S chia V trong bảng (hoặc 3/r).' },
  steps: exploreSteps({ observe: 'Chạm vào thước đo, xoay mô hình để quan sát; chạm từng cấu trúc để xem chức năng.', click: 'cell', adjust: 'Chọn cấu trúc, nhóm Gram và bán kính tế bào.', measure: 'Chạm vào thước đo (hoặc nút Đo) để ghi S và V.', trigger: 'cell', record: 'Ghi ít nhất 4 bán kính, xem biểu đồ S/V và kết luận.' }),
  ppeRequired: [],
  chemicals: [],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Thành tế bào vi khuẩn cấu tạo chủ yếu từ:', ['Cellulose', 'Peptidoglycan', 'Chitin', 'Phospholipid'], 1, 'Peptidoglycan.', 'bio-cell-wall-only-plant'),
    quiz('q2', 'Vật chất di truyền của vi khuẩn nằm ở:', ['Nhân có màng', 'Vùng nhân (DNA vòng) và có thể ở plasmid', 'Ti thể', 'Không có DNA'], 1, 'Tế bào nhân sơ không có màng nhân nhưng có DNA.', 'bio-prokaryote-no-dna'),
    quiz('q3', 'Ribosome của vi khuẩn là loại:', ['80S', '70S', '60S', '40S'], 1, '70S gồm 30S và 50S.')
  ],
  postQuiz: [
    quiz('p1', 'Vi khuẩn Gram âm khác Gram dương ở chỗ:', ['Thành dày hơn', 'Thành peptidoglycan mỏng và có màng ngoài', 'Không có màng tế bào', 'Có màng nhân'], 1, 'Gram âm có màng ngoài.'),
    quiz('p2', 'Tế bào bán kính 0,5 µm có S/V là:', ['0,17 µm⁻¹', '1,5 µm⁻¹', '6 µm⁻¹', '3 µm⁻¹'], 2, '3/0,5 = 6.'),
    quiz('p3', 'Plasmid thường mang:', ['Toàn bộ hệ gene', 'Một số gene như gene kháng kháng sinh', 'Protein màng', 'Ribosome'], 1, 'Plasmid là DNA vòng nhỏ, mang một số gene.', 'bio-prokaryote-no-dna')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu đặc điểm cấu trúc tế bào nhân sơ và ý nghĩa của S/V lớn.',
  conclusionKeywords: ['nhân sơ', 'S/V', 'trao đổi chất'],
  tags: ['vi khuẩn', 'peptidoglycan', 'Gram', 'plasmid'],
  source: 'builtin'
};

export const membraneTransportPlugin: LabPluginDef = {
  id: 'sh10-trao-doi-chat-qua-mang',
  version: 1,
  subject: 'biology',
  title: 'Trao đổi chất qua màng tế bào',
  shortTitle: 'Bài 10 – Trao đổi chất qua màng',
  sgkRef: 'Sinh học 10 – Bài 10: Trao đổi chất qua màng tế bào',
  chapter: 'Chương 3: Trao đổi chất qua màng và truyền tin tế bào',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Phân biệt khuếch tán đơn giản, khuếch tán tăng cường, thẩm thấu, vận chuyển chủ động, nhập bào và xuất bào.',
    'Dự đoán hiện tượng ở tế bào thực vật và động vật trong môi trường ưu trương, đẳng trương, nhược trương.',
    'Xác định nồng độ đẳng trương của tế bào từ số liệu biến thiên thể tích.'
  ],
  theory:
    'Vận chuyển thụ động (xuôi gradient, không tốn ATP): khuếch tán đơn giản qua lớp kép phospholipid, khuếch tán tăng cường qua protein, thẩm thấu của nước. Vận chuyển chủ động: ngược gradient, cần protein bơm và ATP. Nhập bào, xuất bào: biến dạng màng, tốn năng lượng. Môi trường ưu trương: nước ra (co nguyên sinh ở tế bào thực vật, nhăn nheo ở tế bào động vật); nhược trương: nước vào (trương nước ở thực vật, có thể vỡ ở động vật); đẳng trương: cân bằng.',
  equation: 'ΔV = 0 tại C đẳng trương',
  sceneTemplate: 'membrane',
  sceneOptions: {},
  solverId: 'membrane-transport',
  params: [
    { key: 'process', label: 'Phương thức vận chuyển', unit: '', min: 0, max: 5, step: 1, default: 2, options: ['Khuếch tán đơn giản', 'Khuếch tán tăng cường', 'Thẩm thấu', 'Chủ động', 'Nhập bào', 'Xuất bào'].map((x, i) => ({ value: i, label: x })) },
    { key: 'cell', label: 'Loại tế bào', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Thực vật' }, { value: 1, label: 'Động vật' }], showIf: { key: 'process', in: [2] } },
    { key: 'Cout', label: 'Nồng độ chất tan bên ngoài', unit: 'mol/L', min: 0, max: 0.8, step: 0.05, default: 0.3, showIf: { key: 'process', in: [0, 1, 2, 3] } }
  ],
  hidden: [
    { key: 'cIso', label: 'Nồng độ đẳng trương', unit: 'mol/L', min: 0.28, max: 0.37, decimals: 3 },
    { key: 'vmax', label: 'Tốc độ bão hòa', unit: '', min: 4, max: 6, decimals: 2 },
    { key: 'km', label: 'Nồng độ nửa bão hòa', unit: 'mol/L', min: 0.12, max: 0.2, decimals: 3 }
  ],
  measurements: [
    { key: 'rate', label: 'Tốc độ vận chuyển (+ vào, − ra)', unit: 'đv', decimals: 2, showIf: { key: 'process', in: [0, 1, 3, 4, 5] } },
    { key: 'dV', label: 'Biến thiên thể tích ΔV', unit: '%', decimals: 1, showIf: { key: 'process', in: [2] } }
  ],
  charts: [
    { id: 'dv-c', title: 'Biến thiên thể tích theo nồng độ ngoài', kind: 'scatter', x: 'Cout', y: 'dV', xLabel: 'C ngoài (mol/L)', yLabel: 'ΔV (%)', groupBy: 'cell', refLine: { value: 0, label: 'đẳng trương' }, showIf: { key: 'process', in: [2] } },
    { id: 'rate-c', title: 'Tốc độ vận chuyển theo nồng độ ngoài', kind: 'scatter', x: 'Cout', y: 'rate', xLabel: 'C ngoài (mol/L)', yLabel: 'v (đv)', groupBy: 'process', showIf: { key: 'process', in: [0, 1, 3] } }
  ],
  minTrials: 5,
  result: { key: 'cIso', label: 'Nồng độ đẳng trương của tế bào', unit: 'mol/L', tolerancePercent: 6, decimals: 3, hint: 'Chọn Thẩm thấu, đo ΔV ở nhiều nồng độ gần 0,3 mol/L; nồng độ làm ΔV = 0 là đẳng trương.' },
  steps: exploreSteps({ observe: 'Chạm vào màng tế bào để quan sát lớp kép phospholipid và protein.', click: 'membrane', adjust: 'Chọn phương thức, loại tế bào và nồng độ bên ngoài.', measure: 'Chạm vào tế bào (hoặc nút Đo) để ghi số liệu.', trigger: 'cell', record: 'Đo ít nhất 5 lần thẩm thấu, xác định nồng độ đẳng trương từ biểu đồ.' }),
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'cell-burst', title: 'Tế bào động vật bị vỡ', message: 'Môi trường quá nhược trương: tế bào động vật không có thành nên trương nước và vỡ (tan bào).', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Trong dung dịch ưu trương, nước di chuyển:', ['Vào tế bào', 'Ra khỏi tế bào', 'Không di chuyển', 'Chất tan đi vào'], 1, 'Nước đi từ nơi thế nước cao đến nơi thế nước thấp.', 'bio-solute-moves'),
    quiz('q2', 'Vận chuyển chủ động khác khuếch tán ở chỗ:', ['Xuôi gradient', 'Ngược gradient và tốn ATP', 'Không cần protein', 'Chỉ vận chuyển nước'], 1, 'Cần bơm protein và ATP.', 'bio-active-free'),
    quiz('q3', 'O₂ và CO₂ qua màng chủ yếu bằng:', ['Khuếch tán đơn giản', 'Vận chuyển chủ động', 'Nhập bào', 'Xuất bào'], 0, 'Phân tử nhỏ, không phân cực.')
  ],
  postQuiz: [
    quiz('p1', 'Tế bào hồng cầu trong nước cất sẽ:', ['Co lại', 'Trương lên và có thể vỡ', 'Không đổi', 'Co nguyên sinh'], 1, 'Không có thành tế bào bảo vệ.', 'bio-cell-wall-only-plant'),
    quiz('p2', 'Tốc độ khuếch tán tăng cường bão hòa vì:', ['Hết chất tan', 'Protein vận chuyển đã hoạt động tối đa', 'Hết ATP', 'Màng bị vỡ'], 1, 'Số protein vận chuyển có hạn.'),
    quiz('p3', 'Bạch cầu bắt vi khuẩn bằng:', ['Xuất bào', 'Thực bào (nhập bào)', 'Thẩm thấu', 'Khuếch tán'], 1, 'Màng biến dạng bao lấy vi khuẩn.', 'bio-active-free')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'So sánh các phương thức vận chuyển và hiện tượng ở tế bào thực vật, động vật trong ba loại môi trường.',
  conclusionKeywords: ['ưu trương', 'nhược trương', 'đẳng trương', 'ATP'],
  tags: ['khuếch tán', 'thẩm thấu', 'vận chuyển chủ động', 'nhập bào'],
  source: 'builtin'
};

export const cellSignalPlugin: LabPluginDef = {
  id: 'sh10-truyen-tin-te-bao',
  version: 1,
  subject: 'biology',
  title: 'Truyền tin tế bào',
  shortTitle: 'Bài 12 – Truyền tin tế bào',
  sgkRef: 'Sinh học 10 – Bài 12: Truyền tin tế bào',
  chapter: 'Chương 3: Trao đổi chất qua màng và truyền tin tế bào',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Phân biệt 4 phương thức truyền tin: trực tiếp, cận tiết, nội tiết, qua synapse.',
    'Mô tả 3 giai đoạn: tiếp nhận – truyền tin nội bào – đáp ứng.',
    'Giải thích tính đặc thù của đáp ứng dựa vào thụ thể; xác định nồng độ tín hiệu gây 50% đáp ứng.'
  ],
  theory:
    'Tế bào trao đổi thông tin qua phân tử tín hiệu. Ba giai đoạn: (1) tiếp nhận – tín hiệu liên kết đặc hiệu với thụ thể; (2) truyền tin nội bào – chuỗi phân tử truyền tin khuếch đại tín hiệu; (3) đáp ứng – thay đổi hoạt động tế bào. Chỉ tế bào có thụ thể phù hợp mới đáp ứng. Mức đáp ứng tăng theo nồng độ tín hiệu rồi bão hòa: R = 100·L/(Kd + L).',
  equation: 'R = 100·L / (Kd + L)',
  sceneTemplate: 'signal',
  sceneOptions: {},
  solverId: 'cell-signal',
  params: [
    { key: 'mode', label: 'Phương thức truyền tin', unit: '', min: 0, max: 3, step: 1, default: 1, options: ['Trực tiếp', 'Cận tiết', 'Nội tiết', 'Qua synapse'].map((x, i) => ({ value: i, label: x })) },
    { key: 'stage', label: 'Giai đoạn đang xem', unit: '', min: 0, max: 2, step: 1, default: 0, options: ['Tiếp nhận', 'Truyền tin', 'Đáp ứng'].map((x, i) => ({ value: i, label: x })) },
    { key: 'target', label: 'Tế bào nhận', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Có thụ thể' }, { value: 1, label: 'Không thụ thể' }] },
    { key: 'L', label: 'Nồng độ phân tử tín hiệu', unit: 'nM', min: 1, max: 200, step: 1, default: 20 }
  ],
  hidden: [{ key: 'kd', label: 'Nồng độ gây 50% đáp ứng', unit: 'nM', min: 18, max: 60, decimals: 1 }],
  measurements: [
    { key: 'R', label: 'Mức đáp ứng', unit: '%', decimals: 1 },
    { key: 'delay', label: 'Thời gian tới khi đáp ứng', unit: 's', decimals: 2 }
  ],
  charts: [
    { id: 'r-l', title: 'Mức đáp ứng theo nồng độ tín hiệu', kind: 'scatter', x: 'L', y: 'R', xLabel: 'L (nM)', yLabel: 'R (%)', groupBy: 'target', refLine: { value: 50, label: '50%' } },
    { id: 'delay', title: 'Thời gian đáp ứng theo phương thức', kind: 'bar', x: 'mode', y: 'delay', xLabel: 'Phương thức', yLabel: 't (s)' }
  ],
  minTrials: 5,
  result: { key: 'kd', label: 'Nồng độ tín hiệu gây 50% đáp ứng (Kd)', unit: 'nM', tolerancePercent: 8, decimals: 1, hint: 'Từ mỗi lần đo (tế bào có thụ thể): Kd = L·(100/R − 1), rồi lấy trung bình; hoặc đọc trên biểu đồ tại R = 50%.' },
  steps: exploreSteps({ observe: 'Chạm vào tế bào phát tín hiệu và quan sát đường đi của phân tử tín hiệu.', click: 'sender', adjust: 'Chọn phương thức, giai đoạn, loại tế bào nhận và nồng độ.', measure: 'Chạm vào tế bào nhận (hoặc nút Đo) để ghi đáp ứng.', trigger: 'cell', record: 'Ghi ít nhất 5 lần, có lần dùng tế bào không thụ thể để đối chứng.' }),
  ppeRequired: [],
  chemicals: [],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Hormone insulin truyền tin theo phương thức:', ['Trực tiếp', 'Cận tiết', 'Nội tiết', 'Qua synapse'], 2, 'Hormone theo máu tới tế bào đích ở xa.'),
    quiz('q2', 'Một tín hiệu đi khắp cơ thể thì:', ['Mọi tế bào đều đáp ứng', 'Chỉ tế bào có thụ thể phù hợp đáp ứng', 'Không tế bào nào đáp ứng', 'Chỉ tế bào thần kinh đáp ứng'], 1, 'Tính đặc thù do thụ thể.', 'bio-signal-all-cells'),
    quiz('q3', 'Thứ tự ba giai đoạn truyền tin:', ['Đáp ứng – tiếp nhận – truyền tin', 'Tiếp nhận – truyền tin nội bào – đáp ứng', 'Truyền tin – tiếp nhận – đáp ứng', 'Tiếp nhận – đáp ứng – truyền tin'], 1, 'Tiếp nhận → truyền tin → đáp ứng.')
  ],
  postQuiz: [
    quiz('p1', 'Tế bào không có thụ thể với tín hiệu X sẽ:', ['Đáp ứng yếu', 'Không đáp ứng', 'Đáp ứng mạnh', 'Phân hủy X'], 1, 'Không tiếp nhận được tín hiệu.', 'bio-signal-all-cells'),
    quiz('p2', 'Phương thức truyền tin nhanh nhất trong 4 phương thức là:', ['Nội tiết', 'Cận tiết', 'Qua synapse', 'Đều như nhau'], 2, 'Khe synapse rất hẹp.'),
    quiz('p3', 'L = 30 nM cho R = 50%. Kd bằng:', ['15 nM', '30 nM', '60 nM', '50 nM'], 1, 'R = 50% khi L = Kd.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'So sánh 4 phương thức, nêu 3 giai đoạn và vai trò của thụ thể đối với tính đặc thù.',
  conclusionKeywords: ['thụ thể', 'tiếp nhận', 'đáp ứng'],
  tags: ['truyền tin', 'thụ thể', 'hormone', 'synapse'],
  source: 'builtin'
};

export const enzymeConditionsPlugin: LabPluginDef = {
  id: 'sh10-enzyme-protease-amylase',
  version: 1,
  subject: 'biology',
  title: 'Thực hành enzyme: ảnh hưởng của điều kiện xử lí đến protease và amylase',
  shortTitle: 'Bài 15 – Protease & amylase',
  sgkRef: 'Sinh học 10 – Bài 15: Thực hành về enzyme',
  chapter: 'Chương 4: Chuyển hóa năng lượng trong tế bào',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Bố trí 4 điều kiện: đối chứng, pH kiềm, đun sôi, nước đá cho protease (lòng trắng trứng) và amylase (đĩa thạch tinh bột).',
    'Giải thích ảnh hưởng của pH và nhiệt độ đến hoạt tính enzyme.',
    'Tính hoạt tính tương đối ở nhiệt độ thấp so với đối chứng và liên hệ thực tiễn.'
  ],
  theory:
    'Enzyme có bản chất protein, mỗi enzyme hoạt động tốt ở nhiệt độ và pH tối ưu. Đun sôi làm enzyme biến tính không thuận nghịch; nhiệt độ thấp chỉ làm giảm hoạt tính, ấm lên sẽ phục hồi; pH lệch xa tối ưu làm biến đổi trung tâm hoạt động. Protease phân giải protein (lòng trắng trứng đục → trong), amylase phân giải tinh bột (vòng không bắt màu iodine trên đĩa thạch).',
  equation: 'Hoạt tính tương đối = (mức thủy phân/t)ₓ : (mức thủy phân/t)đối chứng',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'tubes', reagentA: 'Cơ chất', reagentB: 'Enzyme', showThermometer: true, tubeBase: '#e2e8f0' },
  solverId: 'enzyme-conditions',
  params: [
    { key: 'enzyme', label: 'Enzyme – cơ chất', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Protease – lòng trắng trứng' }, { value: 1, label: 'Amylase – tinh bột' }] },
    { key: 'cond', label: 'Điều kiện xử lí', unit: '', min: 0, max: 3, step: 1, default: 0, options: ['Đối chứng', 'pH kiềm', 'Đun sôi', 'Nước đá'].map((x, i) => ({ value: i, label: x })) },
    { key: 'time', label: 'Thời gian ủ', unit: 'phút', min: 5, max: 60, step: 5, default: 30 }
  ],
  hidden: [
    { key: 'cold', label: 'Hoạt tính tương đối ở nước đá', unit: '', min: 0.18, max: 0.32, decimals: 3 },
    { key: 'k', label: 'Tốc độ thủy phân', unit: '%/phút', min: 1.2, max: 1.6, decimals: 2 }
  ],
  measurements: [{ key: 'degree', label: 'Mức thủy phân', unit: '%', decimals: 1 }],
  derived: [{ key: 'speed', label: 'Mức thủy phân mỗi phút', unit: '%/phút', decimals: 3 }],
  charts: [
    { id: 'cond', title: 'Mức thủy phân theo điều kiện xử lí', kind: 'bar', x: 'cond', y: 'degree', xLabel: 'Điều kiện', yLabel: 'Mức thủy phân (%)', groupBy: 'enzyme' },
    { id: 'time', title: 'Mức thủy phân theo thời gian', kind: 'scatter', x: 'time', y: 'degree', xLabel: 't (phút)', yLabel: 'Mức thủy phân (%)', groupBy: 'enzyme' }
  ],
  minTrials: 4,
  result: { key: 'cold', label: 'Hoạt tính tương đối ở nước đá so với đối chứng', unit: '%', tolerancePercent: 8, decimals: 1, hint: 'Cùng một enzyme: (mức thủy phân mỗi phút ở nước đá) : (ở đối chứng) × 100%.' },
  steps: [
    { id: 's1', title: 'Bảo hộ & kiểm tra nhãn', instruction: 'Đeo kính, găng tay và đọc nhãn dung dịch.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt giá ống nghiệm', instruction: 'Kéo giá ống nghiệm vào bể ổn nhiệt.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn enzyme và điều kiện', instruction: 'Giữ nguyên thời gian, chỉ đổi điều kiện xử lí.', action: 'adjust', lockParams: ['time'] },
    { id: 's4', title: 'Thêm enzyme – ghi mức thủy phân', instruction: 'Chạm vào lọ enzyme (hoặc nút Đo).', action: 'measure', trigger: 'reagent-b', requiresPpe: true, lockParams: ['time'] },
    { id: 's5', title: 'So sánh 4 điều kiện', instruction: 'Giữ nguyên thời gian, ghi đủ 4 điều kiện, giải thích và liên hệ thực tiễn.', action: 'record', lockParams: ['time'] }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Dung dịch kiềm (NaOH loãng)', formula: 'NaOH', concentration: '0,1 M', hazards: ['Kích ứng da, mắt'] },
    { name: 'Dung dịch iodine', formula: 'I₂/KI', concentration: '0,1%', hazards: ['Nhuộm màu', 'Kích ứng mắt'] }
  ],
  incidents: [{ id: 'boiling', title: 'Nước sôi', message: 'Ống nghiệm và nước ở 100 °C có thể gây bỏng: dùng kẹp gỗ, hướng miệng ống ra xa người.', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Đun sôi dung dịch enzyme làm:', ['Hoạt tính tăng mạnh', 'Enzyme biến tính, mất hoạt tính', 'Không đổi', 'Enzyme nhân đôi'], 1, 'Protein bị biến tính.', 'bio-enzyme-higher-temp-better'),
    quiz('q2', 'Ướp lạnh enzyme rồi làm ấm lại, enzyme:', ['Mất hoạt tính vĩnh viễn', 'Hoạt động trở lại', 'Bị phân hủy', 'Biến thành lipid'], 1, 'Nhiệt độ thấp không gây biến tính.', 'bio-cold-denature'),
    quiz('q3', 'Protease thủy phân:', ['Tinh bột', 'Protein', 'Lipid', 'Cellulose'], 1, 'Protease phân giải protein.')
  ],
  postQuiz: [
    quiz('p1', 'Ướp thịt với nước ép dứa tươi giúp thịt mềm vì:', ['Dứa chứa protease', 'Dứa có đường', 'Dứa có acid mạnh', 'Dứa lạnh'], 0, 'Bromelain là protease.'),
    quiz('p2', 'Bảo quản thức ăn trong tủ lạnh lâu hỏng hơn vì nhiệt độ thấp:', ['Giết hết enzyme', 'Làm giảm hoạt tính enzyme', 'Biến tính enzyme vĩnh viễn', 'Tăng pH'], 1, 'Chỉ giảm hoạt tính.', 'bio-cold-denature'),
    quiz('p3', 'Vòng không bắt màu iodine trên đĩa thạch tinh bột cho biết:', ['Tinh bột đã bị amylase thủy phân', 'Iodine hỏng', 'Có protein', 'Thạch bị khô'], 0, 'Hết tinh bột nên không có màu xanh tím.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Giải thích kết quả ở 4 điều kiện và nêu một ứng dụng thực tiễn.',
  conclusionKeywords: ['biến tính', 'hoạt tính', 'nhiệt độ', 'pH'],
  tags: ['enzyme', 'protease', 'amylase'],
  source: 'builtin'
};

export const microbeGrowthPlugin: LabPluginDef = {
  id: 'sh10-sinh-truong-vi-sinh-vat',
  version: 1,
  subject: 'biology',
  title: 'Trao đổi chất, sinh trưởng và sinh sản ở vi sinh vật',
  shortTitle: 'Bài 21 – Sinh trưởng vi sinh vật',
  sgkRef: 'Sinh học 10 – Bài 21: Trao đổi chất, sinh trưởng và sinh sản ở vi sinh vật',
  chapter: 'Chương 6: Sinh học vi sinh vật',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Vẽ đường cong sinh trưởng và nhận biết 4 pha trong nuôi cấy không liên tục; so sánh với nuôi cấy liên tục.',
    'Vận dụng Nt = N0·2ⁿ để xác định thời gian thế hệ g.',
    'Giải thích vai trò của nhân tố sinh trưởng, kháng sinh, hiện tượng kháng thuốc; phân biệt các hình thức sinh sản và nội bào tử.'
  ],
  theory:
    'Vi sinh vật thực hiện đồng hóa (tổng hợp chất, tích lũy năng lượng) và dị hóa (phân giải chất, giải phóng năng lượng). Nuôi cấy không liên tục gồm pha tiềm phát, lũy thừa, cân bằng, suy vong. Ở pha lũy thừa: Nt = N0·2ⁿ với n = t/g. Nuôi cấy liên tục bổ sung dinh dưỡng và lấy dịch nuôi ra nên không có pha suy vong. Sinh sản: phân đôi, nảy chồi, bào tử; nội bào tử KHÔNG phải hình thức sinh sản mà là dạng tiềm sinh.',
  equation: 'Nt = N0·2ⁿ ; n = t/g',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'beaker', reagentA: 'Môi trường', reagentB: 'Giống vi khuẩn', showCross: false, showThermometer: true },
  solverId: 'microbe-growth',
  params: [
    { key: 'culture', label: 'Kiểu nuôi cấy', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Không liên tục' }, { value: 1, label: 'Liên tục' }] },
    { key: 't', label: 'Thời gian nuôi', unit: 'giờ', min: 0, max: 30, step: 0.5, default: 2 },
    { key: 'N0', label: 'Số tế bào ban đầu', unit: 'nghìn TB/mL', min: 1, max: 100, step: 1, default: 10 },
    { key: 'anti', label: 'Kháng sinh', unit: '', min: 0, max: 2, step: 1, default: 0, options: ['Không dùng', 'Chủng mẫn cảm', 'Chủng kháng thuốc'].map((x, i) => ({ value: i, label: x })) },
    { key: 'factor', label: 'Nhân tố sinh trưởng', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Đủ' }, { value: 1, label: 'Thiếu' }] },
    { key: 'repro', label: 'Tra cứu sinh sản', unit: '', min: 0, max: 3, step: 1, default: 0, options: ['Phân đôi', 'Nảy chồi', 'Bào tử', 'Nội bào tử'].map((x, i) => ({ value: i, label: x })) }
  ],
  hidden: [
    { key: 'g', label: 'Thời gian thế hệ', unit: 'phút', min: 25, max: 45, decimals: 1 },
    { key: 'lag', label: 'Thời gian pha tiềm phát', unit: 'giờ', min: 0.8, max: 1.5, decimals: 2 }
  ],
  measurements: [{ key: 'logN', label: 'lg(số tế bào/mL)', unit: '', decimals: 2 }],
  derived: [{ key: 'n', label: 'Số thế hệ n', unit: '', decimals: 2 }],
  charts: [{ id: 'curve', title: 'Đường cong sinh trưởng', kind: 'line', x: 't', y: 'logN', xLabel: 't (giờ)', yLabel: 'lg N', groupBy: 'culture' }],
  minTrials: 6,
  result: { key: 'g', label: 'Thời gian thế hệ g ở pha lũy thừa', unit: 'phút', tolerancePercent: 6, decimals: 1, hint: 'Chọn hai thời điểm trong pha lũy thừa: g = Δt/Δn, với Δn = ΔlgN/lg2 (đổi giờ ra phút).' },
  steps: [
    { id: 's1', title: 'Bảo hộ & chuẩn bị môi trường', instruction: 'Đeo găng tay, kiểm tra nhãn; chạm vào chai môi trường.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt bình nuôi cấy', instruction: 'Kéo bình vào vị trí.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn điều kiện nuôi và thời điểm', instruction: 'Giữ điều kiện cố định, chỉ thay đổi thời gian nuôi.', action: 'adjust' },
    { id: 's4', title: 'Lấy mẫu – đếm tế bào', instruction: 'Chạm vào chai giống (hoặc nút Đo) để ghi lg N.', action: 'measure', trigger: 'reagent-b', requiresPpe: true },
    { id: 's5', title: 'Vẽ đường cong, tính g', instruction: 'Đo ít nhất 6 thời điểm, nhận biết các pha và tính g.', action: 'record' }
  ],
  ppeRequired: ['gloves', 'labelCheck'],
  chemicals: [{ name: 'Môi trường dinh dưỡng và chủng vi khuẩn an toàn', formula: '—', concentration: '—', hazards: ['Vi sinh vật: khử trùng dụng cụ sau thí nghiệm'] }],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Số lượng vi khuẩn tăng nhanh nhất ở pha:', ['Tiềm phát', 'Lũy thừa', 'Cân bằng', 'Suy vong'], 1, 'Pha lũy thừa: tốc độ phân chia lớn nhất.'),
    quiz('q2', 'Nội bào tử của vi khuẩn:', ['Là hình thức sinh sản', 'Là dạng tiềm sinh giúp chống chịu, không phải sinh sản', 'Là tế bào con', 'Là plasmid'], 1, 'Một tế bào chỉ tạo một nội bào tử.', 'bio-endospore-reproduction'),
    quiz('q3', 'Từ 10 tế bào sau 5 lần phân đôi thu được:', ['50', '160', '320', '100'], 2, '10·2⁵ = 320.')
  ],
  postQuiz: [
    quiz('p1', 'Nuôi cấy liên tục không có pha suy vong vì:', ['Luôn bổ sung dinh dưỡng và lấy bớt dịch nuôi', 'Không có vi khuẩn chết', 'Dùng kháng sinh', 'Nhiệt độ thấp'], 0, 'Môi trường luôn được đổi mới.'),
    quiz('p2', 'Lạm dụng kháng sinh dẫn tới:', ['Vi khuẩn biến mất', 'Chọn lọc chủng kháng thuốc', 'Virus bị tiêu diệt', 'Tăng sức đề kháng'], 1, 'Chủng kháng thuốc sống sót và nhân lên.'),
    quiz('p3', 'Nội bào tử khác bào tử sinh sản ở chỗ:', ['Giúp vi khuẩn chống chịu điều kiện bất lợi', 'Tạo nhiều cá thể mới', 'Chỉ có ở nấm', 'Không có vỏ'], 0, 'Nội bào tử không làm tăng số lượng cá thể.', 'bio-endospore-reproduction')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Mô tả 4 pha trên đường cong của em, ghi g và so sánh nuôi cấy liên tục với không liên tục.',
  conclusionKeywords: ['lũy thừa', 'cân bằng', 'thế hệ'],
  tags: ['vi sinh vật', 'đường cong sinh trưởng', 'kháng sinh', 'nội bào tử'],
  source: 'builtin'
};
