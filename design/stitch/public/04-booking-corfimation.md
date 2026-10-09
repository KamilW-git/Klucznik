---
name: Warm Cabin Hospitality
colors:
  surface: '#f0fdf3'
  surface-dim: '#d0ddd4'
  surface-bright: '#f0fdf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf7ed'
  surface-container: '#e4f1e7'
  surface-container-high: '#dfebe2'
  surface-container-highest: '#d9e6dc'
  on-surface: '#131e18'
  on-surface-variant: '#404945'
  inverse-surface: '#28332d'
  inverse-on-surface: '#e7f4ea'
  outline: '#717975'
  outline-variant: '#c0c8c4'
  surface-tint: '#396759'
  primary: '#154539'
  on-primary: '#ffffff'
  primary-container: '#2f5d50'
  on-primary-container: '#a3d4c3'
  inverse-primary: '#a0d1c0'
  secondary: '#924b23'
  on-secondary: '#ffffff'
  secondary-container: '#ffa273'
  on-secondary-container: '#783610'
  tertiary: '#463c31'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e5347'
  on-tertiary-container: '#d7c7b8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceddc'
  primary-fixed-dim: '#a0d1c0'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#204f42'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb692'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#75340e'
  tertiary-fixed: '#f0e0d0'
  tertiary-fixed-dim: '#d3c4b4'
  on-tertiary-fixed: '#221a10'
  on-tertiary-fixed-variant: '#4f4539'
  background: '#f0fdf3'
  on-background: '#131e18'
  surface-variant: '#d9e6dc'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: DM Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: DM Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored for boutique, family-run, and independent hospitality businesses across Poland—such as lakeside cabins, Mazury retreats, agritourism estates, and forest lodges. It bridges operational efficiency for hosts with an inviting, tactile sense of sanctuary for travelers.

The design philosophy combines **Organic Minimalism** and **Tactile Warmth**:
- **Atmosphere:** Earthy, grounded, serene, and dependable. It avoids sterile corporate SaaS cliches in favor of craft, warmth, and quiet confidence.
- **Visual Cadence:** Generous breathing room, paper-like surfaces, soft tonal contrast, and honest material-inspired hues that evoke pine needles, fired clay, and morning mist over Masurian lakes.
- **Localization & Polish Character:** Tailored typography and clear information hierarchies accommodating Polish diacritics (`ą, ć, ę, ł, ń, ó, ś, ź, ż`), explicit formatting for the Polish złoty (`120 zł / doba`), and standard Polish date formatting (`DD.MM.YYYY`).

## Colors

The palette is anchored in nature, avoiding harsh monochromatic blacks and artificial neon saturations.

### Core Swatches
- **Primary (`#2F5D50` - Forest Green):** The commanding structural color for primary actions, header navigation, active reservation states, and key anchors.
- **Secondary / Accent (`#C8754A` - Warm Terracotta):** Used selectively for focal callouts, promotional badges, primary conversion highlights, and interactive states needing warmth.
- **Tertiary (`#E8D8C8` - Sand Tint):** A gentle warm undertone for badge backdrops, subtle dividers, and hover states.
- **Neutral Dark (`#1F2A24` - Deep Moss Charcoal):** Replaces pure black for typography, structural borders, and dense information text to eliminate eye strain.
- **Canvas / Background (`#FAF7F2` - Warm Off-White):** Unbleached parchment baseline evoking linen, daylight, and timber.
- **Surface Layer (`#FFFFFF` - Pure Card Surface):** Elevates interactive cards and calendars with crisp contrast against `#FAF7F2`.

### Booking Status System (System Statuses)
- **Oczekuje (Pending):** Background `#FEF3C7`, Text/Border `#92400E` (Warm Amber). Indicates payments or approvals awaiting host action.
- **Potwierdzona (Confirmed):** Background `#E6F3EE`, Text/Border `#215844` (Moss Green). Communicates secured dates and verified bookings.
- **Anulowana (Cancelled):** Background `#FEE2E2`, Text/Border `#991B1B` (Brick Crimson). Denotes user/host cancellations.
- **Wygasła (Expired):** Background `#F3F4F6`, Text/Border `#6B7280` (Muted Mist Gray). Unpaid or lapsed booking holds.
- **Zakończona (Completed):** Background `#E2E8F0`, Text/Border `#475569` (Cool Slate / Blue-Gray). Past historical stays.

## Typography

DM Sans provides a geometric, balanced base with soft humanist terminals, perfectly complementing comfortable rural hospitality interfaces while keeping tabular calendar data legible.

- **Numerals & Pricing:** Numerals retain tabular spacing (`font-variant-numeric: tabular-nums`) across pricing tables, night counts, and date ranges (`18.06.2025 – 22.06.2025 | 4 noce`).
- **Polish Diacritics:** Kerning profiles must render all Central European glyphs (`ą, ć, ę, ł, ń, ó, ś, ź, ż`) cleanly without ascender clipping.
- **Weights:** 
  - `400` (Regular) for descriptions, terms, and guest correspondence.
  - `500` (Medium) for UI controls, inputs, and breadcrumbs.
  - `600` (SemiBold) for subheadings, dates, and card titles.
  - `700` (Bold) strictly for key headline metrics and cabin names.

## Layout & Spacing

The layout employs a responsive fluid container with constrained maximum widths (`1280px` for main dashboards and booking flows, `1440px` for calendar timelines).

