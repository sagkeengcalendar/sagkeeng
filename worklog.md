# miina community calendar — worklog

## Task `rebuild-routes` — community route structure + admin pages

**Agent:** Claude (Z.ai Code)
**Scope:** Rebuild the community route structure and admin pages that were lost in a sandbox reset.

### What was done

#### Step 1 — Moved the calendar to `[community]/calendar-client.tsx`
- `mkdir -p src/app/[community]`
- `mv src/app/page.tsx src/app/[community]/calendar-client.tsx`
- Added imports: `MiinaLogo`, `SmudgeCanvas`, `RotatingSlogans` from `@/components/calendar/*`.
- Exported a new `CommunityInfo` interface (`{ slug, name, tagline, crestUrl? }`) and changed the default export from `Home()` to `CalendarApp({ community })`.
- **Hero**: replaced the `<div className="hero__slides">…</div>` block with `<SmudgeCanvas className="hero__canvas" />` + `<RotatingSlogans />`. Removed the now-unused `slide` state, the slide-cycle `useEffect`, the `SLIDES` constant, and the `.hero__dots` pagination (they referenced slides that no longer exist).
- **Hero crest**: now `<img src={community.crestUrl || "/hero/crest.png"} alt={`${community.name} crest`} />`.
- **Hero texts**: `Sagkeeng Anicinabe Nation` → `{community.name}`, `Zaagiing — Mouth of the River` → `{community.tagline}`. Weather strip "· Sagkeeng" → `· {community.name}`.
- **`Hero`, `Footer`, `WelcomeModal`** all now take a `community: CommunityInfo` prop and the call sites pass it.
- **Welcome modal**: `🔥` → `<img src="/hero/crest.png" … />` (with the `welcome__mark` styling preserved). `Aaniin` → `Boozhoo`. Eyebrow uses `{community.name}`.
- **Footer**: `🔥 SIGNAL FIRE` → `<MiinaLogo size={28} /> <span>miina</span>`. Tag → `miinawaa · again and again`. Meta uses `{community.name}` + tagline.
- **RsvpModal**: new `communitySlug: string` prop, sent in the POST `/api/rsvp` body as `communitySlug`.
- **EventCard**: when `e.requiresRegistration` is truthy, the RSVP button is replaced by `<span className="card__register-note"><Icon name="phone" /> Please call JP to register — space may be limited</span>`. The calendar + share icon buttons remain.
- **PersonaPill**: now renders three buttons — `✨ For {persona}` (view picks), `Change` (reopens welcome), `All events` (clears persona + suggestedMode + localStorage via the existing `setPersonaAndClose(null)`). New `onChange` prop, `onClear` re-points to "All events".
- Added `requiresRegistration?: boolean` to `RawEvent` / `NormalizedEvent` in `src/lib/calendar-data.ts` and propagated it through `normalize()`.

#### Step 2 — `[community]/page.tsx` (server component)
- `force-dynamic`.
- `generateMetadata` reads from DB (try/catch) and falls back to `getCommunityConfig`.
- `CommunityCalendarPage` looks up the slug in the DB, falls back to `COMMUNITIES[slug]`, calls `notFound()` if neither exists, then renders `<CalendarApp community={communityInfo} />`.

#### Step 3 — New landing page at `src/app/page.tsx`
- Client component. Fetches `/api/communities`, renders a centered hero (`miina` title, tagline, blurb), a responsive grid of community cards (each linking to `/{slug}`), and a footer.
- Loading state = 3 skeleton bars. Empty state = friendly "no communities yet" message with a mailto link.
- Updated `src/app/layout.tsx` metadata to be miina-branded (multi-community) instead of Sagkeeng-only.

#### Step 4 — Admin pages
- `src/app/admin/page.tsx` — community add form (slug, name, tagline, admin secret). POSTs to `/api/communities/create`. Shows a success card with a link to the new `/{slug}` calendar when the create succeeds. Links to `/admin/rsvps`.
- `src/app/admin/rsvps/page.tsx` — RSVP dashboard:
  - Password login screen that stores the secret in `sessionStorage` and sends it as `x-cron-secret` on every request.
  - Search bar (matches name, phone, event title, location, community, attendees, department, category).
  - Department filter dropdown (`all`, `culture`, `health`, `youth`, `elders`, `family`, `special`).
  - Two views:
    - **By Event** — clickable cards that expand to show attendees (sorted by name). Each expanded card has a "Copy attendee list" button that writes a formatted text summary to the clipboard.
    - **All RSVPs** — sortable table with name, phone (tel: link), event, date, department chip, party size, community, and a per-row Delete button.
  - Delete button on every RSVP (calls `DELETE /api/admin/rsvps?id=…` and re-fetches).
  - Stats bar (RSVPs, attendees, events) and a "Database: …" warning when the DB is unreachable.
  - Fully responsive — table scrolls horizontally on mobile, cards stack, attendee rows reflow.
  - Lint-clean: had to refactor the sessionStorage hydration to use lazy `useState` initializers (the React 19 `react-hooks/set-state-in-effect` rule rejects `setState` inside `useEffect`).

