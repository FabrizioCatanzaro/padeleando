---
name: Padeleando
description: Padel tournaments, live tables and player history, under the club lights.
colors:
  base: "#000000"
  surface: "#0d0d0d"
  surface-alt: "#141414"
  border: "#1c1c1c"
  border-mid: "#222222"
  border-strong: "#2e2e2e"
  brand: "#e8f04a"
  cyan: "#4af0c8"
  green: "#4af07a"
  danger: "#f04a4a"
  muted: "#808080"
  dim: "#8c8c8c"
  secondary: "#9e9e9e"
  soft: "#aaaaaa"
  content: "#cccccc"
  white: "#ffffff"
  photo-ink: "#ffffff"
  photo-shade: "#000000"
  premium: "#f59e0b"
  premium-hi: "#fde68a"
  premium-ink: "#3a2400"
  chart-1: "#8e8f19"
  chart-2: "#6286d8"
  chart-3: "#c17429"
  heat-0: "#141414"
  heat-1: "#6c6d2b"
  heat-2: "#8b8c2c"
  heat-3: "#abac2a"
  heat-4: "#cccd22"
typography:
  display:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  numeral:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "38px"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "\"tnum\""
  section-label:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.16em"
  body:
    fontFamily: "Albert Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Albert Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Albert Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "2px"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  card: "10px"
  xl: "12px"
  sheet: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.base}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.content}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.border-mid}"
    textColor: "{colors.white}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "10px 16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  label-badge:
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  stat-slab:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "14px 16px 18px"
  input:
    backgroundColor: "{colors.base}"
    textColor: "{colors.content}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  nav-header:
    backgroundColor: "{colors.base}"
    padding: "12px 20px"
---

# Design System: Padeleando

## Overview

**Creative North Star: "Cancha de noche"**

Padeleando looks like a padel court at night: a black club, lights on, and one ball-yellow mark on whatever matters right now. The mood is nocturnal, sporty and precise. Dark mode is the default; light mode is a full counterpart (`html.light`), not an afterthought, and every token is redefined there.

The system is dense and compact. Information leads: tables, scores, fixtures and stats. The brand shows in a few precise places: the Amarillo Pelota accent, Unbounded on numbers and titles, and small uppercase labels with wide tracking. Depth comes from tonal layers on black, not from shadows.

The interface serves two scenes at once: an organizer loading results one-handed at the court, and a player checking their table at home. Both get the same compact components.

**Key Characteristics:**
- Pure black base with near-black surfaces and hairline borders.
- One loud accent (Amarillo Pelota) for the primary action, live data and highlighted numbers.
- Unbounded for numbers, titles and primary buttons; Albert Sans for everything read.
- Flat by default; shadow only on what floats.
- Firm, compact components with short corners and thin borders.

## Colors

A black court lit by one ball-yellow accent, with a mint for what comes next and a single gold for achievement.

### Primary
- **Amarillo Pelota** (`brand`): primary buttons, the active step, live badges, highlighted numbers, links on hover, the notification dot. Too bright for large fills: it glares as an area.

### Secondary
- **Menta Próximo** (`cyan`): what comes next. Upcoming matches, the next bracket match, upcoming club events, edit badges.

### Tertiary
- **Verde Victoria** (`green`): wins, success and confirmed states.
- **Rojo Falta** (`danger`): errors, destructive actions, losses.
- **Oro Logro** (`premium`, with `premium-hi` and `premium-ink`): Premium and achievements, nothing else. `premium-ink` is the only ink that reads on the gold gradient.

### Neutral
- **Negro Club** (`base`): page background.
- **Superficie** (`surface`) and **Superficie Alta** (`surface-alt`): cards, modals, stat slabs.
- **Líneas** (`border`, `border-mid`, `border-strong`): three hairline levels, from divider to control outline.
- **Text scale** (`muted` < `dim` < `secondary` < `soft` < `content` < `white`): ordered from least to most contrast in both themes. `white` is a token, the maximum emphasis level, and it inverts to near-black in light mode. Every level passes WCAG AA (4.5:1) on base, surface and surface-alt.
- **Photo ink** (`photo-ink`, `photo-shade`): text and scrims over photos. They never change with the theme.

