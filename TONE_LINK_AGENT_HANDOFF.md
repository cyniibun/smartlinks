# ToneLink Agent Handoff and Product Audit

Last audited: 2026-07-17  
Repository state audited: `main` at `2c2d60c`  
Application repository: `smartlinks`  
Primary production app: `https://link.tone-link.com`  
Marketing site target: `https://tone-link.com`

## How to use this document

This is the starting context for an engineer or AI agent working on ToneLink. Read it before proposing changes. It distinguishes shipped behavior, partial foundations, planned work, and known risks.

Code and applied Supabase migrations are the source of truth. The ignored files under `docs/` contain useful historical audits, but several predate the latest analytics, entitlement, pixel, and performance changes. Do not assume an older document is current when it conflicts with this handoff or the code.

Before changing a sensitive subsystem, inspect the referenced implementation and its latest migration. In particular:

- Do not change analytics event or metric definitions casually.
- Do not gate paid features only in React; enforce them in server routes.
- Do not write entitlement-sensitive tables directly from the browser.
- Do not replace the mature Smart Link Editor while changing release creation.
- Do not merge the authenticated dashboard display theme with public release themes.
- Do not claim a marketing provider acknowledged an event when ToneLink only recorded a browser dispatch attempt.

## 1. Product summary

ToneLink is a multi-tenant music-marketing SaaS for artists, labels, and their teams. Its core product is a tracked public release landing page, not merely a generic bio link.

The primary workflow is:

1. A user searches for or imports a release.
2. ToneLink normalizes canonical metadata.
3. ToneLink resolves platform destinations outward from any supported source.
4. The user reviews links, assigns an artist, and saves a draft or publishes.
5. The user edits the resulting Smart Link in the long-term editor.
6. Anonymous listeners visit the public URL and generate privacy-conscious analytics and configured pixel events.
7. Workspace users analyze performance by release, artist, platform, campaign, geography, audience, and event.

The intended product hierarchy is:

```text
User account
  -> Workspace
    -> Membership and subscription
    -> Artists and reusable defaults
    -> Releases
    -> Smart Link pages and destinations
    -> Pixel connections
    -> Themes
    -> Domains
    -> Analytics events
```

Product principles:

- Release-first, artist-specific workflow.
- Fast search/import first; advanced search remains optional.
- Review uncertain cross-platform matches instead of auto-publishing them.
- Preserve the selected source platform when resolving additional links.
- Public pages prioritize conversion, speed, mobile ergonomics, and accurate tracking.
- Analytics must be deterministic and explainable. Never fabricate metrics.
- Workspace isolation and server-side entitlements are non-negotiable.
- ToneLink and Cyniical Productions are separate brands. Cyniical is Joe's workspace, not a platform default.

## 2. Technical architecture

### Runtime and services

- Next.js App Router, currently installed as Next `16.2.10`.
- React and TypeScript.
- Supabase Auth, Postgres, Row Level Security, and service-role server operations.
- `@supabase/ssr` for browser and server auth clients.
- Stripe Checkout, Billing Portal, and signed webhooks for workspace subscriptions.
- Vercel deployment and Vercel Analytics for product/app traffic.
- Spotify Web API Client Credentials for public catalog search.
- Apple/iTunes Search API and Odesli/Songlink resolution.
- `react-simple-maps` for the analytics world map.

### Auth boundary

Canonical clients:

- Browser: `lib/supabase/client.ts` using `createBrowserClient`.
- Server: `lib/supabase/server.ts` using `createServerClient` and Next cookies.
- Admin database access: service-role client in `lib/supabase.ts`; never use it in client code.

Google OAuth is PKCE-based and returns to `/auth/callback`, which exchanges the code server-side, bootstraps the workspace, and redirects to the workspace Overview. Public auth routes include login, signup, email confirmation, forgot/reset password, and callback.

New users receive:

- A profile.
- A workspace named from the email prefix, not Cyniical Productions.
- An `owner` membership.
- A free subscription row.
- A redirect to `/dashboard/[workspaceId]/overview`.

### URL topology

