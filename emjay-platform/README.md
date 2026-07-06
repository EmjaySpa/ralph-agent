# The Emjay Platform — MVP

> _"We're not building another wellness app. We're building the place where a woman's whole story finally connects."_

The first version of a long-term digital wellbeing platform for **Emjay
Wellness** (Belinda "Bel" Evans). It connects a woman's nervous system, skin,
sleep, stress, menopause, emotions, relationships, identity, journalling,
treatments and books into one private place, and surfaces plain-language
patterns over time. The advantage is not tracking or clever technology. It is
**context**: the whole picture, in one place, over time.

**This is an MVP demo built with mock/local data only.** No real auth, no real
payments, no real AI, no database, no real health data stored. Every integration
is left as a clear `TODO`. **This build has not been legally or clinically
reviewed** (see the compliance roadmap).

---

## ⚠️ Live URL

I could **not** deploy a live URL autonomously: the automation token in this
session is scoped to a single existing repo and cannot create a new repo or
enable hosting. Per the brief, I built this as a **self-contained project on a
clean branch** (`claude/emjay-platform`, off `main`), in its own `emjay-platform/`
folder, so it lifts into a new `emjay-platform` repo and deploys in a couple of
minutes. See [Repo migration](#repo-migration) and [Deploying](#deploying).

Screens, captured from the running build, live in
[`docs/screenshots/`](docs/screenshots). Run it locally in under a minute:

```bash
cd emjay-platform
npm install
npm run dev        # http://localhost:3000
```

---

## Build summary

A **Next.js 14 (App Router) + TypeScript + Tailwind** app, static-export ready,
zero runtime dependencies beyond React. Two parts: a marketing site and a
pretend-logged-in demo platform. Trauma-informed throughout: no streaks, no
guilt, no countdown timers, no confetti, no urgent red, motion honours
`prefers-reduced-motion`. Australian English, no em dashes.

### Screens included

**Marketing**
- Landing page: north star, how it works, Life Vault, Companion, six-module path, books, privacy-as-a-feature, pricing, about Bel, calm crisis note in the footer.

**Demo platform** (`/dashboard`)
- **Today** — calm welcome (no streaks), check-in prompt, two-week trends, a demo insight, module position, Life Vault preview, Companion prompt.
- **Check-in** — sleep, mood, energy, stress, skin, body sensation, menopause symptoms, cycle status, free-text. Short and low-friction.
- **Journal** — the required prompts, including "Roles We Play", "Skin Deep", "What does my body need today?", "What am I carrying that is not mine?", and "Where have I been saying I'm fine when I'm actually cooked?".
- **Patterns** — clearly-labelled "Demo insight" cards.
- **Modules** — the six-module progression with gentle, gradual unlocking.
- **Library** — meditations, breathwork, somatic practices, book modules, worksheets, emergency toolkit, skin and nervous system education, menopause support, ADHD-friendly resources, plus a books shelf.
- **Companion** — a mock chat with the boundaries statement, starters, an example conversation, and end-of-chat memory choices.
- **Life Vault** — all vault sections, a timeline, treatment history, and data controls (export, delete, review Companion access).
- **Privacy** — what is saved vs temporary, Companion memory status, an activity/audit log, and user controls.

---

## How to run locally

```bash
cd emjay-platform
npm install
npm run dev          # http://localhost:3000
# or a production static build:
npm run build        # outputs to ./out
npx serve out
```

## Tech stack

Next.js 14 · TypeScript · Tailwind CSS · static export (`output: 'export'`).
Fonts (Playfair Display + Montserrat) self-hosted via `next/font`. Screenshots
captured with the pre-installed Chromium.

## Folder structure

```
emjay-platform/
  src/
    app/
      layout.tsx, globals.css, page.tsx        # root + landing
      dashboard/
        layout.tsx, page.tsx                   # shell + Today
        check-in/  journal/  insights/  modules/
        library/  companion/  vault/  privacy/
    components/    # Logo, SiteHeader/Footer, DashboardShell, Offers,
                   # ModuleTimeline, Sparkline, CrisisNote
    lib/
      brand.ts     # naming, offers, modules, nav, Companion, support, books
      mock-data.ts # check-ins, journal, insights, library, vault, audit log,
                   # Companion script  (ALL MOCK)
  .github/workflows/deploy-pages.yml
  docs/screenshots/
```

---

## Product naming decision

The recurring $79/month product is named **"The Practice."** The word
**"membership" is deliberately avoided everywhere** (nav, landing, pricing,
dashboard).

**Reasoning.** For overwhelmed women in midlife, "membership" reads like a
gym-style obligation, another thing to keep up with and feel behind on, which is
the exact pressure this brand removes. In somatic and nervous system work, a
_practice_ is inherently forgiving and self-paced, which matches the
trauma-informed rule of "no catching up required." It is human, clear,
commercial and grown-up, and it avoids sounding like a homewares line, a
corporate program, or a culty wellness brand.

- **"Companion"** was ruled out as the product name because it names the AI
  feature (the Emjay Companion). Using it twice would confuse.
- **Runners-up:** "The Studio" (strong and commercial, but leans toward
  classes/content and could clash with the physical studio) and "Reset" (implies
  a one-off, not an ongoing monthly product). If a community feature is added
  later, "The Circle" would be the natural name for that layer.

## Pricing decision

Only the three current offers, all AUD:

| Offer | Price | Notes |
| --- | --- | --- |
| **The Practice** | **$79 AUD per month** | Month-to-month recurring digital product (the platform itself). |
| **"I'm at my limit" session** | **From $180 AUD** | 60 min $180 · 90 min $270 · 120 min $360. Online or in person; online emphasised. |
| **Nervous System Recalibration** | **$1,500 AUD** | Online or in person; online emphasised. |

"$79 AUD per month" is written in full, not only as "$79/mo". Sessions and the
package show online and in-person availability, with **online positioned as the
easiest starting point**, reflecting the online-first strategy.

**Deliberately excluded** (per the brief): Sacred Reset, the old $27/$97/$750
tiers, Tinana retreats as bookable, and any speaking/keynote/podcast revenue.
Tinana is not mentioned; it may only appear as paused/future roadmap if ever
needed.

## Customer journey

Kept deliberately simple, matching Bel's "easy to navigate" reputation:

1. She lands and immediately gets it: "this connects my body, stress, skin,
   hormones and life."
2. She sees **The Practice, $79 AUD per month**, framed with no pressure.
3. She can start gently, or just look inside.
4. She enters the demo dashboard and is welcomed, not chased.
5. She does a quick check-in.
6. She sees a simple pattern insight.
7. She explores journal prompts.
8. She sees her Life Vault.
9. She understands she controls what is saved.
10. She sees online support options if she needs a real person.

---

## Safety and clinical boundaries

- A **calm, visible support note** appears in the footer and the Companion. It
  is soft teal, not alarming: it gives the 000 message plus Lifeline, Beyond
  Blue, 1800RESPECT and "your GP" as placeholders. Numbers/links are marked
  `TODO(clinical)` for confirmation and final review.
- The **Companion** states plainly that it is guided by the Emjay framework, is
  not Bel, and is not a therapist, doctor or crisis support. It must never
  diagnose, prescribe, give medical/legal/financial advice, interpret
  pathology, tell anyone to stop medication, determine risk, make certainty
  claims, or replace therapy or crisis support. It can help reflect, organise
  thoughts, notice patterns, prepare questions for a provider, and point to
  resources.
- This is **not medical advice** and the MVP is **not clinically reviewed**.

## Privacy architecture notes

Privacy is presented as a **feature, not fine print**.

- **Default: temporary.** Companion chats are not saved unless the user chooses
  to save them. The UI never implies secret, total memory. Language used
  throughout: _"Your story belongs to you."_
- **User-approved saves.** At the end of a Companion chat the user picks: save
  nothing, save full transcript, save key insights only, save as journal entry,
  add to timeline, add to goals, or delete.
- **Visible control.** The Privacy screen shows what is saved vs temporary, the
  Companion's memory status, and a plain **activity/audit log** (e.g. "Companion
  accessed your saved insights to answer your question", "You saved a journal
  entry", "You deleted a saved insight"). Export and delete controls are
  everywhere they should be.

### Life Vault

The **Life Vault** is the user-owned home for anything they choose to keep: My
Story, My Journal, My Check-ins, My Body, My Skin, My Timeline, My Saved
Insights, My Resources, My Treatments, My Books, and My Companion Memories. In
this MVP it is mock UI only. In production it would be the user's private,
Emjay-controlled storage, with export and deletion as first-class actions.

### Companion memory model

Temporary by default. Nothing persists unless the user saves it. Saved items
become part of the Life Vault and are the only things the Companion can later
draw on, and every access is written to the audit log. No hidden memory, no
dependence-by-design.

---

## Future technical architecture (recommended for production)

- **Frontend:** Next.js on Vercel.
- **Database:** Supabase PostgreSQL.
- **Auth:** Supabase Auth (Google, Apple, email). **Google login is
  authentication only.** It does not mean Google holds the user's journals or
  health information. Saved data lives in **Emjay-controlled secure storage**,
  not in the user's Google account.
- **File storage:** Supabase Storage (skin photos, PDFs, voice notes,
  transcripts).
- **AI:** server-side OpenAI or Anthropic integration, added later, behind the
  privacy model above (never client-side, never with un-consented health data).
- **Payments:** Stripe (The Practice subscription), later.
- **Appointments:** Square (sessions and Recalibration), later.
- **Email:** MailerLite, later.

## Privacy and compliance roadmap

**Not yet done. Required before any production launch handling real data.** This
MVP is **not legally reviewed** and makes **no claim of compliance.** Review
against, at least:

- Australian Privacy Act 1988 and the Australian Privacy Principles
- Health information and sensitive information obligations
- Notifiable Data Breaches scheme
- Australian Consumer Law
- TGA advertising considerations (if any therapeutic claims)
- AHPRA advertising guidance (if relevant to the practitioner)
- Spam Act (email/marketing consent)
- Accessibility and WCAG conformance
- Terms of Service, Privacy Policy, and a Consent framework
- Data retention, deletion and export policies
- Incident response plan
- Privacy Impact Assessment
- Cybersecurity review
- Full legal review before launch

---

## Known limitations

- **Mock only:** no auth, no database, no payments, no AI, no media. State is
  in-memory and resets on refresh.
- **Insights are hand-written** illustrations labelled "Demo insight". The real
  pattern engine is the core differentiator and is not built.
- **Audit log, vault counts, treatments, timeline** are sample data.
- **Support numbers** are placeholders pending clinical/legal confirmation.
- Not clinically or legally reviewed.

## Assumptions

- Token cannot create a repo, so the deliverable is a clean branch + folder (see
  migration). Product name chosen as "The Practice" (documented above).
- "I'm at my limit" session tiers are 60/90/120 min at $180/$270/$360 AUD as
  provided.
- Books included: Unwritten, Declutter Your Space Declutter Your Mind, Wired
  This Way, Evolved, plus "future short guides"; the library is structured so new
  titles drop in without a rebuild.
- Consumer-facing brand is "Emjay"; the subscription is "The Practice".

## Open questions

1. Happy with **"The Practice"** as the product name, and dropping "membership"?
2. Confirm the crisis support numbers/links you want shown.
3. How prominent should the **skin/spa** side be inside the platform vs the
   nervous-system side? This MVP leans nervous-system.
4. Do you want a **community/circle** layer on the roadmap? It changes naming and
   scope.
5. Session prices confirmed as $180/$270/$360, and Recalibration at $1,500?

## Next steps (for Bel to review, in order)

1. Skim the screenshots, then run it locally and click through the dashboard,
   especially **Companion**, **Life Vault** and **Privacy**.
2. Give it its own repo and a live URL (below).
3. Answer the five open questions so copy and pricing can be tightened.
4. Prioritise the **pattern/insight engine** and the **privacy model** as the
   first real builds, since they are the product's spine.
5. Line up the production stack (Supabase, Stripe, Square, MailerLite) and begin
   the compliance roadmap **before** any real data is collected.

---

## Deploying

Static export, so it hosts anywhere.

**Easiest live URL — Vercel:** import the repo, accept defaults, deploy.

**GitHub Pages:** a workflow is included at
`.github/workflows/deploy-pages.yml`. Enable Pages (Settings -> Pages -> Source:
GitHub Actions). It sets `NEXT_PUBLIC_BASE_PATH` to the repo name automatically.

**No host:** `npm run build` then `npx serve out`.

## Repo migration

This was built on branch `claude/emjay-platform` inside the `ralph-agent` repo,
in the self-contained `emjay-platform/` folder, because the session token could
not create a new repo. To move it into its own `emjay-platform` repo:

```bash
# from a checkout of this branch
cp -r emjay-platform ~/emjay-platform && cd ~/emjay-platform
git init && git add . && git commit -m "Initial commit: Emjay Platform MVP"
# create an empty repo named emjay-platform on GitHub, then:
git remote add origin https://github.com/<you>/emjay-platform.git
git branch -M main
git push -u origin main
```

Nothing outside the `emjay-platform/` folder is needed. The old
`claude/emjay-wellness-app-mvp-9uuks8` branch from the earlier session is
unrelated and was intentionally not used.

---

_Built as an MVP. Assumptions and placeholders are documented so nothing here is
mistaken for finished, real, or reviewed._
