/**
 * Plugin Hóa học 10 — Xác định biến thiên enthalpy của phản ứng Zn + copper(II) sulfate
 * (SGK KNTT Hóa học 10, Bài 17: Biến thiên enthalpy trong các phản ứng hóa học).
 * Phản ứng: Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s), ΔrH°298 ≈ −217 kJ/mol (tỏa nhiệt).
 * Bộ giải: enthalpy-zn-cuso4. Thông số ẩn: dH (kJ/mol) và loss (tỉ lệ thất thoát nhiệt của nhiệt lượng kế).
 */
import type { LabPluginDef } from '../../types/lab';

export const enthalpyZnCuSO4Plugin: LabPluginDef = {
  id: 'hh10-enthalpy-zn-cuso4',
  version: 1,
  subject: 'chemistry',
  title: 'Xác định biến thiên enthalpy của phản ứng giữa kẽm và copper(II) sulfate',
  shortTitle: 'Enthalpy Zn + CuSO₄',
  sgkRef: 'Hóa học 10 – Bài 17: Biến thiên enthalpy trong các phản ứng hóa học',
  chapter: 'Chương 5. Năng lượng hóa học',
  grade: 10,
  durationMin: 25,
  objectives: [
    'Đo độ tăng nhiệt độ của dung dịch trong nhiệt lượng kế đơn giản (cốc xốp có nắp).',
    'Tính nhiệt lượng Q = m·c·ΔT và ΔrH = −Q/n.',
    'Nhận biết phản ứng tỏa nhiệt (ΔrH < 0) và giải thích sai số hệ thống do thất thoát nhiệt.'
  ],
  theory:
    'Cho bột kẽm (dư) vào dung dịch copper(II) sulfate màu xanh lam: kẽm đẩy đồng ra khỏi muối, dung dịch nhạt màu và nóng lên. Nhiệt lượng tỏa ra Q = m·c·ΔT (m ≈ V gam, c = 4,18 J/(g·K)). Với n = C·V là số mol CuSO₄ phản ứng, ΔrH = −Q/n.',
  equation: 'Zn + CuSO₄ → ZnSO₄ + Cu',
  sceneTemplate: 'beaker',
  sceneOptions: { variant: 'calorimeter', reagentA: 'CuSO₄', reagentB: 'Bột Zn', showThermometer: true },
  solverId: 'enthalpy-zn-cuso4',
  params: [
    { key: 'C', label: 'Nồng độ CuSO₄', unit: 'mol/L', min: 0.2, max: 1, step: 0.1, default: 0.5 },
    { key: 'V', label: 'Thể tích dung dịch CuSO₄', unit: 'mL', min: 25, max: 100, step: 5, default: 50 }
  ],
  hidden: [
    { key: 'dH', label: 'Biến thiên enthalpy', unit: 'kJ/mol', min: -222, max: -212, decimals: 1 },
    { key: 'loss', label: 'Tỉ lệ thất thoát nhiệt', unit: '', min: 0.04, max: 0.1, decimals: 3 }
  ],
  measurements: [
    { key: 'T0', label: 'Nhiệt độ đầu', unit: '°C', decimals: 1 },
    { key: 'Tmax', label: 'Nhiệt độ cao nhất', unit: '°C', decimals: 1 },
    { key: 'dT', label: 'ΔT', unit: '°C', decimals: 1 }
  ],
  minTrials: 3,
  result: { key: 'dH', label: 'Biến thiên enthalpy ΔrH', unit: 'kJ/mol', tolerancePercent: 12, decimals: 0, hint: 'ΔrH = −(V·4,18·ΔT)/(C·V/1000)/1000 kJ/mol; lấy trung bình các lần đo.' },
  steps: [
    { id: 's1', title: 'Bảo hộ & kiểm tra nhãn', instruction: 'Đeo kính, găng tay; đọc nhãn copper(II) sulfate (độc với thủy sinh).', action: 'click', trigger: 'reagent-a', requiresPpe: true },
    { id: 's2', title: 'Đặt cốc xốp vào giá', instruction: 'Kéo cốc nhiệt lượng kế vào vị trí, cắm nhiệt kế.', action: 'snap', trigger: 'beaker-slot' },
    { id: 's3', title: 'Chọn nồng độ, thể tích', instruction: 'Chỉnh nồng độ và thể tích CuSO₄, đọc nhiệt độ đầu T₀.', action: 'adjust' },
    { id: 's4', title: 'Cho bột Zn – ghi T cao nhất', instruction: 'Chạm vào lọ bột kẽm (hoặc nút Đo), khuấy và đọc nhiệt độ cao nhất.', action: 'measure', trigger: 'reagent-b', requiresPpe: true },
    { id: 's5', title: 'Lặp lại & tính ΔrH', instruction: 'Đo ≥ 3 lần, tính Q và ΔrH, so sánh với −217 kJ/mol.', action: 'record' }
  ],
  ppeRequired: ['goggles', 'gloves', 'labelCheck'],
  chemicals: [
    { name: 'Copper(II) sulfate', formula: 'CuSO₄', concentration: '0,2–1,0 M', hazards: ['Có hại khi nuốt', 'Độc với sinh vật thủy sinh'] },
    { name: 'Kẽm (bột)', formula: 'Zn', concentration: 'Rắn, dư', hazards: ['Dễ cháy ở dạng bột mịn'] }
  ],
  incidents: [{ id: 'hot-splash', title: 'Dung dịch nóng bắn', message: 'Nồng độ > 0,9 M làm nhiệt độ tăng mạnh, dung dịch có thể bắn ra. Khuấy nhẹ, đậy nắp và đeo kính bảo hộ.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Phản ứng tỏa nhiệt có:', options: ['ΔrH > 0', 'ΔrH < 0', 'ΔrH = 0', 'Nhiệt độ môi trường giảm'], correctIndex: 1, explanation: 'Hệ mất nhiệt ra môi trường ⇒ ΔrH < 0, môi trường nóng lên.', misconceptionId: 'chem-exo-cold' },
    { id: 'q2', prompt: 'Màu xanh của dung dịch CuSO₄ nhạt dần vì:', options: ['Cu²⁺ bị khử thành Cu', 'Nước bay hơi', 'Zn tan làm xanh hơn', 'Nhiệt độ tăng'], correctIndex: 0, explanation: 'Zn khử Cu²⁺ thành Cu (màu đỏ).' },
    { id: 'q3', prompt: 'Nhiệt lượng hấp thụ bởi dung dịch tính bằng:', options: ['Q = m·c·ΔT', 'Q = m·g·h', 'Q = U·I', 'Q = C·V'], correctIndex: 0, explanation: 'Q = m·c·ΔT.' }
  ],
  postQuiz: [
    { id: 'p1', prompt: '50 mL CuSO₄ 0,5 M, ΔT = 25,0 °C. ΔrH ≈', options: ['−209 kJ/mol', '+209 kJ/mol', '−5,2 kJ/mol', '−418 kJ/mol'], correctIndex: 0, explanation: 'Q = 50·4,18·25 = 5225 J; n = 0,025 mol ⇒ ΔrH = −209 kJ/mol.', misconceptionId: 'chem-exo-cold' },
    { id: 'p2', prompt: 'Giá trị đo thường kém âm hơn lý thuyết vì:', options: ['Thất thoát nhiệt ra môi trường', 'Zn dư', 'CuSO₄ có màu', 'Dùng nhiệt kế'], correctIndex: 0, explanation: 'Một phần nhiệt thất thoát nên ΔT đo nhỏ hơn.' },
    { id: 'p3', prompt: 'Tăng thể tích dung dịch (giữ C) thì ΔT:', options: ['Tăng gấp đôi', 'Gần như không đổi', 'Giảm một nửa', 'Bằng 0'], correctIndex: 1, explanation: 'Cả n và m đều tăng cùng tỉ lệ nên ΔT gần như không đổi.', misconceptionId: 'chem-concentration-amount' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Ghi giá trị ΔrH, kết luận phản ứng tỏa hay thu nhiệt và nêu nguyên nhân sai số.',
  conclusionKeywords: ['tỏa nhiệt', 'enthalpy', 'sai số'],
  tags: ['enthalpy', 'nhiệt lượng kế', 'copper(II) sulfate'],
  source: 'builtin'
};
