import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/digest
 *
 * Sends the Sunday-evening "here's your week ahead" digest to every opted-in
 * community member who has at least one upcoming RSVP in the next 7 days.
 *
 * Auth: same x-cron-secret header as /api/reminders/send.
 *
 * Example cron (runs Sunday 6pm local time):
 *   0 18 * * 0  curl -X POST https://your-site/api/reminders/digest \
 *                 -H "x-cron-secret: $CRON_SECRET"
 *
 * Pass ?forceDayOfWeek=sun to test on any day (useful for QA).
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
  const forceDay = url.searchParams.get("forceDayOfWeek");
  const today = new Date();
  const dow = today.getDay();

  if (!forceDay && !(dow === 0 && today.getHours() >= 17)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not Sunday evening. Pass ?forceDayOfWeek=sun to override for testing.",
    });
  }

  const result = await sendWeeklyDigest();

  return NextResponse.json({
    ok: true,
    weekStart: result.weekStart,
    weekEnd: result.weekEnd,
    candidates: result.candidates,
    phonesWithEvents: result.phonesWithEvents,
    sent: result.sent,
    skipped: result.skipped,
    sentDetail: result.details.sent,
    skippedDetail: result.details.skipped,
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
