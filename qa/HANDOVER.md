# Emjay QA suite — handover

Written so this QA system stays usable by anyone, with **no Claude subscription,
no AI tooling, and no access to the people who built it**. It is a plain
Node.js program. Everything it asserts is in two files you can read and edit.

---

## 1. What this is

An independent, read-only regression suite for **emjaywellness.com.au**. You run
it, it crawls the public site, and it prints a PASS / WARNING / FAIL report. It
is the gate used to decide whether the site can be declared GREEN.

It never changes the website. It cannot: the HTTP layer refuses any method other
than `GET` and `HEAD`, the browser pass only navigates and reads styles, and no
form is ever submitted. Three self-tests assert exactly that.

---

## 2. Running it

**Requirements:** Node 20 or newer. Nothing else.

```bash
cd qa
npm install
npx playwright install chromium     # one-off, for the browser checks

npm run selftest                    # verify the suite itself — expect 157/157 passing
node src/index.mjs --fail-on never  # run against production
```

Reports are written to `qa/report/`:

| File | Use |
|---|---|
| `qa-report.md` | The readable report. Start here. |
| `qa-report.html` | Same, formatted, openable in a browser. |
| `qa-report.json` | Machine-readable, for diffing runs. |

**Always run `npm run selftest` first.** If it fails, do not trust the report —
the suite itself is broken, and the site may be fine.

Common variations:

```bash
node src/index.mjs                          # normal run, exits 1 if anything FAILs
node src/index.mjs --no-render              # skip the browser (faster, less coverage)
node src/index.mjs --max-pages 20           # quick smoke test
node src/index.mjs --only contrast,headings # run specific checks
node src/index.mjs --base-url https://staging.example.com
npm run demo                                # run against a built-in fake site, never touches production
```

Exit codes: `0` clean, `1` threshold breached, `2` **the site could not be
crawled** — that last one means no report was produced. It never reports PASS
from an empty crawl.

### Running it from GitHub instead

`.github/workflows/emjay-qa.yml` runs it weekly and on demand. Actions →
"Emjay QA" → Run workflow. Reports upload as artifacts and appear in the job
summary. The live-site job never runs on push, because a red build should mean
"the code is broken", not "the website has a defect".

---

## 3. Reading the report

Three severities:

- **FAIL** — a defect. Blocks GREEN.
- **WARNING** — needs a human decision. Does not block automatically.
- **INFO** — inventory and context. Not a defect.

**Counts are distinct defects, not occurrences.** A single bad setting in a
shared theme template appears on every page; the report collapses those into one
finding that says "on 206 pages". The underlying occurrence count is in
`rawFindingCount` in the JSON.

The **known-defect register** at the bottom is the important part. Every defect
ever confirmed on this site has an entry, and each prints one line:

| Result | Meaning |
|---|---|
| `PASS` | The defect is not present. |
| `FAIL` | It is present. |
| `NOT VERIFIED` | The check could not run. **Treat as unproven, not fixed.** |

A FAIL line reads either **STILL PRESENT** (never fixed, or first detection) or
**REGRESSED** (was fixed, has come back). It only says REGRESSED once a `fixedOn`
date is recorded in the register — so "regressed" always means what it says.

---

## 4. The two files you edit

Everything the suite asserts comes from these. No other file needs touching for
normal maintenance.

### `emjay-qa.config.mjs` — the rules

Plain JavaScript, heavily commented. The parts you are most likely to change:

| Setting | What it controls |
|---|---|
| `brand.colours.approved` | The approved palette |
| `brand.colours.banned` | Colours that must never reappear |
| `brand.colours.unapprovedSeverity` | `'WARN'` now; set `'FAIL'` when colour work is signed off |
| `brand.fonts.approved` | Approved typefaces |
| `brand.fonts.unapprovedSeverity` | `'WARN'` now; set `'FAIL'` when the font migration is authorised |
| `content.pricing` | Current, superseded and time-limited prices |
| `content.legacyReferences` | Wording that must not appear |
| `content.legalPagePatterns` | Pages whose clauses are protected from the above |
| `content.business.activeLocations` | Cleveland, Tinana, Maryborough |
| `thresholds` | Every numeric limit, each with a comment explaining it |
| `report.failOn` | `'fail'`, `'warn'`, or `'never'` |

