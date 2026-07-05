import Link from "next/link";
import { Logo } from "./Logo";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-oat-200 bg-oat-100/60">
      <div className="container-emjay grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{BRAND.strapline}</p>
          <p className="mt-4 text-xs text-ink-muted">
            Emjay Wellness · Queensland, Australia. With {BRAND.founder}.
          </p>
        </div>
        <div>
          <h4 className="eyebrow mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><a href="/#idea" className="hover:text-eucalyptus-600">The idea</a></li>
            <li><a href="/#model" className="hover:text-eucalyptus-600">The Emjay model</a></li>
            <li><a href="/#offers" className="hover:text-eucalyptus-600">Offers</a></li>
            <li><Link href="/dashboard" className="hover:text-eucalyptus-600">The demo</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow mb-3">Begin</h4>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><a href="/#offers" className="hover:text-eucalyptus-600">The Nervous System Reset</a></li>
            <li><a href="/#offers" className="hover:text-eucalyptus-600">“I’m at my limit” session</a></li>
            <li><a href="/#offers" className="hover:text-eucalyptus-600">Nervous System Recalibration</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-oat-200/70">
        <div className="container-emjay flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Emjay. A demo build with sample data.</p>
          <p className="max-w-md">
            This is an MVP demo. Nothing here takes payment or stores real health
            information. Not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
