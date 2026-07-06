# tone-link

Self-hosted music smart links and release analytics for `link.tone-link.com`.

## Features

- Branded public smart-link and embed pages
- Supabase Auth accounts with isolated organization workspaces and roles
- Create, edit, duplicate, publish, unpublish, preview, and delete releases
- Reorderable platform links
- Songlink/Odesli URL resolution
- Spotify search when API credentials are supplied
- Apple Music search without additional credentials
- Supabase release storage and click/visit analytics
- TikTok Pixel, Meta Pixel, and GA4 events
- Optional TikTok, Meta, and GA4 pixel IDs configured per release
- Guarded per-release header meta tags, external scripts, and validated inline JavaScript
- Songlink URL cloning with metadata and multi-platform link import

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase values below.
4. Run `supabase/schema.sql`, the 20260705 migrations, then `supabase/migrations/20260706_multi_tenant_auth.sql` in the Supabase SQL editor.
5. Run `npm run dev` and open `http://localhost:3000/signup` or `/login`.

## Environment variables

```txt
SUPABASE_URL=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EVENT_HASH_SALT=
OWNER_EMAIL=joe@cyniical.productions
BYPASS_BILLING=false

# Optional import enhancement
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Optional advertising and analytics pixels
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Keep `SUPABASE_SECRET_KEY` and `EVENT_HASH_SALT` server-only. Never prefix either with `NEXT_PUBLIC_`. The publishable key is safe for Supabase Auth; RLS is the database security boundary.

Without Supabase credentials, the bundled `Watching Me` release remains available as a read-only fallback. Dashboard authentication, writes, and internal analytics require Supabase.

## Supabase setup

Run [supabase/schema.sql](supabase/schema.sql), the 20260705 migrations, and then [20260706_multi_tenant_auth.sql](supabase/migrations/20260706_multi_tenant_auth.sql). The final migration creates profiles, workspaces, membership roles, artists, campaigns, workspace foreign keys, and RLS policies.

For an existing database, run [supabase/migrations/20260705_add_campaign_integrations.sql](supabase/migrations/20260705_add_campaign_integrations.sql) once in the Supabase SQL Editor. It safely adds both per-release pixels and guarded custom page-header entries.

Create `joe@cyniical.productions` in Supabase Authentication before running the multi-tenant migration. The migration then creates the `Cyniical Productions` workspace, grants that account the `owner` role, and assigns existing releases and events to it. If the user is created afterward, rerun the migration; it is idempotent.

Then run [20260706_tonelink_expansion.sql](supabase/migrations/20260706_tonelink_expansion.sql). It adds first-class artists, releases, link pages, confidence-reviewed page links, analytics dimensions, plan limits, and an idempotent legacy-song backfill. Set `BYPASS_BILLING=true` for the internal owner workspace while pricing is still being tested.

Finally run [20260706_owner_billing_bypass.sql](supabase/migrations/20260706_owner_billing_bypass.sql). It permanently marks `joe@cyniical.productions` as billing-exempt and prevents authenticated users from editing their own billing entitlement. Future billing checks should call `hasBillingBypass(userId)` before applying plan limits or Stripe paywalls.

## Vercel and DNS

Import this repository into Vercel and add the environment variables for Production, Preview, and Development as appropriate. Add `link.tone-link.com` as the Vercel project domain.

At the DNS provider for `tone-link.com`, point only the `link` subdomain at the CNAME supplied by Vercel—commonly `cname.vercel-dns.com`. Do not change the root or `www` records.

## Import behavior

- Pasted release URLs try Songlink/Odesli first and always retain a manual-link fallback.
- Text searches use Spotify when credentials exist and Apple Music independently.
- Provider failures do not block manual release creation.