#### Step 5 — Config files
- `prisma/schema.prisma`:
  - `provider = "postgresql"` confirmed.
  - Added `Community` model (`id`, `slug` (unique), `name`, `tagline`, `crestUrl`, `published`, timestamps, relation to `Rsvp`).
  - Added `communityId String?` + `community Community?` relation on `Rsvp` (with `onDelete: SetNull`), plus `@@index([communityId])`.
- `package.json`: `"build": "prisma generate && next build"` and `"postinstall": "prisma generate"` were already correct.
- `next.config.ts`: no `output: "standalone"` to remove — already clean.
- `vercel.json`: changed the Sunday digest cron from daily `0 23 * * *` to explicit Sunday `0 18 * * 0` (matches the comment in `api/reminders/digest/route.ts`).

#### Step 6 — API tweaks to support the new flow
- `api/rsvp/route.ts` POST now accepts `communitySlug` and stores `communityId = "cm_" + slug` on the new RSVP.
- `api/admin/rsvps/route.ts`:
  - `getCommunityName` handles `null` and strips `cm_` prefix as a fallback.
  - New `getCommunitySlug` helper.
  - Each RSVP in the response now includes the resolved `communitySlug`.
  - Each `byEvent` bucket now carries `community`, `communitySlug`, `department`.

#### Step 7 — CSS appended to `globals.css`
- `.hero__canvas` — absolute, full-bleed, dark background (sits behind `.hero__inner`).
- `.hero__slogans` / `.hero__slogan` — Fraunces italic, bright `#f6f1e9`, same brightness as the hero title, centered over the canvas with a subtle amber glow. Reduced size on mobile.
- `.pchip--change` — neutral surface variant for the new "Change" persona button.
- `.pchip--x` — overrode the old `width: 36px` fixed-square rule so it can carry the "All events" text.
- `.card__register-note` — pill-styled call-JP note that replaces the RSVP button on `requiresRegistration` events.
- `.landing__*` — full design system for the landing page (hero, communities grid, skeleton, empty state, footer, responsive).
- `.admin__*` — full design system for the community-add admin page (header, form, success/error states, aside card).
- `.admin-rsvps__*` — full design system for the RSVP dashboard (login shell, toolbar, stats, by-event cards, attendee list, table, delete button, copy button, responsive breakpoints).
- Dark-mode overrides for the new amber-on-dark tokens.

### Verification
- `bun run lint` — passes (after fixing the `set-state-in-effect` lint error in the RSVP dashboard by switching to lazy `useState` initializers for sessionStorage hydration).
- Dev server (auto-running on port 3000):
  - `GET /` → 200 (landing page, 25 KB of HTML, contains "Find your community" + miina branding).
  - `GET /sagkeeng` → 200 (calendar app, contains "Boozhoo" (not "Aaniin"), dynamic `{community.name}`, `hero__canvas`, `hero__slogans`, miina footer).
  - `GET /admin` → 200 (community add form).
  - `GET /admin/rsvps` → 200 (sign-in screen rendered server-side).
  - `GET /api/communities` → 200, returns `[{slug:"sagkeeng", name:"Sagkeeng Anicinabe Nation", tagline:"Zaagiing — Mouth of the River", crestUrl:null}]` (DB fallback to hardcoded COMMUNITIES works).
  - `GET /api/admin/rsvps` → 503 (correct — `CRON_SECRET` env var isn't set in this sandbox; the route refuses to run without it, which is the documented behavior).
  - `GET /nonexistent-community-xyz` → 404 (server component's `notFound()` fires correctly).

### Notes / decisions
- **Prisma provider mismatch**: `prisma/schema.prisma` says `postgresql` but the sandbox `.env` has `DATABASE_URL=file:…` (SQLite). Per the task instructions ("ensure `provider = "postgresql"`"), I kept the schema as postgresql. All DB-touching code already used try/catch + hardcoded `COMMUNITIES` fallbacks, so the app runs correctly in this sandbox — it just won't persist RSVPs until a real Postgres URL is provided. `prisma generate` succeeded (Prisma Client now knows about the `Community` model), but `prisma db push` fails on the URL-protocol mismatch; this is a deployment-time concern.
- **`IconName` import**: still imported but unused in `calendar-client.tsx`. Left as-is because it was unused in the original `page.tsx` too and ESLint doesn't flag it (it's a `type` import).
- **Smudge canvas + slogans**: the SmudgeCanvas paints the full hero background (replacing the old `hero__slides` image cross-fader). RotatingSlogans renders a centered italic Fraunces slogan that cycles every 3.5 s. Both are aria-hidden / decorative.
- **Welcome modal mark**: kept the `.welcome__mark` glow styling — only swapped the `🔥` glyph for a 56 × 56 crest `<img>` so the radial glow still frames it nicely.
- **RSVP dashboard auth**: secret is stored in `sessionStorage` (cleared when the tab closes) — not `localStorage` — so a shared computer doesn't stay authed. Lazy `useState` initializers read from `sessionStorage` on first render to avoid the React 19 `set-state-in-effect` lint error.
