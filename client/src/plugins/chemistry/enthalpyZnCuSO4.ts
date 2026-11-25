/**
 * Plugin Hóa học 10 — Bài 17: Biến thiên enthalpy trong các phản ứng hóa học.
 * Phân biệt phản ứng tỏa nhiệt (ΔrH < 0) và thu nhiệt (ΔrH > 0) bằng nhiệt lượng kế đơn giản.
 * Bộ giải: enthalpy-multi. Thông số ẩn loss: phần nhiệt thất thoát.
 */
import type { LabPluginDef } from '../../types/lab';
import { ENTHALPY_REACTIONS } from '../../engines/chemistry/conceptSolver';
import { quiz } from '../pluginHelpers';

export const enthalpyZnCuSO4Plugin: LabPluginDef = {
  id: 'hh10-enthalpy-zn-cuso4',
  version: 2,
  subject: 'chemistry',
  title: 'Biến thiên enthalpy: phản ứng tỏa nhiệt và thu nhiệt',
  shortTitle: 'Bài 17 – Biến thiên enthalpy',
  sgkRef: 'Hóa học 10 – Bài 17: Biến thiên enthalpy trong các phản ứng hóa học',
  chapter: 'Chương 5. Năng lượng hóa học',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Phân biệt phản ứng tỏa nhiệt (ΔrH < 0) và thu nhiệt (ΔrH > 0) qua biến thiên nhiệt độ.',
    'Tính Q = m·c·ΔT và ΔrH = −Q/n từ số liệu thực nghiệm.',
    'Tính ΔrH°₂₉₈ theo ΔfH°₂₉₈ và nêu điều kiện chuẩn: 1 bar, 1 mol/L, 25 °C (298 K).'
  ],
  theory:
    'Phản ứng tỏa nhiệt: hệ nhường nhiệt cho môi trường, ΔrH < 0, nhiệt độ dung dịch tăng. Phản ứng thu nhiệt: hệ nhận nhiệt, ΔrH > 0, nhiệt độ dung dịch giảm. Với m ≈ V (g), c = 4,18 J/(g·K): Q = m·c·ΔT, ΔrH = −Q/n. Biến thiên enthalpy chuẩn ΔrH°₂₉₈ = ΣΔfH°₂₉₈(sản phẩm) − ΣΔfH°₂₉₈(chất đầu), xét ở điều kiện chuẩn (1 bar với chất khí, 1 mol/L với chất tan, thường chọn 25 °C hay 298 K).',
  equation: 'ΔrH = −m·c·ΔT / n',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'calorimeter', reagentA: 'Dung dịch', reagentB: 'Chất thêm vào', showThermometer: true },
  solverId: 'enthalpy-multi',
  params: [
    { key: 'rxn', label: 'Quá trình', unit: '', min: 0, max: ENTHALPY_REACTIONS.length - 1, step: 1, default: 0, options: ENTHALPY_REACTIONS.map((r, i) => ({ value: i, label: r.label })) },
    { key: 'C', label: 'Nồng độ chất phản ứng hết', unit: 'mol/L', min: 0.2, max: 1, step: 0.1, default: 0.5 },
    { key: 'V', label: 'Thể tích dung dịch', unit: 'mL', min: 25, max: 100, step: 5, default: 50 }
  ],
  hidden: [{ key: 'loss', label: 'Tỉ lệ thất thoát nhiệt', unit: '', min: 0.03, max: 0.08, decimals: 3 }],
  measurements: [
    { key: 'T0', label: 'Nhiệt độ đầu', unit: '°C', decimals: 1 },
    { key: 'T1', label: 'Nhiệt độ cuối', unit: '°C', decimals: 1 },
    { key: 'dT', label: 'ΔT', unit: '°C', decimals: 1 }
  ],
  derived: [
    { key: 'n', label: 'Số mol n', unit: 'mol', decimals: 4 },
    { key: 'Q', label: 'Q = m·c·ΔT', unit: 'J', decimals: 0 }
  ],
  charts: [
    { id: 'dT-C', title: 'Biến thiên nhiệt độ theo nồng độ', kind: 'scatter', x: 'C', y: 'dT', xLabel: 'C (mol/L)', yLabel: 'ΔT (°C)', groupBy: 'rxn', refLine: { value: 0, label: 'ΔT = 0' } },
    { id: 'dT-trial', title: 'ΔT theo lần đo', kind: 'bar', x: 'index', y: 'dT', xLabel: 'Lần đo', yLabel: 'ΔT (°C)' }
  ],
  minTrials: 3,
  result: { key: 'dH', label: 'Biến thiên enthalpy ΔrH của quá trình ở lần đo cuối', unit: 'kJ/mol', tolerancePercent: 12, decimals: 1, hint: 'ΔrH = −Q/n (đổi J → kJ). Nhớ DẤU: tỏa nhiệt âm, thu nhiệt dương.' },
  steps: [
    { id: 's1', title: 'Bảo hộ & kiểm tra nhãn', instruction: 'Đeo kính, găng tay; đọc nhãn hóa chất.', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt cốc nhiệt lượng kế', instruction: 'Kéo cốc xốp vào vị trí, cắm nhiệt kế.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn quá trình, nồng độ, thể tích', instruction: 'Chọn quá trình cần khảo sát; đọc nhiệt độ đầu.', action: 'adjust' },
    { id: 's4', title: 'Trộn – đọc nhiệt độ cuối', instruction: 'Chạm vào lọ chất thêm vào (hoặc nút Đo), khuấy và đọc nhiệt độ.', action: 'measure', trigger: 'reagent-b', requiresPpe: true },
    { id: 's5', title: 'Tính ΔrH, phân loại', instruction: 'Đo ít nhất 3 lần, gồm cả quá trình tỏa nhiệt và thu nhiệt.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Copper(II) sulfate', formula: 'CuSO₄', concentration: '0,2–1,0 M', hazards: ['Có hại khi nuốt', 'Độc với thủy sinh'] },
    { name: 'Hydrochloric acid', formula: 'HCl', concentration: '0,2–1,0 M', hazards: ['Ăn mòn'] },
    { name: 'Sodium hydroxide', formula: 'NaOH', concentration: '0,2–1,0 M', hazards: ['Ăn mòn', 'Gây bỏng'] },
    { name: 'Ammonium nitrate', formula: 'NH₄NO₃', concentration: 'Rắn', hazards: ['Chất oxi hóa', 'Tránh xa nguồn nhiệt'] },
    { name: 'Sodium hydrogencarbonate', formula: 'NaHCO₃', concentration: 'Rắn', hazards: ['Ít độc'] }
  ],
  incidents: [{ id: 'hot-splash', title: 'Dung dịch nóng bắn', message: 'Zn với CuSO₄ trên 0,9 M làm nhiệt độ tăng mạnh. Khuấy nhẹ, đậy nắp, đeo kính.', severity: 'warning' }],
  preQuiz: [
    quiz('q1', 'Phản ứng tỏa nhiệt có:', ['ΔrH > 0', 'ΔrH < 0', 'ΔrH = 0', 'Nhiệt độ dung dịch giảm'], 1, 'Hệ mất nhiệt ⇒ ΔrH < 0, dung dịch nóng lên.', 'chem-exo-cold'),
    quiz('q2', 'Hòa tan NH₄NO₃ làm cốc lạnh đi. Đây là quá trình:', ['Tỏa nhiệt', 'Thu nhiệt', 'Không trao đổi nhiệt', 'Cháy'], 1, 'Hệ lấy nhiệt của dung dịch.', 'chem-exo-cold'),
    quiz('q3', 'Điều kiện chuẩn để xác định ΔrH° với chất khí là:', ['1 bar', '1 atm và 0 °C', '2 bar', '10 bar'], 0, '1 bar; chất tan 1 mol/L; thường chọn 298 K.')
  ],
  postQuiz: [
    quiz('p1', '50 mL CuSO₄ 0,5 M, ΔT = +25,0 °C. ΔrH ≈', ['−209 kJ/mol', '+209 kJ/mol', '−5,2 kJ/mol', '−418 kJ/mol'], 0, 'Q = 5225 J; n = 0,025 mol ⇒ −209 kJ/mol.', 'chem-exo-cold'),
    quiz('p2', 'Độ lớn |ΔrH| đo được thường nhỏ hơn giá trị chuẩn vì:', ['Thất thoát nhiệt với môi trường', 'Chất dư', 'Màu dung dịch', 'Nhiệt kế quá dài'], 0, 'Một phần nhiệt trao đổi với môi trường nên |ΔT| nhỏ hơn.'),
    quiz('p3', 'ΔrH°₂₉₈ được tính bằng:', ['ΣΔfH°(sp) − ΣΔfH°(cđ)', 'ΣΔfH°(cđ) − ΣΔfH°(sp)', 'ΣΔfH°(sp) + ΣΔfH°(cđ)', 'm·c·ΔT'], 0, 'Sản phẩm trừ chất đầu.')
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Phân loại các quá trình tỏa nhiệt/thu nhiệt, ghi ΔrH đo được và so sánh với ΔrH°₂₉₈.',
  conclusionKeywords: ['tỏa nhiệt', 'thu nhiệt', 'enthalpy'],
  tags: ['enthalpy', 'nhiệt lượng kế', 'tỏa nhiệt', 'thu nhiệt'],
  source: 'builtin'
};