- `/` redirects an authenticated user to the dashboard and an unauthenticated user to login.
- `/[slug]` serves a published public Smart Link.
- `/preview/[linkPageId]` serves an authenticated draft preview.
- `/embed/[slug]` serves an embeddable public view.
- `/dashboard/[workspaceId]/...` contains the authenticated product.
- `tone-link.com` is intended to be a separately maintained marketing site.
- `link.tone-link.com` is the application and current public-link host.

The old “Pick a release” root is not part of the intended architecture.

### Major database models

- `profiles`
- `workspaces`
- `workspace_members`
- `workspace_subscriptions`
- `artists`
- `releases`
- `link_pages`
- `page_links`
- `campaigns`
- `click_events`
- `themes`
- `workspace_domains`
- `workspace_pixel_configurations`
- `pixel_event_deliveries`
- `pixel_connection_test_sessions`
- Legacy `songs` and `song_links`, retained for compatibility during the v1-to-v3 evolution.

Latest structural and integrity migrations are in `supabase/migrations/`. Production behavior depends on those migrations being applied in order, especially:

- `20260716_analytics_performance_aggregation.sql`
- `20260716_entitlement_security_hardening.sql`
- `20260716_visitor_active_time_integrity.sql`

## 3. Current product capabilities

Status labels:

- **Implemented**: usable end-to-end in the current code.
- **Partial**: meaningful implementation exists, but an important portion is incomplete.
- **Foundation**: data/UI/API groundwork exists, but the customer outcome is not live.
- **Planned**: not implemented.

### Accounts, workspaces, and teams

- **Implemented**: email/password signup and login.
- **Implemented**: email confirmation enforcement.
- **Implemented**: Google OAuth through Supabase SSR/PKCE.
- **Implemented**: forgot/reset password flows.
- **Implemented**: profile and workspace bootstrap without duplicate workspaces.
- **Implemented**: persistent dashboard shell, workspace context, mobile drawer, and workspace-scoped routes.
- **Implemented**: account, workspace, timezone, market, theme, pixel, domain, and billing settings.
- **Partial**: team membership display and role model exist; invitation and complete team administration are placeholders.

Supported membership roles in code are `owner`, `admin`, `editor`, legacy `member`, `viewer`, and internal-only `developer`. `member` remains a legacy manager-capable role and should eventually be migrated or removed to reduce ambiguity.

### Releases and Smart Links

- **Implemented**: quick search/import as the primary creation flow.
- **Implemented**: dedicated Review and Publish screen.
- **Implemented**: optional advanced search/release wizard.
- **Implemented**: artist assignment or inline artist creation.
- **Implemented**: release types, artwork, label, dates, metadata, draft/publish state, and destination review.
- **Implemented**: duplicate slug allocation such as `song`, `song-2`, `song-3` during creation.
- **Implemented**: public link rendering grouped by Listen, Watch, Buy, Podcast, Merch, Tickets, and Other.
- **Implemented**: draft previews, public URLs, embeds, copy/share actions, deletion, and paginated release lists.
- **Implemented**: mature Smart Link Editor with Overview, Platforms, Theme, Branding, Pixels, Header, SEO, Analytics, and Preview areas.
- **Implemented**: platform enable/disable, labels, sections, URL editing, ordering, and removal.
- **Implemented**: server-side platform URL validation and generic/custom destination gating.
- **Not implemented**: random opaque slugs for Free/Basic and custom slug editing restricted to Pro/Enterprise/Developer. All current plans can still edit human-readable slugs.

Existing Smart Link URLs must remain intact during any future slug change. Slugs are globally unique because public routes are currently host-level `/[slug]`, not workspace-namespaced.

### Cross-platform resolver

- **Implemented**: canonical metadata normalization.
- **Implemented**: selected/source platform preservation.
- **Implemented**: Apple Music/iTunes resolution by available metadata and title/artist fallback.
- **Implemented**: Spotify by ISRC, then title/artist fallback, using cached server-side Client Credentials.
- **Implemented**: Odesli expansion for supported URLs.
- **Implemented**: merge/dedupe by platform and section.
- **Implemented**: low-confidence/manual-review behavior.
- **Implemented**: no fabricated SoundCloud URL when an API-quality match is unavailable.

Resolver invariants:

