# ToneLink

ToneLink is a self-hosted music smart-link platform for artists, labels, creators, and campaign teams. It creates owned landing pages such as:

```txt
https://link.tone-link.com/watching-me
```

Each page gives fans a clean destination picker while giving the workspace owner control over tracking pixels, platform links, campaign attribution, page styling, and analytics.

ToneLink is designed to replace dependency on third-party smart-link tools while keeping the workflow fast enough for real release campaigns.

## What ToneLink does

- Creates public smart-link pages for songs, albums, podcasts, presaves, merch, tickets, and other campaign destinations.
- Imports release metadata and platform links from search, Apple Music, Spotify, and Songlink/Odesli-style URLs.
- Lets teams review imported matches before publishing.
- Tracks page views, outbound platform clicks, shares, copy actions, UTM data, referrers, devices, and campaign performance.
- Supports TikTok Pixel, Meta Pixel, Google Analytics 4, and safe custom header entries.
- Provides workspace, artist, and smart-link-level defaults.
- Supports reusable themes and artist templates.
- Uses workspace-level subscriptions and feature entitlements so future billing can be added cleanly.

## Core concepts

ToneLink is organized around workspaces.

```txt
User
└── Workspace
    ├── Members
    ├── Artists
    ├── Releases
    ├── Smart Links
    ├── Themes
    ├── Pixels
    ├── Analytics
    └── Subscription / Entitlements
```

### User

Authentication is handled by Supabase Auth. A user is only an identity: email, login provider, and session.

Users do not directly own billing plans. Plans belong to workspaces.

### Workspace

A workspace is the main container for an organization, artist team, label, or creator. All artists, releases, smart links, analytics, themes, and settings are scoped to a workspace.

New users receive their own workspace named from their email prefix. Existing internal workspaces remain unchanged.

### Membership

Users join workspaces through `workspace_members`.

Supported roles:

- `developer`
- `owner`
- `admin`
- `member`
- `viewer`

The `developer` role is internal and bypasses feature limits and billing gates for product development.

### Subscription and entitlements

ToneLink uses workspace-level feature checks instead of scattered plan checks.

The app should ask:

```ts
hasFeature(workspaceId, "theme_studio")
```

not:

```ts
plan === "pro"
```

Plans map to feature bundles. Features include:

- `theme_studio`
- `custom_themes`
- `custom_domains`
- `advanced_analytics`
- `analytics_export`
- `unlimited_links`
- `unlimited_artists`
- `remove_branding`
- `team_members`
- `api_access`
- `podcast_pages`
- `artist_bio_pages`
- `presaves`

This keeps Stripe integration separate from product behavior.

## Main user workflows

### Create a smart link from search

1. Open the dashboard.
2. Go to Create/Search.
3. Search by artist and release title, or paste a Spotify, Apple Music, YouTube, or Songlink URL.
4. Pick the correct release.
5. Review metadata, artwork, slug, artist assignment, release type, and platform links.
6. Save as draft or publish.
7. After publishing, open the Smart Link Editor for deeper configuration.

The search flow is intentionally lightweight. It is for importing and publishing quickly, not for managing every advanced page setting.

### Edit a smart link

Open a smart link from the dashboard list. The editor is organized into tabs:

- Overview
- Platforms
- Theme
- Pixels
- Header
- SEO
- Analytics
- Preview

Use this editor for long-term page management after the initial import/review step.

### Configure platform destinations

In the Platforms tab, each destination has:

- platform
- friendly label
- URL
- section
- enabled state
- order controls
- remove action

Sections include:

- listen
- watch
- buy
- podcast
- merch
- tickets
- other

Platform URL detection normalizes common links, so a Spotify URL should stay categorized as Spotify under Listen.

### Configure pixels

Pixels cascade by priority:

```txt
Smart Link override
→ Artist default
→ Workspace default
→ none
```

Supported pixel IDs:

- TikTok Pixel ID
- Meta Pixel ID
- GA4 Measurement ID

Smart-link-specific campaign pixels should be entered in the Smart Link Editor. Artist and workspace defaults are managed from Settings.

### Add safe page-header entries

The Header tab supports controlled campaign scripts and verification tags:

- meta tags
- external script URLs
- inline JavaScript

Guardrails are intentionally strict. Header entries should support campaign platform requirements without allowing page-breaking or destructive code.

### Use Theme Studio

Theme Studio lives in Settings → Themes.

System themes are visible to all users. Custom themes require the relevant workspace entitlement.

Typical workflow:

1. Preview a system theme.
2. Duplicate it.
3. Edit the custom copy.
4. Set it as the workspace default, artist default, or smart-link theme.

Theme inheritance is:

```txt
Smart Link override
→ Smart Link selected theme
→ Artist default theme
→ Workspace default theme
→ Minimal Dark
```

## Analytics

ToneLink records internal analytics in Supabase. Public pages and button actions send events to internal endpoints, and optional external pixels fire in the browser.

Tracked event types include:

