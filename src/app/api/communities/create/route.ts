import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  tagline: z.string().default(""),
  adminSecret: z.string(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 }); }
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  const body = parsed.data;
  const expected = process.env.CRON_SECRET;
  if (!expected || body.adminSecret !== expected) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    const existing = await db.community.findUnique({ where: { slug: body.slug } });
    if (existing) return NextResponse.json({ ok: false, error: `Slug "${body.slug}" already exists.` }, { status: 409 });
    const community = await db.community.create({ data: { slug: body.slug, name: body.name, tagline: body.tagline, published: true } });
    return NextResponse.json({ ok: true, community: { id: community.id, slug: community.slug, name: community.name, tagline: community.tagline } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Database error." }, { status: 500 });
  }
}