### Data colors
- **Chart palette** (`chart-1`, `chart-2`, `chart-3`): for chart fills only, never UI accents. Validated for color-blind distinction in both themes.
- **Heat ramp** (`heat-0` to `heat-4`): one hue, monotonic lightness, for heatmaps.

### Named Rules
**The One Ball Rule.** Amarillo Pelota marks the single most important thing in view. It is a mark, not a fill: large areas and chart fills use the chart palette.

**The One Gold Rule.** There is one gold, and it means achievement or Premium. A second yellow-gold reads as the brand and is banned.

**The Token-Only Rule.** Colors come from `@theme` variables. A hardcoded hex breaks light mode.

## Typography

**Display Font:** Unbounded (with sans-serif)
**Body Font:** Albert Sans (with sans-serif)
**Label Font:** Albert Sans. The `font-mono` utility maps to Albert Sans; there is no monospace face.

**Character:** Unbounded is wide, geometric and loud, like a scoreboard digit. Albert Sans is quiet and readable at 11–14px. The contrast between them carries the hierarchy.

### Hierarchy
- **Display** (700–900, 42–50px, line-height 0.9–1.1): hero titles and champion names. Often in Amarillo Pelota.
- **Headline** (700, 24px, 1.2): modal and page titles.
- **Title** (700, 15–18px): card titles, section titles, primary button text.
- **Numeral** (900, 38px stepping down to 30px and 24px by length, tabular): scores and stat values. Always `white`.
- **Section label** (Unbounded 700, 12px, 0.16em tracking): the `SectionRule` heading, followed by a hairline.
- **Body** (400, 13–14px, 1.5–1.6): reading text, descriptions, list rows.
- **Label** (400–700, 10–11px, 2px tracking, written in capitals): steps ("PASO 1 DE 4"), badges, metadata.

### Named Rules
**The Scoreboard Rule.** Numbers that matter use Unbounded with tabular figures. Their size steps down with length; they never wrap or overflow.

**The Small-Caps Label Rule.** Metadata is small, uppercase and widely tracked. Reading text is never uppercase.

## Layout

Mobile-first, single column on phones. Tailwind default breakpoints (640, 768, 1024, 1280px). The main column caps at `max-w-7xl` (1280px); from `xl` two 160px side rails flank it. Forms and modals cap at `max-w-md` (448px).

Spacing runs on a 4px unit, dense on purpose: 8px and 12px are the common gaps, 16px card padding, 24px modal padding. Stat slabs fill an auto grid with a 180px minimum column.

On phones, sheets slide up from the bottom (`rounded-t-2xl`) instead of centered modals. The header is sticky and hides on scroll down.

## Elevation & Depth

The system is flat. Depth comes from tonal steps on black (base, surface, surface-alt) and three border levels. Shadows appear only on elements that float above the page: dropdown menus, the notification panel, sheets and modals. The one exception is the clickable card hover: a faint Amarillo Pelota glow plus a short drop shadow.

### Shadow Vocabulary
- **Floating panel** (Tailwind `shadow-2xl`): menus, notification panel, popovers.
- **Card hover glow** (`box-shadow: 0 0 22px color-mix(in srgb, var(--color-brand) 8%, transparent), 0 4px 14px rgba(0,0,0,0.35)`): `.card-link` on hover, with the border shifting to 30% brand.
- **Modal scrim** (`bg-black/75`): behind modals.

### Named Rules
**The Flat-At-Rest Rule.** Nothing has a shadow at rest. A shadow means "this floats" or "this responds to your pointer".

**The Light-Mode Lift Rule.** In light mode surface-alt does not separate from base, so the stat slab switches to white `surface`.

## Shapes

Short corners and hairline borders. Controls use 4px, cards 12px, stat slabs and modals 10px, bottom sheets 16px on the top edge. Chips, avatars and status dots are fully round. Step bars are rounded capsules split into segments. The stat slab dot is a 6px square with a 1px radius.

