/**
 * ============================================================================
 * SCHEDULER — fires SMS reminders on a schedule, no crontab needed
 * ============================================================================
 * Starts automatically when the Next.js server boots (via instrumentation.ts).
 * Calls the reminder engine directly (no HTTP self-call) on two intervals:
 *
 *   1. Pre-event reminders (every 15 min)
 *      → sendPreEventReminders()  (fires 1-day + 1-hour reminders)
 *
 *   2. Sunday digest (checked hourly, fires at Sun 6pm America/Winnipeg)
 *      → sendWeeklyDigest()
 * ============================================================================
 */

import { sendPreEventReminders, sendWeeklyDigest } from "@/lib/reminders";

const TIMEZONE = "America/Winnipeg"; // Sagkeeng / Fort Alexander, MB
const PRE_EVENT_INTERVAL = 15 * 60 * 1000; // 15 minutes
const DIGEST_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

let started = false;
let digestFiredThisWeek = false;

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[scheduler ${ts}] ${msg}`);
}

function localTime(): { dow: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { dow: dowMap[weekday] ?? 0, hour };
}

async function runPreEventReminders() {
  try {
    log("→ Checking for pre-event reminders…");
    const result = await sendPreEventReminders();
    log(
      `  ✓ Checked ${result.checked} RSVPs — sent ${result.sent1Day} 1-day, ${result.sent1Hour} 1-hour, skipped ${result.skipped}`,
    );
  } catch (e) {
    log(`  ✗ Pre-event error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function runDigestCheck() {
  try {
    const { dow, hour } = localTime();
    if (dow === 1) digestFiredThisWeek = false;
    if (dow === 0 && hour >= 18 && !digestFiredThisWeek) {
      log("→ Sunday 6pm America/Winnipeg — firing weekly digest…");
      const result = await sendWeeklyDigest();
      log(
        `  ✓ Digest: sent to ${result.sent} phone(s), skipped ${result.skipped}`,
      );
      digestFiredThisWeek = true;
    }
  } catch (e) {
    log(`  ✗ Digest error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Start the scheduler. Safe to call multiple times — only starts once. */
export function startScheduler() {
  if (started) return;
  if (!process.env.CRON_SECRET) {
    log("CRON_SECRET not set — scheduler not starting. Set it in .env to enable.");
    return;
  }
  started = true;

  log("Scheduler started. Pre-event reminders every 15 min, digest check hourly.");

  // Delay the first check 10 seconds so the server is fully ready
  setTimeout(async () => {
    log("→ First check starting…");
    await runPreEventReminders();
    await runDigestCheck();
    setInterval(runPreEventReminders, PRE_EVENT_INTERVAL);
    setInterval(runDigestCheck, DIGEST_CHECK_INTERVAL);
    log("Intervals registered. Next pre-event check in 15 minutes.");
  }, 10_000);
}