- `page_view`
- `view_content`
- `platform_click`
- `copy_url`
- `share`
- `embed_click`
- `campaign_click`

Analytics support:

- total visits
- total outbound clicks
- CTR
- platform breakdown
- top smart links
- referrers and UTM sources
- campaign performance
- device/browser summary
- recent event log
- CSV export when entitled

UTM values are normalized before storage. Placeholder campaign values such as `__CAMPAIGN_NAME__` are treated as empty instead of being displayed to users.

## Import and resolver methodology

ToneLink does not blindly trust one provider.

The resolver workflow is:

1. Normalize the selected source into canonical metadata.
2. Preserve the original source platform link.
3. Resolve outward to other providers.
4. Merge and dedupe by platform and section.
5. Send everything to review before publish.

Current provider behavior:

- Apple Music search can provide metadata, Apple Music links, iTunes links, artwork, release date, and sometimes ISRC.
- Spotify uses the Web API with Client Credentials for public catalog search.
- Spotify matching prefers ISRC when available, then falls back to title and artist similarity.
- Songlink/Odesli-style URLs can accelerate multi-platform cloning.
- SoundCloud is treated conservatively unless a confident URL is available; manual review is preferred over fake matches.

The resolver is intentionally review-first. Cross-platform matches should not auto-publish unless confidence is high.

## Code structure

```txt
app/
  [slug]/                         Public smart-link pages
  auth/callback/                  Supabase OAuth callback
  dashboard/                      Authenticated workspace app
  api/                            Route handlers

components/
  admin/                          Dashboard, editor, analytics, auth UI
  PlatformButton.tsx              Public outbound click behavior
  SongSmartLinkPage.tsx           Public smart-link rendering

lib/
  adminAuth.ts                    Workspace session and role helpers
  authBootstrap.ts                Profile/workspace bootstrap
  entitlements.ts                 Workspace feature resolver
  linkPageEditor.ts               Smart Link Editor read/write adapter
  resolver.ts                     Cross-platform release resolver
  spotify.ts                      Spotify API client
  themes.ts                       System themes and theme normalization
  utm.ts                          UTM cleanup/display helpers

supabase/
  schema.sql
  migrations/                     Database migrations and RLS changes
```

## External services

### Supabase

Supabase provides:

- Auth
- Postgres
- Row Level Security
- analytics/event storage
- workspace-scoped data

Most privileged database writes go through server-side route handlers using the server key. Public pages only expose data that is safe to render publicly.

Production OAuth depends on the app resolving the correct public site URL. In Vercel, set:

```txt
NEXT_PUBLIC_SITE_URL=https://link.tone-link.com
```

Supabase Auth URL configuration should be:

```txt
Site URL:
https://link.tone-link.com

Redirect URLs:
https://link.tone-link.com/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3001/auth/callback
https://link.tone-link.com/reset-password
http://localhost:3000/reset-password
http://localhost:3001/reset-password
```

Google Cloud OAuth Client settings should be:

```txt
Authorized JavaScript origins:
https://link.tone-link.com
http://localhost:3000
http://localhost:3001

Authorized redirect URIs:
https://izhffsgceznlfibtuaxo.supabase.co/auth/v1/callback
```

### Vercel

Vercel hosts the Next.js app. The production smart-link domain is:

```txt
link.tone-link.com
```

The root marketing domain can remain separate from the smart-link app.

### Spotify

Spotify integration uses the Client Credentials flow for public catalog lookup. User Spotify accounts are not required.

The Spotify client secret must remain server-side.

### TikTok, Meta, and GA4

Public pages load pixels only when a pixel ID is configured through workspace, artist, or smart-link settings.

Platform clicks fire tracking events before redirecting to the destination platform.

## Database migrations

Migrations are idempotent where practical and should be applied in order. Recent important migrations include:

- campaign pixels and safe header entries
- multi-tenant auth and workspace membership
- releases, link pages, page links, and analytics dimensions
- workspace overview defaults and timezone support
- artist templates
- Theme Studio
- UTM placeholder cleanup
- workspace subscriptions and entitlements

When a migration updates constraints or RLS policies, Supabase may warn that the query is potentially destructive. Review the SQL, but policy/constraint replacement is expected for entitlement and role changes.

## Security model

- Supabase Auth owns identity.
- Workspace membership controls dashboard access.
- Roles control management permissions.
- Entitlements control product features.
- RLS protects workspace data.
- Server route handlers perform privileged writes.
- Public smart-link pages do not import dashboard-only code.
- Secrets stay server-side.

## Product direction

ToneLink is moving toward a workspace-based SaaS model:

- Free, Basic, Pro, Enterprise, and Developer plans
- Stripe-backed workspace subscriptions
- custom domains
- richer analytics reports
- theme marketplace or template library
- campaign URL builder
- QR codes
- presave pages
- podcast and creator pages
- artist bio pages
- team invites and role management

The current architecture is intended to support those features without rewriting the core workspace, entitlement, editor, or analytics model.
