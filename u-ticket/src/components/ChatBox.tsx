"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "./UserProvider";

type Msg = { role: "user" | "assistant"; content: string };

const SAMPLES = ["งบ 5,000 อยากเห็นเวทีชัด", "มีคนขายบัตรใน Facebook ถูกกว่า ซื้อดีไหม", "งบ 2,000 ไปกับเพื่อน"];

export default function ChatBox() {
  const { userId, user } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages([]), [userId]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, userId }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: "AI กำลังยุ่ง ลองถามใหม่อีกครั้งนะครับ" }]);
    }
    setBusy(false);
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="py-6 text-center text-muted">
            <p className="text-4xl">🎫</p>
            <p className="mt-2">
              สวัสดี{user ? ` ${user.displayName}` : ""}! บอกงบและสิ่งที่อยากได้ แล้ว Concierge จะช่วยเลือกโซนให้
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "rounded-br-sm bg-brand text-black" : "rounded-bl-sm bg-surface-2"
              }`}
            >
              {m.content || <span className="animate-pulse text-muted">กำลังพิมพ์…</span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์คำถาม เช่น งบ 4,000 อยากใกล้เวที"
            className="min-w-0 flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}