### `known-defects.json` — the register

One entry per confirmed defect. Add one whenever a defect is found:

```json
{
  "id": "EMJ-036",
  "title": "Short description",
  "status": "confirmed",
  "severity": "FAIL",
  "scope": "site",
  "source": "where it was found",
  "openSince": "2026-08-16",
  "assert": { "type": "text-absent", "pattern": "some text", "flags": "i" }
}
```

**Three rules that keep the register honest:**

1. **Never delete an entry after a defect is fixed.** The entry staying is what
   stops the defect returning unnoticed.
2. **Record `fixedOn` when a fix is verified.** After that, a reappearance is
   correctly reported as a regression rather than an ongoing defect.
3. **When a defect turns out to rest on a wrong premise, reverse it — do not
   delete it.** `EMJ-006` is the worked example: it once asserted Cleveland must
   be absent, and now asserts it must be present.

Assertion types available:

| Type | Asserts |
|---|---|
| `text-absent` | Wording does not appear (`excludePaths: "legal"` skips legal pages) |
| `text-present` | Wording still appears — used to protect clauses |
| `source-absent` | A pattern is absent from HTML/CSS source |
| `colour-absent` | A colour is not rendered |
| `css-pair-absent` | A foreground/background pairing never renders |
| `price-accuracy` | Delegates to the pricing check |
| `url-status` | A URL returns an expected status and hop count |
| `external-url-ok` | An off-site link resolves |
| `robots-not-blocking-all` | robots.txt does not block the site |
| Delegating types | `no-console-errors`, `no-broken-links`, `unique-titles`, `no-missing-alt`, `no-orphans`, `forms-valid`, `h1-count`, `self-canonical`, `no-mobile-overflow`, `no-mixed-content`, and others — each reuses an existing check |

### `square-service-map.json` — booking deep-links

Data only. Paste each service's Square booking URL fragment into
`expectedBookingPattern`. No code changes needed.

---

## 5. Decisions currently baked in

Confirmed August 2026. Each is a line of config, changeable without touching code.

**Colour palette — enforced.** Approved: `#609E9F`, `#5F9DA0`, `#87B5B6`,
`#DBE8E9`, `#B1CFCF`, plus accessibility variants `#426E70` (text on pale
backgrounds only) and `#457F81` (text on white), the button label colour
`#1C2224`, and the dark panel surface `#32373C`. Banned at FAIL: `#2F6569`,
`#5A9A94`, `#2EA3F2`, `#D63637`.

**Typefaces — enforced, migration PARKED.** Poppins, Montserrat, Playfair
Display, Playlist Script, Arial/Helvetica. The site has not been migrated, so an
unapproved font is a **WARNING** and does not block GREEN. When the migration is
authorised, change `brand.fonts.unapprovedSeverity` to `'FAIL'`. That is the
whole change.

**Cleveland is ACTIVE.** In-person at Cleveland QLD plus online Australia-wide.
Anything stating a June 2026 closure is obsolete.

**Pricing — Square is the source of truth.** 60 min in person $180; 60 min online
$140 promotional until 31 Aug 2026, then $180; 90 min $270; 2 hr $360. The suite
asserts *absence* only: superseded prices must not appear, and the $140
promotional price becomes a FAIL automatically the day after it expires. **No
edit is needed on the expiry date.**

**Retreat and gift certificate clauses on the legal pages must stay.** Retreats
have not been ruled out; gift products are dormant, not deleted. Two register
entries, `RETREAT-CLAUSES-PRESENT` and `GIFT-CLAUSES-PRESENT`, **fail if those
clauses are removed**. The gift-certificate defect check excludes legal pages so
it never pressures anyone to strip them.

**Contrast uses WCAG 2.1 AA.** 4.5:1 normal text, 3:1 large text. Large text is
24px at any weight, or 18.66px at **weight 700 or heavier**. Semibold (600) is
not bold: 21px/600 correctly takes the 4.5:1 threshold. This is the most
misread rule in contrast auditing, because 21px "looks like" large text.
`thresholds.boldWeightThreshold` exists if you ever decide otherwise, but
lowering it will let real AA failures pass.

---

## 6. Declaring GREEN

All four, in one run:

