/**
 * data/offlineTutorKB.ts — Kho GỢI MỞ SOCRATIC cục bộ: dùng khi mất mạng, khi AI quá 8 giây, hoặc hết hạn mức.
 * Nguyên tắc sư phạm: KHÔNG đưa đáp án số; đặt câu hỏi dẫn dắt để học sinh tự suy luận.
 * Hàm offlineTutorReply(pluginId, câu hỏi) chọn mục có nhiều từ khóa trùng nhất.
 * Hàm guardrailCheck(câu hỏi) chặn yêu cầu xin đáp án trực tiếp / ngoài chủ đề / ngôn từ không phù hợp.
 */
import type { TutorKbEntry } from '../types/lab';
import { normalizeVi } from '../engines/gradingEngine';

export const OFFLINE_TUTOR_KB: TutorKbEntry[] = [
  { id: 'gate-1', pluginIds: ['vl10-toc-do-cong-quang-dien'], keywords: ['cong quang dien', 'thoi gian', 'dt', 'toc do'], questions: ['Cổng quang điện "nhìn thấy" điều gì khi viên bi đi qua?', 'Trong khoảng thời gian Δt, viên bi đi được quãng đường bằng bao nhiêu?', 'Nếu Δt rất nhỏ, tốc độ trung bình trên đoạn đó gần với đại lượng nào?'], hint: 'Liên hệ quãng đường bằng đường kính bi d với thời gian chắn sáng Δt. Nhớ đổi cm sang m.' },
  { id: 'gate-2', pluginIds: ['vl10-toc-do-cong-quang-dien', 'vl10-gia-toc-roi-tu-do'], keywords: ['sai so', 'trung binh', 'lan do'], questions: ['Các lần đo của em có giống hệt nhau không? Vì sao?', 'Làm thế nào để có một giá trị đại diện cho nhiều lần đo?', 'Độ lệch của từng lần đo so với trung bình cho em biết điều gì?'], hint: 'Sai số tuyệt đối trung bình = trung bình của |x̄ − xᵢ|.' },
  { id: 'fall-1', pluginIds: ['vl10-gia-toc-roi-tu-do'], keywords: ['roi tu do', 'gia toc', 'g', 'khoi luong'], questions: ['Vật rơi tự do không vận tốc đầu thì quãng đường liên hệ với thời gian theo công thức nào?', 'Từ s = ½·g·t², em biến đổi để tìm g thế nào?', 'Nếu thay trụ thép nặng hơn, em dự đoán t thay đổi ra sao? Hãy thử!'], hint: 'g = 2s/t², s tính bằng mét.' },
  { id: 'newton-1', pluginIds: ['vl10-dinh-luat-2-newton'], keywords: ['newton', 'luc', 'khoi luong', 'gia toc', 'xe'], questions: ['Xe xuất phát từ nghỉ, chuyển động nhanh dần đều: quãng đường s và thời gian t liên hệ ra sao?', 'Khi đã có a và F, định luật II Newton cho em tính được gì?', 'Gia trọng m em thêm vào có phải là khối lượng xe không? Cần trừ đi thế nào?'], hint: 'a = 2s/t², rồi M = F/a − m (m đổi g → kg).' },
  { id: 'emf-1', pluginIds: ['vl10-suat-dien-dong-pin'], keywords: ['suat dien dong', 'dien tro trong', 'do thi', 'u', 'i', 'pin'], questions: ['Khi dòng điện tăng, số chỉ vôn kế tăng hay giảm? Vì sao?', 'Nếu vẽ U theo I, đồ thị có dạng gì?', 'Điểm đồ thị cắt trục U ứng với I bằng bao nhiêu và U khi đó bằng đại lượng nào?'], hint: 'U = E − I·r: hệ số góc là −r, tung độ gốc là E.' },
  { id: 'thio-1', pluginIds: ['hh10-toc-do-thiosulfate'], keywords: ['thiosulfate', 'nhiet do', 'van', 'hoff', 'gamma', 'dau x'], questions: ['Thời gian mất dấu X ngắn hơn nghĩa là tốc độ phản ứng lớn hơn hay nhỏ hơn?', 'Khi tăng 10 °C, tốc độ tăng bao nhiêu lần — em tìm được từ hai thời gian đo không?', 'Muốn so sánh ảnh hưởng của nhiệt độ, em cần giữ yếu tố nào không đổi?'], hint: 'γ = (t₁/t₂)^(10/(T₂ − T₁)) khi giữ nguyên nồng độ.' },
  { id: 'h2o2-1', pluginIds: ['hh10-xuc-tac-hydrogen-peroxide'], keywords: ['xuc tac', 'mno2', 'khoai tay', 'oxygen', 'o2', 'nong do'], questions: ['So sánh lượng khí thu được sau 60 giây khi có và không có MnO₂ — em thấy gì?', 'Nếu chờ thật lâu, lượng O₂ cuối cùng có phụ thuộc xúc tác không?', 'Từ thể tích O₂ (đkc), làm sao tính số mol O₂ rồi số mol H₂O₂?'], hint: 'n(O₂) = V/24,79; n(H₂O₂) = 2·n(O₂); C = n/V(dung dịch).' },
  { id: 'kmno4-1', pluginIds: ['hh10-chuan-do-permanganate'], keywords: ['chuan do', 'permanganate', 'kmno4', 'diem cuoi', 'mat khum', 'fe'], questions: ['Chất nào nhường electron, chất nào nhận electron trong phản ứng?', 'Tỉ lệ mol giữa Fe²⁺ và MnO₄⁻ trong phương trình là bao nhiêu?', 'Vì sao dừng chuẩn độ khi xuất hiện màu hồng nhạt bền?'], hint: 'n(Fe²⁺) = 5·n(MnO₄⁻). Đọc burette ngang đáy mặt khum.' },
  { id: 'enth-1', pluginIds: ['hh10-enthalpy-zn-cuso4'], keywords: ['enthalpy', 'nhiet', 'cuso4', 'zn', 'delta'], questions: ['Dung dịch nóng lên chứng tỏ phản ứng tỏa hay thu nhiệt? Dấu của ΔrH?', 'Nhiệt lượng dung dịch nhận được tính theo công thức nào?', 'Số mol chất phản ứng hết là CuSO₄ hay Zn? Vì sao?'], hint: 'Q = m·c·ΔT; ΔrH = −Q/n(CuSO₄), đổi J → kJ.' },
  { id: 'cell-1', pluginIds: ['sh10-quan-sat-te-bao'], keywords: ['kinh hien vi', 'nhan so', 'nhan thuc', 'phong dai', 'kich thuoc'], questions: ['Ở mẫu sữa chua em có thấy nhân rõ ràng như ở vảy hành không?', 'Độ phóng đại tổng của kính được tính thế nào?', 'Ảnh to lên thì tế bào thật có to lên không?'], hint: 'Kích thước thật = ảnh / (K vật kính × K thị kính).' },
  { id: 'plas-1', pluginIds: ['sh10-co-nguyen-sinh'], keywords: ['co nguyen sinh', 'uu truong', 'nhuoc truong', 'dang truong', 'tham thau'], questions: ['Trong dung dịch đường đặc, nước đi vào hay đi ra khỏi tế bào?', 'Phần nào của tế bào co lại: thành tế bào hay khối nguyên sinh chất?', 'Ở nồng độ nào khoảng một nửa số tế bào bắt đầu co nguyên sinh?'], hint: 'Nồng độ đẳng trương ≈ nồng độ làm 50% tế bào co nguyên sinh chớm.' },
  { id: 'enz-1', pluginIds: ['sh10-enzyme-amylase'], keywords: ['enzyme', 'amylase', 'iodine', 'nhiet do toi uu', 'bien tinh'], questions: ['Màu xanh tím biến mất nghĩa là chất nào đã hết?', 'Ở nhiệt độ nào thời gian mất màu ngắn nhất?', 'Vì sao ở 80 °C enzyme gần như không hoạt động nữa?'], hint: 'Vẽ 1/t theo nhiệt độ; đỉnh đồ thị là nhiệt độ tối ưu.' },
  { id: 'mito-1', pluginIds: ['sh10-chi-so-nguyen-phan'], keywords: ['nguyen phan', 'chi so', 'ki giua', 'ki trung gian', 're hanh'], questions: ['Em nhận ra tế bào ở kì giữa nhờ đặc điểm gì của nhiễm sắc thể?', 'Vì sao cần đếm trên nhiều vi trường khác nhau?', 'Tỉ lệ tế bào ở một kì cho em biết điều gì về thời gian của kì đó?'], hint: 'MI = Σ tế bào đang phân chia / Σ tổng × 100%.' }
];

