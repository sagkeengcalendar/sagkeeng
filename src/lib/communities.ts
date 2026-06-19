export interface CommunityConfig {
  slug: string; name: string; tagline: string; crestUrl?: string;
  heroSlides?: { src: string; alt: string }[];
}
export const DEFAULT_HERO_SLIDES = [
  { src: "/hero/slide-1.webp", alt: "Winnipeg River at dusk" },
  { src: "/hero/slide-2.webp", alt: "Signal fire on the shore" },
  { src: "/hero/slide-3.webp", alt: "Stone cairn on the shore" },
];
export const COMMUNITIES: Record<string, CommunityConfig> = {
  sagkeeng: { slug: "sagkeeng", name: "Sagkeeng Anicinabe Nation", tagline: "Zaagiing — Mouth of the River", heroSlides: DEFAULT_HERO_SLIDES },
};
export function getCommunityConfig(slug: string, dbCommunity?: { name: string; tagline: string; crestUrl?: string | null }): CommunityConfig {
  const fromCode = COMMUNITIES[slug];
  if (fromCode) { if (dbCommunity) return { ...fromCode, name: dbCommunity.name || fromCode.name, tagline: dbCommunity.tagline || fromCode.tagline, crestUrl: dbCommunity.crestUrl || fromCode.crestUrl }; return fromCode; }
  return { slug, name: dbCommunity?.name || slug.charAt(0).toUpperCase() + slug.slice(1), tagline: dbCommunity?.tagline || "", crestUrl: dbCommunity?.crestUrl || undefined, heroSlides: DEFAULT_HERO_SLIDES };
}
