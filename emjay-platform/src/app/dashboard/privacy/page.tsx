import Link from "next/link";
import { SAVE_STATUS, AUDIT_LOG } from "@/lib/mock-data";
import { COMPANION } from "@/lib/brand";

const KIND_DOT: Record<string, string> = {
  you: "bg-teal-400",
  companion: "bg-clay-300",
  system: "bg-sand-300",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Privacy</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Privacy here is a feature, not fine print. This is what is saved, what is not, and what the
          Companion can see. Your story belongs to you.
        </p>
      </header>

      {/* Save status */}
      <section className="card">
        <h2 className="font-serif text-xl text-ink">What is saved</h2>
        <ul className="mt-4 divide-y divide-sand-200">
          {SAVE_STATUS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{s.label}</p>
                <p className="text-xs text-ink-muted">{s.note}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${s.saved ? "bg-teal-50 text-teal-700" : "bg-ivory-100 text-ink-muted"}`}>
                {s.saved ? "Saved" : "Temporary"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Companion memory */}
      <section className="card">
        <h2 className="font-serif text-xl text-ink">What the Companion can access</h2>
        <p className="mt-1 text-sm text-ink-soft">{COMPANION.memoryNote}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="pill">Memory: temporary by default</span>
          <span className="pill-clay">Only what you have saved</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-secondary text-sm">Review Companion memories</button>
          <button className="btn-secondary text-sm">Turn off Companion access</button>
        </div>
      </section>

      {/* Audit log */}
      <section className="card">
        <h2 className="font-serif text-xl text-ink">Activity log</h2>
        <p className="mt-1 text-sm text-ink-soft">A plain record of what happened with your information.</p>
        <ul className="mt-4 space-y-3">
          {AUDIT_LOG.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[a.kind]}`} />
              <div>
                <p className="text-sm text-ink">{a.text}</p>
                <p className="text-xs text-ink-muted">{a.when}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">Audit log is illustrative in this demo.</p>
      </section>

      {/* Controls */}
      <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
        <h2 className="font-serif text-xl text-ink">Your controls</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button className="btn-secondary justify-start">Export my data</button>
          <button className="btn-secondary justify-start">Download saved transcripts</button>
          <button className="btn-secondary justify-start">Manage saved insights</button>
          <button className="btn justify-start border border-clay-300 bg-clay-100/50 text-clay-400 hover:bg-clay-100">
            Delete everything
          </button>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Demo only. Real export, deletion and consent flows are a TODO before launch, alongside a
          full privacy and compliance review.
        </p>
      </section>
    </div>
  );
}