- Spotify is not the center of the resolver.
- Any supported starting platform should resolve outward through canonical metadata.
- The selected source link must never disappear.
- Apple Music belongs in `listen`; iTunes belongs in `buy`; Spotify belongs in `listen`.
- Low-confidence matches remain reviewable and should not be silently published.

Apple Music has historically regressed when resolver result arrays were replaced instead of merged. Regression tests should explicitly cover Spotify -> Apple Music/iTunes and Apple Music -> Spotify.

### Artists and templates

- **Implemented**: Artists v2 operational list with selected-artist detail panel/drawer.
- **Implemented**: artist profile, status, image, slug, bio, brand color, social/profile URLs, and performance summary.
- **Implemented**: reusable defaults for label, theme, platform order, enabled platforms, pixels, footer, slug pattern, and safe head entries.
- **Implemented**: defaults are stored on the artist and shared between Artists and Settings rather than duplicated UI state.
- **Foundation**: bio-link fields and entitlement gating exist.
- **Not implemented**: complete public artist bio-page builder, routing, media hosting, and public bio-page analytics.

### Themes and branding

- **Implemented**: system themes and custom workspace themes.
- **Implemented**: read-only system themes, create/edit/delete custom themes, preview, and live public-page preview parity.
- **Implemented**: separate release default and authenticated workspace display theme.
- **Implemented**: `ToneLink` is the dashboard display fallback; `Minimal Dark` is the public release fallback.
- **Implemented**: inheritance order for public links: link override -> artist default -> workspace release default -> system fallback.
- **Implemented**: public colors, gradients, button contrast, layout density, type scale, card/artwork size, footer, and responsive hero layout.
- **Implemented**: dashboard theme colors are validated before being exposed as CSS variables.
- **Implemented**: branding header/footer controls gated by `remove_branding`.

Never make “workspace display” alter public links, and never make “release default” recolor the authenticated dashboard.

### Analytics

- **Implemented**: Overview operational KPIs and recent/top release summaries.
- **Implemented**: Analytics tabs for Overview, Audience, Releases, Campaigns, Platforms, Referrers, Events, and Pixels.
- **Implemented**: exact count queries for canonical totals.
- **Implemented**: database RPC aggregation for time series and common breakdowns when the performance migration is installed.
- **Implemented**: platform donut, geography map/list, referrers, UTMs, devices/browsers, recent clicks, and paginated events.
- **Implemented**: filters by date, artist, release/link, platform, event type, UTM source, and UTM campaign.
- **Implemented**: workspace timezone-aware date ranges.
- **Implemented**: visitor identity metrics including unique visitors, sessions, returning visitors, repeat clickers, median time to click, and average active view time.
- **Implemented**: progressive loading and client caching scoped to workspace plus full filter query.
- **Implemented**: Vercel Analytics once at the root for ToneLink product/app traffic; it does not replace internal campaign analytics.

See the dedicated analytics section below before modifying this area.

### Pixels

- **Implemented**: centralized `workspace_pixel_configurations` model.
- **Implemented**: workspace/artist/release pixel inheritance compatibility.
- **Implemented**: Pixels dashboard, providers, status/health concepts, filters, diagnostics panel, and paginated delivery log.
- **Implemented**: separate `pixel_event_deliveries` records, so Pixels reporting does not equate an internal event with a provider dispatch.
- **Implemented**: browser dispatch for TikTok, Meta, and GA4 public-page events.
- **Implemented**: test-event flags and test-session foundation.
- **Partial**: Google Ads, Snapchat, and Custom appear in the connection architecture and UI, but their full provider dispatch/verification pipelines are not all implemented.
- **Partial**: browser pixels generally prove a dispatch attempt, not provider receipt. Most current successful deliveries are `sent`, not authoritative provider `acknowledged` confirmations.
- **Not implemented**: complete server-side Conversions API delivery for Meta/TikTok and provider-side event-quality diagnostics.

Pixel inheritance order is link/release override -> artist default -> workspace default -> none.

### Billing and entitlements

