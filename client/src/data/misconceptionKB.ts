/**
 * data/misconceptionKB.ts — Kho NGỘ NHẬN KHOA HỌC phổ biến của học sinh lớp 10, phân loại theo chương SGK KNTT.
 * Mỗi ngộ nhận có: mô tả, cách khắc phục (gợi ý dạy học). Thứ tự mảng = bit trong mặt nạ QR (tối đa 30 mục).
 * Câu hỏi Pre/Post Quiz gắn `misconceptionId` → khi học sinh chọn sai, hệ thống ghi nhận ngộ nhận.
 */
import type { MisconceptionDef } from '../types/lab';

export const MISCONCEPTIONS: MisconceptionDef[] = [
  { id: 'phy-heavy-falls-faster', subject: 'physics', chapter: 'Chương II. Động học', title: 'Vật nặng rơi nhanh hơn vật nhẹ', description: 'Cho rằng gia tốc rơi phụ thuộc khối lượng vật.', remedy: 'Thí nghiệm ống Newton (chân không) và so sánh thời gian rơi của các trụ thép khối lượng khác nhau.' },
  { id: 'phy-force-needed-motion', subject: 'physics', chapter: 'Chương III. Động lực học', title: 'Cần lực để duy trì chuyển động', description: 'Nghĩ rằng vật dừng lại khi không còn lực đẩy (quan niệm Aristotle).', remedy: 'Quan sát xe trên đệm khí: không có lực kéo xe vẫn chuyển động gần như thẳng đều.' },
  { id: 'phy-speed-avg-instant', subject: 'physics', chapter: 'Chương II. Động học', title: 'Nhầm tốc độ trung bình với tốc độ tức thời', description: 'Không phân biệt tốc độ trên cả quãng đường và tại một thời điểm.', remedy: 'So sánh v = d/Δt khi d rất nhỏ (cổng quang điện) với tốc độ trung bình cả máng.' },
  { id: 'phy-emf-equals-voltage', subject: 'physics', chapter: 'Mở rộng: Dòng điện không đổi', title: 'Suất điện động luôn bằng hiệu điện thế hai cực', description: 'Bỏ qua sụt áp trên điện trở trong khi có dòng điện.', remedy: 'Đo U ở nhiều giá trị I, vẽ đồ thị U = E − I·r.' },
  { id: 'phy-current-used-up', subject: 'physics', chapter: 'Mở rộng: Dòng điện không đổi', title: 'Dòng điện bị tiêu hao qua dụng cụ', description: 'Nghĩ cường độ dòng điện giảm dần sau mỗi điện trở.', remedy: 'Mắc hai ampe kế trước và sau điện trở trong mạch nối tiếp, so sánh số chỉ.' },
  { id: 'phy-mass-weight', subject: 'physics', chapter: 'Chương III. Động lực học', title: 'Nhầm khối lượng với trọng lượng', description: 'Dùng đơn vị kg cho lực, N cho khối lượng.', remedy: 'Nhấn mạnh P = m·g; khối lượng đặc trưng cho quán tính.' },
  { id: 'phy-error-one-trial', subject: 'physics', chapter: 'Chương I. Mở đầu', title: 'Đo một lần là đủ chính xác', description: 'Không hiểu vai trò của phép đo lặp lại và sai số ngẫu nhiên.', remedy: 'Cho học sinh so sánh độ phân tán số liệu khi đo 1 lần và 5 lần, tính sai số tuyệt đối trung bình.' },
  { id: 'chem-temp-no-effect-rate', subject: 'chemistry', chapter: 'Chương 6. Tốc độ phản ứng', title: 'Nhiệt độ không ảnh hưởng tốc độ phản ứng', description: 'Cho rằng nhiệt độ chỉ làm "nóng" mà không đổi tốc độ.', remedy: "Thí nghiệm thiosulfate ở 25 °C và 45 °C; giới thiệu quy tắc Van't Hoff." },
  { id: 'chem-catalyst-consumed', subject: 'chemistry', chapter: 'Chương 6. Tốc độ phản ứng', title: 'Chất xúc tác bị tiêu hao', description: 'Nghĩ chất xúc tác là chất phản ứng.', remedy: 'Cân MnO₂ trước và sau phản ứng, tái sử dụng MnO₂ nhiều lần.' },
  { id: 'chem-catalyst-more-product', subject: 'chemistry', chapter: 'Chương 6. Tốc độ phản ứng', title: 'Xúc tác làm tăng lượng sản phẩm', description: 'Nhầm tăng tốc độ với tăng hiệu suất cuối.', remedy: 'So sánh thể tích O₂ cuối cùng khi để rất lâu với và không có xúc tác.' },
  { id: 'chem-concentration-amount', subject: 'chemistry', chapter: 'Chương 6. Tốc độ phản ứng', title: 'Nhầm nồng độ với lượng chất', description: 'Cho rằng nhiều dung dịch hơn thì nồng độ lớn hơn.', remedy: 'Phân biệt C = n/V; pha loãng cùng lượng chất vào thể tích khác nhau.' },
  { id: 'chem-exo-cold', subject: 'chemistry', chapter: 'Chương 5. Năng lượng hóa học', title: 'Nhầm dấu ΔH của phản ứng tỏa nhiệt', description: 'Cho rằng tỏa nhiệt thì ΔH > 0.', remedy: 'Xét theo hệ: hệ mất nhiệt ⇒ ΔH < 0; môi trường nóng lên.' },
  { id: 'chem-redox-oxygen-only', subject: 'chemistry', chapter: 'Chương 4. Phản ứng oxi hóa – khử', title: 'Oxi hóa – khử phải có oxygen', description: 'Hiểu "oxi hóa" theo nghĩa kết hợp oxygen.', remedy: 'Dùng định nghĩa theo sự thay đổi số oxi hóa / chuyển electron (Fe²⁺ → Fe³⁺).' },
  { id: 'chem-endpoint-color', subject: 'chemistry', chapter: 'Chương 4. Phản ứng oxi hóa – khử', title: 'Điểm cuối là khi màu tím đậm', description: 'Nhỏ dư KMnO₄ đến khi tím đậm mới dừng.', remedy: 'Nhỏ từng giọt gần điểm cuối, dừng khi hồng nhạt bền 30 giây.' },
  { id: 'bio-prokaryote-no-dna', subject: 'biology', chapter: 'Chương 2: Cấu trúc tế bào', title: 'Tế bào nhân sơ không có DNA', description: 'Nhầm "không có màng nhân" với "không có vật chất di truyền".', remedy: 'Mô hình vùng nhân chứa DNA vòng của vi khuẩn.' },
  { id: 'bio-cell-wall-only-plant', subject: 'biology', chapter: 'Chương 2: Cấu trúc tế bào', title: 'Chỉ tế bào thực vật có thành tế bào', description: 'Bỏ qua thành tế bào của vi khuẩn và nấm.', remedy: 'So sánh thành peptidoglycan (vi khuẩn), chitin (nấm), cellulose (thực vật).' },
  { id: 'bio-magnification-size', subject: 'biology', chapter: 'Chương 2: Cấu trúc tế bào', title: 'Phóng đại làm tế bào to thật', description: 'Không phân biệt kích thước ảnh và kích thước thật.', remedy: 'Bài tập tính kích thước thật = ảnh / K ở nhiều độ phóng đại.' },
  { id: 'bio-solute-moves', subject: 'biology', chapter: 'Chương 3: Trao đổi chất qua màng', title: 'Chất tan di chuyển trong thẩm thấu', description: 'Nghĩ đường/muối đi vào tế bào làm tế bào co lại.', remedy: 'Nhấn mạnh thẩm thấu là sự di chuyển của NƯỚC qua màng bán thấm.' },
  { id: 'bio-enzyme-higher-temp-better', subject: 'biology', chapter: 'Chương 4: Chuyển hóa năng lượng và enzyme', title: 'Nhiệt độ càng cao enzyme càng mạnh', description: 'Không biết enzyme bị biến tính ở nhiệt độ cao.', remedy: 'Đồ thị hoạt tính dạng chuông với nhiệt độ tối ưu.' },
  { id: 'bio-enzyme-alive', subject: 'biology', chapter: 'Chương 4: Chuyển hóa năng lượng và enzyme', title: 'Enzyme là sinh vật sống', description: 'Cho rằng enzyme "chết" khi lạnh.', remedy: 'Enzyme là protein; nhiệt độ thấp chỉ ức chế tạm thời, hoạt tính phục hồi khi ấm lên.' },
  { id: 'bio-mitosis-interphase-rest', subject: 'biology', chapter: 'Chương 5: Chu kì tế bào và phân bào', title: 'Kì trung gian là giai đoạn nghỉ', description: 'Không biết DNA nhân đôi ở pha S của kì trung gian.', remedy: 'Sơ đồ chu kì tế bào G1 – S – G2 – M với hoạt động từng pha.' },
  // Bổ sung — chỉ thêm vào CUỐI (tối đa 31 mục vì mã hóa theo bit trong QR)
  { id: 'phy-resultant-sum', subject: 'physics', chapter: 'Chương III. Động lực học', title: 'Hợp lực luôn bằng tổng số học', description: 'Cộng độ lớn hai lực mà bỏ qua góc giữa chúng.', remedy: 'Thay đổi góc α và so sánh số chỉ lực kế với quy tắc hình bình hành.' },
  { id: 'phy-momentum-lost', subject: 'physics', chapter: 'Chương V. Động lượng', title: 'Động lượng mất đi sau va chạm', description: 'Nhầm sự giảm động năng trong va chạm mềm với sự mất động lượng.', remedy: 'Tính p trước và p sau cho cả hai loại va chạm trên băng đệm khí.' },
  { id: 'chem-polar-molecule', subject: 'chemistry', chapter: 'Chương 3. Liên kết hóa học', title: 'Có liên kết phân cực thì phân tử phân cực', description: 'Bỏ qua hình học phân tử.', remedy: 'So sánh CO₂ (thẳng) và H₂O (gấp khúc) bằng mô hình 3D.' },
  { id: 'chem-ox-number-charge', subject: 'chemistry', chapter: 'Chương 4. Phản ứng oxi hóa – khử', title: 'Xác định sai số oxi hóa', description: 'Áp dụng máy móc O = −2, quên tổng số oxi hóa và trường hợp peroxide.', remedy: 'Dùng máy xác định số oxi hóa và viết phương trình tổng số oxi hóa.' },
  { id: 'chem-hf-strong', subject: 'chemistry', chapter: 'Chương 7. Nguyên tố nhóm halogen', title: 'HF là acid mạnh nhất', description: 'Nhầm tính ăn mòn thủy tinh và nhiệt độ sôi cao với độ mạnh acid.', remedy: 'So sánh dãy HX: tính acid tăng từ HF đến HI; HF sôi cao do liên kết hydrogen.' },
  { id: 'bio-active-free', subject: 'biology', chapter: 'Chương 3: Trao đổi chất qua màng', title: 'Mọi vận chuyển qua màng đều không tốn năng lượng', description: 'Không phân biệt thụ động và chủ động.', remedy: 'Quan sát mô hình bơm dùng ATP và túi nhập/xuất bào.' },
  { id: 'bio-signal-all-cells', subject: 'biology', chapter: 'Chương 3: Trao đổi chất qua màng', title: 'Mọi tế bào đều đáp ứng với tín hiệu', description: 'Bỏ qua vai trò của thụ thể đặc hiệu.', remedy: 'So sánh tế bào có và không có thụ thể ở cùng nồng độ tín hiệu.' },
  { id: 'bio-cold-denature', subject: 'biology', chapter: 'Chương 4: Chuyển hóa năng lượng và enzyme', title: 'Lạnh làm enzyme biến tính', description: 'Đồng nhất tác động của nhiệt độ thấp và nhiệt độ cao.', remedy: 'Làm ấm ống nghiệm ngâm nước đá và quan sát enzyme hoạt động lại.' },
  { id: 'bio-endospore-reproduction', subject: 'biology', chapter: 'Chương 6: Sinh học vi sinh vật', title: 'Nội bào tử là hình thức sinh sản', description: 'Nhầm nội bào tử với bào tử sinh sản.', remedy: 'Nhấn mạnh một tế bào chỉ tạo một nội bào tử nên số lượng không tăng.' }
];

export const MISCONCEPTION_INDEX = new Map(MISCONCEPTIONS.map((m, i) => [m.id, i]));

/** Danh sách id ngộ nhận → mặt nạ bit (dùng trong QR) */
export function misconceptionsToMask(ids: string[]): number {
  let mask = 0;
  for (const id of ids) {
    const i = MISCONCEPTION_INDEX.get(id);
    if (i !== undefined && i < 31) mask |= 1 << i;
  }
  return mask >>> 0;
}

/** Mặt nạ bit → danh sách id ngộ nhận */
export function maskToMisconceptions(mask: number): string[] {
  return MISCONCEPTIONS.filter((_, i) => i < 31 && (mask >>> i) & 1).map((m) => m.id);
}

export function getMisconception(id: string): MisconceptionDef | undefined {
  return MISCONCEPTIONS.find((m) => m.id === id);
}
