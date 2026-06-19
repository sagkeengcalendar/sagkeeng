import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COMMUNITIES } from "@/lib/communities";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const xHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  return xHeader === expected || authHeader === `Bearer ${expected}`;
}

function getCommunityName(communityId: string | null): string {
  if (!communityId) return "—";
  for (const c of Object.values(COMMUNITIES)) {
    if ("cm_" + c.slug === communityId) return c.name;
  }
  // Fall back to stripping the "cm_" prefix and Title-casing it.
  if (communityId.startsWith("cm_")) {
    const slug = communityId.slice(3);
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  return communityId;
}

function getCommunitySlug(communityId: string | null): string {
  if (!communityId) return "";
  if (communityId.startsWith("cm_")) return communityId.slice(3);
  return "";
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing RSVP id." }, { status: 400 });
  try {
    await db.reminderLog.deleteMany({ where: { rsvpId: id } });
    await db.rsvp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "RSVP not found." }, { status: 404 });
  }
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ ok: false, error: "CRON_SECRET not set." }, { status: 503 });
  if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const url = new URL(req.url);
  const eventId = url.searchParams.get("event");
  const since = url.searchParams.get("since");
  const where: Record<string, unknown> = {};
  if (eventId) { where.eventId = eventId; } else { where.cancelled = false; }
  if (since) { where.eventDate = { gte: since }; }

  let rsvps: any[] = [];
  try {
    rsvps = await db.rsvp.findMany({ where, orderBy: { eventDate: "asc" }, take: 500 });
  } catch {
    return NextResponse.json({ ok: true, totalRsvps: 0, totalAttendees: 0, rsvps: [], byEvent: [], dbError: "Database query failed." });
  }

  const rsvpsWithCommunity = rsvps.map((r) => ({
    ...r,
    community: getCommunityName(r.communityId),
    communitySlug: getCommunitySlug(r.communityId),
  }));
  const byEvent: Record<string, any> = {};
  for (const r of rsvpsWithCommunity) {
    if (r.cancelled) continue;
    if (!byEvent[r.eventId]) byEvent[r.eventId] = { eventId: r.eventId, eventTitle: r.eventTitle, eventDate: r.eventDate, eventStart: r.eventStart, location: r.location, community: r.community, communitySlug: r.communitySlug, department: r.department, count: 0, reminderOptIns: 0 };
    byEvent[r.eventId].count += r.partySize;
    if (r.reminderOptIn) byEvent[r.eventId].reminderOptIns += 1;
  }

  return NextResponse.json({
    ok: true,
    totalRsvps: rsvpsWithCommunity.filter((r) => !r.cancelled).length,
    totalAttendees: rsvpsWithCommunity.filter((r) => !r.cancelled).reduce((s, r) => s + r.partySize, 0),
    rsvps: rsvpsWithCommunity.map((r) => ({ id: r.id, community: r.community, communitySlug: r.communitySlug, eventId: r.eventId, eventTitle: r.eventTitle, eventDate: r.eventDate, eventStart: r.eventStart, location: r.location, category: r.category, department: r.department, name: r.name, phone: r.phone, partySize: r.partySize, attendees: r.attendees, reminderOptIn: r.reminderOptIn, cancelled: r.cancelled, createdAt: r.createdAt })),
    byEvent: Object.values(byEvent).sort((a: any, b: any) => a.eventDate.localeCompare(b.eventDate)),
  });
}
