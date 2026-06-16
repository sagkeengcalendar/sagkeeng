import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { weeklyDigestSms } from "@/lib/sms";
import { eventDateTime } from "@/lib/calendar-data";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/digest
 *
 * Sends the Sunday-evening "here's your week ahead" digest to every opted-in
 * community member who has at least one upcoming RSVP in the next 7 days.
 *
 * One SMS per phone number — we group all their RSVPs and send a single
 * summary message, not one per event.
 *
 * Auth: same x-cron-secret header as /api/reminders/send.
 *
 * Example cron (runs Sunday 6pm local time):
 *   # min hour dom month dow
 *   0 18 * * 0  curl -X POST https://your-site/api/reminders/digest \
 *                 -H "x-cron-secret: $CRON_SECRET"
 *
 * You can also pass ?forceDayOfWeek=sun to test on any day (useful for QA).
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
  const forceDay = url.searchParams.get("forceDayOfWeek"); // for testing
  const today = new Date();
  const dow = today.getDay(); // 0 = Sunday

  // Guard: only run on Sundays at/after 5pm, unless forceDay is set
  // (so a misconfigured cron can't fire it on a Tuesday)
  if (!forceDay && !(dow === 0 && today.getHours() >= 17)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not Sunday evening. Pass ?forceDayOfWeek=sun to override for testing.",
    });
  }

  // Compute the upcoming week: Monday 00:00 → Sunday 23:59
  const daysUntilMonday = (8 - dow) % 7; // 0 if today is Monday, 1 if Sunday (next day)
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(monday);
  nextSunday.setDate(monday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);

  const mondayIso = monday.toISOString().slice(0, 10);
  const sundayIso = nextSunday.toISOString().slice(0, 10);

  // Find all non-cancelled, opted-in RSVPs in the week window
  const rsvps = await db.rsvp.findMany({
    where: {
      cancelled: false,
      reminderOptIn: true,
      eventDate: { gte: mondayIso, lte: sundayIso },
    },
    include: { reminders: true },
    orderBy: { eventDate: "asc" },
  });

  // Group by phone number
  const byPhone = new Map<string, { name: string; rsvps: typeof rsvps }>();
  for (const r of rsvps) {
    if (!byPhone.has(r.phone)) {
      byPhone.set(r.phone, { name: r.name, rsvps: [] });
    }
    byPhone.get(r.phone)!.rsvps.push(r);
  }

  const sent: { phone: string; name: string; eventCount: number; status: string }[] = [];
  const skipped: { phone: string; reason: string }[] = [];

  for (const [phone, { name, rsvps: phoneRsvps }] of byPhone) {
    // Idempotent: skip if we already sent a digest for this week to this phone.
    // We detect "this week" by checking if any digest reminder for any of this
    // phone's RSVPs was sent in the last 7 days.
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const alreadyDigested = phoneRsvps.some((r) =>
      r.reminders.some(
        (rm) => rm.kind === "digest" && rm.status === "sent" && rm.sentAt >= weekAgo,
      ),
    );
    if (alreadyDigested) {
      skipped.push({ phone, reason: "already sent this week's digest" });
      continue;
    }

    // Build the event list (sorted by date)
    const events = phoneRsvps.map((r) => {
      const startOnly = r.eventStart.split(" – ")[0] || r.eventStart;
      return {
        title: r.eventTitle,
        dateIso: r.eventDate,
        start: startOnly,
        location: r.location,
      };
    });

    const msg = weeklyDigestSms(name, events);
    const result = await sendSms(phone, msg);

    // Log against the first RSVP of the week (any would do — we just need an
    // audit row tied to this phone and week)
    const firstRsvp = phoneRsvps[0];
    const startOnly = firstRsvp.eventStart.split(" – ")[0] || firstRsvp.eventStart;
    await db.reminderLog.create({
      data: {
        rsvpId: firstRsvp.id,
        kind: "digest",
        eventAt: eventDateTime(firstRsvp.eventDate, startOnly),
        status: result.status === "demo" ? "sent" : result.status,
        providerSid: result.providerSid,
        error: result.error,
        body: result.body,
      },
    });

    sent.push({
      phone,
      name,
      eventCount: events.length,
      status: result.status,
    });
  }

  return NextResponse.json({
    ok: true,
    weekStart: mondayIso,
    weekEnd: sundayIso,
    candidates: rsvps.length,
    phonesWithEvents: byPhone.size,
    sent: sent.length,
    skipped: skipped.length,
    sentDetail: sent,
    skippedDetail: skipped,
  });
}

/** GET /api/reminders/digest — health check + schedule info. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    schedule: "Sunday 18:00 (cron: `0 18 * * 0`)",
    guard: "Refuses to send unless called on Sunday at/after 17:00 local time. Pass ?forceDayOfWeek=sun to override for testing.",
    idempotent: true,
    instructions: "POST with header x-cron-secret to send the weekly digest.",
  });
}
