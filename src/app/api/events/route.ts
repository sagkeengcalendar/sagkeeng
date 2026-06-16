import { NextResponse } from "next/server";
import { buildAllEvents } from "@/lib/calendar-data";

export const dynamic = "force-static";

/** GET /api/events — returns the full sorted event list (curated + generated). */
export async function GET() {
  const events = buildAllEvents();
  return NextResponse.json({ events });
}
