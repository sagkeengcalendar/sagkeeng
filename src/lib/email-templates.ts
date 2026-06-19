export interface SupervisorEmailContext {
  supervisorName: string; eventTitle: string; eventDate: string; eventStart: string; eventEnd: string; location: string; departmentName: string; communityName: string;
  attendees: Array<{ name: string; phone: string; partySize: number; attendees: string }>;
  totalAttending: number; reminderOptIns: number;
}
function longDate(iso: string) { const p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
export function supervisorPreEventEmail(ctx: SupervisorEmailContext): { subject: string; body: string } {
  const subject = `RSVP list for tomorrow: ${ctx.eventTitle} (${ctx.totalAttending} attending)`;
  const attendeeLines = ctx.attendees.length ? ctx.attendees.map((a) => `  • ${a.name} — ${a.phone} (party of ${a.partySize}${a.attendees ? `, ${a.attendees}` : ""})`).join("\n") : "  (No RSVPs yet)";
  const body = `Hello ${ctx.supervisorName},\n\nThis is a reminder from the miina community calendar that your department has an event tomorrow:\n\n  Event:      ${ctx.eventTitle}\n  When:       ${longDate(ctx.eventDate)} at ${ctx.eventStart}${ctx.eventEnd ? ` – ${ctx.eventEnd}` : ""}\n  Where:      ${ctx.location}\n  Department: ${ctx.departmentName}\n  Community:  ${ctx.communityName}\n\nRSVP summary:\n  Total attending: ${ctx.totalAttending}\n  Text reminders opted in: ${ctx.reminderOptIns}\n\nAttendee list:\n${attendeeLines}\n\nView full RSVP list: https://miina.ca/admin/rsvps\n\n— miina community calendar\nmiinawaa · again and again\n`;
  return { subject, body };
}
