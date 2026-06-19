"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MiinaLogo } from "@/components/calendar/miina-logo";

interface Rsvp {
  id: string;
  community: string;
  communitySlug: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStart: string;
  location: string;
  category: string;
  department: string;
  name: string;
  phone: string;
  partySize: number;
  attendees: string;
  reminderOptIn: boolean;
  cancelled: boolean;
  createdAt: string;
}

interface ByEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStart: string;
  location: string;
  community: string;
  communitySlug: string;
  department: string;
  count: number;
  reminderOptIns: number;
}

interface RsvpsResponse {
  ok: boolean;
  error?: string;
  totalRsvps?: number;
  totalAttendees?: number;
  rsvps?: Rsvp[];
  byEvent?: ByEvent[];
  dbError?: string;
}

type View = "byEvent" | "all";

const DEPARTMENTS = [
  { value: "all", label: "All departments" },
  { value: "culture", label: "Culture" },
  { value: "health", label: "Health" },
  { value: "youth", label: "Youth" },
  { value: "elders", label: "Elders" },
  { value: "family", label: "Family" },
  { value: "special", label: "Special" },
];

function prettyPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return raw;
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

function longDate(s: string): string {
  const p = s.split("-").map(Number);
  if (p.length !== 3 || p.some(isNaN)) return s;
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function readStoredSecret(): string {
  try {
    return sessionStorage.getItem("miina_admin_secret") || "";
  } catch {
    return "";
  }
}

export default function AdminRsvpsPage() {
  // Persist secret in sessionStorage so a refresh doesn't log you out.
  // Both states initialize lazily from sessionStorage to avoid setState-in-effect.
  const [secret, setSecret] = useState<string>(readStoredSecret);
  const [authed, setAuthed] = useState<boolean>(() => readStoredSecret().length > 0);
  const [loginError, setLoginError] = useState("");

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret) {
      setLoginError("Enter the admin secret.");
      return;
    }
    setAuthed(true);
    try { sessionStorage.setItem("miina_admin_secret", secret); } catch {}
  };

  const logout = () => {
    setAuthed(false);
    setSecret("");
    try { sessionStorage.removeItem("miina_admin_secret"); } catch {}
  };

  if (!authed) {
    return (
      <div className="admin-rsvps">
        <div className="admin-rsvps__login-shell">
          <div className="admin-rsvps__login-card">
            <div className="admin-rsvps__login-brand">
              <MiinaLogo size={40} />
              <span>miina · RSVP admin</span>
            </div>
            <h1 className="admin-rsvps__login-title">Sign in</h1>
            <p className="admin-rsvps__login-lede">
              Enter the admin secret (the <code>CRON_SECRET</code> env var). It is sent
              as the <code>x-cron-secret</code> header on every request.
            </p>
            <form className="admin-rsvps__login-form" onSubmit={login}>
              <input
                className="admin-rsvps__input"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••"
                autoComplete="off"
                autoFocus
              />
              <button className="admin-rsvps__submit" type="submit">
                Sign in
              </button>
            </form>
            {loginError && <div className="admin-rsvps__login-error">{loginError}</div>}
            <Link href="/admin" className="admin-rsvps__back">← Back to admin</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RsvpDashboard secret={secret} onLogout={logout} />
  );
}

