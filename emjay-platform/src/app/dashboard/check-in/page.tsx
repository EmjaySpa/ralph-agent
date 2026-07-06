"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CHECKIN_METRICS,
  BODY_SENSATIONS,
  MENOPAUSE_SYMPTOMS,
  CYCLE_STATES,
} from "@/lib/mock-data";

type Values = Record<string, number>;

function Chips({
  options,
  selected,
  onToggle,
  tone = "teal",
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (s: string) => void;
  tone?: "teal" | "clay";
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((s) => {
        const on = selected.includes(s);
        const onCls =
          tone === "clay"
            ? "border-clay-300 bg-clay-300 text-ink"
            : "border-teal-400 bg-teal-600 text-ivory-50";
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggle(s)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              on ? onCls : "border-sand-300 bg-white/60 text-ink-soft hover:border-teal-300"
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export default function CheckInPage() {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(CHECKIN_METRICS.map((m) => [m.key, 3]))
  );
  const [body, setBody] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [cycle, setCycle] = useState<string>(CYCLE_STATES[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (s: string) =>
    setter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  if (done) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up py-10 text-center">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full bg-teal-200/50 animate-breathe" />
          <span className="relative font-serif text-3xl text-teal-600">✓</span>
        </div>
        <h1 className="font-serif text-3xl text-ink">That’s in.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Thank you for taking a minute for yourself. It’s added to your picture. Over time, the
          pattern gets clearer, and you don’t have to hold it all in your head.
        </p>
        <p className="mt-4 text-xs text-ink-muted">Demo only, so nothing was saved to a server.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="btn-primary">Back to today</Link>
          <Link href="/dashboard/journal" className="btn-secondary">Write a little</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">How are you, honestly?</h1>
        <p className="mt-2 text-ink-soft">
          No right answers, and nothing here is a test. Slide to wherever today actually sits. A three
          is a perfectly honest place to be.
        </p>
      </header>

      <section className="space-y-6">
        {CHECKIN_METRICS.map((m) => (
          <div key={m.key} className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-ink"><span className="mr-2" aria-hidden>{m.emoji}</span>{m.label}</span>
              <span className="text-sm font-semibold text-teal-600">{values[m.key]} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={values[m.key]}
              onChange={(e) => setValues((v) => ({ ...v, [m.key]: Number(e.target.value) }))}
              className="e-range w-full"
              aria-label={m.label}
            />
            <div className="mt-2 flex justify-between text-xs text-ink-muted">
              <span>{m.low}</span>
              <span>{m.high}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Where do you feel it in your body?</h2>
        <p className="mt-1 text-sm text-ink-soft">Tap anything that fits. This is noticing, not diagnosing.</p>
        <Chips options={BODY_SENSATIONS} selected={body} onToggle={toggle(setBody)} />
      </section>

      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Anything hormonal today?</h2>
        <p className="mt-1 text-sm text-ink-soft">Only if it’s useful to you. Skip it if not.</p>
        <Chips options={MENOPAUSE_SYMPTOMS} selected={symptoms} onToggle={toggle(setSymptoms)} />
      </section>

      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Where’s your cycle?</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CYCLE_STATES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                cycle === c ? "border-clay-300 bg-clay-300 text-ink" : "border-sand-300 bg-white/60 text-ink-soft hover:border-clay-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="font-serif text-lg text-ink">Anything you want to note?</h2>
        <p className="mt-1 text-sm text-ink-soft">A sentence, a word, or nothing at all. Whatever is true.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Today felt like..."
          className="mt-3 w-full resize-none rounded-xl border border-sand-300 bg-white/70 p-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
        />
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/dashboard" className="btn-ghost">Not today</Link>
        <button onClick={() => setDone(true)} className="btn-primary">Save today’s check-in</button>
      </div>
    </div>
  );
}
