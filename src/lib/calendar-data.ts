/* ============================================================================
   SAGKEENG COMMUNITY CALENDAR — Calendar data
   ============================================================================
   Ported from the original static site's EVENTS / NEWS / WORDS / FULL_MOONS /
   MOON_NAMES constants. This is the single source of truth for community
   events that aren't auto-generated (sweat lodge + full moon ceremonies are
   derived in buildAllEvents()).
   ============================================================================ */

export type Category = "culture" | "health" | "youth" | "elders" | "family" | "special";
export type Setting = "indoor" | "outdoor" | "";
export type Audience = "men" | "women" | "elders" | "parents" | "kids";

export interface RawEvent {
  date: string;            // YYYY-MM-DD
  start: string;           // "6:00 PM" or "Dusk"
  end?: string;            // optional
  title: string;
  location: string;
  setting: Setting;
  category: Category;
  department: Category;
  audience?: Audience[];
  contact?: string;
  info: string;
  spots?: number | null;
  featured?: boolean;
}

export const CATEGORIES: Record<Category, string> = {
  culture: "Culture",
  health: "Health",
  youth: "Youth",
  elders: "Elders",
  family: "Family",
  special: "Special",
};

export const DEPARTMENTS: Record<Category, { name: string }> = {
  culture: { name: "Cultural Department" },
  health: { name: "Health Centre" },
  youth: { name: "Youth Services" },
  elders: { name: "Elder Services" },
  family: { name: "Family Services" },
  special: { name: "Band Office" },
};

/* ── NEWS & NOTICES ──────────────────────────────────────────────────────── */
export interface NewsItem {
  type: "advisory" | "council" | "roads" | "jobs" | "health" | "culture";
  title: string;
  info: string;
  posted: string;
}

export const NEWS: NewsItem[] = [
  {
    type: "culture",
    title: "Grand prize announcement coming soon",
    info:
      "We're finalizing the grand prize for this year — stay tuned. RSVP for events now so you're entered when it drops!",
    posted: "Stay tuned",
  },
  {
    type: "advisory",
    title: "RSVP text reminders are live",
    info:
      "When you RSVP, opt in to a text reminder and we'll send you a message an hour before the event starts. Standard message rates may apply.",
    posted: "Just launched",
  },
];

/* ── CULTURAL CALENDAR — Full-moon dates & moon names ────────────────────── */
export const FULL_MOONS = [
  "2026-04-12",
  "2026-05-12",
  "2026-06-10",
  "2026-07-10",
  "2026-08-08",
  "2026-09-07",
  "2026-10-06",
];

export const MOON_NAMES: Record<number, { oji: string; en: string }> = {
  4: { oji: "Ziisbaakdoke Giizis", en: "Maple Sugar Moon" },
  5: { oji: "Zaagichii Giizis", en: "Budding Moon" },
  6: { oji: "Ode'imini Giizis", en: "Strawberry Moon" },
  7: { oji: "Aabita-niibino-giizis", en: "Halfway Summer Moon" },
  8: { oji: "Manoominike Giizis", en: "Wild Rice Moon" },
  9: { oji: "Waatebagaa Giizis", en: "Changing Leaves Moon" },
  10: { oji: "Binaakwe Giizis", en: "Falling Leaves Moon" },
};

/* ── WORD OF THE DAY — Rotates automatically ─────────────────────────────── */
export interface WordEntry {
  word: string;
  en: string;
  note: string;
}

export const WORDS: WordEntry[] = [
  { word: "Aaniin", en: "Hello", note: "A greeting used every day in our community" },
  { word: "Miigwech", en: "Thank you", note: "Expressing gratitude to those around us" },
  { word: "Zaagi'idiwin", en: "Love", note: "One of the Seven Grandfather Teachings" },
  { word: "Nibi", en: "Water", note: "Water is life — we protect it always" },
  { word: "Aki", en: "Earth / Land", note: "The land that sustains and connects us" },
  { word: "Ishkode", en: "Fire", note: "The sacred fire where we gather together" },
  { word: "Anishinaabe", en: "The People", note: "The original people of this land" },
  { word: "Mino-bimaadiziwin", en: "The Good Life", note: "Living in balance with all creation" },
  { word: "Nokomis", en: "Grandmother", note: "Our grandmothers carry the wisdom of nations" },
  { word: "Mishoomis", en: "Grandfather", note: "The Grandfather Teachings guide our path" },
  { word: "Manidoo", en: "Spirit / Creator", note: "The Great Spirit in all living things" },
  { word: "Makwa", en: "Bear", note: "The bear represents courage in our teachings" },
  { word: "Giizis", en: "Sun / Moon", note: "The celestial beings that mark our seasons" },
  { word: "Waaban", en: "Dawn / East", note: "The direction of new beginnings" },
];

