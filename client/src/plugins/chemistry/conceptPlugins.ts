/**
 * Plugin Hóa học 10 mở rộng: Bài 12 (liên kết cộng hóa trị), Bài 15 (oxi hóa – khử), Bài 19 (tốc độ phản ứng),
 * Bài 23 (nhóm halogen). Bộ giải ở engines/chemistry/conceptSolver.ts.
 */
import type { LabPluginDef } from '../../types/lab';
import { HALOGENS, MOLECULES } from '../../engines/chemistry/conceptSolver';
import { REDOX_REACTIONS } from '../../engines/chemistry/redox';
import { exploreSteps, quiz } from '../pluginHelpers';

export const covalentBondPlugin: LabPluginDef = {
  id: 'hh10-lien-ket-cong-hoa-tri',
  version: 1,
  subject: 'chemistry',
  title: 'Liên kết cộng hóa trị: cặp electron dùng chung, độ âm điện và sự phân cực',
  shortTitle: 'Bài 12 – Liên kết cộng hóa trị',
  sgkRef: 'Hóa học 10 – Bài 12: Liên kết cộng hóa trị',
  chapter: 'Chương 3. Liên kết hóa học',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Mô tả sự tạo thành liên kết đơn, đôi, ba và liên kết cho – nhận bằng cặp electron dùng chung.',
    'Phân biệt liên kết σ (xen phủ trục) và liên kết π (xen phủ bên).',
    'Phân loại liên kết theo |Δχ| và giải thích sự phân cực của phân tử theo hình học.'
  ],
  theory:
    'Liên kết cộng hóa trị hình thành bởi một hay nhiều cặp electron dùng chung. Liên kết đơn gồm 1σ; liên kết đôi 1σ + 1π; liên kết ba 1σ + 2π. Liên kết cho – nhận: cặp electron chung do một nguyên tử đóng góp. Hiệu độ âm điện: |Δχ| < 0,4 → cộng hóa trị không phân cực; 0,4 ≤ |Δχ| < 1,7 → phân cực; |Δχ| ≥ 1,7 → thường là liên kết ion. Phân tử có liên kết phân cực vẫn có thể không phân cực nếu hình học đối xứng (CO₂ thẳng).',
  equation: '|Δχ| = |χA − χB|',
  sceneTemplate: 'molecule',
  sceneOptions: {},
  solverId: 'covalent-bond',
  params: [{ key: 'mol', label: 'Phân tử / ion', unit: '', min: 0, max: MOLECULES.length - 1, step: 1, default: 0, options: MOLECULES.map((m, i) => ({ value: i, label: m.formula })) }],
  hidden: [],
  measurements: [
    { key: 'chiA', label: 'χ nguyên tử 1', unit: '', decimals: 2 },
    { key: 'chiB', label: 'χ nguyên tử 2', unit: '', decimals: 2 },
    { key: 'sigma', label: 'Số liên kết σ', unit: '', decimals: 0 },
    { key: 'pi', label: 'Số liên kết π', unit: '', decimals: 0 },
    { key: 'cls', label: 'Loại liên kết theo |Δχ|', unit: '', decimals: 0, valueLabels: { '1': 'CHT không phân cực', '2': 'CHT phân cực', '3': 'Ion (theo thang |Δχ|)' } },
    { key: 'polar', label: 'Phân tử', unit: '', decimals: 0, valueLabels: { '0': 'không phân cực', '1': 'phân cực' } }
  ],
  derived: [{ key: 'dchi', label: '|Δχ|', unit: '', decimals: 2, expr: 'abs(chiA - chiB)' }],
  charts: [
    { id: 'dchi', title: 'Hiệu độ âm điện của các liên kết', kind: 'bar', x: 'mol', y: 'dchi', xLabel: 'Phân tử', yLabel: '|Δχ|', refLine: { value: 0.4, label: '0,4' } },
    { id: 'pi', title: 'Số liên kết π', kind: 'bar', x: 'mol', y: 'pi', xLabel: 'Phân tử', yLabel: 'π' }
  ],
  minTrials: 5,
  result: { key: 'dchi', label: 'Hiệu độ âm điện |Δχ| của phân tử ghi cuối cùng', unit: '', tolerancePercent: 2, decimals: 2, hint: 'Lấy giá trị tuyệt đối hiệu hai độ âm điện đọc được trong bảng.' },
  steps: exploreSteps({ observe: 'Chạm vào bệ mô hình, xoay phân tử để quan sát số cặp electron dùng chung.', click: 'atom', adjust: 'Chọn phân tử cần khảo sát.', measure: 'Chạm vào mô hình (hoặc nút Đo) để ghi độ âm điện và số liên kết.', trigger: 'molecule', record: 'Ghi ít nhất 5 phân tử, xếp loại liên kết và nhận xét sự phân cực.' }),
  ppeRequired: [],
  chemicals: [],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Liên kết ba trong phân tử N₂ gồm:', ['3σ', '1σ và 2π', '2σ và 1π', '3π'], 1, 'Liên kết ba = 1σ + 2π.'),
    quiz('q2', 'Phân tử CO₂ không phân cực vì:', ['Liên kết C=O không phân cực', 'Phân tử thẳng, hai moment lưỡng cực triệt tiêu', 'Không có electron chung', 'C có độ âm điện bằng O'], 1, 'Hình học thẳng đối xứng làm các moment lưỡng cực triệt tiêu.', 'chem-polar-molecule'),
    quiz('q3', 'Liên kết cho – nhận là liên kết mà cặp electron chung:', ['Do hai nguyên tử góp chung', 'Do một nguyên tử đóng góp', 'Bị mất đi', 'Nằm ở hạt nhân'], 1, 'Ví dụ N trong NH₄⁺.')
  ],
  postQuiz: [
    quiz('p1', '|Δχ| của H–Cl là 0,96. Đây là liên kết:', ['Ion', 'Cộng hóa trị không phân cực', 'Cộng hóa trị phân cực', 'Kim loại'], 2, '0,4 ≤ 0,96 < 1,7.'),
    quiz('p2', 'Phân tử nào có liên kết phân cực nhưng phân tử không phân cực?', ['HCl', 'H₂O', 'CO₂', 'NH₃'], 2, 'CO₂ thẳng.', 'chem-polar-molecule'),
    quiz('p3', 'Phân tử C₂H₄ có số liên kết σ và π lần lượt là:', ['5 và 1', '4 và 2', '6 và 0', '3 và 2'], 0, '4 liên kết C–H và 1 liên kết σ C–C, 1 liên kết π.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu mối liên hệ giữa |Δχ| và loại liên kết, vì sao có phân tử chứa liên kết phân cực nhưng không phân cực.',
  conclusionKeywords: ['độ âm điện', 'phân cực', 'electron'],
  tags: ['liên kết cộng hóa trị', 'độ âm điện', 'sigma', 'pi'],
  source: 'builtin'
};

export const redoxBalancePlugin: LabPluginDef = {
  id: 'hh10-oxi-hoa-khu',
  version: 1,
  subject: 'chemistry',
  title: 'Phản ứng oxi hóa – khử: số oxi hóa và thăng bằng electron',
  shortTitle: 'Bài 15 – Oxi hóa – khử',
  sgkRef: 'Hóa học 10 – Bài 15: Phản ứng oxi hóa – khử',
  chapter: 'Chương 4. Phản ứng oxi hóa – khử',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Xác định số oxi hóa của nguyên tử các nguyên tố theo quy tắc.',
    'Nhận diện chất khử (nhường e, số oxi hóa tăng) và chất oxi hóa (nhận e, số oxi hóa giảm).',
    'Cân bằng phương trình theo phương pháp thăng bằng electron.'
  ],
  theory:
    'Quy tắc số oxi hóa: đơn chất bằng 0; trong hợp chất H thường +1, O thường −2 (trừ OF₂, peroxide…), kim loại nhóm IA +1, IIA +2, Al +3, F −1; tổng số oxi hóa trong phân tử bằng 0, trong ion đa nguyên tử bằng điện tích ion. Chất khử nhường electron (bị oxi hóa), chất oxi hóa nhận electron (bị khử). Thăng bằng electron: tổng electron nhường = tổng electron nhận.',
  equation: 'Σe nhường = Σe nhận',
  sceneTemplate: 'molecule',
  sceneOptions: {},
  solverId: 'redox-balance',
  params: [
    { key: 'rxn', label: 'Phản ứng', unit: '', min: 0, max: REDOX_REACTIONS.length - 1, step: 1, default: 0, options: REDOX_REACTIONS.map((r, i) => ({ value: i, label: r.name })) },
    { key: 'stage', label: 'Bước hướng dẫn cân bằng', unit: '', min: 0, max: 4, step: 1, default: 0, options: [{ value: 0, label: 'Đề bài' }, { value: 1, label: '1. Số oxi hóa' }, { value: 2, label: '2. Chất khử/oxi hóa' }, { value: 3, label: '3. Thăng bằng e' }, { value: 4, label: '4. Hệ số' }] }
  ],
  hidden: [],
  measurements: [
    { key: 'redFrom', label: 'Chất khử: số OXH đầu', unit: '', decimals: 0 },
    { key: 'redTo', label: 'Chất khử: số OXH cuối', unit: '', decimals: 0 },
    { key: 'oxFrom', label: 'Chất OXH: số OXH đầu', unit: '', decimals: 0 },
    { key: 'oxTo', label: 'Chất OXH: số OXH cuối', unit: '', decimals: 0 }
  ],
  derived: [
    { key: 'give', label: 'Số e nhường (1 nguyên tử)', unit: '', decimals: 0 },
    { key: 'take', label: 'Số e nhận (1 nguyên tử)', unit: '', decimals: 0 }
  ],
  charts: [
    { id: 'give', title: 'Số electron nhường của mỗi nguyên tử', kind: 'bar', x: 'rxn', y: 'give', xLabel: 'Phản ứng', yLabel: 'e nhường' },
    { id: 'take', title: 'Số electron nhận của mỗi nguyên tử', kind: 'bar', x: 'rxn', y: 'take', xLabel: 'Phản ứng', yLabel: 'e nhận' }
  ],
  tools: ['oxidation'],
  minTrials: 3,
  result: { key: 'sum', label: 'Tổng các hệ số (nguyên, tối giản) của phản ứng ghi cuối cùng', unit: '', tolerancePercent: 0.5, decimals: 0, hint: 'Cân bằng theo thăng bằng electron rồi cộng mọi hệ số ở hai vế (kể cả hệ số 1).' },
  steps: exploreSteps({ observe: 'Chạm vào bệ mô hình để xem nguyên tử nhường và nhận electron.', click: 'atom', adjust: 'Chọn phản ứng và lần lượt xem các bước hướng dẫn.', measure: 'Chạm vào mô hình (hoặc nút Đo) để ghi sự thay đổi số oxi hóa.', trigger: 'molecule', record: 'Ghi ít nhất 3 phản ứng, tự cân bằng và nhập tổng hệ số.' }),
  ppeRequired: [],
  chemicals: [],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Số oxi hóa của Mn trong KMnO₄ là:', ['+2', '+4', '+6', '+7'], 3, '+1 + x + 4·(−2) = 0 ⇒ x = +7.', 'chem-ox-number-charge'),
    quiz('q2', 'Chất khử là chất:', ['Nhận electron', 'Nhường electron, số oxi hóa tăng', 'Có số oxi hóa giảm', 'Luôn chứa oxygen'], 1, 'Chất khử nhường electron và bị oxi hóa.', 'chem-redox-oxygen-only'),
    quiz('q3', 'Số oxi hóa của O trong H₂O₂ là:', ['−2', '−1', '0', '+1'], 1, 'Trong peroxide, O có số oxi hóa −1.', 'chem-ox-number-charge')
  ],
  postQuiz: [
    quiz('p1', 'Trong phản ứng MnO₂ + 4HCl → MnCl₂ + Cl₂ + 2H₂O, chất khử là:', ['MnO₂', 'HCl', 'MnCl₂', 'H₂O'], 1, 'Cl từ −1 lên 0.', 'chem-redox-oxygen-only'),
    quiz('p2', 'Tổng hệ số của 4NH₃ + 5O₂ → 4NO + 6H₂O là:', ['19', '9', '10', '15'], 0, '4 + 5 + 4 + 6 = 19.'),
    quiz('p3', 'Số oxi hóa của S trong H₂SO₄ là:', ['+4', '+6', '−2', '0'], 1, '2·1 + x + 4·(−2) = 0.', 'chem-ox-number-charge')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Trình bày cách nhận diện chất khử, chất oxi hóa và nguyên tắc thăng bằng electron.',
  conclusionKeywords: ['số oxi hóa', 'chất khử', 'chất oxi hóa', 'electron'],
  tags: ['oxi hóa – khử', 'số oxi hóa', 'thăng bằng electron'],
  source: 'builtin'
};

