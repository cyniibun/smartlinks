# ToneLink Product Context

## Product

ToneLink is a premium music marketing platform for artists, labels, creators, and campaign teams. It creates owned smart-link release pages, tracks campaign attribution, manages pixels, and gives teams a workspace-based dashboard for releases, analytics, artists, themes, domains, and billing.

ToneLink is not a generic bio-link tool. The core product promise is controlled, beautiful, campaign-ready music landing pages with trustworthy analytics.

## Primary users

- Independent artists managing releases and ad campaigns themselves.
- Artist managers and small labels managing multiple artists in one workspace.
- Music marketers who need tracking pixels, UTM attribution, platform click analytics, and fast campaign link creation.
- Internal ToneLink operators and developers managing production workspaces.

## Core jobs

1. Create and publish a release smart link quickly from search/import.
2. Review cross-platform destination matches before publishing.
3. Configure destination order, pixels, safe header entries, SEO, branding, and theme overrides.
4. Understand campaign performance through views, platform clicks, CTR, referrers, UTMs, countries, and event logs.
5. Manage artists, reusable defaults, workspace settings, custom themes, custom domains, and subscription entitlements.

## Product principles

**The Release-First Rule.** Artists think in releases, campaigns, and destinations. UI labels and flows should favor Releases over abstract internal terms like link pages.

**The Trustworthy Analytics Rule.** Analytics must be deterministic, explainable, and conservative. Never fabricate data, never show placeholder campaign macros, and never let new valid events appear to reduce counts.

**The Review-Before-Publish Rule.** Cross-platform matching should preserve the selected source platform and resolve outward, but questionable matches must remain reviewable instead of silently publishing.

**The Workspace Isolation Rule.** Accounts authenticate users; workspaces own data, roles, billing, features, artists, releases, themes, domains, and analytics.

**The Cascade Rule.** Defaults should inherit predictably: smart-link override, then artist default, then workspace default, then system fallback.

**The Public Page Conversion Rule.** Public smart links exist to get listeners to destinations. Layout, tracking, and theme polish should support fast destination discovery, especially on mobile.

## Brand personality

ToneLink should feel precise, dark, premium, music-native, and operationally serious. It should feel closer to Linear, Stripe Dashboard, Vercel, and Arc Browser than to legacy analytics software.

Voice should be direct and product-like:

- Clear over clever.
- Executive summary before raw logs.
- Human labels over raw enums in high-level surfaces.
- Technical detail available where it helps debugging.

## Anti-references

ToneLink should not feel like:

- A generic Linktree clone.
- A generic admin template.
- Busy enterprise analytics software.
- Bright neon crypto dashboards.
- Heavy glassmorphism or excessive blur.
- Fake SaaS mockup data.
- Cyniical-branded product software. Cyniical is a workspace/customer identity, not the product brand.

## Visual direction

- Dark-only product UI for now.
- Matte black and charcoal surfaces.
- Soft pink accent used sparingly for active states, CTAs, charts, and selection.
- Large rounded cards with subtle borders and elevation.
- Spacious 12-column dashboard layouts.
- Mobile dashboard uses a real hamburger drawer, stacked cards, and no horizontal app navigation strip.
- Public smart links use premium dark music-link styling and compact mobile heroes by default.

## Accessibility and quality bar

- No horizontal overflow on mobile.
- Controls must be keyboard usable.
- Focus and hover states must be visible.
- Chart tooltips must stay inside cards.
- Empty states must appear only after data has loaded.
- Public tracking must avoid raw IP storage, email/phone collection, and invasive fingerprinting.

