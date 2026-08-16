# Emjay Wellness — automated QA regression suite

Independent technical QA for **emjaywellness.com.au**. Built to be re-run after
each round of remediation, and to be the gate that decides whether the site can
be declared GREEN.

## Read-only guarantee

This suite never modifies the live site.

- Only `GET` and `HEAD` requests are ever issued. `src/http.mjs` refuses any
  other method at the source level, and a self-test asserts that refusal.
- The browser pass navigates and reads computed styles. It does not click,
  type, or submit. `forms.allowSubmit` exists in the config and must stay
  `false`; forms are validated structurally only.
- Nothing is authenticated, and no cookies or storage state are persisted.
- It does not touch WordPress, copy, SEO settings, or design.

## Install

```bash
cd qa
npm install
npx playwright install chromium   # only if the machine has no browser yet
```

Node 20+ required.

## Run

```bash
npm run qa                 # full suite: crawl + browser pass
npm run qa:static          # no browser (HTTP/HTML checks only)
npm run qa:smoke           # quick 15-page pass
npm run selftest           # verify the suite itself against the fixture site
npm run demo               # run the whole suite against the built-in defective fixture
```

Useful flags:

| Flag | Purpose |
|---|---|
| `--base-url <url>` | Point at staging instead of production |
| `--max-pages <n>` | Cap the crawl |
| `--render-limit <n>` | Cap how many pages get the browser pass (default 40) |
| `--no-render` | Skip the browser entirely |
| `--only <ids>` / `--skip <ids>` | Run a subset, e.g. `--only brand-colours,contrast` |
| `--fail-on fail\|warn\|never` | Exit-code threshold |
| `--out <dir>` | Report directory |

Reports land in `report/` as `qa-report.md`, `qa-report.json` and
`qa-report.html`. Exit code is `1` when the threshold is breached, `2` if the
site could not be crawled at all.

**A run that cannot reach the site exits `2` and reports nothing.** It never
reports PASS from an empty crawl.

## What is checked

Every item in the QA brief maps to a check id:

| Brief item | Check id | Notes |
|---|---|---|
| Broken links, HTTP errors | `broken-links` | Internal pages + every external target |
| Redirect chains | `redirect-chains` | Hop count, 302-vs-301, http/www canonicalisation |
| Internal links to redirects | `internal-redirect-links` | |
| H1/H2 structure | `headings` | Count, order, skipped levels |
| Empty headings | `headings` | Ignores headings named by an image's alt |
| Missing/duplicate titles | `titles` | Plus length bounds |
| Missing/duplicate meta descriptions | `meta-descriptions` | |
| Canonicals | `canonicals` | Self-reference, cross-canonical, canonical-to-noindex |
| Index/noindex conflicts | `indexability` | Meta vs header vs sitemap vs robots.txt |
| Sitemap issues | `sitemap` | Reachability, redirects, noindex entries, missing pages, lastmod |
| Schema / structured data | `structured-data` | JSON parse, required props per type, placeholder values, dates |
| Rogue `#2EA3F2` and other colours | `brand-colours` | Raw source **and** computed styles, with perceptual matching |
| Unapproved fonts | `brand-fonts` | Computed `font-family` on rendered text |
| Contrast (where measurable) | `contrast` | WCAG 2.1 AA; text on images is reported as unmeasurable |
| Missing alt text | `alt-text` | Distinguishes decorative `alt=""` from missing |
| Console errors | `console-errors` | Console, uncaught errors, failed requests, 4xx/5xx subresources |
| Forms | `forms` | Labels, submit control, method, action host, `type="email"` |
| Old/retired URLs | `retired-urls` | Asserts redirect / gone / unlinked per entry |
| Old business & location references | `legacy-references` | Cleveland, retired offers, and more |
| Generic booking links | `booking-intent` | Service pages that only offer a generic CTA |
| Mobile overflow | `mobile-overflow` | 390px viewport, names the offending elements |
| Page performance | `performance` | LCP, CLS, TTFB, weight, request count, oversized images |
| Duplicate / thin pages | `duplicate-thin` | Word count + 5-word-shingle Jaccard similarity |
| Orphan pages | `orphan-pages` | Zero internal inbound links |
| Internal linking problems | `internal-linking` | Click depth, nofollow, non-canonical origins, anchor spread |
| Known defects | `known-defects` | See below |
| (extra) Mixed content | `mixed-content` | Insecure subresources on https pages |
| (extra) Placeholder / error text | `placeholder-content` | Lorem ipsum, shortcodes, PHP notices |
| (extra) Link accessible names | `link-text` | "Click here", unnamed links |
| (extra) Lang / viewport | `document-semantics` | |
| (extra) Broken anchors | `broken-anchors` | `#fragment` with no target |

## Known-defect regressions

