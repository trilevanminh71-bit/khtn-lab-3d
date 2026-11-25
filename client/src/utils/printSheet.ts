/**
 * utils/printSheet.ts — In một phần trang thành phiếu A4 và xuất phiếu ra file HTML độc lập.
 * Dùng iframe ẩn chứa bản sao phần tử + toàn bộ CSS hiện hành: tránh bị cắt bởi khung cuộn của hộp thoại.
 */
import { downloadText } from './bugSnapshot';

/** Gom CSS đang áp dụng trên trang (bỏ qua stylesheet khác nguồn không đọc được) */
function collectCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      out.push(Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'));
    } catch {
      /* stylesheet khác nguồn */
    }
  }
  return out.join('\n').replace(/<\/style/gi, '<\\/style');
}

export function sheetHtml(el: HTMLElement, title: string): string {
  const safe = title.replace(/[<>&"]/g, '');
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.no-print, script').forEach((n) => n.remove());
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe}</title><style>${collectCss()}
@page{size:A4;margin:12mm}html,body,#root{height:auto!important}body{background:#fff!important;color:#000!important;overflow:visible!important}
@media print{body *{visibility:visible!important}#print-report{position:static!important;width:auto!important}}
table,figure,section{break-inside:avoid}</style></head><body>${copy.outerHTML}</body></html>`;
}

/** In phần tử; trả về false nếu trình duyệt không hỗ trợ */
export function printElement(el: HTMLElement | null, title: string): boolean {
  if (!el) return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = sheetHtml(el, title);
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win || typeof win.print !== 'function') {
      frame.remove();
      return;
    }
    win.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500));
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 120000);
  };
  document.body.appendChild(frame);
  return true;
}

/** Xuất phiếu thành file .html mở được trên mọi máy, không cần mạng */
export function exportElement(el: HTMLElement | null, title: string, filename: string): boolean {
  if (!el) return false;
  downloadText(filename, sheetHtml(el, title), 'text/html');
  return true;
}
