"use client";
import { useState } from "react";
import Link from "next/link";
import { MiinaLogo } from "@/components/calendar/miina-logo";

interface CreateResult {
  ok: boolean;
  error?: string;
  community?: { id: string; slug: string; name: string; tagline: string };
}

export default function AdminPage() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState<string>("");

  const slugValid = /^[a-z0-9-]+$/.test(slug) && slug.length >= 2;
  const nameValid = name.trim().length >= 2;
  const secretValid = adminSecret.length > 0;
  const canSubmit = slugValid && nameValid && secretValid && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/communities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          tagline: tagline.trim(),
          adminSecret,
        }),
      });
      const data: CreateResult = await res.json();
      if (!data.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
        setSlug("");
        setName("");
        setTagline("");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin">
      <header className="admin__header">
        <div className="admin__brand">
          <MiinaLogo size={32} />
          <span>miina · admin</span>
        </div>
        <nav className="admin__nav">
          <Link href="/" className="admin__navlink">← Back to site</Link>
          <Link href="/admin/rsvps" className="admin__navlink">RSVP dashboard →</Link>
        </nav>
      </header>

      <main className="admin__main">
        <div className="admin__card">
          <h1 className="admin__title">Add a community</h1>
          <p className="admin__lede">
            Create a new community calendar. Once added, the calendar will appear on the
            landing page and at <code className="admin__code">/&lt;slug&gt;</code>.
          </p>

          {result && (
            <div className="admin__success">
              <strong>✓ {result.community?.name} created.</strong>
              <span>
                Live at{" "}
                <a href={`/${result.community?.slug}`} className="admin__link">
                  /{result.community?.slug}
                </a>
              </span>
            </div>
          )}

          {error && <div className="admin__error">{error}</div>}

          <form className="admin__form" onSubmit={submit}>
            <label className="admin__field">
              <span className="admin__label">Slug</span>
              <input
                className="admin__input"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="sagkeeng"
                autoComplete="off"
                required
              />
              <span className="admin__hint">Lowercase letters, numbers, hyphens. URL: /{slug || "…"}</span>
            </label>

            <label className="admin__field">
              <span className="admin__label">Community name</span>
              <input
                className="admin__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sagkeeng Anicinabe Nation"
                autoComplete="off"
                required
              />
            </label>

            <label className="admin__field">
              <span className="admin__label">Tagline (optional)</span>
              <input
                className="admin__input"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Zaagiing — Mouth of the River"
                autoComplete="off"
              />
            </label>

            <label className="admin__field">
              <span className="admin__label">Admin secret</span>
              <input
                className="admin__input"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="••••••••••"
                autoComplete="off"
                required
              />
              <span className="admin__hint">
                Matches the <code className="admin__code">CRON_SECRET</code> env var.
              </span>
            </label>

            <button
              className="admin__submit"
              type="submit"
              disabled={!canSubmit}
            >
              {submitting ? "Creating…" : "Create community"}
            </button>
          </form>
        </div>

        <div className="admin__card admin__card--aside">
          <h2 className="admin__subtitle">RSVP dashboard</h2>
          <p className="admin__lede">
            View every RSVP across communities, search by name or event, filter by
            department, and copy attendee lists.
          </p>
          <Link href="/admin/rsvps" className="admin__link-btn">
            Open RSVP dashboard →
          </Link>
        </div>
      </main>
    </div>
  );
}