- **Implemented**: workspace-owned subscriptions.
- **Implemented**: Stripe Checkout for Basic/Pro monthly and annual prices.
- **Implemented**: Stripe Billing Portal.
- **Implemented**: signed webhook handling as the only paid-plan activation source.
- **Implemented**: plan, interval, status, Stripe IDs, billing periods, and cancel-at-period-end persistence.
- **Implemented**: centralized server-side feature and limit resolver.
- **Implemented**: trusted developer bypass by actual membership role or configured owner email, not a client-selected plan value.
- **Partial**: Enterprise entitlements exist as a stable Pro superset plus API access, but Enterprise checkout/sales provisioning is not automated.

Current pricing represented in product behavior:

- Basic: $5/month or $50/year.
- Pro: $15/month or $150/year.
- Enterprise: contract/manual provisioning.

### Custom domains

- **Foundation**: `workspace_domains` model, RLS, entitlement/limit checks, Settings UI, add/remove, generated TXT token, DNS TXT verification, and CNAME instructions.
- **Not implemented**: host-header routing, Vercel domain provisioning, production SSL lifecycle, domain-to-workspace/link resolution, or custom-domain analytics.

This is the largest remaining prerelease product feature. A domain marked `Verified` in ToneLink is not yet a live serving domain.

### Marketing site and media storage

- The marketing site is intended to live at `tone-link.com` separately from the app at `link.tone-link.com`.
- A separate `tone-link-website` project/subdirectory has been discussed; avoid coupling its visual/video work to the application bundle.
- General image upload and artist bio-page media hosting are planned after initial revenue. Current release/artist media primarily use URLs and existing assets rather than a full customer upload system.

## 4. Entitlement model

The canonical resolver is `lib/entitlements.ts`. UI code should ask for a feature or limit, never branch directly on `plan === "pro"`.

Subscriptions belong to workspaces, not users. A paid plan is effective only when the stored subscription status is `active` or `trialing` and its period has not ended. A client-edited workspace plan field is not trusted.

### Current limits

| Plan | Artists | Smart Links | Custom Domains | Team Members | Analytics Retention |
|---|---:|---:|---:|---:|---:|
| Free | 1 | 3 | 0 | 1 | 7 days |
| Basic | 5 | 50 | 0 | 3 | 90 days |
| Pro | Unlimited | Unlimited | 1 | Unlimited | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| Developer | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

### Current feature intent

- Free: core release creation and system release/display themes; no pixels, custom themes, custom domains, header injection, branding removal, custom destinations, or bio pages.
- Basic: Free core plus standard pixels and analytics export; higher artist/link limits.
- Pro: stable premium product features, including custom themes/domains, advanced analytics, export, unlimited links/artists, branding removal, team access, advanced pixels, header injection, custom destinations, and future page types.
- Enterprise: all stable Pro features plus API access and unlimited domains. Enterprise should receive future stable features deliberately, not internal experiments automatically.
- Developer: all features and no limits; internal-only. It includes `internal_experiments` and bypasses billing.

Important server gates already exist on release creation/update, pixel configuration, header entries, generic destinations, themes, domains, artists, analytics ranges/export, and resource limits. The latest security migration also revokes direct client mutation of sensitive tables so those writes flow through authorized server code.

Any new paid feature must be added in four places:

1. `FeatureKey` or `FeatureLimitKey`.
2. The plan feature/limit mapping.
3. Server-side write/read enforcement.
4. UI explanation/upgrade state.

Do not use a client-submitted plan, price ID, role, or workspace field to authorize access.

## 5. Analytics and data-integrity specification

### Separate internal events from pixel delivery

ToneLink has two event planes:

1. `click_events`: what a visitor did on a ToneLink page.
2. `pixel_event_deliveries`: what ToneLink attempted to dispatch to Meta, TikTok, GA4, or another provider.

A `platform_click` is not proof that a configured provider pixel fired. A delivery with `status = sent` is not always proof that the provider processed it. Only an explicit provider response should be described as acknowledged.

### Current canonical internal event classification

Defined in `lib/analyticsAggregation.ts`:

```text
Views:       page_view, visit (legacy compatibility)
Clicks:      platform_click
Secondary:   view_content, copy_url, share, embed_click, campaign_click
Active time: page_engagement checkpoints handled by an idempotent RPC
```

Metric formulas:

