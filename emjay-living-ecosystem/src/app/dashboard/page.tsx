import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";
import { STAGES } from "@/lib/brand";
import {
  DEMO_USER,
  CHECKIN_METRICS,
  CHECKIN_HISTORY,
  DEMO_INSIGHTS,
  DEMO_JOURNAL_ENTRIES,
  RESOURCES,
} from "@/lib/mock-data";

const METRIC_COLORS: Record<string, string> = {
  sleep: "#4F8788",
  mood: "#C68A82",
  energy: "#87997A",
  stress: "#3F6C6D",
  skin: "#B1CFCF",
};

function trendArrow(values: number[]) {
  const first = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const last = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const diff = last - first;
  if (diff > 0.4) return { label: "lifting", cls: "text-eucalyptus-600" };
  if (diff < -0.4) return { label: "dipping", cls: "text-blush-400" };
  return { label: "steady", cls: "text-ink-muted" };
}

export default function TodayPage() {
  const stage = STAGES[DEMO_USER.currentStageIndex];
  const featured = DEMO_INSIGHTS[0];
  const nextPractice = RESOURCES.find((r) => !r.locked);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="animate-fade-up">
        <p className="eyebrow">Wednesday, 5 July</p>
        <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">
          Good morning, {DEMO_USER.firstName}.
        </h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Nothing is due. When you have a minute, we can check in. Otherwise, just being
          here counts.
        </p>
      </header>

      {/* Check-in CTA */}
      <section className="rounded-3xl border border-eucalyptus-200 bg-gradient-to-br from-eucalyptus-50 to-blush-100/50 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-ink">Today’s check-in</h2>
            <p className="mt-1 text-sm text-ink-soft">
              A minute across sleep, mood, skin, energy and stress. Sliders, not
              homework.
            </p>
          </div>
          <Link href="/dashboard/check-in" className="btn-primary shrink-0">
            Start check-in
          </Link>
        </div>
      </section>

      {/* Trend tiles */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">Your last two weeks</h2>
          <span className="text-xs text-ink-muted">Sample data</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHECKIN_METRICS.map((m) => {
            const values = CHECKIN_HISTORY.map((d) => d[m.key]);
            const t = trendArrow(values);
            return (
              <div key={m.key} className="card !p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{m.label}</span>
                  <span aria-hidden>{m.emoji}</span>
                </div>
                <div className="mt-2">
                  <Sparkline values={values} color={METRIC_COLORS[m.key]} />
                </div>
                <p className={`mt-1 text-xs ${t.cls}`}>{t.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-up: insight + stage */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col">
          <div className="flex items-center justify-between">
            <span className="pill">A pattern worth noticing</span>
            <Link href="/dashboard/insights" className="text-xs text-eucalyptus-600 link-underline">
              All insights
            </Link>
          </div>
          <h3 className="mt-4 font-serif text-lg leading-snug text-ink">{featured.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{featured.body}</p>
          <p className="mt-3 text-[11px] italic text-ink-muted">
            Illustrative insight from sample data.
          </p>
        </div>

        <div className="card flex flex-col">
          <span className="pill">Where you are in the model</span>
          <h3 className="mt-4 font-serif text-lg text-ink">
            Stage {stage.n}: {stage.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{stage.blurb}</p>
          <div className="mt-4 flex gap-1.5">
            {STAGES.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= DEMO_USER.currentStageIndex ? "bg-eucalyptus-400" : "bg-oat-200"
                }`}
                title={`Stage ${s.n}: ${s.title}`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Modules open in order. You are not behind.
          </p>
        </div>
      </section>

      {/* Two-up: next practice + recent journal */}
      <section className="grid gap-6 lg:grid-cols-2">
        {nextPractice && (
          <div className="card">
            <span className="pill">Suggested for today</span>
            <h3 className="mt-4 font-serif text-lg text-ink">{nextPractice.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {nextPractice.description}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/dashboard/library" className="btn-secondary text-sm">
                Open the library
              </Link>
              <span className="text-xs text-ink-muted">{nextPractice.length}</span>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between">
            <span className="pill">From your journal</span>
            <Link href="/dashboard/journal" className="text-xs text-eucalyptus-600 link-underline">
              Open journal
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {DEMO_JOURNAL_ENTRIES.map((e) => (
              <li key={e.id} className="border-l-2 border-eucalyptus-200 pl-3">
                <p className="text-xs font-medium text-eucalyptus-700">
                  {e.promptTitle} · {e.date}
                </p>
                <p className="mt-1 text-sm italic leading-relaxed text-ink-soft">
                  “{e.excerpt}”
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