function RsvpDashboard({ secret, onLogout }: { secret: string; onLogout: () => void }) {
  const [data, setData] = useState<RsvpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("byEvent");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [copiedEvent, setCopiedEvent] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const fetchRsvps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rsvps", {
        headers: { "x-cron-secret": secret },
      });
      const json: RsvpsResponse = await res.json();
      if (!json.ok) {
        setError(json.error || "Failed to load RSVPs.");
      }
      setData(json);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { fetchRsvps(); }, [fetchRsvps]);

  const allRsvps = data?.rsvps ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRsvps.filter((r) => {
      if (department !== "all" && r.department !== department) return false;
      if (!q) return true;
      const hay = (
        r.name + " " +
        r.phone + " " +
        r.eventTitle + " " +
        r.location + " " +
        r.community + " " +
        r.attendees + " " +
        r.department + " " +
        r.category
      ).toLowerCase();
      return hay.includes(q);
    });
  }, [allRsvps, search, department]);

  const byEventFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.byEvent ?? []).filter((e) => {
      if (department !== "all" && e.department !== department) return false;
      if (!q) return true;
      const hay = (e.eventTitle + " " + e.location + " " + e.community + " " + e.department).toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, department]);

  const rsvpsForEvent = useCallback(
    (eventId: string) => filtered.filter((r) => r.eventId === eventId),
    [filtered],
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this RSVP permanently? This cannot be undone.")) return;
    setActionError("");
    try {
      const res = await fetch(`/api/admin/rsvps?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-cron-secret": secret },
      });
      const json = await res.json();
      if (!json.ok) {
        setActionError(json.error || "Failed to delete RSVP.");
        return;
      }
      await fetchRsvps();
    } catch {
      setActionError("Couldn't reach the server.");
    }
  };

  const copyAttendeeList = async (eventId: string, eventTitle: string, eventDate: string) => {
    const rsvps = rsvpsForEvent(eventId);
    if (rsvps.length === 0) return;
    const lines = [
      `${eventTitle} — ${longDate(eventDate)}`,
      `${rsvps.length} RSVP${rsvps.length > 1 ? "s" : ""} · ${rsvps.reduce((s, r) => s + r.partySize, 0)} attendees`,
      "",
      ...rsvps
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((r) => {
          const extras = r.attendees
            ? r.attendees.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const all = [r.name, ...extras].filter(Boolean);
          return [
            `• ${all.join(" + ")} — ${prettyPhone(r.phone)}${r.reminderOptIn ? " (text reminders)" : ""}`,
          ];
        }),
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEvent(eventId);
      setTimeout(() => setCopiedEvent(null), 2400);
    } catch {
      setActionError("Couldn't copy to clipboard. Try a modern browser.");
    }
  };

  return (
    <div className="admin-rsvps">
      <header className="admin-rsvps__header">
        <div className="admin-rsvps__brand">
          <MiinaLogo size={28} />
          <span>miina · RSVP dashboard</span>
        </div>
        <nav className="admin-rsvps__nav">
          <Link href="/admin" className="admin-rsvps__navlink">← Admin</Link>
          <Link href="/" className="admin-rsvps__navlink">Site →</Link>
          <button className="admin-rsvps__navlink admin-rsvps__logout" onClick={onLogout}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="admin-rsvps__main">
        <div className="admin-rsvps__toolbar">
          <div className="admin-rsvps__search">
            <input
              type="text"
              placeholder="Search by name, phone, event, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-rsvps__input"
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="admin-rsvps__select"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <div className="admin-rsvps__view-toggle">
            <button
              className={"admin-rsvps__view-btn" + (view === "byEvent" ? " is-active" : "")}
              onClick={() => setView("byEvent")}
            >
              By event
            </button>
            <button
              className={"admin-rsvps__view-btn" + (view === "all" ? " is-active" : "")}
              onClick={() => setView("all")}
            >
              All RSVPs
            </button>
          </div>
        </div>

        {error && <div className="admin-rsvps__error">{error}</div>}
        {actionError && <div className="admin-rsvps__error">{actionError}</div>}
        {data?.dbError && <div className="admin-rsvps__warning">Database: {data.dbError}</div>}

        <div className="admin-rsvps__stats">
          <div className="admin-rsvps__stat">
            <span className="admin-rsvps__stat-num">{data?.totalRsvps ?? 0}</span>
            <span className="admin-rsvps__stat-label">RSVPs</span>
          </div>
          <div className="admin-rsvps__stat">
            <span className="admin-rsvps__stat-num">{data?.totalAttendees ?? 0}</span>
            <span className="admin-rsvps__stat-label">Attendees</span>
          </div>
          <div className="admin-rsvps__stat">
            <span className="admin-rsvps__stat-num">{byEventFiltered.length}</span>
            <span className="admin-rsvps__stat-label">Events</span>
          </div>
        </div>

        {loading ? (
          <div className="admin-rsvps__loading">
            <div className="admin-rsvps__skeleton" />
            <div className="admin-rsvps__skeleton" />
            <div className="admin-rsvps__skeleton" />
          </div>
        ) : view === "byEvent" ? (
          byEventFiltered.length === 0 ? (
            <div className="admin-rsvps__empty">
              <h3>No events match your filters.</h3>
              <p>Try clearing the search or switching to “All RSVPs”.</p>
            </div>
          ) : (
            <div className="admin-rsvps__events">
              {byEventFiltered.map((ev) => {
                const expanded = expandedEvent === ev.eventId;
                const attendees = rsvpsForEvent(ev.eventId);
                return (
                  <div
                    key={ev.eventId}
                    className={"admin-rsvps__event-card" + (expanded ? " is-expanded" : "")}
                  >
                    <button
                      className="admin-rsvps__event-head"
                      onClick={() => setExpandedEvent(expanded ? null : ev.eventId)}
                      aria-expanded={expanded}
                    >
                      <div className="admin-rsvps__event-head-main">
                        <div className="admin-rsvps__event-title">{ev.eventTitle}</div>
                        <div className="admin-rsvps__event-meta">
                          <span>{longDate(ev.eventDate)}</span>
                          <span className="admin-rsvps__dot">·</span>
                          <span>{ev.eventStart}</span>
                          <span className="admin-rsvps__dot">·</span>
                          <span>{ev.location}</span>
                          <span className="admin-rsvps__dot">·</span>
                          <span>{ev.community}</span>
                        </div>
                      </div>
                      <div className="admin-rsvps__event-head-side">
                        <span className="admin-rsvps__count">
                          {ev.count} attendee{ev.count === 1 ? "" : "s"}
                        </span>
                        {ev.reminderOptIns > 0 && (
                          <span className="admin-rsvps__reminder-count">
                            {ev.reminderOptIns} text reminder{ev.reminderOptIns === 1 ? "" : "s"}
                          </span>
                        )}
                        <span className={"admin-rsvps__chevron" + (expanded ? " is-open" : "")}>▾</span>
                      </div>
                    </button>
                    {expanded && (
                      <div className="admin-rsvps__event-body">
                        <div className="admin-rsvps__event-actions">
                          <button
                            className="admin-rsvps__copy-btn"
                            onClick={() => copyAttendeeList(ev.eventId, ev.eventTitle, ev.eventDate)}
                          >
                            {copiedEvent === ev.eventId ? "✓ Copied!" : "Copy attendee list"}
                          </button>
                        </div>
                        {attendees.length === 0 ? (
                          <p className="admin-rsvps__event-empty">No attendees match the current filters.</p>
                        ) : (
                          <ul className="admin-rsvps__attendee-list">
                            {attendees
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((r) => {
                                const extras = r.attendees
                                  ? r.attendees.split(",").map((s) => s.trim()).filter(Boolean)
                                  : [];
                                return (
                                  <li key={r.id} className="admin-rsvps__attendee">
                                    <div className="admin-rsvps__attendee-main">
                                      <div className="admin-rsvps__attendee-name">
                                        {r.name}
                                        {extras.length > 0 && (
                                          <span className="admin-rsvps__attendee-extras">
                                            {" "}+ {extras.join(", ")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="admin-rsvps__attendee-meta">
                                        <a href={`tel:${r.phone}`}>{prettyPhone(r.phone)}</a>
                                        <span className="admin-rsvps__dot">·</span>
                                        <span>party of {r.partySize}</span>
                                        {r.reminderOptIn && (
                                          <>
                                            <span className="admin-rsvps__dot">·</span>
                                            <span className="admin-rsvps__reminder-on">text reminders on</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className="admin-rsvps__delete-btn"
                                      onClick={() => handleDelete(r.id)}
                                      aria-label={`Delete RSVP for ${r.name}`}
                                    >
                                      Delete
                                    </button>
                                  </li>
                                );
                              })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filtered.length === 0 ? (
            <div className="admin-rsvps__empty">
              <h3>No RSVPs match your filters.</h3>
              <p>Try clearing the search or changing the department filter.</p>
            </div>
          ) : (
            <div className="admin-rsvps__table-wrap">
              <table className="admin-rsvps__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Dept</th>
                    <th>Party</th>
                    <th>Community</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice()
                    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.name.localeCompare(b.name))
                    .map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="admin-rsvps__cell-name">{r.name}</div>
                          {r.attendees && (
                            <div className="admin-rsvps__cell-sub">+ {r.attendees}</div>
                          )}
                        </td>
                        <td>
                          <a href={`tel:${r.phone}`}>{prettyPhone(r.phone)}</a>
                        </td>
                        <td>
                          <div className="admin-rsvps__cell-event">{r.eventTitle}</div>
                          <div className="admin-rsvps__cell-sub">{r.location}</div>
                        </td>
                        <td>
                          <div>{longDate(r.eventDate)}</div>
                          <div className="admin-rsvps__cell-sub">{r.eventStart}</div>
                        </td>
                        <td><span className="admin-rsvps__chip">{r.department}</span></td>
                        <td>{r.partySize}</td>
                        <td>{r.community}</td>
                        <td>
                          <button
                            className="admin-rsvps__delete-btn"
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  );
}
