# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Responsive SPA, installable as a PWA (`public/manifest.json`, `public/sw.js`). Used on phones and computers alike.

## Users

Players and organizers carry equal weight. One account can hold several roles at once (player, organizer, club owner); roles activate on the account instead of being separate account types.

- **Organizer:** an amateur who runs a recurring category (Liga, Americano or Copa). Sets the tournament up on a computer, then loads results live from a phone at the club, often between matches.
- **Player:** checks their table, upcoming matches and court in real time, signs up for tournaments, looks for open friendly matches, and follows their own history on a public profile.
- **Club owner:** manages courts and bookings. Secondary to the two above.
- **Spectator:** anyone with a link. Sees a tournament, a category or a profile without an account.

## Product Purpose

Amateur padel tournaments run on WhatsApp groups: results in a notebook, a hand-made table sent as a photo. Padeleando replaces that. Success: an organizer runs a full tournament from the app, and every player sees the table, the matches and the court without asking anyone.

## Positioning

- **Anyone can organize.** Unlike OTP Padel (tournament sign-ups) and ATC Sports (bookings and matches), any person can create and run a tournament.
- **Live table.** Each player sees their table, matches and court as results land.
- **Player history.** A public profile with stats, titles, streaks, partners and confirmed friendlies.
- **Replaces WhatsApp.** No notebook, no manual table, no photo in the group.
- **Open match search.** Players find open friendly matches (amistosos) and join them.

## Operating Context

- Tournaments live inside categories (`/cat/:id`). Formats: Liga (round robin, configurable points per win/loss), Americano (group phase + knockout bracket), Copa (groups + playoffs, or direct bracket, plus a copa de plata). Modes: free players or fixed pairs.
- Live match loading with a timer, at the court. TV mode (`TvOverlay`) for a screen at the club.
- Sharing happens by link and by a 9:16 story image for Instagram/WhatsApp. Public routes need no account: `/view/:id`, `/cat/:id`, `/u/:username`.
- Invitations let a hand-entered player claim their slot; their real name then replaces the old one retroactively.
- Friendly matches (2 vs 2) count on the profile once the rival team accepts the result.
- Club booking with optional Mercado Pago payment for Premium club owners.

## Capabilities and Constraints

- Stack: React 19 + Vite + Tailwind 4 SPA (Vercel), Express 5 API (Render), Neon Postgres (São Paulo). See `CLAUDE.md` for engineering rules.
- Performance is a product constraint: the main routes score 85–95 on mobile Lighthouse after the July 2026 audit. Any change must keep that.
- Padel has no draws. A match never ends tied.
- Plans: free allows 2 categories and 2 tournaments per category per month (1 Copa). Premium unlocks advanced stats, galleries and avatar upload. A downgrade never removes or hides existing content. Friendlies have no plan limit.
- **Undecided:** final list prices (`src/utils/plan.js`); a tiered plan ladder (basic / premium / club) with decreasing commission on sign-ups and bookings; how to charge an organizer's first tournament; in-app sign-up payment that charges only once the minimum of pairs is reached.

### Terminology (user-facing)

- "torneo", never "jornada" (the code still says jornada).
- "grupos", never "zona" (the API says zona).
- "amistoso" (the code says friendly).
- Game categories read "C7" / "D5" (C = Caballeros, D = Damas), never "7ª C". Also SUMA XX and MIXTO XX tournaments.
- Level scale: Alevín, Principiante, Básico, Intermedio, Avanzado, Maestro, Profesional.

## Brand Commitments

- Name: **Padeleando**. Domain `padeleando.ar`; support mail `soporte@padeleando.ar`.
- Voice: Rioplatense Spanish with voseo ("Organizá", "Armá", "Cargá"). Direct, plain, padel vocabulary.
- Logo assets: `src/assets/padeleando.svg`, `padeleando-logo.webp`, `padeleando-txt*.webp`, `cover-mark.webp`; favicons and PWA icons in `public/`.

## Evidence on Hand

- Real production data: tournaments, matches, categories and profiles from active groups.
- Product screenshots: `src/assets/shot-tabla.webp`, `shot-partidos.webp`, `shot-perfil.webp`; recorded walkthrough `docs/demo.gif`.
- Format photos: `public/formatos/{liga,americano,copa}-{600,1200}.webp`.
- Avatar images in `src/assets/` (Leito, Romannn, Sofia) used by `PremiumModal`.
- No written testimonials, press, customer counts or benchmarks exist. Do not invent them.

## Product Principles

1. Serve the player and the organizer in the same screen; neither is an afterthought.
2. Live first: what is happening at the court now outranks everything else.
3. Every public surface works from a link, without an account or an install.
4. Never show a wrong number. A stat with no data yet ships hidden, not guessed.
5. One-handed and fast on a phone at the club; complete on a computer at home.
