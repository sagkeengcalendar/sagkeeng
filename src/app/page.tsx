"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/calendar/icons";
import {
  buildAllEvents,
  eventIdSlug,
  NEWS,
  WORDS,
  FULL_MOONS,
  MOON_NAMES,
  CATEGORIES,
  type NormalizedEvent,
  type Category,
  type Audience,
  type NewsItem,
} from "@/lib/calendar-data";
import {
  MONTHS,
  DAYS,
  pad,
  iso,
  todayISO,
  daysInMonth,
  firstWeekday,
  parseDate,
  longDate,
  shortDate,
  weekday,
  dayNum,
  minutesUntil,
  weekEndISO,
  cap,
  wmo,
  store,
  read,
  PERSONAS,
  audienceMatch,
  type PersonaKey,
} from "@/lib/calendar-client";

const DRAW_NAME = "the grand prize";
const SLIDES = [
  { src: "/hero/slide-1.webp", alt: "Winnipeg River at dusk near Sagkeeng" },
  { src: "/hero/slide-2.webp", alt: "Signal fire on the shore" },
  { src: "/hero/slide-3.webp", alt: "Stone cairn on the shore" },
];

type View = "today" | "week" | "calendar" | "news" | "myrsvps";

/* ════════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                                 */
/* ════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  // Events (built once on the client from the same shared module the API uses)
  const [allEvents, setAllEvents] = useState<NormalizedEvent[]>([]);
  const [view, setView] = useState<View>("today");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  // Local "going" set — fast UI feedback, backed up to localStorage.
  // The server DB is the source of truth for reminders.
  const [going, setGoing] = useState<Set<string>>(new Set());

  const [persona, setPersona] = useState<PersonaKey | null>(null);
  const [suggestedMode, setSuggestedMode] = useState(false);

  const [calY, setCalY] = useState(new Date().getFullYear());
  const [calM, setCalM] = useState(new Date().getMonth());
  const [picked, setPicked] = useState<string | null>(null);

  const [rsvpEvent, setRsvpEvent] = useState<NormalizedEvent | null>(null);
  const [dayPopDate, setDayPopDate] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(true);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [bannerOpen, setBannerOpen] = useState(true);

  const [weather, setWeather] = useState<{
    temp: string;
    desc: string;
    wind: string;
    sunset: string;
  } | null>(null);
  const [moonInfo, setMoonInfo] = useState<{
    icon: string;
    main: string;
    sub: string;
  } | null>(null);
  const [wotd, setWotd] = useState<(typeof WORDS)[number] | null>(null);

  // My RSVPs state
  const [myRsvpsPhone, setMyRsvpsPhone] = useState("");
  const [myRsvps, setMyRsvps] = useState<MyRsvp[] | null>(null);
  const [myRsvpsLoading, setMyRsvpsLoading] = useState(false);
  const [myRsvpsError, setMyRsvpsError] = useState<string | null>(null);

  // Build events once
  useEffect(() => {
    setAllEvents(buildAllEvents());
  }, []);

  // Restore local "going" set
  useEffect(() => {
    try {
      const raw = read("sk_going");
      if (raw) setGoing(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  // Persist "going" set
  useEffect(() => {
    store("sk_going", JSON.stringify([...going]));
  }, [going]);

  // Theme: respect saved preference, default light
  useEffect(() => {
    const saved = read("sk_theme") as "light" | "dark" | null;
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      store("sk_theme", next);
      return next;
    });
  }, []);

  // Hero bits: weather, moon, word of the day
  useEffect(() => {
    // Word of the day — rotate by day-of-year
    const now = new Date();
    const doy = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    setWotd(WORDS[doy % WORDS.length]);

    // Moon
    const mo = now.getMonth() + 1;
    const moon = MOON_NAMES[mo];
    const isFull = FULL_MOONS.indexOf(todayISO()) >= 0;
    if (moon) {
      setMoonInfo({
        icon: isFull ? "🌕" : "🌙",
        main: moon.oji + (isFull ? " — full tonight" : ""),
        sub: moon.en,
      });
    }

    // Weather — open-meteo (no key). Fallback values shown immediately.
    const fallback = { temp: "7°C", desc: "Partly cloudy", wind: "18 km/h", sunset: "8:12 PM" };
    setWeather(fallback);
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=50.62&longitude=-96.10" +
      "&current=temperature_2m,weather_code,wind_speed_10m&daily=sunset&timezone=auto&forecast_days=1";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw 0;
        return r.json();
      })
      .then((d) => {
        const c = d.current;
        if (!c) throw 0;
        const temp = Math.round(c.temperature_2m) + "°C";
        const wind = Math.round(c.wind_speed_10m) + " km/h";
        const desc = wmo(c.weather_code);
        let sunset = fallback.sunset;
        if (d.daily?.sunset?.[0]) {
          sunset = new Date(d.daily.sunset[0]).toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
          });
        }
        setWeather({ temp, desc, wind, sunset });
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  // Welcome: only show if not already seen this session
  useEffect(() => {
    const fromTD = /[?&]from=treatydays/.test(window.location.search);
    const seen = read("sk_welcome_seen");
    if (fromTD || !seen) {
      setWelcomeOpen(true);
    } else {
      setWelcomeOpen(false);
    }
  }, []);

  const closeWelcome = useCallback(() => {
    setWelcomeOpen(false);
    store("sk_welcome_seen", "1");
  }, []);

  // Restore persona
  useEffect(() => {
    const saved = read("sk_persona") as PersonaKey | null;
    if (saved && PERSONAS[saved]) {
      setPersona(saved);
      setSuggestedMode(true);
    }
  }, []);

  const setPersonaAndClose = useCallback((k: PersonaKey | null) => {
    setPersona(k);
    if (k) {
      setSuggestedMode(true);
      store("sk_persona", k);
    } else {
      setSuggestedMode(false);
      store("sk_persona", "");
    }
    setView("today");
    setPicked(null);
    closeWelcome();
  }, [closeWelcome]);

  // Visible events (filter + search)
  const visible = useMemo(() => {
    return allEvents.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (search) {
        const hay = (e.title + " " + e.location + " " + e.category + " " + e.info).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [allEvents, filter, search]);

  // My RSVPs: load when phone entered
  const loadMyRsvps = useCallback(async (phone: string) => {
    setMyRsvpsLoading(true);
    setMyRsvpsError(null);
    try {
      const res = await fetch(`/api/rsvp?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load RSVPs");
      setMyRsvps(data.rsvps);
      setMyRsvpsPhone(phone);
    } catch (err) {
      setMyRsvpsError(err instanceof Error ? err.message : "Failed to load RSVPs");
      setMyRsvps(null);
    } finally {
      setMyRsvpsLoading(false);
    }
  }, []);

  const cancelRsvp = useCallback(
    async (id: string) => {
      if (!myRsvpsPhone) return;
      try {
        const res = await fetch(
          `/api/rsvp?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(myRsvpsPhone)}`,
          { method: "DELETE" },
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to cancel");
        // Refresh the list
        setMyRsvps((prev) => prev?.filter((r) => r.id !== id) ?? null);
        // Also remove from local "going" set
        const rsvp = myRsvps?.find((r) => r.id === id);
        if (rsvp) {
          setGoing((prev) => {
            const next = new Set(prev);
            // We don't know the exact client id, so just leave the going set alone —
            // it'll get refreshed on next page load
            return next;
          });
        }
      } catch (err) {
        setMyRsvpsError(err instanceof Error ? err.message : "Failed to cancel");
      }
    },
    [myRsvpsPhone, myRsvps],
  );

  // RSVP success handler — mark event as going locally
  const onRsvpSuccess = useCallback((eventId: string) => {
    setGoing((prev) => new Set(prev).add(eventId));
  }, []);

  // Tab change handler
  const changeView = useCallback((v: View) => {
    setView(v);
    setPicked(null);
    if (v === "today" && persona) setSuggestedMode(true);
    else if (v !== "today") setSuggestedMode(false);
    // Scroll to main
    document.querySelector(".main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [persona]);

  return (
    <div className="app-shell">
      {bannerOpen && (
        <div className="banner">
          <span className="banner__pulse" />
          <span>🔥 Grand prize announcement coming soon — stay tuned!</span>
          <button
            className="banner__close"
            aria-label="Dismiss"
            onClick={() => setBannerOpen(false)}
          >
            ×
          </button>
        </div>
      )}

      <Hero
        theme={theme}
        onToggleTheme={toggleTheme}
        onNotices={() => changeView("news")}
        weather={weather}
        moon={moonInfo}
      />

      <nav className="tabs">
        <div className="tabs__inner">
          <button
            className={"tab" + (view === "today" ? " is-active" : "")}
            onClick={() => changeView("today")}
          >
            Today
          </button>
          <button
            className={"tab" + (view === "week" ? " is-active" : "")}
            onClick={() => changeView("week")}
          >
            This Week
          </button>
          <button
            className={"tab" + (view === "calendar" ? " is-active" : "")}
            onClick={() => changeView("calendar")}
          >
            Calendar
          </button>
          <button
            className={"tab" + (view === "news" ? " is-active" : "")}
            onClick={() => changeView("news")}
          >
            News
          </button>
          <button
            className={"tab" + (view === "myrsvps" ? " is-active" : "")}
            onClick={() => changeView("myrsvps")}
          >
            My RSVPs
          </button>
        </div>
      </nav>

      <main className="main">
        {view !== "myrsvps" && view !== "news" && (
          <>
            <SearchBar value={search} onChange={setSearch} />
            {wotd && <Wotd wotd={wotd} />}
            {persona && !suggestedMode && (
              <PersonaPill
                persona={persona}
                onViewPicks={() => {
                  setSuggestedMode(true);
                  setView("today");
                }}
                onClear={() => setPersonaAndClose(null)}
              />
            )}
            <Filters value={filter} onChange={setFilter} />
          </>
        )}

        {view === "today" && (
          <TodayView
            events={visible}
            persona={suggestedMode ? persona : null}
            going={going}
            onRsvp={(e) => setRsvpEvent(e)}
            onShare={shareEvent}
            onAddCal={addToCalendar}
            calY={calY}
            calM={calM}
            picked={picked}
            setPicked={setPicked}
            setCalY={setCalY}
            setCalM={setCalM}
            onSeeAll={() => setSuggestedMode(false)}
            onDateClear={() => setPicked(null)}
            onDayPopup={(d) => setDayPopDate(d)}
          />
        )}
        {view === "week" && (
          <WeekView events={visible} going={going} onRsvp={(e) => setRsvpEvent(e)} />
        )}
        {view === "calendar" && (
          <CalendarView
            events={allEvents}
            going={going}
            onRsvp={(e) => setRsvpEvent(e)}
            calY={calY}
            calM={calM}
            picked={picked}
            setPicked={setPicked}
            setCalY={setCalY}
            setCalM={setCalM}
            onDayPopup={(d) => setDayPopDate(d)}
          />
        )}
        {view === "news" && <NewsView />}
        {view === "myrsvps" && (
          <MyRsvpsView
            phone={myRsvpsPhone}
            setPhone={setMyRsvpsPhone}
            rsvps={myRsvps}
            loading={myRsvpsLoading}
            error={myRsvpsError}
            onLoad={loadMyRsvps}
            onCancel={cancelRsvp}
          />
        )}
      </main>

      <Footer />

      {rsvpEvent && (
        <RsvpModal
          event={rsvpEvent}
          onClose={() => setRsvpEvent(null)}
          onSuccess={(partySize) => {
            onRsvpSuccess(rsvpEvent.id);
            // If we're in My RSVPs view, refresh
            if (view === "myrsvps" && myRsvpsPhone) loadMyRsvps(myRsvpsPhone);
          }}
        />
      )}

      {dayPopDate && (
        <DayPopupModal
          date={dayPopDate}
          events={allEvents.filter((e) => e.date === dayPopDate)}
          persona={suggestedMode ? persona : null}
          going={going}
          onRsvp={(e) => {
            setDayPopDate(null);
            setRsvpEvent(e);
          }}
          onClose={() => setDayPopDate(null)}
        />
      )}

      {welcomeOpen && (
        <WelcomeModal persona={persona} onPick={setPersonaAndClose} onSkip={closeWelcome} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* HERO                                                                       */
