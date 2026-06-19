import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COMMUNITIES } from "@/lib/communities";

export const dynamic = "force-dynamic";

export async function GET() {
  let communities: Array<{ slug: string; name: string; tagline: string; crestUrl: string | null }> = [];
  try {
    communities = await db.community.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, tagline: true, crestUrl: true },
    });
  } catch {}

  if (communities.length === 0) {
    communities = Object.values(COMMUNITIES).map((c) => ({
      slug: c.slug, name: c.name, tagline: c.tagline, crestUrl: c.crestUrl || null,
    }));
  }
  return NextResponse.json({ ok: true, communities });
}
