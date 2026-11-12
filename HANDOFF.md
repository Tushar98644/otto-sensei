# Handoff: working on Otto Sensei from a new laptop

How to set up, check, ship and deploy Otto Sensei, plus the house rules and open to-dos. Written for the owner and for any Claude session on a new machine. Last updated 2026-11-12. To see what is live: `vercel ls --prod`.

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
| Payments | Creem, our merchant of record (still in **test mode**) |
| Sign-in emails | Resend, through Supabase's SMTP settings |
| Daily jobs feed | GitHub Action `jobs-ingest.yml` at 05:40 UTC calls `/api/cron/jobs` |
| Other crons | `vercel.json`: `/api/cron/cleanup` (04:17 UTC), `/api/cron/follow-ups` (14:00 UTC) |

**Not in git, so copy these by hand from the old laptop:**
- `web/.env.local`: holds `OPENROUTER_API_KEY` and `RESEND_API_KEY`. Copy it over USB or a password manager, never through chat, email or git.
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

CI (`.github/workflows/ci.yml`) runs the same checks plus `next build` on every push. Run them locally first:

```bash
printf '{ "extends": "./tsconfig.json", "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"], "exclude": ["node_modules", ".next"] }' > tsconfig.gate.json
bunx tsc -p tsconfig.gate.json --noEmit; rm tsconfig.gate.json   # types (skips stale .next types)
bunx eslint .                                                    # lint
bunx vitest run --maxWorkers=2                                   # ~290 files, ~3,700 tests
```

All three must pass with zero errors. `--maxWorkers=2` keeps an 8 GB machine responsive; raise it on a bigger laptop.

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

**What happens on Vercel:** the build command is `bun scripts/migrate.ts --deploy && bun run build`, so new files in `supabase/migrations/` are applied to the production database before the new code goes live. Never edit a migration that has already run; add a new, later-dated file.

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
- Changing production settings and secrets in Vercel, Supabase, Creem or OpenRouter dashboards is the owner's job.

---

## 6. Services and the settings that matter

- **Supabase auth:** email sign-in sends a **6-digit code**, valid 600 s (Auth → Email templates and OTP settings; `scripts/email-templates.ts` can read and set them with a `SUPABASE_ACCESS_TOKEN`). JWT signing keys are ECC (P-256). The app uses the new publishable and secret keys.
- **Database safety:** every table has Row Level Security on with no policies. Only our server touches the database, so the public key can read and write nothing.
- **OpenRouter routing** (`src/lib/ai/client.ts`): `require_parameters: true`, `data_collection: "deny"`, `sort: "price"`, `max_price` $0.10 in / $0.30 out per million tokens. About 10 servers qualify; Wafer is normally picked.
- **Safety checks** (`src/lib/ai/moderation.ts`): a word pre-check, then Llama Guard only when sexual words show up. It blocks S3, S4 and S12, and fails open. First portfolio publish and share links are always checked in full.
- **Voice typing:** built-in browser speech in Chrome, Edge and Safari (free). Brave, Firefox and Opera, or any failure, record a clip for `/api/transcribe` (Whisper through OpenRouter). Limits: 2-minute clips, 5 a day on Free, 30 on Pro and the trial, 60 on Max.
- **Creem:** fees are 3.9% + $0.40 per payment, so Pro monthly nets $14.02 and Max monthly $27.47. It's still in test mode.

---

## 7. Plans, limits and costs

Everything lives in `src/config/plans.ts`. Change numbers there, never in copy.

| | Free | Pro ($15/mo) | Max ($29/mo) | 3-day Pro trial |
|---|---|---|---|---|
| Line fixes | 3 / month | 750 | 2,000 | 50 |
| Tailored versions | – | 150 | 300 | 10 |
| Letters, answers, interview prep | – | 150 | 300 | 15 |
| AI token budget (abuse guard) | – | 5M | 10M | 0.5M |

- **Worst-case cost per user a month**, with every cap hit: Pro about $3.6 (you keep about $11.40 of $15), Max about $7 (you keep about $22).
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
- [ ] **Creem:** request the account re-review (the NSFW policy is live), add the payout account, finish KYC, then switch to live mode.
- [ ] **Test a payment:** a Max upgrade during a Pro trial.
- [ ] **Test voice by hand:** Chrome (words appear live) and Brave signed in (record about 3 s, text appears).
- [ ] **Search Console:** open "Crawled – currently not indexed" and request indexing for `/` and `/pricing` if listed.
- [ ] **Optional:** disable the legacy anon and service_role keys in Supabase, then revoke the legacy HS256 key.
- [ ] **Decide:** Max voice limit (60 a day was Claude's pick; Pro is 30).
- [ ] **Proposal, not decided:** when a portfolio has no headline, the hero falls back to the latest job title.

---

## 10. What shipped recently (newest first)

- AI price cap ($0.10 / $0.30 per million tokens) and voice limits per plan.
- Voice typing: built-in speech first, server fallback for Brave, Firefox and Opera; a mic in every box that feeds Otto.
- Safety checks on what Otto writes and on public pages.
- Free plan gets 3 line fixes a month; the trial reads "Try Pro for 3 days" ($0 for 3 days).
- Fix lines: lines that need work have their words highlighted; "Fix with Otto" shows only on lines Otto can fix.
- Landing: sharp portfolio screenshots that slide as you scroll; Formats folded into Resumes; scrollbars hidden.
- Clean-up: comments cut from about 9,600 to about 600 lines, shared helpers, big files split. No behaviour change.
