"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { MARKETING_NAV } from "@/lib/brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-ivory-50/85 backdrop-blur-md">
      <div className="container-e flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {MARKETING_NAV.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-ink-soft transition-colors hover:text-teal-600">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/dashboard" className="btn-ghost text-sm">
            See inside
          </Link>
          <a href="/#pricing" className="btn-primary">
            Start The Practice
          </a>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost lg:hidden" aria-label="Toggle menu" aria-expanded={open}>
          <div className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-sand-200 bg-ivory-50 lg:hidden">
          <nav className="container-e flex flex-col py-3">
            {MARKETING_NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-sm text-ink-soft">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/dashboard" className="btn-secondary" onClick={() => setOpen(false)}>
                See inside
              </Link>
              <a href="/#pricing" className="btn-primary" onClick={() => setOpen(false)}>
                Start The Practice
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
