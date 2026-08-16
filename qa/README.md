# Emjay Wellness QA suite

An independent, repeatable, read-only test suite for **emjaywellness.com.au**.

It crawls the public site, renders a sample of pages in a headless browser, runs
104 checks across links, SEO, structure, brand, accessibility, forms, content
staleness and performance, asserts every previously found defect is still gone,
and prints a PASS / WARNING / FAIL report.

It does **not** change the site, and it does not rewrite copy, SEO text, design
or WordPress content. It reports what it measured and where.

---

## Safety guarantees

| Guarantee | How it is enforced |
| --- | --- |
| No writes to the live site | `emjay_qa/http.py` raises on any method other than GET or HEAD |
| No form submissions | Forms are analysed structurally; nothing is ever POSTed |
| Polite crawling | One request at a time, `crawl.delay_seconds` between them, robots.txt obeyed |
| No side-effect URLs | Cart, checkout, admin, login and `?add-to-cart=` URLs are excluded by config |
| Proof in every run | `forms.no_side_effects` asserts the methods actually used were GET/HEAD only |

---

## Install

```bash
pip install -r qa/requirements.txt
playwright install chromium      # skip if a Chromium is already provisioned
```

Python 3.9+ (developed on 3.11). The browser layer is optional: without it the
suite still runs and marks the browser-only checks as skipped rather than
passed.

## Run

```bash
# Full run against the live site
python3 qa/run_qa.py

# Static layer only (no browser)
python3 qa/run_qa.py --no-browser

# Faster smoke run
python3 qa/run_qa.py --max-pages 25 --browser-pages 5

# Against staging or a local copy
python3 qa/run_qa.py --base-url https://staging.example.com

# Crawl once, analyse many times (no extra load on the site)
python3 qa/run_qa.py --save-crawl qa/reports/crawl.pkl
python3 qa/run_qa.py --from-crawl qa/reports/crawl.pkl --only brand content
```

Reports are written to `qa/reports/`: `report.md`, `report.json`,
`report.html`.

Exit codes: `0` PASS (warnings allowed), `1` FAIL, `2` WARNING with
`--fail-on-warning`, `3` suite error.

## Run as the release gate

```bash
EMJAY_QA_LIVE=1 pytest qa/tests/test_live_site.py -v
```

`test_site_has_no_failures` is the GREEN gate: it fails if any check reports
FAIL. `test_no_known_defect_has_returned` fails if any registered defect comes
back.

## Test the suite itself

```bash
pytest qa/tests -q      # 76 tests, no network required (4 live tests are skipped)
```

The suite is verified against two generated fixture sites
(`qa/tests/fixtures/build_site.py`):

- **dirty** carries one injected defect per check; the tests assert each check
  reports the expected severity. If a check stops working, these fail.
- **clean** carries none of them; the tests assert no check reports FAIL. This
  is the false-positive guard.

---

## What is checked

| Area | Checks |
| --- | --- |
| Links & HTTP | internal 404s and errors, external link health, mixed content, in-page anchors, placeholder and staging links, malformed `mailto:`/`tel:` |
| Redirects | redirect chains, temporary redirects used for permanent moves, internal links pointing at redirects, redirect loops, http/https and www canonicalisation, trailing-slash duplicates |
| Titles & Meta | missing, empty, duplicated, multiple, out-of-range titles and meta descriptions, Open Graph preview tags |
| Canonicals | missing, multiple, off-domain, http-on-https, broken or redirecting targets, non-self canonicals, canonical clusters |
| Indexability | noindex pages, noindex vs sitemap, noindex vs canonical, meta vs `X-Robots-Tag` conflicts, robots.txt health, blocked-but-linked pages |
| Sitemap | availability, XML validity, entry status and redirects, off-site entries, coverage of indexable pages, robots.txt declaration |
| Headings | missing or multiple H1, empty headings, skipped levels, long pages with no H2, placeholder H1s |
| Structured data | JSON-LD parse errors, required properties per type, expected types site-wide, retired values hidden in schema, off-domain URLs, NAP consistency |
| Brand | banned colours in CSS **and** as rendered by the browser (`#2EA3F2` Divi blue and friends), near-miss colour drift, palette conformance, banned and unapproved fonts |
| Accessibility | missing alt attributes, unhelpful alt text, empty and vague link text, `lang`, duplicate ids, viewport zoom, measured WCAG AA contrast, skip links |
| Forms | fields without labels, missing submit controls, insecure or broken actions, GET on non-search forms, privacy policy link, contact pages with no way to enquire |
| Stale content | retired names and offers (business name, gift certificates, Midweek Reset, standard 90-minute session), watched location references, placeholder copy, retired URL behaviour and inbound links |
| Booking links | service pages that only offer a generic booking front door, or no booking link at all |
| Duplicate & thin | duplicate and near-duplicate bodies, thin pages, blank pages |
| Structure | orphan pages, click depth, in-content internal links, inbound links, links to non-canonical URLs, dead ends |
| Performance | slow responses, page weight, request count, oversized images, missing image dimensions, caching and compression headers, browser load timings |
| Runtime | JavaScript console errors, uncaught exceptions, failed subresources, horizontal overflow at 390px |
| Known defects | every entry in `config/known_defects.yaml`, asserted every run |

