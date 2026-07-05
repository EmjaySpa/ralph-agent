import Link from "next/link";
import { RESOURCES } from "@/lib/mock-data";
import { STAGES } from "@/lib/brand";

const TYPE_EMOJI: Record<string, string> = {
  Meditation: "🕯️",
  Breathwork: "🌬️",
  "Book module": "📖",
  Audio: "🎧",
  Reading: "📄",
};

export default function LibraryPage() {
  const stageName = (key: string) =>
    STAGES.find((s) => s.key === key)?.title;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-eucalyptus-600 link-underline">
          ← Today
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The library</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Meditations, breathwork and book modules from Bel’s work. Some open now. Others
          open as you move through the model, so nothing arrives before your system is
          ready for it. This is not a content dump to get through.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Placeholder library — media is not wired up in this demo.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((r) => (
          <article
            key={r.id}
            className={`flex flex-col rounded-2xl border p-5 shadow-soft ${
              r.locked
                ? "border-oat-200 bg-oat-100/40"
                : "border-eucalyptus-200 bg-white/75"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden>
                {TYPE_EMOJI[r.type] ?? "◦"}
              </span>
              {r.locked ? (
                <span className="pill !border-oat-300 !bg-oat-100 !text-ink-muted">
                  Opens later
                </span>
              ) : (
                <span className="pill">Available</span>
              )}
            </div>
            <h2 className="mt-3 font-serif text-lg leading-snug text-ink">{r.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
              {r.description}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-oat-200 pt-3 text-xs text-ink-muted">
              <span>
                {r.type} · {r.length}
              </span>
              <span>{stageName(r.stageKey)}</span>
            </div>
            <button
              type="button"
              disabled={r.locked}
              className={`mt-4 ${
                r.locked
                  ? "btn cursor-not-allowed bg-oat-200 text-ink-muted"
                  : "btn-secondary"
              } w-full text-sm`}
            >
              {r.locked ? "Opens as you go" : "Begin"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