/* ── EVENTS — the curated list (sweat lodge + full moons are added later) ── */
export const EVENTS: RawEvent[] = [
  {
    date: "2026-06-15", start: "5:00 PM", end: "7:00 PM",
    title: "Side-by-Side Rides", location: "Land-Based Program", setting: "outdoor",
    category: "youth", department: "youth", audience: ["youth", "kids"],
    contact: "(204) 367-2247",
    info: "Youth ride-along on the land — bring a helmet and water. Parents welcome to attend.",
    spots: 20,
  },
  {
    date: "2026-06-15", start: "9:00 AM", end: "5:00 PM",
    title: "PT/OT Services", location: "Jordan's Principle Building", setting: "indoor",
    category: "health", department: "health", audience: ["parents", "kids"],
    contact: "(204) 367-2247",
    info: "Drop-in physical & occupational therapy for children and families. No appointment needed.",
    spots: null,
  },
  {
    date: "2026-06-16", start: "9:00 AM", end: "5:00 PM",
    title: "PT/OT/SLP Services", location: "Jordan's Principle Building", setting: "indoor",
    category: "health", department: "health", audience: ["parents", "kids"],
    contact: "(204) 367-2247",
    info: "Physical, occupational, and speech-language pathology services. Walk-ins welcome.",
    spots: null,
  },
  {
    date: "2026-06-16", start: "5:00 PM", end: "7:00 PM",
    title: "Beading Group", location: "Land-Based Program", setting: "outdoor",
    category: "culture", department: "culture",
    contact: "(204) 367-2247",
    info: "Bring your beads and your stories — all skill levels welcome. Supplies available for beginners.",
    spots: 25,
  },
  {
    date: "2026-06-17", start: "5:00 PM", end: "7:00 PM",
    title: "Pontoon Fishing", location: "Land-Based Program", setting: "outdoor",
    category: "youth", department: "youth", audience: ["youth", "kids"],
    contact: "(204) 367-2247",
    info: "Youth fishing on the river. Rods and bait provided. Dress for the weather.",
    spots: 12,
  },
  {
    date: "2026-06-18", start: "5:00 PM", end: "7:00 PM",
    title: "Cultural Group", location: "Land-Based Program", setting: "outdoor",
    category: "culture", department: "culture",
    contact: "(204) 367-2247",
    info: "Weekly cultural gathering — teaching, sharing, and visiting on the land.",
    spots: 40,
  },
  {
    date: "2026-06-24", start: "9:00 AM", end: "4:00 PM",
    title: "Food Handlers Certification Training", location: "Band Hall", setting: "indoor",
    category: "health", department: "health",
    contact: "(204) 367-2247",
    info: "Full-day certification course. Lunch provided. Successful participants receive a recognized food handler certificate.",
    spots: 30, featured: true,
  },
  {
    date: "2026-06-25", start: "5:00 PM", end: "7:00 PM",
    title: "Pontoon Fishing", location: "Land-Based Program", setting: "outdoor",
    category: "youth", department: "youth", audience: ["youth", "kids"],
    contact: "(204) 367-2247",
    info: "Youth fishing on the river. Rods and bait provided.",
    spots: 12,
  },
  {
    date: "2026-06-29", start: "8:30 AM", end: "4:30 PM",
    title: "Wilderness First Aid Training", location: "Jordan's Principle Building", setting: "indoor",
    category: "health", department: "health",
    contact: "(204) 367-2247",
    info: "Two-day wilderness first aid certification. Open to community members 16+. Certificate valid for 3 years.",
    spots: 18, featured: true,
  },
  {
    date: "2026-06-30", start: "10:00 AM", end: "4:00 PM",
    title: "Pinawa Float Day", location: "Land-Based Program", setting: "outdoor",
    category: "youth", department: "youth", audience: ["youth"],
    contact: "(204) 367-2247",
    info: "Full-day river float at Pinawa. Bring sunscreen, a hat, and a towel. Lunch and transportation provided.",
    spots: 24,
  },
];

/* ── AUTO-GENERATED EVENTS ────────────────────────────────────────────────── */

