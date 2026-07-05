import { STAGES } from "@/lib/brand";

/**
 * The six-stage Emjay model, shown as a paced vertical timeline. Used on the
 * landing page. The app opens modules in this order — safety first.
 */
export function StageTimeline() {
  return (
    <ol className="relative space-y-2">
      <span
        className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-eucalyptus-300 via-sage-300 to-blush-300"
        aria-hidden
      />
      {STAGES.map((s) => (
        <li key={s.key} className="relative flex gap-5 rounded-2xl p-3 transition-colors hover:bg-white/60">
          <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-eucalyptus-200 bg-oat-50 font-serif text-eucalyptus-600">
            {s.n}
          </span>
          <div className="pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg text-ink">{s.title}</h3>
              <span className="pill">{s.moduleTitle}</span>
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{s.blurb}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
