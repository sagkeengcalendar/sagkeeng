/* ============================================================================
   Client-side calendar helpers — date formatting, event filtering, etc.
   ============================================================================ */

import type { NormalizedEvent, Audience } from "@/lib/calendar-data";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function iso(d: Date) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
export function todayISO() {
  return iso(new Date());
}
export function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
export function firstWeekday(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}
export function parseDate(s: string) {
  const p = s.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}
export function longDate(s: string) {
  return parseDate(s).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
export function shortDate(s: string) {
  return parseDate(s).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
export function weekday(s: string) {
  return parseDate(s).toLocaleDateString("en-CA", { weekday: "short" });
}
export function dayNum(s: string) {
  return parseDate(s).getDate();
}

export function minutesUntil(date: string, time: string) {
  if (!time || time === "Dusk") return Infinity;
  const p = date.split("-").map(Number);
  const isPM = /pm/i.test(time);
  const isAM = /am/i.test(time);
  const t = time.replace(/[^\d:]/g, "").split(":");
  let h = parseInt(t[0], 10);
  const min = parseInt(t[1] || "0", 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return Math.round(
    (new Date(p[0], p[1] - 1, p[2], h, min).getTime() - Date.now()) / 60000,
  );
}

export function weekEndISO() {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return iso(d);
}

export function esc(s: string) {
  return (s || "").replace(/"/g, "&quot;");
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type PersonaKey = "men" | "women" | "elders" | "parents";

export const PERSONAS: Record<
  PersonaKey,
  { label: string; match: Audience[] }
> = {
  men: { label: "A man", match: ["men"] },
  women: { label: "A woman", match: ["women"] },
  elders: { label: "An Elder", match: ["elders"] },
  parents: { label: "Parent & kids", match: ["parents", "kids"] },
};

export function audienceMatch(e: NormalizedEvent, persona: PersonaKey | null) {
  if (!persona) return true;
  if (!e.audience.length) return true; // untagged = everyone
  const want = PERSONAS[persona].match;
  return e.audience.some((a) => want.includes(a));
}

/** WMO weather code → human label. */
export function wmo(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorms";
  return "Partly cloudy";
}

/** localStorage helpers that never crash in private mode. */
export function store(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}
export function read(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
