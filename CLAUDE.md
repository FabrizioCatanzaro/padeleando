# CLAUDE.md — PADELEANDO

## Project Overview

PADELEANDO is a full-stack web app for managing padel tennis tournaments. It supports three tournament formats (Liga/Americano/Copa), two modes (Free players/Fixed pairs), live match tracking, standings, stats, invitations, and public sharing of tournaments. Users have public profiles with personal stats (win %, streaks, recent matches, frequent partners, americano championships). Premium accounts unlock extra features (photo galleries). Profile photos are free for everyone. An admin dashboard is available to users with `role = 'admin'`.

---

## Current Status (updated 2026-11-26)

- **In progress: Perfil** — branch `feat/perfil`. Stage 2 of 5 done: the API carries the new profile (see the API's CLAUDE.md › Perfil) and the client already reads `owner_profile` and `user.whatsapp`/`hand`/`side` for signup contacts and prefills. Next: `/perfil/editar`, then the profile header. `ProfileView` still shows the old form until then. Mockups: https://claude.ai/artifact/3EXHdQ9P3uexvEc99tTa8U
- **Last sprint: Navegación por módulos** — on `staging`, PR `staging` → `main` pending. The same PR carries the americano from 4 to 32 pairs. Logged-in users get a left sidebar (≥1024 px) and a glass bottom bar (mobile) with Inicio · Partidos · Torneos · Padeleros · Perfil, a Crear menu, a new Inicio and one screen per module. No schema change: every new endpoint is read-only. See [Navegación](#navegación). Plan: https://claude.ai/artifact/GC9aYGdjAfUNyqHRokNKKT · mockups: https://claude.ai/artifact/2m1JUEys3vakLZaFwjF23o
- **Previous sprint: Amistosos** — merged to `main` (front PR #45, API PR #38). Friendly 2 vs 2 matches outside any tournament that count toward the profile once the rival team accepts the result: open matches people join from `/amistosos`, played matches loaded with their result, proposals and counter-proposals, guests who claim their slot by link, reminders generated on read, the profile filter Todos / Torneos / Amistosos, an edit screen and a club-name search. Design doc: https://claude.ai/artifact/2y4oNfCD6oWt2FewGrzHC1
- **The friendly schema is in production since that deploy**: `db:init` creates `friendly_matches`, `friendly_match_players` and `friendly_match_proposals`, widens `notifications_type_check` and adds `uq_friendly_reminder`. It was tested on a Neon branch that has been deleted.
- **Sprint before: Copa** — merged to `main` (front PR #44, API PR #37). It shipped the Copa format (groups + playoffs, or direct bracket, copa de plata, prizes, per-player WhatsApp/availability), the redesigned tournament setup (`Setup.jsx`: format cards with photos, config/info sub-steps, segmented `StepBar`, one-row pair loader, summary aside), WhatsApp for the multi-day liga, and the mail domain change to `soporte@padeleando.ar` (Resend now sends from `padeleando.ar`). Design doc: https://claude.ai/artifact/X8KtqZZQamuNXRxhBDqftw
- **Production DB already has the Copa schema** (`copa_config`, `bracket_plata`, `pairs.zona`, `tournament_players` data columns, `court_id`, `tournament_prizes`). `db:init` re-applies it as a no-op.
- **Local dev points at the production database** (`padeliando-api/.env`, backed up in `produccion.env`). For risky work, create a Neon branch of `production` (project `weathered-morning-55905272`), point `.env` at it, and delete the branch when done. Test data is named `TEST …` and deleted at the end.
- **Git flow:** feature branch from `staging` → commits authored by Fabrizio Catanzaro → `merge --ff-only` into `staging` → Fabrizio pushes and opens the PR `staging` → `main`. Never commit `.claude/` or `.mcp.json`.
- **Open items:**
  - Navegación follow-ups: Feed and Ranking in Padeleros (shown as "Próximamente"); unconfirmed club bookings in Inicio › Pendientes once bookings ship; a player directory with a category filter in Padeleros › Jugadores.
  - Amistosos follow-ups: playing data (dominant hand, preferred side) on the user's profile; a locality filter once clubs carry their locality (`GET /friendlies/localities` is kept for it); email reminders through a scheduled GitHub Actions workflow; linking a friendly to a club booking.
  - Super tie-break as a match format (left out of the Copa sprint on purpose, "option b").
  - TV mode (`TvOverlay`) shows the main bracket only, not the copa de plata.
  - Fecha generation can still warn "ya no se completa el todos contra todos" mid-season after a withdrawal (the last fecha was fixed; the general case is a pessimistic warning, not a wrong fixture).
  - Pre-existing test rows in production, not from the Copa sprint: players "Test Jugador Uno", "Test Jugador Dos", "Test Claude".

---

## Repositories

| Repo | Path | Purpose |
|------|------|---------|
| Frontend | `c:\Users\Fabry\Programacion\padeliando` | React + Vite SPA |
| Backend API | `c:\Users\Fabry\Programacion\padeliando-api` | Express REST API |

Both repos are independent — they are **not** a monorepo.

---

## Tech Stack

**Frontend**
- React 19.2 + React Router 7.13
- Vite 6.3 (build tool)
- Tailwind CSS 4.2 (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- Lucide React (icons)

**Backend**
- Node.js + Express 5.2
- Neon serverless PostgreSQL (`@neondatabase/serverless`)
- JWT authentication (1h access token, 3h opaque refresh token — both httpOnly cookies; the refresh token is stored hashed and rotated on every use)
- Bcrypt for password hashing
- Resend for transactional email (password reset, email verification)
- Cloudinary for image uploads (avatars, tournament photos)
- Mercado Pago for subscriptions (routes live; list prices not final yet), plus OAuth Connect so a Premium club owner can link their own MP account and collect booking payments in-app

---

## Dev Commands

### Frontend (`padeliando/`)
```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Backend (`padeliando-api/`)
```bash
npm run dev       # Start Express server with nodemon (http://localhost:3001)
npm start         # Start without hot reload
```

---

## Environment Variables

### Frontend (`.env.local`)
| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (`http://localhost:3001` in dev, `https://padeleando-api.onrender.com` in prod) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Backend (`.env`)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `PORT` | API port (default: 3001) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `FRONTEND_URL` | Used in email links (verification, password reset) |
| `JWT_SECRET` | Signs access tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth verification |
| `RESEND_API_KEY` | Transactional email service |
| `MAIL_FROM` | Sender address for emails (default: `Padeleando <onboarding@resend.dev>`) |
| `SURVEY_URL` | Link to the satisfaction survey in the account-deletion goodbye email (falls back to `FRONTEND_URL`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MP_ACCESS_TOKEN` | Mercado Pago token (subscriptions) |
| `NODE_ENV` | `production` or `development` |

---

## Architecture

```
Browser
  └── React App (AuthContext + ThemeContext)
        └── React Router routes
              └── Components
                    └── useTournament hook  ←→  src/utils/api.js  →  Express API  →  Neon DB
                                                                                  →  Cloudinary (images)
```

- **`src/utils/api.js`** is the single API client. It handles auth token refresh on 401 automatically. All HTTP calls must go through it.
- **`src/context/AuthContext.jsx`** wraps the entire app and provides `user`, `login()`, `logout()`, `isLoggedIn`.
- **`src/hooks/useTournament.js`** is the central hook for all tournament operations (matches, players, pairs, scores, bracket). Components should use this hook rather than calling `api.js` directly.
- **`src/utils/helpers.js`** normalizes API responses (`adaptTournament`, `adaptMatch`, `adaptPair`), patches stale bracket names (`patchBracketNames`), and calculates standings client-side (`calcStandings`).

---

## Key Conventions

### Code style

- **No multi-line comments.** Comment only when the context is impossible to grasp otherwise, and in a single short line.
- The long reasoning — why a criterion was chosen, what measurement backs it, what bug motivated the change — goes in the commit message or in this file, never in the source.

### API Calls
- **Never use `fetch()` directly in components.** All API calls go through `src/utils/api.js`.
- The api wrapper handles 401 → token refresh → retry automatically.
- Multipart (file upload) calls use `reqMultipart()` internally — exposed as `api.auth.uploadAvatar`, `api.photos.upload`.

### Data Normalization
- API responses are always normalized through adapter functions in `helpers.js` before use:
  - `adaptTournament(t)` — normalize tournament; resolves `linked_name`, patches bracket names
  - `adaptMatch(m)` — normalize match
  - `adaptPair(p)` — normalize pair

### Name Resolution (`linked_name` pattern)
- When a user accepts an invitation, their player slot gains a `user_id` link. From that point on, the backend returns `u.name AS linked_name` alongside `p.name` for all player queries.
- `adaptTournament` resolves every player to `linked_name ?? name`, so components always show the real account name.
- Bracket names are baked into the stored JSONB. `patchBracketNames` (called inside `adaptTournament`) re-derives all pair/winner names from the current player list, fixing stale stored names retroactively.
- Consequence: **all name resolution happens in `adaptTournament`**. Backend queries must include `LEFT JOIN users u ON u.id = p.user_id` and `u.name AS linked_name` wherever players are fetched.

### Standings
- Always calculated **client-side** with `calcStandings(players, matches)` from `helpers.js`.
- Sorted by: wins → point differential → points for.
- In americano format, the champion is determined by `bracket.final.winner_id`, not the standings table.
- **A match never ends in a draw.** There is no such thing in padel: `MatchForm` won't let you save one, `POST/PUT /matches` reject `score1 === score2`, and `calcStandings` discards any equal score it finds (legacy rows only) instead of awarding it to anyone.

### Stats
Three surfaces, all fed from the same primitives — keep them consistent with each other:

- **Tournament** (`Stats.jsx` › "Este torneo") and **category** (› "Históricas", premium gates the advanced block) are computed client-side from `players` + `matches`.
- **Profile** (`GET /groups/user/:username`) is computed in SQL, plus in-memory merges in `lib/profileStats.js`.

Rules that keep the three from drifting:

- **Knockout matches are not in the `matches` table** — americano and copa keep them inside `tournaments.bracket` (JSONB), and the copa's consolation draw inside `tournaments.bracket_plata`. Any stat that counts matches must expand them: `bracketNodes` (every round, including `dieciseisavos` and `tercer`) and `getAllMatches` on the client, `expandBracketMatches` on the profile. Forgetting this is why the profile used to show a championship whose matches didn't exist.
- **Group historical stats must key on player identity, not on `players.id` or on the name.** The same person gets a new `players` row per jornada, and names repeat: use `linked_username` when the slot is linked, the normalized name otherwise (`playerKey` in `Stats.jsx`).
- **Never re-derive a winner by parsing a label** — `getTournamentWinners(t)` returns the winning player ids; `getTournamentWinnerLabel` is just its join. Names contain `&`.
- **Titles count every format.** `stats.titulos` = `titulos_liga` (finished liga standings, or the liga playoffs final) + `campeon_americano` + `campeon_copa` (both from `bracket.final`). Winning the copa de plata is not a title.
- **The winrate ranking is smoothed** (`rankedWinRate`, prior of 2 matches toward the category mean) so a 1-0 record doesn't outrank an 18-4 one. The table still displays the real percentage.
- Neon returns `DATE` columns as JS `Date` objects: use `dayKey()` before comparing or sorting them as strings.
- **A tournament's date is `tournamentDate(t)`**, not `created_at` — the jornada is usually loaded a few days after it was played (13 of 28 tournaments differ, by up to 13 days). Order is `event_date` → first `played_at` → `created_at`.
- Anything that walks the whole history per jornada (rank-per-jornada, head to head) must accumulate in **one** pass; recomputing the ranking for each jornada is quadratic. `buildRankHistory` and `buildHeadToHead` measure 1 ms at 100 jornadas.

**Check the data before building a stat**, and when the data isn't there yet, ship the stat hidden rather than wrong. Three of these currently compute to zero on purpose and light up on their own:

- **Sets** (`countSetStats`) only counts best-of-three matches and returns `disponible: false` while none exist — with one set, "sets won" equals "matches won" and a comeback is impossible. `sets` is filled on 18% of matches and none has used the 3-set format yet.
- **Blowout** = 6-0, or every set 6-0 in a best-of-three (`countBlowouts`). No 6-0 exists yet: matches are played to 3, 4 or 6 games, so the shutouts on record are 1-0, 3-0 and 5-0. Do **not** replace this with a games-difference threshold — that was tried and a `>= 4` matched 2% of matches while "loser scored zero" would flag a 1-0.
- **Follow ranking** (`buildFollowRanking`) compares the user against the people they follow; it needs 2+ people with matches to render, and today there are 2 follows in the whole database. It adds each user's knockout matches so the numbers match their profile.
- **Confirmed friendlies count in the profile** (not in tournament or category stats). They never add titles. See [Amistosos](#amistosos).
- `ajustados` (1-game margin) is the one "close match" measure that means the same at any match length — 41% of matches qualify.
- `duration_seconds` covers 69% of matches, so anything derived from it must say how many matches it measured.
- Leagues run on a fixed weekday: the profile's weekday chart only renders with 3+ active days, otherwise it is five empty bars.

**The profile's advanced stats are gated server-side.** `GET /groups/user/:username` returns them only to the owner, or to anyone if a premium user opted in via `users.advanced_stats_public` (default `false`). The queries that only feed that block are skipped entirely when it won't render. The frontend's `canSeeAdvanced` mirrors the same rule for the UI and the profile snapshot, but it is cosmetic — the payload is the source of truth, so don't put those fields back into the public response.

### Americano

- 4 to 32 fixed pairs (`AMERICANO_MIN_PAIRS` / `AMERICANO_MAX_PAIRS` in `helpers.js`, mirror of the API's `lib/americano.js`). Below the minimum it is a draft.
- Every pair enters the bracket. When the count doesn't fill a round (4, 8, 16, 32), the best pairs of the previa skip the first round. `americanoDirectas(n)` computes how many and which rounds; `AvisoDirectas` shows the warning in `Setup`, `PairManager` and `Bracket` before generating it.
- Below 8 or above 16 the bracket comes in the copa shape (byes, `dieciseisavos`), which `Bracket` already renders.

### Copa

- Two variants in `copa_config.mode`: `zonas` (groups by fechas, then playoffs) and `cuadro` (direct elimination). Always fixed pairs, up to 32.
- **The API calls the groups `zonas`; the UI always says "grupos".** `pairs.zona` is 1-8; `grupoNombre(n)` renders "Grupo A".
- Group tables use `copaStandings` (points → wins → set diff → game diff → games for → pair id), not `calcStandings`. `src/utils/copa.js` mirrors `src/lib/copa.js` in the API.
- Playoffs: `ArmarCuadro` asks `POST /tournaments/:id/copa/cuadro` for a proposal (seeds, `pendientes`, `sin_grupo`), lets the organizer reorder, and confirms with `PUT`. `crucesPrimeraRonda(n)` must match the API's `primeraRonda`. Once armed, the group phase is frozen (409).
- `Bracket` takes `cup="plata"` for the consolation draw; every bracket endpoint selects it with `?copa=plata`. Bracket matches carry day, time and court in `programado`.
- Per-player availability and WhatsApp live in `tournament_players` (one row per tournament), not `players`. The API filters them by viewer: organizer sees all, a player in the tournament sees visible WhatsApps, nobody else sees any.
- Quota: free owners get 1 copa per month per category, and it also counts toward the 2 monthly tournaments.

### Amistosos

- Routes: `/partidos` and `/partidos/mios` (Partidos › Explorar / Mis partidos; old `/amistosos` redirects to `/partidos`), `/amistosos/nuevo` (4-step wizard with `StepBar`), `/amistoso/:id` (detail, "duelo" layout) and `/amistoso/invitacion/:token` (a guest claims their slot). Components in `src/components/Friendly/`, helpers in `src/utils/friendlies.js`, client in `api.friendlies`.
- **The UI says "amistoso"**; the API and the code say `friendly`.
- The status shown is the one the API derives (`abierto`, `completo`, `falta_resultado`, `por_confirmar`, `confirmado`, `cancelado`, `vencido`). Don't re-derive it on the client.
- A `link` (private) match shows "Privado" with a lock on its card. Its share URL carries `?t=share_token`.
- Without a session, "Sumarme" opens a sheet with login/register and `?redirect=` back to the match, never a hard redirect.
- The creator invites a guest with the "Invitar" pill on their row: `ShareFriendlyModal` with `guest` builds the invite message.
- `/amistoso/:id/editar` (`FriendlyEdit`) shows only when `viewer.can_edit`. A played match edits its data but not the format; the result stays. Pickers shared with the wizard (`DurationPicker`, `MoneyInput`, `VisibilityPicker`, `ChoiceChip`, `TimePicker`) live in `parts.jsx`. `TimePicker` is one list from 00:00 to 23:30 every half hour with a short scrolling dropdown: the native time input built its list from the device's current time.
- The open list filters by "Cerca de mí", date and club name (debounced search). There is no locality filter yet.
- **Profile**: when `data.amistosos > 0`, `ProfileView` shows the Todos / Torneos / Amistosos selector over Resumen, Partidos and Estadísticas. Each source is fetched once (`api.groups.byUsername(username, source)`) and cached. The header, the rail and the snapshot always show the total. A friendly row in the match list opens `/amistoso/:id` (`profileMatchHref`).
- Notifications: `friendly_*` types go through `FRIENDLY_TEXT` in `notifText.js`; `friendly_reminder` picks its text from `n.body` and shows an `AlarmClock` icon.

### Navegación

- The logged-in frame lives in `src/components/Shell/`. `navConfig.js` is the single source of the modules, their routes, icons, badge counters and the routes that hide the bottom bar (`HIDE_BOTTOM_NAV`: full-screen forms such as `/amistosos/nuevo`).
- `Sidebar` shows from 1024 px: icons only up to 1279 px, full from 1280 px. It carries the Crear button, the modules and "Tus clubes" (only when the user owns a club). `BottomNav` is the glass bar below 1024 px; its `＋` opens `CreateMenu` as a sheet. `SectionTabs` is the header and tab row of every module; a tab with `soon` renders "Próximamente".
- `<main>` is `min-h-screen`, so the footer never shows on the first screen while a page loads: before, it showed and then jumped down, 0.03–0.23 CLS on every mobile page.
- On mobile the Layout adds `pb-[calc(104px+env(safe-area-inset-bottom))]`. Anything fixed to the bottom (sticky bars, `InstallPrompt`) must sit above the bar with the same offset. `GroupView` and `TournamentPage` show their own tabs at the top for this reason.
- Ads: `AdBanner` keeps the real proportion of the originals (2304:1856, 300×242 at 300 px): Cloudinary `c_limit` with a 300/600/900 `srcset` and `object-contain`, so a banner is never cropped; one in another proportion gets bars. It mounts only the active image and the next one, starts on a random banner, rotates every 7 s only while on screen and stays still with `prefers-reduced-motion`. The images live in Cloudinary under `ads/`, and every banner links to `publicidad@padeleando.ar`.
- **Where ads go.** From 1280 px, a 300 px right column. `AdRail` wraps the content below the page's header and tabs: Partidos, Torneos › Explorar and Mis torneos, Padeleros › Organizadores and Clubes, Notificaciones, FAQ and the legal pages, plus the wide pages (category, tournament and `/view`, profile, club), whose hero and tabs stay full width. Inicio, Organizar and Jugadores have their own right column with the ad at the bottom; `FriendlyDetail` puts it at the foot of its 320 px column. The Layout has no ad column.
- Below 1280 px, `AdInline` shows the banner centered at 300 px at the end of the content, before the footer: Inicio, Torneos, Partidos, Padeleros › Organizadores and Clubes, category, tournament (only when the viewer can't manage it, so `/view` and players), profile, club and FAQ. Not in Notificaciones, nor in a tournament you manage. Never a fixed bar: the bottom nav owns the bottom edge.
- No ads on full-screen forms (`HIDE_BOTTOM_NAV`), Setup, `/nivel`, login and register, admin, subscription or TV mode.
- Put `AdInline` inside the view, after its data arrived: content loading above it would push it down and count as CLS. Wide content inside `AdRail` must scroll inside its column (the bracket uses `xl:overflow-x-auto`): at 1280 px with a session the central column is about 630 px.
- Counters come from one request: `useSummary()` is a shared store over `GET /me/summary`, refreshed on route change and on tab focus (15 s apart at most). Call `refreshSummary()` after an action that changes a pending count. No module asks for its counters separately.
- Routes: `/partidos`, `/partidos/mios`, `/torneos`, `/torneos/mios`, `/torneos/organizar`, `/padeleros/jugadores`, `/padeleros/organizadores`, `/padeleros/clubes`. `/amistosos` redirects to `/partidos` and `/#categorias` to `/torneos/organizar`; `/amistoso/:id` didn't change.
- **Inicio**: `StatRail`, `LiveBand`, `Pendientes` and `Agenda` (`GET /me/agenda`, shared rows in `shared/AgendaList.jsx`), then `ParaSumarte`: open friendlies (within 15 km when location is granted) and tournaments with open signup. Right column: `ResumenCard`, `ClubesCerca`, ad. The category list of the old "Panel" home is gone.
- **Torneos**: Explorar (the `/api/home` showcase plus "Tus categorías": favorites and categories where you play, minus your own), Mis torneos (`GET /me/tournaments`, flat list, phases in `utils/tournamentList.js`) and Organizar (`GET /me/organize`). Organizar links into `GroupView` with `?tab=jugadores|estadisticas` and `?accion=editar|coorg` (owner only). Its quota bar uses the category owner's plan, like every plan gate.
- **Padeleros**: Jugadores (`GET /padeleros/players`), Organizadores (`GET /padeleros/organizers`, "Cerca de mí" sends lat/lon) and Clubes (`api.clubs.browse` / `nearbyStats`, i.e. `?stats=1`). Location goes through `hooks/useGeolocation.js`: it asks on tap, or on mount when the permission is already granted. The club page opens on the booking tab with `?tab=reservar`.
- The avatar menu hides "Tus clubes" and "Mis categorías" on desktop (the sidebar has them); the mobile sheet keeps them.

### Theming
- Theme variables live in `src/index.css` as CSS custom properties under `@theme`.
- Dark mode is the **default**. Light mode adds the `.light` class to `<html>`.
- Use `--color-brand` (lime yellow `#e8f04a`) for primary accent, `--color-surface` for card backgrounds.
- Never hardcode colors — always use the CSS variables.

### Routing & Auth
- Protected routes use the `<PrivateRoute>` component wrapper in `App.jsx`.
- Admin-only routes use `<AdminRoute>` (checks `user.role === 'admin'`).
- Group/tournament URLs use the `/cat/` prefix (e.g. `/cat/:groupId/torneo/:tournamentId`).
- Public routes include: `/`, `/partidos`, `/torneos`, `/padeleros/*`, `/login`, `/register`, `/u/:username`, `/view/:id` (old `/readonly/:id` redirects here), `/tutorial`, `/cat/:groupId`, `/verify-email/:token`, `/reset-password/:token`, `/invitacion/:token`.

### Permissions & Co-organizers
- A category (`groups`) has one **owner** (`groups.user_id`) plus zero or more **co-organizers** (`group_collaborators`). A tournament/jornada has no owner of its own — it inherits from its category.
- Two permission levels, both computed server-side and returned on `GET /groups/:id` and `GET /tournaments/:id`:
  - **`is_owner`** — owner only. Gates owner-exclusive actions: edit/delete the category, transfer ownership, manage co-organizers.
  - **`can_manage`** — owner **or** co-organizer. Gates all jornada management (create/edit/delete jornadas, players, pairs, matches, bracket, photos).
- The frontend `isOwner` returned by `useTournament` now means `can_manage`. In `GroupView`, use `is_owner` for owner-only UI and `can_manage` for jornada management.
- **Authorization is enforced server-side**: mutating tournament/match/pair/player endpoints use `requireAuth` + guards from `middleware/access.js` (`requireTournamentManage`, `requireGroupManage`, etc.), backed by `lib/access.js#canManageGroup`. Do not rely on the frontend alone.
- **Plan/premium gates key off the category owner**, never the acting user: a premium co-organizer does not bypass a basic owner's limits (e.g. the free monthly-tournament cap, photo uploads).
- **Plan quotas live in `lib/plan.js` (API) and mirror in `src/utils/plan.js` (web).** Free allows 2 categories and 2 jornadas per month *per category* (counted on `created_at` of the current calendar month). Both are enforced in `POST /groups` and `POST /tournaments`, which answer `403 { code: 'plan_limit' }` — the frontend checks are only there to save the round-trip.
- **A downgrade never touches what already exists.** A premium user who created 5 categories keeps all 5 fully working when they fall back to free; the quota is compared against the current total, so it just blocks creating a new one. Same for jornadas (the cap resets on the 1st) and for photos already uploaded — the album stays public, only the upload button closes. This is what the `PremiumModal` FAQ promises, so don't make a downgrade archive, hide, or freeze anything.
- **Booking management is free for every club owner.** Only linking Mercado Pago (`ClubInfo`'s COBROS block, gated by `club.owner_is_premium`) to collect payment automatically is Premium — approving/rejecting/blocking turns by hand never was and still isn't.
- Invites (co-organizer and ownership transfer) go by `@username`/email (in-app notification) or by shareable link (`/invitacion/:token`). Ownership transfer is irreversible and only completes when the recipient accepts; the previous owner becomes a co-organizer. See `routes/collaborators.js`.

### Tailwind CSS
- Tailwind 4 is configured via the Vite plugin only — there is no `tailwind.config.js`.
- Custom theme values are defined in `src/index.css` using `@theme {}`.

### Component Organization
- Feature components live in `src/components/<Feature>/`.
- Shared/reusable components live in `src/components/shared/`.
- New components should follow the existing file-per-component pattern.

---

## Performance

A July 2026 audit took the four main routes from 36–78 to 85–95 on mobile Lighthouse. **Every change must be evaluated for performance impact before it is considered done** — those gains disappear on their own if new features reintroduce the patterns below. Each one is a real regression this codebase already paid for.

### Patterns to check before finishing a change

- **Heavy static imports.** Recharts is 111 KB over the wire. If a component sits behind a tab, below the fold, or behind a narrow condition, load it with `React.lazy`. If it also sits at the bottom of a long page, wrap it in `WhenVisible` (`src/components/shared/WhenVisible.jsx`), which mounts it only as it approaches the viewport.
- **Chained `await`s on queries.** With the Neon HTTP driver every `sql` tagged template is its own round-trip to São Paulo. Queries that don't feed each other belong in one `Promise.all`. This was the single most repeated problem in the audit: the public profile went from ~11 serial round-trips to 2, `GET /groups/:id` from 7 to 3.
- **A second request that depends on the first.** Prefer returning those fields in the first response — it saves the round-trip *and* stops the data from arriving late and injecting content. See `/readonly/:id`, which now carries the category's name, emojis and visibility.
- **Content that mounts above something already visible.** It pushes the page down and counts as CLS. Either reserve its height from the first render, or make the data arrive with the rest.
- **Loading states shorter than the real content.** If the placeholder leaves the footer inside the viewport, the real content evicts it and that alone can cost 0.7 CLS. Pages whose content always exceeds the viewport should reserve `min-h-screen` (or `<Loader minHeight="100vh" />`).
- **Images.** Always set `width`/`height`. Cloudinary images go through URL transformations (`f_auto,q_auto,w_N,c_limit`) — untransformed banners were 97% of the mobile page weight.

### Verifying

Do not claim an improvement without measuring it — reading the code is not enough, and several "obvious" hypotheses in the audit turned out to be false when executed.

- Measure in a real browser against the **production build**, never the dev server: `npm run preview` serves bundled chunks, the dev server serves loose modules and proves nothing about code splitting. Confirm the HTML requests `/assets/index-*.js`, not `/@vite/client`.
- Confirm the page actually rendered its data before trusting any number. A page that failed to load looks fast.
- Diagnose CLS with `PerformanceObserver` on `layout-shift` entries, reading `previousRect`/`currentRect`. The obvious suspect is usually not the cause.
- When touching an endpoint, diff the response against the previous code with keys normalized — byte-identical output is the bar.

---

## What NOT to Do

- **Don't write multi-line comments** — one short line at most, and only if it's indispensable; the reasoning belongs in the commit message.
- **Don't bypass `api.js`** — the token refresh logic lives there; skipping it breaks auth.
- **Don't hardcode plan prices, features or the comparison table** — they all live in `src/utils/plan.js` (`PRICE_BY_BILLING`, `PRO_FEATURES`, `PLAN_COMPARISON`), which `PremiumModal` and `SubscriptionManage` import. The four `/subscription/*` routes are live in `App.jsx`, but **the list prices are not final**: when they are, they change in that one file (and in the Mercado Pago plans).
- **Say "torneo", not "jornada", in anything the user reads.** The code and this file still call them jornadas; the UI copy does not.
- **Don't store auth tokens in localStorage** — tokens use httpOnly cookies; only the `user` object (no secrets) is stored in localStorage.
- **Don't use a `tailwind.config.js`** — Tailwind 4 doesn't use one; extend the theme via `@theme {}` in `index.css`.
- **Don't calculate standings server-side** — standings are always derived client-side.
- **Don't allow or model draws** — padel has no draws; a match with `score1 === score2` is invalid data, not a result to display.
- **Don't count matches without expanding the bracket** — americano and copa knockout matches (and `bracket_plata`) are not rows in `matches`. See [Stats](#stats).
- **Don't write "zona" in the UI** — the copa's groups are "grupos" for the user; `zona` is only the API's name.
- **Don't group historical player stats by name** — group by identity (`linked_username` ?? normalized name); a player's `players.id` changes every jornada.
- **Don't show a "CAMPEONES" banner in americano tournaments** — champion is determined by the bracket final, not standings.
- **Don't hardcode player names** — always go through `adaptTournament` / `linked_name` pattern so invited users see their real name.
- **Don't let co-organizers edit or delete a category** — those (plus transfer and managing co-organizers) are owner-only (`is_owner`). Co-organizers manage jornadas only (`can_manage`).
- **Don't gate plan limits on the acting user** — evaluate premium/quota against the **category owner** (`groups.user_id` / `owner_is_premium`).
- **Don't chain `await`ed queries that don't depend on each other** — each one is a separate round-trip on the Neon HTTP driver. Batch them with `Promise.all`. See [Performance](#performance).
- **Don't import charting libraries statically** — Recharts must always be reached through `React.lazy`, otherwise it lands in the initial bundle of every route that touches it.

---

## Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Vercel | `vercel.json` handles SPA rewrites (all → `/index.html`) |
| Backend | Render.com | `https://padeleando-api.onrender.com` |
| Database | Neon (serverless PostgreSQL) | Region: sa-east-1 (São Paulo) |
| Images | Cloudinary | Avatars in `avatars/` folder, tournament photos in `tournament-photos/` |

---

## Database Migrations

Migration files are in `padeliando-api/src/` (flat, alongside routes). Run them manually against Neon when needed. The base schema (all tables + idempotent ALTERs) is in `padeliando-api/src/schema.sql`.

---

## See Also

- [project-structure.md](project-structure.md) — Full component map, routing table, API endpoints, and DB schema reference.