export interface NormalizedEvent extends RawEvent {
  id: string;
  moon: boolean;
  recurring: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

let _id = 0;
function normalize(e: RawEvent & { moon?: boolean; recurring?: boolean }): NormalizedEvent {
  return {
    id: "ev" + _id++,
    date: e.date,
    start: e.start || "",
    end: e.end || "",
    title: e.title || "Untitled event",
    location: e.location || "Location TBA",
    setting: (e.setting || "").toLowerCase() as Setting,
    category: (e.category || "special").toLowerCase() as Category,
    department: (e.department || e.category || "special").toLowerCase() as Category,
    audience: Array.isArray(e.audience) ? e.audience.map((a) => String(a).toLowerCase() as Audience) : [],
    contact: e.contact || "",
    info: e.info || "",
    spots: e.spots ?? null,
    featured: !!e.featured,
    moon: !!e.moon,
    recurring: !!e.recurring,
  };
}

function safeNormalize(raw: (RawEvent & { moon?: boolean; recurring?: boolean })[]) {
  const out: NormalizedEvent[] = [];
  (raw || []).forEach((e, i) => {
    if (!e || !e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !e.title) {
      console.warn("Skipping invalid event at position " + i, e);
      return;
    }
    out.push(normalize(e));
  });
  return out;
}

function minutesUntil(date: string, time: string) {
  if (!time || time === "Dusk") return Infinity;
  const p = date.split("-").map(Number);
  const isPM = /pm/i.test(time), isAM = /am/i.test(time);
  const t = time.replace(/[^\d:]/g, "").split(":");
  const h = parseInt(t[0], 10), min = parseInt(t[1] || "0", 10);
  let hh = h;
  if (isPM && h !== 12) hh += 12;
  if (isAM && h === 12) hh = 0;
  return Math.round((new Date(p[0], p[1] - 1, p[2], hh, min).getTime() - Date.now()) / 60000);
}

function sortEvents(list: NormalizedEvent[]) {
  return list.sort((a, b) =>
    a.date.localeCompare(b.date) || minutesUntil(a.date, a.start) - minutesUntil(b.date, b.start),
  );
}

/** Build the full event list: curated EVENTS + weekly sweat lodges + full-moon ceremonies. */
export function buildAllEvents(): NormalizedEvent[] {
  const list = safeNormalize(EVENTS);
  // Weekly Sweat Lodge — Thursdays, April–September 2026
  for (let mo = 3; mo <= 8; mo++) {
    const dim = daysInMonth(2026, mo);
    for (let day = 1; day <= dim; day++) {
      if (new Date(2026, mo, day).getDay() === 4) {
        list.push(
          normalize({
            date: "2026-" + pad(mo + 1) + "-" + pad(day),
            start: "7:00 PM", end: "10:00 PM",
            title: "Sweat Lodge Ceremony", location: "Sacred Grounds", setting: "outdoor",
            category: "culture", department: "culture", contact: "204-367-2290",
            info: "Weekly sweat lodge. Open to all community members. Come with a good heart.",
            spots: 12, recurring: true,
          }),
        );
      }
    }
  }
  // Full Moon Ceremonies
  FULL_MOONS.forEach((date) => {
    const mo = parseInt(date.split("-")[1], 10);
    const moon = MOON_NAMES[mo];
    list.push(
      normalize({
        date, start: "Dusk", end: "",
        title: "Full Moon Ceremony" + (moon ? " — " + moon.oji : ""),
        location: "Sacred Grounds", setting: "outdoor", category: "culture", department: "culture",
        contact: "204-367-2290",
        info: moon ? moon.oji + " (" + moon.en + "). All are welcome." : "Full moon gathering.",
        moon: true,
      }),
    );
  });
  return sortEvents(list);
}

/** A stable slug for an event — used as the eventId in the RSVP table. */
export function eventIdSlug(e: NormalizedEvent | RawEvent) {
  return e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + e.date;
}

/** Validate a North American phone number (NANP). Rejects garbage. */
export function validPhone(raw: string) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return false;
  if (d.charAt(0) < "2" || d.charAt(3) < "2") return false;
  if (/^(\d)\1{9}$/.test(d)) return false;
  if (d === "1234567890" || d === "0123456789") return false;
  if (d.slice(3, 6) === "555" && d.slice(6, 8) === "01") return false;
  return true;
}

/** Normalize to E.164 for Twilio. */
export function toE164(raw: string) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return raw; // let Twilio reject if invalid
  return "+1" + d;
}

/** Pretty-print a phone for display: (204) 367-2290 */
export function prettyPhone(raw: string) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return raw;
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

/** Parse "6:00 PM" on a YYYY-MM-DD date → a real Date object. Returns null for "Dusk". */
export function eventDateTime(date: string, time: string) {
  if (!time || time === "Dusk") {
    // Approximate dusk as 8:30 PM in summer for Sagkeeng
    const p = date.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], 20, 30);
  }
  const p = date.split("-").map(Number);
  const isPM = /pm/i.test(time), isAM = /am/i.test(time);
  const t = time.replace(/[^\d:]/g, "").split(":");
  let h = parseInt(t[0], 10);
  const min = parseInt(t[1] || "0", 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return new Date(p[0], p[1] - 1, p[2], h, min);
}