- Views = exact count of canonical view event rows in the selected scope.
- Clicks = exact count of `platform_click` rows in the selected scope.
- CTR = platform clicks / views.
- Unique visitors = distinct `visitor_id` for canonical page views in range.
- Sessions = distinct `session_id` for canonical page views in range.
- Returning visitors = visitors seen before the range and again inside the range.
- Repeat clickers = visitors with at least two platform clicks in range.
- Median time to click = median first platform click minus first page view within eligible sessions.
- Average active view time = average maximum recorded active duration for a page-view identity.

`view_content` is a lifecycle/pixel-oriented event. It does not increment Views, Clicks, or CTR. Do not label it as a true “engaged view” unless its firing behavior changes; it currently fires immediately after page load.

### Event ingestion

- Public lifecycle and utility events post to `/api/events`, which currently re-exports the handler in `/api/click`.
- Outbound platform clicks post directly to `/api/click`.
- There is no live `/api/visit` route.
- Public page engagement checkpoints also reach the shared handler and are persisted through `record_page_engagement`.
- Public events derive workspace/release/artist linkage from the published slug server-side when possible.

### Visitor identity and privacy

The public visitor module uses:

- Persistent random first-party `visitor_id` in local storage.
- Per-browser-session `session_id` in session storage.
- Random `event_id`.
- Latest-touch UTMs.
- Supported click IDs: TikTok, Meta, Google, Microsoft, X/Twitter, LinkedIn.
- Normalized referrer.
- Available marketing cookies without fabricating them.
- Server-derived Vercel/Cloudflare geography.

ToneLink does not store raw IP addresses, email, phone, latitude/longitude, or invasive browser fingerprints. The event endpoint currently stores a salted `ip_hash`; never expose it to clients or turn it into a primary visitor identifier.

Historical events collected before visitor/session/active-time fields cannot support reliable audience metrics and must not be backfilled with fake values.

### Analytics integrity warnings

**High — legacy `visit` can still count as a view.** New public pages emit `page_view`, not `visit`, and `/api/visit` no longer exists. However, the canonical view array still includes both for historical compatibility. If historical rows contain both for one landing, that landing is double-counted. Audit production data before migrating historical `visit` rows or switching to `page_view` only.

**High — internal event idempotency is incomplete.** `event_id` is stored, but ordinary `click_events` inserts are not protected by a unique idempotency boundary. Network retries or duplicate client execution can insert duplicate page views/clicks. Pixel deliveries and page-engagement checkpoints have stronger deduplication than ordinary events.

**Medium — outbound click beacon fallback.** `PlatformButton` falls back to `fetch` only when `sendBeacon` is absent, not when it exists but returns `false`. A failed queue may lose the internal click before redirect.

**Medium — database aggregation migration is operationally required.** The analytics API retains a newest-1,000-row fallback when aggregation RPCs are missing. Exact KPI totals remain count queries, but secondary breakdowns can be sampled/inconsistent until the migration is installed. Production should report `aggregateSource: "database"`.

**Medium — audience filter scope.** Current visitor behavior aggregation respects workspace, date, link/release/artist, and UTM filters. Platform/event-type filtering is not part of that RPC and should not be implied in the UI.

**Low — reserved event.** `campaign_click` is classified but has no confirmed public firing path.

### Pixel delivery definitions

- Events Fired = delivery records in range with status `sent` or `acknowledged`.
- Dedupe boundary = event ID plus connection/pixel plus provider event name.
- `queued`, `failed`, `skipped`, and duplicate retries do not count as fired.
- Verified is not synonymous with “an ID exists.” It requires valid configuration and successful recent delivery; provider confirmation can strengthen it later.
- Health is deterministic and should explain Good, Warning, Error, or Inactive in diagnostics.

## 6. Security posture and audit findings

### Confirmed protections

- Workspace-scoped authorization on authenticated server routes.
- RLS on primary tenant tables.
- Sensitive writes routed through service-role server endpoints after the latest hardening migration.
- Subscription source of truth is a server-managed workspace subscription row.
- Developer access cannot be obtained by changing a subscription plan to `developer`.
- Stripe secret and Spotify client secret remain server-side.
- Stripe paid entitlements activate from signed webhooks, not success URL parameters.
- Header injection and generic/custom destinations are server-gated.
- Platform destinations require safe HTTPS URLs and expected domains.
- Custom/Snapchat pixels and advanced provider configuration are server-gated.
- Dashboard theme values are validated before becoming CSS variables.
- Auth uses Supabase SSR cookies and PKCE.

