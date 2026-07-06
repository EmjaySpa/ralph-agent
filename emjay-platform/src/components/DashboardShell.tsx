"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { DASHBOARD_NAV } from "@/lib/brand";

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {DASHBOARD_NAV.map((l) => {
        const active =
          l.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
              active ? "bg-teal-600 text-ivory-50 shadow-soft" : "text-ink-soft hover:bg-ivory-100 hover:text-ink"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ivory-50" : "bg-teal-300"}`} />
            {l.label}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-wash-soft">
      {/* Demo-mode banner */}
      <div className="bg-teal-700 text-center text-xs text-ivory-50/95">
        <div className="container-e py-2">
          Demo mode · a pretend logged-in account with sample data.{" "}
          <Link href="/" className="underline underline-offset-2">Back to the site</Link>
        </div>
      </div>

      <div className="container-e flex gap-8 py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col md:flex">
          <div className="mb-6">
            <Logo href="/dashboard" />
          </div>
          <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
            <NavItems />
          </nav>
          <div className="mt-auto rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Your story belongs to you</p>
            <p className="mt-1 text-sm text-ink-soft">Nothing is saved unless you choose to keep it.</p>
            <Link href="/dashboard/privacy" className="mt-2 inline-block text-xs text-teal-600 link-underline">
              Review your privacy
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Logo href="/dashboard" />
            <button onClick={() => setOpen((v) => !v)} className="btn-ghost" aria-label="Menu">
              <div className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 bg-ink" />
                <span className="block h-0.5 w-5 bg-ink" />
                <span className="block h-0.5 w-5 bg-ink" />
              </div>
            </button>
          </div>
          {open && (
            <nav className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-sand-200 bg-white/80 p-2 md:hidden">
              <NavItems onNavigate={() => setOpen(false)} />
            </nav>
          )}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
