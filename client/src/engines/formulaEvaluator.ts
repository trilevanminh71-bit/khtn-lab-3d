/**
 * engines/formulaEvaluator.ts — Bộ tính biểu thức toán AN TOÀN cho bài No-Code (không dùng eval/Function).
 *
 * Hỗ trợ: số thực, biến (tên tham số), + - * / ^ (lũy thừa), dấu trừ một ngôi, ngoặc đơn,
 * hàm: sqrt, abs, sin, cos, tan, ln, log10, exp, min, max, pow, round; hằng số PI, E, G (9,8 m/s²).
 * Thuật toán: tách token → Shunting-yard (Dijkstra) chuyển sang hậu tố (RPN) → tính bằng ngăn xếp.
 * Đầu vào: chuỗi biểu thức + bảng biến. Đầu ra: số. Lỗi cú pháp → ném FormulaError tiếng Việt.
 */
export class FormulaError extends Error {}

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | 'neg' }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' };

const FUNCS: Record<string, { arity: number; fn: (...a: number[]) => number }> = {
  sqrt: { arity: 1, fn: Math.sqrt },
  abs: { arity: 1, fn: Math.abs },
  sin: { arity: 1, fn: Math.sin },
  cos: { arity: 1, fn: Math.cos },
  tan: { arity: 1, fn: Math.tan },
  ln: { arity: 1, fn: Math.log },
  log10: { arity: 1, fn: Math.log10 },
  exp: { arity: 1, fn: Math.exp },
  round: { arity: 1, fn: Math.round },
  min: { arity: 2, fn: Math.min },
  max: { arity: 2, fn: Math.max },
  pow: { arity: 2, fn: Math.pow }
};

const CONSTS: Record<string, number> = { PI: Math.PI, E: Math.E, G: 9.8 };

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
const RIGHT_ASSOC = new Set(['^', 'neg']);

export function tokenize(expr: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = expr.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
      if (!m) throw new FormulaError(`Số không hợp lệ tại vị trí ${i + 1}`);
      out.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = expr.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/) as RegExpMatchArray;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (c === '(') out.push({ t: 'lp' });
    else if (c === ')') out.push({ t: 'rp' });
    else if (c === ',') out.push({ t: 'comma' });
    else if ('+-*/^'.includes(c)) {
      const prev = out[out.length - 1];
      const unary = c === '-' && (!prev || prev.t === 'op' || prev.t === 'lp' || prev.t === 'comma');
      const unaryPlus = c === '+' && (!prev || prev.t === 'op' || prev.t === 'lp' || prev.t === 'comma');
      if (unary) out.push({ t: 'op', v: 'neg' });
      else if (!unaryPlus) out.push({ t: 'op', v: c as '+' | '-' | '*' | '/' | '^' });
    } else throw new FormulaError(`Ký tự không cho phép "${c}" tại vị trí ${i + 1}`);
    i++;
  }
  return out;
}

type RpnItem = { k: 'num'; v: number } | { k: 'var'; v: string } | { k: 'op'; v: string } | { k: 'fn'; v: string };

/** Chuyển token sang dạng hậu tố (Shunting-yard) */
export function toRpn(tokens: Token[]): RpnItem[] {
  const out: RpnItem[] = [];
  const stack: Array<{ k: 'op' | 'fn' | 'lp'; v: string }> = [];
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'num') out.push({ k: 'num', v: tk.v });
    else if (tk.t === 'id') {
      const next = tokens[i + 1];
      if (next && next.t === 'lp') {
        if (!FUNCS[tk.v]) throw new FormulaError(`Hàm "${tk.v}" không được hỗ trợ`);
        stack.push({ k: 'fn', v: tk.v });
      } else out.push({ k: 'var', v: tk.v });
    } else if (tk.t === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.k !== 'op') break;
        const p1 = PREC[tk.v];
        const p2 = PREC[top.v];
        if (p2 > p1 || (p2 === p1 && !RIGHT_ASSOC.has(tk.v))) out.push(stack.pop() as RpnItem);
        else break;
      }
      stack.push({ k: 'op', v: tk.v });
    } else if (tk.t === 'lp') stack.push({ k: 'lp', v: '(' });
    else if (tk.t === 'comma') {
      while (stack.length && stack[stack.length - 1].k !== 'lp') out.push(stack.pop() as RpnItem);
      if (!stack.length) throw new FormulaError('Dấu phẩy đặt sai chỗ');
    } else {
      while (stack.length && stack[stack.length - 1].k !== 'lp') out.push(stack.pop() as RpnItem);
      if (!stack.length) throw new FormulaError('Thiếu dấu ngoặc mở "("');
      stack.pop();
      if (stack.length && stack[stack.length - 1].k === 'fn') out.push(stack.pop() as RpnItem);
    }
  }
  while (stack.length) {
    const top = stack.pop() as { k: 'op' | 'fn' | 'lp'; v: string };
    if (top.k === 'lp') throw new FormulaError('Thiếu dấu ngoặc đóng ")"');
    out.push(top as RpnItem);
  }
  return out;
}

/** Tính giá trị biểu thức với bảng biến */
export function evaluateFormula(expr: string, vars: Record<string, number>): number {
  const rpn = toRpn(tokenize(expr));
  const st: number[] = [];
  for (const it of rpn) {
    if (it.k === 'num') st.push(it.v);
    else if (it.k === 'var') {
      if (it.v in vars) st.push(vars[it.v]);
      else if (it.v in CONSTS) st.push(CONSTS[it.v]);
      else throw new FormulaError(`Biến "${it.v}" chưa được khai báo`);
    } else if (it.k === 'fn') {
      const f = FUNCS[it.v];
      if (st.length < f.arity) throw new FormulaError(`Hàm ${it.v} thiếu đối số`);
      const args = st.splice(st.length - f.arity, f.arity);
      st.push(f.fn(...args));
    } else if (it.v === 'neg') {
      if (!st.length) throw new FormulaError('Biểu thức thiếu toán hạng');
      st.push(-(st.pop() as number));
    } else {
      if (st.length < 2) throw new FormulaError('Biểu thức thiếu toán hạng');
      const b = st.pop() as number;
      const a = st.pop() as number;
      switch (it.v) {
        case '+':
          st.push(a + b);
          break;
        case '-':
          st.push(a - b);
          break;
        case '*':
          st.push(a * b);
          break;
        case '/':
          st.push(a / b);
          break;
        case '^':
          st.push(a ** b);
          break;
      }
    }
  }
  if (st.length !== 1) throw new FormulaError('Biểu thức không hợp lệ');
  return st[0];
}

/** Kiểm tra biểu thức: trả về null nếu hợp lệ, ngược lại là thông báo lỗi tiếng Việt */
export function checkFormula(expr: string, varNames: string[]): string | null {
  try {
    const vars: Record<string, number> = {};
    for (const n of varNames) vars[n] = 1.2345;
    const v = evaluateFormula(expr, vars);
    if (!Number.isFinite(v)) return 'Biểu thức cho kết quả không xác định (chia cho 0?)';
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
