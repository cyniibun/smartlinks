---
name: "ToneLink"
description: "A premium dark music marketing operating system with matte black surfaces, soft pink accent, rounded elevated cards, and conversion-focused release pages."
colors:
  ink: "#08080a"
  dashboard: "#0b0b0e"
  panel: "#111113"
  panelRaised: "#151519"
  paper: "#f4f0e9"
  muted: "#aaa8ad"
  line: "rgba(255,255,255,.12)"
  pink: "#df5d93"
  hotPink: "#ff4f93"
  cyan: "#77f7ff"
  green: "#58d68d"
typography:
  body: "Arial, Helvetica, sans-serif"
  display: "Arial, Helvetica, sans-serif"
rounded:
  card: "24px"
  hero: "30px"
  control: "12px"
  pill: "999px"
spacing:
  page: "clamp(22px, 5vw, 76px)"
  card: "28px"
  compactCard: "20px"
  gridGap: "16px"
components:
  primaryButton: "admin-primary"
  secondaryButton: "admin-secondary"
  panel: "admin-panel"
  publicHero: "hero-card"
  publicPlatformButton: "platform-button"
---

# Overview

**Creative North Star: "A matte-black control room for music campaigns."**

ToneLink should feel like a premium operating system for release marketing: quiet, dark, precise, and campaign-aware. The interface must make releases, analytics, pixels, artists, themes, and billing feel like one coherent product instead of separate admin pages.

The dashboard uses a 12-column card grid, soft pink accent, large rounded cards, and restrained elevation. Public smart-link pages keep the same premium identity but optimize for conversion: artwork, release identity, utility actions, and destination buttons must be clear without forcing mobile users to scroll through oversized hero content.

**Key Characteristics:**

- Matte black and charcoal surfaces.
- Soft pink accent, not purple.
- Large rounded cards with subtle borders.
- Spacious grid-based dashboards.
- Human-readable labels in executive surfaces.
- Compact, conversion-first public mobile layouts.

# Colors

**The Pink Is Sparse Rule.** Pink is a signal, not wallpaper. Use it for primary CTAs, active navigation, chart accents, selected states, and focused controls. Do not flood panels with pink gradients.

**The Matte Surface Rule.** Default surfaces are nearly black (`#08080a` to `#111113`). Cards may lift slightly through borders and shadows, but should never become glossy or over-blurred.

**The Semantic Events Rule.** Valuable outbound actions use green. Informational tracking events use neutral gray in Overview and event timelines unless a deeper analytics context requires more detail.

Primary roles:

- Ink: app and public-page base.
- Dashboard: dashboard shell background.
- Panel: cards and data containers.
- Paper: primary foreground text.
- Muted: secondary copy and metadata.
- Pink: brand accent and selection.
- Green: positive platform-click and success states.
- Cyan: secondary accent for theme previews and gradients only.

# Typography

**The Large Heading Rule.** Product pages should use large, confident headings with tight letter spacing. Avoid tiny admin-template headers.

**The Practical Sans Rule.** The current system uses Arial/Helvetica. Keep it clean, compact, and high-contrast. Do not introduce decorative music fonts into the app UI.

**The Human Label Rule.** Executive surfaces should display `Platform Click`, `Page View`, and `Engaged View`, not raw enum names. Technical tables can remain more explicit when useful.

# Elevation

**The Quiet Lift Rule.** Cards lift through a thin border, dark translucent fill, and soft shadow. Avoid heavy drop shadows, bright glow, and hard outlines.

**The One Glow Rule.** A single subtle pink radial glow may guide focus on a dashboard or public page. Multiple competing glows are prohibited.

**The Containment Rule.** Tooltips, charts, country maps, legends, and bars must remain inside their cards. Nothing should spill outside the panel boundary.

# Components

**Dashboard Shell.** Desktop uses a fixed sidebar with workspace identity, primary navigation, plan card, and account action. Mobile hides the sidebar completely and uses a sticky top bar plus hamburger drawer.

**Admin Panels.** Use `.admin-panel` as the canonical card surface: rounded, dark, subtly bordered, and spacious. Cards should align to the 12-column grid and collapse cleanly on mobile.

**Primary Buttons.** Primary CTAs use soft pink or warm paper depending on context. They must have consistent height, radius, and typography within the same button stack.

**Secondary Buttons.** Secondary actions use dark surfaces with thin borders. They should not compete visually with the main CTA.

**Public Hero.** The public hero uses `.hero-card`, `.artwork-wrap`, and `.hero-info`. Artwork must be inset with padding. Text and action buttons live in a distinct content column with visible breathing room.

**Platform Buttons.** Destination buttons use icons, platform names, section grouping, subtle hover lift, and readable text. Section determines grouping; platform detection should never push Spotify/Apple/SoundCloud into Other when known.

**Analytics Charts.** KPI cards, time-series charts, donut charts, and country cards use pink accents, muted gridlines, contained tooltips, and honest empty states. Do not show fake data.

**Theme Editor.** Theme editing uses a compact two-column editor: controls on the left, sticky live preview on the right. The shared `PublicLinkPreviewFrame` should approximate the real public page.

# Do's and Don'ts

## Do

- Do preserve the dark matte product identity.
- Do keep layouts spacious and grid-aligned.
- Do use pink sparingly for interaction and emphasis.
- Do make release names, platform names, and campaign labels readable.
- Do show loading states before empty states.
- Do keep mobile layouts stacked, labeled, and overflow-safe.
- Do route advanced configuration into Settings unless it earns first-class navigation.
- Do keep Cyniical as workspace/customer content only.

## Don't

- Don't make ToneLink look like a generic Linktree clone.
- Don't use generic admin-template cards or crowded enterprise dashboards.
- Don't use excessive glassmorphism, blur, neon, or bright purple.
- Don't fabricate analytics, map highlights, campaign names, progress bars, or usage limits.
- Don't expose raw IPs, visitor IDs, or private attribution identifiers in UI.
- Don't let public smart-link pages show fixed Cyniical branding.
- Don't let chart tooltips, map bars, legends, or tables overflow their cards.

