/**
 * Emjay Platform — brand + product content.
 *
 * Voice: grounded, warm, plain Australian English, a little cheeky when it
 * fits. No hype, no spiritual bypassing, no therapy lectures, no corporate
 * jargon, no guilt. No em dashes in visible copy. We do not use the phrase
 * "you are not broken". We do not use "unlock your highest self" language.
 *
 * All figures are grounded in the brief. Nothing here references Tinana
 * bookings, old pricing tiers, "Sacred Reset", or speaking engagements.
 */

export const BRAND = {
  name: "Emjay",
  platformName: "The Emjay Platform",
  founder: "Belinda “Bel” Evans",
  tagline: "Where your whole story finally connects",
  northStar:
    "We’re not building another wellness app. We’re building the place where a woman’s whole story finally connects.",
  metaDescription:
    "Emjay is the private online place where your nervous system, skin, sleep, stress, menopause, emotions and life finally connect. Gentle daily check-ins, journalling, patterns over time and support that meets you where you are.",
  location: "Australia",
} as const;

/**
 * PRODUCT NAMING DECISION (full reasoning in README).
 *
 * The recurring $79/month product is named "The Practice".
 *
 * Why not "membership": for overwhelmed women in midlife, "membership" reads
 * as a gym-style obligation, another thing to keep up with, which is the exact
 * pressure this brand removes. Why "The Practice": in somatic and nervous
 * system work a practice is inherently forgiving and self-paced, which matches
 * "no catching up required". It is human, clear, commercial and grown-up, and
 * it avoids sounding like a homewares line, a corporate program, or a culty
 * wellness brand. "Companion" was ruled out because it names the AI feature.
 * Runners-up: "The Studio" (strong, but leans classes/content) and "Reset"
 * (implies a one-off, not an ongoing monthly practice).
 */
export const PRODUCT = {
  name: "The Practice",
  the: "the practice", // lowercase inline form
  priceLine: "$79 AUD per month",
  priceShort: "$79 AUD / month",
  model: "A month-to-month recurring product. Start when you like, pause or leave when you like.",
  avoidedWord: "membership",
} as const;

export type Offering = {
  id: string;
  name: string;
  kind: "recurring" | "session" | "package";
  price: string;
  cadence?: string;
  priceNote?: string;
  access?: string;
  summary: string;
  forWho: string;
  includes: string[];
  options?: { label: string; price: string; note?: string }[];
  cta: string;
  featured?: boolean;
};

/**
 * The only current offerings.
 *  - The Practice: $79 AUD per month recurring digital product.
 *  - "I'm at my limit": 60/90/120 min sessions at $180/$270/$360 AUD,
 *    online or in person (online is the easiest access point).
 *  - Nervous System Recalibration: $1,500 AUD, online or in person.
 */
export const OFFERINGS: Offering[] = [
  {
    id: "practice",
    name: "The Practice",
    kind: "recurring",
    price: "$79 AUD",
    cadence: "per month",
    priceNote: "Month to month. Start, pause or leave whenever you like.",
    summary:
      "Your private online place to connect your body, mind and story. Gentle daily check-ins, journalling, your patterns over time, the resource library, book modules and the Emjay Companion, all in one calm space.",
    forWho:
      "For the woman who is not looking for another thing to keep up with, just somewhere her whole story can finally live in one place.",
    includes: [
      "Daily check-ins across sleep, mood, energy, stress, skin, body and cycle",
      "Guided journalling, including “Roles We Play” and “Skin Deep”",
      "Plain-language pattern insights as your story builds",
      "The resource library and Bel’s book modules",
      "Your private Life Vault, and full control over what is saved",
      "The Emjay Companion for reflecting and organising your thoughts",
    ],
    cta: "Start The Practice",
    featured: true,
  },
  {
    id: "limit",
    name: "“I’m at my limit” session",
    kind: "session",
    price: "From $180 AUD",
    access: "Online or in person. Online is the easiest place to start.",
    priceNote: "Choose the length that suits the day.",
    summary:
      "One session for when you have hit the wall. No program, no commitment. A place to land, settle your system and work out the very next small step.",
    forWho: "For acute overwhelm, when you need support now rather than a plan for later.",
    options: [
      { label: "60 minutes", price: "$180 AUD" },
      { label: "90 minutes", price: "$270 AUD" },
      { label: "120 minutes", price: "$360 AUD" },
    ],
    includes: [
      "Time with Bel, online or in person",
      "Somatic settling and space to be honest about where you are",
      "One clear, doable next step, at a pace that suits you",
      "No obligation to continue",
    ],
    cta: "Book a session",
  },
  {
    id: "recalibration",
    name: "Nervous System Recalibration",
    kind: "package",
    price: "$1,500 AUD",
    access: "Online or in person. Most women now do this online, from home.",
    priceNote: "The deepest way to work with Bel.",
    summary:
      "Structured, sustained one-to-one support to recalibrate a nervous system that has been running on survival for a long time.",
    forWho:
      "For women who are done managing the symptoms and ready for steady, individual support over time.",
    includes: [
      "A one-to-one container with Bel, online or in person",
      "Personalised nervous system mapping using the Emjay model",
      "Somatic and practical work between sessions",
      "Full access to The Practice for the duration",
      "A plan you can keep living from afterwards",
    ],
    cta: "Enquire about Recalibration",
  },
];