### Security/architecture concerns to preserve in the backlog

**High**

- Ordinary analytics event inserts lack a complete idempotency constraint.
- `visit` plus `page_view` historical overlap must be measured before redefining Views.
- Custom-domain serving needs a secure verified-host lookup and workspace boundary before it can route traffic.
- Apply and verify every security/aggregation migration in each environment; code fallbacks can hide a missing database rollout.

**Medium**

- Legacy `member` remains manager-capable alongside the newer `editor` role.
- Artist analytics currently has an N+1 pattern for per-artist/per-release counts.
- Pixel dashboard aggregation can load up to thousands of delivery rows and group them in server JavaScript.
- Update/delete operations in the Smart Link repository use manual rollback rather than a single database transaction/RPC.
- Some older internal names still say Cyniical (`package.json`, internal headers/storage keys). This is mostly non-user-facing brand debt but should be cleaned carefully.

**Low**

- Several dependencies use broad `latest`/caret ranges, which weakens reproducible builds.
- Source-pattern tests cover important invariants, but there is not yet comprehensive browser plus live-database integration coverage.
- Some Settings/team/provider controls are intentionally placeholders and must not be represented as completed features.

### Current npm audit snapshot

Read-only `npm audit` on 2026-07-17 reported:

- 0 critical
- 5 high
- 3 moderate
- 0 low

High findings are in the `react-simple-maps` dependency chain (`d3-color`, `d3-interpolate`, `d3-transition`, `d3-zoom`, and `react-simple-maps`). The published automatic recommendation is a major downgrade to `react-simple-maps@1.0.0`, which is not a safe blind fix and may break the map.

Moderate findings include Next's bundled PostCSS advisory and the resulting `next`/`@vercel/analytics` paths. The installed versions at audit time were Next `16.2.10`, `react-simple-maps` `3.0.0`, Vercel Analytics `2.0.1`, and Next-bundled PostCSS `8.4.31`.

Do not run `npm audit fix --force`. Evaluate a map replacement/upgrade path and a supported Next patch when available, then test the production build and analytics map behavior.

## 7. Performance posture

Already implemented:

- Persistent dashboard shell.
- Route-level skeletons.
- Analytics summary/primary/secondary loading split.
- Summary and primary queries begin in parallel.
- Secondary analytics waits until summary settles and is independently recoverable.
- Event log and Pixels analytics load only when their tab opens.
- Map code is dynamically imported.
- Client caching is keyed by workspace plus filters, with abort/generation guards.
- Exact count queries for KPIs.
- Database aggregation RPCs and composite indexes.
- Release table pagination and event-log pagination.
- Overview grouped link metrics RPC replaces per-link counts when installed.

Most noticeable remaining performance opportunities:

1. Replace Artists page N+1 analytics queries with grouped workspace/artist RPCs.
2. Aggregate Pixels dashboard summaries in SQL rather than loading up to 5,000 delivery rows.
3. Cache stable artist/link filter metadata briefly.
4. Remove the newest-1,000 analytics fallback after every environment is verified on the aggregation migration.
5. Split very large client components such as `AnalyticsDashboard` into tab-level chunks if bundle analysis confirms a meaningful win.
6. Add query timing/observability before speculative optimizations.

Do not trade deterministic analytics for perceived speed. Exact totals and workspace isolation take priority over aggressive caching.

## 8. Recommended next steps

### P0 — prerelease correctness and operations

1. Verify all Supabase migrations are applied in production and sandbox environments.
2. Confirm analytics responses use database aggregation rather than the newest-1,000 fallback.
3. Add internal event idempotency for page views and platform clicks without suppressing legitimate repeat actions.
4. Audit historical `visit`/`page_view` overlap and make `page_view` the only new View source after a deliberate migration.
5. Fix the `sendBeacon(false)` fallback on outbound clicks.
6. Add browser/database smoke tests for signup, Google login, release create/publish, public view/click, billing webhook, and workspace isolation.
7. Address or formally accept the current npm vulnerabilities before launch; do not force-downgrade dependencies blindly.

### P1 — last major prerelease product work

