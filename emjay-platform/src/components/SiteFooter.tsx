import Link from "next/link";
import { Logo } from "./Logo";
import { CrisisNote } from "./CrisisNote";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-sand-200 bg-ivory-100/70">
      <div className="container-e py-14">
        <div className="mb-12">
          <CrisisNote />
        </div>
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              The private online place where your whole story finally connects. With {BRAND.founder}.
            </p>
            <p className="mt-4 text-xs text-ink-muted">Emjay Wellness · {BRAND.location}.</p>
          </div>
          <div>
            <h4 className="eyebrow mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li><a href="/#how" className="hover:text-teal-600">How it works</a></li>
              <li><a href="/#vault" className="hover:text-teal-600">Your Life Vault</a></li>
              <li><a href="/#companion" className="hover:text-teal-600">The Companion</a></li>
              <li><a href="/#pricing" className="hover:text-teal-600">Pricing</a></li>
              <li><Link href="/dashboard" className="hover:text-teal-600">See inside</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="eyebrow mb-3">Ways to begin</h4>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li><a href="/#pricing" className="hover:text-teal-600">The Practice</a></li>
              <li><a href="/#pricing" className="hover:text-teal-600">“I’m at my limit” session</a></li>
              <li><a href="/#pricing" className="hover:text-teal-600">Nervous System Recalibration</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-sand-200/70">
        <div className="container-e flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Emjay. A demo build with sample data.</p>
          <p className="max-w-md">
            This is an MVP demo. Nothing here takes payment or stores real health information. Not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