1. `node src/index.mjs` exits `0` with **zero FAIL** findings.
2. Every register entry reports **PASS**. A `NOT VERIFIED` blocks GREEN — it
   means the check could not run, not that it passed.
3. The Square booking deep-links are filled in.
4. Remaining WARNINGs have each been reviewed and consciously accepted.

Font remediation is **deliberately out of scope** for this GREEN. Unapproved
typefaces are expected and report as WARNING by design.

After GREEN: set CI to `--fail-on warn`, raise
`brand.colours.unapprovedSeverity` to `'FAIL'`, and authorise the font migration
by raising `brand.fonts.unapprovedSeverity` to `'FAIL'`.

---

## 7. Still outstanding

1. **Square booking deep-links** — `square-service-map.json`. Until filled, the
   suite flags a generic-only CTA but cannot assert the right destination.
2. **`content.retiredUrls`** — extend from Search Console's Pages report.
3. **`content.business`** — phone, email, street address, postcode are `null`.
4. **Performance needs one honest measurement.** CI measured TTFB at 8.5–11.7s
   from a US runner after a 208-page crawl; a source-only check from elsewhere
   measured 0.9–1.1s. Both agree on direction (the homepage is heavy, the
   largest images are unoptimised) but the absolute number is not trustworthy
   from either. Re-measure once from Australia on a throttled mobile connection
   before acting on a figure.

---

## 8. When a CI run goes red

A red X on the "Emjay QA" workflow has **two completely different meanings**,
and the GitHub UI and notification emails show them identically. Open the run
and read the **Verdict** section at the top of the job summary — it says which
one happened in plain words. You do not need to read the logs.

| Verdict | Meaning | What to do |
|---|---|---|
| **QA FAILED — live-site defects detected** | The suite ran fine and found defects. This is the tool working. | Read the report below the verdict, or download the `emjay-qa-report` artifact. Hand the defects to whoever does site remediation. Nothing is wrong with the QA system. |
| **QA COULD NOT RUN** | The site could not be crawled, so no verdict exists. | An availability or network problem, not a site-quality result. Check the site is up, then re-run. Never read this as a pass. |
| **QA ended unexpectedly** | Neither of the above. | Something in the tooling broke. Check the step log and `npm run selftest` locally. |

Two jobs run:

- **Suite self-tests** — checks the QA suite itself. If this is red, the suite
  is broken and the report cannot be trusted.
- **QA run** — audits the live site. Red here usually means the site has
  defects. It deliberately does not run on push, so an ordinary code change is
  never blocked by a website defect.

A run takes roughly 20 minutes against production (300-page crawl plus 40
rendered pages). The job is capped at 60 minutes so an unresponsive site cannot
hang it.

---

## 9. If something breaks

**`npm run selftest` fails.** The suite is broken, not the site. The failing
test names the check. Fixture site is `tests/fixture-site.mjs`.

**Exit code 2, "No HTML pages were retrieved".** The crawl could not reach the
site. Check the site is up and that your network allows outbound HTTPS to it.
This is deliberate: a suite that cannot see the site reports nothing rather than
a misleading PASS.

**"Could not launch Chromium".** Run `npx playwright install chromium`, or use
`--no-render` to skip the browser checks. Those checks then report WARNING
rather than passing silently.

**A finding looks wrong.** Findings carry the URL, the selector and the measured
value. Verify by hand first. If the suite is genuinely wrong, fix the check and
**add a test that pins it** — `tests/false-positives.test.mjs` collects the ones
already found and corrected this way.

---

## 10. Layout

```
qa/
  emjay-qa.config.mjs      all rules and thresholds
  known-defects.json       the regression register
  square-service-map.json  booking deep-links (data only)
  src/
    index.mjs              entry point and CLI
    http.mjs               read-only HTTP layer
    crawl.mjs              discovery: robots, sitemap, link graph
    parse.mjs              HTML to page model
    render.mjs             Playwright pass
    colour.mjs             contrast and palette maths
    report.mjs             report generation
    checks/                one file per family of checks
  tests/                   157 self-tests, including a deliberately broken fixture site
  scripts/demo.mjs         full run against the fixture, never touches production
```

Each check is self-contained: it receives the crawled site and returns findings.
Adding one means writing a file in `src/checks/` and listing it in
`src/index.mjs`.
