# Otto Sensei: architecture and build spec

Single source of truth for everyone building this app. Read it fully before writing code.

## Product in one paragraph

A resume app with a friendly otter mascot, **Otto**, who guides the user. The user uploads an old resume (PDF or DOCX) and immediately sees the **recruiter view**: the exact text that hiring software (ATS) pulls out of the file, plus plain pass/warn/fail checks such as columns, icons, contact info in the header, and scanned PDFs. There is deliberately **no made-up 0-100 score**. Then Otto helps **fix weak lines**, asking for facts instead of inventing them ("How many users?"). Next the user can **tailor** the resume to one job from its link (or pasted text when the link can't be read): missing keywords they really have get added, and bullets are reordered. Finally they **download a clean PDF, free, always**, and we re-check our own PDF to show "before: 4 problems, after: 0". **Free basics + Pro trial** (decided 2026-11-08): Free, with no card and no time limit, keeps only uploads read by the rule-based reader, the recruiter view, editing and fixing by hand, **1 resume**, the **Classic and Compact** formats and PDF download, and has **no AI allowance at all** (owner decision 2026-11-08). The **Pro tools** (`ProTool` in `src/config/plans.ts`: up to 50 resumes, the other four formats, Word download, job matching and saved jobs, the tracker and its reminders, share links, the work-rights check) need Pro, Max or the trial. Every AI feature (line fixes, summaries, tailoring, letters, answers, interview prep, Build with Otto, GitHub drafts, AI reads of uploads) and the portfolio need Pro or Max. New accounts can start Pro on a **free 3-day trial, card required** (Creem product with `trial_period_days` 3, no trial price), then $15/month; one trial per person (`trial_history`, by email hash). The trial has its own allowance for the whole trial (`PRO_TRIAL`): 10 tailored versions, 15 letters/answers/prep, 50 line fixes, 5 AI reads, 3 Build with Otto, 3 GitHub drafts (worst case about $0.42 of AI per trial, all cost since a trial brings in nothing). Paid limits (`src/config/plans.ts`), per calendar month: Pro ($15/month, or yearly) 60/100/300/30/20/20; Max ($29/month, or yearly) 200/300/1000/100/60/60. Weekly plans get a quarter of that, rounded up, per billing week: Pro weekly ($6/week) 15/25/75/8/5/5, Max weekly ($12/week) 50/75/250/25/15/15. Uploads are never blocked: on Free, signed out, or past the AI reads, the rule-based reader takes over.

Around that core flow: a **Jobs** tab of real openings from public company job boards and two remote job sites, matched to the resume by rules (no AI; Pro, with a count-only preview on Free), each one click from a tailored copy and the tracker, plus a public `/jobs` list; undo/redo, saved versions and a trash; extra sections (languages, awards, volunteering, publications, custom); a look panel, fit-to-one-page, Word export and a send check; Otto-written summaries; "Build with Otto", LinkedIn and JSON Resume import; Import from GitHub; share links; a **portfolio** (one public page per account at `/p/<slug>`, made from a resume in one of six web templates; Pro and Max, a trial can build and preview it, and only a paid plan's page is public); an applications tracker with follow-up reminders, interview prep and skill gaps; a work profile with a job post eligibility check; invites, feedback and yearly/weekly Pro; first-run tours; Sentry and PostHog. `../FEATURES.md` lists every feature with its plan and status. There is deliberately **no admin page**: the owner reads users, payments and feedback in the Supabase and Creem dashboards.

Audience: job seekers worldwide. Use English, USD, and global examples (not India-specific). Tone: plain everyday words, short sentences, warm and a little playful, never cheesy. Otto speaks in short lines.

## User flow

```
Landing (/) → Studio (/studio)
  1 Upload    drop PDF/DOCX · or "Start from scratch" · or "Try a sample"
  2 Review    recruiter view: checks list + "what hiring software reads" text (only for uploads)
  3 Fix       edit every section; lint badges on each line; "Fix with Otto" (AI, sign-in)
  4 Tailor    paste a job link (job text as backup) → keywords have/missing, questions, reorder, summary → tailored copy (AI, sign-in)
  5 Download  preview + free PDF download + "check my new PDF" (before vs after)
Sign-in: "Continue with Google", or email → 6-digit code (dialog inside the studio, or /login). Account: /account.

Dashboard (/dashboard, signed in): Home · Jobs · Resumes (+ shared links) · Applications (+ /[id]/prep) · Formats · Portfolio · Recently deleted · Account
Public: /s/[slug] (a shared resume, server-rendered, PDF button) · /p/[slug] (a portfolio, cached, revalidated on change) · /jobs (latest openings, no matching) · /jobs/[id] (one job, only for sources that allow republishing)
```

AI actions need Pro, Max or the Pro trial (to control cost); Free and signed-out calls get 402 `upgrade_required`, which every AI button turns into one trial prompt (`UpgradeDialog`), not an error. Import (rule-based reader), the recruiter view, editing, lint and PDF download need no account.

Pro tools follow the same pattern. Server: `src/app/api/pro-tools.ts` (`requireProTool`, `proToolRequired`) answers 402 `upgrade_required` on `POST/PATCH /api/applications*`, `POST /api/share`, `PUT /api/profile`, `PUT /api/jobs/saved/[id]`, and on `PUT /api/resumes/[id]` for a new resume past `resumeLimit(plan)` (`saveBackup`'s `plan_limit`); `POST /api/jobs/matches` answers Free with `locked: true`, the counts and no jobs; the follow-up cron skips Free accounts; `findPublicShare` downloads a Free owner's Pro format in Classic. Reads, deletes, edits of existing resumes and turning share links off stay open on every plan, so an account past a limit keeps everything it made. Client: `src/components/account/pro-tools.ts` (`useProTools()`, `unlockProTool(tool)`, `roomForResume()`) checks first and opens the prompt through `openUpgradePrompt(tool)` (`upgrade-prompt.tsx`; `<UpgradePromptHost />` in the app shell, the studio shell and `/account`). `forPlan(resume, plan)` in `src/lib/pdf/templates.ts` is the download copy (a Pro format on Free comes out in Classic). Cloud sync treats `upgrade_required` as refused, so a resume made before signing in stays in that browser without retries.

## Stack (installed, do not add packages)

Next.js 16.4.5 (App Router, `src/`, Turbopack), React 19.3, TypeScript 6.0.3 (strict, `noUncheckedIndexedAccess`), Tailwind CSS 4.3 (`@theme` tokens in `src/app/globals.css`, no tailwind.config), zod 4.6 (`z.email()`, not `z.string().email()`), zustand 5.1, drizzle-orm 0.45 (pg-core) + postgres 3.4.9 (postgres.js, Supabase Postgres in production) + @electric-sql/pglite 0.5.15 (dev dependency: the local `.pglite/` database in `bun dev` and the in-memory database in tests), @supabase/supabase-js 2.119 + @supabase/ssr 0.12.7 (Supabase Auth: email codes, Google, cookie sessions), unpdf 2.1 (pdf.js text and positions), mammoth 1.13 + jszip 3.10 (DOCX), @react-pdf/renderer 4.9 (client-side PDF export), OpenRouter Chat Completions over `fetch` (strict JSON-schema structured output, `provider.require_parameters` + `data_collection: "deny"`; no SDK), creem 1.13 (the official Creem SDK: API calls with timeouts, and `creem/webhooks` for signatures), lucide-react 1.70 (icons), clsx + tailwind-merge (`cn()` in `src/lib/utils.ts`), @sentry/nextjs 11.11 (error reports), posthog-js 1.447 + posthog-node 5.63 (product events), resend 6.37 (reminder emails), driver.js 1.10 (installed, no longer used: first-run tips are our own non-modal popover in `src/components/onboarding/run-tour.tsx`), vitest 5 (node environment), pdf-lib (tests only: building fixture PDFs). Package manager: **bun** (`bun.lock`). Node 24.

If a library API is unclear, read its type definitions in `node_modules/<pkg>/` (`.d.ts`) instead of guessing.

## Demo modes (the app must fully work locally with zero keys)

| Missing env | Behavior |
|---|---|
| `OPENROUTER_API_KEY` | Import uses `heuristicParse()`. Fix and tailor return deterministic demo results. The UI shows a small "Demo mode" note. |
| Supabase (any env) | Development: dev sign-in (`src/lib/auth/dev.ts`): request-code returns the code as `devCode` and the form shows it; verify sets a signed, revocable `otto_dev_session` cookie; Google is disabled. `DEV_AUTH=supabase` switches development to real Supabase. Production: request-code and Google answer 503 `auth_unavailable` ("Sign-in isn't set up yet"); everything signed-out still works. |
| `DATABASE_URL` / `POSTGRES_URL` | Development: the local `.pglite/` folder (PGlite, migrated on first use), which is also used whenever dev sign-in is on, so test accounts never reach a real database. Production: `getDb()` throws. Tests: an in-memory PGlite per file (`vitest.setup.ts`). |
| Creem keys | `billingMode()` is `"mock"` in development (upgrade flips the plan locally, Pro or Max; a new account's Pro monthly checkout starts a local 3-day trial) and `"disabled"` in production. Pro yearly/weekly, each Max option and the trial show only while their product id is set (`CREEM_PRO_YEARLY_PRODUCT_ID` / `_WEEKLY_`, `CREEM_MAX_MONTHLY_PRODUCT_ID` / `_YEARLY_` / `_WEEKLY_`, `CREEM_PRO_TRIAL_PRODUCT_ID`). `CREEM_TEST_MODE` (default true) picks test-api.creem.io. |
| `GITHUB_TOKEN` | Import from GitHub still works, at GitHub's shared 60 calls an hour for the server. |
| `CRON_SECRET` | `/api/cron/*` answer 401, so no cleanup and no follow-up reminders run. Unsubscribe links can't be signed. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Follow-up reminders stay in the dashboard bell; the Account page's reminder card shows no email switch. |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry isn't loaded or wrapped into the build; nothing is reported. Dev reports only with `NEXT_PUBLIC_SENTRY_DEV=1`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | No analytics code loads and no event is sent (also off in tests and under Do Not Track / GPC). |

## Contracts (already written, keep signatures stable)

| File | What |
|---|---|
| `src/config/brand.ts`, `src/config/plans.ts` | Names, prices, limits, `Feature`, `UsageSnapshot` |
| `src/lib/env.ts` | `env()`, `aiEnabled()`, `appUrl()`, `isProduction()`, `supabaseConfig()`, `supabaseSecretKey()`. Server-only |
| `src/lib/resume/schema.ts` | `ResumeSchema` and types, `newId()`, `emptyResume()`, `new*()` factories |
| `src/lib/resume/ops.ts` | Pure helpers: `listBullets`, `setBulletText`, `cloneResume`, `reorderBullets`, `addSkills`, `resumeToText`, `suggestedFileName` |
| `src/lib/parse/types.ts`, `index.ts` | `Extraction`, `ParseError`, `detectKind()`, `extractDocument()` (stub) |
| `src/lib/checks/types.ts`, `recruiter.ts` | `RecruiterReport`, `RecruiterCheck`, `runRecruiterChecks()` (stub) |
| `src/lib/resume/sections.ts`, `heuristic-parse.ts` | Heading detection, rule-based parser (stubs) |
| `src/lib/lint/types.ts`, `bullets.ts` | `LintIssue`, `lintBullet()`, `lintResume()` (stubs) |
| `src/lib/tailor/keywords.ts` | `normalizeTerm`, `findTerm`, `keywordCoverage` (stubs) |
| `src/lib/ai/types.ts`, `structure.ts`, `fix.ts`, `tailor.ts` | `FixResult`, `TailorResult`, `AIError`; `structureResume`, `fixBullet`, `tailorResume` (stubs) |
| `src/db/schema.ts`, `client.ts`, `connection.ts`, `locks.ts` | Drizzle pg tables (mirror `supabase/migrations/*.sql`, the real DDL), `getDb()` and the driver-neutral `Db`/`Tx` types, which env var holds which URL, `lockUser()` for capped writes |
| `supabase/migrations/*.sql`, `scripts/migrate.ts` | Schema history (Supabase CLI file names); the runner records applied files in `supabase_migrations.schema_migrations` |
| `src/lib/supabase/*` | `createSupabaseServerClient()` (request cookies), `createSupabaseAdminClient()` (secret key), `updateSession()` for the proxy, auth cookie options |
| `src/lib/http.ts` | `clientIp()`, `readJson(req, schema)`, `getDeviceId()` |
| `src/lib/api/types.ts`, `respond.ts`, `client.ts` | Request schemas, response types, `ok()`/`fail()`, browser `api` client + `ApiClientError` |
| `src/lib/auth/*` | `SessionUser`, `AuthMode`, `getCurrentUser`/`clearSession`/`authMode`, `requestLoginCode`/`verifyLoginCode` (Supabase email OTP, or dev codes), `googleSignInUrl`/`finishOAuthSignIn`, `deleteAuthUser`, `AuthError`, route guards |
| `src/lib/usage.ts`, `src/lib/rate-limit.ts` | `getUsage`/`getUsageState`/`consumeUsage`/`refundUsage`, `resolvePeriod`, `rateLimit` (stubs) |
| `src/lib/billing/*` | `billingMode()` (`"creem" \| "mock" \| "disabled"`), `createCheckoutUrl`, `createPortalUrl`, `handleWebhook`, `trialAvailableFor`, `BillingError`. `creem.ts` is the only file that calls Creem; `trial.ts` (one trial per person), `entitlements.ts` (status to plan), `webhook.ts`, `intervals.ts` (product ids), `testing.ts` (fake Creem API for tests) |
| `src/lib/store/resume-store.ts` | zustand studio store: `useStudioStore`, `useStudioHydrated`, `useActiveResume`, `useActiveReport`, `useResumeList`, `STUDIO_STEPS`, `STEP_LABELS` |
| `src/components/account/use-me.ts` | `useMe()`, `refreshMe()`, `patchMe()` (`me.auth.mode` tells the sign-in form whether Google is available) |
| `src/components/account/account-gate.tsx`, `sign-in-dialog.tsx`, `upgrade-dialog.tsx` | `useAccountGate()`, `SignInDialog`, `UpgradeDialog` (stubs) |
| `src/components/studio/steps/{fix,tailor,download}-step.tsx` | `FixStep`, `TailorStep`, `DownloadStep` (stubs) |
| `src/lib/log.ts` | Structured server logger `log.info/warn/error(event, ...)`, `maskEmail()`. Use it instead of raw `console.*` in server code. `log.error` also reports to Sentry |
| `src/app/api/health/route.ts` | `GET /api/health`: 200 when the DB answers (done) |

Added after v1 (all live; signatures stable the same way):

| File | What |
|---|---|
| `src/lib/resume/schema.ts` | Optional `extras` (`ExtraSection[]`, kinds `languages/awards/volunteering/publications/custom`), `sectionTitles`, `hiddenSections`, `design` (accent, font, density) and `hidden?` on every item. Read with `extrasOf()`, `sectionTitleOf()`, `isSectionHidden()` |
| `src/lib/resume/ops.ts` | `listBullets(resume, { includeHidden? })`, `visibleResume()` (also re-exported by `src/lib/pdf/visible.ts`, which everything that prints reads), `isHidden()`, `extraSectionTitle()`; `BulletSection` includes `"extras"` |
| `src/lib/store/resume-store.ts` | `updateResume(id, updater, { label? })` (a label makes a named undo step: `EDIT_LABELS`), `undo`/`redo`, `saveVersion`/`restoreVersion`/`deleteVersion`, `trashResume`/`restoreFromTrash`/`deleteFromTrash`/`emptyTrash`; hooks `useHistoryStatus`, `useVersions`, `useTrash` |
| `src/lib/ai/redact.ts` | `createRedactor()`, `redactorFor(resume)`, `redactResume()`: every AI prompt builder sends `[NAME]`, `[EMAIL_n]`, `[PHONE_n]`, `[LINK_n]` and restores them before its guards run |
| `src/lib/ai/{summary,interview,draft}.ts`, `src/lib/github/draft.ts` | `writeSummary`, `prepareInterview`, `draftResume`, GitHub project drafting |
| `src/lib/pdf/{design,fit}.ts`, `src/lib/docx/*`, `src/lib/sendcheck/*` | Look settings, fit to one page, Word export, send check (`SendCheckTarget` includes `{ kind: "extra"; sectionId }`) |
| `src/lib/eligibility/*` | `WorkProfile`, `checkEligibility()` (browser-only rules, verdicts OK / Check / Likely blocked) |
| `src/lib/insights/*` | `InterviewPrep`, `StarStory`, skill gaps across tailored jobs |
| `src/lib/share/*` | `SharedLink`, snapshot (only what the PDF prints), visit counting |
| `src/lib/referrals/*`, `src/lib/feedback/*` | Invite codes, cookie and rewards (`usage.bonus`); feedback notes |
| `src/lib/notifications/*`, `src/lib/cron/*` | Bell notifications, reminder settings, Resend email + signed unsubscribe; `runCronRoute`, cleanup, follow-ups |
| `src/lib/analytics/*`, `src/lib/observability/*` | PostHog `track()` (browser), `captureServerEvent()` and `trackAICall()` (server), with scrubbing; Sentry config and scrubber |
| `src/config/plans.ts` | `PlanId = "free" \| "pro" \| "max"`, `PaidPlanId`, `PRO_TRIAL` (3 days, free, its own limits), `ProTool`, `RESUME_LIMITS` (`{ free: 1, paid: 50 }`), `resumeLimit()`, `FREE_TEMPLATES`, `hasProTools()`, `SHOW_REFERENCE_PRICES` + `REFERENCE_MONTHLY_USD` + `referenceDiscountPercent()`, `PRO_PRICE_COMPARISON`, `isTrialing()`, `planIncludes()`, `AllowancePeriod` includes `"trial"`, `Feature` (`tailor`, `letter`, `fix`, `import`, `draft`, `github`), `PLANS` (real limits per plan: `limits` per month, `weeklyLimits` per billing week, null on Free), `PLAN_ORDER`, `nextPlan()`, `BillingInterval`, `PRICES_USD[plan][interval]`, `AllowancePeriod` + `allowancePeriodFor(plan, interval)` + `planLimits(plan, period)`, `ANON_LIMITS`/`IP_LIMITS` for signed-out use; `UsageSnapshot[f].limit` includes invite bonuses; `UsagePeriod` (`{ kind, resetsAt }`) |
| `src/lib/applications/follow-up.ts` | Follow-up dates: `FOLLOW_UP_DAYS` (default 7), `SNOOZE_DAYS` (3), `firstFollowUpAt()`, `followUpState()`; `Application.followUpAt` |
| `src/components/ui/undo-toast.ts`, `trash-with-undo.ts` | Undo instead of confirms: `undoToast({ onUndo, onCommit })` holds server deletes until the toast goes (or the page closes, with `keepalive`) |
| `src/lib/resume/schema.ts` (`TailorMetaSchema`) | Tailored copies also keep `jobText`, `jobUrl` and `requirements` (`{ text, importance, terms }`); read with `src/lib/insights/saved-job.ts` |
| `src/lib/api/types.ts`, `client.ts` | Schemas and `api.*` methods for every route below |
| `src/lib/job-feed/*` | The Jobs tab (JOB-SOURCES.md). Client-safe: `types.ts` (`FeedJob`, `MatchedJob`, `JobFilters`, request schemas), `sources.ts` (`SOURCE_INFO`, credit, republish flag), `skills.ts` (`findSkills()`: the vocabulary, on the tailor tokens), `roles.ts` (kind of role, seniority, years asked), `match.ts` (`matchJob()`: Strong / Good / Stretch and the plain reason, no score), `profile.ts` (`matchProfileOf(resume)`: skills, titles and years, all the browser sends), `params.ts`, `json-ld.ts`, `seeds.ts` (323 board tokens). Server-only: `parsers.ts`, `normalize.ts`, `store.ts`, `ingest.ts`, `records.ts`, `rank.ts` |
| `src/lib/eligibility/check.ts` | `ruleLines(text)`: only the sentences the eligibility rules read; checking them gives the same findings as the whole post (tested on every post fixture) |
| `src/lib/jobs/fetch.ts` | `safeFetch(url, { timeoutMs? })`: optional per-request timeout (default still 8 s) for whole job boards |
| `src/lib/portfolio/*` | Portfolios. Client-safe: `types.ts` (`Portfolio`, `PortfolioSettings`, request schemas, `PORTFOLIO_LIMITS`, `portfolioPath()`), `slug.ts` (`normalizeSlug`, `slugProblem`, `RESERVED_SLUGS`, `suggestSlug`), `view.ts` (`portfolioView(resume, settings)`: what every template draws, privacy already applied), `templates.ts` (names, one-line ideas, picker pictures, page colours), `images.ts` (`projectImageProblem`, `safeImageUrl`: https-only project pictures), `plan.ts` (`canBuildPortfolio`, `canPublishPortfolio`, `canHideCredit`, `showsCredit`). Server-only: `records.ts`, `cache.ts` (`refreshPortfolioPages()`), `page.ts` (`loadPublicPortfolio()`, `unstable_cache` tagged `portfolio:<slug>`), `sync.ts` (`syncPortfolioWith()`, called by `PUT /api/resumes/[id]`). Templates: `src/components/portfolio/templates/registry.ts` (`id`, `name`, `description`, `thumbnail`, `Component`); a template gets only `view` (and the credit as `footer`), carries its own root-scoped stylesheet (`templates/css.ts`) and reads its fonts from `templates/fonts.ts`, which only `/p/[slug]` and the editor preview import |
| `src/lib/portfolio/content*.ts`, `media*.ts`, `metrics.ts`, `places.ts` | Portfolio **content** beyond the resume (new 2026-11-08). Client-safe: `content.ts` (**the contract for templates**: stored `PortfolioContentSchema` / `PortfolioContent`, v1, nullable = "fill it in for me"; resolved `PortfolioContentView`; `GitHubStats`; `saveableContent()`, `uploadsIn()`, `CONTENT_LIMITS`), `content-view.ts` (`contentView({ view, content, github, mediaBase })`, `autoContent()`, `imageOf()`), `content-auto.ts` (the prefill rules), `content-rules.ts` (text, social, video rules), `content-uses.ts` (`TEMPLATE_USES`, `REFERENCE_USES`, `contentChecklist()`), `metrics.ts` (`metricsIn`, `bestMetric`: numbers from bullets, no AI), `places.ts` (`findPlace`: city -> time zone and pin), `media.ts` (`MEDIA_LIMITS`, `sniffImageType` by magic bytes), `fixtures/jordan.ts` (`jordanContentView()` for tests and previews). Server-only: `content-records.ts` (`saveContent`, `refreshGitHub`, `fillAccountPhoto`, `deletePortfolio`), `media-records.ts` (caps, attach/detach, sweep, `deleteAllMedia`), `media-store.ts` (Supabase Storage bucket `portfolio-media` or `web/.uploads`), `media-image.ts` (sharp: pixel cap, rotate, strip metadata, resize, WebP), `media-upload.ts` (capped multipart read, site icon fetch from the icon service only). Also `src/lib/github/stats.ts` (pure) and `profile.ts` (server: profile, repos, events through the import's cached client), `src/lib/auth/avatar.ts` (Google picture). Templates get it as the optional `content` prop |

Stubs throw `Not implemented: <name>` (or render `null`). The owning task replaces the body and keeps the exported signature. If a contract truly must change, make the smallest compatible change, such as adding an optional field, and say so in your final report.

## API routes

All route handlers: `export const runtime = "nodejs"`; respond only via `ok()`/`fail()`; validate bodies with the schemas in `src/lib/api/types.ts` via `readJson()`; never leak stack traces (log with `console.error` and return `server_error`). Status codes: 400 bad_request, 401 unauthorized, 403 forbidden (sent from another website's page), 404 not_found, 413 too_large, 415 unsupported_type, 422 parse_failed, 429 rate_limited / limit_reached, 502 ai_unavailable, 503 billing_unavailable, 500 server_error. Set `Retry-After` on 429 when known. AI routes: `export const maxDuration = 60`.

| Route | What | Access |
|---|---|---|
| `POST /api/import`, `POST /api/check` | Parse an upload (AI structuring, heuristic fallback); recruiter checks | Anyone; per device and IP |
| `POST /api/draft` | "Build with Otto" first draft | Anyone; per device and IP |
| `POST /api/job` | Read a job post from its link | Anyone |
| `POST /api/fix`, `POST /api/summary` | Fix a line; write or tighten the summary | Sign-in; "fix" allowance |
| `POST /api/tailor` | Tailor to a job post | Sign-in; "tailor" allowance |
| `POST /api/letter`, `POST /api/answer`, `POST /api/interview` | Cover letter, application answer, interview prep pack (saved on the application) | Sign-in; "letter" allowance |
| `GET /api/interview/[id]` | An application's job details and saved prep pack | Sign-in, own rows |
| `GET /api/resumes`, `PUT/DELETE /api/resumes/[id]` | Cloud backup | Sign-in; a new resume past Free's 1 is 402 |
| `GET/POST/PATCH /api/applications`, `PATCH/DELETE /api/applications/[id]` | Applications tracker | Sign-in; POST and PATCH Pro (GET and DELETE open on Free) |
| `GET/PUT /api/profile` | Work profile | Sign-in; PUT Pro |
| `POST /api/github/lookup`, `POST /api/github/draft` | Public repos and merged PRs by username; drafted project lines | Anyone; per device and IP |
| `GET/POST /api/share`, `PATCH/DELETE /api/share/[id]` | Share links (one live link per resume) | Sign-in; POST Pro |
| `GET/PATCH /api/notifications`, `GET/PUT /api/notifications/settings` | Bell notifications; reminder email switch | Sign-in |
| `GET/POST /api/notifications/unsubscribe` | One-click unsubscribe from a reminder email (signed token) | Token |
| `POST /api/notifications/follow-up` | Done or Snooze 3 days from a reminder email's signed link (sent by the `/reminder` page, which every email button opens) | Token |
| `POST /api/feedback` | "Send feedback" | Anyone; per device, IP and account |
| `GET /api/referrals`, `POST /api/referrals/claim` | Invite link and counts; credit the `otto_ref` cookie's invite | Sign-in |
| `POST /api/jobs/matches` | Open jobs ranked for one resume (or the saved ones), with filters and pages; body is `matchProfileOf(resume)`, never the resume | Sign-in, 60 a minute per account; Pro (Free gets `locked: true` and the counts only) |
| `GET /api/jobs/[id]` | One job's stored text, for the tailor flow's backup | Sign-in |
| `PUT/DELETE /api/jobs/saved/[id]` | Save or forget a job (500 per account) | Sign-in; PUT Pro |
| `GET/POST/PATCH /api/portfolio` | The account's one portfolio: load, make from a resume (or point at another), change address, template, project pictures, what shows, sync, publish; every write drops the cached page | Sign-in; 120 writes an hour |
| `GET /api/portfolio/slug?value=` | Address as it would be saved, and whether it's free | Sign-in; 30 a minute |
| `POST /api/portfolio/views` | One visit, sent by the cached page itself; bots, link previews and the signed-in owner don't count; nothing about the visitor is stored | Anyone; 300 counted per page per hour |
| `DELETE /api/portfolio` | Deletes the page, its old addresses and every uploaded picture (files first) | Sign-in |
| `GET/PUT /api/portfolio/content` | The content document (autosaved whole), the GitHub numbers (refetched when older than 6 hours), picture space used; GET fills the photo from the Google account once | Sign-in; PUT needs `canBuildPortfolio`; 900 saves an hour |
| `POST /api/portfolio/github` | Fetch the GitHub numbers again now | Sign-in; 6 an hour |
| `POST /api/portfolio/media` (multipart `file`, `kind`), `DELETE /api/portfolio/media?id=` | One picture: type by magic bytes (PNG, JPEG, WebP, AVIF), 4 MB in, 50 MP decode cap, resized per kind and re-encoded to WebP; 60 files / 60 MB per account; delete one now | Sign-in; `canBuildPortfolio`; 60 uploads an hour |
| `POST /api/portfolio/media/icon` `{ url }` | A website's icon as a logo, fetched only from Google's favicon service (no request to the typed host), 404 when there is none | Same as uploads |
| `GET /api/portfolio/media/dev/<key>` | Development only: serves `web/.uploads`; 404 in production or when the store is Supabase | Anyone (dev) |
| `GET/POST /api/cron/cleanup`, `GET/POST /api/cron/follow-ups`, `GET/POST /api/cron/jobs` | Daily jobs (`vercel.json` crons); skipped by `src/proxy.ts` | `Authorization: Bearer <CRON_SECRET>` |
| `POST /api/auth/request-code`, `POST /api/auth/verify`, `POST /api/auth/google`, `GET /auth/callback`, `POST /api/auth/logout`, `GET /api/auth/expired`, `GET /api/me`, `DELETE /api/account` | Sign-in, session, account | Mixed |
| `POST /api/billing/checkout` (body `{ plan, interval }`, default Pro monthly; a Free account that has never trialed or paid gets the trial product; Pro to Max or back changes the live subscription in place through Creem's upgrade endpoint; mock checkout stores the interval picked), `POST /api/billing/portal` (Creem billing portal link), `POST /api/billing/webhook` (checks `creem-signature`, idempotent by event id, maps each product id to its plan and billing interval, stored in `users.plan_interval`) | Creem billing | Sign-in; webhook signed |
| `GET /api/health` | DB check | Anyone |

Pages beyond the core flow: `/dashboard`, `/dashboard/jobs`, `/dashboard/resumes`, `/dashboard/applications`, `/dashboard/applications/[id]/prep`, `/dashboard/formats`, `/dashboard/trash`, `/dashboard/account` (signed in), `/s/[slug]` (public, `noindex` unless the owner allows it), `/dashboard/portfolio` (signed in; `?resume=<id>` makes it from that resume), `/p/[slug]` (public, ISR: `revalidate` 3600 plus on-demand on every write; `noindex` unless the owner allows it; an old address redirects for 90 days; its own Open Graph image), `/jobs` (public, indexable; filtered and later pages `noindex, follow`) and `/jobs/[id]` (public, JobPosting JSON-LD while open; 404 for sources that don't allow republishing). There is no `/admin` route.

## Database tables

All in `public`, RLS on with no policies (only our server connects), every per-user table cascades from `users`. Timestamps are epoch ms (`bigint`).

| Table | What | Migration |
|---|---|---|
| `users`, `usage`, `rate_limits`, `resumes`, `resume_tombstones`, `billing_events`, `applications` | Core: accounts, usage counters per period, rate-limit windows, backups, delete markers, webhook ids, applications | `20261107120000_init.sql` |
| `shares` | Share links: frozen snapshot, options, view count; one live link per resume | `20261108000100_share_links.sql` |
| `feedback`, `referral_codes`, `referrals`, `usage.bonus` | Feedback notes, invite codes and claims, invite bonus units | `20261108000200_feedback_referrals.sql` |
| `notifications`, `notification_settings`, `applications.reminded_at` | Bell notifications, reminder email switch (no row = on), follow-up stamp; cleanup indexes | `20261108000300_notifications.sql` |
| `work_profiles` | One work profile per account | `20261108000500_work_profile.sql` |
| `applications.prep` | Interview prep pack (jsonb) | `20261108000600_application_prep.sql` |
| `applications.follow_up_at`, `notification_settings.follow_up_days`, emails opt-in | Follow-up dates; the account's default delay; `email_reminders` defaults to off | `20261108000700_follow_up_dates.sql` |
| `users.plan` check allows `max` | The Max plan | `20261108000800_max_plan.sql` |
| `users.plan_interval` (`month` / `year` / `week`, null on Free) | How often the paid plan bills; sets the allowance period | `20261108000900_plan_interval.sql` |
| `users.trial_ends_at`, `users.billing_event_at`, `trial_history` | When a trialing subscription's trial ends (null otherwise); the newest subscription event applied, so a late retry of an older one is ignored; everyone who has trialed or paid, by SHA-256 of the normalized email, not tied to `users` so a deleted account can't trial again | `20261108004000_pro_trial.sql` |
| `jobs`, `job_boards`, `saved_jobs`, `work_profiles.remote_only` | Openings from public boards (not per user: no cascade from `users`; GIN indexes on `keywords` and `search`, partial indexes on open rows), when each board was last read, each account's saved jobs (cascades from `users` and `jobs`), the Jobs tab's remote-only default | `20261108001000_jobs.sql` |
| `portfolios`, `portfolio_redirects` | One portfolio per account (unique `user_id`): unique slug, template, a frozen snapshot like `shares`, privacy switches (email, phone, hidden sections), sync, published, search engines, credit line, project pictures (`project_images`, https addresses by project id), a view total; old addresses with an expiry (5 kept per portfolio) | `20261108002000_portfolios.sql`, `20261108003000_portfolio_templates.sql` |
| `portfolios.content`, `portfolios.github`, `portfolios.github_checked_at`, `portfolio_media` | The content document (jsonb object, 256 KB cap, checked by `PortfolioContentSchema`); the last GitHub numbers; one row per uploaded picture (`key` = `<user id>/<id>.webp` in the store, kind, bytes, size, `detached_at` while unused, swept after 15 minutes). RLS on; cascades from `users` | `20261108005000_portfolio_content.sql` |

`src/db/schema.ts` mirrors these. Migrations apply in file order on a fresh database; a database that already ran 000500/000600 picks up 000100-000300 afterwards (the runner applies whatever is missing, and none of them touch the same objects).

## Scheduled jobs

`vercel.json` runs `/api/cron/cleanup` at 04:17 UTC, `/api/cron/jobs` at 05:40 UTC and `/api/cron/follow-ups` at 14:00 UTC (production only). Cleanup and follow-ups stop after about 45 s; the jobs ingest has `maxDuration` 300 and stops starting boards after 240 s. All resume the next day; running one twice is harmless. Cleanup deletes by age in batches of 1,000 (rate-limit windows 2 days, tombstones 180 days, read notifications 90 days, unread 1 year, webhook ids 400 days). Follow-ups: applications still "applied" whose `follow_up_at` has come and isn't reminded yet, on accounts that aren't on Free (the tracker is Pro; a Free account's due reminders wait, unclaimed), get one bell notification per account per run, plus one Resend email only for accounts that turned reminder emails on (opt-in). Each email has signed one-click Done, Snooze 3 days and Unsubscribe links. Jobs: syncs `job_boards` with the seed list, reads Remote OK and the newest 200 Himalayas jobs once a day, then the company boards least recently read first (3 at a time, each host at its own pace: Lever 1 s, Greenhouse 0.3 s, Ashby 0.5 s), skipping any read in the last 20 hours. Per board it keeps the newest 200, normalizes only new or changed jobs (content hash), leaves lines most of the board's jobs share out of the skills, dedupes by (source, external id) and by company + title + location (the employer's own board beats a feed's copy), and closes jobs missing from 2 reads in a row; 2 404s in a row close the whole board. Then it closes jobs past their end date and feed jobs older than 30 days, deletes rows closed 30+ days, and trims to 20,000 rows. `bun scripts/jobs-ingest.ts [--limit N]` runs the same code against the local `.pglite/`.

## File ownership

This table is the v1 build split. Features added later live in their own folders (`src/lib/<feature>/`, `src/components/<feature>/`, `src/app/api/<feature>/`); `../FEATURES.md` maps them.

Each task writes only inside its own paths (plus its own `*.test.ts` files next to them). Reading anything is fine.

| Task | Owns |
|---|---|
| ui-kit | `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/**` |
| mascot | `src/components/mascot/**`, `src/app/icon.svg`, `src/app/opengraph-image.tsx` |
| parse-checks | `src/lib/parse/**` (except `types.ts`), `src/lib/checks/recruiter.ts`, `src/lib/resume/sections.ts`, `src/lib/resume/heuristic-parse.ts` |
| lint-keywords | `src/lib/lint/bullets.ts`, `src/lib/tailor/**`, tests for `src/lib/resume/ops.ts` |
| ai | `src/lib/ai/**` (except `types.ts`) |
| auth | `src/lib/auth/**` (except `types.ts`), `src/lib/supabase/**`, `src/db/**`, `supabase/**`, `scripts/migrate.ts`, `src/proxy.ts`, `src/lib/usage.ts`, `src/lib/rate-limit.ts`, `src/lib/users.ts`, `src/app/api/auth/**`, `src/app/auth/**`, `src/app/api/me/**`, `src/app/api/account/**` |
| billing | `src/lib/billing/**` (except `types.ts`), `src/app/api/billing/**` |
| api-routes | `src/app/api/import/**`, `src/app/api/check/**`, `src/app/api/fix/**`, `src/app/api/tailor/**`, `src/app/api/resumes/**` |
| marketing | `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/page.tsx`, `src/app/(marketing)/_components/**`, `src/app/(marketing)/pricing/**`, `src/app/(marketing)/privacy/**`, `src/app/(marketing)/terms/**`, `src/app/(marketing)/refunds/**`, `src/components/site/**`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/not-found.tsx` |
| account-ui | `src/app/(marketing)/login/**`, `src/app/(marketing)/account/**`, `src/components/account/**` (except `use-me.ts`) |
| studio-core | `src/app/studio/**`, `src/components/studio/**` except the three step files below and `editor/`, `tailor/`, `download/`; `src/lib/sync/**`, `src/lib/resume/sample.ts` |
| studio-editor | `src/components/studio/steps/fix-step.tsx`, `src/components/studio/editor/**` |
| studio-tailor-export | `src/components/studio/steps/tailor-step.tsx`, `src/components/studio/steps/download-step.tsx`, `src/components/studio/tailor/**`, `src/components/studio/download/**`, `src/components/pdf/**`, `src/lib/pdf/**` |

## Design direction

`DESIGN.md` is the design language and overrides anything here: paper, ink and Otto's orange pencil. In short: depth from surface shade (cream paper, stone panels, white cards on stone) instead of borders or shadows; ink for text, every main button (black pills) and the focus ring; the orange accent only as a pencil mark, at most two per screen; EB Garamond for h1/h2 at regular weight, Inter for everything else. Status colors stay pass = green, warn = amber, fail = red, always with an icon and a word. Mobile-first: everything must work at 360px wide. Light theme only for v1.

Otto is an otter with small reading glasses, drawn in thin sepia lines with flat fills. Poses: `wave`, `read`, `think`, `point`, `cheer`, `worried`, `peek`. He speaks through `OttoNote` (a small line-drawn head, a gray meta line, a first-person message) in the studio and in dialogs; the full body is for empty states, success moments, the 404, the final call to action and the share images. Blinking is his only idle motion. Respect `prefers-reduced-motion`.

## Code conventions

- Comments: production style, explaining *why*, never *what*. No commented-out code. No banner comments.
- Tailwind 4: built-in utilities over arbitrary values (`size-8`, not `h-[32px] w-[32px]`; `gap-3`, not `gap-[12px]`). Arbitrary values only when no utility exists. Use theme tokens from `globals.css` (e.g. `bg-ink`, `text-muted`), not raw hex colors in components.
- Components: one component per file when it's over ~100 lines; files under ~300 lines; colocate page-only sections in `_components/`.
- Client components start with `"use client"`. Never import server-only modules (`src/lib/env.ts`, `src/db/**`, `src/lib/auth/session.ts`, `codes.ts`, `src/lib/usage.ts`, `src/lib/rate-limit.ts`, `src/lib/billing/index.ts`, `src/lib/ai/**` except `types.ts`, `src/lib/parse/**` except `types.ts`, `src/lib/http.ts`, `src/lib/github/{api,cache,draft,http}.ts`, `src/lib/cron/**`, `src/lib/notifications/{records,email,follow-up,unsubscribe}.ts`, every `records.ts`, `src/lib/job-feed/{parsers,normalize,store,ingest,rank}.ts`, `src/lib/portfolio/{records,cache,page,sync,content-records,media-records,media-store,media-image,media-upload}.ts`, `src/lib/github/profile.ts`, `src/lib/auth/avatar.ts`, `src/lib/analytics/server.ts`) from client code. Types-only files are client-safe.
- zustand selectors that build arrays or objects must use `useShallow` (or the provided hooks), or React 19 loops.
- React 19 lint rules are on (react-hooks v7): no synchronous `setState` inside `useEffect` bodies, no reading refs during render. Derive state instead of syncing it.
- Accessibility: real `<button>`/`<label>`, visible focus rings, `aria-live` for async results, dialogs trap focus and close on Escape, 44px minimum touch targets.
- Errors shown to users are plain and actionable ("That file isn't a PDF or Word document."). No raw error codes in the UI.
- Prefer named exports. No default exports except Next.js files that require them (page, layout, route-adjacent metadata files).

## Production and scale

Target: deploy on Vercel (Fluid compute, functions in `iad1`) with Supabase (Postgres + Auth, US East), and scale horizontally with no code changes from 10 users to 100k. Owner steps: `SETUP.md`.

- **Database access.** Only our server talks to Postgres, through Supabase's transaction pooler (`DATABASE_URL`, port 6543, postgres.js with `prepare: false`, 5 connections per instance). Every table has RLS on and no policies, so the Data API (publishable key) sees nothing. Schema changes are new files in `supabase/migrations/`, applied with `bun scripts/migrate.ts` before the deploy that needs them; never edit an applied file.

- **Stateless servers.** Any instance can serve any request. No per-user state in module memory; only lazy singletons (DB client, SDK clients) and pure constants. Everything durable lives in the DB, everything per-user in the session cookie or the browser.
- **Bounded everything.** Every input has a size cap (`TEXT_LIMITS`, `UPLOAD_LIMITS`, zod `.max()`), every list a length cap, every external call a timeout. Uploads stay under Vercel's 4.5 MB request body limit (`UPLOAD_LIMITS.maxBytes` = 4 MB).
- **Atomic, idempotent writes.** Counters use single-statement upserts (no read-then-write races). Capped inserts (50 resume backups, applications) and backup deletes run in a transaction that first locks the user's row (`lockUser`), because Postgres, unlike SQLite, runs writers side by side. Webhooks insert their id and apply the change in one transaction, so a redelivery is a no-op, and an event older than the last one applied for the same subscription (`users.billing_event_at`) changes nothing. PUTs are upserts keyed by `(user_id, id)`. Foreign keys with `on delete cascade` from every per-user table to `users`, and from `users` to `auth.users`, mean nothing is ever orphaned.
- **Billing statuses (Creem).** `trialing` → the product's plan with `trial_ends_at` set (trial allowance, no portfolio publishing); `active`, `past_due`, `scheduled_cancel` → the plan (`active` ends a trial; a failed first payment keeps the trial's allowance); `canceled`, `expired` (also the `subscription.expired` event, whose payload keeps the old status), `paused`, `unpaid` → Free; `incomplete` → no change. Dropping to Free takes a published portfolio offline (kept) and drops its cached page.
- **Allowance periods.** `usage` rows are keyed by period. A trial counts in one fixed row, `"trial"`, so neither a month turning nor a moved end date opens a second allowance; it ends with the first payment. Free, monthly and yearly accounts count per UTC calendar month (`"2026-11"`, resets on the 1st). Weekly subscribers (`users.plan_interval = 'week'`) count per billing week (`"week:<ISO instant it ends>"`): the 7 days ending at `plan_renews_at`, repeating on both sides of it, or the ISO week in UTC when there is no renewal date (mock billing). Switching never starts an allowance over: each period keeps its own row, so coming back to an interval inside the same month or week finds its count; every weekly use is also added to that calendar month's row, so weekly to monthly mid-month doesn't open a fresh month; and a billing week that has started (any feature's row) runs its full 7 days even if the renewal date moves or is cleared by a scheduled cancellation. Moving from monthly to weekly gives that week's allowance once. Invite bonuses land on the account's current period row. `/api/me` returns `period: { kind, resetsAt }` so meters and notes say "this week" and the reset date; a 429 `limit_reached` has `Retry-After` until the reset.
- **Indexed access only.** Every query hits a primary key or an index; no full scans in request paths; per-user queries are always filtered by `user_id`.
- **Push work to the edge or client.** Marketing pages are static (CDN). PDF rendering and lint run in the browser. Only parsing, auth and AI touch the server.
- **Fail soft.** AI failures fall back (heuristic parse, a clear retry message), refund usage, and never lose user data. Background sync failures retry quietly.
- **Swap points for real scale** (don't build now): `rate-limit.ts` / `usage.ts` can move to Redis (Upstash) behind the same signatures; AI calls can move to a queue if latency ever matters.
- **Observability.** Structured logs via `src/lib/log.ts` with stable event names (`import.parse_failed`, `ai.refused`, `billing.webhook_invalid`…). No PII in logs (mask emails, never log resume text, codes or tokens). Errors also go to Sentry (`src/lib/observability/`: errors only, scrubbed of emails, phones, IPs, bodies, cookies and `/s/<token>` paths). Product events go to PostHog (`src/lib/analytics/`: named events with counts and flags, no autocapture, no page views, no recordings, no cookies; skipped under Do Not Track / GPC). Both are off without their keys.
- **Security.** Security headers in `next.config.ts`; httpOnly + sameSite=lax + secure cookies (Supabase's `sb-...` session cookies are made httpOnly too: no browser code ever needs the tokens, so there is no browser Supabase client); sign-in codes generated, emailed and checked by Supabase, with our per-address and per-IP limits on top; the Supabase secret key is server-only and used only to delete auth users; constant-time compares; webhook signatures verified; resume text inside AI prompts is treated as data (prompt-injection safe). JSON routes require `application/json` (`rejectNonJson`); routes that can't (uploads, logout) refuse cross-site requests (`rejectCrossSite`: `Sec-Fetch-Site`, else `Origin`).
- **Revocable sessions.** `getCurrentUser()` asks Supabase on every call (`auth.getUser()`, not the local-only `getClaims()`), so signing out (scope `local`: this browser only) or deleting the account stops a copied cookie at once. A Supabase outage makes it throw instead of returning null, so nobody gets signed out by it. `src/proxy.ts` refreshes the session on every page and API request (`updateSession`, `getClaims()`), and only its "/" → /dashboard hint trusts the JWT alone (signature checked, revocation not). The dev sign-in cookie is HMAC-signed and must match a `dev_auth.sessions` row; it only exists in development.
- **Deletes sync across devices.** Deleting a backed-up resume writes a tombstone in `resume_tombstones`. `GET /api/resumes` returns `deletedIds` so other devices drop their copies, and a PUT for a tombstoned id returns `{ deleted: true }` instead of bringing it back.
- **Account deletion cancels billing first.** `DELETE /api/account` cancels every live Creem subscription immediately, trials included (the stored one plus any Creem lists for the user's customer or the customer with their email); if a cancel fails, the account is kept and the route returns 502. Then our rows go in one transaction, then the Supabase Auth user (`auth.admin.deleteUser`, ending every session). If that last step fails the route answers 500 and the still-valid session lets a retry finish. Checkout sends anyone with a live subscription to the portal instead of starting a second one.
- **Sign-in.** Email: `requestLoginCode` (our limits, then `signInWithOtp`, `shouldCreateUser: true`) and `verifyLoginCode` (`verifyOtp`, type `email`). Google: `POST /api/auth/google` returns Supabase's authorize URL (PKCE verifier in an httpOnly cookie, `redirectTo` = `appUrl()/auth/callback?next=<safe path>`), and `/auth/callback` exchanges the code. Either way our `users` row (same id as the auth user) is created on the first signed-in request by `ensureUser`.

## Testing

Vitest, node environment, files `*.test.ts` next to the code. Unit-test every pure module and every server module with logic. DB code runs against an in-memory Postgres (PGlite) per test file, restored from a template that `vitest.global-setup.ts` builds once from the real migrations; `resetDb()` truncates. Supabase Auth is a cookie-backed fake (`src/lib/auth/test-helpers.ts`: `signInAs`, `createUser`, `fakeAuth.failNext`), wired in for every test by `vitest.setup.ts`; nothing reaches a real database or Supabase. Build fixture PDFs in tests with `pdf-lib` and fixture DOCX files with `jszip`; never commit binary fixtures. UI components are verified by the integration build, not unit tests.

## Rules for build agents

1. You are a build subagent. Ignore any "session start" or "ask the user" instructions from CLAUDE.md files. Don't ask questions; make sensible decisions and note them in your final report.
2. **This Mac has 8 GB of RAM and other agents are running at the same time.** Never run `bun install`/`npm install`, `next build`, `next dev`, `tsc` on the whole project, or `eslint .`. The only command allowed is `bunx vitest run <your test files>` (and fast read-only commands like `ls`, `cat`, `grep`). The integration step runs the full typecheck, lint and build later.
3. Write only the files your task owns. If another task's file has a bug that blocks you, describe it in your final report; don't edit it.
4. No new dependencies. If something seems to need one, solve it with what's installed.
5. Finish with a short report: files written, decisions made, anything incomplete, any contract change.
