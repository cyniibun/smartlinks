# Cyniical Smart Links

Self-hosted music smart-link pages for `go.cyniicalaesthetic.productions`.

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add pixel IDs.
3. Run `npm run dev` and open `http://localhost:3000/watching-me`.

## Vercel

Import this repository into Vercel, add the three public pixel environment variables, and add `go.cyniicalaesthetic.productions` as the project domain. At the DNS provider for `cyniicalaesthetic.productions`, add only the `go` CNAME supplied by Vercel (commonly `cname.vercel-dns.com`). Do not change root or `www` records.

Song content lives in `data/songs.ts`. The `/api/click` route currently logs events and is ready to be swapped for Supabase later.
