import { MODULES } from "@/lib/brand";

const STATE_LABEL: Record<string, string> = {
  open: "Open now",
  current: "You’re here",
  later: "Opens gradually",
};

/**
 * The six-module progression, shown as a gentle path. Deeper modules open
 * gradually to mirror trauma-informed pacing. No locks-as-pressure language.
 */
export function ModuleTimeline({ showState = true }: { showState?: boolean }) {
  return (
    <ol className="relative space-y-2">
      <span className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-teal-300 via-teal-200 to-sand-300" aria-hidden />
      {MODULES.map((m) => (
        <li key={m.key} className="relative flex gap-5 rounded-2xl p-3 transition-colors hover:bg-white/60">
          <span
            className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif ${
              m.state === "later"
                ? "border border-sand-300 bg-ivory-50 text-ink-muted"
                : "border border-teal-300 bg-teal-50 text-teal-600"
            }`}
          >
            {m.n}
          </span>
          <div className="pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg text-ink">{m.title}</h3>
              {showState && (
                <span className={m.state === "current" ? "pill-clay" : "pill"}>{STATE_LABEL[m.state]}</span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{m.blurb}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
