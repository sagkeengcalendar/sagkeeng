/* ============================================================================
   REMINDER ENGINE — core logic for sending SMS reminders
   ============================================================================
   Shared between the API routes (for manual/cron triggers) and the built-in
   scheduler (src/lib/scheduler.ts). Keeping it here means the scheduler
   doesn't need to make HTTP requests to itself — it just calls these
   functions directly.
   ============================================================================ */

import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { preEvent1DaySms, preEvent1HourSms, weeklyDigestSms } from "@/lib/sms";
import { eventDateTime } from "@/lib/calendar-data";

export interface PreEventResult {
  checked: number;
  sent1Day: number;
  sent1Hour: number;
  skipped: number;
  details: { sent1Day: unknown[]; sent1Hour: unknown[]; skipped: unknown[] };
}

/** Send 1-day and 1-hour pre-event reminders for all eligible RSVPs. */
export async function sendPreEventReminders(): Promise<PreEventResult> {
  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const BUFFER_MS = 15 * 60 * 1000;

  const dayWindowStart = new Date(now.getTime() + ONE_DAY_MS - BUFFER_MS);
  const dayWindowEnd = new Date(now.getTime() + ONE_DAY_MS + BUFFER_MS);
  const hourWindowStart = new Date(now.getTime() + ONE_HOUR_MS - BUFFER_MS);
  const hourWindowEnd = new Date(now.getTime() + ONE_HOUR_MS + BUFFER_MS);
  const farHorizon = new Date(now.getTime() + 2 * ONE_DAY_MS);

  const candidates = await db.rsvp.findMany({
    where: {
      cancelled: false,
      reminderOptIn: true,
      eventDate: { gte: now.toISOString().slice(0, 10) },
    },
    include: { reminders: true },
  });

  const sent1Day: unknown[] = [];
  const sent1Hour: unknown[] = [];
  const skipped: unknown[] = [];

  for (const rsvp of candidates) {
    const startOnly = rsvp.eventStart.split(" – ")[0] || rsvp.eventStart;
    const eventAt = eventDateTime(rsvp.eventDate, startOnly);

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
      sent1Day.push({ rsvpId: rsvp.id, to: rsvp.phone, status: result.status });
      continue;
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
      sent1Hour.push({ rsvpId: rsvp.id, to: rsvp.phone, status: result.status });
      continue;
    }

    skipped.push({ rsvpId: rsvp.id, reason: "not in any reminder window" });
  }

  return {
    checked: candidates.length,
    sent1Day: sent1Day.length,
    sent1Hour: sent1Hour.length,
    skipped: skipped.length,
    details: { sent1Day, sent1Hour, skipped },
  };
}

export interface DigestResult {
  weekStart: string;
  weekEnd: string;
  candidates: number;
  phonesWithEvents: number;
  sent: number;
  skipped: number;
  details: { sent: unknown[]; skipped: unknown[] };
}

/** Send the weekly digest to all opted-in community members with upcoming events. */
export async function sendWeeklyDigest(): Promise<DigestResult> {
  const today = new Date();
  const dow = today.getDay();
  const daysUntilMonday = (8 - dow) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(monday);
  nextSunday.setDate(monday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);

  const mondayIso = monday.toISOString().slice(0, 10);
  const sundayIso = nextSunday.toISOString().slice(0, 10);

  const rsvps = await db.rsvp.findMany({
    where: {
      cancelled: false,
      reminderOptIn: true,
      eventDate: { gte: mondayIso, lte: sundayIso },
    },
    include: { reminders: true },
    orderBy: { eventDate: "asc" },
  });

  const byPhone = new Map<string, { name: string; rsvps: typeof rsvps }>();
  for (const r of rsvps) {
    if (!byPhone.has(r.phone)) {
      byPhone.set(r.phone, { name: r.name, rsvps: [] });
    }
    byPhone.get(r.phone)!.rsvps.push(r);
  }

  const sent: unknown[] = [];
  const skipped: unknown[] = [];
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const [phone, { name, rsvps: phoneRsvps }] of byPhone) {
    const alreadyDigested = phoneRsvps.some((r) =>
      r.reminders.some(
        (rm) => rm.kind === "digest" && rm.status === "sent" && rm.sentAt >= weekAgo,
      ),
    );
    if (alreadyDigested) {
      skipped.push({ phone, reason: "already sent this week's digest" });
      continue;
    }

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

    sent.push({ phone, name, eventCount: events.length, status: result.status });
  }

  return {
    weekStart: mondayIso,
    weekEnd: sundayIso,
    candidates: rsvps.length,
    phonesWithEvents: byPhone.size,
    sent: sent.length,
    skipped: skipped.length,
    details: { sent, skipped },
  };
}
