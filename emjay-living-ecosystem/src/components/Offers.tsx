import { OFFERINGS, MEMBERSHIP_FRAMING } from "@/lib/brand";

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-eucalyptus-500" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.5 8 14.5 16 6"
      />
    </svg>
  );
}

export function Offers() {
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        {OFFERINGS.map((o) => (
          <div
            key={o.id}
            className={`relative flex flex-col rounded-3xl border p-7 ${
              o.featured
                ? "border-eucalyptus-300 bg-white shadow-lift ring-1 ring-eucalyptus-200"
                : "border-oat-200 bg-white/70 shadow-soft"
            }`}
          >
            {o.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-eucalyptus-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-oat-50">
                Start here
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-xl text-ink">{o.name}</h3>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-serif text-4xl text-eucalyptus-600">{o.price}</span>
              {o.cadence && <span className="text-sm text-ink-muted">{o.cadence}</span>}
            </div>
            {o.priceNote && <p className="mt-1 text-xs text-ink-muted">{o.priceNote}</p>}

            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{o.summary}</p>
            <p className="mt-3 text-sm italic text-eucalyptus-700">{o.forWho}</p>

            <ul className="mt-5 space-y-2.5 border-t border-oat-200 pt-5 text-sm text-ink-soft">
              {o.includes.map((inc) => (
                <li key={inc} className="flex gap-2.5">
                  <Check />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-1">
              <button
                className={o.featured ? "btn-primary w-full" : "btn-secondary w-full"}
                // TODO(payments): wire to Stripe Checkout / booking once Bel's
                // account + price IDs are supplied. Demo only — no charge.
                type="button"
              >
                {o.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        No “{MEMBERSHIP_FRAMING.avoidedTerm}” to keep up with. The Reset is{" "}
        {MEMBERSHIP_FRAMING.commitmentModel}. Prices in AUD. This is a demo — nothing here takes payment.
      </p>
    </div>
  );
}
