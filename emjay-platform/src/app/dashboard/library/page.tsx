import Link from "next/link";
import { RESOURCE_SECTIONS } from "@/lib/mock-data";
import { BOOKS as BOOK_LIST } from "@/lib/brand";

export default function LibraryPage() {
  return (
    <div className="space-y-10">
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The library</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Meditations, breathwork, somatic practices, book chapters and support tools. Some are here
          now, some open as you move through the modules. This is not a pile of content to get through.
          Take what you need and leave the rest.
        </p>
        <p className="mt-2 text-xs text-ink-muted">Placeholder library. Media is not wired up in this demo.</p>
      </header>

      {RESOURCE_SECTIONS.map((section) => (
        <section key={section.key}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-xl" aria-hidden>{section.emoji}</span>
            <div>
              <h2 className="font-serif text-xl text-ink">{section.title}</h2>
              <p className="text-sm text-ink-soft">{section.blurb}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((r) => (
              <article
                key={r.id}
                className={`flex flex-col rounded-2xl border p-5 shadow-soft ${r.locked ? "border-sand-200 bg-ivory-100/40" : "border-teal-200 bg-white/75"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">{r.length}</span>
                  {r.locked ? <span className="pill-clay">Opens later</span> : <span className="pill">Available</span>}
                </div>
                <h3 className="mt-2 font-serif text-lg leading-snug text-ink">{r.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">{r.description}</p>
                <button
                  type="button"
                  disabled={r.locked}
                  className={`mt-4 w-full text-sm ${r.locked ? "btn cursor-not-allowed bg-sand-200 text-ink-muted" : "btn-secondary"}`}
                >
                  {r.locked ? "Opens as you go" : "Begin"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Books shelf */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <span className="text-xl" aria-hidden>📚</span>
          <div>
            <h2 className="font-serif text-xl text-ink">Bel’s books</h2>
            <p className="text-sm text-ink-soft">New titles drop straight in as they’re ready.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOOK_LIST.map((b) => (
            <article key={b.id} className="card">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden>📖</span>
                <span className={b.status === "published" ? "pill" : "pill-clay"}>
                  {b.status === "published" ? "Available" : b.status === "editing" ? "In editing" : "Coming"}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-lg text-ink">{b.title}</h3>
              {b.subtitle && <p className="text-sm italic text-teal-700">{b.subtitle}</p>}
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.blurb}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