---

## Configuration

Everything site-specific lives in `qa/config/`. Never edit check code to make a
result go green.

### `config/site.yaml`

Crawl limits and politeness, thresholds, brand rules, retired terms, watched
locations, current offers, booking-link patterns, retired URLs, expected schema
types and severity overrides.

Three settings are deliberately parked until a human confirms them, and are
marked `CONFIRM` in the file:

1. **`brand.approved_colours` / `brand.enforce_palette`** - no approved palette
   was supplied, so the suite runs in discovery mode: banned colours still FAIL,
   and every other colour in use is listed as INFO for approval. Populate the
   list and set `enforce_palette: true` to make unapproved colours a failure.
2. **`brand.approved_fonts` / `brand.enforce_fonts`** - same, for fonts.
3. **`business.retired_locations`** - the two internal sources of truth disagree
   about whether Cleveland or Tinana is current, so the suite maps where each
   location appears (`content.location_map`, INFO) instead of guessing. Once Bel
   confirms, move retired names into `retired_locations` and they become FAIL.

`business.canonical_phone`, `canonical_email` and `canonical_street_address` are
also empty; fill them to enable NAP consistency enforcement.

### `config/known_defects.yaml`

The regression registry. Every defect found by a human or an earlier QA pass
gets an entry so it can never come back silently.

```yaml
- id: EMJ-012
  title: "Contact page hero image lost its alt text"
  source: "manual review 2026-08-20"
  status: fixed          # open | fixed | wontfix
  assert:
    type: selector_present
    selector: "main img[alt]"
    url_pattern: "^/contact/$"
```

Assertion types: `colour_absent`, `font_absent`, `text_absent`, `regex_absent`,
`url_status`, `url_not_linked`, `selector_present`, `selector_absent`,
`no_console_errors`, `no_horizontal_overflow`, `canonical_equals`,
`meta_robots_absent`.

Status behaviour:

- `open` - a failing assertion reports FAIL; a passing one reports INFO
  ("no longer detected, confirm and flip to `fixed`").
- `fixed` - a failing assertion is a **REGRESSION** and always reports FAIL,
  regardless of severity overrides.
- `wontfix` - reported as INFO only.

### Tuning severity

```yaml
severity_overrides:
  perf.page_weight: WARNING     # FAIL | WARNING | INFO | OFF
```

Known-defect regressions ignore overrides by design.

---

## Adding a check

1. Write it in `qa/emjay_qa/checks/`, decorated with `@check(id, name, category)`,
   taking the `Site` model and yielding `Finding`s. Checks do no I/O.
2. Inject the matching defect into the dirty fixture in
   `qa/tests/fixtures/build_site.py` and add the check id to `DEFECT_MAP` with
   its expected severity.
3. `pytest qa/tests -q`. `test_defect_map_covers_registered_checks` fails if a
   new check has neither fixture coverage nor an explicit exemption.

## Reading the report

- **FAIL** - must be fixed before the site is declared GREEN.
- **WARNING** - review and decide; often a judgement call, not a defect.
- **INFO** - discovery and coverage notes, including anything the suite could
  not verify this run. An INFO block that says a check was skipped is not a
  pass.

Limits worth knowing: contrast is only measured where the effective background
is a solid computed colour (text over images or gradients is skipped rather than
guessed); performance figures are indicative crawl and navigation-timing
signals, not a Lighthouse audit; the browser layer covers `runtime.max_pages`
pages, home page first.