/* ════════════════════════════════════════════════════════════════════════ */

function Hero({
  theme,
  onToggleTheme,
  onNotices,
  weather,
  moon,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNotices: () => void;
  weather: { temp: string; desc: string; wind: string; sunset: string } | null;
  moon: { icon: string; main: string; sub: string } | null;
}) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="hero">
      <div className="hero__slides">
        {SLIDES.map((s, i) => (
          <div key={i} className={"hero__slide" + (i === slide ? " is-active" : "")}>
            <img src={s.src} alt={s.alt} fetchPriority={i === 0 ? "high" : "auto"} />
          </div>
        ))}
      </div>
      <div className="hero__inner">
        <div className="hero__top">
          <div className="hero__crest">
            <img src="/hero/crest.png" alt="Sagkeeng community crest" />
          </div>
          <div className="hero__titles">
            <div className="hero__nation">Sagkeeng Anicinabe Nation</div>
            <h1 className="hero__title">Community Calendar</h1>
            <div className="hero__sub">Zaagiing — Mouth of the River</div>
          </div>
          <div className="hero__tools">
            <button
              className="hero__btn hero__icon"
              onClick={onToggleTheme}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button className="hero__btn" onClick={onNotices}>
              Notices
            </button>
          </div>
        </div>
        <div className="hero__strips">
          {weather && (
            <div className="strip">
              <span className="strip__temp">{weather.temp}</span>
              <div>
                <span className="strip__main">{weather.desc} · Sagkeeng</span>
                <span className="strip__sub">
                  Wind {weather.wind}
                  {weather.sunset ? `  ·  Sunset ${weather.sunset}` : ""}
                </span>
              </div>
            </div>
          )}
          {moon && (
            <div className="strip">
              <span className="strip__icon">{moon.icon}</span>
              <div>
                <span className="strip__main">{moon.main}</span>
                <span className="strip__sub">{moon.sub}</span>
              </div>
            </div>
          )}
        </div>
        <div className="hero__dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={"hero__dot" + (i === slide ? " is-active" : "")}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* SEARCH BAR + WORD OF THE DAY + PERSONA PILL + FILTERS                      */
