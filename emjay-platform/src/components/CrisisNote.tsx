import { SUPPORT } from "@/lib/brand";

/**
 * Calm, visible support signposting. Deliberately not alarming: soft teal, no
 * red, no scary iconography. Shown in the footer and the Companion.
 */
export function CrisisNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
      <p className="text-sm font-medium text-teal-700">If you need more than this platform can give</p>
      {!compact && <p className="mt-1 text-sm text-ink-soft">{SUPPORT.intro}</p>}
      <p className="mt-2 text-sm text-ink-soft">{SUPPORT.emergency}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {SUPPORT.services.map((s) => (
          <li key={s.name} className="text-sm text-ink-soft">
            <span className="font-medium text-ink">{s.name}</span>
            <span className="text-ink-muted"> · {s.detail}</span>
          </li>
        ))}
      </ul>
      {/* TODO(clinical+legal): confirm numbers, add live links, final review. */}
    </div>
  );
}
