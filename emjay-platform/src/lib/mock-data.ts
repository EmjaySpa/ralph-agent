/**
 * MOCK / DEMO DATA ONLY.
 *
 * Everything here is fabricated for the demo. The pattern insights are
 * hand-written illustrations, clearly labelled "Demo insight" in the UI, not
 * generated from real analysis. Nothing persists. Replace with a real data
 * layer, auth and insight engine before launch. Search for TODO.
 */

export const DEMO_USER = {
  firstName: "Bel",
  memberSince: "March 2026",
  currentModuleIndex: 1, // 0-based -> "Breathwork" is the current module
  // Deliberately no streaks, no counts-as-pressure. Trauma-informed by design.
} as const;

// ---------------------------------------------------------------------------
// Daily check-in
// ---------------------------------------------------------------------------

export type MetricKey = "sleep" | "mood" | "energy" | "stress" | "skin";

export type Metric = {
  key: MetricKey;
  label: string;
  low: string;
  high: string;
  emoji: string;
};

export const CHECKIN_METRICS: Metric[] = [
  { key: "sleep", label: "Sleep", low: "Wired and broken", high: "Deep and restful", emoji: "🌙" },
  { key: "mood", label: "Mood", low: "Flat or low", high: "Steady or bright", emoji: "🫧" },
  { key: "energy", label: "Energy", low: "Running on empty", high: "Full tank", emoji: "🔋" },
  { key: "stress", label: "Stress load", low: "At my limit", high: "Spacious", emoji: "🌊" },
  { key: "skin", label: "Skin", low: "Reactive or flaring", high: "Calm and clear", emoji: "✨" },
];

export const BODY_SENSATIONS = [
  "Tight chest",
  "Clenched jaw",
  "Shoulders up",
  "Shallow breath",
  "Gut in knots",
  "Buzzy or restless",
  "Heavy or foggy",
  "Settled",
] as const;

export const MENOPAUSE_SYMPTOMS = [
  "Hot flushes",
  "Night sweats",
  "Brain fog",
  "Joint aches",
  "Anxiety or racing",
  "Low libido",
  "Broken sleep",
  "Irritability",
] as const;

export const CYCLE_STATES = [
  "Not tracking",
  "Follicular",
  "Ovulating",
  "Luteal",
  "Bleeding",
  "Irregular or skipped",
  "Post-menopause",
] as const;

export type CheckinDay = {
  day: string;
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
// Pattern insights (ILLUSTRATIVE - clearly labelled "Demo insight" in the UI)
// ---------------------------------------------------------------------------

export type Insight = {
  id: string;
  headline: string;
  body: string;
  tag: "skin" | "stress" | "sleep" | "energy" | "identity";
};

export const DEMO_INSIGHTS: Insight[] = [
  {
    id: "skin-stress",
    headline: "Your skin appears more reactive in weeks where stress check-ins are higher.",
    body: "Across the last two months, your lowest skin days tended to follow your highest stress weeks by around two to three weeks. Your skin may be showing the load after your body has been carrying it for a while.",
    tag: "skin",
  },
  {
    id: "responsible-energy",
    headline: "You mention feeling responsible often, and it tends to land just before low-energy days.",
    body: "The word “responsible” has come up in several journal entries, usually a day or two before your lowest energy check-ins. It might be worth noticing what you took on in those stretches.",
    tag: "energy",
  },
  {
    id: "breath-sleep",
    headline: "Sleep seems steadier in the days after an evening breathwork entry.",
    body: "On the nights that followed a logged breathwork practice, your sleep scores were a little higher on average. A small thing, but a consistent one so far.",
    tag: "sleep",
  },
  {
    id: "sunday-dip",
    headline: "Sundays are quietly your hardest night.",
    body: "Your sleep and stress scores dip most on Sunday evenings, more than any weeknight. A gentler Sunday wind-down might be worth a try.",
    tag: "stress",
  },
];

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export type JournalPrompt = {
  id: string;
  title: string;
  intro: string;
  questions: string[];
};

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  {
    id: "roles-we-play",
    title: "Roles We Play",
    intro:
      "The strong one. The peacemaker. The one who holds it all together. These roles protected you once. A gentle look at what they cost now.",
    questions: [
      "Which role do you slip into most automatically?",
      "Who taught you that this role kept you safe?",
      "What would you need to trust to set it down, even for an afternoon?",
    ],
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
  },
  {
    id: "body-need",
    title: "What does my body need today?",
    intro: "Not what your to-do list needs. Not what everyone else needs. Your body. Right now.",
    questions: [
      "If your body could pick one thing for today, what would it be?",
      "What is it asking for that you usually override?",
      "What is one small way you could give it a little of that?",
    ],
  },
  {
    id: "not-mine",
    title: "What am I carrying that is not mine?",
    intro: "Some of the weight you carry was handed to you. A page for putting a few things down.",
    questions: [
      "Whose worry are you holding that was never really yours?",
      "What would change if you handed it back, even in your mind?",
      "What is actually yours to carry today, and what is not?",
    ],
  },
  {
    id: "im-fine",
    title: "Where have I been saying “I’m fine” when I’m actually cooked?",
    intro: "You are allowed to be honest here. No one is checking. No one is scoring you.",
    questions: [
      "Where did “I’m fine” come out of your mouth this week when it was not true?",
      "What were you protecting by saying it?",
      "What would you have said if you had told the whole truth?",
    ],
  },
];

