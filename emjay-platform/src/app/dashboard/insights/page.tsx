import Link from "next/link";
import { DEMO_INSIGHTS } from "@/lib/mock-data";

const TAG_STYLE: Record<string, string> = {
  skin: "bg-clay-100 text-clay-400 border-clay-200",
  stress: "bg-teal-50 text-teal-700 border-teal-200",
  sleep: "bg-teal-50 text-teal-600 border-teal-200",
  energy: "bg-teal-50 text-teal-700 border-teal-200",
  identity: "bg-clay-100 text-clay-400 border-clay-200",
};

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Your patterns</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          This is where your whole story starts to connect. As you check in and reflect over weeks and
          months, Emjay looks for the threads and tells you about them in plain language. Never a
          diagnosis, just what your own story seems to be showing.
        </p>
      </header>

      <div className="rounded-2xl border border-clay-200 bg-clay-100/60 p-4 text-sm text-ink-soft">
        <strong className="font-semibold text-ink">These are demo insights.</strong> They are
        hand-written examples of the kind of pattern the finished product would surface, shown here on
        sample data. The real pattern engine is not built yet.
      </div>

      <section className="space-y-5">
        {DEMO_INSIGHTS.map((ins) => (
          <article key={ins.id} className="rounded-2xl border border-sand-200 bg-white/70 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-clay-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink">
                Demo insight
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${TAG_STYLE[ins.tag] ?? "border-sand-200 bg-ivory-100 text-ink-soft"}`}>
                {ins.tag}
              </span>
            </div>
            <h2 className="mt-3 font-serif text-xl leading-snug text-ink">{ins.headline}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{ins.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-6 text-center">
        <h2 className="font-serif text-xl text-ink">The longer you’re here, the clearer it gets.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
          Patterns need a little time to show themselves. A few weeks of gentle check-ins is usually
          enough for the first threads to appear. No rush.
        </p>
        <Link href="/dashboard/check-in" className="btn-primary mt-4">Add today’s check-in</Link>
      </section>
    </div>
  );
}
