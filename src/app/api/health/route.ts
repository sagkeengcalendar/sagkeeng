import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "fail" | "unknown"> = {
    database: "unknown",
    communityTable: "unknown",
    twilio: "unknown",
    cronSecret: "unknown",
    resend: "unknown",
  };

  checks.twilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) ? "ok" : "fail";
  checks.cronSecret = !!process.env.CRON_SECRET ? "ok" : "fail";
  checks.resend = !!process.env.RESEND_API_KEY ? "ok" : "fail";

  try {
    await db.rsvp.count();
    checks.database = "ok";
    try {
      await db.community.count();
      checks.communityTable = "ok";
    } catch { checks.communityTable = "fail"; }
  } catch { checks.database = "fail"; checks.communityTable = "fail"; }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "unknown");
  return NextResponse.json({ ok: allOk, checks, timestamp: new Date().toISOString() });
}
// Auto-deploy test: Fri Jun 19 17:38:54 UTC 2026
