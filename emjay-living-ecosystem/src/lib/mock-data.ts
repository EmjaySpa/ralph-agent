/**
 * MOCK / DEMO DATA ONLY.
 *
 * Everything in this file is fabricated for the demo. The "pattern insights"
 * in particular are illustrative and are clearly labelled as such in the UI —
 * they are NOT generated from real analysis. Replace with a real data layer +
 * insight engine before launch. See README "Not real / TODO before launch".
 */

export const DEMO_USER = {
  firstName: "Bel",
  streakDays: 12,
  memberSince: "March 2026",
  currentStageIndex: 1, // 0-based → Stage 2 "Pattern Recognition" in progress
} as const;

// ---------------------------------------------------------------------------
// Daily check-in schema
// ---------------------------------------------------------------------------

export type MetricKey =
  | "sleep"
  | "mood"
  | "energy"
  | "stress"
  | "skin";

export type Metric = {
  key: MetricKey;
  label: string;
  low: string; // label at value 1
  high: string; // label at value 5
  emoji: string;
};

export const CHECKIN_METRICS: Metric[] = [
  { key: "sleep", label: "Sleep", low: "Wired & broken", high: "Deep & restful", emoji: "🌙" },
  { key: "mood", label: "Mood", low: "Flat / low", high: "Steady / bright", emoji: "🫧" },
  { key: "energy", label: "Energy", low: "Running on empty", high: "Full tank", emoji: "🔋" },
  { key: "stress", label: "Stress load", low: "At my limit", high: "Spacious", emoji: "🌊" },
  { key: "skin", label: "Skin", low: "Reactive / flaring", high: "Calm & clear", emoji: "✨" },
];

export const MENOPAUSE_SYMPTOMS = [
  "Hot flushes",
  "Night sweats",
  "Brain fog",
  "Joint aches",
  "Anxiety / racing",
  "Low libido",
  "Broken sleep",
  "Irritability",
] as const;

// Cycle state for the check-in (many midlife women still track a variable cycle)
export const CYCLE_STATES = [
  "Not tracking",
  "Follicular",
  "Ovulating",
  "Luteal",
  "Bleeding",
  "Irregular / skipped",
] as const;

// ---------------------------------------------------------------------------
// 14 days of pretend check-in history (values 1–5) for the Today mini-charts
// ---------------------------------------------------------------------------

export type CheckinDay = {
  day: string; // short weekday
  sleep: number;
  mood: number;
  energy: number;
  stress: number;
  skin: number;
};

export const CHECKIN_HISTORY: CheckinDay[] = [
  { day: "Mon", sleep: 2, mood: 3, energy: 2, stress: 2, skin: 3 },
  { day: "Tue", sleep: 3, mood: 3, energy: 3, stress: 3, skin: 3 },
  { day: "Wed", sleep: 2, mood: 2, energy: 2, stress: 2, skin: 2 },
  { day: "Thu", sleep: 3, mood: 4, energy: 3, stress: 3, skin: 3 },
  { day: "Fri", sleep: 4, mood: 4, energy: 4, stress: 4, skin: 4 },
  { day: "Sat", sleep: 4, mood: 4, energy: 4, stress: 4, skin: 4 },
  { day: "Sun", sleep: 3, mood: 3, energy: 3, stress: 2, skin: 3 },
  { day: "Mon", sleep: 2, mood: 2, energy: 2, stress: 1, skin: 2 },
  { day: "Tue", sleep: 2, mood: 2, energy: 2, stress: 2, skin: 2 },
  { day: "Wed", sleep: 3, mood: 3, energy: 3, stress: 3, skin: 3 },
  { day: "Thu", sleep: 3, mood: 3, energy: 3, stress: 3, skin: 4 },
  { day: "Fri", sleep: 4, mood: 4, energy: 3, stress: 3, skin: 3 },
  { day: "Sat", sleep: 4, mood: 4, energy: 3, stress: 2, skin: 3 },
  { day: "Sun", sleep: 3, mood: 4, energy: 3, stress: 2, skin: 3 },
];

// ---------------------------------------------------------------------------
// Pattern insights (ILLUSTRATIVE — fabricated for the demo)
// ---------------------------------------------------------------------------

export type Insight = {
  id: string;
  headline: string;
  body: string;
  tag: "skin" | "stress" | "sleep" | "cycle" | "receiving";
  confidence: "A gentle pattern" | "A clearer pattern";
};

export const DEMO_INSIGHTS: Insight[] = [
  {
    id: "skin-overcommit",
    headline: "Your skin tends to flare about three weeks after a stretch of over-committing.",
    body: "In the last two months, the busy weeks where you rated stress at 1 or 2 were followed, roughly 18–23 days later, by your lowest skin days. Your body may be keeping a record of the load before your skin shows it.",
    tag: "skin",
    confidence: "A clearer pattern",
  },
  {
    id: "sleep-sunday",
    headline: "Sundays are quietly your hardest night.",
    body: "Your sleep scores dip most on Sunday evenings, more than any weeknight. It might be worth a gentler Sunday wind-down before the week asks for you again.",
    tag: "sleep",
    confidence: "A gentle pattern",
  },
  {
    id: "receiving-rest",
    headline: "On the days you let yourself receive rest, your stress score lifts the next morning.",
    body: "The mornings after a genuinely restful day, your stress rating was on average a full point higher. Receiving still counts, even when it feels unproductive.",
    tag: "receiving",
    confidence: "A gentle pattern",
  },
  {
    id: "cycle-mood",
    headline: "Your flat days are clustering in the back half of your cycle.",
    body: "Your lower mood check-ins have landed mostly in the luteal phase this month. This is common in midlife as hormones shift. Naming it can take some of the sting out of it.",
    tag: "cycle",
    confidence: "A gentle pattern",
  },
];