export const rateFactorsPlugin: LabPluginDef = {
  id: 'hh10-cac-yeu-to-toc-do',
  version: 1,
  subject: 'chemistry',
  title: 'Tốc độ phản ứng và các yếu tố ảnh hưởng',
  shortTitle: 'Bài 19 – Các yếu tố tốc độ',
  sgkRef: 'Hóa học 10 – Bài 19: Tốc độ phản ứng',
  chapter: 'Chương 6. Tốc độ phản ứng',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Tính tốc độ trung bình của phản ứng v̄ = |ΔC|/Δt.',
    'Khảo sát ảnh hưởng của nồng độ, nhiệt độ, áp suất, diện tích bề mặt và chất xúc tác.',
    'Rèn nguyên tắc chỉ thay đổi một yếu tố trong mỗi phép so sánh.'
  ],
  theory:
    'Tốc độ trung bình v̄ = |ΔC|/Δt. Tăng nồng độ, nhiệt độ, áp suất chất khí, diện tích bề mặt chất rắn hoặc dùng chất xúc tác đều làm tăng tốc độ phản ứng. Quy tắc Van’t Hoff: tăng 10 °C, tốc độ tăng γ lần (thường 2–4). Áp suất chỉ ảnh hưởng đáng kể khi có chất khí tham gia.',
  equation: 'v̄ = |ΔC| / Δt',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'flask-syringe', reagentA: 'Dung dịch', reagentB: 'Chất rắn/xúc tác', showSyringe: true },
  solverId: 'rate-factors',
  params: [
    { key: 'system', label: 'Hệ phản ứng', unit: '', min: 0, max: 2, step: 1, default: 0, options: [{ value: 0, label: 'CaCO₃ + HCl' }, { value: 1, label: 'H₂O₂ phân hủy' }, { value: 2, label: '2NO + O₂ (khí)' }] },
    { key: 'C', label: 'Nồng độ dung dịch', unit: 'mol/L', min: 0.1, max: 1, step: 0.1, default: 0.5, showIf: { key: 'system', in: [0, 1] } },
    { key: 'T', label: 'Nhiệt độ', unit: '°C', min: 15, max: 55, step: 5, default: 25 },
    { key: 'area', label: 'Kích thước hạt CaCO₃', unit: '', min: 0, max: 2, step: 1, default: 0, options: [{ value: 0, label: 'Viên to' }, { value: 1, label: 'Viên nhỏ' }, { value: 2, label: 'Bột' }], showIf: { key: 'system', in: [0] } },
    { key: 'cat', label: 'Chất xúc tác', unit: '', min: 0, max: 2, step: 1, default: 0, options: [{ value: 0, label: 'Không' }, { value: 1, label: 'MnO₂' }, { value: 2, label: 'Catalase' }], showIf: { key: 'system', in: [1] } },
    { key: 'P', label: 'Áp suất', unit: 'bar', min: 1, max: 5, step: 0.5, default: 1, showIf: { key: 'system', in: [2] } },
    { key: 'dt', label: 'Khoảng thời gian Δt', unit: 's', min: 10, max: 60, step: 10, default: 30 }
  ],
  hidden: [
    { key: 'k', label: 'Hằng số tốc độ', unit: '1/s', min: 0.0003, max: 0.0005, decimals: 6 },
    { key: 'gamma', label: 'Hệ số Van’t Hoff', unit: '', min: 2, max: 3, decimals: 2 }
  ],
  measurements: [{ key: 'dC', label: 'Độ giảm nồng độ |ΔC|', unit: 'mmol/L', decimals: 2 }],
  derived: [{ key: 'v', label: 'Tốc độ v̄', unit: 'mmol/(L·s)', decimals: 4, expr: 'dC / dt' }],
  charts: [
    { id: 'v-T', title: 'Tốc độ theo nhiệt độ', kind: 'scatter', x: 'T', y: 'v', xLabel: 'T (°C)', yLabel: 'v̄ (mmol/(L·s))', groupBy: 'system' },
    { id: 'v-C', title: 'Tốc độ theo nồng độ', kind: 'scatter', fit: 'linear', x: 'C', y: 'v', xLabel: 'C (mol/L)', yLabel: 'v̄ (mmol/(L·s))', groupBy: 'system', showIf: { key: 'system', in: [0, 1] } },
    { id: 'v-P', title: 'Tốc độ theo áp suất', kind: 'scatter', x: 'P', y: 'v', xLabel: 'p (bar)', yLabel: 'v̄ (mmol/(L·s))', showIf: { key: 'system', in: [2] } },
    { id: 'v-area', title: 'Tốc độ theo kích thước hạt', kind: 'bar', x: 'area', y: 'v', xLabel: 'Hạt CaCO₃', yLabel: 'v̄', showIf: { key: 'system', in: [0] } },
    { id: 'v-cat', title: 'Tốc độ theo chất xúc tác', kind: 'bar', x: 'cat', y: 'v', xLabel: 'Xúc tác', yLabel: 'v̄', showIf: { key: 'system', in: [1] } }
  ],
  minTrials: 5,
  result: { key: 'v', label: 'Tốc độ trung bình v̄ (theo thông số lần đo cuối)', unit: 'mmol/(L·s)', tolerancePercent: 5, decimals: 4, hint: 'v̄ = |ΔC|/Δt; nếu đo lặp cùng thông số thì lấy trung bình.' },
  steps: [
    { id: 's1', title: 'Bảo hộ và kiểm tra nhãn', instruction: 'Đeo kính, găng tay, đọc nhãn hóa chất.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Lắp bình phản ứng', instruction: 'Kéo bình vào vị trí nối với xi lanh thu khí.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn yếu tố khảo sát', instruction: 'Chỉ thay đổi MỘT yếu tố so với lần đo trước.', action: 'adjust' },
    { id: 's4', title: 'Tiến hành và ghi |ΔC|', instruction: 'Chạm vào lọ chất rắn/xúc tác (hoặc nút Đo).', action: 'measure', trigger: 'catalyst', requiresPpe: true },
    { id: 's5', title: 'So sánh, kết luận', instruction: 'Ghi ít nhất 5 lần đo, xem biểu đồ và rút ra kết luận.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Hydrochloric acid', formula: 'HCl', concentration: '0,1–1 M', hazards: ['Ăn mòn', 'Kích ứng hô hấp'] },
    { name: 'Hydrogen peroxide', formula: 'H₂O₂', concentration: '0,1–1 M', hazards: ['Chất oxi hóa', 'Kích ứng da, mắt'] },
    { name: 'Calcium carbonate', formula: 'CaCO₃', concentration: 'Rắn', hazards: ['Bụi gây kích ứng'] },
    { name: 'Nitrogen monoxide', formula: 'NO', concentration: 'Khí (chỉ mô phỏng)', hazards: ['Độc', 'Sinh NO₂ nâu đỏ độc'] }
  ],
  incidents: [{ id: 'over-pressure', title: 'Áp suất cao', message: 'Bình kín trên 4 bar: chỉ thực hiện với bình chịu áp có van an toàn.', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Nghiền nhỏ đá vôi làm tốc độ phản ứng với HCl tăng vì:', ['Tăng diện tích bề mặt tiếp xúc', 'Tăng khối lượng đá vôi', 'Tăng nồng độ HCl', 'Giảm nhiệt độ'], 0, 'Diện tích tiếp xúc lớn → nhiều va chạm hơn.'),
    quiz('q2', 'Áp suất ảnh hưởng đáng kể đến tốc độ phản ứng khi:', ['Có chất khí tham gia', 'Chỉ có chất rắn', 'Chỉ có chất lỏng', 'Mọi trường hợp'], 0, 'Tăng áp suất = tăng nồng độ chất khí.'),
    quiz('q3', 'Chất xúc tác sau phản ứng:', ['Bị tiêu hao hết', 'Không đổi về lượng', 'Tăng lên', 'Thành sản phẩm'], 1, 'Chất xúc tác không bị tiêu hao.', 'chem-catalyst-consumed')
  ],
  postQuiz: [
    quiz('p1', 'ΔC = 12 mmol/L trong 30 s. v̄ =', ['0,4 mmol/(L·s)', '360 mmol/(L·s)', '2,5 mmol/(L·s)', '0,04 mmol/(L·s)'], 0, '12/30 = 0,4.'),
    quiz('p2', 'Tăng nhiệt độ 20 °C, γ = 2 thì tốc độ tăng:', ['2 lần', '4 lần', '20 lần', '8 lần'], 1, 'γ^(20/10) = 4.', 'chem-temp-no-effect-rate'),
    quiz('p3', 'Với v = k[NO]²[O₂], tăng áp suất chung 2 lần thì tốc độ tăng:', ['2 lần', '4 lần', '8 lần', '16 lần'], 2, '2²·2 = 8.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Kết luận ảnh hưởng của từng yếu tố đã khảo sát, nêu bằng chứng từ số liệu.',
  conclusionKeywords: ['tốc độ', 'nhiệt độ', 'nồng độ', 'tăng'],
  tags: ['tốc độ phản ứng', 'xúc tác', 'áp suất', 'diện tích bề mặt'],
  source: 'builtin'
};

export const halogenPlugin: LabPluginDef = {
  id: 'hh10-nhom-halogen',
  version: 1,
  subject: 'chemistry',
  title: 'Nhóm halogen: xu hướng biến đổi và nhận biết ion halide',
  shortTitle: 'Bài 23 – Nhóm halogen',
  sgkRef: 'Hóa học 10 – Bài 23: Ôn tập chương 7',
  chapter: 'Chương 7. Nguyên tố nhóm halogen',
  grade: 10,
  durationMin: 35,
  objectives: [
    'Nêu cấu hình electron lớp ngoài cùng ns²np⁵ và xu hướng biến đổi từ F đến I.',
    'So sánh tính chất dãy HX: tính acid tăng từ HF đến HI; HF sôi cao bất thường và ăn mòn thủy tinh.',
    'Nhận biết ion F⁻, Cl⁻, Br⁻, I⁻ bằng dung dịch AgNO₃.'
  ],
  theory:
    'Halogen có 7 electron lớp ngoài cùng (ns²np⁵), dễ nhận 1 electron. Từ F đến I: bán kính tăng, độ âm điện và tính oxi hóa giảm, màu đậm dần, nhiệt độ sôi tăng. Tính acid: HF < HCl < HBr < HI; HF là acid yếu, có liên kết hydrogen nên sôi cao bất thường, ăn mòn thủy tinh (SiO₂ + 4HF → SiF₄ + 2H₂O). Nhận biết: AgCl trắng, AgBr vàng nhạt, AgI vàng; AgF tan nên không có kết tủa.',
  equation: 'Ag⁺ + X⁻ → AgX↓',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'tubes', reagentA: 'AgNO₃', reagentB: 'Lọ A–D', showBath: false, tubeBase: '#7dd3fc' },
  solverId: 'halogen-id',
  params: [
    { key: 'sample', label: 'Lọ mất nhãn', unit: '', min: 0, max: 3, step: 1, default: 0, options: ['A', 'B', 'C', 'D'].map((x, i) => ({ value: i, label: `Lọ ${x}` })) },
    { key: 'element', label: 'Tra cứu halogen', unit: '', min: 0, max: 3, step: 1, default: 1, options: HALOGENS.map((x, i) => ({ value: i, label: x.symbol })) }
  ],
  hidden: [{ key: 'perm', label: 'Thứ tự ion trong các lọ', unit: '', min: 0, max: 23, decimals: 0 }],
  measurements: [{ key: 'color', label: 'Hiện tượng với AgNO₃', unit: '', decimals: 0, valueLabels: { '0': 'Không kết tủa', '1': 'Kết tủa trắng', '2': 'Kết tủa vàng nhạt', '3': 'Kết tủa vàng' } }],
  charts: [{ id: 'color', title: 'Hiện tượng theo lọ (0: không · 1: trắng · 2: vàng nhạt · 3: vàng)', kind: 'bar', x: 'sample', y: 'color', xLabel: 'Lọ', yLabel: 'Mức màu' }],
  minTrials: 4,
  result: { key: 'Z', label: 'Số hiệu nguyên tử Z của halogen trong LỌ C', unit: '', tolerancePercent: 0.5, decimals: 0, hint: 'Đối chiếu màu kết tủa của lọ C: không → F (9); trắng → Cl (17); vàng nhạt → Br (35); vàng → I (53).' },
  steps: [
    { id: 's1', title: 'Bảo hộ và kiểm tra nhãn AgNO₃', instruction: 'Đeo kính, găng tay; đọc nhãn silver nitrate.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt giá ống nghiệm', instruction: 'Kéo giá ống nghiệm vào điểm gắn.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn lọ cần thử', instruction: 'Chọn lọ A, B, C hoặc D; tra cứu halogen để đối chiếu.', action: 'adjust' },
    { id: 's4', title: 'Nhỏ AgNO₃ – quan sát', instruction: 'Chạm vào lọ mẫu (hoặc nút Đo) và ghi hiện tượng.', action: 'measure', trigger: 'reagent-b', requiresPpe: true },
    { id: 's5', title: 'Gọi tên ion trong 4 lọ', instruction: 'Thử đủ 4 lọ, kết luận và nhập Z của halogen trong lọ C.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Silver nitrate', formula: 'AgNO₃', concentration: '0,1 M', hazards: ['Ăn mòn', 'Làm đen da', 'Độc với thủy sinh'] },
    { name: 'Các muối sodium halide', formula: 'NaF, NaCl, NaBr, NaI', concentration: '0,1 M', hazards: ['NaF độc khi nuốt'] }
  ],
  incidents: [],
  preQuiz: [
    quiz('q1', 'Cấu hình electron lớp ngoài cùng của halogen:', ['ns²np³', 'ns²np⁵', 'ns²np⁶', 'ns²'], 1, '7 electron ngoài cùng.'),
    quiz('q2', 'Acid mạnh nhất trong dãy HX là:', ['HF', 'HCl', 'HBr', 'HI'], 3, 'Tính acid tăng từ HF đến HI.', 'chem-hf-strong'),
    quiz('q3', 'Từ F₂ đến I₂, tính oxi hóa:', ['Tăng dần', 'Giảm dần', 'Không đổi', 'Tăng rồi giảm'], 1, 'Độ âm điện giảm, bán kính tăng.')
  ],
  postQuiz: [
    quiz('p1', 'Kết tủa AgBr có màu:', ['Trắng', 'Vàng nhạt', 'Vàng', 'Đen'], 1, 'AgCl trắng, AgBr vàng nhạt, AgI vàng.'),
    quiz('p2', 'HF có nhiệt độ sôi cao bất thường vì:', ['Là acid mạnh nhất', 'Có liên kết hydrogen giữa các phân tử', 'Có khối lượng lớn nhất', 'Là hợp chất ion'], 1, 'Liên kết hydrogen liên phân tử.', 'chem-hf-strong'),
    quiz('p3', 'Dung dịch nào KHÔNG tạo kết tủa với AgNO₃?', ['NaF', 'NaCl', 'NaBr', 'NaI'], 0, 'AgF tan tốt trong nước.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu ion trong từng lọ kèm bằng chứng và xu hướng biến đổi tính chất từ F đến I.',
  conclusionKeywords: ['kết tủa', 'halogen', 'lọ'],
  tags: ['halogen', 'AgNO₃', 'hydrogen halide'],
  source: 'builtin'
};
