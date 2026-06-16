import { NextRequest, NextResponse } from "next/server";
import { sendPreEventReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/send
 *
 * Called on a schedule (every 15 minutes) by the built-in scheduler OR an
 * external cron job. Sends 1-day and 1-hour pre-event reminders for any
 * RSVPs in the reminder windows.
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

  const result = await sendPreEventReminders();

  return NextResponse.json({
    ok: true,
    checked: result.checked,
    sent1Day: result.sent1Day,
    sent1Hour: result.sent1Hour,
    skipped: result.skipped,
    sent1DayDetail: result.details.sent1Day,
    sent1HourDetail: result.details.sent1Hour,
    skippedDetail: result.details.skipped,
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
