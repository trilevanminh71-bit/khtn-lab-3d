/**
 * components/AiTutorDrawer.tsx — Trợ lý AI Socratic.
 * Luồng trả lời: Guardrail → hạn mức/ngày → Cache IndexedDB → Máy chủ (/api/tutor/analyze, Gemini 2.5 Flash)
 *   → (nếu có API key riêng) gọi trực tiếp Gemini → KHO GỢI MỞ OFFLINE. Tổng thời gian chờ tối đa 8 giây.
 * Giọng nói: nhận dạng tiếng Việt (Web Speech API) — micro TỰ ẨN khi offline/không hỗ trợ; đọc câu trả lời bằng TTS.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { APP_CONFIG, SUBJECT_LABELS } from '../config/appConfig';
import { guardrailCheck, offlineTutorReply } from '../data/offlineTutorKB';
import { bumpAiQuota, getAiCache, getAiQuotaUsed, setAiCache } from '../offline/db';
import { createGuard } from '../utils/debounceGuard';
import { hashString } from '../utils/randomizer';
import { normalizeVi } from '../engines/gradingEngine';
import { currentApiUrl } from '../services/appServices';
import { logAction } from '../utils/bugSnapshot';
import type { TutorMessage } from '../types/lab';

const askGuard = createGuard(1500);

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRCtor = new () => SpeechRecognitionLike;

function getSR(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SYSTEM_PROMPT =
  'Bạn là trợ lý dạy học Khoa học tự nhiên lớp 10 (SGK Kết nối tri thức) theo phương pháp Socratic. ' +
  'KHÔNG đưa đáp án số cuối cùng; đặt 1–2 câu hỏi gợi mở, nêu công thức hoặc khái niệm liên quan, tối đa 120 từ, tiếng Việt, ' +
  'dùng danh pháp IUPAC (sulfuric acid, copper(II) sulfate, potassium permanganate...). Từ chối nội dung ngoài học tập.';

/** Gọi với thời gian chờ */
async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