/**
 * The six-stage module progression. Deeper modules open gradually to mirror
 * trauma-informed pacing. Titles follow the brief; each is framed in Bel's
 * model so the pacing is authentic rather than arbitrary.
 */
export type ModuleStage = {
  n: number;
  key: string;
  title: string;
  blurb: string;
  state: "open" | "current" | "later";
};

export const MODULES: ModuleStage[] = [
  {
    n: 1,
    key: "foundations",
    title: "Nervous System Foundations",
    blurb:
      "What is actually happening in your body, and how to help it feel safe. Everything else rests on this.",
    state: "open",
  },
  {
    n: 2,
    key: "breathwork",
    title: "Breathwork",
    blurb:
      "Simple, practical ways to shift your state in a minute or two, without needing to feel anything mystical about it.",
    state: "current",
  },
  {
    n: 3,
    key: "emotional-resourcing",
    title: "Emotional Resourcing",
    blurb:
      "Building the inner resources to feel hard things without being flooded by them.",
    state: "later",
  },
  {
    n: 4,
    key: "boundaries",
    title: "Boundaries",
    blurb:
      "Saying the honest no, and staying regulated while you do it. This one tends to bring up a lot.",
    state: "later",
  },
  {
    n: 5,
    key: "relationships",
    title: "Relationships",
    blurb:
      "How your patterns show up with the people closest to you, and how they can start to shift.",
    state: "later",
  },
  {
    n: 6,
    key: "money",
    title: "Money",
    blurb:
      "The body’s relationship with receiving, security and worth. Deep water, saved for when you are ready.",
    state: "later",
  },
];

export type NavLink = { label: string; href: string };

export const MARKETING_NAV: NavLink[] = [
  { label: "How it works", href: "/#how" },
  { label: "Your Life Vault", href: "/#vault" },
  { label: "The Companion", href: "/#companion" },
  { label: "Books", href: "/#books" },
  { label: "Pricing", href: "/#pricing" },
];

export const DASHBOARD_NAV: { label: string; href: string; group?: string }[] = [
  { label: "Today", href: "/dashboard" },
  { label: "Check-in", href: "/dashboard/check-in" },
  { label: "Journal", href: "/dashboard/journal" },
  { label: "Patterns", href: "/dashboard/insights" },
  { label: "Modules", href: "/dashboard/modules" },
  { label: "Library", href: "/dashboard/library" },
  { label: "Companion", href: "/dashboard/companion" },
  { label: "Life Vault", href: "/dashboard/vault" },
  { label: "Privacy", href: "/dashboard/privacy" },
];

/** Companion boundaries — shown in the Companion UI and referenced elsewhere. */
export const COMPANION = {
  oneLine:
    "Companion is guided by the Emjay framework developed by Bel Evans. It can help you reflect, organise your thoughts and notice patterns. It does not replace medical, psychological or crisis support.",
  isNot: [
    "It is not Bel, and it does not pretend to be.",
    "It is not a therapist, counsellor or doctor.",
    "It does not diagnose, prescribe or give medical advice.",
    "It is not crisis support.",
  ],
  canHelp: [
    "Reflect on what is going on for you right now",
    "Organise your thoughts when your head is full",
    "Notice patterns across what you have saved",
    "Prepare questions for your GP or health provider",
    "Point you to the right resource inside Emjay",
  ],
  memoryNote: "Your story belongs to you. Nothing from this chat is saved unless you choose to save it.",
} as const;

/** Australian crisis + support signposting. Calm, not alarming. */
export const SUPPORT = {
  intro:
    "This platform is for reflection and support, not emergencies. If things feel like too much, please reach out to real people who can help.",
  emergency:
    "If you feel at risk of harming yourself or someone else, or you are in immediate danger, please call 000 in Australia or contact your local emergency service.",
  // TODO(clinical): confirm numbers and add live links before launch.
  services: [
    { name: "Lifeline", detail: "13 11 14 · 24/7 crisis support" },
    { name: "Beyond Blue", detail: "1300 22 4636 · anxiety, depression and support" },
    { name: "1800RESPECT", detail: "1800 737 732 · family and sexual violence support" },
    { name: "Your GP or healthcare provider", detail: "for anything to do with your health or medication" },
  ],
} as const;

/** Bel's books — structured so new titles drop in without a rebuild. */
export type Book = {
  id: string;
  title: string;
  subtitle?: string;
  status: "published" | "editing" | "coming";
  blurb: string;
};

export const BOOKS: Book[] = [
  {
    id: "unwritten",
    title: "Unwritten",
    subtitle: "Releasing the past, reclaiming yourself",
    status: "published",
    blurb: "The masks and roles we wear, and how to begin setting them down. Paired with the “Roles We Play” journal.",
  },
  {
    id: "declutter",
    title: "Declutter Your Space, Declutter Your Mind",
    status: "published",
    blurb: "Start with one drawer. What outer order can do for an overloaded inner world.",
  },
  {
    id: "wired",
    title: "Wired This Way",
    subtitle: "For the late-identified mind",
    status: "editing",
    blurb: "ADHD and neurodivergence after 40, without the shame.",
  },
  {
    id: "evolved",
    title: "Evolved",
    status: "editing",
    blurb: "On growing into yourself, on your own terms.",
  },
  {
    id: "short-guides",
    title: "Future short guides",
    status: "coming",
    blurb: "Shorter reads, finished and in editing now, added here as they land.",
  },
];
