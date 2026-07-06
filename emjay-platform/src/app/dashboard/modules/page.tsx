import Link from "next/link";
import { ModuleTimeline } from "@/components/ModuleTimeline";

export default function ModulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/dashboard" className="text-xs text-teal-600 link-underline">← Today</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The path through</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Six modules, opened gradually. The deeper work becomes available in the order a nervous
          system can actually take it in. Safety first. There is no catching up, and nothing is
          withheld to make you work for it. It simply opens when the ground underneath is steady.
        </p>
      </header>

      <div className="card">
        <ModuleTimeline />
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 text-sm text-ink-soft">
        Going at your own pace is the point. If a module feels like too much, you can stay where you
        are for as long as you need. This is a practice, not a race.
      </div>
    </div>
  );
}