const GENERIC: Record<string, string[]> = {
  physics: ['Đại lượng nào em đo trực tiếp, đại lượng nào phải tính?', 'Công thức nào nối các đại lượng đó? Đơn vị đã thống nhất chưa?'],
  chemistry: ['Phương trình hóa học đã cân bằng chưa? Tỉ lệ mol là bao nhiêu?', 'Em đã đổi thể tích mL sang L khi tính số mol chưa?'],
  biology: ['Em quan sát được hiện tượng gì? Nó khác với mẫu đối chứng ra sao?', 'Cấu trúc nào của tế bào giải thích hiện tượng đó?']
};

export interface GuardrailResult {
  allowed: boolean;
  reply?: string;
}

/** Chặn: xin đáp án trực tiếp, nội dung không phù hợp, câu hỏi ngoài môn KHTN */
export function guardrailCheck(question: string): GuardrailResult {
  const q = normalizeVi(question);
  const bad = ['chui', 'ngu ', 'giet', 'hack', 'mat khau', 'pin giao vien', 'ma pin'];
  if (bad.some((w) => q.includes(w))) {
    return { allowed: false, reply: 'Trợ lý chỉ hỗ trợ học tập Khoa học tự nhiên. Em hãy đặt câu hỏi về thí nghiệm đang làm nhé.' };
  }
  const direct = ['cho em dap an', 'dap an la', 'ket qua la bao nhieu', 'giai ho', 'lam ho', 'cho dap an', 'dap so'];
  if (direct.some((w) => q.includes(w))) {
    return { allowed: false, reply: 'Thầy/cô AI không đưa đáp án trực tiếp 😊 — nhưng mình cùng suy luận nhé: em đã có những số liệu nào, và công thức nào nối chúng với đại lượng cần tìm?' };
  }
  if (q.trim().length < 3) return { allowed: false, reply: 'Em hãy viết rõ hơn câu hỏi về thí nghiệm nhé.' };
  return { allowed: true };
}

/** Trả lời gợi mở offline cho câu hỏi của học sinh trong bài pluginId */
export function offlineTutorReply(pluginId: string, subject: string, question: string): string {
  const q = normalizeVi(question);
  const scored = OFFLINE_TUTOR_KB.map((e) => {
    let s = e.pluginIds.includes(pluginId) ? 2 : 0;
    for (const k of e.keywords) if (q.includes(k)) s += 3;
    return { e, s };
  }).sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (best && best.s >= 2) {
    const idx = Math.abs(q.length) % best.e.questions.length;
    return `🤔 ${best.e.questions[idx]}\n\n💡 Gợi ý: ${best.e.hint}\n\n(Trợ lý offline — gợi mở theo phương pháp Socratic)`;
  }
  const g = GENERIC[subject] ?? GENERIC.physics;
  return `🤔 ${g[q.length % g.length]}\n\n(Trợ lý offline — gợi mở theo phương pháp Socratic)`;
}
