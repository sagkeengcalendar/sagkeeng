import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { COMMUNITIES, getCommunityConfig } from "@/lib/communities";
import CalendarApp, { type CommunityInfo } from "./calendar-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ community: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { community: slug } = await params;
  let community = null;
  try {
    community = await db.community.findUnique({ where: { slug } });
  } catch {}
  const config = getCommunityConfig(slug, community || undefined);
  return {
    title: `miina — ${config.name} Community Calendar`,
    description: `Events, ceremonies, and notices for ${config.name}. ${config.tagline}.`,
  };
}

export default async function CommunityCalendarPage({ params }: PageProps) {
  const { community: slug } = await params;
  let dbCommunity = null;
  try {
    dbCommunity = await db.community.findUnique({ where: { slug } });
  } catch {}
  const config = getCommunityConfig(slug, dbCommunity || undefined);
  if (!dbCommunity && !COMMUNITIES[slug]) notFound();
  const communityInfo: CommunityInfo = {
    slug: config.slug,
    name: config.name,
    tagline: config.tagline,
    crestUrl: config.crestUrl,
  };
  return <CalendarApp community={communityInfo} />;
}