// ---------------------------------------------------------------------------
// Journal prompts
// ---------------------------------------------------------------------------

export type JournalPrompt = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
  stageKey: string; // ties to the six-stage model
};

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  {
    id: "roles-we-play",
    title: "Roles We Play",
    intro:
      "The strong one. The peacemaker. The one who holds it all together. These roles protected you once. This is a gentle look at what they cost now.",
    questions: [
      "Which role do you slip into most automatically?",
      "Who taught you that this role kept you safe?",
      "What would you have to trust in order to set it down, even for an afternoon?",
    ],
    stageKey: "identity-roles",
  },
  {
    id: "skin-deep",
    title: "Skin Deep",
    intro:
      "Your skin is often the first thing to speak when your system is carrying too much. A page for noticing what it might be saying.",
    questions: [
      "When did your skin last flare, and what was the week before it like?",
      "Where do you feel stress in your body before you see it on your face?",
      "If your skin could ask you for one thing this week, what would it be?",
    ],
    stageKey: "body-speaks",
  },
  {
    id: "the-fawn",
    title: "The Cost of Keeping the Peace",
    intro:
      "Fawning — smoothing things over, saying yes when you mean no — is a survival response, not a flaw. A place to see it clearly without judgement.",
    questions: [
      "Where did you say yes this week when your body wanted to say no?",
      "What did you imagine would happen if you had said no?",
      "What is one small, safe place to practise the honest answer?",
    ],
    stageKey: "pattern-recognition",
  },
  {
    id: "receiving",
    title: "Receiving Is Harder Than Giving",
    intro:
      "Many women can give endlessly and freeze when it is time to receive. A soft place to build the muscle of letting things in.",
    questions: [
      "When someone offered you help recently, what did you do with it?",
      "What does your body do when you are given a compliment, or rest, or money?",
      "What is one thing you could let yourself receive this week, on purpose?",
    ],
    stageKey: "rewiring-receiving",
  },
];

// A couple of pretend saved entries so the journal isn't empty in the demo.
export const DEMO_JOURNAL_ENTRIES = [
  {
    id: "e1",
    promptTitle: "Roles We Play",
    date: "2 days ago",
    excerpt:
      "I noticed I became “the strong one” the second Mum got sick. Nobody asked me to. I just... stepped in and never stepped out.",
  },
  {
    id: "e2",
    promptTitle: "Skin Deep",
    date: "Last week",
    excerpt:
      "The flare started the Monday after the school holidays. Of course it did. I didn't sit down for two weeks.",
  },
];

// ---------------------------------------------------------------------------
// Resource library (placeholder content — no real media wired up)
// ---------------------------------------------------------------------------

export type Resource = {
  id: string;
  title: string;
  type: "Meditation" | "Breathwork" | "Book module" | "Audio" | "Reading";
  length: string;
  description: string;
  stageKey: string;
  locked: boolean;
};

export const RESOURCES: Resource[] = [
  {
    id: "settle",
    title: "A Place to Land: 8-minute settling practice",
    type: "Meditation",
    length: "8 min",
    description:
      "A short somatic practice for when your system is running hot. From the “When the Body Speaks” series.",
    stageKey: "body-speaks",
    locked: false,
  },
  {
    id: "breath-basics",
    title: "The Physiological Sigh",
    type: "Breathwork",
    length: "4 min",
    description: "The fastest evidence-based way to take the edge off a spike of stress.",
    stageKey: "body-speaks",
    locked: false,
  },
  {
    id: "unwritten-1",
    title: "Unwritten — Chapter 1: Lifting the Veil",
    type: "Book module",
    length: "Reading + reflection",
    description:
      "The masks and roles we wear, and how to begin recognising them. Paired with the “Roles We Play” journal.",
    stageKey: "identity-roles",
    locked: false,
  },
  {
    id: "declutter",
    title: "Declutter Your Space, Declutter Your Mind — Room One",
    type: "Book module",
    length: "Reading + practice",
    description: "Start with one drawer. What outer order can do for an overloaded inner world.",
    stageKey: "pattern-recognition",
    locked: false,
  },
  {
    id: "window",
    title: "Your Window of Tolerance",
    type: "Audio",
    length: "12 min",
    description: "Understanding the zone where you feel capable, and how to widen it gently.",
    stageKey: "pattern-recognition",
    locked: true,
  },
  {
    id: "boundaries",
    title: "The Honest No",
    type: "Breathwork",
    length: "10 min",
    description: "Regulating your body before, during and after setting a boundary.",
    stageKey: "identity-roles",
    locked: true,
  },
  {
    id: "receiving-practice",
    title: "Letting It In: a receiving practice",
    type: "Meditation",
    length: "15 min",
    description: "A practice for the body that reads rest, help and love as risk.",
    stageKey: "rewiring-receiving",
    locked: true,
  },
  {
    id: "wired",
    title: "Wired This Way — for the late-diagnosed mind",
    type: "Reading",
    length: "In development",
    description: "Bel's forthcoming work on ADHD and neurodivergence after 40.",
    stageKey: "integration",
    locked: true,
  },
];
