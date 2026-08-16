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
       *                       is a WARNING. Switch to this once the palette
       *                       below is confirmed by Bel/design.
       */
      mode: 'blocklist',

      // CONFIRM-REQUIRED: the approved Emjay palette. Leave empty until
      // confirmed. While empty, `mode: 'allowlist'` is refused and the check
      // reports WARNING rather than silently passing.
      approved: [],

      // Known-unapproved colours. #2EA3F2 is the Divi theme default blue and
      // is the flagship rogue-colour defect for this site.
      banned: [
        { hex: '#2EA3F2', label: 'Divi default blue', severity: 'FAIL' },
        { hex: '#7EBEC5', label: 'Divi default secondary', severity: 'WARN' },
        { hex: '#0C71C3', label: 'Divi default link blue', severity: 'WARN' },
        { hex: '#00A0D2', label: 'WordPress admin blue', severity: 'WARN' },
        { hex: '#FF0000', label: 'Pure red (never brand)', severity: 'WARN' },
        { hex: '#0000FF', label: 'Pure blue (never brand)', severity: 'WARN' },
      ],

      // Max CIE76 deltaE distance at which a rendered colour is considered
      // "the same as" a listed colour. 0 = exact hex match only.
      tolerance: 3,

      // Colours always ignored (neutrals, transparent, pure black/white).
      ignore: ['transparent', 'rgba(0, 0, 0, 0)', '#000000', '#FFFFFF'],
    },

    fonts: {
      mode: 'blocklist',

      // CONFIRM-REQUIRED: approved families (lowercase, no quotes).
      approved: [],

      // Families that indicate an unstyled/theme-default leak.
      banned: [
        { family: 'times new roman', severity: 'WARN', label: 'Browser default serif (unstyled text)' },
        { family: 'comic sans ms', severity: 'FAIL', label: 'Comic Sans' },
        { family: 'papyrus', severity: 'FAIL', label: 'Papyrus' },
      ],

      // Generic stacks that are fine to see as fallbacks.
      ignore: ['inherit', 'initial', 'sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system'],
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
      { path: '/gift-certificates/', expect: 'absent-from-site', note: 'Removed during Cleveland-to-Tinana transition' },
      { path: '/gift-vouchers/', expect: 'absent-from-site', note: 'Removed offer variant' },
      { path: '/90-minute-session/', expect: 'absent-from-site', note: 'Retired, replaced by I Am At My Limit' },
    ],

    /**
     * Old business / location / offer references that must not appear in
     * live page copy.
     *
     * NOTE ON SEVERITY: the Emjay skill sources disagree about Cleveland.
     * emjay-audience and emjay-ceo state Cleveland closes end of June 2026
     * (i.e. closed as of this suite's authoring); emjay-brand-voice still
     * lists Cleveland as active. Until a human resolves that, Cleveland is a
     * WARNING, not a FAIL. Promote to FAIL once confirmed closed.
     */
    legacyReferences: [
      {
        id: 'LOC-CLEVELAND',
        pattern: /\bCleveland\b/i,
        severity: 'WARN',
        label: 'Cleveland QLD location reference',
        note: 'Cleveland was scheduled to close end of June 2026. Sources conflict — confirm with Bel, then promote to FAIL.',
      },
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
     * genericBookingPatterns: links that book "something, unspecified".
     * serviceIntents: page patterns that should deep-link to a specific
     * service. `expectedBookingPattern` is CONFIRM-REQUIRED per service; while
     * null, the check reports the generic link as WARNING with the note that
     * the specific target is unconfigured.
     */
    booking: {
      genericBookingPatterns: [
        /squareup\.com\/appointments\/book\/[^/]+\/?$/i,
        /square\.site\/?$/i,
        /\/book\/?$/i,
        /\/booking\/?$/i,
        /\/contact\/?$/i,
      ],
      serviceIntents: [
        { id: 'skin', match: /skin|facial|dermalux|led/i, label: 'Skin therapy', expectedBookingPattern: null },
        { id: 'limit', match: /i-am-at-my-limit|limit/i, label: 'I Am At My Limit session', expectedBookingPattern: null },
        { id: 'recalibration', match: /recalibration|6-week|six-week/i, label: '6-Week Recalibration', expectedBookingPattern: null },
        { id: 'membership', match: /membership|nervous-system-reset/i, label: 'Nervous System Reset membership', expectedBookingPattern: /payhip\.com\/emjaywellness/i },
        { id: 'circle', match: /circle/i, label: "Women's Circles", expectedBookingPattern: null },
        { id: 'ndis', match: /ndis|support-work/i, label: 'NDIS support work', expectedBookingPattern: null },
      ],
      // Domains that legitimately terminate a booking journey.
      allowedBookingHosts: ['squareup.com', 'square.site', 'payhip.com', 'emjaywellness.com.au'],
    },

    /**
     * Business facts asserted against on-page copy and structured data.
     * CONFIRM-REQUIRED fields are null and report WARNING until filled.
     */
    business: {
      name: 'Emjay Wellness',
      activeLocations: ['Tinana', 'Maryborough'],
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
  },
};