/* ════════════════════════════════════════════════════════════════════════ */

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search">
      <Icon name="search" size={17} />
      <input
        type="text"
        placeholder="Search events, places, departments…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button
        className={"search__clear" + (value ? " is-visible" : "")}
        aria-label="Clear search"
        onClick={() => onChange("")}
      >
        ×
      </button>
    </div>
  );
}

function Wotd({ wotd }: { wotd: (typeof WORDS)[number] }) {
  return (
    <div className="wotd">
      <span className="wotd__feather">🪶</span>
      <div className="wotd__text">
        <span className="wotd__word">{wotd.word}</span>
        <span className="wotd__en">{wotd.en}</span>
        <span className="wotd__note">{wotd.note}</span>
      </div>
    </div>
  );
}

function PersonaPill({
  persona,
  onViewPicks,
  onClear,
}: {
  persona: PersonaKey;
  onViewPicks: () => void;
  onClear: () => void;
}) {
  return (
    <div className="persona-pill" style={{ display: "flex" }}>
      <button className="pchip" onClick={onViewPicks}>
        ✨ For {PERSONAS[persona].label.toLowerCase()} · view picks
      </button>
      <button className="pchip pchip--x" aria-label="Clear who this is for" onClick={onClear}>
        ×
      </button>
    </div>
  );
}

