# Emjay Wellness — automated QA regression suite

> **New here, or picking this up cold? Read [HANDOVER.md](HANDOVER.md).**
> It explains how to run the suite, read the report and maintain the register
> with no AI tooling and no prior context.

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
| Pricing against Square | `pricing` | Superseded prices; promotional prices past their expiry |
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
- When a defect turns out to be based on an obsolete premise, **reverse the
  entry rather than deleting it**, and say so in its `note`. `EMJ-006` is the
  worked example: it once asserted Cleveland must be absent, and now asserts it
  must be present.

Adding one:

```json
{
  "id": "EMJ-034",
  "title": "Short description of the defect",
  "status": "confirmed",
  "severity": "FAIL",
  "scope": "site",
  "source": "where it was found",
  "assert": { "type": "text-absent", "pattern": "some regex", "flags": "i" }
}
```

Assertion types: `colour-absent`, `source-absent`, `text-absent`,
`text-present`, `url-status`, `external-url-ok`, `price-accuracy`,
`robots-not-blocking-all`, `robots-source-absent`, plus
delegating types that reuse an existing check (`no-console-errors`,
`no-mobile-overflow`, `no-broken-links`, `unique-titles`,
`unique-meta-descriptions`, `no-missing-alt`, `no-orphans`,
`structured-data-valid`, `forms-valid`, `no-empty-headings`, `h1-count`,
`self-canonical`, `no-internal-redirect-links`, `no-generic-only-booking`,
`no-sitemap-noindex-conflict`, `sitemap-reachable`, `no-mixed-content`).

## Configuration status

### Confirmed 2026-08

**Colour palette — enforced.** `brand.colours.mode` is `allowlist`. Approved:
`#609E9F` teal mid, `#5F9DA0` teal dark, `#87B5B6` teal light, `#DBE8E9` teal
pale, `#B1CFCF` teal soft, plus the accessibility variants `#426E70` (text on
pale) and `#457F81` (text on white), and the approved button label colour
`#1C2224` (5.23:1 on `#5F9DA0`). Retired and banned at FAIL: `#2F6569`,
`#5A9A94`, `#2EA3F2`, `#D63637`. Anything else off-palette reports at
`brand.colours.unapprovedSeverity` (currently `WARN`) — raise to `FAIL` once
colour remediation is signed off.

Two notes on the palette itself, surfaced because they affect what the suite can
tell you:

- `#609E9F` and `#5F9DA0` are only **deltaE 1.2** apart — effectively the same
  colour to the eye. `tolerance` is set to `1.0` so they stay distinguishable,
  but they are functionally interchangeable in use.
- `#32373C` is listed as approved because the brief names it as the dark panel
  that `#87B5B6` text sits on. If it is not in fact an approved surface, remove
  it from `brand.colours.approved`.

Greys are inventoried as INFO rather than flagged, because greyscale is not a
brand decision — except where a grey sits within `nearBrandDeltaE` of an
approved colour, which makes it a near-miss of the palette rather than a
neutral. Set `neutralChromaThreshold: 0` to enforce the allowlist across greys.

**Typefaces — enforced, but migration PARKED.** Approved: Poppins (headings),
Montserrat (body), Playfair Display (accent), Playlist Script (signature),
Arial/Helvetica (fallback). The live site has not been migrated, so
`brand.fonts.unapprovedSeverity` is `'WARN'` — parked work cannot block the
defect register from reaching GREEN. **When the migration is authorised, change
that one value to `'FAIL'`.** Nothing else needs to change; a test asserts the
flip works.

**Cleveland — ACTIVE.** Emjay operates in person at Cleveland QLD and online
Australia-wide. Sources stating a June 2026 closure are obsolete. Cleveland is
in `business.activeLocations`, and `EMJ-006` was **reversed**: it now asserts
Cleveland is *present* on the site, since its disappearance is the regression to
guard against.

**Pricing — Square is the source of truth.** Current: 60 min in person $180,
60 min online $140 (promotional until 31 Aug 2026, then $180), 90 min $270,
2 hr $360. The `pricing` check asserts **absence**, never presence: superseded
prices ($250 / $375 / $499) must not appear, and the $140 promotional price
becomes a FAIL automatically the day after it expires. No config edit is needed
on the expiry date.

### Still requiring configuration

1. **Square booking deep-links** — `square-service-map.json`. Every service
   except the Payhip membership has `expectedBookingPattern: null`, so the suite
   can flag a generic-only CTA but cannot assert the correct destination. Paste
   each service's deep-link fragment from the website remediation handover. This
   is data, not code: no test or source changes are needed.
2. **`content.retiredUrls`** — seeded from the documented retired offers only.
   Extend from the pre-remediation crawl and Search Console's Pages report.
3. **`content.business`** — phone, email, street address and postcode are still
   null. Needed to verify NAP consistency against structured data.

Each of these reports a WARNING rather than passing, so an unfilled config
cannot produce a false GREEN.

## Continuous use

`.github/workflows/qa.yml` runs the suite on a schedule and on demand, uploads
the reports as artifacts, and fails the run on any FAIL. Change `--fail-on` to
`warn` once the site is clean, so the bar ratchets up rather than drifting.

## Declaring GREEN

GREEN means all four of these, in the same run:

1. `npm run qa` exits `0` with **zero FAIL** findings.
2. Every entry in `known-defects.json` reports **PASS**. Any `NOT VERIFIED`
   blocks GREEN — it means the assertion could not run, not that it passed.
3. The three outstanding config items above are filled — in particular the
   Square booking deep-links, without which `booking-intent` cannot assert a
   correct destination.
4. Remaining WARNINGs are individually reviewed and consciously accepted, with
   the accepted ones recorded. Unreviewed warnings are not "green".

Font remediation is deliberately **out of scope for this GREEN**. Unapproved
typefaces report as WARNING by design, and are expected to still be present.

Once GREEN is reached: switch CI to `--fail-on warn`, raise
`brand.colours.unapprovedSeverity` to `FAIL`, and authorise the font migration
by raising `brand.fonts.unapprovedSeverity` to `FAIL`. Each is a one-value
change.

## How the suite is verified

The suite ships with a deliberately defective fixture site
(`tests/fixture-site.mjs`) that seeds one instance of every defect class it
claims to catch. 157 self-tests assert that each check actually fires — a check
that silently found nothing would fail its own test. `tests/config.test.mjs`
additionally asserts the confirmed configuration decisions themselves, including
that the stated accessibility variants really do meet AA in their stated
contexts, so a later edit cannot quietly undo them.

```bash
npm run selftest
```

`tests/rendered.test.mjs` skips itself with an explicit reason when no browser
is installed, rather than passing quietly.
