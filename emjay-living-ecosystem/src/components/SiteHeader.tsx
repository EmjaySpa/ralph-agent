"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { MARKETING_NAV } from "@/lib/brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-oat-200/70 bg-oat-50/85 backdrop-blur-md">
      <div className="container-emjay flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {MARKETING_NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-soft transition-colors hover:text-eucalyptus-600"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/dashboard" className="btn-ghost text-sm">
            View the demo
          </Link>
          <a href="/#offers" className="btn-primary">
            Begin the Reset
          </a>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-oat-200 bg-oat-50 md:hidden">
          <nav className="container-emjay flex flex-col py-3">
            {MARKETING_NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-ink-soft"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/dashboard" className="btn-secondary" onClick={() => setOpen(false)}>
                View the demo
              </Link>
              <a href="/#offers" className="btn-primary" onClick={() => setOpen(false)}>
                Begin the Reset
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
