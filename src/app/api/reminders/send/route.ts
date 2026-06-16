import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { preEventSms } from "@/lib/sms";
import { eventDateTime } from "@/lib/calendar-data";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/send
 *
 * Called on a schedule (e.g. every 15 minutes) by a cron service. Finds every
 * non-cancelled RSVP that:
 *   - opted in to reminders
 *   - has an event starting within the next `windowMin` minutes (default 90)
 *   - has NOT yet received a "pre-event" reminder for this event
 * and sends the SMS, logging each attempt.
 *
 * Auth: a shared secret in the `x-cron-secret` header, compared to the
 * CRON_SECRET env var. If CRON_SECRET is unset, the endpoint refuses to run
 * (so a misconfigured deploy can't accidentally spam people).
 *
 * Example cron (set up outside the app, runs every 15 min):
 *   curl -X POST https://your-site/api/reminders/send \
 *     -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not set — refusing to run." },
      { status: 503 },
    );
  }
  const got = req.headers.get("x-cron-secret");
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const windowMin = Math.max(15, Math.min(24 * 60, parseInt(url.searchParams.get("windowMin") || "90", 10)));
  const now = new Date();
  const horizon = new Date(now.getTime() + windowMin * 60_000);

  // Find candidate RSVPs
  const candidates = await db.rsvp.findMany({
    where: {
      cancelled: false,
      reminderOptIn: true,
      // eventDate is YYYY-MM-DD — narrow by string range first
      eventDate: { gte: now.toISOString().slice(0, 10) },
    },
    include: { reminders: true },
  });

  const sent: { rsvpId: string; to: string; status: string }[] = [];
  const skipped: { rsvpId: string; reason: string }[] = [];

  for (const rsvp of candidates) {
    const startOnly = rsvp.eventStart.split(" – ")[0] || rsvp.eventStart;
    const eventAt = eventDateTime(rsvp.eventDate, startOnly);

    // Skip if event is in the past or beyond our window
    if (eventAt < now) {
      skipped.push({ rsvpId: rsvp.id, reason: "event already started" });
      continue;
    }
    if (eventAt > horizon) {
      skipped.push({ rsvpId: rsvp.id, reason: "beyond window" });
      continue;
    }

    // Skip if we already sent a pre-event reminder for this RSVP
    const alreadySent = rsvp.reminders.some(
      (r) => r.kind === "pre-event" && r.status === "sent",
    );
    if (alreadySent) {
      skipped.push({ rsvpId: rsvp.id, reason: "already reminded" });
      continue;
    }

    // Send the reminder
    const msg = preEventSms(
      {
        eventTitle: rsvp.eventTitle,
        eventDate: rsvp.eventDate,
        eventStart: startOnly,
        location: rsvp.location,
      },
      rsvp.reminderLeadMin,
    );
    const result = await sendSms(rsvp.phone, msg);

    await db.reminderLog.create({
      data: {
        rsvpId: rsvp.id,
        kind: "pre-event",
        eventAt,
        status: result.status === "demo" ? "sent" : result.status,
        providerSid: result.providerSid,
        error: result.error,
        body: result.body,
      },
    });

    sent.push({ rsvpId: rsvp.id, to: rsvp.phone, status: result.status });
  }

  return NextResponse.json({
    ok: true,
    windowMin,
    checked: candidates.length,
    sent: sent.length,
    skipped: skipped.length,
    sentDetail: sent,
    skippedDetail: skipped,
  });
}

/** GET /api/reminders/send — quick health check for the cron config. */
export async function GET() {
  const configured = !!process.env.CRON_SECRET;
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  return NextResponse.json({
    ok: true,
    cronSecretConfigured: configured,
    twilioConfigured,
    mode: twilioConfigured ? "live" : "demo",
    instructions: configured
      ? "POST with header x-cron-secret to send reminders."
      : "Set CRON_SECRET env var to enable.",
  });
}
