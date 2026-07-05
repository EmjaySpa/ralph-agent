"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { DASHBOARD_NAV, MEMBERSHIP_FRAMING } from "@/lib/brand";
import { DEMO_USER } from "@/lib/mock-data";

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {DASHBOARD_NAV.map((l) => {
        const active =
          l.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
              active
                ? "bg-eucalyptus-500 text-oat-50 shadow-soft"
                : "text-ink-soft hover:bg-oat-100 hover:text-ink"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? "bg-oat-50" : "bg-eucalyptus-300"
              }`}
            />
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
    <div className="min-h-screen bg-emjay-wash-soft">
      {/* Demo-mode banner */}
      <div className="bg-eucalyptus-700 text-center text-xs text-oat-50/95">
        <div className="container-emjay py-2">
          Demo mode · you’re viewing a pretend logged-in account with sample data.{" "}
          <Link href="/" className="underline underline-offset-2">
            Back to the site
          </Link>
        </div>
      </div>

      <div className="container-emjay flex gap-8 py-6">
        {/* Sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col md:flex">
          <div className="mb-6">
            <Logo href="/dashboard" />
          </div>
          <nav className="flex flex-col gap-1">
            <NavItems />
          </nav>
          <div className="mt-auto rounded-2xl border border-eucalyptus-200 bg-eucalyptus-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-eucalyptus-700">
              Your practice
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {DEMO_USER.streakDays} days of showing up, at your own pace.
            </p>
            <p className="mt-2 text-[11px] text-ink-muted">
              {MEMBERSHIP_FRAMING.commitmentModel}.
            </p>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex-1">
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
            <nav className="mb-4 flex flex-col gap-1 rounded-2xl border border-oat-200 bg-white/80 p-2 md:hidden">
              <NavItems onNavigate={() => setOpen(false)} />
            </nav>
          )}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