1. Complete custom domains in a production-safe pass:
   - Provision/attach the hostname in Vercel or the selected hosting layer.
   - Resolve only verified/active hostnames.
   - Map host header to workspace/domain safely.
   - Decide whether a custom host serves `/[slug]`, a default link, or both.
   - Track SSL/provisioning lifecycle.
   - Add domain ownership re-verification and safe removal.
   - Keep `link.tone-link.com/[slug]` as a durable fallback URL.
2. Implement random slugs and Pro custom slugs:
   - Preserve every existing slug.
   - Generate collision-resistant opaque slugs for new Free/Basic links.
   - Add a `custom_slugs` feature entitlement rather than checking plan names.
   - Allow Pro/Enterprise/Developer custom slugs.
   - Enforce global uniqueness server-side and display availability before save.
   - Reserve system/auth/dashboard/API slugs and normalize Unicode/case safely.
   - Decide redirect history before allowing a published slug to change.
3. Add resolver regression coverage, especially Spotify -> Apple/iTunes and selected Apple preservation.
4. Harden Pixels terminology and provider support so `sent`, `acknowledged`, `verified`, and provider diagnostics are never conflated.

### P2 — growth and post-revenue work

1. Launch the separate `tone-link.com` marketing site and preserve the app boundary at `link.tone-link.com`.
2. Add customer media storage/upload with quotas, validation, transformations, deletion, and billing-cost controls.
3. Build public artist bio pages on top of the existing artist/default/visitor pipeline.
4. Add full team invitations and role management.
5. Add server-side Meta/TikTok conversion APIs, provider acknowledgements, and stronger pixel diagnostics.
6. Add Enterprise provisioning/admin tooling and future stable Enterprise-only features.
7. Expand page types for podcasts, merch, events, and richer artist experiences only after the release workflow remains stable.

## 9. Agent guardrails

### Required behavior when changing analytics

- State the metric definition before changing the query.
- Use `lib/analyticsAggregation.ts` as the canonical classification source.
- Keep totals as exact database counts/aggregates; raw recent rows are for activity tables only.
- Ensure Overview, Analytics, artist, release, and link-level views share definitions.
- Keep CTR equal to platform clicks divided by canonical views.
- Never count `view_content` or `page_engagement` as an extra View.
- Never expose visitor IDs, IP hashes, tokens, or raw provider credentials in UI/API responses.
- Update the analytics specification and tests in the same pass.

### Required behavior when changing entitlements

- Resolve entitlements on the server from workspace subscription and trusted membership.
- Enforce limits before database creation.
- Reject or strip unauthorized sensitive fields on update and publish paths.
- Preserve Developer as internal-only.
- Treat Enterprise as Pro plus explicitly promoted stable features, not all experiments.
- Keep upgrade UI explanatory, but never treat it as the security boundary.

### Required behavior when changing release creation/editor

- Keep Quick Search primary and Advanced Search optional.
- Keep Review and Publish lightweight.
- Redirect created releases into the mature Smart Link Editor.
- Preserve source-platform links and manual user edits.
- Keep URL validation on every server write path.
- Preserve existing public URLs unless the task explicitly includes redirects/migration.

### Required behavior when changing themes

- Public release theme and authenticated workspace display theme are separate.
- Reuse the public rendering logic for editor previews.
- Validate dashboard theme colors before CSS/SVG use.
- System themes are read-only.
- Existing releases are not silently rewritten when a default changes.

### Required behavior when changing public pages

- Keep public bundles independent from dashboard-only code.
- Preserve mobile compact hero behavior and conversion-first destination visibility.
- Preserve anonymous analytics and pixel dispatch even for visitors without accounts.
- Do not add raw IP storage, browser geolocation prompts, or invasive fingerprinting.
- Degrade gracefully when analytics or pixels fail; destination navigation must still work.

## 10. Verification commands

Run in the `smartlinks` repository:

```bash
npm run test:security
node --test tests/*.test.mjs
npm run build
git diff --check
npm audit
```

Notes:

- `npm audit` is read-only here; do not append `fix --force`.
- `npm run lint` currently delegates to `next lint`, which may not be valid on the installed Next major. Treat a working build and focused tests as the minimum until lint tooling is modernized.
- Source-pattern tests are useful but are not substitutes for live Supabase/Stripe/browser integration tests.

