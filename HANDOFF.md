# Handoff: working on Otto Sensei from a new laptop

How to set up, check, ship and deploy Otto Sensei, plus the house rules and open to-dos. Written for the owner and for any Claude session on a new machine. Last updated 2026-11-20. To see what is live: `vercel ls --prod`.

Other docs: [README.md](README.md) (run locally; links here), [SETUP.md](SETUP.md) (every service, step by step), [ARCHITECTURE.md](ARCHITECTURE.md) (how the code fits), [DESIGN.md](DESIGN.md) (UI rules), [.env.example](.env.example) (every variable).

---

## 1. Where everything lives

| Thing | Where |
|---|---|
| Live site | https://www.ottosensei.com (`ottosensei.com` redirects to `www`) |
| Code | `github.com/Tushar98644/otto-sensei`, branch `main` |
| Hosting | Vercel project `otto-sensei`, team `tushar98644s-projects`, region `iad1` |
| Database + sign-in | Supabase project ref `wuypdybfswifundtixmt` |
| AI | OpenRouter: GLM 5.3 Flash (writing), Llama Guard 4 (safety), Whisper large v3 turbo (voice fallback) |
| Payments | Dodo Payments, our merchant of record (**test mode** until Dodo verifies the account); checkout is Dodo's hosted page, which returns through `/api/billing/return` |
| Sign-in emails | Resend, through Supabase's SMTP settings |
| Daily jobs feed | GitHub Action `jobs-ingest.yml` at 05:40 UTC calls `/api/cron/jobs` |
| Other crons | `vercel.json`: `/api/cron/cleanup` (04:17 UTC), `/api/cron/job-emails` (08:30 UTC, the weekly jobs email), `/api/cron/view-alerts` (13:15 UTC, resume and portfolio view alerts), `/api/cron/trial-reminders` (13:30 UTC), `/api/cron/follow-ups` (14:00 UTC), `/api/cron/tip-emails` (14:45 UTC), and `/api/cron/interview-briefs` once a day at 02:37 UTC as a safety net for the hourly run below |
| Interview briefs | The Cloudflare Worker `workers/inbound-email` (the one that receives tracked email) runs `/api/cron/interview-briefs` hourly at :07 UTC from its Cron Trigger, with `Authorization: Bearer <CRON_SECRET>`: the interview-morning brief in the bell at about 7:00 local and "How did it go?" there the morning after (in-app only, no email). The Worker holds `CRON_SECRET` as a secret (the same value as on Vercel) and `APP_URL` in `wrangler.toml`; setup in its README |

**Not in git, so copy these by hand from the old laptop:**
- `web/.env.local`: holds `OPENROUTER_API_KEY` and `RESEND_API_KEY`. Copy it over USB or a password manager, never through chat, email or git.
- `web/.env.dodo.local` and `web/.env.dodo.live.local` (once they exist): the Dodo setup key, product ids and secrets that `scripts/dodo-setup.ts` and `scripts/check-dodo-catalog.ts` read (SETUP.md §10). Same rules: never through chat, email or git.
- The parent folder `income-engine/`: strategy docs, `projects/resume-app/*.md` research, and the long progress log `projects/resume-app/.snapshots/PAUSED-2026-11-08.md`. None of it is a git repo.
- Claude's saved memory in `~/.claude/projects/…/memory/`. The house rules below repeat what matters.

---

## 2. New laptop setup

```bash
# Tools
brew install oven-sh/bun/bun gh              # Bun 1.2.20 is what CI uses
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
nvm install 24                                # Node 24, same as CI
npm i -g vercel                               # Vercel CLI

# Code
gh auth login
git clone https://github.com/Tushar98644/otto-sensei.git web && cd web
bun install

# Link to the Vercel project (pick team tushar98644s-projects, project otto-sensei)
vercel login
vercel link --repo

# Secrets: copy .env.local from the old laptop (see section 1), then:
bun dev                                       # http://localhost:3000
```

- Local sign-in needs no email: the form shows "Dev mode: your code is 123456".
- Local data lives in `.pglite/` (a real Postgres in a folder). Delete it to start over.
- Want real jobs locally? Stop `bun dev`, run `bun scripts/jobs-ingest.ts`, start `bun dev` again.
- Shell tip: if `bun` or `vercel` aren't found in a script, add `/opt/homebrew/bin` and `~/.nvm/versions/node/v24.*/bin` to `PATH`.

---

## 3. The gate: run before every commit

CI (`.github/workflows/ci.yml`) runs the same checks as parallel jobs on every push that changes more than Markdown (a newer push cancels the run it replaces). Run them locally first:

```bash
printf '{ "extends": "./tsconfig.json", "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"], "exclude": ["node_modules", ".next"] }' > tsconfig.gate.json
bunx tsc -p tsconfig.gate.json --noEmit; rm tsconfig.gate.json   # types (skips stale .next types)
bun run lint                                                     # lint; warnings fail too
bunx vitest run --maxWorkers=2                                   # ~290 files, ~3,700 tests
```

All three must pass with zero errors and zero warnings. `--maxWorkers=2` keeps an 8 GB machine responsive; raise it on a bigger laptop.

CI adds these. None of them blocks a deploy (Vercel builds and ships every push to `main`), so read a red run and fix it:
- **Route types:** `next typegen` runs before `tsc`, so CI also checks page and route exports the way `next build` does.
- **knip** (`knip.json`): unused files and dependencies.
- **squawk** (`.squawk.toml`, `scripts/migrations-check.sh`) on each new file in `supabase/migrations/`, from its own workflow (`.github/workflows/migrations.yml`) so a quick second push can't cancel it: it flags locking or breaking statements such as dropped columns and constraints added without `not valid`. Put `-- squawk-ignore <rule>` above one that is deliberate.
- **Bundle budget** (`scripts/bundle-check.sh`, from `next analyze`): fails when a page's first-load JS grows more than 10 KB past `scripts/bundle-baseline.json`, all its JS more than 50 KB, or a page has no baseline yet. When the growth is intended, commit that run's `bundle-routes` artifact as `scripts/bundle-baseline.json`, or run `bash scripts/bundle-check.sh --update` (a full production compile, so nothing else heavy at the same time) and commit the file.

---

## 4. Committing

- **Never** add a `Co-Authored-By:` line or any "Generated with Claude" line to a commit or PR.
- When someone else (or another agent) has unfinished edits in the tree, commit only your files: `git commit -m "…" -- path/one path/two`.
- Push straight to `main`: `git push`. CI runs on the push.

---

## 5. Deploying to production

