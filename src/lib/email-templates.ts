export interface SupervisorEmailContext {
  supervisorName: string;
  eventTitle: string;
  eventDate: string;
  eventStart: string;
  eventEnd: string;
  location: string;
  departmentName: string;
  communityName: string;
  attendees: Array<{ name: string; phone: string; partySize: number; attendees: string }>;
  totalAttending: number;
  reminderOptIns: number;
}

function longDate(iso: string) {
  const p = iso.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function supervisorPreEventEmail(ctx: SupervisorEmailContext): { subject: string; body: string } {
  const subject = `RSVP list for tomorrow: ${ctx.eventTitle} (${ctx.totalAttending} attending)`;
  const attendeeLines = ctx.attendees.length
    ? ctx.attendees.map((a) => `  • ${a.name} — ${a.phone} (party of ${a.partySize}${a.attendees ? `, ${a.attendees}` : ""})`).join("\n")
    : "  (No RSVPs yet)";
  const body = `Hello ${ctx.supervisorName},

This is a reminder from the miina community calendar that your department has an event tomorrow:

  Event:      ${ctx.eventTitle}
  When:       ${longDate(ctx.eventDate)} at ${ctx.eventStart}${ctx.eventEnd ? ` – ${ctx.eventEnd}` : ""}
  Where:      ${ctx.location}
  Department: ${ctx.departmentName}
  Community:  ${ctx.communityName}

RSVP summary:
  Total attending: ${ctx.totalAttending}
  Text reminders opted in: ${ctx.reminderOptIns}

Attendee list:
${attendeeLines}

View the full RSVP list anytime at: https://miina.ca/admin/rsvps

— miina community calendar
miinawaa · again and again
`;
  return { subject, body };
}
