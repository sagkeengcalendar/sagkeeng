/* ============================================================================
   SMS TEMPLATES — short, warm, and useful
   ============================================================================
   Keep each message under ~160 chars where possible (one segment). The
   pre-event reminder is the most important one — it's what people act on.

   Reminder schedule (per opted-in RSVP):
     1. confirmation   — sent immediately on RSVP
     2. pre-event-1d   — sent ~24 hours before the event
     3. pre-event-1h   — sent ~1 hour before the event
     4. digest         — sent Sunday 6pm, summarizes the upcoming week
   ============================================================================ */

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

function shortDate(iso: string) {
  const p = iso.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** 1. Sent immediately on a successful RSVP, if the user opted in to reminders. */
export function confirmationSms(ctx: RsvpContext): string {
  const base = `Sagkeeng Calendar: You're going to "${ctx.eventTitle}" — ${longDate(ctx.eventDate)} at ${ctx.eventStart}, ${ctx.location}.`;
  if (ctx.contactPhone) {
    return base + ` Questions? ${ctx.contactPhone}. Reply STOP to opt out.`;
  }
  return base + " Reply STOP to opt out.";
}

/** 2. Sent ~24 hours before the event. */
export function preEvent1DaySms(ctx: RsvpContext): string {
  return `Sagkeeng reminder: "${ctx.eventTitle}" is tomorrow at ${ctx.eventStart}, ${ctx.location}. See you there! Reply STOP to opt out.`;
}

/** 3. Sent ~1 hour before the event. */
export function preEvent1HourSms(ctx: RsvpContext): string {
  return `Sagkeeng reminder: "${ctx.eventTitle}" starts in 1 hour — ${ctx.eventStart} at ${ctx.location}. See you there!`;
}

/** 4. Sunday digest — summarizes upcoming events for the week. */
export function weeklyDigestSms(
  recipientName: string,
  events: Array<{ title: string; dateIso: string; start: string; location: string }>,
): string {
  if (events.length === 0) {
    return `Sagkeeng Calendar: You have no events RSVP'd for the week ahead. Browse the calendar any time. Reply STOP to opt out.`;
  }
  const count = events.length;
  const first = events[0];
  const header = `Sagkeeng Calendar: ${recipientName}, you have ${count} event${count > 1 ? "s" : ""} this week:`;
  // List up to 3 events, each on its own line, kept short
  const lines = events.slice(0, 3).map((e) => {
    return `• ${shortDate(e.dateIso)} ${e.start} — ${e.title}`;
  });
  const more = events.length > 3 ? `\n(+${events.length - 3} more)` : "";
  return `${header}\n${lines.join("\n")}${more}\nReply STOP to opt out.`;
}

/** Sent when someone cancels their RSVP. */
export function cancellationSms(ctx: RsvpContext): string {
  return `Sagkeeng Calendar: You've cancelled your RSVP for "${ctx.eventTitle}" on ${longDate(ctx.eventDate)}. You can re-RSVP any time.`;
}

export { longDate, shortDate };
