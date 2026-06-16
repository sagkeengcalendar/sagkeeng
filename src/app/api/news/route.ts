import { NextResponse } from "next/server";
import { NEWS } from "@/lib/calendar-data";

export const dynamic = "force-static";

/** GET /api/news — returns news & notices for the News tab. */
export async function GET() {
  return NextResponse.json({ news: NEWS });
}
