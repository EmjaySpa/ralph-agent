"use client";

import Link from "next/link";
import { useState } from "react";
import { COMPANION } from "@/lib/brand";
import {
  COMPANION_STARTERS,
  COMPANION_SCRIPT,
  COMPANION_SAVE_OPTIONS,
  type ChatTurn,
} from "@/lib/mock-data";

// Canned, in-voice replies for typed messages (mock only, no real AI).
const CANNED_REPLIES = [
  "That makes sense, and you are allowed to feel it. Can you tell me a bit more about what today has asked of you?",
  "Okay. Let’s not rush to fix it. What would feel like the smallest, most manageable next step right now?",
  "Yeah. Your body is not overreacting, it is responding to a real load. What is one thing you could take off your own plate this week?",
];

export default function CompanionPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [replyIdx, setReplyIdx] = useState(0);
  const [showSave, setShowSave] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  function loadExample() {
    setMessages(COMPANION_SCRIPT);
    setShowSave(false);
    setSaved(null);
  }

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const reply = CANNED_REPLIES[replyIdx % CANNED_REPLIES.length];
    setMessages((m) => [...m, { role: "user", text: t }, { role: "companion", text: reply }]);
    setReplyIdx((i) => i + 1);
    setInput("");
  }

  function chooseSave(id: string, label: string) {
    // Demo only. TODO: apply the chosen memory action to the user's Vault.
    setSaved(label);
    if (id === "nothing" || id === "delete") {
      setTimeout(() => {
        setMessages([]);
        setShowSave(false);
        setSaved(null);
        setReplyIdx(0);
      }, 1400);
    }
  }

  const started = messages.length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ minHeight: "70vh" }}>
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The Companion</h1>
      </header>

      {/* Boundaries banner */}
      <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
        <p className="text-sm text-ink-soft">{COMPANION.oneLine}</p>
        <p className="mt-2 text-xs text-ink-muted">{COMPANION.memoryNote}</p>
      </div>

      {/* Conversation */}
      <div className="mt-5 flex-1 space-y-3">
        {!started && (
          <div className="rounded-2xl border border-sand-200 bg-white/70 p-6">
            <p className="font-serif text-lg text-ink">What’s on your mind?</p>
            <p className="mt-1 text-sm text-ink-soft">Start with one of these, or just type. There’s no wrong way in.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {COMPANION_STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-sand-300 bg-ivory-50/60 px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:border-teal-300 hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
            <button onClick={loadExample} className="mt-4 text-xs text-teal-600 link-underline">
              Or watch an example conversation
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-teal-600 text-ivory-50"
                  : "rounded-bl-sm bg-ivory-100 text-ink-soft"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Save / memory panel */}
      {showSave ? (
        <div className="mt-5 rounded-2xl border border-teal-200 bg-white/80 p-5 shadow-soft">
          <h2 className="font-serif text-lg text-ink">Before you go, what would you like to keep?</h2>
          <p className="mt-1 text-sm text-ink-soft">{COMPANION.memoryNote}</p>
          {saved ? (
            <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">
              {saved}. Done. (Demo only, nothing was actually saved.)
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {COMPANION_SAVE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => chooseSave(o.id, o.label)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    o.tone === "danger"
                      ? "border-clay-200 bg-clay-100/50 hover:border-clay-300"
                      : "border-sand-300 bg-ivory-50/60 hover:border-teal-300"
                  }`}
                >
                  <div className="text-sm font-medium text-ink">{o.label}</div>
                  <div className="text-xs text-ink-muted">{o.note}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Type whatever is here right now..."
              className="flex-1 resize-none rounded-2xl border border-sand-300 bg-white/70 p-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
            <button onClick={() => send(input)} className="btn-primary">Send</button>
          </div>
          {started && (
            <div className="mt-3 text-right">
              <button onClick={() => setShowSave(true)} className="text-xs text-teal-600 link-underline">
                Finish chat and choose what to keep
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
