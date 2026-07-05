"use client";

import Link from "next/link";
import { useState } from "react";
import { JOURNAL_PROMPTS, DEMO_JOURNAL_ENTRIES } from "@/lib/mock-data";

export default function JournalPage() {
  const [openId, setOpenId] = useState<string | null>(JOURNAL_PROMPTS[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  function save(id: string) {
    setSavedId(id);
    // Demo only — nothing persists. TODO: write to real per-user store.
    setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-eucalyptus-600 link-underline">
          ← Today
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Journal</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Prompts written to talk to you, not at you. Start anywhere. There is no wrong
          way to do this, and you can leave a page half-finished.
        </p>
      </header>

      {/* Prompts */}
      <section className="space-y-4">
        {JOURNAL_PROMPTS.map((p) => {
          const open = openId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border bg-white/70 shadow-soft transition-colors ${
                open ? "border-eucalyptus-300" : "border-oat-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                aria-expanded={open}
              >
                <div>
                  <h2 className="font-serif text-xl text-ink">{p.title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{p.intro}</p>
                </div>
                <span
                  className={`shrink-0 text-eucalyptus-500 transition-transform ${
                    open ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  ＋
                </span>
              </button>

              {open && (
                <div className="border-t border-oat-200 p-5">
                  <ul className="space-y-2">
                    {p.questions.map((q) => (
                      <li key={q} className="flex gap-2 text-sm text-ink-soft">
                        <span className="text-blush-400">◦</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <textarea
                    value={drafts[p.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    rows={5}
                    placeholder="Write as much or as little as you like..."
                    className="mt-4 w-full resize-none rounded-xl border border-oat-300 bg-oat-50/60 p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted/70 focus:border-eucalyptus-400 focus:ring-2 focus:ring-eucalyptus-200"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      Private to you. Demo only, nothing is saved.
                    </span>
                    <button
                      type="button"
                      onClick={() => save(p.id)}
                      className="btn-primary text-sm"
                    >
                      {savedId === p.id ? "Held gently ✓" : "Save entry"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Recent entries */}
      <section>
        <h2 className="mb-3 font-serif text-xl text-ink">Recent entries</h2>
        <div className="space-y-3">
          {DEMO_JOURNAL_ENTRIES.map((e) => (
            <div key={e.id} className="card">
              <p className="text-xs font-medium text-eucalyptus-700">
                {e.promptTitle} · {e.date}
              </p>
              <p className="mt-2 text-sm italic leading-relaxed text-ink-soft">
                “{e.excerpt}”
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
