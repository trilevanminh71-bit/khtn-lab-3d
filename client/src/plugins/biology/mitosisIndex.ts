/**
 * Plugin Sinh học 10 — Bài 18: Thực hành làm và quan sát tiêu bản quá trình nguyên phân và giảm phân.
 * Bộ giải: cell-division-slide. Thông số ẩn: mi (nguyên phân), mei (giảm phân), fieldSeed (bố cục vi trường).
 */
import type { LabPluginDef } from '../../types/lab';
import { quiz } from '../pluginHelpers';

const ONION = { key: 'sample', in: [0] };
const GRASSHOPPER = { key: 'sample', in: [1] };

export const mitosisIndexPlugin: LabPluginDef = {
  id: 'sh10-chi-so-nguyen-phan',
  version: 2,
  subject: 'biology',
  title: 'Thực hành: Làm và quan sát tiêu bản quá trình nguyên phân và giảm phân',
  shortTitle: 'Bài 18 – Nguyên phân, giảm phân',
  sgkRef: 'Sinh học 10 – Bài 18: Thực hành: Làm và quan sát tiêu bản quá trình nguyên phân và giảm phân',
  chapter: 'Chương 5: Chu kì tế bào và phân bào',
  grade: 10,
  durationMin: 40,
  objectives: [
    'Nêu quy trình: cố định (Carnoy) → nhuộm (acetocarmine 2%) → làm tiêu bản ép → quan sát.',
    'Nhận diện nhiễm sắc thể ở các kì nguyên phân (đầu rễ hành) và giảm phân (ống sinh tinh châu chấu đực).',
    'Đếm tế bào trên nhiều vi trường và tính tỉ lệ tế bào đang phân chia.'
  ],
  theory:
    'Đầu rễ hành có mô phân sinh nguyên phân mạnh; ống sinh tinh của châu chấu đực có nhiều tế bào đang giảm phân. Mẫu được cố định bằng dung dịch Carnoy, nhuộm acetocarmine 2% để NST bắt màu đỏ, rồi đặt lên lam kính, dàn mỏng. Kì giữa nguyên phân: NST kép xếp một hàng; kì giữa giảm phân I: các cặp NST kép tương đồng xếp hai hàng.',
  equation: 'Tỉ lệ phân chia = Σ tế bào ở các kì / Σ tổng × 100%',
  sceneTemplate: 'microscope',
  sceneOptions: { slideLabel: 'Tiêu bản ép', allowSpecimenSwitch: true },
  solverId: 'cell-division-slide',
  params: [
    { key: 'sample', label: 'Mẫu vật', unit: '', min: 0, max: 1, step: 1, default: 0, options: [{ value: 0, label: 'Đầu rễ hành (nguyên phân)' }, { value: 1, label: 'Ống sinh tinh châu chấu (giảm phân)' }] },
    { key: 'fix', label: 'Thời gian cố định (Carnoy)', unit: 'phút', min: 5, max: 40, step: 5, default: 20 },
    { key: 'stain', label: 'Thời gian nhuộm acetocarmine 2%', unit: 'phút', min: 5, max: 30, step: 5, default: 15 },
    { key: 'field', label: 'Vi trường số', unit: '', min: 1, max: 12, step: 1, default: 1 }
  ],
  hidden: [
    { key: 'mi', label: 'Tỉ lệ nguyên phân', unit: '', min: 0.1, max: 0.18, decimals: 3 },
    { key: 'mei', label: 'Tỉ lệ giảm phân', unit: '', min: 0.3, max: 0.5, decimals: 3 },
    { key: 'fieldSeed', label: 'Hạt giống vi trường', unit: '', min: 1000, max: 9999, decimals: 0 }
  ],
  measurements: [
    { key: 'total', label: 'Tổng số TB', unit: 'TB', decimals: 0 },
    { key: 'pro', label: 'Kì đầu', unit: 'TB', decimals: 0, showIf: ONION },
    { key: 'meta', label: 'Kì giữa', unit: 'TB', decimals: 0, showIf: ONION },
    { key: 'ana', label: 'Kì sau', unit: 'TB', decimals: 0, showIf: ONION },
    { key: 'telo', label: 'Kì cuối', unit: 'TB', decimals: 0, showIf: ONION },
    { key: 'pro1', label: 'Kì đầu I', unit: 'TB', decimals: 0, showIf: GRASSHOPPER },
    { key: 'meta1', label: 'Kì giữa I', unit: 'TB', decimals: 0, showIf: GRASSHOPPER },
    { key: 'ana1', label: 'Kì sau I', unit: 'TB', decimals: 0, showIf: GRASSHOPPER },
    { key: 'telo1', label: 'Kì cuối I', unit: 'TB', decimals: 0, showIf: GRASSHOPPER },
    { key: 'mei2', label: 'Giảm phân II', unit: 'TB', decimals: 0, showIf: GRASSHOPPER }
  ],
  derived: [{ key: 'ratio', label: 'Tỉ lệ phân chia', unit: '%', decimals: 1 }],
  charts: [
    { id: 'ratio', title: 'Tỉ lệ tế bào đang phân chia theo vi trường', kind: 'bar', x: 'field', y: 'ratio', xLabel: 'Vi trường', yLabel: '%', groupBy: 'sample' },
    { id: 'pro', title: 'Số tế bào ở kì đầu theo vi trường', kind: 'bar', x: 'field', y: 'pro', xLabel: 'Vi trường', yLabel: 'TB', showIf: ONION }
  ],
  minTrials: 5,
  result: { key: 'ratio', label: 'Tỉ lệ tế bào đang phân chia của mẫu ở lần đo cuối', unit: '%', tolerancePercent: 15, decimals: 1, hint: 'Cộng dồn mọi vi trường khác nhau của CÙNG một mẫu: Σ tế bào ở các kì / Σ tổng × 100.' },
  steps: [
    { id: 's1', title: 'Cố định, nhuộm và làm tiêu bản', instruction: 'Trang bị bảo hộ; chạm vào ống nhỏ giọt để cố định bằng Carnoy và nhuộm acetocarmine 2%.', action: 'click', trigger: 'dropper', requiresPpe: true },
    { id: 's2', title: 'Đặt tiêu bản lên bàn kính', instruction: 'Kéo tiêu bản lên bàn kính hiển vi.', action: 'snap', trigger: 'stage-slot' },
    { id: 's3', title: 'Bật đèn, tìm vùng phân chia', instruction: 'Chạm vào đèn; tìm vùng có nhiều tế bào đang phân chia.', action: 'click', trigger: 'light' },
    { id: 's4', title: 'Chọn mẫu và vi trường', instruction: 'Chọn mẫu, thời gian nhuộm và vi trường.', action: 'adjust' },
    { id: 's5', title: 'Đếm tế bào ở từng kì', instruction: 'Chạm vào ốc vi cấp (hoặc nút Đo).', action: 'measure', trigger: 'fine-knob' },
    { id: 's6', title: 'Tổng hợp nhiều vi trường', instruction: 'Đếm ít nhất 5 vi trường khác nhau của cùng một mẫu.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Dung dịch Carnoy', formula: 'ethanol : acetic acid (3 : 1)', concentration: '—', hazards: ['Dễ cháy', 'Ăn mòn'] },
    { name: 'Acetocarmine', formula: '—', concentration: '2%', hazards: ['Nhuộm màu', 'Kích ứng'] }
  ],
  incidents: [
    { id: 'poor-fix', title: 'Cố định chưa đủ', message: 'Cố định dưới 10 phút: tế bào biến dạng, ảnh mờ. Hãy tăng thời gian cố định.', severity: 'warning' },
    { id: 'overstain', title: 'Nhuộm quá lâu', message: 'Nhuộm trên 25 phút làm cả tế bào chất bắt màu, khó nhận diện NST.', severity: 'warning' }
  ],
  preQuiz: [
    quiz('q1', 'Kì trung gian là giai đoạn:', ['Tế bào nghỉ ngơi', 'Tế bào sinh trưởng, nhân đôi DNA', 'NST co xoắn cực đại', 'Tế bào chất phân chia'], 1, 'Kì trung gian có hoạt động mạnh, pha S nhân đôi DNA.', 'bio-mitosis-interphase-rest'),
    quiz('q2', 'Kì giữa giảm phân I, NST kép xếp thành:', ['Một hàng', 'Hai hàng', 'Ba hàng', 'Không xếp hàng'], 1, 'Các cặp tương đồng xếp hai hàng.'),
    quiz('q3', 'Dung dịch Carnoy dùng để:', ['Nhuộm NST', 'Cố định mẫu', 'Rửa lam kính', 'Nuôi tế bào'], 1, 'Carnoy giữ nguyên trạng thái tế bào.')
  ],
  postQuiz: [
    quiz('p1', 'Đếm 500 tế bào, 60 đang phân chia. Tỉ lệ là:', ['12%', '6%', '60%', '8,3%'], 0, '60/500 = 12%.'),
    quiz('p2', 'Phần lớn tế bào đầu rễ hành ở kì trung gian vì:', ['Kì trung gian chiếm thời gian dài nhất', 'Tế bào đã chết', 'Thuốc nhuộm kém', 'Kính hiển vi yếu'], 0, 'Tỉ lệ tế bào phản ánh thời gian tương đối.', 'bio-mitosis-interphase-rest'),
    quiz('p3', 'Kết quả giảm phân từ một tế bào (2n) là:', ['2 tế bào 2n', '4 tế bào n', '2 tế bào n', '4 tế bào 2n'], 1, 'Hai lần phân bào, một lần nhân đôi DNA.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'So sánh hình ảnh nguyên phân và giảm phân, ghi tỉ lệ tế bào đang phân chia.',
  conclusionKeywords: ['nguyên phân', 'giảm phân', 'nhiễm sắc thể'],
  tags: ['nguyên phân', 'giảm phân', 'Carnoy', 'acetocarmine'],
  source: 'builtin'
};