Critical manual smoke flows:

1. Fresh email signup, confirmation, workspace bootstrap, and Overview redirect.
2. Fresh incognito Google OAuth first attempt.
3. Quick Search -> Review -> Save Draft -> Preview -> Publish -> public page.
4. Spotify source resolves Apple Music/iTunes; Apple source preserves Apple and resolves Spotify.
5. Public page view inserts one canonical page view; platform click inserts one platform click.
6. Overview and Analytics show consistent counts under identical range/filter scope.
7. Free/Basic/Pro/Enterprise/Developer feature and limit enforcement through direct API attempts.
8. Stripe test Checkout -> webhook -> active subscription -> portal/cancel flow.
9. Theme inheritance and link override persistence.
10. Domain add/TXT verification, while clearly confirming live routing remains unavailable until the production-domain pass.

## 11. Key implementation map

| Concern | Primary files |
|---|---|
| Supabase browser/server auth | `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| OAuth callback/bootstrap | `app/auth/callback/route.ts`, `lib/authBootstrap.ts` |
| Workspace authorization | `lib/adminAuth.ts` |
| Entitlements and limits | `lib/entitlements.ts`, `lib/entitlementLimits.ts` |
| Stripe | `lib/stripeBilling.ts`, `app/api/billing/*`, `app/api/stripe/webhook/route.ts` |
| Release creation | `components/admin/FastCreate.tsx`, `components/admin/ReleaseReview.tsx`, `lib/releaseRepository.ts` |
| Resolver | `lib/resolver.ts`, `lib/spotify.ts`, `lib/importers/apple.ts`, `lib/importers/index.ts` |
| Smart Link Editor | `components/admin/SmartLinkEditor.tsx`, `lib/linkPageEditor.ts` |
| Platform URL security | `lib/validation/platformUrls.ts` |
| Public page | `app/[slug]/page.tsx`, `components/SongSmartLinkPage.tsx`, `components/PlatformButton.tsx` |
| Themes | `lib/themes.ts`, `components/admin/ThemePreview.tsx`, theme Settings routes/components |
| Internal event ingestion | `app/api/events/route.ts`, `app/api/click/route.ts` |
| Visitor identity | `lib/analytics/visitor.ts`, `lib/analytics/geo.ts` |
| Canonical analytics | `lib/analyticsAggregation.ts`, `lib/visitorBehavior.ts`, `app/api/admin/analytics/route.ts` |
| Analytics UI | `components/admin/AnalyticsDashboard.tsx`, analytics components |
| Pixel dispatch/deliveries | `lib/tracking.ts`, `app/api/pixel-deliveries/route.ts`, `lib/pixelDeliveries.ts` |
| Pixel configurations | `lib/pixelConfigurations.ts`, `app/api/admin/pixels/route.ts` |
| Pixel UI | `components/admin/PixelsDashboard.tsx` |
| Custom domains | `lib/customDomains.ts`, `app/api/admin/domains/route.ts`, Settings Domains section |
| Supabase schema/RLS/RPCs | `supabase/migrations/` |
| Security/integrity tests | `tests/*.test.mjs` |

## 12. Environment-variable names

Never place values in documentation or commit `.env.local`.

Common server/public configuration names include:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY or server service-role equivalent
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_BASIC_MONTHLY_PRICE_ID
STRIPE_BASIC_ANNUAL_PRICE_ID
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID
DEV_OWNER_EMAIL
EVENT_HASH_SALT
```

Keep Stripe test/live keys, price IDs, webhook secrets, and customers in the same mode. Checkout success does not unlock a plan; the signed webhook does.

## 13. Audit limitations

This audit inspected the repository, migrations, routes, tests, and installed dependency tree. It did not inspect the live Supabase schema, verify which migrations are applied in production, inspect Vercel environment values, run real OAuth/Stripe/provider callbacks, or query production analytics. Any operational claim should be confirmed in the relevant deployed environment.

When handing work to another agent, include this file and the exact requested outcome. Ask that agent to report which status in this document changes—Implemented, Partial, Foundation, Planned—and to update this handoff if the change materially alters architecture, entitlements, analytics definitions, or the roadmap.