### Breakpoints & Responsive Behavior
- **Mobile (< 768px):** 4-column layout. Gutter: `1rem` (`16px`), Margin: `1.25rem` (`20px`). Booking summaries collapse into sticky bottom anchor bars. Filter sidebars collapse into bottom sheets.
- **Tablet (768px – 1024px):** 8-column layout. Gutter: `1.25rem` (`20px`), Margin: `2rem` (`32px`). Split views enable concurrent property navigation and booking cards.
- **Desktop (> 1024px):** 12-column layout. Gutter: `1.5rem` (`24px`), Margin: `2.5rem` (`40px`). Supports side-by-side availability calendars, property detail accordions, and host metrics panels.

### Rhythm
Component spacing follows strict 4px / 8px sub-divisions to keep complex booking forms, guest counters, and pricing breakdowns aligned and effortless to scan.

## Elevation & Depth

Visual hierarchy uses **Tonal Layering** paired with **Ambient Warm Shadows**, avoiding heavy drop shadows or stark black outlines.

- **Level 0 (Flat Canvas):** `#FAF7F2` (Warm Off-White). Base page backdrop.
- **Level 1 (Default Containers & Cards):** `#FFFFFF` with a subtle organic border (`1px solid rgba(31, 42, 36, 0.08)`). No dominant shadow; relies on contrast against the canvas.
- **Level 2 (Hovered Cards & Interactive Modules):** `box-shadow: 0 4px 16px -2px rgba(47, 93, 80, 0.06), 0 2px 6px -1px rgba(31, 42, 36, 0.04)`. A gentle green-tinted shadow suggesting lift.
- **Level 3 (Modals, Popovers, Datepickers):** `box-shadow: 0 12px 32px -4px rgba(31, 42, 36, 0.12), 0 4px 12px -2px rgba(47, 93, 80, 0.08)`. Anchored, crisp elevated containers for calendar selectors and guest editing drawers.
- **Backdrop Overlays:** `rgba(31, 42, 36, 0.4)` with an 8px blur, providing an organic dusk-like dimming effect when modals activate.

## Shapes

The design uses a friendly, curved aesthetic (`Level 2: Rounded`) with corner radii scaled according to element scale:

- **12px (`rounded-md`):** Buttons, single-line text inputs, dropdown selects, and badge tags.
- **16px (`rounded-lg`):** Reservation summary cards, cabin listing previews, datepicker containers, and pricing panels.
- **24px (`rounded-xl`):** Host modal dialogues, image preview carousels, and hero callout sections.
- **Full Pill (`9999px`):** Status indicator tags (`Oczekuje`, `Potwierdzona`), filter chips, and circular quantity counter buttons (`+` / `-`).

## Components

### Buttons
- **Primary:** Forest Green `#2F5D50` background, pure white text, 12px radius, height 48px (mobile: 52px). Hover: `#254B40`. Active: micro-scale `0.98`.
- **Secondary / Accent:** Terracotta `#C8754A` background, white text. Reserved for primary conversion ("Zarezerwuj teraz", "Zatwierdź płatność").
- **Subtle / Outline:** Transparent background, `1.5px solid rgba(47, 93, 80, 0.2)` border, `#2F5D50` text. Hover: `#FAF7F2` background with `#2F5D50` border.
- **Ghost:** Text-only in `#2F5D50` with hover state in `#FAF7F2`. Used in date navigation chevrons and modal dismiss buttons.

### Chips & Badges
- **Status Badges:** Pill-shaped (`9999px`), 6px 12px padding, font size `12px` (`label-md`). 
  - *Oczekuje:* `#FEF3C7` background, `#92400E` text.
  - *Potwierdzona:* `#E6F3EE` background, `#215844` text.
  - *Anulowana:* `#FEE2E2` background, `#991B1B` text.
  - *Wygasła:* `#F3F4F6` background, `#6B7280` text.
  - *Zakończona:* `#E2E8F0` background, `#475569` text.
- **Filter Chips:** 12px radius or pill, `#FFFFFF` surface with `1px solid rgba(31, 42, 36, 0.1)`. Selected state fills with `#2F5D50` and white typography.

### Input Fields & Controls
- **Text Inputs & Dropdowns:** 48px height, 12px corner radius, `#FFFFFF` background, border `1px solid rgba(31, 42, 36, 0.15)`. Text in `#1F2A24`. Focus state shifts border to `2px solid #2F5D50` with an outer ring of `rgba(47, 93, 80, 0.15)`.
- **Checkboxes & Radios:** 20px controls with 4px radius (checkbox) or circular (radio). Unchecked: `1.5px solid rgba(31, 42, 36, 0.3)`. Checked: `#2F5D50` fill with white checkmark/dot.

### Booking Cards
- **Listing & Summary Cards:** `#FFFFFF` background, 16px corner radius, border `1px solid rgba(31, 42, 36, 0.08)`. Internal padding `20px`.
- **Image Integration:** 12px interior radius on image containers, preserving warm organic visual balance.
- **Price Block:** Stood out with bold text (`title-md` or `headline-sm`) formatted strictly as `[Kwota] zł` followed by `/ doba` or `/ pobyt` in `body-md` muted charcoal.

### Hospitality-Specific Components
- **Date Range Picker (Kalendarz Dostępności):** Dual-month view with 16px radius, showing reserved dates in subtle light gray `#F3F4F6` with diagonal stroke or muted status badge; selected check-in/check-out dates framed in solid `#2F5D50`.
- **Guest Counter (Liczba Gości):** Stepper widget with explicit split for "Dorośli" (Adults) and "Dzieci" (Children), utilizing soft 36px circular pill buttons for increment and decrement operations.