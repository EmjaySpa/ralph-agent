import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Offers } from "@/components/Offers";
import { StageTimeline } from "@/components/StageTimeline";
import { BRAND } from "@/lib/brand";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="bg-emjay-wash">
        <div className="container-emjay grid items-center gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div className="animate-fade-up">
            <span className="pill">For women in midlife · nervous-system health</span>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] text-ink sm:text-5xl md:text-6xl">
              Where your whole story{" "}
              <span className="italic text-eucalyptus-600">finally connects.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Your sleep, your skin, your mood, your cycle, the weeks you over-give and
              the flare that follows. They were never separate problems. Emjay is the
              private place they come together, so the pattern you have been living
              finally makes sense.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#offers" className="btn-primary">
                Begin the Reset · $79/mo
              </a>
              <Link href="/dashboard" className="btn-secondary">
                Look inside the demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              A monthly practice, at your pace. Cancel anytime. No app to feel behind on.
            </p>
          </div>

          {/* Breathing visual */}
          <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
            <span className="absolute inset-0 rounded-full bg-eucalyptus-200/40 animate-breathe" />
            <span className="absolute inset-8 rounded-full bg-eucalyptus-300/50 animate-breathe [animation-delay:-2s]" />
            <span className="absolute inset-16 rounded-full bg-blush-200/60 animate-breathe [animation-delay:-4s]" />
            <div className="relative z-10 rounded-2xl bg-white/80 px-6 py-5 text-center shadow-soft backdrop-blur">
              <p className="font-serif text-lg italic text-eucalyptus-700">Breathe in.</p>
              <p className="font-serif text-lg italic text-ink">Nothing to fix.</p>
              <p className="mt-1 text-xs text-ink-muted">You are already whole.</p>
            </div>
          </div>
        </div>
      </section>

      {/* NORTH STAR */}
      <section id="idea" className="border-y border-oat-200 bg-eucalyptus-700 text-oat-50">
        <div className="container-emjay py-16 text-center">
          <p className="mx-auto max-w-3xl font-serif text-2xl leading-relaxed sm:text-3xl">
            “{BRAND.northStar}”
          </p>
        </div>
      </section>

      {/* THE PROBLEM / THE IDEA */}
      <section className="bg-oat-50">
        <div className="container-emjay grid gap-12 py-20 md:grid-cols-2">
          <div>
            <span className="eyebrow">Why we built this</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
              You are not lazy, and you are not broken.
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              You are capable, self-aware, and tired. You have read the books and tried
              the trackers. But a sleep app cannot see your skin, a mood app cannot see
              your cycle, and none of them know the week you said yes when you meant no.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              The fix for this kind of tired is not more sleep. It is safety. And safety
              begins with your whole story being seen in one place, gently, over time.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Not a symptom tracker", "We do not reduce you to numbers. We look for the story the numbers are telling."],
              ["Not another meditation app", "Practices are here, but paced, and only when your system is ready for them."],
              ["Not a habit streak to fail", "Miss a week. Come back. Your nervous system is not a productivity project."],
              ["A both-and place", "Real physiology and honest reflection, held together without apology."],
            ].map(([t, d]) => (
              <div key={t} className="card">
                <h3 className="font-serif text-lg text-eucalyptus-700">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-oat-100/50">
        <div className="container-emjay py-20">
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
              Four quiet things, connected.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              A minute a day is enough. Emjay does the connecting in the background, so
              you can stop holding all of it in your head.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Check in", "Sleep, mood, skin, energy, stress, cycle and menopause symptoms. A slider, not a spreadsheet."],
              ["02", "Reflect", "Guided journaling like “Roles We Play” and “Skin Deep”, written in a voice that talks to you, not at you."],
              ["03", "See the pattern", "Plain-language insights across weeks and months. “Your skin tends to flare about three weeks after you have been over-committing.”"],
              ["04", "Practise, paced", "Nervous-system practices, breathwork and book modules that open as you go, in the order the work actually needs."],
            ].map(([n, t, d]) => (
              <div key={n} className="card flex flex-col">
                <span className="font-serif text-2xl text-blush-300">{n}</span>
                <h3 className="mt-2 font-serif text-lg text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE MODEL */}
      <section id="model" className="bg-oat-50">
        <div className="container-emjay grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="eyebrow">The Emjay model</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
              Six stages, paced like the work itself.
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Bel’s model moves the way trauma-informed work actually moves. Safety
              first. Deeper material only when your system can hold it. The app opens in
              the same order, so you are never asked to run before you can stand.
            </p>
            <div className="mt-6 rounded-2xl border border-eucalyptus-200 bg-eucalyptus-50 p-5">
              <p className="font-serif text-lg italic text-eucalyptus-700">
                {BRAND.destination}
              </p>
            </div>
          </div>
          <StageTimeline />
        </div>
      </section>

      {/* OFFERS */}
      <section id="offers" className="bg-oat-100/50">
        <div className="container-emjay py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Ways to begin</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
              Come in at the door that fits today.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              One accessible session for the hard days. A steady monthly practice. Or the
              deepest work, one-to-one. No tiers to decode, no pressure to climb them.
            </p>
          </div>
          <div className="mt-12">
            <Offers />
          </div>
        </div>
      </section>

      {/* ABOUT BEL */}
      <section id="about" className="bg-oat-50">
        <div className="container-emjay grid items-center gap-12 py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
            <span className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-eucalyptus-200 to-blush-200" />
            <span className="relative font-serif text-6xl italic text-eucalyptus-700">Bel</span>
          </div>
          <div>
            <span className="eyebrow">About Bel</span>
            <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
              Body-first support from someone who has been in the trenches.
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              {BRAND.founder} is a skin therapist and nervous-system practitioner who
              works where science and somatic reality meet. Her approach is both-and:
              honest about physiology, honest about what the body carries. No fluff, no
              toxic positivity.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              She is the author of{" "}
              <em>Unwritten — Releasing the Past, Reclaiming Yourself</em> and{" "}
              <em>Declutter Your Space, Declutter Your Mind</em>, with{" "}
              <em>Wired This Way</em>, on the late-diagnosed mind, on the way. Their
              chapters live inside the Reset as modules you can work through slowly.
            </p>
            <p className="mt-6 font-serif text-xl italic text-eucalyptus-700">
              “You were not meant to carry all of this alone.”
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-eucalyptus-700 text-oat-50">
        <div className="container-emjay py-20 text-center">
          <h2 className="mx-auto max-w-2xl font-serif text-3xl sm:text-4xl">
            {BRAND.strapline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-oat-100">
            Start with a single minute today. Let the rest connect itself.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#offers" className="btn bg-oat-50 text-eucalyptus-700 hover:bg-white">
              Begin the Reset
            </a>
            <Link
              href="/dashboard"
              className="btn border border-oat-200/50 text-oat-50 hover:bg-eucalyptus-600"
            >
              Look inside first
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