export const DEMO_JOURNAL_ENTRIES = [
  {
    id: "e1",
    promptTitle: "Roles We Play",
    date: "2 days ago",
    excerpt:
      "I became “the strong one” the second Mum got sick. Nobody asked me to. I just stepped in and never stepped out.",
  },
  {
    id: "e2",
    promptTitle: "Skin Deep",
    date: "Last week",
    excerpt:
      "The flare started the Monday after the school holidays. Of course it did. I did not sit down for two weeks.",
  },
  {
    id: "e3",
    promptTitle: "Where have I been saying “I’m fine”",
    date: "Last week",
    excerpt: "Told the GP I was fine. Told my sister I was fine. I am not fine. I am cooked, honestly.",
  },
];

// ---------------------------------------------------------------------------
// Resource library
// ---------------------------------------------------------------------------

export type Resource = {
  id: string;
  title: string;
  length: string;
  description: string;
  locked?: boolean;
};

export type ResourceSection = {
  key: string;
  title: string;
  emoji: string;
  blurb: string;
  items: Resource[];
};

export const RESOURCE_SECTIONS: ResourceSection[] = [
  {
    key: "meditations",
    title: "Meditations",
    emoji: "🕯️",
    blurb: "Short, unfussy practices to help your system settle.",
    items: [
      { id: "land", title: "A Place to Land", length: "8 min", description: "For when your system is running hot." },
      { id: "evening", title: "Putting the Day Down", length: "10 min", description: "An evening wind-down that is not precious about it." },
    ],
  },
  {
    key: "breathwork",
    title: "Breathwork",
    emoji: "🌬️",
    blurb: "Practical ways to change your state in a minute or two.",
    items: [
      { id: "sigh", title: "The Physiological Sigh", length: "4 min", description: "The fastest way to take the edge off a spike." },
      { id: "box", title: "Box Breathing, Plainly", length: "6 min", description: "No mysticism required." },
    ],
  },
  {
    key: "somatic",
    title: "Somatic practices",
    emoji: "🤲",
    blurb: "Small movements to help you feel safer in your body.",
    items: [
      { id: "orient", title: "Orienting to the Room", length: "5 min", description: "Letting your body notice it is safe right now." },
      { id: "shake", title: "Shake It Off, Literally", length: "7 min", description: "Discharging stress the way animals do.", locked: true },
    ],
  },
  {
    key: "books",
    title: "Book modules",
    emoji: "📖",
    blurb: "Chapters from Bel’s books, turned into gentle modules.",
    items: [
      { id: "unwritten-1", title: "Unwritten · Lifting the Veil", length: "Reading + reflection", description: "The masks and roles we wear." },
      { id: "declutter-1", title: "Declutter · Room One", length: "Reading + practice", description: "Start with one drawer." },
    ],
  },
  {
    key: "worksheets",
    title: "Worksheets",
    emoji: "📝",
    blurb: "Simple pages to work things out on.",
    items: [
      { id: "no", title: "The Honest No", length: "1 page", description: "Scripting a boundary before you need it." },
      { id: "map", title: "My Warning Signs Map", length: "1 page", description: "Spotting your own early signals." },
    ],
  },
  {
    key: "emergency",
    title: "Emergency toolkit",
    emoji: "🧰",
    blurb: "For the hard moments. Kept short on purpose.",
    items: [
      { id: "5things", title: "Five Things Right Now", length: "2 min", description: "A grounding practice for when it is all too much." },
      { id: "support", title: "Who To Call", length: "Read", description: "Real-people support, gathered in one place." },
    ],
  },
  {
    key: "skin",
    title: "Skin and nervous system education",
    emoji: "🌿",
    blurb: "How stress and skin talk to each other.",
    items: [
      { id: "skin-stress", title: "Why Stress Shows Up On Your Face", length: "8 min read", description: "The skin and nervous system link, plainly." },
    ],
  },
  {
    key: "menopause",
    title: "Menopause support",
    emoji: "🔥",
    blurb: "What is happening, and what helps.",
    items: [
      { id: "peri", title: "Perimenopause, Burnout, or Both", length: "10 min read", description: "Telling the difference, and why it matters.", locked: true },
    ],
  },
  {
    key: "adhd",
    title: "ADHD-friendly resources",
    emoji: "🧠",
    blurb: "For the late-identified mind. Low-demand by design.",
    items: [
      { id: "wired", title: "Wired This Way · First Look", length: "Reading", description: "ADHD after 40, without the shame.", locked: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Life Vault
// ---------------------------------------------------------------------------

export type VaultSection = {
  key: string;
  title: string;
  emoji: string;
  count: string;
  latest: string;
};

export const VAULT_SECTIONS: VaultSection[] = [
  { key: "story", title: "My Story", emoji: "📔", count: "1 living page", latest: "Updated last week" },
  { key: "journal", title: "My Journal", emoji: "✍️", count: "12 entries", latest: "2 days ago" },
  { key: "checkins", title: "My Check-ins", emoji: "🌤️", count: "34 check-ins", latest: "Today" },
  { key: "body", title: "My Body", emoji: "🫀", count: "Notes and sensations", latest: "This week" },
  { key: "skin", title: "My Skin", emoji: "✨", count: "6 photos, 4 notes", latest: "Last week" },
  { key: "timeline", title: "My Timeline", emoji: "🧵", count: "9 life events", latest: "This month" },
  { key: "insights", title: "My Saved Insights", emoji: "💡", count: "3 saved", latest: "Last week" },
  { key: "resources", title: "My Resources", emoji: "📚", count: "5 saved", latest: "This week" },
  { key: "treatments", title: "My Treatments", emoji: "💆", count: "3 visits", latest: "June 2026" },
  { key: "books", title: "My Books", emoji: "📖", count: "2 in progress", latest: "This week" },
  { key: "companion", title: "My Companion Memories", emoji: "🤍", count: "2 saved", latest: "Yesterday" },
];

export const TIMELINE_EVENTS = [
  { date: "2026", title: "Started The Practice", note: "Decided to put my whole story in one place." },
  { date: "2025", title: "Mum’s diagnosis", note: "Became the one holding it together." },
  { date: "2024", title: "Perimenopause began", note: "Sleep and skin changed. Took a while to name it." },
  { date: "2019", title: "Youngest left home", note: "Quieter house. Louder head." },
];

export const TREATMENTS = [
  { date: "12 June 2026", name: "Skin therapy facial", note: "Barrier repair focus. Skin was reactive." },
  { date: "2 May 2026", name: "Nervous system support session", note: "Somatic settling. Big exhale afterwards." },
  { date: "8 April 2026", name: "Skin therapy facial", note: "First visit. Talked about stress and flares." },
];

// ---------------------------------------------------------------------------
// Privacy dashboard
// ---------------------------------------------------------------------------

export const SAVE_STATUS = [
  { label: "Daily check-ins", saved: true, note: "Saved to your Life Vault" },
  { label: "Journal entries", saved: true, note: "Saved only when you tap save" },
  { label: "Skin photos", saved: true, note: "Private to you, stored in your Vault" },
  { label: "Companion chats", saved: false, note: "Temporary by default. Nothing kept unless you choose to" },
  { label: "Pattern insights", saved: true, note: "Only the ones you have saved" },
];

export type AuditEntry = { when: string; text: string; kind: "you" | "companion" | "system" };

export const AUDIT_LOG: AuditEntry[] = [
  { when: "Today, 8:12am", text: "You saved a journal entry.", kind: "you" },
  { when: "Yesterday, 9:40pm", text: "Companion accessed your saved insights to answer your question.", kind: "companion" },
  { when: "Yesterday, 9:38pm", text: "You started a Companion chat. Memory was set to temporary.", kind: "you" },
  { when: "3 days ago", text: "You deleted a saved insight.", kind: "you" },
  { when: "Last week", text: "You exported your data.", kind: "you" },
  { when: "Last week", text: "System backup completed. Your data stays in Emjay-controlled storage.", kind: "system" },
];

// ---------------------------------------------------------------------------
// Companion (mock chat)
// ---------------------------------------------------------------------------

export const COMPANION_STARTERS = [
  "I’m wired but exhausted and I don’t know why.",
  "Help me get my head straight before I see my GP.",
  "I keep saying yes when I want to say no.",
  "My skin is flaring again and I’m over it.",
];

export type ChatTurn = { role: "user" | "companion"; text: string };

// A scripted exchange used to demo the Companion's tone and boundaries.
export const COMPANION_SCRIPT: ChatTurn[] = [
  {
    role: "user",
    text: "I’m so wired but exhausted and honestly a bit over it all.",
  },
  {
    role: "companion",
    text: "Yeah, that combination is rough, and it is more common than you would think. Wired and exhausted at the same time usually means your system has been running on stress for a while and does not quite trust that it is safe to rest yet. That is not you being dramatic or lazy. It is your body doing exactly what it learned to do.\n\nCan I ask, has this week asked a lot of you?",
  },
  {
    role: "user",
    text: "Yeah. Work has been full on and Mum’s not well again.",
  },
  {
    role: "companion",
    text: "Of course you are wired then. You are holding work and holding your Mum, and your body is staying switched on so it can keep up. That makes complete sense.\n\nHere is a small thing, not a fix, just a start. If you have two minutes, the “A Place to Land” practice in your library is made for exactly this. And it might be worth noticing in your next check-in whether the word “responsible” keeps showing up, because your saved entries mention it a fair bit before your low days.\n\nWhat feels like the most manageable next step for you right now?",
  },
];

export const COMPANION_SAVE_OPTIONS = [
  { id: "nothing", label: "Save nothing", note: "This chat disappears when you leave.", tone: "neutral" as const },
  { id: "transcript", label: "Save full transcript", note: "Keep the whole conversation in your Vault." },
  { id: "insights", label: "Save key insights only", note: "Just the useful bits, in your own review." },
  { id: "journal", label: "Save as journal entry", note: "Turn this into a journal page." },
  { id: "timeline", label: "Add to timeline", note: "Mark this moment on your story." },
  { id: "goals", label: "Add to goals", note: "Carry a next step forward." },
  { id: "delete", label: "Delete conversation", note: "Remove it now.", tone: "danger" as const },
];
