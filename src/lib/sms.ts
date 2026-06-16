/* ============================================================================
   SMS TEMPLATES — short, warm, and useful
   ============================================================================
   Keep each message under ~160 chars where possible (one segment). The
   pre-event reminder is the most important one — it's what people act on.
   ============================================================================ */

import { prettyPhone } from "./calendar-data";

export interface RsvpContext {
  eventTitle: string;
  eventDate: string; // "Monday, June 15"
  eventStart: string; // "6:00 PM"
  location: string;
  contactPhone?: string;
}

function longDate(iso: string) {
  const p = iso.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Sent immediately on a successful RSVP, if the user opted in to reminders. */
export function confirmationSms(ctx: RsvpContext): string {
  const base = `Sagkeeng Calendar: You're going to "${ctx.eventTitle}" — ${longDate(ctx.eventDate)} at ${ctx.eventStart}, ${ctx.location}.`;
  if (ctx.contactPhone) {
    return base + ` Questions? ${ctx.contactPhone}. Reply STOP to opt out.`;
  }
  return base + " Reply STOP to opt out.";
}

/** Sent `leadMin` minutes before the event. */
export function preEventSms(ctx: RsvpContext, leadMin: number): string {
  const lead = leadMin >= 60 ? `${Math.round(leadMin / 60)} hour` : `${leadMin} min`;
  return `Reminder: "${ctx.eventTitle}" starts in ${lead} — ${ctx.eventStart} at ${ctx.location}. See you there!`;
}

/** Sent when someone cancels their RSVP. */
export function cancellationSms(ctx: RsvpContext): string {
  return `Sagkeeng Calendar: You've cancelled your RSVP for "${ctx.eventTitle}" on ${longDate(ctx.eventDate)}. You can re-RSVP any time.`;
}

export { prettyPhone, longDate };
