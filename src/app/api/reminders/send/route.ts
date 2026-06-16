import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { preEvent1DaySms, preEvent1HourSms } from "@/lib/sms";
import { eventDateTime } from "@/lib/calendar-data";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/send
 *
 * Called on a schedule (every 15 minutes) by a cron service. For each opted-in
 * RSVP, checks if the event falls in either reminder window:
 *
 *   • 1-day window:  event starts in 23–25 hours  → sends "pre-event-1d" SMS
 *   • 1-hour window: event starts in 45–75 minutes → sends "pre-event-1h" SMS
 *
 * Idempotent: each (rsvpId, kind) pair is only ever sent once. The ReminderLog
 * table is the source of truth — if we already logged a "sent" row for that
 * kind on this RSVP, we skip it.
 *
 * Auth: shared secret in the `x-cron-secret` header, compared to CRON_SECRET
 * env var. If CRON_SECRET is unset, the endpoint refuses to run.
 *
 * Example cron (runs every 15 min):
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

  const now = new Date();

  // Two reminder windows. We use ±buffer to be tolerant of cron timing
  // (cron may run a few min late, and we don't want to miss the window).
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const BUFFER_MS = 15 * 60 * 1000; // ±15 min tolerance

  const dayWindowStart = new Date(now.getTime() + ONE_DAY_MS - BUFFER_MS);
  const dayWindowEnd = new Date(now.getTime() + ONE_DAY_MS + BUFFER_MS);
  const hourWindowStart = new Date(now.getTime() + ONE_HOUR_MS - BUFFER_MS);
  const hourWindowEnd = new Date(now.getTime() + ONE_HOUR_MS + BUFFER_MS);

  // Far horizon: don't even consider events more than 2 days out (saves a query)
  const farHorizon = new Date(now.getTime() + 2 * ONE_DAY_MS);

  // Find candidate RSVPs — opted in, not cancelled, event in the next 2 days
  const candidates = await db.rsvp.findMany({
    where: {
      cancelled: false,
      reminderOptIn: true,
      eventDate: { gte: now.toISOString().slice(0, 10) },
    },
    include: { reminders: true },
  });

  const sent1d: { rsvpId: string; to: string; status: string }[] = [];
  const sent1h: { rsvpId: string; to: string; status: string }[] = [];
  const skipped: { rsvpId: string; reason: string }[] = [];

  for (const rsvp of candidates) {
    const startOnly = rsvp.eventStart.split(" – ")[0] || rsvp.eventStart;
    const eventAt = eventDateTime(rsvp.eventDate, startOnly);

    // Skip events in the past or beyond 2 days
    if (eventAt < now) {
      skipped.push({ rsvpId: rsvp.id, reason: "event already started" });
      continue;
    }
    if (eventAt > farHorizon) {
      skipped.push({ rsvpId: rsvp.id, reason: "beyond 2-day horizon" });
      continue;
    }

    const ctx = {
      eventTitle: rsvp.eventTitle,
      eventDate: rsvp.eventDate,
      eventStart: startOnly,
      location: rsvp.location,
    };

    // 1-day reminder
    const alreadySent1d = rsvp.reminders.some(
      (r) => r.kind === "pre-event-1d" && r.status === "sent",
    );
    if (!alreadySent1d && eventAt >= dayWindowStart && eventAt <= dayWindowEnd) {
      const msg = preEvent1DaySms(ctx);
      const result = await sendSms(rsvp.phone, msg);
      await db.reminderLog.create({
        data: {
          rsvpId: rsvp.id,
          kind: "pre-event-1d",
          eventAt,
          status: result.status === "demo" ? "sent" : result.status,
          providerSid: result.providerSid,
          error: result.error,
          body: result.body,
        },
      });
      sent1d.push({ rsvpId: rsvp.id, to: rsvp.phone, status: result.status });
      continue; // don't also send the 1-hour reminder in the same pass
    }

    // 1-hour reminder
    const alreadySent1h = rsvp.reminders.some(
      (r) => r.kind === "pre-event-1h" && r.status === "sent",
    );
    if (!alreadySent1h && eventAt >= hourWindowStart && eventAt <= hourWindowEnd) {
      const msg = preEvent1HourSms(ctx);
      const result = await sendSms(rsvp.phone, msg);
      await db.reminderLog.create({
        data: {
          rsvpId: rsvp.id,
          kind: "pre-event-1h",
          eventAt,
          status: result.status === "demo" ? "sent" : result.status,
          providerSid: result.providerSid,
          error: result.error,
          body: result.body,
        },
      });
      sent1h.push({ rsvpId: rsvp.id, to: rsvp.phone, status: result.status });
      continue;
    }

    skipped.push({ rsvpId: rsvp.id, reason: "not in any reminder window" });
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    sent1Day: sent1d.length,
    sent1Hour: sent1h.length,
    skipped: skipped.length,
    sent1DayDetail: sent1d,
    sent1HourDetail: sent1h,
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
    schedule: [
      { kind: "pre-event-1d", window: "23–25 hours before event", cron: "every 15 min" },
      { kind: "pre-event-1h", window: "45–75 min before event", cron: "every 15 min" },
      { kind: "digest", endpoint: "/api/reminders/digest", cron: "Sunday 18:00" },
    ],
    instructions: configured
      ? "POST with header x-cron-secret to send reminders."
      : "Set CRON_SECRET env var to enable.",
  });
}
