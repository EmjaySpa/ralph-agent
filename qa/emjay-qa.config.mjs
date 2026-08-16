/**
 * Emjay Wellness — QA suite configuration.
 *
 * This file is the single place a human declares "what GREEN means".
 * Everything the suite asserts is driven from here or from known-defects.json.
 *
 * SAFETY: this suite is strictly read-only against the live site. It issues
 * GET/HEAD requests and renders pages in a browser. It never submits a form,
 * never sends a POST, and never authenticates.
 *
 * Fields marked CONFIRM-REQUIRED are deliberately left unset. A check whose
 * config is unconfirmed reports WARNING ("unconfigured"), never PASS, so an
 * unfilled config can never contribute to a false GREEN.
 */

import { createRequire } from 'node:module';

// Square service mappings live in data, not code, so they can be updated
// without touching the suite or its tests.
const serviceMap = createRequire(import.meta.url)('./square-service-map.json');

export default {
  site: {
    baseUrl: 'https://emjaywellness.com.au',
    // Hosts treated as "this site" for internal-link purposes.
    internalHosts: ['emjaywellness.com.au', 'www.emjaywellness.com.au'],
    // Canonical host + protocol the site should settle on. Used by the
    // redirect and internal-linking checks.
    canonicalOrigin: 'https://emjaywellness.com.au',
    canonicalTrailingSlash: true,
    sitemapCandidates: [
      '/sitemap_index.xml',
      '/sitemap.xml',
      '/wp-sitemap.xml',
      '/sitemap-index.xml',
    ],
    // Seeds crawled in addition to "/" and whatever the sitemap yields.
    extraSeeds: [],
  },

  crawl: {
    maxPages: 300,
    concurrency: 4,
    // Politeness delay between requests per worker (ms). Keep this non-zero:
    // we are a guest on a live production host.
    delayMs: 250,
    timeoutMs: 25000,
    retries: 2,
    userAgent:
      'EmjayWellnessQA/1.0 (+read-only automated QA; contact: emjayspas@gmail.com)',
    respectRobots: true,
    // URL patterns never fetched or reported.
    ignore: [
      /\/wp-admin\//i,
      /\/wp-json\//i,
      /\/wp-login\.php/i,
      /\/feed\/?$/i,
      /\?.*replytocom=/i,
      /\/xmlrpc\.php/i,
      /\.(?:zip|dmg|exe|mp4|mov|avi|woff2?|ttf|eot)$/i,
      // Cloudflare email obfuscation. Injected into markup by Cloudflare and
      // returns 404 to anything that is not a real browser session, so it is a
      // guaranteed false positive rather than a broken link.
      /\/cdn-cgi\//i,
      /#/, // fragment-only duplicates are normalised away, not crawled twice
    ],
    // Query params stripped during URL normalisation (tracking noise).
    stripParams: [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'srsltid',
    ],
  },

  thresholds: {
    // --- redirects ---
    maxRedirectHops: 1,          // >1 hop = redirect chain = WARNING
    maxRedirectHopsFail: 3,      // >=3 hops = FAIL

    // --- titles / meta ---
    titleMinLength: 15,
    titleMaxLength: 65,
    metaDescriptionMinLength: 70,
    metaDescriptionMaxLength: 160,

    // --- content ---
    thinContentWords: 150,       // below this = thin page WARNING
    thinContentWordsFail: 50,    // below this = FAIL
    nearDuplicateSimilarity: 0.9, // Jaccard over 5-word shingles

    // --- internal linking ---
    minInboundInternalLinks: 1,  // 0 inbound = orphan
    lowInboundInternalLinks: 2,  // below this = WARNING (weakly linked)
    maxClickDepth: 3,            // deeper than this from home = WARNING

    // --- accessibility ---
    contrastNormalText: 4.5,     // WCAG 2.1 AA
    contrastLargeText: 3.0,
    largeTextPx: 24,             // or 18.66px bold
    maxContrastSamplesPerPage: 400,

    // --- performance (measured in a throttled-free headless run; these are
    //     regression tripwires, not lab-accurate field metrics) ---
    lcpWarnMs: 2500,
    lcpFailMs: 4000,
    clsWarn: 0.1,
    clsFail: 0.25,
    domContentLoadedWarnMs: 3000,
    totalTransferWarnKb: 3000,
    totalTransferFailKb: 6000,
    maxRequestsWarn: 120,
    singleImageWarnKb: 400,

    // --- mobile ---
    mobileViewport: { width: 390, height: 844 },
    mobileOverflowTolerancePx: 2,
  },

  brand: {
    colours: {
      /**
       * mode: 'blocklist'  -> only `banned` colours are enforced; every other
       *                       colour found is reported as INFO for review.
       *       'allowlist'  -> anything outside `approved` (beyond tolerance)
       *                       is reported at `unapprovedSeverity`.
       *
       * CONFIRMED 2026-08: palette signed off, allowlist enforcement is on.
       */
      mode: 'allowlist',

      // Severity applied to a colour that is simply not on the approved list.
      // Colours on the `banned` list keep their own, higher severity.
      // Raise to 'FAIL' once colour remediation is complete and signed off.
      unapprovedSeverity: 'WARN',

      /**
       * The approved Emjay palette (confirmed 2026-08).
       * `role` is reported back in findings so a near-miss names the colour it
       * should have been.
       */
      approved: [
        { hex: '#609E9F', role: 'teal mid' },
        { hex: '#5F9DA0', role: 'teal dark' },
        { hex: '#87B5B6', role: 'teal light / text on the dark #32373C panel' },
        { hex: '#DBE8E9', role: 'teal pale' },
        { hex: '#B1CFCF', role: 'teal soft' },
        // Accessibility variants, approved for the stated contexts only. The
        // contrast check enforces the actual ratios independently.
        { hex: '#426E70', role: 'accessible text on pale backgrounds only' },
        { hex: '#457F81', role: 'accessible text on white' },
        // Surface colour named in the palette brief as the dark panel that
        // #87B5B6 text sits on. Listed so the panel itself is not reported as
        // an unapproved colour. Remove if it is not in fact an approved surface.
        { hex: '#32373C', role: 'dark panel surface' },
      ],

      /**
       * Colours that must never reappear.
       * The first four are the confirmed retired/unapproved set for this brand;
       * the rest are theme defaults that indicate an unstyled leak.
       */
      banned: [
        { hex: '#2EA3F2', label: 'Divi default blue (retired)', severity: 'FAIL' },
        { hex: '#2F6569', label: 'Retired teal (superseded)', severity: 'FAIL' },
        { hex: '#5A9A94', label: 'Retired teal (superseded)', severity: 'FAIL' },
        { hex: '#D63637', label: 'Retired red (unapproved)', severity: 'FAIL' },
        { hex: '#7EBEC5', label: 'Divi default secondary', severity: 'WARN' },
        { hex: '#0C71C3', label: 'Divi default link blue', severity: 'WARN' },
        { hex: '#00A0D2', label: 'WordPress admin blue', severity: 'WARN' },
        { hex: '#FF0000', label: 'Pure red (never brand)', severity: 'WARN' },
        { hex: '#0000FF', label: 'Pure blue (never brand)', severity: 'WARN' },
      ],

      // Max CIE76 deltaE distance at which a rendered colour is considered
      // "the same as" a listed colour. Computed styles are exact declared
      // values, not sampled pixels, so this can be tight.
      // NOTE: #609E9F ("teal mid") and #5F9DA0 ("teal dark") are only deltaE
      // 1.2 apart — effectively the same colour to the eye. This is kept below
      // that gap so the two are not silently interchangeable.
      tolerance: 1.0,

      // deltaE at which a banned colour is treated as "close enough to count".
      // Wider than `tolerance` so a nudged-by-one-digit retired colour is still
      // caught, but still far short of the nearest approved teal.
      bannedTolerance: 4,

      /**
       * Greyscale is not a brand decision. Any colour whose Lab chroma is below
       * this threshold (neutral greys, blacks, off-whites, shadow rgba) is
       * reported as INFO rather than as an unapproved brand colour, so the
       * allowlist signal stays readable. Banned colours are never downgraded.
       * Set to 0 to enforce the allowlist across greys too.
       */
      neutralChromaThreshold: 8,

      /**
       * A low-chroma colour that sits close to an approved brand colour is a
       * near-miss of the palette, not a neutral. Anything within this deltaE of
       * an approved colour is always reported at `unapprovedSeverity`, however
       * grey it is. Without this, an off-by-a-shade version of the pale teal
       * #DBE8E9 (chroma 4.6) would be filed away as a harmless grey.
       */
      nearBrandDeltaE: 12,

      // Colours always ignored entirely.
      ignore: ['transparent', 'rgba(0, 0, 0, 0)', '#000000', '#FFFFFF'],
    },

    fonts: {
      // CONFIRMED 2026-08: typefaces signed off.
      mode: 'allowlist',

      /**
       * IMPORTANT — font remediation is deliberately PARKED.
       * The live site has not yet been migrated to these families. Until that
       * migration is authorised, an unapproved font is a WARNING, not a FAIL,
       * so parked work cannot block the defect register from reaching GREEN.
       *
       * When the migration is authorised: change this to 'FAIL'. Nothing else
       * needs to change.
       */
      unapprovedSeverity: 'WARN',

      // Approved families (lowercase, no quotes).
      approved: [
        'poppins',          // headings
        'montserrat',       // body
        'playfair display', // accent
        'playlist script',  // signature
        'arial',            // fallback
        'helvetica',        // fallback
        'helvetica neue',   // fallback (common alias)
      ],

      /**
       * Families that indicate an unstyled/theme-default leak.
       * These stay at WARN while the font migration is parked, so they read the
       * same as any other unapproved family rather than standing out as a
       * blocker. Comic Sans and Papyrus remain FAIL: they are never the result
       * of an unfinished migration.
       */
      banned: [
        { family: 'times new roman', severity: 'WARN', label: 'Browser default serif (unstyled text)' },
        { family: 'comic sans ms', severity: 'FAIL', label: 'Comic Sans' },
        { family: 'papyrus', severity: 'FAIL', label: 'Papyrus' },
      ],

      // Generic stacks that are fine to see as fallbacks.
      ignore: ['inherit', 'initial', 'sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system'],

      // Distinct-family ceiling before the count itself is reported.
      // Raised while both the old and new typefaces coexist during migration.
      maxDistinctFamilies: 6,
    },
  },

  content: {
    /**
     * Old/retired URLs. Each entry asserts what SHOULD happen when the URL is
     * requested. `expect: 'redirect'` requires a 301/308 to `to`;
     * `expect: 'gone'` requires 404/410; `expect: 'absent-from-site'` requires
     * that no page on the site links to it.
     *
     * CONFIRM-REQUIRED: extend this list from the pre-remediation crawl and
     * from Search Console's "Pages" report. Entries below are derived from the
     * documented retired offers (Midweek Reset, standard 90-min session, gift
     * certificates) and are asserted as "nothing should link here".
     */
    retiredUrls: [
      { path: '/midweek-reset/', expect: 'absent-from-site', note: 'Retired offer (emjay-offers)' },
      { path: '/gift-certificates/', expect: 'absent-from-site', note: 'Removed offer' },
      { path: '/gift-vouchers/', expect: 'absent-from-site', note: 'Removed offer variant' },
      { path: '/90-minute-session/', expect: 'absent-from-site', note: 'Retired, replaced by I Am At My Limit' },
    ],

    /**
     * Old business / location / offer references that must not appear in
     * live page copy.
     *
     * CLEVELAND: confirmed 2026-08 as an ACTIVE location. Emjay operates in
     * person at Cleveland QLD and online Australia-wide. Any source stating
     * Cleveland closed in June 2026 is obsolete. Cleveland is therefore listed
     * under business.activeLocations below, and is NOT a stale reference.
     */
    legacyReferences: [
      {
        id: 'OFFER-MIDWEEK-RESET',
        pattern: /\bMidweek\s+Reset\b/i,
        severity: 'FAIL',
        label: 'Retired offer: Midweek Reset',
      },
      {
        id: 'OFFER-GIFT-CERT',
        pattern: /\bgift\s+(certificate|voucher)s?\b/i,
        severity: 'FAIL',
        label: 'Removed offer: gift certificates/vouchers',
      },
      {
        id: 'COPY-EM-DASH-CTA',
        pattern: null, // handled by the brand-voice check, not a regex here
        severity: 'INFO',
        label: 'placeholder — disabled',
        disabled: true,
      },
    ],

    /**
     * Booking-link intent. A service page that only offers the generic
     * "book anything" link, when a service-specific booking URL exists, is a
     * conversion defect.
     *
     * The per-service mappings live in square-service-map.json so they can be
     * updated by editing data, with no code or test changes. They are read-only
     * QA assertions — the suite never writes to Square.
     */
    booking: {
      genericBookingPatterns: [
        /squareup\.com\/appointments\/book\/[^/]+\/?$/i,
        /square\.site\/?$/i,
        /\/book\/?$/i,
        /\/booking\/?$/i,
        /\/contact\/?$/i,
      ],
      serviceIntents: serviceMap.services.map((s) => ({
        id: s.id,
        label: s.label,
        match: new RegExp(s.pathPattern, 'i'),
        expectedBookingPattern: s.expectedBookingPattern ? new RegExp(s.expectedBookingPattern, 'i') : null,
      })),
      // Domains that legitimately terminate a booking journey.
      allowedBookingHosts: ['squareup.com', 'square.site', 'payhip.com', 'emjaywellness.com.au'],
    },

    /**
     * Pricing assertions. Square is the source of truth; the suite only ever
     * reads the website and compares it against the figures declared here.
     *
     * It deliberately does NOT assert that a given price must be present —
     * that would break every time a page is restructured. It asserts two
     * things that are unambiguous defects:
     *   1. a superseded price appearing anywhere in live copy
     *   2. a time-bound promotional price still showing after it expires
     */
    pricing: {
      // Current, confirmed figures. Recorded for the report, not asserted as
      // required text.
      current: [
        { label: "I Am At My Limit — 60 min in person", price: '$180' },
        { label: "I Am At My Limit — 60 min online (promotional)", price: '$140' },
        { label: "I Am At My Limit — 60 min online (standard)", price: '$180' },
        { label: "I Am At My Limit — 90 min", price: '$270' },
        { label: "I Am At My Limit — 2 hours", price: '$360' },
      ],

      /**
       * Prices that must not appear in live copy. Matched with a word boundary
       * and optional .00, so "$250" does not match inside "$1,250".
       */
      superseded: [
        { price: '250', severity: 'FAIL', note: 'Superseded I Am At My Limit 60 min price' },
        { price: '375', severity: 'FAIL', note: 'Superseded I Am At My Limit 90 min price' },
        { price: '499', severity: 'FAIL', note: 'Superseded I Am At My Limit 2 hr price' },
      ],

      /**
       * Time-bound offers. Before `expiresAt` the price is expected and nothing
       * is reported. On or after it, any remaining reference is a defect at
       * `severityAfterExpiry`. Dates are inclusive of the last valid day and
       * evaluated in Australia/Brisbane.
       */
      timeBound: [
        {
          id: 'PROMO-ONLINE-60',
          label: 'I Am At My Limit — 60 min online promotional price',
          price: '140',
          expiresAt: '2026-08-31',
          severityAfterExpiry: 'FAIL',
          note: 'Promotional until 31 August 2026; reverts to $180. After expiry, remove or update the price.',
        },
      ],

      timezone: 'Australia/Brisbane',
    },

    /**
     * Archive and pagination surfaces. Blog indexes, tag/category/author
     * archives and /page/2/ URLs are thin and near-identical by construction —
     * that is what an archive is. Flagging them as content defects buries the
     * real thin pages, so findings on these URLs are downgraded to INFO.
     * They remain worth reviewing as an indexation question, not a QA gate.
     */
    archivePatterns: [
      /\/page\/\d+\/?$/i,
      /\/author\//i,
      /\/tag\//i,
      /\/category\//i,
      /[?&]paged?=/i,
    ],

    /**
     * Business facts asserted against on-page copy and structured data.
     * CONFIRM-REQUIRED fields are null and report WARNING until filled.
     */
    business: {
      name: 'Emjay Wellness',
      // Confirmed 2026-08: Cleveland is active, alongside Tinana/Maryborough
      // and online Australia-wide.
      activeLocations: ['Cleveland', 'Tinana', 'Maryborough'],
      phone: null,            // CONFIRM-REQUIRED
      email: null,            // CONFIRM-REQUIRED
      streetAddress: null,    // CONFIRM-REQUIRED
      postcode: null,         // CONFIRM-REQUIRED
      shopUrl: 'https://payhip.com/emjaywellness',
    },
  },

  structuredData: {
    // Types that must appear at least once somewhere on the site.
    requiredSomewhere: ['Organization', 'LocalBusiness', 'WebSite'],
    // Per-type required properties enforced wherever the type appears.
    requiredProps: {
      Organization: ['name', 'url'],
      LocalBusiness: ['name', 'address', 'url'],
      WebSite: ['name', 'url'],
      Article: ['headline', 'datePublished'],
      BlogPosting: ['headline', 'datePublished'],
      BreadcrumbList: ['itemListElement'],
      Product: ['name'],
      FAQPage: ['mainEntity'],
      Service: ['name'],
      Person: ['name'],
    },
  },

  forms: {
    // Never set this to true. Submitting forms on a live site creates real
    // enquiries/bookings. The suite validates form structure only.
    allowSubmit: false,
    requiredFieldsHaveLabels: true,
    requireSubmitButton: true,
    requireEmailInputType: true,
    // Endpoints a form may post to. Anything else is flagged for review.
    allowedActionHosts: ['emjaywellness.com.au', 'www.emjaywellness.com.au', ''],
  },

  report: {
    outDir: './report',
    formats: ['md', 'json', 'html'],
    // Exit non-zero on: 'fail' | 'warn' | 'never'
    failOn: 'fail',
    // Cap findings printed per check in the console summary.
    consoleFindingsPerCheck: 8,

    /**
     * A defect in a shared theme template repeats identically on every page.
     * Collapsing turns 206 copies of one misconfigured viewport tag into a
     * single finding that says "on 206 pages", so the report counts distinct
     * defects rather than occurrences. Set to false to see every occurrence.
     */
    collapseRepeatedFindings: true,
    collapseThreshold: 3,
  },
};
