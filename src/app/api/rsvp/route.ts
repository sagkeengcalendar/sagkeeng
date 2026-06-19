import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buildAllEvents,
  eventIdSlug,
  eventDateTime,
  validPhone,
  toE164,
  prettyPhone,
  type NormalizedEvent,
} from "@/lib/calendar-data";
import { sendSms } from "@/lib/twilio";
import { confirmationSms, cancellationSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

/* ─── POST /api/rsvp — create a new RSVP ───────────────────────────────────── */
const RsvpBody = z.object({
  eventId: z.string(),
  name: z.string().min(1, "Please enter your name."),
  phone: z.string().min(1, "Please enter a phone number."),
  attendees: z.array(z.string()).default([]),
  reminderOptIn: z.boolean().default(false),
  reminderLeadMin: z.number().int().min(15).max(24 * 60).default(60),
  // Which community this RSVP belongs to (e.g. "sagkeeng").
  communitySlug: z.string().optional(),
  // honeypot — must be empty
  contact_reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RsvpBody.safeParse(json);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: firstErr?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Honeypot: silently succeed for bots
  if (body.contact_reason && body.contact_reason.trim().length > 0) {
    return NextResponse.json({ ok: true, demo: true, bot: true });
  }

  if (!validPhone(body.phone)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid 10-digit phone number so we can reach you." },
      { status: 400 },
    );
  }

  // Find the event in the canonical list (don't trust the client's title/date)
  const all: NormalizedEvent[] = buildAllEvents();
  const ev = all.find((e) => eventIdSlug(e) === body.eventId);
  if (!ev) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const phoneE164 = toE164(body.phone);
  const attendees = [body.name, ...body.attendees.filter(Boolean)].filter(
    (n, i, a) => n && a.indexOf(n) === i,
  );
  const partySize = Math.max(1, attendees.length);

  // Persist the RSVP
  // communityId is stored as "cm_<slug>" so admin tools can resolve it back
  // to a community name even before a Community row exists in the DB.
  const communityId = body.communitySlug ? "cm_" + body.communitySlug : null;
  const rsvp = await db.rsvp.create({
    data: {
      eventId: body.eventId,
      eventTitle: ev.title,
      eventDate: ev.date,
      eventStart: ev.start + (ev.end ? " – " + ev.end : ""),
      eventEnd: ev.end || "",
      location: ev.location,
      category: ev.category,
      department: ev.department,
      communityId,
      name: body.name,
      phone: phoneE164,
      partySize,
      attendees: attendees.join(", "),
      reminderOptIn: body.reminderOptIn,
      reminderLeadMin: body.reminderLeadMin,
    },
  });

  // Send confirmation SMS if opted in
  let smsStatus: "sent" | "demo" | "failed" | "skipped" = "skipped";
  let smsError: string | null = null;
  if (body.reminderOptIn) {
    const msg = confirmationSms({
      eventTitle: ev.title,
      eventDate: ev.date,
      eventStart: ev.start,
      location: ev.location,
      contactPhone: ev.contact,
    });
    const result = await sendSms(phoneE164, msg);
    smsStatus = result.status;
    smsError = result.error ?? null;

    // Log the reminder attempt
    await db.reminderLog.create({
      data: {
        rsvpId: rsvp.id,
        kind: "confirmation",
        eventAt: eventDateTime(ev.date, ev.start),
        status: result.status === "demo" ? "sent" : result.status,
        providerSid: result.providerSid,
        error: result.error,
        body: result.body,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    rsvpId: rsvp.id,
    partySize,
    reminder: { optedIn: body.reminderOptIn, status: smsStatus, error: smsError },
    drawName: "the grand prize",
  });
}

/* ─── GET /api/rsvp?phone=... — list RSVPs for a phone ─────────────────────── */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const phoneRaw = url.searchParams.get("phone") || "";
  if (!validPhone(phoneRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid phone." }, { status: 400 });
  }
  const phoneE164 = toE164(phoneRaw);

  const rsvps = await db.rsvp.findMany({
    where: { phone: phoneE164, cancelled: false },
    orderBy: { eventDate: "asc" },
    include: { reminders: { orderBy: { sentAt: "desc" }, take: 3 } },
  });

  return NextResponse.json({
    ok: true,
    phone: prettyPhone(phoneE164),
    rsvps: rsvps.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      eventDate: r.eventDate,
      eventStart: r.eventStart,
      location: r.location,
      category: r.category,
      name: r.name,
      partySize: r.partySize,
      attendees: r.attendees,
      reminderOptIn: r.reminderOptIn,
      reminderLeadMin: r.reminderLeadMin,
      createdAt: r.createdAt,
      lastReminder: r.reminders[0]
        ? { kind: r.reminders[0].kind, status: r.reminders[0].status, sentAt: r.reminders[0].sentAt }
        : null,
    })),
  });
}

/* ─── DELETE /api/rsvp?id=...&phone=... — cancel an RSVP ───────────────────── */
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const phoneRaw = url.searchParams.get("phone") || "";
  if (!id || !validPhone(phoneRaw)) {
    return NextResponse.json({ ok: false, error: "Missing id or phone." }, { status: 400 });
  }
  const phoneE164 = toE164(phoneRaw);

  // Find the RSVP, ensuring the phone matches (so people can't cancel others' RSVPs)
  const rsvp = await db.rsvp.findFirst({ where: { id, phone: phoneE164 } });
  if (!rsvp) {
    return NextResponse.json({ ok: false, error: "RSVP not found." }, { status: 404 });
  }
  if (rsvp.cancelled) {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  await db.rsvp.update({ where: { id }, data: { cancelled: true } });

  // Send a cancellation SMS if they had opted in to reminders
  if (rsvp.reminderOptIn) {
    const startOnly = rsvp.eventStart.split(" – ")[0] || rsvp.eventStart;
    const msg = cancellationSms({
      eventTitle: rsvp.eventTitle,
      eventDate: rsvp.eventDate,
      eventStart: startOnly,
      location: rsvp.location,
    });
    const result = await sendSms(phoneE164, msg);
    await db.reminderLog.create({
      data: {
        rsvpId: rsvp.id,
        kind: "cancellation",
        eventAt: eventDateTime(rsvp.eventDate, startOnly),
        status: result.status === "demo" ? "sent" : result.status,
        providerSid: result.providerSid,
        error: result.error,
        body: result.body,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