export default function AiTutorDrawer() {
  const plugin = useLabStore((s) => s.plugin);
  const online = useLabStore((s) => s.online);
  const trials = useLabStore((s) => s.trials);
  const geminiKey = useLabStore((s) => s.settings.geminiApiKey);
  const [msgs, setMsgs] = useState<TutorMessage[]>([
    { role: 'tutor', text: `Chào em! Mình là trợ lý Socratic cho bài "${plugin.shortTitle}". Em đang vướng ở đâu? Mình sẽ gợi ý bằng câu hỏi để em tự tìm ra lời giải.`, source: 'offline', at: Date.now() }
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [quota, setQuota] = useState(0);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const SR = getSR();
  const canVoice = online && SR !== null;

  useEffect(() => {
    void getAiQuotaUsed().then(setQuota).catch(() => setQuota(0));
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);
  useEffect(() => () => recRef.current?.stop(), []);

  const push = (m: TutorMessage): void => setMsgs((x) => [...x, m]);

  const answer = async (q: string): Promise<TutorMessage> => {
    const g = guardrailCheck(q);
    if (!g.allowed) return { role: 'tutor', text: g.reply ?? '', source: 'guardrail', at: Date.now() };
    const key = `${plugin.id}:${hashString(normalizeVi(q.trim()))}`;
    const cached = await getAiCache(key).catch(() => undefined);
    if (cached) return { role: 'tutor', text: cached, source: 'cache', at: Date.now() };
    const used = await getAiQuotaUsed().catch(() => 0);
    if (!online || used >= APP_CONFIG.aiDailyQuota) {
      const note = used >= APP_CONFIG.aiDailyQuota ? '\n(Đã hết hạn mức AI hôm nay — dùng gợi ý offline.)' : '';
      return { role: 'tutor', text: offlineTutorReply(plugin.id, plugin.subject, q) + note, source: 'offline', at: Date.now() };
    }
    const context = `Bài: ${plugin.title} (${SUBJECT_LABELS[plugin.subject]}). Đại lượng cần tìm: ${plugin.result.label}. Học sinh đã đo ${trials.length} lần.`;
    const started = Date.now();
    const remaining = (): number => Math.max(500, APP_CONFIG.aiTimeoutMs - (Date.now() - started));
    // 1) Máy chủ lớp / cloud
    try {
      const res = await withTimeout(
        (signal) =>
          fetch(`${currentApiUrl()}/api/tutor/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plugin_id: plugin.id, subject: plugin.subject, question: q, context }),
            signal
          }),
        remaining()
      );
      if (res.ok) {
        const data = (await res.json()) as { answer: string; source: string };
        if (data.answer) {
          setQuota(await bumpAiQuota());
          void setAiCache(key, data.answer);
          return { role: 'tutor', text: data.answer, source: data.source === 'offline' ? 'offline' : 'ai', at: Date.now() };
        }
      }
    } catch {
      /* chuyển sang phương án tiếp theo */
    }
    // 2) Gọi trực tiếp Gemini bằng API key riêng (khóa gửi qua header, không đưa vào URL)
    if (geminiKey) {
      try {
        const res = await withTimeout(
          (signal) =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/${APP_CONFIG.geminiModel}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: 'user', parts: [{ text: `${context}\nCâu hỏi của học sinh: ${q}` }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
              }),
              signal
            }),
          remaining()
        );
        if (res.ok) {
          const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const t = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
          if (t) {
            setQuota(await bumpAiQuota());
            void setAiCache(key, t);
            return { role: 'tutor', text: t, source: 'ai', at: Date.now() };
          }
        }
      } catch {
        /* hết thời gian → offline */
      }
    }
    return { role: 'tutor', text: offlineTutorReply(plugin.id, plugin.subject, q), source: 'offline', at: Date.now() };
  };

  const send = (q: string): void => {
    const question = q.trim();
    if (!question) return;
    void askGuard.run(async () => {
      push({ role: 'student', text: question, source: 'student', at: Date.now() });
      setText('');
      setBusy(true);
      logAction('ai-ask', question.slice(0, 80));
      const r = await answer(question);
      push(r);
      setBusy(false);
    });
  };

  const toggleMic = (): void => {
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'vi-VN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      setText(t);
      send(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const speak = (t: string): void => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t.replace(/[🤔💡]/gu, ''));
    u.lang = 'vi-VN';
    const vi = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('vi'));
    if (vi) u.voice = vi;
    window.speechSynthesis.speak(u);
  };

  const BADGE: Record<TutorMessage['source'], string> = { ai: 'AI', offline: 'Offline', cache: 'Bộ nhớ đệm', guardrail: 'Bảo vệ', student: '' };

  return (
    <div className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-700 bg-slate-950 shadow-2xl" role="dialog" aria-label="Trợ lý AI Socratic">
      <header className="flex items-center gap-2 border-b border-slate-800 p-3">
        <span className="text-xl" aria-hidden="true">🤖</span>
        <div className="flex-1">
          <h2 className="text-sm font-bold">Trợ lý AI Socratic</h2>
          <p className="text-xs text-slate-400">
            {online ? 'Trực tuyến' : 'Offline – dùng kho gợi mở cục bộ'} · Hạn mức hôm nay: {quota}/{APP_CONFIG.aiDailyQuota}
          </p>
        </div>
        <button className="btn-ghost p-1.5" onClick={() => useLabStore.getState().setTutorOpen(false)} aria-label="Đóng trợ lý">
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'student' ? 'ml-auto bg-lab-700 text-white' : 'bg-slate-800 text-slate-100'}`}>
            {m.text}
            {m.role === 'tutor' && (
              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="chip bg-slate-700">{BADGE[m.source]}</span>
                <button className="hover:text-white" onClick={() => speak(m.text)} aria-label="Đọc to câu trả lời">
                  <Volume2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-xs text-slate-400">Trợ lý đang suy nghĩ… (tối đa 8 giây)</div>}
        <div ref={endRef} />
      </div>
      <div className="flex flex-wrap gap-1 px-3">
        {['Em nên bắt đầu từ đâu?', 'Công thức nào cần dùng?', 'Vì sao kết quả của em bị lệch?'].map((s) => (
          <button key={s} className="chip bg-slate-800 text-slate-300 hover:bg-slate-700" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hỏi về thí nghiệm…" aria-label="Câu hỏi cho trợ lý" />
        {canVoice && (
          <button type="button" className={`btn px-2 ${listening ? 'border-danger text-danger' : ''}`} onClick={toggleMic} aria-label={listening ? 'Dừng ghi âm' : 'Hỏi bằng giọng nói'}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button type="submit" className="btn-primary px-3" disabled={busy || !text.trim()} aria-label="Gửi">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
