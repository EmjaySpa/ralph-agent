import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Offers } from "@/components/Offers";
import { ModuleTimeline } from "@/components/ModuleTimeline";
import { BRAND, PRODUCT, BOOKS } from "@/lib/brand";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="bg-wash">
        <div className="container-e grid items-center gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div className="animate-fade-up">
            <span className="pill">For women in midlife · {BRAND.location}</span>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] text-ink sm:text-5xl md:text-6xl">
              Where your whole story <span className="italic text-teal-600">finally connects.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              You’re not here because you need another thing to keep up with. You’re here because
              your body has been trying to get your attention, and life has been too loud to hear it.
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
              Emjay is the private place where your nervous system, skin, sleep, stress, menopause,
              emotions and life stop being separate problems, and start making sense together.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#pricing" className="btn-primary">Start The Practice</a>
              <Link href="/dashboard" className="btn-secondary">Have a look inside</Link>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              {PRODUCT.priceLine}. Start gently. No pressure, no catching up required.
            </p>
          </div>

          <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
            <span className="absolute inset-0 rounded-full bg-teal-200/40 animate-breathe" />
            <span className="absolute inset-8 rounded-full bg-teal-300/50 animate-breathe [animation-delay:-2.5s]" />
            <span className="absolute inset-16 rounded-full bg-clay-200/50 animate-breathe [animation-delay:-5s]" />
            <div className="relative z-10 rounded-2xl bg-white/80 px-6 py-5 text-center shadow-soft backdrop-blur">
              <p className="font-serif text-lg italic text-teal-700">Breathe out.</p>
              <p className="font-serif text-lg italic text-ink">You’re allowed to land here.</p>
              <p className="mt-1 text-xs text-ink-muted">We’re glad you’re here.</p>
            </div>
          </div>
        </div>
      </section>

      {/* NORTH STAR */}
      <section className="border-y border-sand-200 bg-teal-700 text-ivory-50">
        <div className="container-e py-16 text-center">
          <p className="mx-auto max-w-3xl font-serif text-2xl leading-relaxed sm:text-3xl">
            “{BRAND.northStar}”
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ivory-100/80">
            The advantage was never tracking, and it was never clever technology. It’s context.
            The whole picture, in one place, over time.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-ivory-50">
        <div className="container-e py-20">
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Simple on the surface. Deep underneath.</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              A minute a day is plenty. Emjay quietly connects what you notice, so you can stop
              holding all of it in your head.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Check in", "Sleep, mood, energy, stress, skin, body, cycle. A few sliders, not a medical form."],
              ["02", "Reflect", "Journal prompts written to talk to you, not at you. Save only what you want to keep."],
              ["03", "See the pattern", "Plain-language insights as your story builds. The dots start joining themselves."],
              ["04", "Go deeper, gently", "Modules, breathwork and book chapters that open gradually, at your pace."],
            ].map(([n, t, d]) => (
              <div key={n} className="card flex flex-col">
                <span className="font-serif text-2xl text-clay-300">{n}</span>
                <h3 className="mt-2 font-serif text-lg text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIFE VAULT */}
      <section id="vault" className="bg-ivory-100/50">
        <div className="container-e grid items-center gap-12 py-20 md:grid-cols-2">
          <div>
            <span className="eyebrow">Your Life Vault</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">One private place for your whole story.</h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Your check-ins, journal, skin notes, timeline, treatments, book progress and saved
              insights, gathered in one calm space that belongs to you.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Nothing is saved unless you choose to keep it. You can export it, or delete it, at any
              time. Your story belongs to you, full stop.
            </p>
            <Link href="/dashboard/vault" className="btn-secondary mt-6">See the Life Vault</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["My Story", "My Journal", "My Check-ins", "My Body", "My Skin", "My Timeline", "Saved Insights", "My Treatments", "My Books"].map((s) => (
              <div key={s} className="rounded-2xl border border-sand-200 bg-white/70 p-4 text-center text-sm text-ink-soft shadow-soft">
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPANION */}
      <section id="companion" className="bg-ivory-50">
        <div className="container-e grid items-center gap-12 py-20 md:grid-cols-[0.95fr_1.05fr]">
          <div>
            <span className="eyebrow">The Emjay Companion</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">A thinking partner, in Bel’s voice.</h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              The Companion is guided by the Emjay framework developed by Bel. It can help you reflect,
              organise your thoughts, notice patterns and prepare questions for your GP.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              It is not Bel, and it does not pretend to be. It is not a therapist or a doctor, it does
              not diagnose or give medical advice, and it is not crisis support. What you say stays
              temporary unless you choose to save it.
            </p>
            <Link href="/dashboard/companion" className="btn-secondary mt-6">Meet the Companion</Link>
          </div>
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-soft">
            <div className="space-y-3">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2.5 text-sm text-ivory-50">
                I’m wired but exhausted and honestly a bit over it all.
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-ivory-100 px-4 py-2.5 text-sm text-ink-soft">
                Yeah, that combination is rough, and it is more common than you would think. Wired and
                exhausted usually means your system has been running on stress for a while and does not
                quite trust that it is safe to rest yet. That is not you being dramatic.
              </div>
            </div>
            <p className="mt-4 border-t border-sand-200 pt-3 text-xs text-ink-muted">
              Guided by the Emjay framework. Not medical, psychological or crisis support.
            </p>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-ivory-100/50">
        <div className="container-e grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="eyebrow">The path through</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Six modules, opened gently.</h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              The deeper work opens gradually, in the order a nervous system can actually take it in.
              Safety first. Nothing arrives before you are ready for it, and there is no catching up.
            </p>
          </div>
          <ModuleTimeline />
        </div>
      </section>

      {/* BOOKS */}
      <section id="books" className="bg-ivory-50">
        <div className="container-e py-20">
          <div className="max-w-2xl">
            <span className="eyebrow">Books and resources</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Bel’s books, as gentle modules.</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Her writing lives inside The Practice, broken into chapters you can work through slowly.
              New titles are added as they land.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BOOKS.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>📖</span>
                  <span className={b.status === "published" ? "pill" : "pill-clay"}>
                    {b.status === "published" ? "In the library" : b.status === "editing" ? "In editing" : "Coming"}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-lg text-ink">{b.title}</h3>
                {b.subtitle && <p className="text-sm italic text-teal-700">{b.subtitle}</p>}
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY AS A FEATURE */}
      <section className="bg-teal-700 text-ivory-50">
        <div className="container-e py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">Privacy, as a feature</span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Your story belongs to you.</h2>
            <p className="mt-4 leading-relaxed text-ivory-100/90">
              Not buried in fine print. Built in. You decide what is saved, you can see what the
              Companion can access, and you can export or delete anything, whenever you like.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Saved only when you say so", "Chats are temporary by default. Nothing is kept unless you choose to keep it."],
              ["You can see everything", "A plain audit log shows what was saved, and what the Companion looked at."],
              ["Yours to take or delete", "Export your data or delete it, in a couple of taps. No hoops."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-teal-500/40 bg-teal-600/40 p-5">
                <h3 className="font-serif text-lg">{t}</h3>
                <p className="mt-2 text-sm text-ivory-100/85">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-ivory-100/50">
        <div className="container-e py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Pricing</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Come in at the door that fits today.</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Start with The Practice, or reach for a session when you need a real person. Sessions and
              the Recalibration package are available online or in person, and online is the easiest
              place to begin.
            </p>
          </div>
          <div className="mt-12">
            <Offers />
          </div>
        </div>
      </section>

      {/* ABOUT BEL */}
      <section className="bg-ivory-50">
        <div className="container-e grid items-center gap-12 py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
            <span className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-teal-200 to-clay-200" />
            <span className="relative font-serif text-6xl italic text-teal-700">Bel</span>
          </div>
          <div>
            <span className="eyebrow">About Bel</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Honest, body-first support from someone who has been there.</h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              {BRAND.founder} is a skin therapist and nervous system practitioner who works where the
              science and the lived reality meet. Her approach is both-and: honest about the body,
              honest about what it carries. No fluff, no toxic positivity, no lectures.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              She is the author of <em>Unwritten</em> and <em>Declutter Your Space, Declutter Your
              Mind</em>, with <em>Wired This Way</em> and <em>Evolved</em> in editing. Her work is the
              spine of everything inside The Practice.
            </p>
            <p className="mt-6 font-serif text-xl italic text-teal-700">
              “You were not meant to carry all of this on your own.”
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-wash">
        <div className="container-e py-20 text-center">
          <h2 className="mx-auto max-w-2xl font-serif text-3xl text-ink sm:text-4xl">
            Start with what feels manageable.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            One minute today is enough. Pick up wherever you are. The rest can connect itself over time.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#pricing" className="btn-primary">Start The Practice</a>
            <Link href="/dashboard" className="btn-secondary">Look inside first</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