## Components

Firm and compact: short corners, thin borders, nothing extra.

### Buttons
- **Shape:** short corners (4px).
- **Primary:** Amarillo Pelota fill, black text, Unbounded bold with wide tracking. Sizes 12/14/16px text with 6–12px vertical padding.
- **Hover / Focus:** primary drops to 90% opacity; secondary fills with `border-mid` and its text goes `white`. Disabled is 40% opacity.
- **Secondary:** transparent with a `border-strong` outline, `content` text in Albert Sans. The default variant.
- **Danger:** transparent, `danger` text, 40% danger outline, 10% danger fill on hover.
- **Ghost:** no border, `muted` text, `white` on hover.
- **Loading:** a spinning lucide `Loader2` replaces the icon.

### Chips
- **Chip:** fully round, `surface` background, 11px label, colored text with a 30% matching outline (brand, cyan, green, danger, or muted).
- **Label badge:** 4px corners, 10px bold, 40% outline. For states like "EN VIVO" or "PRIVADO".
- **Status:** a 6px dot (pulsing when live) or an icon before the text, no box.
- **Filter pill:** round, 36px high; selected adds a 10% brand fill and brand border.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** `surface`, or `surface-alt` for nested blocks.
- **Shadow Strategy:** none at rest; see Elevation & Depth.
- **Border:** `border-mid` hairline.
- **Internal Padding:** 16px (12–16px for compact rows).

### Inputs / Fields
- **Style:** `base` background, `border-mid` hairline, 8px corners, 14px text, 10px by 14px padding.
- **Focus:** border turns brand with a 1px 30% brand ring.
- **Drift:** some older fields still use `surface` backgrounds and 4px corners. The Auth form field is the reference.

### Navigation
- **Header:** sticky, `base` background, bottom `border` hairline, logo plus wordmark on the left, icon buttons in `border-strong` outlines on the right. The notification count is a brand dot with black text.
- **Menus:** `surface` panels with `border-strong` outline, 12px corners and a floating shadow.

### Stat Slab (signature)
`surface-alt` plate, 10px corners. A 6px colored dot and a 12px label on top; the value in Unbounded black, always `white`; a 66px icon watermark at 7–9% opacity in the corner; a 3px bar along the bottom edge. The tone (brand, cyan, green, danger, gold, secondary) lives in the dot, watermark and bar, never in the number.

### Step Bar
Segmented 6px capsule bar: filled segments in brand, pending in `border-strong`. Above it, a small uppercase label "PASO N DE M · <step>" with the step name in brand.

### Section Rule
Section heading in Unbounded 12px with 0.16em tracking in `muted`, followed by a hairline that fills the row, with an optional action on the right.

## Do's and Don'ts

### Do:
- **Do** use the `@theme` color tokens, including `text-white`, so light mode works.
- **Do** keep stat numbers `white` and put the tone in the dot, the watermark and the bottom bar.
- **Do** fill the stat slab bar only when a real proportion backs it; otherwise show the fixed 30px segment.
- **Do** draw icons with lucide-react. Raise `strokeWidth` to 3 below 14px. Put the icon before the text.
- **Do** pick text levels by role: labels and hints in `secondary`, reading text in `content` or `soft`, `muted` only for what should recede.
- **Do** use `photo-ink` and `photo-shade` for text over photos.
- **Do** honor `prefers-reduced-motion`: sheets, alerts and the match ticker stop animating.
- **Do** use the ease-out curve `cubic-bezier(0.16, 1, 0.3, 1)` at 0.24–0.28s for things that enter.

### Don't:
- **Don't** hardcode hex colors in components.
- **Don't** use Amarillo Pelota as a large fill or a chart fill; use `chart-1..3`.
- **Don't** add a second gold or yellow; `premium` is the only one.
- **Don't** use typographic glyphs (✓ ○ →) as icons.
- **Don't** put a shadow on a card at rest.
- **Don't** color a stat number to carry its tone.
- **Don't** invent a proportion to fill a meter bar.
