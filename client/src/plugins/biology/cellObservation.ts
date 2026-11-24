/**
 * Plugin Sinh học 10 — Quan sát tế bào nhân sơ và tế bào nhân thực dưới kính hiển vi
 * (SGK KNTT Sinh học 10, Bài 10: Thực hành quan sát tế bào).
 * Bộ giải: cell-microscope. Thông số ẩn: L (chiều dài tế bào biểu bì hành, µm), focusBest (vị trí nét).
 */
import type { LabPluginDef } from '../../types/lab';

export const cellObservationPlugin: LabPluginDef = {
  id: 'sh10-quan-sat-te-bao',
  version: 1,
  subject: 'biology',
  title: 'Quan sát tế bào nhân sơ và tế bào nhân thực dưới kính hiển vi',
  shortTitle: 'Tế bào nhân sơ – nhân thực',
  sgkRef: 'Sinh học 10 – Bài 10: Thực hành quan sát tế bào',
  chapter: 'Phần hai. Chương 2: Cấu trúc tế bào',
  grade: 10,
  durationMin: 30,
  objectives: [
    'Sử dụng đúng kính hiển vi quang học: từ vật kính nhỏ đến lớn, chỉnh ốc sơ cấp rồi vi cấp.',
    'Phân biệt tế bào nhân sơ (vi khuẩn lactic trong sữa chua) và tế bào nhân thực (biểu bì vảy hành, niêm mạc miệng).',
    'Tính được kích thước thật của tế bào từ kích thước ảnh và độ phóng đại.'
  ],
  theory:
    'Tế bào nhân sơ có kích thước nhỏ (1–5 µm), chưa có màng nhân, vùng nhân chứa DNA. Tế bào nhân thực lớn hơn (10–100 µm hoặc hơn), có nhân hoàn chỉnh. Độ phóng đại tổng K = K(vật kính) × K(thị kính); kích thước thật = kích thước ảnh / K. Dùng vật kính 100× phải nhỏ dầu soi.',
  equation: 'Kích thước thật = Kích thước ảnh / (K_vk × K_tk)',
  sceneTemplate: 'microscope',
  sceneOptions: { slideLabel: 'Tiêu bản', allowSpecimenSwitch: true },
  solverId: 'cell-microscope',
  params: [
    { key: 'specimen', label: 'Mẫu (0: sữa chua · 1: vảy hành · 2: niêm mạc miệng)', unit: '', min: 0, max: 2, step: 1, default: 1 },
    { key: 'objective', label: 'Vật kính (0: 4× · 1: 10× · 2: 40× · 3: 100×)', unit: '', min: 0, max: 3, step: 1, default: 0 },
    { key: 'eyepiece', label: 'Thị kính', unit: '×', min: 10, max: 15, step: 5, default: 10 },
    { key: 'focus', label: 'Ốc vi cấp (lấy nét)', unit: '', min: 0, max: 100, step: 1, default: 30 },
    { key: 'oil', label: 'Dầu soi (0: không · 1: có)', unit: '', min: 0, max: 1, step: 1, default: 0 }
  ],
  hidden: [
    { key: 'L', label: 'Chiều dài tế bào biểu bì hành', unit: 'µm', min: 180, max: 280, decimals: 0 },
    { key: 'focusBest', label: 'Vị trí lấy nét tốt nhất', unit: '', min: 45, max: 70, decimals: 0 },
    { key: 'bacteria', label: 'Chiều dài vi khuẩn', unit: 'µm', min: 1.5, max: 3, decimals: 1 },
    { key: 'cheek', label: 'Đường kính tế bào niêm mạc', unit: 'µm', min: 50, max: 70, decimals: 0 }
  ],
  measurements: [
    { key: 'image', label: 'Kích thước ảnh đo trên thước', unit: 'mm', decimals: 2 },
    { key: 'mag', label: 'Độ phóng đại K', unit: '×', decimals: 0 }
  ],
  minTrials: 3,
  result: { key: 'L', label: 'Chiều dài thật của tế bào biểu bì vảy hành', unit: 'µm', tolerancePercent: 6, decimals: 0, hint: 'Chỉ dùng các lần đo mẫu vảy hành: L = ảnh(mm)·1000/K, lấy trung bình; nên lấy nét rõ trước khi đo.' },
  steps: [
    { id: 's1', title: 'Bật đèn & đặt tiêu bản', instruction: 'Kéo tiêu bản lên bàn kính (điểm gắn) và kẹp lại.', action: 'snap', trigger: 'stage-slot' },
    { id: 's2', title: 'Bật nguồn sáng', instruction: 'Chạm vào đèn để bật nguồn sáng, điều chỉnh tụ quang.', action: 'click', trigger: 'light' },
    { id: 's3', title: 'Quan sát ở vật kính 10×', instruction: 'Chọn vật kính 10×, vặn ốc vi cấp cho ảnh rõ nét.', action: 'adjust' },
    { id: 's4', title: 'Đo kích thước ảnh', instruction: 'Chạm vào ốc vi cấp (hoặc nút Đo) để đo ảnh tế bào bằng thước trắc vi thị kính.', action: 'measure', trigger: 'fine-knob' },
    { id: 's5', title: 'So sánh nhân sơ – nhân thực', instruction: 'Quan sát cả 3 mẫu, đo ≥ 3 lần mẫu vảy hành và tính kích thước thật.', action: 'record' }
  ],
  ppeRequired: ['gloves'],
  chemicals: [{ name: 'Xanh methylene', formula: 'C₁₆H₁₈ClN₃S', concentration: '1%', hazards: ['Nhuộm màu da', 'Tránh dính mắt'] }],
  incidents: [{ id: 'need-oil', title: 'Thiếu dầu soi', message: 'Vật kính 100× cần nhỏ dầu soi lên tiêu bản; nếu không ảnh rất tối và mờ, dễ chạm vỡ lam kính.', severity: 'warning' }],
  preQuiz: [
    { id: 'q1', prompt: 'Đặc điểm KHÔNG có ở tế bào nhân sơ là:', options: ['Màng sinh chất', 'Ribosome', 'Màng nhân', 'Vật chất di truyền DNA'], correctIndex: 2, explanation: 'Tế bào nhân sơ chưa có màng nhân nhưng vẫn có DNA ở vùng nhân.', misconceptionId: 'bio-prokaryote-no-dna' },
    { id: 'q2', prompt: 'Khi tăng độ phóng đại kính hiển vi, kích thước thật của tế bào:', options: ['Tăng lên', 'Không đổi', 'Giảm', 'Thay đổi ngẫu nhiên'], correctIndex: 1, explanation: 'Chỉ ảnh to lên, tế bào thật không đổi.', misconceptionId: 'bio-magnification-size' },
    { id: 'q3', prompt: 'Thành tế bào có ở:', options: ['Chỉ tế bào thực vật', 'Tế bào thực vật, nấm và nhiều vi khuẩn', 'Chỉ tế bào động vật', 'Không loại nào'], correctIndex: 1, explanation: 'Vi khuẩn có thành peptidoglycan, nấm có thành chitin.', misconceptionId: 'bio-cell-wall-only-plant' }
  ],
  postQuiz: [
    { id: 'p1', prompt: 'Ảnh tế bào dài 22 mm ở độ phóng đại 100×. Kích thước thật:', options: ['220 µm', '22 µm', '2,2 mm', '2200 µm'], correctIndex: 0, explanation: '22 mm·1000/100 = 220 µm.', misconceptionId: 'bio-magnification-size' },
    { id: 'p2', prompt: 'Thứ tự lấy nét đúng là:', options: ['Vật kính 100× trước', 'Vật kính nhỏ, ốc sơ cấp, rồi ốc vi cấp', 'Chỉ dùng ốc vi cấp', 'Không cần lấy nét'], correctIndex: 1, explanation: 'Bắt đầu từ vật kính nhỏ để dễ tìm mẫu.' },
    { id: 'p3', prompt: 'Vi khuẩn lactic trong sữa chua là tế bào:', options: ['Nhân thực', 'Nhân sơ', 'Thực vật', 'Động vật'], correctIndex: 1, explanation: 'Vi khuẩn thuộc nhóm nhân sơ.', misconceptionId: 'bio-prokaryote-no-dna' }
  ],
  meniscusSkill: false,
  conclusionPrompt: 'So sánh kích thước, cấu tạo tế bào nhân sơ và nhân thực; ghi kích thước tế bào vảy hành.',
  conclusionKeywords: ['nhân sơ', 'nhân thực', 'màng nhân', 'kích thước'],
  tags: ['kính hiển vi', 'tế bào nhân sơ', 'tế bào nhân thực'],
  source: 'builtin'
};
