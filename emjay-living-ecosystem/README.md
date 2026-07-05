# The Emjay Living Ecosystem — MVP demo

> _"We're not building another wellness app. We're building the place where a woman's whole story finally connects."_

A working MVP web app for **Emjay** (Belinda "Bel" Evans's wellness studio): a
private companion for women in midlife navigating nervous-system dysregulation,
menopause, skin and overwhelm. It connects daily check-ins, journaling,
treatment history and paced course content into one place, and surfaces
plain-language pattern insights over time.

**This is a demo built with mock/local data only.** Nothing takes payment,
stores real health information, or connects to real accounts. See
[_Not real yet / TODO before launch_](#not-real-yet--todo-before-launch).

---

## ⚠️ Live preview

I was **not able to deploy a live URL autonomously.** The automation token for
this session is scoped to a single existing repository and cannot create a new
repo or enable hosting. Rather than bolt this onto an unrelated repo, I built it
as a **self-contained project folder** ready to lift into its own repo and
deploy in about two minutes. See [_Deploying_](#deploying) — it is genuinely a
copy-paste job.

In the meantime, here is exactly what it looks like, captured from the running
app:

| Landing | Dashboard |
| --- | --- |
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |
| **Daily check-in** | **Journal** |
| ![Check-in](docs/screenshots/check-in.png) | ![Journal](docs/screenshots/journal.png) |
| **Pattern insights** | **Library** |
| ![Insights](docs/screenshots/insights.png) | ![Library](docs/screenshots/library.png) |

To run it yourself in under a minute:

```bash
cd emjay-living-ecosystem
npm install
npm run dev          # http://localhost:3000
```

---

## What I built

A **Next.js 14 + TypeScript + Tailwind** app (static-export ready), in two parts:

### 1. Marketing / landing page (`/`)
- The positioning and the North-star line, up top.
- **The problem**, in Bel's voice ("You are not lazy, and you are not broken").
- **How it works** — check in → reflect → see the pattern → practise, paced.
- **The Emjay model** — the real six-stage therapeutic model as a paced timeline.
- **Offers** — only the three corrected current offerings (below). No Tinana
  bookings, no old $27/$97/$750 tiers, no speaking.
- **About Bel** and her books.

### 2. Demo dashboard (`/dashboard`, pretend logged-in)
- **Today** — greeting, a two-week trend of each metric (SVG sparklines), the
  featured insight, where you are in the model, a suggested practice and recent
  journal snippets.
- **Check-in** (`/dashboard/check-in`) — an interactive flow: sliders for sleep,
  mood, energy, stress and skin; menopause symptom chips; a cycle selector; and
  a free-text note, ending on a calm confirmation.
- **Journal** (`/dashboard/journal`) — expandable prompts including **"Roles We
  Play"** and **"Skin Deep"**, plus "The Cost of Keeping the Peace" and
  "Receiving Is Harder Than Giving".
- **Insights** (`/dashboard/insights`) — a mock pattern-insights panel with a
  few **clearly-labelled, fabricated** illustrative insights (e.g. "your skin
  tends to flare about three weeks after a stretch of over-committing").
- **Library** (`/dashboard/library`) — a placeholder resource library
  (meditations, breathwork, book modules) with items that "open" as you move
  through the model.

---

## Key decision: we do **not** call it a "membership"

The brief asked me to decide whether "membership" hurts marketability for the
$79/month AUD recurring product, and to apply the choice consistently.

**Decision: drop "membership." Frame the recurring product as a _practice_ you
keep, and a _companion_ that sits alongside you.**

The recurring product is named **"The Nervous System Reset"**, priced at
**$79/month AUD**, described as _"a monthly practice, cancel anytime"_.

**Why:**
- The audience is overwhelmed women in midlife. "Membership" carries a
  gym-style, keep-up-or-fall-behind weight — another obligation, another reason
  to feel like they are failing. That raises churn-guilt, which is exactly the
  wrong pressure for a nervous-system product.
- The brand voice is permission-based and no-pressure ("miss a week, come
  back"). "A practice you keep at your pace" fits that; "membership" fights it.
- "Companion" is also literally what the product _is_ — a private companion that
  connects your whole story — so it differentiates from "another wellness
  membership" rather than sounding like one.
- I considered **circle / collective** (community framings). They can lower
  churn through belonging, but they promise a group experience this MVP does not
  yet deliver, and "showing up socially" is its own pressure for this audience.
  If real community features are added later, **"The Emjay Circle"** is the
  natural upgrade name — noted as a future option.

The word "membership" appears nowhere in the nav, copy or pricing. It is
referenced once, deliberately, in a reassuring line: _"No 'membership' to keep
up with."_

---

## The three current offerings (corrected)

All figures are AUD and grounded in the brief. Prices marked _indicative_ are my
placeholders where the brief did not fix a number — confirm before publishing.

| Offering | Price | What it is |
| --- | --- | --- |
| **The Nervous System Reset** | **$79 / month** | The recurring digital product — the app itself. A monthly practice, cancel anytime. |
| **"I'm at my limit" session** | **$110** _(indicative)_ | One accessible, lower-cost 90-minute session for acute overwhelm. |
| **Nervous System Recalibration** | **$1,500** | The premium 6-week one-to-one package. |

**Deliberately excluded**, per the brief's corrections:
- ❌ Tinana retreats as bookable (paused; property is being tenanted). Not
  mentioned at all.
- ❌ The old three-tier pricing ($27 Sacred Reset / $97 Group Support / $750
  VIP).
- ❌ Speaking engagements, keynotes, conferences, podcasts as a revenue stream.
- ❌ The name "Sacred Reset" (renamed to "Nervous System Reset" everywhere).

---

## The six-stage model

Sourced from Emjay's own brand document (found in Drive), the app's modules open
in the order the therapeutic work actually moves — safety first:

1. **The Body Starts Speaking** → _Nervous System Foundations_
2. **Pattern Recognition** → _Breathwork & Regulation_
3. **Identity Roles** → _Emotional Resourcing_
4. **Rewiring Safety & Receiving** → _Boundaries & Receiving_
5. **Integration** → _Relationships_
6. **Living From Self-Trust** → _Money & Agency_

This maps the brief's "progressively opens deeper modules (nervous system
foundations, breathwork, emotional resourcing, boundaries, relationships,
money)" onto Bel's actual framework, so the progression is authentic rather than
invented. Destination line used throughout: _"Safety is the precondition.
Clarity is the mechanism. Agency is the outcome."_

---

## Design & brand voice

- **Palette:** anchored on Emjay's **real eucalyptus-teal** brand colour
  (`#609E9F`, from the brand document), warmed with a soft oat/cream ground and
  a dusty-rose accent so it reads calm _and warm_ — feminine but not twee.
- **Type:** Emjay's real pairing — **Playfair Display** (display/serif) +
  **Montserrat** (body), self-hosted via `next/font`.
- **Motion:** a slow "breathing" orb motif recurs as the calm/regulated symbol;
  all motion respects `prefers-reduced-motion`.
- **Voice:** grounded, warm-but-direct, de-shaming, woman-to-woman, Australian
  English. I kept out the words Emjay's brand bible avoids (transformation,
  journey, unlock, resilience, manifest, etc.) in the copy I wrote. The
  North-star line is used verbatim as supplied.

I read Emjay's brand material from Google Drive to get this right — the brand
document, the "Emjay Offer Review", the six-stage model, and Bel's blogs — so
the tone and framework are hers, not generic wellness copy.

---

## Not real yet / TODO before launch

Everything below is intentionally mocked. Search the code for `TODO` for the
exact spots.

- **Payments** — the offer buttons do nothing. Wire to Stripe Checkout (or your
  booking tool) once your account and price IDs exist. _Needs your credentials._
- **Auth** — the dashboard is a static "pretend logged-in" state. No login, no
  users. Add a real auth provider before storing anything personal.
- **Data persistence** — check-ins and journal entries live in React state and
  vanish on refresh. Add a real per-user datastore.
- **The insight engine** — the pattern insights are **hand-written examples**,
  clearly labelled as illustrative. The real "connect the story" engine is the
  heart of the product and is not built here.
- **Resource media** — the library is a placeholder; no audio/video is wired up.
- **Health-data handling** — before touching real symptom/menopause/cycle data,
  get privacy, consent and (AU) health-records handling right. Not medical
  advice; add appropriate disclaimers.
- **Prices marked _indicative_** — confirm the "I'm at my limit" session price.

---

## Open questions for you

1. **"I'm at my limit" price** — I used $110 as a placeholder. What is it really?
2. **Naming** — happy with **"The Nervous System Reset"** as the product name and
   the no-"membership" framing? (Alternative for later: "The Emjay Circle" if you
   add community.)
3. **Six-stage module names** — I mapped breathwork/boundaries/etc. onto your six
   stages. Do the module titles feel right, or would you rename any?
4. **Skin/Spa vs Wellness** — this MVP leans into Emjay _Wellness_ (nervous
   system). How much should the skin/facial side show up in the app?
5. **Community** — is a private circle/community something you want on the
   roadmap? It changes the naming and the product shape.

---

## Suggested next steps (in the morning)

1. Skim the six screenshots above, then run it locally (`npm install && npm run
   dev`) and click through the dashboard.
2. Give it its own repo + deploy (see below) so you have a shareable link.
3. Answer the five open questions so I can tighten the copy and pricing.
4. Prioritise the **insight engine** — it is the actual differentiator. Worth
   scoping what "connect the story" means with real data first.
5. Decide the payments/auth stack so the mocked buttons can become real.

---

## Deploying

The app is a **static export** (`output: 'export'`), so it hosts anywhere.

**Give it its own repo first (recommended):**

```bash
cp -r emjay-living-ecosystem ~/emjay-living-ecosystem && cd ~/emjay-living-ecosystem
git init && git add . && git commit -m "Initial commit: Emjay Living Ecosystem MVP"
# create an empty repo named emjay-living-ecosystem on GitHub, then:
git remote add origin https://github.com/<you>/emjay-living-ecosystem.git
git push -u origin main
```

**Then, the easiest live URL — Vercel:** import the repo at vercel.com, accept
the defaults, deploy. Done.

**Or GitHub Pages:** a ready-to-go workflow is included at
`.github/workflows/deploy-pages.yml`. Enable Pages (Settings → Pages → Source:
GitHub Actions). Because Pages serves from a sub-path, the workflow sets
`NEXT_PUBLIC_BASE_PATH` for you.

**Or no host at all:** `npm run build` then `npx serve out`.

---

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · static export · zero
runtime dependencies beyond React. Screenshots captured with the pre-installed
Chromium.

_Built as an overnight MVP. Assumptions and placeholders are documented above so
nothing here is mistaken for finished or real._
