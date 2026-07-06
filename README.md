# tone-link

Self-hosted music smart links and release analytics for `link.tone-link.com`.

## Features

- Branded public smart-link and embed pages
- Password-protected release admin
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
3. Set `ADMIN_PASSWORD` and the Supabase values below.
4. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
5. Run `npm run dev` and open `http://localhost:3000/admin`.

## Environment variables

```txt
ADMIN_PASSWORD=
SUPABASE_URL=
SUPABASE_SECRET_KEY=

# Reserved for future Supabase Auth; not needed by the current admin
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_JWKS_URL=

# Optional import enhancement
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Optional advertising and analytics pixels
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Keep `SUPABASE_SECRET_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`. The current app does not expose a Supabase client in the browser, so it does not need the publishable key or JWKS URL yet.

Without Supabase credentials, the bundled `Watching Me` release remains available as a read-only fallback. Admin writes and internal analytics activate after Supabase is connected.

## Supabase setup

Run [supabase/schema.sql](supabase/schema.sql). The secret-key client is only created in server code. Row-level security is enabled on the three tables, so browser clients cannot bypass the admin APIs.

For an existing database, run [supabase/migrations/20260705_add_campaign_integrations.sql](supabase/migrations/20260705_add_campaign_integrations.sql) once in the Supabase SQL Editor. It safely adds both per-release pixels and guarded custom page-header entries.

## Vercel and DNS

Import this repository into Vercel and add the environment variables for Production, Preview, and Development as appropriate. Add `link.tone-link.com` as the Vercel project domain.

At the DNS provider for `tone-link.com`, point only the `link` subdomain at the CNAME supplied by Vercel—commonly `cname.vercel-dns.com`. Do not change the root or `www` records.

## Import behavior

- Pasted release URLs try Songlink/Odesli first and always retain a manual-link fallback.
- Text searches use Spotify when credentials exist and Apple Music independently.
- Provider failures do not block manual release creation.
