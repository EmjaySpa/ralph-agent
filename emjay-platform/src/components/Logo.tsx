import Link from "next/link";

/** Emjay wordmark with a soft breathing orb mark. */
export function Logo({
  href = "/",
  className = "",
  tone = "ink",
}: {
  href?: string;
  className?: string;
  tone?: "ink" | "light";
}) {
  const text = tone === "light" ? "text-ivory-50" : "text-ink";
  const sub = tone === "light" ? "text-ivory-100/80" : "text-ink-muted";
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-teal-300/40 animate-breathe" />
        <span className="absolute inset-[6px] rounded-full bg-teal-400" />
        <span className="absolute inset-[11px] rounded-full bg-ivory-50" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-serif text-lg ${text}`}>Emjay</span>
        <span className={`text-[9px] font-medium uppercase tracking-[0.22em] ${sub}`}>
          The Platform
        </span>
      </span>
    </Link>
  );
}
