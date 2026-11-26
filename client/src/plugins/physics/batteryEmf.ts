/**
 * Plugin Vật lí — Đo suất điện động và điện trở trong của pin điện hóa.
 * (Bài thực hành mở rộng liên môn cho học sinh lớp 10 — nội dung chính thức ở Vật lí 11 KNTT, Chương IV.)
 * Bộ giải: battery-emf. Thông số ẩn: E (suất điện động, V) và r (điện trở trong, Ω).
 * Đại lượng kết quả: r = −(hệ số góc của đồ thị U theo I).
 */
import type { LabPluginDef } from '../../types/lab';

export const batteryEmfPlugin: LabPluginDef = {
  id: 'vl10-suat-dien-dong-pin',
  version: 1,
  subject: 'physics',
  title: 'Đo suất điện động và điện trở trong của pin điện hóa',
  shortTitle: '[Vật lí 11 — Mở rộng] Suất điện động & điện trở trong',
  sgkRef: 'Chuyên đề mở rộng (tham chiếu Vật lí 11 KNTT – Bài thực hành đo suất điện động và điện trở trong của pin)',
  chapter: 'Mở rộng: Dòng điện không đổi',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Lắp được mạch điện gồm pin, biến trở, điện trở bảo vệ R₀, ampe kế và vôn kế.',
    'Đo các cặp giá trị (I, U) và vẽ đồ thị U = E − I·r.',
    'Xác định suất điện động E (giao điểm với trục U) và điện trở trong r (độ dốc).'
  ],
  theory:
    'Định luật Ohm toàn mạch: I = E/(R + R₀ + r + R_A). Hiệu điện thế giữa hai cực pin: U = E − I·r. Đồ thị U theo I là đường thẳng có hệ số góc −r và cắt trục U tại E. Điện trở R₀ bảo vệ pin khỏi đoản mạch.',
  equation: 'U = E − I·r',
  sceneTemplate: 'circuit',
  sceneOptions: { batteryLabel: 'Pin 1,5 V', showR0: true },
  solverId: 'battery-emf',
  params: [
    { key: 'R', label: 'Biến trở R', unit: 'Ω', min: 0, max: 20, step: 0.5, default: 10 },
    { key: 'R0', label: 'Điện trở bảo vệ R₀', unit: 'Ω', min: 0, max: 2, step: 0.5, default: 1 }
  ],
  hidden: [
    { key: 'E', label: 'Suất điện động', unit: 'V', min: 1.45, max: 1.6, decimals: 3 },
    { key: 'r', label: 'Điện trở trong', unit: 'Ω', min: 0.6, max: 2.4, decimals: 2 }
  ],
  measurements: [
    { key: 'I', label: 'Cường độ dòng điện I', unit: 'A', decimals: 3 },
    { key: 'U', label: 'Hiệu điện thế U', unit: 'V', decimals: 3 }
  ],
  charts: [{ id: 'U-I', title: 'Đồ thị U theo I', kind: 'scatter', fit: 'linear', x: 'I', y: 'U', xLabel: 'I (A)', yLabel: 'U (V)' }],
  minTrials: 5,
  result: { key: 'r', label: 'Điện trở trong r của pin', unit: 'Ω', tolerancePercent: 6, decimals: 2, hint: 'Đo ở ≥ 5 giá trị R khác nhau, vẽ U theo I; r = −ΔU/ΔI (hồi quy tuyến tính).' },
  steps: [
    { id: 's1', title: 'Mắc vôn kế song song với pin', instruction: 'Kéo vôn kế vào hai cực của pin (điểm gắn phát sáng).', action: 'snap', trigger: 'voltmeter-slot' },
    { id: 's2', title: 'Kiểm tra ampe kế nối tiếp', instruction: 'Chạm vào ampe kế để kiểm tra đã mắc nối tiếp và đúng cực.', action: 'click', trigger: 'ammeter' },
    { id: 's3', title: 'Đặt biến trở', instruction: 'Đặt biến trở ở giá trị lớn trước khi đóng khóa K (an toàn).', action: 'adjust' },
    { id: 's4', title: 'Đóng khóa K – đọc I, U', instruction: 'Chạm vào khóa K (hoặc nút Đo) để đóng mạch và đọc số chỉ.', action: 'measure', trigger: 'switch' },
    { id: 's5', title: 'Thay đổi R, ghi bảng, vẽ đồ thị', instruction: 'Đo ít nhất 5 cặp (I, U) với R khác nhau, tính E và r.', action: 'record' }
  ],
  ppeRequired: [],
  chemicals: [],
  incidents: [{ id: 'short-circuit', title: 'Nguy cơ đoản mạch!', message: 'R + R₀ < 0,5 Ω: dòng điện quá lớn làm pin nóng, có thể phồng/chảy. Luôn mắc R₀ và để biến trở ở giá trị lớn.', severity: 'danger' }],
  preQuiz: [
    { id: 'q1', prompt: 'Suất điện động của nguồn điện đặc trưng cho:', options: ['Khả năng thực hiện công của nguồn điện', 'Điện trở của dây nối', 'Khối lượng của pin', 'Nhiệt độ của pin'], correctIndex: 0, explanation: 'E đặc trưng cho khả năng thực hiện công của lực lạ bên trong nguồn.' },
    { id: 'q2', prompt: 'Khi có dòng điện chạy qua, hiệu điện thế giữa hai cực pin so với E:', options: ['Luôn bằng E', 'Nhỏ hơn E', 'Lớn hơn E', 'Bằng 0'], correctIndex: 1, explanation: 'U = E − I·r < E do sụt áp trên điện trở trong.', misconceptionId: 'phy-emf-equals-voltage' },
    { id: 'q3', prompt: 'Dòng điện đi qua bóng đèn rồi quay về pin thì cường độ:', options: ['Giảm vì bị đèn tiêu thụ', 'Không đổi trong mạch nối tiếp', 'Tăng lên', 'Bằng 0'], correctIndex: 1, explanation: 'Năng lượng bị tiêu thụ, còn cường độ dòng điện trong mạch nối tiếp như nhau.', misconceptionId: 'phy-current-used-up' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Đồ thị U(I) cắt trục U tại 1,50 V và trục I tại 1,0 A (nếu kéo dài). r =', options: ['1,5 Ω', '0,67 Ω', '1,0 Ω', '3,0 Ω'], correctIndex: 0, explanation: 'r = E/I_đoản mạch = 1,5/1,0 = 1,5 Ω.' },
    { id: 'p2', prompt: 'Vai trò của điện trở bảo vệ R₀ là:', options: ['Tăng E', 'Hạn chế dòng điện khi R nhỏ, tránh đoản mạch', 'Đo hiệu điện thế', 'Giảm điện trở trong'], correctIndex: 1, explanation: 'R₀ giới hạn dòng điện cực đại.' },
    { id: 'p3', prompt: 'Khi mạch hở (I = 0), vôn kế chỉ:', options: ['0 V', 'Bằng E', 'Bằng I·r', 'Vô cùng'], correctIndex: 1, explanation: 'U = E − 0·r = E.', misconceptionId: 'phy-emf-equals-voltage' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'Nêu giá trị E và r tìm được, nhận xét dạng đồ thị U(I).',
  conclusionKeywords: ['suất điện động', 'điện trở trong', 'đồ thị'],
  tags: ['suất điện động', 'điện trở trong', 'định luật Ohm toàn mạch'],
  source: 'builtin'
};
