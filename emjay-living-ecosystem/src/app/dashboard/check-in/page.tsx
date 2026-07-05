"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CHECKIN_METRICS,
  MENOPAUSE_SYMPTOMS,
  CYCLE_STATES,
} from "@/lib/mock-data";

type Values = Record<string, number>;

export default function CheckInPage() {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(CHECKIN_METRICS.map((m) => [m.key, 3]))
  );
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [cycle, setCycle] = useState<string>(CYCLE_STATES[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up py-10 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full bg-eucalyptus-200/50 animate-breathe" />
          <span className="relative font-serif text-3xl text-eucalyptus-600">✓</span>
        </div>
        <h1 className="font-serif text-3xl text-ink">That’s logged.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Thank you for showing up for yourself today. Your check-in is added to the
          picture. Over time, the pattern gets clearer, and you don’t have to hold it in
          your head anymore.
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          Demo only — nothing was saved to a server.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="btn-primary">
            Back to today
          </Link>
          <Link href="/dashboard/journal" className="btn-secondary">
            Write a little
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <Link href="/dashboard" className="text-xs text-eucalyptus-600 link-underline">
          ← Today
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">How are you, honestly?</h1>
        <p className="mt-2 text-ink-soft">
          No right answers. Slide to wherever today actually sits. A three is a perfectly
          honest place to be.
        </p>
      </header>

      {/* Sliders */}
      <section className="space-y-6">
        {CHECKIN_METRICS.map((m) => (
          <div key={m.key} className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-ink">
                <span className="mr-2" aria-hidden>{m.emoji}</span>
                {m.label}
              </span>
              <span className="text-sm font-semibold text-eucalyptus-600">
                {values[m.key]} / 5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={values[m.key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [m.key]: Number(e.target.value) }))
              }
              className="emjay-range w-full"
              aria-label={m.label}
            />
            <div className="mt-2 flex justify-between text-xs text-ink-muted">
              <span>{m.low}</span>
              <span>{m.high}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Menopause symptoms */}
      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Anything from the body today?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Tap any that fit. This is data, not a verdict.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MENOPAUSE_SYMPTOMS.map((s) => {
            const on = symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-eucalyptus-400 bg-eucalyptus-500 text-oat-50"
                    : "border-oat-300 bg-white/60 text-ink-soft hover:border-eucalyptus-300"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      {/* Cycle */}
      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Where’s your cycle?</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CYCLE_STATES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                cycle === c
                  ? "border-blush-400 bg-blush-300 text-ink"
                  : "border-oat-300 bg-white/60 text-ink-soft hover:border-blush-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Free text */}
      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Anything you want to note?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          A sentence, a word, or nothing at all. Whatever is true.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Today felt like..."
          className="mt-3 w-full resize-none rounded-xl border border-oat-300 bg-white/70 p-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-eucalyptus-400 focus:ring-2 focus:ring-eucalyptus-200"
        />
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/dashboard" className="btn-ghost">
          Not today
        </Link>
        <button onClick={() => setDone(true)} className="btn-primary">
          Log today’s check-in
        </button>
      </div>
    </div>
  );
}