**A push to `main` deploys production automatically** (Vercel's GitHub connection, seen working 2026-11-12: those deploys carry the alias `otto-sensei-git-main-…`). So the normal flow is gate → commit → push, then confirm the deploy:

```bash
git push
vercel ls --prod | head -2                # newest production deployment
vercel inspect <that url> --wait          # must say "status ● Ready"
```

Then run the smoke check below. Claude does this after every change; the owner doesn't have to.

**Deploying without a push** (for example if the GitHub connection is off): deploy from a clean copy of the last commit. The CLI uploads the folder as it is, so any unfinished edits would ship. A temporary worktree avoids that:

```bash
WT=/tmp/otto-deploy
git worktree add --detach "$WT" HEAD
cp -R .vercel "$WT/"
(cd "$WT" && vercel --prod --yes)        # prints "Production  https://otto-sensei-xxxx…"
vercel inspect <that url> --wait          # must say "status ● Ready"
git worktree remove --force "$WT" && git worktree prune
```

If the tree is clean, `vercel --prod --yes` from `web/` is the same thing.

**What happens on Vercel:** the build command is `bun run build && bun scripts/migrate.ts --deploy`, so new files in `supabase/migrations/` are applied to the production database after `next build` succeeds and before the new code goes live. A failed build never touches the database, and a failed migration fails the deploy, so the old code keeps serving. The old code still runs for the short time between the migration and the switch-over, so make breaking changes in two deploys: first ship code that no longer needs the old shape (it stops reading the column or table, or reads both the old and the new value format), then drop it, tighten its constraint or rewrite its rows in a later migration. The build itself still sees the old schema, so a prerendered page that reads a new table or column shows its fallback until its hourly refresh (the job counts on home and pricing, the portfolio sitemap). Never edit a migration that has already run; add a new, later-dated file.

**Writing a migration:** each file runs in one transaction under the runner's lock, with a 5-second lock timeout (a busy table is tried 6 times over about 2 minutes, then the build fails and nothing from that file is applied) and a 2-minute timeout per statement (start the file with `set local statement_timeout = '10min';` if it needs longer). On `jobs` or `match_events`: build an index with `create index concurrently if not exists ...` in a file whose first line is `-- no-transaction` and that holds only that statement (it needs `POSTGRES_URL_NON_POOLING` or `DIRECT_DATABASE_URL`, not the 6543 pooler); add a CHECK or foreign key as `not valid` in one file and `validate constraint` in a later one; and rewrite rows with one UPDATE that sets every changed column, since each UPDATE pass copies the whole table.

**Database space (Supabase Free caps it at 500 MB):** Postgres keeps the space left by updated or deleted rows inside the table file. After any migration or clean-up that rewrites or deletes thousands of job rows, run `vacuum full public.jobs;` once in the Supabase SQL editor (the jobs tab pauses about a minute). On 2026-11-13 the jobs file was 331 MB holding 57 MB of real data; that vacuum is what fixed it. Check with: `select pg_size_pretty(sum(pg_column_size(j.*))) as real_data, pg_size_pretty(pg_table_size('public.jobs')) as file_size from public.jobs j;`

Bumping `NORMALIZE_VERSION` (`src/lib/job-feed/normalize.ts`) counts as such a rewrite: every job row is rewritten on its board's next read. The day after, compare the two numbers above (each daily jobs run also prints `jobsFileMb` and `jobsDeadRows` in its stats) and vacuum if the file is far bigger than the data. When only a column SQL can compute changed (like the keys in `20261111000600_short_job_keys.sql`), backfill it with one UPDATE in a migration instead of bumping.

**Quirk:** the CLI often ends with `Error: fetch failed` after printing the Production URL. The deploy is usually fine. Always trust `vercel inspect <url> --wait`, not that line.

**Smoke check after every deploy:**

```bash
for p in / /pricing /terms /privacy /api/health; do
  printf "%s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://www.ottosensei.com$p)"
done                                                     # all 200
curl -s -o /dev/null -w '%{http_code}\n' https://www.ottosensei.com/dashboard   # 307 (sign-in)
```

**Other cases:**
- Preview build (to test a risky change): `vercel --yes` (no `--prod`). Previews sit behind Vercel login.
- Changed an environment variable in the Vercel dashboard? Redeploy: a build only sees values that existed when it ran.
- Rollback: `vercel rollback` (or "Promote" an older deployment in the dashboard).
- Tabs left open on a build from before 2026-11-14 save the studio in the old format. A resume deleted or released in such a tab can come back once a newer tab merges that save. It stops when the old tabs reload; nothing is lost.
- Changing production settings and secrets in Vercel, Supabase, Dodo Payments or OpenRouter dashboards is the owner's job.

---

## 6. Services and the settings that matter

- **Supabase auth:** email sign-in sends a **6-digit code**, valid 600 s (Auth → Email templates and OTP settings; `scripts/email-templates.ts` can read and set them with a `SUPABASE_ACCESS_TOKEN`). JWT signing keys are ECC (P-256). The app uses the new publishable and secret keys.
- **Database safety:** every table has Row Level Security on with no policies. Only our server touches the database, so the public key can read and write nothing.
- **OpenRouter routing** (`src/lib/ai/client.ts`): `require_parameters: true`, `data_collection: "deny"`, `sort: "price"`, `max_price` $0.10 in / $0.30 out per million tokens. About 10 servers qualify; Wafer is normally picked. Every answer logs one `ai.usage` line in Vercel (counts only: task, model, provider, attempt, `durationMs`, input, output and reasoning tokens), so check each host's speed there before changing the routing or reasoning settings.
- **Safety checks** (`src/lib/ai/moderation.ts`): a word pre-check, then Llama Guard only when sexual words show up. It blocks S3, S4 and S12, and fails open. First portfolio publish and share links are always checked in full; a resume edit syncing into a live portfolio goes to Llama Guard only when its new lines have such words.
- **Voice typing:** built-in browser speech in Chrome, Edge and Safari (free). Brave, Firefox and Opera, or any failure, record a clip for `/api/transcribe` (Whisper through OpenRouter). Limits: 2-minute clips, 5 a day on Free, 30 on Pro and the trial, 60 on Max; clips turned away before transcribing, or lost to a provider outage, don't use one up.
- **Dodo Payments:** fees are 4% + 40¢ per payment, plus 0.5% on subscriptions and 1.5% more for cards from outside the US, all taken on the total including tax. On a price with no tax added that nets:

  | | US card | Other cards |
  |---|---|---|
  | Pro monthly ($15) | $13.93 | $13.70 |
  | Pro yearly ($120) | $114.20 | $112.40 |
  | Max monthly ($29) | $27.30 | $26.86 |
  | Max yearly ($232) | $221.16 | $217.68 |
  | The $1 trial | $0.56 | $0.54 |

  Where tax is added, the percentage is taken on the total too, so Pro monthly with 20% VAT ($18) nets about $13.52. Each refund costs another $1 and gives back none of the original fees; refunds and disputes are paid from the Dodo balance, and a dispute costs a fee (Visa RDR settles one for $18 instead of a $30 chargeback). Payouts go out twice a month once the balance is over $100 (lowest setting $50), $5 per payout under $1,000. One account has two modes, test and live, each with its own keys, products and webhook endpoint (SETUP.md §10); production runs in test mode until Dodo verifies the account.

---

## 7. Plans, limits and costs

Everything lives in `src/config/plans.ts`. Change numbers there, never in copy.

| | Free | Pro ($15/mo) | Max ($29/mo) | 3-day Pro trial |
|---|---|---|---|---|
| Line fixes | 3 / month | 750 | 2,000 | 50 |
| Tailored versions | – | 150 | 300 | 10 |
| Letters, answers, interview prep | – | 150 | 300 | 15 |
| AI token budget (abuse guard) | – | 5M | 10M | 0.5M |

- **Worst-case cost per user a month**, with every cap hit: Pro about $3.6 (after Dodo's fees you keep about $10 of $15), Max about $7 (you keep about $20 of $29).
- **Typical cost:** a few cents.
- **Fixed costs** (not per user): Vercel Pro $20 a month (the free plan bans business use), Supabase Pro $25 when you upgrade, and the domain.

---

## 8. House rules (from the owner)

1. **Global copy only:** no lakh, crore, ₹, or Indian cities and events in the product. Use worldwide examples.
2. **Comments:** only when truly needed, and always a single `//` line. No multi-line blocks and no JSDoc.
3. **Tailwind 4:** built-in utilities over arbitrary values (`size-8`, not `h-[32px] w-[32px]`).
4. **Modularize** files over about 300 lines that have distinct parts; leave small single-use pieces inline.
5. **Frictionless UX, fast pages:** no blank states while loading, and lazy-load heavy parts.
6. **Never touch** the owner's running dev server (port 3000) or `.pglite/` while it's open.
7. **Small machine:** at most one heavy job (test run, build, agent) at a time; check free memory first.
8. **Deploy yourself** after a change is gated and pushed (section 5); don't leave it for the owner.
9. **Honest reporting:** say what was checked and what wasn't, for example "not tested with a real microphone".

---

## 9. Open to-dos (owner)

- [ ] **GitHub connect:** create a GitHub OAuth App (callback `https://wuypdybfswifundtixmt.supabase.co/auth/v1/callback`, homepage `https://www.ottosensei.com`), turn on the GitHub provider in Supabase, and turn on "Allow manual linking" (SETUP.md §8c). Until then, GitHub import answers 503.
- [ ] **Leave Creem:** delete the Creem webhook endpoint in Creem, then remove every `CREEM_*` variable from Vercel and close the Creem account. The plans Creem test mode granted are reset by migration `20261116000200_reset_creem_plans.sql` on the Paddle deploy.
- [ ] **Dodo account and compliance, now** (long lead times; SETUP.md §10 steps 1 and 12): open the Dodo Payments account as an Individual or a Registered Entity; email compliance@dodopayments.com the category pre-check and the draft merchant-of-record and refund wording (`MERCHANT` in `src/app/(marketing)/_components/merchant.ts`); upgrade Vercel from Hobby to Pro before taking real money.
- [ ] **Dodo test mode** (SETUP.md §10 steps 2 to 8): the dashboard settings (Adaptive Currency off; portal cancels at the next billing date only, with no immediate cancel, plan updates or pause; Allow Multiple Subscriptions off; a 3-day grace period ending on hold, with retries; Prevent Trial Misuse off; Dodo's Trial Ending email off; Visa RDR on; brand and statement descriptor), the setup and app keys, `bun --env-file=.env.dodo.local scripts/dodo-setup.ts`, `BILLING_SIGNING_SECRET`, the Vercel values, then `bun --env-file=.env.dodo.local scripts/check-dodo-catalog.ts`.
- [ ] **Test-mode spike** (SETUP.md §10 step 9): run each checklist item locally with `dodo wh listen`, save sanitized payloads in a new `src/lib/billing/dodo-fixtures.ts` for the tests, write the answers into SETUP.md, and fix the code wherever Dodo differs, before the cutover.
- [ ] **Cut production over to Dodo test mode** (SETUP.md §10 steps 10 and 11): deactivate the Paddle sandbox notification destination, swap the nine `PADDLE_*` variables in Vercel for the Dodo test values, push the Dodo code (the build runs `20261120000100_reset_paddle_plans.sql`), check that `/api/me` says `dodo`, then run the end-to-end tests. Keep this phase short: anyone with a public test card can get Pro until live.
- [ ] **Dodo verification and payouts** (SETUP.md §10 step 12): product information, KYC, KYB if an entity, the bank account; a Local payout account; keep about $20 in the Dodo balance for early refunds.
- [ ] **Processor-change notice, before live** (SETUP.md §10 step 12.6): check the email copy against Dodo's approved wording, run `bun scripts/send-processor-notice.ts --date <go-live day>` (dry run), then add `--apply` once a day until everyone has it. The terms and privacy policy promise this email.
- [ ] **Go live** (SETUP.md §10 step 12.7, back to back): turn on live mode and walk the dashboard settings again; run the setup and the catalog check with live keys (`.env.dodo.live.local`); cancel every Dodo test subscription and disable the test endpoint that points at production; run `bun scripts/reset-billing.ts --go-live` (counts only), then `bun scripts/reset-billing.ts --go-live --apply` against production (test and live ids look alike, so every account's billing state is cleared); put the live values in Vercel with `DODO_ENVIRONMENT=live` and redeploy. Never roll back to a test-mode build after that, and never run `--go-live --apply` again (it would move paying customers to Free while Dodo keeps charging them).
- [ ] **Live smoke test** (SETUP.md §10 step 12.8): a real $1 trial with your own card (the webhook, the plan, the reminder), then cancel it; watch the `billing.*` logs listed there for 48 hours.
- [ ] **After live:** close the Paddle sandbox account; delete `.env.paddle.local` and `.env.paddle.live.local`; remove any `PADDLE_*` left in Vercel preview and development; once the in-place trial-to-Max upgrade has worked live, delete the older trial-replacement flow (`replaces_subscription_id`); watch Dodo's changelog (its API has no versions).
- [x] **Terms name the seller:** decided 2026-11-15: the terms name "Otto Sensei" (not registered yet) as the business behind the site. If Dodo's verification asks for a personal legal name, or once a company is registered, put that exact name in the "Who we are" section of the terms, matching what the verification forms say.
- [ ] **Decide:** whether Dodo's Payment Failed and Subscription Renewal Failed emails (off by default) should tell buyers to fix their card during the 3-day grace period.
- [ ] **Test voice by hand:** Chrome (words appear live) and Brave signed in (record about 3 s, text appears).
- [ ] **Search Console:** open "Crawled – currently not indexed" and request indexing for `/` and `/pricing` if listed.
- [ ] **Optional:** disable the legacy anon and service_role keys in Supabase, then revoke the legacy HS256 key.
- [ ] **Decide:** Max voice limit (60 a day was Claude's pick; Pro is 30).
- [ ] **Proposal, not decided:** when a portfolio has no headline, the hero falls back to the latest job title.

---

## 10. What shipped recently (newest first)

- Payments move from Paddle to Dodo Payments (in test mode until Dodo verifies the account; SETUP.md §10): Dodo's hosted checkout comes back through `/api/billing/return` and the `/checkout` page is gone; Max during a trial changes the same subscription in place (the full Max price is charged at once, the $1 isn't credited); a failed renewal keeps the plan through a 3-day grace period, then the account is on Free until the card is fixed; the terms, privacy, refund and pricing pages name Dodo Payments as merchant of record and leave refunds to Dodo's buyer terms; `scripts/dodo-setup.ts`, `scripts/check-dodo-catalog.ts` and `scripts/reset-billing.ts` replace the Paddle and Creem scripts; a one-time processor-change email (`scripts/send-processor-notice.ts`) is ready and not sent yet.
- Payments moved from Creem to Paddle Billing: checkout opens on our own `/checkout` page, plans are monthly or yearly only, and the terms, privacy and refund pages name Paddle as merchant of record (refunds follow Paddle's buyer refund policy).
- AI price cap ($0.10 / $0.30 per million tokens) and voice limits per plan.
- Voice typing: built-in speech first, server fallback for Brave, Firefox and Opera; a mic in every box that feeds Otto.
- Safety checks on what Otto writes and on public pages.
- Free plan gets 3 line fixes a month; the trial reads "Try Pro for 3 days" ($0 for 3 days).
- Fix lines: lines that need work have their words highlighted; "Fix with Otto" shows only on lines Otto can fix.
- Landing: sharp portfolio screenshots that slide as you scroll; Formats folded into Resumes; scrollbars hidden.
- Clean-up: comments cut from about 9,600 to about 600 lines, shared helpers, big files split. No behaviour change.
