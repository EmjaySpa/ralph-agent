import Link from "next/link";
import { VAULT_SECTIONS, TIMELINE_EVENTS, TREATMENTS } from "@/lib/mock-data";

export default function VaultPage() {
  return (
    <div className="space-y-10">
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Your Life Vault</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          One private place for your whole story. Everything here is yours. Nothing was saved without
          you choosing to keep it, and you can take it or delete it whenever you like.
        </p>
      </header>

      {/* Sections grid */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VAULT_SECTIONS.map((v) => (
            <div key={v.key} className="card flex items-start gap-3">
              <span className="text-2xl" aria-hidden>{v.emoji}</span>
              <div className="min-w-0">
                <h2 className="font-serif text-lg text-ink">{v.title}</h2>
                <p className="text-sm text-ink-soft">{v.count}</p>
                <p className="text-xs text-ink-muted">{v.latest}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline + treatments */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-serif text-xl text-ink">My Timeline</h2>
          <p className="mt-1 text-sm text-ink-soft">The life events that shaped the story, in your own words.</p>
          <ol className="mt-4 space-y-4">
            {TIMELINE_EVENTS.map((e) => (
              <li key={e.title} className="flex gap-4">
                <span className="mt-0.5 w-12 shrink-0 text-sm font-medium text-teal-600">{e.date}</span>
                <div className="border-l-2 border-teal-200 pl-4">
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-sm text-ink-soft">{e.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h2 className="font-serif text-xl text-ink">My Treatments</h2>
          <p className="mt-1 text-sm text-ink-soft">Your visits with Emjay, connected to the rest of your story.</p>
          <ul className="mt-4 space-y-3">
            {TREATMENTS.map((t) => (
              <li key={t.date} className="rounded-xl border border-sand-200 bg-ivory-50/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <span className="text-xs text-ink-muted">{t.date}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{t.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Data controls */}
      <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
        <h2 className="font-serif text-xl text-ink">Your story belongs to you</h2>
        <p className="mt-1 text-sm text-ink-soft">Plain controls, no hoops. (Demo only, these don’t do anything yet.)</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button className="btn-secondary justify-start">Export my data</button>
          <button className="btn-secondary justify-start">Delete selected items</button>
          <Link href="/dashboard/privacy" className="btn-secondary justify-start">Review what Companion can access</Link>
          <button className="btn justify-start border border-clay-300 bg-clay-100/50 text-clay-400 hover:bg-clay-100">
            Delete everything
          </button>
        </div>
        {/* TODO(data-rights): wire export (JSON/PDF) and deletion to the real
            datastore, with confirmation flows, once auth + DB exist. */}
      </section>
    </div>
  );
}
