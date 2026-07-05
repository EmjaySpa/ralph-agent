/**
 * Emjay brand constants and product content.
 *
 * Voice notes (from Emjay's brand document + 2026 blogs): grounded,
 * warm-but-direct, plain-spoken, de-shaming, permission-based, woman-to-woman.
 * Australian English. No urgency or scarcity. Words the brand avoids and that
 * we've kept out of copy: "transformation", "journey", "unlock", "resilience",
 * "manifest", "high-value woman".
 *
 * All figures here are grounded in the founder's brief. Nothing about Tinana
 * retreats (paused), old $27/$97/$750 tiers (dropped), or speaking (n/a).
 */

export const BRAND = {
  name: "The Emjay Living Ecosystem",
  shortName: "Emjay",
  founder: "Belinda “Bel” Evans",
  tagline: "Where your whole story finally connects",
  // The North-star line supplied in the brief — used verbatim in marketing.
  northStar:
    "We’re not building another wellness app. We’re building the place where a woman’s whole story finally connects.",
  strapline: "A safe return for women who have never known true safety.",
  // The brand's therapeutic destination.
  destination: "Safety is the precondition. Clarity is the mechanism. Agency is the outcome.",
  metaDescription:
    "A private companion for midlife women navigating nervous-system dysregulation, menopause, skin and overwhelm. Daily check-ins, journaling, treatment history and paced nervous-system practices, connected in one place.",
} as const;

/**
 * MEMBERSHIP-NAMING DECISION (documented in README).
 * We deliberately do NOT call the recurring product a "membership".
 * For an overwhelmed midlife audience, "membership" reads as a gym-style
 * obligation — another thing to keep up with, another reason to feel behind —
 * which raises churn-guilt. We frame it instead as a "practice" you keep at
 * your own pace, and a "companion" that sits alongside you. This matches the
 * actual product (a private companion that connects your whole story) and the
 * brand's permission-based, no-pressure voice.
 */
export const MEMBERSHIP_FRAMING = {
  avoidedTerm: "membership",
  chosenNoun: "companion", // the descriptor
  commitmentModel: "a monthly practice, cancel anytime", // how the recurring model reads
} as const;

export type Offering = {
  id: string;
  name: string;
  kind: "recurring" | "session" | "package";
  price: string;
  priceNote?: string;
  cadence?: string;
  summary: string;
  forWho: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

/**
 * The ONLY current offerings. Corrected per the founder's brief:
 *  - The Nervous System Reset — $79/month AUD recurring digital product
 *    (framed as a practice/companion, not a "membership").
 *  - "I’m at my limit" — accessible entry session for acute overwhelm.
 *  - Nervous System Recalibration — $1,500 AUD premium 6-week package.
 */
export const OFFERINGS: Offering[] = [
  {
    id: "reset",
    name: "The Nervous System Reset",
    kind: "recurring",
    price: "$79",
    cadence: "/month AUD",
    priceNote: "A monthly practice. Cancel anytime.",
    summary:
      "Your steady companion for midlife. Daily check-ins, journaling and paced nervous-system practices, all connected in one private place so your patterns finally make sense.",
    forWho: "For the woman holding it together who is quietly wondering why that takes so much effort.",
    includes: [
      "Daily check-ins across sleep, mood, skin, energy, stress, cycle and menopause",
      "Guided journaling, including “Roles We Play” and “Skin Deep”",
      "Plain-language pattern insights over time",
      "The nervous-system practice library, paced to open as you go",
      "Your treatment history and notes, held in one place",
    ],
    cta: "Begin the Reset",
    featured: true,
  },
  {
    id: "limit",
    name: "“I’m at my limit” session",
    kind: "session",
    price: "$110",
    priceNote: "Single 90-minute session · indicative price, confirm with Bel",
    summary:
      "One accessible, lower-cost session for when you have hit the wall. No program, no commitment. A place to land, settle your system and work out the very next step.",
    forWho: "For acute overwhelm, when you need support now rather than a plan for later.",
    includes: [
      "A single 90-minute nervous-system session with Bel",
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
    price: "$1,500",
    cadence: " AUD",
    priceNote: "6-week premium package",
    summary:
      "Structured, sustained one-to-one support to recalibrate a nervous system that has been running on survival for a long time. The deepest way to work with Bel.",
    forWho:
      "For women who are done managing the symptoms and ready for steady, individual support over six weeks.",
    includes: [
      "A six-week one-to-one container with Bel",
      "Personalised nervous-system mapping using the Emjay model",
      "Somatic and practical work between sessions",
      "Full access to the Reset companion for the duration",
      "A plan you can keep living from afterwards",
    ],
    cta: "Enquire about Recalibration",
  },
];

/**
 * The Emjay six-stage therapeutic model. Modules in the app open in this
 * order, mirroring how trauma-informed work is paced — safety first, deeper
 * material later. (Names from Emjay's brand document.)
 */
export type Stage = {
  n: number;
  key: string;
  title: string;
  blurb: string;
  moduleTitle: string;
};

export const STAGES: Stage[] = [
  {
    n: 1,
    key: "body-speaks",
    title: "The Body Starts Speaking",
    blurb:
      "Chronic stress finally gets loud. We steady the nervous system first and take the shame out of the symptoms.",
    moduleTitle: "Nervous System Foundations",
  },
  {
    n: 2,
    key: "pattern-recognition",
    title: "Pattern Recognition",
    blurb:
      "You start to see the over-functioning and people-pleasing. This is where grief and anger often arrive, and that is allowed.",
    moduleTitle: "Breathwork & Regulation",
  },
  {
    n: 3,
    key: "identity-roles",
    title: "Identity Roles",
    blurb:
      "The caretaker, the peacemaker, the strong one. Roles that protected you once and now cost too much.",
    moduleTitle: "Emotional Resourcing",
  },
  {
    n: 4,
    key: "rewiring-receiving",
    title: "Rewiring Safety & Receiving",
    blurb:
      "Your body reads receiving — rest, help, money, love — as risk. Here we build the capacity to let it in.",
    moduleTitle: "Boundaries & Receiving",
  },
  {
    n: 5,
    key: "integration",
    title: "Integration",
    blurb:
      "Regulation gets easier and recovery gets faster. The new patterns start to hold on their own.",
    moduleTitle: "Relationships",
  },
  {
    n: 6,
    key: "self-trust",
    title: "Living From Self-Trust",
    blurb:
      "Decisions from internal clarity rather than fear. Not a finish line, a way of living.",
    moduleTitle: "Money & Agency",
  },
];

export type NavLink = { label: string; href: string };

export const MARKETING_NAV: NavLink[] = [
  { label: "The idea", href: "/#idea" },
  { label: "How it works", href: "/#how" },
  { label: "The model", href: "/#model" },
  { label: "Offers", href: "/#offers" },
  { label: "About Bel", href: "/#about" },
];

export const DASHBOARD_NAV: NavLink[] = [
  { label: "Today", href: "/dashboard" },
  { label: "Check-in", href: "/dashboard/check-in" },
  { label: "Journal", href: "/dashboard/journal" },
  { label: "Insights", href: "/dashboard/insights" },
  { label: "Library", href: "/dashboard/library" },
];
