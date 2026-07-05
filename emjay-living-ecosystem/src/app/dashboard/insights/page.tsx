import Link from "next/link";
import { DEMO_INSIGHTS } from "@/lib/mock-data";

const TAG_STYLE: Record<string, string> = {
  skin: "bg-blush-100 text-blush-400 border-blush-200",
  stress: "bg-eucalyptus-50 text-eucalyptus-700 border-eucalyptus-200",
  sleep: "bg-eucalyptus-50 text-eucalyptus-600 border-eucalyptus-200",
  cycle: "bg-blush-100 text-blush-400 border-blush-200",
  receiving: "bg-sage-100 text-sage-600 border-sage-200",
};

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-eucalyptus-600 link-underline">
          ← Today
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Your patterns</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          This is where your whole story starts to connect. As you check in and reflect
          over weeks and months, Emjay looks for the threads, and tells you about them in
          plain language. Never a diagnosis. Just what your own data seems to be saying.
        </p>
      </header>

      {/* Honesty banner about the demo */}
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-ink-soft">
        <strong className="font-semibold text-ink">These insights are illustrative.</strong>{" "}
        They are hand-written examples of the kind of pattern the finished product would
        surface, shown here on sample data. The real insight engine is not built yet.
      </div>

      <section className="space-y-5">
        {DEMO_INSIGHTS.map((ins) => (
          <article
            key={ins.id}
            className="rounded-2xl border border-oat-200 bg-white/70 p-6 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                  TAG_STYLE[ins.tag] ?? "border-oat-200 bg-oat-100 text-ink-soft"
                }`}
              >
                {ins.tag}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                {ins.confidence}
              </span>
            </div>
            <h2 className="mt-3 font-serif text-xl leading-snug text-ink">
              {ins.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{ins.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-eucalyptus-200 bg-eucalyptus-50 p-6 text-center">
        <h2 className="font-serif text-xl text-ink">The longer you’re here, the clearer it gets.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
          Patterns need time to show themselves. A few weeks of gentle check-ins is
          usually enough for the first threads to appear.
        </p>
        <Link href="/dashboard/check-in" className="btn-primary mt-4">
          Add today’s check-in
        </Link>
      </section>
    </div>
  );
}
