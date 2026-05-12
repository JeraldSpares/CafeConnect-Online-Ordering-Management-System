"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "cafeconnect.chat.v1";
const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm CafeBot ☕ I can help you pick a drink, explain how ordering works, or check the status of your order. What's on your mind?",
};

const SUGGESTIONS = [
  "What do you recommend?",
  "What are your hours?",
  "Track my order",
  "How do I pay?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Probe whether the chat is enabled on the server
  useEffect(() => {
    fetch("/api/chat", { method: "GET" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Auto-scroll to bottom when messages change OR panel opens
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({
        top: scroller.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, sending, open]);

  // Focus the input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m !== WELCOME), // don't echo welcome to server
        }),
      });
      const data: { text?: string; error?: string } = await res.json();
      if (!res.ok || !data.text) {
        setError(data.error ?? "Hmm, I couldn't reach the kitchen.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch {
      setError("Network hiccup. Try again?");
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([WELCOME]);
    setError(null);
  }

  // Don't render anything until we know whether the chat is enabled
  if (enabled === null || enabled === false) return null;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat support"
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)] shadow-[0_18px_40px_-12px_rgba(20,39,31,0.55)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-12px_rgba(20,39,31,0.65)] animate-pulse-ring sm:bottom-6 sm:right-6"
        >
          <i className="fa-solid fa-comments text-xl" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6"
          role="dialog"
          aria-label="Chat support"
        >
          <div className="cc-card animate-scale-in flex h-[80vh] w-full flex-col overflow-hidden rounded-b-none sm:h-[560px] sm:w-[380px] sm:rounded-b-2xl">
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-primary)] px-4 py-3 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary)]">
                <i className="fa-solid fa-mug-saucer" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold leading-tight">
                  CafeBot
                </p>
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
                  Online
                </p>
              </div>
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <i className="fa-solid fa-broom text-sm" />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close chat"
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            {/* Messages */}
            <div
              ref={scroller}
              className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-bg)]/40 px-4 py-4"
            >
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {sending && <TypingBubble />}
              {error && (
                <p className="rounded-md border-l-4 border-l-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
                  <i className="fa-solid fa-triangle-exclamation mr-1" />
                  {error}
                </p>
              )}
            </div>

            {/* Suggestions */}
            {messages.length === 1 && !sending && (
              <div className="flex flex-wrap gap-2 border-t border-[var(--color-line)] bg-white px-3 py-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-50)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t border-[var(--color-line)] bg-white p-3"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about the menu, your order…"
                disabled={sending}
                className="cc-input max-h-32 min-h-[40px] resize-none !py-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white shadow-md transition-all hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send"
              >
                <i
                  className={`fa-solid ${
                    sending ? "fa-spinner fa-spin" : "fa-paper-plane"
                  }`}
                />
              </button>
            </form>
            <p className="bg-white px-3 pb-2 text-center text-[10px] text-[var(--color-muted)]">
              CafeBot can make mistakes. For complex requests, ask staff at the counter.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, content }: Msg) {
  const isUser = role === "user";
  return (
    <div
      className={`flex animate-fade-up gap-2 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isUser && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
          <i className="fa-solid fa-mug-saucer text-xs" />
        </span>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-sm bg-[var(--color-primary)] text-white"
            : "rounded-bl-sm bg-white text-[var(--color-text)]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex animate-fade-up gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-accent)]">
        <i className="fa-solid fa-mug-saucer text-xs" />
      </span>
      <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );
}
