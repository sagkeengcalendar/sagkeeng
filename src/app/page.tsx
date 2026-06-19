"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MiinaLogo } from "@/components/calendar/miina-logo";

interface Community {
  slug: string;
  name: string;
  tagline: string;
  crestUrl?: string | null;
}

export default function LandingPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setCommunities(data.communities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="landing">
      <section className="landing__hero">
        <div className="landing__hero-inner">
          <div className="landing__logo">
            <MiinaLogo size={88} />
          </div>
          <h1 className="landing__title">miina</h1>
          <p className="landing__tagline">to share · to gather · to know</p>
          <p className="landing__subtagline">miinawaa · again and again</p>
          <p className="landing__blurb">
            Community calendars for First Nations. Events, ceremonies, and notices —
            with text reminders so nobody misses what matters.
          </p>
        </div>
      </section>
      <section className="landing__communities">
        <div className="landing__section-inner">
          <h2 className="landing__section-title">Find your community</h2>
          {loading ? (
            <div className="landing__loading">
              <div className="landing__skeleton" />
              <div className="landing__skeleton" />
              <div className="landing__skeleton" />
            </div>
          ) : communities.length === 0 ? (
            <div className="landing__empty">
              <p>No communities published yet.</p>
              <p className="landing__empty-sub">
                Check back soon, or <a href="mailto:hello@miina.ca">get in touch</a> to add yours.
              </p>
            </div>
          ) : (
            <div className="landing__grid">
              {communities.map((c) => (
                <Link key={c.slug} href={`/${c.slug}`} className="landing__card">
                  <div className="landing__card-icon">
                    <MiinaLogo size={48} />
                  </div>
                  <h3 className="landing__card-name">{c.name}</h3>
                  {c.tagline && <p className="landing__card-tagline">{c.tagline}</p>}
                  <span className="landing__card-cta">View calendar →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="landing__footer-brand">
            <MiinaLogo size={24} />
            <span>miina</span>
          </div>
          <p className="landing__footer-tag">miinawaa · again and again</p>
          <p className="landing__footer-meta">
            Want to add your community? <a href="mailto:hello@miina.ca">Get in touch</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
