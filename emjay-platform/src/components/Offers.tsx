import { OFFERINGS, PRODUCT } from "@/lib/brand";

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 8 14.5 16 6" />
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
              o.featured ? "border-teal-300 bg-white shadow-lift ring-1 ring-teal-200" : "border-sand-200 bg-white/70 shadow-soft"
            }`}
          >
            {o.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ivory-50">
                Start here
              </span>
            )}
            <h3 className="font-serif text-xl text-ink">{o.name}</h3>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-serif text-3xl text-teal-600">{o.price}</span>
              {o.cadence && <span className="text-sm text-ink-muted">{o.cadence}</span>}
            </div>
            {o.priceNote && <p className="mt-1 text-xs text-ink-muted">{o.priceNote}</p>}
            {o.access && <p className="mt-2 text-xs font-medium text-teal-600">{o.access}</p>}

            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{o.summary}</p>
            <p className="mt-3 text-sm italic text-teal-700">{o.forWho}</p>

            {o.options && (
              <div className="mt-5 grid gap-2">
                {o.options.map((opt) => (
                  <div key={opt.label} className="flex items-center justify-between rounded-xl border border-sand-200 bg-ivory-50/60 px-3.5 py-2 text-sm">
                    <span className="text-ink">{opt.label}</span>
                    <span className="font-medium text-teal-700">{opt.price}</span>
                  </div>
                ))}
              </div>
            )}

            <ul className="mt-5 space-y-2.5 border-t border-sand-200 pt-5 text-sm text-ink-soft">
              {o.includes.map((inc) => (
                <li key={inc} className="flex gap-2.5">
                  <Check />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-1">
              {/* TODO(payments/booking): wire to Stripe (The Practice) and Square
                  (sessions) once Bel's accounts and price IDs exist. Demo only. */}
              <button className={o.featured ? "btn-primary w-full" : "btn-secondary w-full"} type="button">
                {o.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        The Practice is {PRODUCT.priceLine}, month to month. No “{PRODUCT.avoidedWord}” to keep up with.
        Sessions and Recalibration are available online or in person, with online the easiest place to start.
        Prices in AUD. This is a demo, so nothing here takes payment.
      </p>
    </div>
  );
}
