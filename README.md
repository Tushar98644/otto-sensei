# Otto Sensei

Resume checker and editor with an otter guide. Upload a resume, see what a recruiter's software reads, fix weak lines, tailor to a job, download a PDF for free.

Design and contracts: [ARCHITECTURE.md](ARCHITECTURE.md). Going live: [SETUP.md](SETUP.md). New laptop, deploys and house rules: [HANDOFF.md](HANDOFF.md). Every env var: [.env.example](.env.example).

## Run locally

```bash
bun install
bun dev            # http://localhost:3000
```

No keys and no database server needed. Sign in with any email: the code shows on screen ("Dev mode: your code is 123456"). Data lives in `.pglite/` (a local Postgres in a folder; delete it to start over).

| Missing | What happens instead |
|---|---|
| Supabase keys | Development: on-screen sign-in codes and the local `.pglite/` database. Production: "Sign-in isn't set up yet" |
| `OPENROUTER_API_KEY` | Rule-based import; fixes and tailoring return demo output |
| `CREEM_*` | "Upgrade" switches the account to the plan instantly, and a new account to the 3-day Pro trial (mock billing, development only) |

To test real email codes and Google sign-in on your laptop, put the Supabase values in `.env.local` (SETUP.md, steps 2 to 8) and run `DEV_AUTH=supabase bun dev`. Production never uses dev codes or `.pglite/`.

## Checks

```bash
bun run typecheck
bun run lint
bun run test       # in-memory Postgres (PGlite) per test file, fake Supabase Auth
bun run build
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the first three as parallel jobs, plus knip and a per-page JS budget from `next analyze`; [migrations.yml](.github/workflows/migrations.yml) runs squawk on new migrations ([HANDOFF.md](HANDOFF.md) section 3). Vercel's own build on every push stands in for `bun run build`.

## Deploy

Vercel (app, functions in `iad1`) + Supabase (Postgres and Auth, US East) + Resend (sign-in email, as Supabase's SMTP) + Google (sign-in) + OpenRouter (AI) + Creem (billing, merchant of record). Every click and command is in [SETUP.md](SETUP.md). In short:

```bash
vercel link
vercel env add ...                 # Supabase URL/keys/database URLs, see SETUP.md step 4
vercel env pull .env.local
bun scripts/migrate.ts             # creates the tables (supabase/migrations)
vercel --prod
```

Database changes: add a new `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` (never edit one that has run), update `src/db/schema.ts` to match, run `bun scripts/migrate.ts` before deploying. `bun dev` and the tests apply new files on their own.

## Limits that matter in production

- Uploads are capped at 4 MB, under Vercel's 4.5 MB request body limit.
- Free: the basics with no AI. Pro trial, Pro and Max: real limits in [src/config/plans.ts](src/config/plans.ts).
- Deleting an account cancels Pro (or the trial) first. If Creem can't cancel, the account is kept and the user sees an error. Then our rows go, then the Supabase Auth user (which signs it out everywhere).
- Sign-out ends the session at Supabase too, and every API request checks the session with Supabase, so a copied cookie stops working.
- Rate limits and usage counters live in the database. If the database becomes the bottleneck, move rate limits to Redis first.
