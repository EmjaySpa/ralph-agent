import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";
import { MODULES } from "@/lib/brand";
import {
  DEMO_USER,
  CHECKIN_METRICS,
  CHECKIN_HISTORY,
  DEMO_INSIGHTS,
  VAULT_SECTIONS,
} from "@/lib/mock-data";

const METRIC_COLORS: Record<string, string> = {
  sleep: "#4C8788",
  mood: "#CE9F79",
  energy: "#6B9A7D",
  stress: "#396B6C",
  skin: "#B1CFCF",
};

function trend(values: number[]) {
  const first = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const last = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const diff = last - first;
  if (diff > 0.4) return { label: "gently lifting", cls: "text-teal-600" };
  if (diff < -0.4) return { label: "dipping a little", cls: "text-clay-400" };
  return { label: "fairly steady", cls: "text-ink-muted" };
}

export default function TodayPage() {
  const module = MODULES[DEMO_USER.currentModuleIndex];
  const featured = DEMO_INSIGHTS[0];

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="eyebrow">Wednesday, 5 July</p>
        <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">We’re glad you’re here, {DEMO_USER.firstName}.</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Nothing is due, and there’s nothing to catch up on. Pick up wherever you are. If you’ve got
          a minute, we can check in.
        </p>
      </header>

      {/* Check-in CTA */}
      <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-clay-100/40 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-ink">Today’s check-in</h2>
            <p className="mt-1 text-sm text-ink-soft">A minute across sleep, mood, energy, stress and skin. Sliders, not homework.</p>
          </div>
          <Link href="/dashboard/check-in" className="btn-primary shrink-0">Start check-in</Link>
        </div>
      </section>

      {/* Trend tiles */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">Your last couple of weeks</h2>
          <span className="text-xs text-ink-muted">Sample data</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHECKIN_METRICS.map((m) => {
            const values = CHECKIN_HISTORY.map((d) => d[m.key]);
            const t = trend(values);
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

      {/* Insight + module */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col">
          <div className="flex items-center justify-between">
            <span className="pill">A pattern worth noticing</span>
            <Link href="/dashboard/insights" className="text-xs text-teal-600 link-underline">All patterns</Link>
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-clay-400">Demo insight</p>
          <h3 className="mt-1 font-serif text-lg leading-snug text-ink">{featured.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{featured.body}</p>
          <p className="mt-3 text-[11px] italic text-ink-muted">Illustrative only, from sample data.</p>
        </div>

        <div className="card flex flex-col">
          <span className="pill">Where you are in the modules</span>
          <h3 className="mt-4 font-serif text-lg text-ink">Module {module.n}: {module.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{module.blurb}</p>
          <div className="mt-4 flex gap-1.5">
            {MODULES.map((m, i) => (
              <span
                key={m.key}
                className={`h-1.5 flex-1 rounded-full ${i <= DEMO_USER.currentModuleIndex ? "bg-teal-400" : "bg-sand-200"}`}
                title={`Module ${m.n}: ${m.title}`}
              />
            ))}
          </div>
          <Link href="/dashboard/modules" className="mt-4 text-xs text-teal-600 link-underline">See the path</Link>
        </div>
      </section>

      {/* Life Vault preview + Companion */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="pill">Your Life Vault</span>
            <Link href="/dashboard/vault" className="text-xs text-teal-600 link-underline">Open the Vault</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VAULT_SECTIONS.slice(0, 6).map((v) => (
              <div key={v.key} className="rounded-xl border border-sand-200 bg-ivory-50/60 p-3 text-center">
                <div className="text-xl" aria-hidden>{v.emoji}</div>
                <div className="mt-1 text-xs font-medium text-ink">{v.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col">
          <span className="pill">The Companion</span>
          <h3 className="mt-4 font-serif text-lg text-ink">Head full? Think it through here.</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            A calm thinking partner in Bel’s voice. Nothing is saved unless you choose to keep it.
          </p>
          <Link href="/dashboard/companion" className="btn-secondary mt-4 self-start text-sm">Open the Companion</Link>
        </div>
      </section>
    </div>
  );
}