`known-defects.json` is the registry. Every defect ever confirmed on this site
gets an entry, and each entry produces an explicit `PASS` / `FAIL` /
`NOT VERIFIED` line in the report.

Rules:

- **Never delete an entry after the defect is fixed.** A fixed defect that stays
  in the registry is exactly what stops it returning silently.
- An assertion that could not run reports **NOT VERIFIED**, never PASS. An
  unverifiable defect is unproven, not fixed.
- Entries with `"status": "unconfirmed"` are held: they report INFO instead of
  contributing a verdict, until a human confirms the defect is real.

Adding one:

```json
{
  "id": "EMJ-031",
  "title": "Short description of the defect",
  "status": "confirmed",
  "severity": "FAIL",
  "scope": "site",
  "source": "where it was found",
  "assert": { "type": "text-absent", "pattern": "some regex", "flags": "i" }
}
```

Assertion types: `colour-absent`, `source-absent`, `text-absent`, `url-status`,
`external-url-ok`, `robots-not-blocking-all`, `robots-source-absent`, plus
delegating types that reuse an existing check (`no-console-errors`,
`no-mobile-overflow`, `no-broken-links`, `unique-titles`,
`unique-meta-descriptions`, `no-missing-alt`, `no-orphans`,
`structured-data-valid`, `forms-valid`, `no-empty-headings`, `h1-count`,
`self-canonical`, `no-internal-redirect-links`, `no-generic-only-booking`,
`no-sitemap-noindex-conflict`, `sitemap-reachable`, `no-mixed-content`).

## Configuration that still needs a human decision

`emjay-qa.config.mjs` marks these **CONFIRM-REQUIRED**. Each one currently
reports a WARNING rather than passing, so an unfilled config cannot produce a
false GREEN.

1. **`brand.colours.approved`** — the approved Emjay palette is empty. Until it
   is filled, the suite only enforces the *banned* list (`#2EA3F2` and friends)
   and reports every other colour it finds as an inventory. Fill the palette,
   then set `brand.colours.mode: 'allowlist'` to enforce it.
2. **`brand.fonts.approved`** — same pattern for typefaces.
3. **`content.booking.serviceIntents[].expectedBookingPattern`** — the Square
   deep-link per service. Without these the suite can flag "generic-only" but
   cannot assert the correct destination.
4. **`content.retiredUrls`** — seeded from the documented retired offers only.
   Extend it from the pre-remediation crawl and Search Console's Pages report.
5. **`content.business`** — phone, email, street address and postcode are null.
   They are needed to verify NAP consistency against structured data.

## Two source conflicts worth resolving before GREEN

Both were found while grounding this config in the Emjay skill files. Neither is
a site defect on its own, but both change what the suite should assert:

1. **Cleveland.** `emjay-audience` and `emjay-ceo` state Cleveland closes end of
   June 2026. `emjay-brand-voice` still lists Cleveland as an active location
   with its own pricing. The suite currently treats a Cleveland reference as a
   **WARNING** (`EMJ-006`, registry status `unconfirmed`). Once confirmed
   closed, promote it to `FAIL`.
2. **Session pricing.** `emjay-audience` lists I Am At My Limit at
   $250 / $375 / $499. `emjay-brand-voice` lists $180 / $270 / $360, marked
   "verified June 2026, Square is master". The suite does **not** assert prices,
   because asserting the wrong number is worse than not asserting. Once the
   correct figures are confirmed, add them as `text-absent` entries for the
   superseded prices.

## Continuous use

`.github/workflows/qa.yml` runs the suite on a schedule and on demand, uploads
the reports as artifacts, and fails the run on any FAIL. Change `--fail-on` to
`warn` once the site is clean, so the bar ratchets up rather than drifting.

## Declaring GREEN

GREEN means all four of these, in the same run:

1. `npm run qa` exits `0` with **zero FAIL** findings.
2. Every entry in `known-defects.json` reports **PASS**. Any `NOT VERIFIED`
   blocks GREEN — it means the assertion could not run, not that it passed.
3. The five CONFIRM-REQUIRED config items above are filled, with
   `brand.colours.mode` and `brand.fonts.mode` set to `allowlist`. Until then
   the palette and typeface checks are advisory only.
4. Remaining WARNINGs are individually reviewed and consciously accepted, with
   the accepted ones recorded. Unreviewed warnings are not "green".

Once GREEN is reached, switch CI to `--fail-on warn` so the standard ratchets
rather than drifting back.

## How the suite is verified

The suite ships with a deliberately defective fixture site
(`tests/fixture-site.mjs`) that seeds one instance of every defect class it
claims to catch. 80 self-tests assert that each check actually fires — a check
that silently found nothing would fail its own test.

```bash
npm run selftest
```

`tests/rendered.test.mjs` skips itself with an explicit reason when no browser
is installed, rather than passing quietly.
