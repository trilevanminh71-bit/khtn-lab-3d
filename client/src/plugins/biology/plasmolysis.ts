/**
 * Plugin Sinh học 10 — Thí nghiệm co nguyên sinh và phản co nguyên sinh
 * (SGK KNTT Sinh học 10, Bài 12: Thực hành thí nghiệm co và phản co nguyên sinh).
 * Bộ giải: plasmolysis. Thông số ẩn cIso: nồng độ saccharose đẳng trương với dịch bào (mol/L).
 */
import type { LabPluginDef } from '../../types/lab';

export const plasmolysisPlugin: LabPluginDef = {
  id: 'sh10-co-nguyen-sinh',
  version: 1,
  subject: 'biology',
  title: 'Co nguyên sinh và phản co nguyên sinh ở tế bào biểu bì vảy hành tím',
  shortTitle: 'Co nguyên sinh',
  sgkRef: 'Sinh học 10 – Bài 12: Thực hành thí nghiệm co và phản co nguyên sinh',
  chapter: 'Chương 3: Trao đổi chất qua màng và truyền tin tế bào',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Quan sát hiện tượng co nguyên sinh khi đặt tế bào trong dung dịch ưu trương và phản co nguyên sinh khi chuyển sang nước cất.',
    'Giải thích bằng sự thẩm thấu: nước di chuyển từ nơi thế nước cao đến nơi thế nước thấp.',
    'Xác định nồng độ dung dịch đẳng trương với dịch bào (≈ 50% tế bào co nguyên sinh chớm).'
  ],
  theory:
    'Màng sinh chất là màng bán thấm. Trong dung dịch ưu trương, nước đi ra khỏi tế bào, khối nguyên sinh chất co lại tách khỏi thành tế bào (co nguyên sinh). Đưa trở lại nước cất (nhược trương), nước đi vào, tế bào trở lại bình thường (phản co nguyên sinh). Thế thẩm thấu Ψs = −C·R·T.',
  equation: 'Ψs = −C·R·T',
  sceneTemplate: 'microscope',
  sceneOptions: { slideLabel: 'Biểu bì vảy hành tím', allowSpecimenSwitch: false },
  solverId: 'plasmolysis',
  params: [
    { key: 'C', label: 'Nồng độ dung dịch saccharose (0 = nước cất)', unit: 'mol/L', min: 0, max: 0.8, step: 0.05, default: 0.3 },
    { key: 'time', label: 'Thời gian ngâm', unit: 'phút', min: 1, max: 15, step: 1, default: 10 }
  ],
  hidden: [{ key: 'cIso', label: 'Nồng độ đẳng trương', unit: 'mol/L', min: 0.28, max: 0.42, decimals: 3 }],
  measurements: [
    { key: 'plasmolyzed', label: 'Số TB co nguyên sinh', unit: 'TB', decimals: 0 },
    { key: 'total', label: 'Tổng số TB đếm', unit: 'TB', decimals: 0 },
    { key: 'percent', label: 'Tỉ lệ co nguyên sinh', unit: '%', decimals: 0 }
  ],
  minTrials: 5,
  result: { key: 'cIso', label: 'Nồng độ saccharose đẳng trương với dịch bào', unit: 'mol/L', tolerancePercent: 8, decimals: 2, hint: 'Ngâm ≥ 8 phút ở nhiều nồng độ; nồng độ làm khoảng 50% tế bào co nguyên sinh chính là nồng độ đẳng trương.' },
  steps: [
    { id: 's1', title: 'Đặt tiêu bản biểu bì hành', instruction: 'Kéo lam kính có lớp biểu bì vảy hành tím lên bàn kính.', action: 'snap', trigger: 'stage-slot' },
    { id: 's2', title: 'Bật đèn, quan sát ở 10×', instruction: 'Chạm vào đèn, quan sát tế bào bình thường trong nước cất.', action: 'click', trigger: 'light' },
    { id: 's3', title: 'Chọn nồng độ & thời gian', instruction: 'Chọn nồng độ saccharose và thời gian ngâm.', action: 'adjust' },
    { id: 's4', title: 'Nhỏ dung dịch – đếm tế bào', instruction: 'Chạm vào ống nhỏ giọt (hoặc nút Đo) và đếm số tế bào co nguyên sinh trong 50 tế bào.', action: 'measure', trigger: 'dropper' },
    { id: 's5', title: 'Phản co nguyên sinh & kết luận', instruction: 'Đo ≥ 5 nồng độ, thử lại với nước cất (C = 0) để quan sát phản co nguyên sinh.', action: 'record' }
  ],
  ppeRequired: ['gloves'],
  chemicals: [{ name: 'Saccharose', formula: 'C₁₂H₂₂O₁₁', concentration: '0–0,8 M', hazards: ['Không độc'] }],
  incidents: [],
  preQuiz: [
    { id: 'q1', prompt: 'Trong dung dịch ưu trương, nước di chuyển:', options: ['Từ ngoài vào trong tế bào', 'Từ trong tế bào ra ngoài', 'Không di chuyển', 'Chất tan đi vào tế bào'], correctIndex: 1, explanation: 'Nước đi từ nơi thế nước cao (trong tế bào) ra nơi thế nước thấp (dung dịch ưu trương).', misconceptionId: 'bio-solute-moves' },
    { id: 'q2', prompt: 'Co nguyên sinh là hiện tượng:', options: ['Thành tế bào co lại', 'Khối nguyên sinh chất co lại tách khỏi thành tế bào', 'Tế bào vỡ ra', 'Nhân tế bào biến mất'], correctIndex: 1, explanation: 'Thành tế bào cứng hầu như không co; chỉ khối nguyên sinh chất co lại.' },
    { id: 'q3', prompt: 'Tế bào hồng cầu đặt trong nước cất sẽ:', options: ['Co lại', 'Trương lên và có thể vỡ', 'Không đổi', 'Co nguyên sinh'], correctIndex: 1, explanation: 'Tế bào động vật không có thành nên trương và vỡ.', misconceptionId: 'bio-cell-wall-only-plant' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Ở 0,30 M có 10% tế bào co nguyên sinh, ở 0,40 M có 90%. Nồng độ đẳng trương gần nhất:', options: ['0,35 M', '0,10 M', '0,60 M', '0,90 M'], correctIndex: 0, explanation: 'Khoảng 50% nằm giữa 0,30 và 0,40 M.' },
    { id: 'p2', prompt: 'Phản co nguyên sinh xảy ra khi:', options: ['Chuyển tế bào đã co sang nước cất', 'Tăng nồng độ đường', 'Đun nóng tiêu bản', 'Nhuộm màu'], correctIndex: 0, explanation: 'Môi trường nhược trương làm nước đi vào tế bào.', misconceptionId: 'bio-solute-moves' },
    { id: 'p3', prompt: 'Thế thẩm thấu của dung dịch saccharose 0,4 M ở 25 °C ≈', options: ['−0,99 MPa', '+0,99 MPa', '−9,9 MPa', '0 MPa'], correctIndex: 0, explanation: 'Ψs = −0,4·0,00831·298 ≈ −0,99 MPa.' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Giải thích hiện tượng co và phản co nguyên sinh, ghi nồng độ đẳng trương tìm được.',
  conclusionKeywords: ['ưu trương', 'nhược trương', 'thẩm thấu', 'đẳng trương'],
  tags: ['co nguyên sinh', 'thẩm thấu', 'màng bán thấm'],
  source: 'builtin'
};