function Filters({
  value,
  onChange,
}: {
  value: Category | "all";
  onChange: (v: Category | "all") => void;
}) {
  const cats: (Category | "all")[] = [
    "all", "culture", "health", "youth", "elders", "family", "special",
  ];
  return (
    <div className="filters">
      {cats.map((c) => (
        <button
          key={c}
          className={"filter" + (value === c ? " is-active" : "")}
          onClick={() => onChange(c)}
        >
          {c === "all" ? "All events" : CATEGORIES[c]}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* EVENT CARD                                                                 */
/* ════════════════════════════════════════════════════════════════════════ */

function EventCard({
  e,
  isGoing,
  onRsvp,
  onShare,
  onAddCal,
}: {
  e: NormalizedEvent;
  isGoing: boolean;
  onRsvp: (e: NormalizedEvent) => void;
  onShare: (e: NormalizedEvent) => void;
  onAddCal: (e: NormalizedEvent) => void;
}) {
  const mins = minutesUntil(e.date, e.start);
  const isNow = mins <= 0 && mins >= -240;
  const soon = mins > 0 && mins <= 120;
  const time = e.start + (e.end ? " – " + e.end : "");
  const setLabel =
    e.setting === "outdoor" ? "Outdoor" : e.setting === "indoor" ? "Indoor" : "";
  const jp = /jordan/i.test(e.location);

  return (
    <article
      className={
        "card" +
        (isNow ? " card--live" : "") +
        (e.featured ? " card--featured" : "")
      }
      data-cat={e.category}
    >
      <div className="card__rail" />
      <div className="card__body">
        {(isNow || soon || e.moon || e.recurring) && (
          <div className="card__tags">
            {isNow && (
              <span className="pill pill--live">
                <span className="dot" />
                Happening now
              </span>
            )}
            {soon && !isNow && (
              <span className="pill pill--soon">Starts in {mins} min</span>
            )}
            {e.moon && <span className="pill pill--moon">Full moon</span>}
            {e.recurring && <span className="pill pill--muted">Weekly</span>}
          </div>
        )}
        <h3 className="card__title">
          {e.title}
          {jp && <span className="card__jp">Jordan&apos;s Principle</span>}
        </h3>
        <div className="card__meta">
          <span className="card__meta-item card__date">
            <Icon name="calendar" />
            <b>
              {weekday(e.date)}, {shortDate(e.date)}
            </b>
          </span>
          <span className="card__meta-item">
            <Icon name="clock" />
            {time}
          </span>
          <span className="card__meta-item">
            <Icon name="pin" />
            {e.location}
          </span>
          {setLabel && (
            <span className="card__meta-item">
              <Icon name={e.setting as "outdoor" | "indoor"} />
              {setLabel}
            </span>
          )}
        </div>
        {e.info && <p className="card__info">{e.info}</p>}
        <div className="card__foot">
          {e.spots != null && (
            <span className="card__spots">
              <Icon name="users" />
              {e.spots - (isGoing ? 1 : 0)} spots left
            </span>
          )}
          {e.contact && <span className="card__contact">{e.contact}</span>}
        </div>
        <div className="card__actions">
          <button
            className={"btn btn--rsvp" + (isGoing ? " is-going" : "")}
            onClick={() => onRsvp(e)}
          >
            {isGoing ? (
              <>
                <Icon name="check" />
                You&apos;re going
              </>
            ) : (
              "RSVP"
            )}
          </button>
          <button
            className="btn btn--icon"
            title="Add to your calendar"
            onClick={() => onAddCal(e)}
            aria-label="Add to your calendar"
          >
            <Icon name="clock" />
          </button>
          <button
            className="btn btn--icon"
            title="Share to Facebook"
            onClick={() => onShare(e)}
            aria-label="Share to Facebook"
          >
            <Icon name="share" />
          </button>
        </div>
      </div>
    </article>
  );
}

/* River spine item — a card wrapped in the timeline rail */
function RiverItem({
  e,
  isGoing,
  onRsvp,
  onShare,
  onAddCal,
  last,
}: {
  e: NormalizedEvent;
  isGoing: boolean;
  onRsvp: (e: NormalizedEvent) => void;
  onShare: (e: NormalizedEvent) => void;
  onAddCal: (e: NormalizedEvent) => void;
  last: boolean;
}) {
  return (
    <div className="river__row">
      <div className="river__rail">
        <span className="river__node" data-cat={e.category} />
      </div>
      <div className="river__content">
        <div className="river__date">
          {weekday(e.date)} <strong>{dayNum(e.date)}</strong>
        </div>
        <EventCard
          e={e}
          isGoing={isGoing}
          onRsvp={onRsvp}
          onShare={onShare}
          onAddCal={onAddCal}
        />
      </div>
      {last && <div style={{ display: "none" }} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* VIEWS                                                                      */
/* ════════════════════════════════════════════════════════════════════════ */

function secLabel(t: string) {
  return <h2 className="seclabel">{t}</h2>;
}

function empty(icon: string, title: string, note: string) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      <div className="empty__note">{note}</div>
    </div>
  );
}

function TodayView({
  events,
  persona,
  going,
  onRsvp,
  onShare,
  onAddCal,
  calY,
  calM,
  picked,
  setPicked,
  setCalY,
  setCalM,
  onSeeAll,
  onDateClear,
  onDayPopup,
}: {
  events: NormalizedEvent[];
  persona: PersonaKey | null;
  going: Set<string>;
  onRsvp: (e: NormalizedEvent) => void;
  onShare: (e: NormalizedEvent) => void;
  onAddCal: (e: NormalizedEvent) => void;
  calY: number;
  calM: number;
  picked: string | null;
  setPicked: (d: string | null) => void;
  setCalY: (y: number) => void;
  setCalM: (m: number) => void;
  onSeeAll: () => void;
  onDateClear: () => void;
  onDayPopup: (d: string) => void;
}) {
  const TODAY = todayISO();

  if (persona) {
    // Curated "For You" landing
    const pmatch = events.filter((e) => audienceMatch(e, persona));
    return (
      <SuggestedView
        events={pmatch}
        persona={persona}
        going={going}
        onRsvp={onRsvp}
        onShare={onShare}
        onAddCal={onAddCal}
        calY={calY}
        calM={calM}
        picked={picked}
        setPicked={setPicked}
        setCalY={setCalY}
        setCalM={setCalM}
        onSeeAll={onSeeAll}
        onDateClear={onDateClear}
        onDayPopup={onDayPopup}
      />
    );
  }

  const todayEvents = events.filter((e) => e.date === TODAY);
  const featured = events.filter((e) => e.featured && e.date > TODAY).slice(0, 2);
  const upcoming = events.filter((e) => e.date > TODAY).slice(0, 8);

  return (
    <>
      {todayEvents.length > 0 ? (
        <>
          {secLabel("Today · " + longDate(TODAY))}
          <div className="river">
            {todayEvents.map((e, i) => (
              <RiverItem
                key={e.id}
                e={e}
                isGoing={going.has(e.id)}
                onRsvp={onRsvp}
                onShare={onShare}
                onAddCal={onAddCal}
                last={i === todayEvents.length - 1}
              />
            ))}
          </div>
        </>
      ) : (
        empty("🌊", "Nothing scheduled today", "Here's what's coming up next.")
      )}
      {featured.length > 0 && (
        <>
          {secLabel("Don't miss")}
          {featured.map((e) => (
            <EventCard
              key={e.id}
              e={e}
              isGoing={going.has(e.id)}
              onRsvp={onRsvp}
              onShare={onShare}
              onAddCal={onAddCal}
            />
          ))}
        </>
      )}
      {upcoming.length > 0 && (
        <>
          {secLabel("Coming up")}
          <div className="river">
            {upcoming.map((e, i) => (
              <RiverItem
                key={e.id}
                e={e}
                isGoing={going.has(e.id)}
                onRsvp={onRsvp}
                onShare={onShare}
                onAddCal={onAddCal}
                last={i === upcoming.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SuggestedView({
  events,
  persona,
  going,
  onRsvp,
  onShare,
  onAddCal,
  calY,
  calM,
  picked,
  setPicked,
  setCalY,
  setCalM,
  onSeeAll,
  onDateClear,
  onDayPopup,
}: {
  events: NormalizedEvent[];
  persona: PersonaKey;
  going: Set<string>;
  onRsvp: (e: NormalizedEvent) => void;
  onShare: (e: NormalizedEvent) => void;
  onAddCal: (e: NormalizedEvent) => void;
  calY: number;
  calM: number;
  picked: string | null;
  setPicked: (d: string | null) => void;
  setCalY: (y: number) => void;
  setCalM: (m: number) => void;
  onSeeAll: () => void;
  onDateClear: () => void;
  onDayPopup: (d: string) => void;
}) {
  const TODAY = todayISO();
  const p = PERSONAS[persona];

  // Guided calendar — only their events light up
  const byDate: Record<string, NormalizedEvent[]> = {};
  events.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  // List: picked day's events OR all upcoming for them
  let list: React.ReactNode;
  if (picked) {
    const pe = byDate[picked] || [];
    list = (
      <div className="picked">
        <div className="picked__title">{longDate(picked)}</div>
        {pe.length > 0 ? (
          pe.map((e) => (
            <EventCard
              key={e.id}
              e={e}
              isGoing={going.has(e.id)}
              onRsvp={onRsvp}
              onShare={onShare}
              onAddCal={onAddCal}
            />
          ))
        ) : (
          <p className="picked__empty">Nothing for you this day.</p>
        )}
        <button className="btn btn--text" onClick={onDateClear}>
          ← Back to all your events
        </button>
      </div>
    );
  } else {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 45);
    const until = iso(horizon);
    const up = events.filter((e) => e.date >= TODAY && e.date <= until).slice(0, 12);
    list = (
      <>
        {secLabel("Coming up for you")}
        {up.length > 0 ? (
          up.map((e) => (
            <EventCard
              key={e.id}
              e={e}
              isGoing={going.has(e.id)}
              onRsvp={onRsvp}
              onShare={onShare}
              onAddCal={onAddCal}
            />
          ))
        ) : (
          empty("🌊", "Nothing tagged for you just yet", "Tap “See all events” below for the full calendar.")
        )}
      </>
    );
  }

  return (
    <div className="foryou">
      <div className="foryou__head">
        <div>
          <div className="foryou__kicker">Picked for you</div>
          <h2 className="foryou__title">For {p.label.toLowerCase()}</h2>
          <p className="foryou__sub">
            Tap a highlighted day on the calendar, or scroll down for everything you
            can join — each RSVP is an entry in the draw.
          </p>
        </div>
      </div>
      <CalendarGrid
        events={events}
        calY={calY}
        calM={calM}
        picked={picked}
        setPicked={setPicked}
        setCalY={setCalY}
        setCalM={setCalM}
        onDayPopup={onDayPopup}
        guided
      />
      {list}
      <button className="btn btn--seeall" onClick={onSeeAll}>
        See all events
      </button>
    </div>
  );
}

function WeekView({
  events,
  going,
  onRsvp,
}: {
  events: NormalizedEvent[];
  going: Set<string>;
  onRsvp: (e: NormalizedEvent) => void;
}) {
  const TODAY = todayISO();
  const end = weekEndISO();
  const wk = events.filter((e) => e.date >= TODAY && e.date <= end);
  if (!wk.length) {
    return empty("🍁", "No events this week", "Check the calendar for what's ahead.");
  }
  const groups: Record<string, NormalizedEvent[]> = {};
  wk.forEach((e) => {
    (groups[e.date] = groups[e.date] || []).push(e);
  });
  return (
    <>
      {Object.keys(groups)
        .sort()
        .map((d) => {
          const t = d === TODAY;
          return (
            <div key={d} className="daygroup">
              <div className={"daygroup__head" + (t ? " is-today" : "")}>
                <span>{longDate(d)}</span>
                {t && <span className="badge">Today</span>}
              </div>
              {groups[d].map((e) => (
                <EventCard
                  key={e.id}
                  e={e}
                  isGoing={going.has(e.id)}
                  onRsvp={onRsvp}
                  onShare={shareEvent}
                  onAddCal={addToCalendar}
                />
              ))}
            </div>
          );
        })}
    </>
  );
}

function CalendarView({
  events,
  going,
  onRsvp,
  calY,
  calM,
  picked,
  setPicked,
  setCalY,
  setCalM,
  onDayPopup,
}: {
  events: NormalizedEvent[];
  going: Set<string>;
  onRsvp: (e: NormalizedEvent) => void;
  calY: number;
  calM: number;
  picked: string | null;
  setPicked: (d: string | null) => void;
  setCalY: (y: number) => void;
  setCalM: (m: number) => void;
  onDayPopup: (d: string) => void;
}) {
  const byDate: Record<string, NormalizedEvent[]> = {};
  events.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  return (
    <>
      <CalendarGrid
        events={events}
        calY={calY}
        calM={calM}
        picked={picked}
        setPicked={setPicked}
        setCalY={setCalY}
        setCalM={setCalM}
        onDayPopup={onDayPopup}
      />
      {picked ? (
        <div className="picked">
          <div className="picked__title">{longDate(picked)}</div>
          {(byDate[picked] || []).length > 0 ? (
            (byDate[picked] || []).map((e) => (
              <EventCard
                key={e.id}
                e={e}
                isGoing={going.has(e.id)}
                onRsvp={onRsvp}
                onShare={shareEvent}
                onAddCal={addToCalendar}
              />
            ))
          ) : (
            <p className="picked__empty">No events this day.</p>
          )}
        </div>
      ) : (
        <p className="cal__hint">
          Tap a highlighted day to see what's on — and RSVP right there.
        </p>
      )}
    </>
  );
}

function CalendarGrid({
  events,
  calY,
  calM,
  picked,
  setPicked,
  setCalY,
  setCalM,
  onDayPopup,
  guided,
}: {
  events: NormalizedEvent[];
  calY: number;
  calM: number;
  picked: string | null;
  setPicked: (d: string | null) => void;
  setCalY: (y: number) => void;
  setCalM: (m: number) => void;
  onDayPopup: (d: string) => void;
  guided?: boolean;
}) {
  const byDate: Record<string, NormalizedEvent[]> = {};
  events.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  const dim = daysInMonth(calY, calM);
  const lead = firstWeekday(calY, calM);
  const TODAY = todayISO();

  const shift = (delta: number) => {
    let m = calM + delta;
    let y = calY;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (m < 0) {
      m = 11;
      y--;
    }
    setCalY(y);
    setCalM(m);
    setPicked(null);
  };

  return (
    <div className={"cal" + (guided ? " cal--guided" : "")}>
      <div className="cal__head">
        <button
          className="cal__nav"
          aria-label="Previous month"
          onClick={() => shift(-1)}
        >
          <Icon name="arrow" flip />
        </button>
        <div className="cal__title">
          {MONTHS[calM]} {calY}
        </div>
        <button className="cal__nav" aria-label="Next month" onClick={() => shift(1)}>
          <Icon name="arrow" />
        </button>
      </div>
      <div className="cal__grid cal__grid--names">
        {DAYS.map((d) => (
          <div key={d} className="cal__name">
            {d}
          </div>
        ))}
      </div>
      <div className="cal__grid">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={"e" + i} className="cal__cell cal__cell--empty" />
        ))}
        {Array.from({ length: dim }).map((_, i) => {
          const day = i + 1;
          const key = calY + "-" + pad(calM + 1) + "-" + pad(day);
          const evs = byDate[key] || [];
          const t = key === TODAY;
          const pk = key === picked;
          const mn = FULL_MOONS.indexOf(key) >= 0;
          const cls =
            "cal__cell" +
            (t ? " is-today" : "") +
            (pk ? " is-picked" : "") +
            (evs.length ? " has-events" : "");
          const cats: Category[] = [];
          evs.forEach((e) => {
            if (!cats.includes(e.category) && cats.length < 4) cats.push(e.category);
          });
          return (
            <button
              key={key}
              className={cls}
              data-date={key}
              onClick={() => evs.length && onDayPopup(key)}
            >
              <span className="cal__num">{day}</span>
              {mn && (
                <span className="cal__moon" title="Full moon">
                  ●
                </span>
              )}
              {evs.length > 0 && (
                <span className="cal__dots">
                  {cats.map((c) => (
                    <span key={c} className="cal__dot" data-cat={c} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewsView() {
  return (
    <>
      {secLabel("News & notices")}
      {NEWS.map((n, i) => (
        <article key={i} className="news" data-type={n.type}>
          <span className="news__type">{n.type}</span>
          <h3 className="news__title">{n.title}</h3>
          <p className="news__info">{n.info}</p>
          <span className="news__time">{n.posted}</span>
        </article>
      ))}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* MY RSVPS VIEW                                                              */
/* ════════════════════════════════════════════════════════════════════════ */

interface MyRsvp {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStart: string;
  location: string;
  category: string;
  name: string;
  partySize: number;
  attendees: string;
  reminderOptIn: boolean;
  reminderLeadMin: number;
  createdAt: string;
  lastReminder: { kind: string; status: string; sentAt: string } | null;
}

function MyRsvpsView({
  phone,
  setPhone,
  rsvps,
  loading,
  error,
  onLoad,
  onCancel,
}: {
  phone: string;
  setPhone: (v: string) => void;
  rsvps: MyRsvp[] | null;
  loading: boolean;
  error: string | null;
  onLoad: (phone: string) => void;
  onCancel: (id: string) => void;
}) {
  const [input, setInput] = useState(phone);

  useEffect(() => {
    setInput(phone);
  }, [phone]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoad(input);
  };

  return (
    <>
      {secLabel("My RSVPs")}
      <p className="foryou__sub" style={{ marginBottom: 18 }}>
        Enter the phone number you RSVP&apos;d with to see your events, check your text
        reminder status, or cancel.
      </p>
      <form className="myrsvps__phone-row" onSubmit={submit}>
        <input
          className="field"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(204) 367-2290"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn--rsvp" type="submit" disabled={loading}>
          {loading ? "Loading…" : "Find my RSVPs"}
        </button>
      </form>

      {error && <div className="rsvp__error">{error}</div>}

      {rsvps !== null && (
        <div className="myrsvps__list">
          {rsvps.length === 0 ? (
            <div className="myrsvp__empty">
              <div className="ic" style={{ fontSize: 38 }}>
                📭
              </div>
              <h3>No RSVPs found for that number</h3>
              <p>
                If you RSVP&apos;d with a different number, try that one. Or browse the
                calendar and RSVP to your first event — every RSVP is an entry in {DRAW_NAME}{" "}
                draw.
              </p>
            </div>
          ) : (
            rsvps.map((r) => {
              const isPast = r.eventDate < todayISO();
              return (
                <article
                  key={r.id}
                  className={"myrsvp" + (isPast ? " myrsvp__past" : "")}
                  data-cat={r.category}
                >
                  <div className="myrsvp__rail" />
                  <div className="myrsvp__body">
                    <h3 className="myrsvp__title">{r.eventTitle}</h3>
                    <div className="myrsvp__meta">
                      <span className="myrsvp__meta-item">
                        <Icon name="calendar" />
                        {longDate(r.eventDate)}
                      </span>
                      <span className="myrsvp__meta-item">
                        <Icon name="clock" />
                        {r.eventStart}
                      </span>
                      <span className="myrsvp__meta-item">
                        <Icon name="pin" />
                        {r.location}
                      </span>
                    </div>
                    <div className="myrsvp__row">
                      <span>RSVP for {r.partySize}</span>
                      {r.attendees && <span>· {r.attendees}</span>}
                    </div>
                    <div className="myrsvp__row">
                      <span
                        className={
                          "myrsvp__reminder" + (r.reminderOptIn ? "" : " is-off")
                        }
                      >
                        <Icon name="bell" />
                        {r.reminderOptIn
                          ? `Text reminder ${r.reminderLeadMin >= 60 ? `${Math.round(r.reminderLeadMin / 60)}h` : `${r.reminderLeadMin}min`} before`
                          : "No text reminder"}
                      </span>
                      {r.lastReminder && r.lastReminder.kind === "confirmation" && (
                        <span>
                          · Confirmation {r.lastReminder.status === "sent" ? "sent" : "queued"}
                        </span>
                      )}
                    </div>
                    {!isPast && (
                      <div className="myrsvp__actions">
                        <button
                          className="btn btn--danger"
                          onClick={() => {
                            if (confirm("Cancel this RSVP?")) onCancel(r.id);
                          }}
                        >
                          Cancel RSVP
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* RSVP MODAL                                                                 */
/* ════════════════════════════════════════════════════════════════════════ */

function RsvpModal({
  event,
  onClose,
  onSuccess,
}: {
  event: NormalizedEvent;
  onClose: () => void;
  onSuccess: (partySize: number) => void;
}) {
  const [attendees, setAttendees] = useState<{ name: string }[]>([{ name: "" }]);
  const [phone, setPhone] = useState("");
  const [reminderOptIn, setReminderOptIn] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ partySize: number; reminder: { optedIn: boolean; status: string } } | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first field when modal opens
    setTimeout(() => firstFieldRef.current?.focus(), 50);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    setError("");
    const named = attendees.filter((a) => a.name.trim());
    if (!named.length || !named[0].name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!validPhone(phone)) {
      setError("Please enter a valid 10-digit phone number so we can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventIdSlug(event),
          name: named[0].name.trim(),
          phone,
          attendees: named.slice(1).map((a) => a.name.trim()),
          reminderOptIn,
          reminderLeadMin: 60,
          contact_reason: "", // honeypot
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone({
        partySize: data.partySize,
        reminder: data.reminder,
      });
      onSuccess(data.partySize);
    } catch {
      setError("Couldn't send right now. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  const time = event.start + (event.end ? " – " + event.end : "");
  const setLabel =
    event.setting === "outdoor" ? "Outdoor" : event.setting === "indoor" ? "Indoor" : "";

  return (
    <div className="modal is-open" role="dialog" aria-modal="true" aria-label="RSVP">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__box">
        <button
          className="modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="x" size={15} />
        </button>
        {done ? (
          <RsvpSuccess
            event={event}
            partySize={done.partySize}
            reminder={done.reminder}
            onClose={onClose}
          />
        ) : (
          <div className="rsvp">
            <div className="rsvp__eyebrow">
              {CATEGORIES[event.category]}
              {setLabel ? " · " + cap(setLabel) : ""}
            </div>
            <h3 className="rsvp__title">{event.title}</h3>
            <div className="rsvp__when">
              {longDate(event.date)} · {time}
              <br />
              <Icon name="pin" />
              {event.location}
            </div>
            <div className="rsvp__form">
              <label className="rsvp__label">Who&apos;s coming?</label>
              <div id="rsvp-rows">
                {attendees.map((a, i) => (
                  <div className="field-row" key={i}>
                    <input
                      className="field"
                      placeholder={
                        i === 0 ? "Your name" : "Name (e.g. your child)"
                      }
                      value={a.name}
                      ref={i === 0 ? firstFieldRef : undefined}
                      autoComplete={i === 0 ? "name" : "off"}
                      onChange={(e) => {
                        const next = [...attendees];
                        next[i] = { name: e.target.value };
                        setAttendees(next);
                      }}
                    />
                    {i === 0 ? (
                      <input
                        className="field"
                        placeholder="Phone number"
                        value={phone}
                        inputMode="tel"
                        autoComplete="tel"
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    ) : (
                      <button
                        className="field-remove"
                        aria-label="Remove"
                        onClick={() => {
                          const next = attendees.filter((_, j) => j !== i);
                          setAttendees(next);
                        }}
                      >
                        <Icon name="x" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="rsvp__add"
                onClick={() => setAttendees([...attendees, { name: "" }])}
              >
                + Add another person (same phone)
              </button>
              <p className="rsvp__hint">
                Bringing your kids? Add each one — every name is a separate entry into{" "}
                {DRAW_NAME}.
              </p>

              {/* SMS reminder opt-in */}
              <div
                className={"rsvp__sms" + (reminderOptIn ? " is-on" : "")}
                onClick={() => setReminderOptIn((v) => !v)}
                role="checkbox"
                aria-checked={reminderOptIn}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setReminderOptIn((v) => !v);
                  }
                }}
              >
                <div className="rsvp__sms-check">
                  <Icon name="check" size={14} />
                </div>
                <div className="rsvp__sms-body">
                  <div className="rsvp__sms-title">
                    <Icon name="bell" size={14} />
                    Text me a reminder 1 hour before
                  </div>
                  <div className="rsvp__sms-note">
                    We&apos;ll send one SMS an hour before the event starts. Your number is
                    only used for this calendar — never shared. Reply STOP any time to opt
                    out.
                  </div>
                </div>
              </div>

              {/* Honeypot */}
              <input
                className="hp-field"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                onChange={() => {}}
              />

              <div className="rsvp__error">{error}</div>
              <button
                className="btn btn--primary"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Count me in"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RsvpSuccess({
  event,
  partySize,
  reminder,
  onClose,
}: {
  event: NormalizedEvent;
  partySize: number;
  reminder: { optedIn: boolean; status: string };
  onClose: () => void;
}) {
  const entries = partySize > 1 ? `${partySize} entries` : "1 entry";
  const smsDemo = reminder.optedIn && reminder.status === "demo";
  const smsSent = reminder.optedIn && reminder.status === "sent";

  return (
    <div className="rsvp rsvp--done">
      <div className="rsvp__seal">
        <Icon name="check" size={32} />
      </div>
      <h3 className="rsvp__title">You&apos;re going!</h3>
      <p className="rsvp__done-event">
        {event.title}
        <br />
        <span>
          {longDate(event.date)} · {event.start}
        </span>
      </p>
      <div className="rsvp__entry">
        {entries} added to {DRAW_NAME} draw
      </div>
      {smsSent && (
        <div className="rsvp__sms-status">
          <Icon name="message" size={16} />
          Confirmation text sent to your phone.
        </div>
      )}
      {smsDemo && (
        <div className="rsvp__sms-status is-demo">
          <Icon name="bell" size={16} />
          Reminder scheduled — Twilio not configured, so SMS is in demo mode
          (logged to server). Add TWILIO_* env vars to send real texts.
        </div>
      )}
      {event.contact && (
        <p className="rsvp__contact">Questions? Call {event.contact}</p>
      )}
      <button className="btn btn--primary" onClick={onClose}>
        Done
      </button>
      <button className="btn btn--text" onClick={onClose}>
        RSVP for another event →
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* DAY POPUP MODAL                                                            */
/* ════════════════════════════════════════════════════════════════════════ */

function DayPopupModal({
  date,
  events,
  persona,
  going,
  onRsvp,
  onClose,
}: {
  date: string;
  events: NormalizedEvent[];
  persona: PersonaKey | null;
  going: Set<string>;
  onRsvp: (e: NormalizedEvent) => void;
  onClose: () => void;
}) {
  let evs = events;
  if (persona) evs = evs.filter((e) => audienceMatch(e, persona));
  // Sort by start time
  evs = [...evs].sort(
    (a, b) => minutesUntil(a.date, a.start) - minutesUntil(b.date, b.start),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal is-open" role="dialog" aria-modal="true" aria-label="Day events">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__box">
        <button className="modal__close" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={15} />
        </button>
        <div className="daypop__head">
          <div className="daypop__day">
            <Icon name="calendar" size={20} />
            <span>{longDate(date)}</span>
          </div>
          {evs.length > 0 && (
            <div className="daypop__count">
              {evs.length} event{evs.length > 1 ? "s" : ""} — tap RSVP to enter {DRAW_NAME}{" "}
              draw
            </div>
          )}
        </div>
        {evs.length > 0 ? (
          <div className="daypop__list">
            {evs.map((e) => {
              const isGoing = going.has(e.id);
              const setLabel =
                e.setting === "outdoor" ? "Outdoor" : e.setting === "indoor" ? "Indoor" : "";
              return (
                <div
                  key={e.id}
                  className={"daypop__ev" + (isGoing ? " is-going" : "")}
                  data-cat={e.category}
                >
                  <div className="daypop__rail" />
                  <div className="daypop__ev-body">
                    <div className="daypop__ev-title">{e.title}</div>
                    <div className="daypop__ev-meta">
                      <Icon name="clock" size={13} />
                      {e.start}
                      {e.end ? ` – ${e.end}` : ""}
                      <span className="daypop__sep">·</span>
                      <Icon name="pin" size={13} />
                      {e.location}
                      {setLabel && (
                        <>
                          <span className="daypop__sep">·</span>
                          {setLabel}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    className={"btn btn--rsvp daypop__rsvp" + (isGoing ? " is-going" : "")}
                    onClick={() => onRsvp(e)}
                  >
                    {isGoing ? (
                      <>
                        <Icon name="check" />
                        Going
                      </>
                    ) : (
                      "RSVP"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="daypop__empty">
            <Icon name="calendar" size={32} />
            <p>Nothing scheduled this day.</p>
            <span>Check another highlighted day — new events are added often.</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* WELCOME MODAL (persona picker)                                             */
/* ════════════════════════════════════════════════════════════════════════ */

function WelcomeModal({
  persona,
  onPick,
  onSkip,
}: {
  persona: PersonaKey | null;
  onPick: (k: PersonaKey | null) => void;
  onSkip: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="welcome is-open" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="welcome__backdrop" onClick={onSkip} />
      <div className="welcome__box" ref={boxRef} tabIndex={-1}>
        <div className="welcome__glow" />
        <div className="welcome__mark">🔥</div>
        <div className="welcome__eyebrow">Sagkeeng Anicinabe Nation</div>
        <h2 className="welcome__title">Aaniin — welcome</h2>
        <p className="welcome__blurb">
          See what&apos;s happening on the land. Pick who you&apos;re planning for and
          we&apos;ll highlight the events most relevant to you — every RSVP is an entry in{" "}
          {DRAW_NAME} draw.
        </p>
        <div className="welcome__ask">Who are you planning for?</div>
        <div className="welcome__personas">
          {(Object.keys(PERSONAS) as PersonaKey[]).map((k) => (
            <button
              key={k}
              className={"welcome__pchip" + (persona === k ? " is-active" : "")}
              onClick={() => onPick(k)}
            >
              {PERSONAS[k].label}
            </button>
          ))}
        </div>
        <button className="btn btn--text" onClick={onSkip}>
          Just show me everything
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* FOOTER                                                                     */
/* ════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__brand">🔥 SIGNAL FIRE</div>
      <div className="footer__tag">Connecting communities, one signal at a time</div>
      <div className="footer__meta">
        Sagkeeng Anicinabe Nation · Zaagiing — Mouth of the River
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* SHARED HELPERS (share + add-to-calendar)                                   */
/* ════════════════════════════════════════════════════════════════════════ */

function shareEvent(e: NormalizedEvent) {
  const text =
    "Win the grand prize this year at Treaty Days — RSVP now! — " +
    e.title +
    ", " +
    longDate(e.date) +
    " at " +
    e.location +
    ".";
  const url = window.location.href;
  const fb =
    "https://www.facebook.com/sharer/sharer.php?u=" +
    encodeURIComponent(url) +
    "&quote=" +
    encodeURIComponent(text);
  if (navigator.share) {
    navigator.share({ title: "Sagkeeng Calendar", text, url }).catch(() => {
      window.open(fb, "_blank", "noopener");
    });
  } else {
    window.open(fb, "_blank", "noopener,width=620,height=520");
  }
}

function addToCalendar(e: NormalizedEvent) {
  const p = e.date.split("-").map(Number);
  const stamp = p[0] + pad(p[1]) + pad(p[2]);
  const url =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" +
    encodeURIComponent(e.title) +
    "&dates=" +
    stamp +
    "T120000Z/" +
    stamp +
    "T200000Z" +
    "&details=" +
    encodeURIComponent(e.info) +
    "&location=" +
    encodeURIComponent(e.location + ", Sagkeeng");
  window.open(url, "_blank", "noopener");
}

function validPhone(raw: string): boolean {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  if (d.length !== 10) return false;
  if (d.charAt(0) < "2" || d.charAt(3) < "2") return false;
  if (/^(\d)\1{9}$/.test(d)) return false;
  if (d === "1234567890" || d === "0123456789") return false;
  if (d.slice(3, 6) === "555" && d.slice(6, 8) === "01") return false;
  return true;
}
