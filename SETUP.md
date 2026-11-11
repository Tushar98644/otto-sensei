# Setup: put Otto Sensei online

Step by step, from nothing to a live app. Do the steps in order. About an hour, most of it waiting
for DNS and Google.

You will end up with:

```
Browser → Vercel (app, US East iad1) → Supabase (database + sign-in, US East)
                                     → Resend (sign-in emails, through Supabase)
                                     → Google (sign-in), OpenRouter (AI), Creem (payments)
```

What you need: accounts at vercel.com, supabase.com, resend.com (plus a domain you can add DNS
records to), console.cloud.google.com, openrouter.ai and creem.io. On your laptop: `bun`
and the Vercel CLI (`bun add -g vercel`).

All commands run in this folder (`projects/resume-app/web`).

---

## 0. Local development (no setup)

```bash
bun install
bun dev            # http://localhost:3000
```

Sign in with any email address: no email is sent, the sign-in form shows
"Dev mode: your code is 123456". Type it and you're in. Plans, usage, resume backups, applications
and the "Upgrade" button (mock billing) all work.

- Everything is stored in the `.pglite/` folder, a real Postgres in a folder, created and migrated
  on the first request. Delete the folder to start over.
- New migration files are applied when `bun dev` starts, not while it runs. After pulling new
  files into `supabase/migrations/`, stop `bun dev` and start it again.
- `bun dev` stays local even after step 5 puts Supabase values in `.env.local`, so test accounts
  never land in the real database.
- To try real email codes and Google sign-in on your laptop (after steps 2 to 8), run
  `DEV_AUTH=supabase bun dev`. That uses the Supabase keys and `DATABASE_URL` from `.env.local`.
- Production never uses dev codes or `.pglite/`, whatever variables are set.
- **Jobs tab with real jobs locally.** The daily cron doesn't run on your laptop, so fill
  `.pglite/` with a sample once (it reads the same public job APIs, at the same polite pace):

  ```bash
  # stop bun dev first: only one process may open .pglite/
  bun scripts/jobs-ingest.ts              # 10 company boards + Himalayas + Remote OK, about 30 s
  bun scripts/jobs-ingest.ts --limit 40   # more boards
  bun dev                                 # then open /dashboard/jobs and /jobs
  ```

  Running it again the same day only reads boards it hasn't read in 20 hours.

---

## 1. Link the folder to Vercel

```bash
vercel login
vercel link
```

`vercel link` asks a few questions. Answer: set up the project **yes**, your own team, link to an
existing project **no**, name **otto-sensei**, code directory **./** (this folder).

The functions region is already set to **iad1** (US East, Washington DC) in `vercel.json`, next to
the Supabase database. Nothing to click.

> Deploying from GitHub instead of the CLI? In Vercel's project settings set **Root Directory** to
> `projects/resume-app/web`.

---

## 2. Create the Supabase project

1. Go to supabase.com/dashboard, click **New project**.
2. **Name:** `otto-sensei`. **Database password:** click **Generate a password** and save it in your
   password manager. **Region:** **East US (North Virginia)**. Click **Create new project**.
3. Wait about two minutes until the project says it's ready.

> Free projects pause after a week with no visitors. Upgrade to Pro before launch, or open the
> dashboard and click **Restore** if it pauses.

---

## 3. Copy five values from Supabase

| Variable | Where to find it in the Supabase dashboard |
|---|---|
| `DATABASE_URL` | **Connect** (top of the page) → **Connection String** → Method **Transaction pooler** (port **6543**). Copy it and replace `[YOUR-PASSWORD]` with the database password. |
| `DIRECT_DATABASE_URL` | Same dialog, Method **Session pooler** (port **5432**). Replace `[YOUR-PASSWORD]` again. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Connect** → **App Frameworks** (pick Next.js) → the `..._SUPABASE_URL` line. Looks like `https://abcdefgh.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Project Settings** → **API Keys** → **Publishable key** (`sb_publishable_...`). |
| `SUPABASE_SECRET_KEY` | **Project Settings** → **API Keys** → **Secret keys**. Click **Create new secret key** if there is none, then reveal and copy it (`sb_secret_...`). |

- Use the **Session pooler**, not "Direct connection", for `DIRECT_DATABASE_URL`: the direct one
  only works over IPv6, which many home networks don't have.
- If your password has `@ : / ? #` in it, URL-encode those characters, or generate one with
  letters and digits only.
- The secret key can delete any account. It only ever goes in `SUPABASE_SECRET_KEY`, never in a
  variable that starts with `NEXT_PUBLIC_`.
- Older projects show **anon** and **service_role** keys instead. They work too: use the names
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. Put the values into Vercel

Each command asks you to paste the value. Production first:

```bash
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_SECRET_KEY production
vercel env add NEXT_PUBLIC_APP_URL production      # https://otto-sensei.vercel.app, or your domain
```

Then the same five for **development**, plus the migration URL, so step 5 can bring them to your
laptop (`DIRECT_DATABASE_URL` is only used there, never by the live app):

```bash
vercel env add DATABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY development
vercel env add SUPABASE_SECRET_KEY development
vercel env add NEXT_PUBLIC_APP_URL development     # http://localhost:3000
vercel env add DIRECT_DATABASE_URL development
```

Want preview deployments to sign in too? Repeat the first list with `preview`.

**Optional, instead of typing them:** Supabase can push its values into Vercel for you. In the
Supabase dashboard: **Project Settings** → **Integrations** → **Vercel** → connect your Vercel
account and pick the `otto-sensei` project. It sets the Marketplace names (`POSTGRES_URL`,
`POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, ...). The app accepts those names too, so pick one way, not both. You still
add `NEXT_PUBLIC_APP_URL` yourself.

---

## 5. Pull the values to your laptop and create the tables

> **Usually nothing to do here (owner's choice, 2026-11-08):** every production deploy creates and
> updates the tables itself. vercel.json's build command runs `bun scripts/migrate.ts --deploy`
> before `next build`, using the database URL the Supabase integration put in Vercel. Preview
> builds and builds without a database skip it. The steps below are only for running it by hand.

`vercel env pull` replaces `.env.local`, which holds your OpenRouter key today. Back it up first:

```bash
cp .env.local .env.local.backup
vercel env pull .env.local
```

If `OPENROUTER_API_KEY` isn't in Vercel yet (step 9), copy its line from `.env.local.backup` back
into `.env.local`. (`bun dev` keeps using the local `.pglite/` database; see step 0.)

Now create the tables (Bun reads `.env.local` on its own):

```bash
bun scripts/migrate.ts --status   # shows what it would do, changes nothing
bun scripts/migrate.ts
```

On a new database you should see one `done ...` line per file in `supabase/migrations/` (twelve
today: `init`, `share_links`, `feedback_referrals`, `notifications`, `work_profile`,
`application_prep`, `follow_up_dates`, `max_plan`, `plan_interval`, `jobs`, `portfolios`,
`portfolio_templates`) and `Applied 12 migrations.` Running it again prints `Up to date.` It records
what ran in `supabase_migrations.schema_migrations`, the same table the Supabase CLI uses. Run it again whenever a new file appears in `supabase/migrations/`, before
deploying the code that needs it.

Every table has Row Level Security on with no policies. That is on purpose: the app talks to the
database only from its server, so the public Supabase API (the publishable key) can't read or
write any of it.

---

## 6. Sign-in emails: Resend through Supabase

Supabase sends the 6-digit codes. Its built-in mailer only reaches your own team and a few emails
an hour, so it must send through Resend.

**6a. Resend**

1. resend.com → **Domains** → **Add Domain** → your domain (for example `ottosensei.com`). Add the
   DNS records it shows at your domain registrar, then click **Verify**. Wait until it says
   **Verified**.
2. **API Keys** → **Create API Key** → name `supabase-smtp`, permission **Sending access**, your
   domain. Copy the key (`re_...`). You only see it once.

**6b. Supabase SMTP** (Supabase dashboard → **Authentication** → **Emails** → **SMTP Settings**)

1. Turn on **Enable custom SMTP**.
2. **Sender email:** `login@yourdomain.com`. **Sender name:** `Otto Sensei`.
3. **Host:** `smtp.resend.com`. **Port:** `465`. **Username:** `resend`. **Password:** the Resend
   API key from 6a.
4. Click **Save changes**.

**6c. Sending limit** (**Authentication** → **Rate Limits**): set **Rate limit for sending emails**
to `100` emails per hour, then **Save**. The app also limits each address to 5 codes an hour and
each IP to 10.

**6d. The email sign-in itself** (**Authentication** → **Sign In / Providers**)

1. **User Signups:** **Allow new users to sign up** on.
2. Open **Email**: **Enable Email provider** on. **Email OTP Expiration:** `600` (seconds; the app
   tells people codes last 10 minutes). **Email OTP Length:** `6`. **Save**.

**6e. The email text** (**Authentication** → **Emails** → **Templates**)

New people get the **Confirm signup** email, returning people the **Magic Link** email, so change
**both** to send the code instead of a link. Paste exactly this into each:

Subject:

```
Your Otto Sensei code: {{ .Token }}
```

Body (Source / HTML):

```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#12241d;max-width:480px">
<img src="{{ .SiteURL }}/email/otto-head.png" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 8px">Your Otto Sensei code is</p>
<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p style="margin:0 0 16px">It expires in 10 minutes.</p>
<p style="margin:0;color:#475850;font-size:14px">If you didn't ask for this, you can ignore this email.</p>
</div>
```

Click **Save** on each. The template must contain `{{ .Token }}` and no `{{ .ConfirmationURL }}`:
the app has no page for email links. `{{ .SiteURL }}` is the Site URL from step 7, so Otto's head
(`public/email/otto-head.png`, a PNG because email apps don't show SVG) loads from the live app.
Already pasted the older template? Paste this one again to add his head.

---

## 7. Where sign-in may send people back

Supabase dashboard → **Authentication** → **URL Configuration**:

1. **Site URL:** your live address, for example `https://otto-sensei.vercel.app`. **Save**.
2. **Redirect URLs** → **Add URL**, add both:
   - `https://otto-sensei.vercel.app/**` (your live address followed by `/**`)
   - `http://localhost:3000/**`

Google sign-in comes back to `/auth/callback?next=...`. An address that isn't on this list makes
Supabase send people to the Site URL instead, signed out.

> Google sign-in always returns to `NEXT_PUBLIC_APP_URL` (the live address), so on a preview
> deployment use the email code. It works everywhere.

---

## 7b. Faster page loads: asymmetric JWT signing keys

Every dashboard page checks the sign-in in `src/proxy.ts` with `getClaims()`. With the old shared
JWT secret that is a call to Supabase on every page; with an asymmetric signing key it is checked
on our own server against Supabase's public key, with no call. No code change is needed. API calls
still ask Supabase once each (`getUser()`), so a signed-out session stops at once.

Supabase dashboard → **Project Settings** → **JWT Keys** (JWT signing keys):

1. Click **Migrate JWT secret**. The old secret is imported and a new asymmetric key waits as
   standby. Nothing changes for anyone yet.
2. Click **Rotate keys**. New sign-ins and refreshes get tokens signed with the new key; tokens
   already handed out keep working until they expire, so nobody is signed out. The app never
   checks tokens against the old secret itself, and it has no Edge Functions.
3. Optional, at least 1 hour 15 minutes later: move the old secret to **Previously used**, then
   **Revoke** it. First check **Project Settings** → **API Keys**: the app must be on the
   **Publishable** and **Secret** keys (`sb_publishable_...`, `sb_secret_...`, see step 3). The old
   **anon** and **service_role** keys are signed with the old secret and stop working once it is
   revoked; turn them off there first and watch their "last used" time.

Changes on that page take about 5 minutes to settle.

---

## 8. Google sign-in

**8a. Google Cloud** (console.cloud.google.com)

1. Project picker (top left) → **New project** → name `Otto Sensei` → **Create**, then select it.
2. Search for **Google Auth Platform** and open it. Click **Get started** if asked.
3. **Branding:** App name `Otto Sensei`, your support email, App home page
   `https://otto-sensei.vercel.app`, Privacy policy `https://otto-sensei.vercel.app/privacy`,
   Terms of service `https://otto-sensei.vercel.app/terms`. **Authorized domains:** add your app's
   domain (for example `vercel.app` or `ottosensei.com`) and `supabase.co`. Developer contact: your
   email. **Save**.
4. **Audience:** User type **External**. Click **Publish app** so anyone can sign in (in "Testing"
   only listed test users can).
5. **Data Access** → **Add or remove scopes:** tick `.../auth/userinfo.email`,
   `.../auth/userinfo.profile` and `openid`. **Update**, then **Save**. These are basic scopes, so
   no Google review is needed.
6. **Clients** → **Create client**:
   - **Application type:** Web application. **Name:** `Otto Sensei web`.
   - **Authorized JavaScript origins:** `https://otto-sensei.vercel.app` and `http://localhost:3000`.
   - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`. Copy the
     exact value from Supabase: **Authentication** → **Sign In / Providers** → **Google** →
     **Callback URL (for OAuth)**.
   - **Create**. Copy the **Client ID** and **Client secret**.

**8b. Supabase** (**Authentication** → **Sign In / Providers** → **Google**)

1. Turn on **Enable Sign in with Google**.
2. **Client IDs:** paste the Client ID. **Client Secret (for OAuth):** paste the secret.
3. **Save**.

Someone who first used an email code and later uses Google with the same address lands in the
same account: Supabase links them because Google has verified the address.

---

## 8c. Connect GitHub (Import from GitHub, portfolio GitHub numbers)

People connect their own GitHub account before the app reads any GitHub work for them, so nobody
can import someone else's repos or show someone else's stars. Connecting uses Supabase identity
linking: the person signs in to GitHub once, and that GitHub account is added to their Otto
account. It is not a way to sign in to Otto.

**Until this is done** nothing breaks: "Import from GitHub" shows **Connect GitHub**, and pressing it
says "Connecting GitHub isn't set up yet. Please try again later." Portfolios show no GitHub
numbers. Everything else works as before.

**8c-1. GitHub OAuth App** (github.com → your avatar → **Settings** → **Developer settings** →
**OAuth Apps** → **New OAuth App**)

1. **Application name:** `Otto Sensei`.
2. **Homepage URL:** `https://www.ottosensei.com`
3. **Authorization callback URL:** `https://wuypdybfswifundtixmt.supabase.co/auth/v1/callback`
   (the same value Supabase shows under **Authentication** → **Sign In / Providers** → **GitHub** →
   **Callback URL**).
4. Leave **Enable Device Flow** off. Click **Register application**.
5. Copy the **Client ID**. Click **Generate a new client secret** and copy it now: GitHub shows it
   only once.

**8c-2. Supabase** (**Authentication** → **Sign In / Providers**)

1. Open **GitHub**: turn it on (**Enable Sign in with GitHub**), paste the **Client ID** and the
   **Client Secret**, **Save**.
2. In **User Signups**, turn on **Allow manual linking**, **Save**. (Off by default. In the
   Management API it is `security_manual_linking_enabled`.)
3. Open **Email** and check **Confirm email** is on. With it on, Supabase won't sign anyone in
   with a GitHub email address that GitHub hasn't verified (see "GitHub sign-in" below).

Nothing to add in Vercel, and step 7's **Redirect URLs** (`.../**`) already cover the way back
(`/auth/callback`, like Google).

**Check it:** sign in on the live site, open a resume's menu → **Import from GitHub** → **Connect
GitHub**, approve on GitHub. You come back to the same page, the dialog opens again and shows
"Connected as <your login>", then your repos.

- Otto only reads public repos and pull requests, through `GITHUB_TOKEN` (10d). It never posts to
  GitHub. Supabase asks GitHub for its default access only (profile and email addresses).
- One GitHub account belongs to one Otto account. Connecting it to a second shows "That GitHub
  account is already connected to another Otto Sensei account."
- **Not you? Disconnect** (in the dialog and on the portfolio's GitHub card) removes the link and
  takes the GitHub numbers off the portfolio page.
- Renamed your GitHub account? Disconnect and connect again: Supabase keeps the name from the
  moment it was linked.
- **GitHub sign-in.** The app never shows "Continue with GitHub", but once the provider is on,
  someone can start a GitHub sign-in by hand (Supabase's own sign-in address). The app treats it
  like any new sign-in: Supabase uses the email GitHub has verified, so the person lands in the
  existing account with that email, or gets a new free account connected to that GitHub. Such an
  account can't disconnect GitHub from the app, since GitHub is its only linked sign-in.
- **Local `bun dev`:** dev sign-in has no Supabase, so it can't link GitHub. Add
  `DEV_GITHUB_LOGIN=your-github-name` to `.env.local` and restart: every dev account counts as
  connected to it. Production ignores it.

---

## 9. AI: OpenRouter

1. openrouter.ai → **Credits** → add $10 to start.
2. openrouter.ai/keys → **Create Key** → name `otto-sensei`, **Credit limit** `$20` (the most this
   key can ever spend; raise it later). Copy the key.
3. Add it to Vercel:

   ```bash
   vercel env add OPENROUTER_API_KEY production
   vercel env add OPENROUTER_API_KEY development
   ```

`AI_MODEL` and `AI_STRUCTURE_MODEL` are optional; both default to `z-ai/glm-5.3-flash`. After
changing one, check quality and cost with `bun scripts/ai-smoke.ts` (a few cents).

---

## 10. Payments: Creem

Creem is the merchant of record: it runs checkout, charges the card, adds sales tax or VAT, sends
receipts and hosts the billing portal. The app only stores the plan its webhooks report.

**What's free and what's paid.** Free (no card, no time limit) has everything that costs no AI
call: uploads read by the basic reader, the recruiter view, editing, formats, PDF downloads, the
Jobs tab and its matching, and the application tracker. On AI it has only 3 line fixes a month
(summaries count as fixes; `PLANS.free.limits.fix`). Every other AI feature (more line fixes,
tailoring, letters, answers, interview prep, Build with Otto, GitHub drafts, AI reading of uploads)
and the portfolio need Pro or Max. New accounts start Pro with a **3-day trial, nothing charged,
card required**, then $15/month; one trial per person (by email, kept even after the account is
deleted). A trial has its own small allowance (`PRO_TRIAL` in `src/config/plans.ts`) and can build
a portfolio but not publish it until the first payment.

Work in **Test Mode** first (toggle at the bottom of Creem's left sidebar). Test and live are
separate: their own API key, webhook secret and products. Do every step below once in test mode,
and again in live mode when you switch.

**1. Create the 7 products.** **Products** → **Create product**, each one **Subscription**
(recurring), currency **USD**, tax category **SaaS**:

| # | Name | Price | Billing period | Trial | Variable |
|---|---|---|---|---|---|
| 1 | Pro | $15 | Monthly | none | `CREEM_PRO_MONTHLY_PRODUCT_ID` (required) |
| 2 | Pro (3-day free trial) | $15 | Monthly | **Trial period on, 3 days, Free** | `CREEM_PRO_TRIAL_PRODUCT_ID` |
| 3 | Pro yearly | $120 | Yearly | none | `CREEM_PRO_YEARLY_PRODUCT_ID` |
| 4 | Pro weekly | $6 | Custom: every 1 week | none | `CREEM_PRO_WEEKLY_PRODUCT_ID` |
| 5 | Max | $29 | Monthly | none | `CREEM_MAX_MONTHLY_PRODUCT_ID` |
| 6 | Max yearly | $232 | Yearly | none | `CREEM_MAX_YEARLY_PRODUCT_ID` |
| 7 | Max weekly | $12 | Custom: every 1 week | none | `CREEM_MAX_WEEKLY_PRODUCT_ID` |

- Product 2 is the one new accounts check out on: **Trial period** on, length **3** days, type
  **Free** (no trial price). Creem saves the card at checkout and charges $15 when the 3 days end,
  unless the person cancels first. Everyone who has trialed or paid before is sent to product 1
  instead, so the trial is once per person. Without product 2 there is simply no trial.
- Weekly: in the API this is `billing_period: "custom"`, `recurring_interval: "week"`,
  `recurring_interval_count: 1`.
- Copy each product id (`prod_...`) from its page. Each option shows on the pricing page, the
  upgrade dialog and the account page only while its id is set (Pro monthly is required; Max needs
  at least one of its three). The webhook maps each id to its plan and billing period, which sets
  the allowance (weekly products get the weekly limits), so every variable must hold a product with
  exactly that period, and no two variables the same id.
- The app shows `PRICES_USD` from `src/config/plans.ts`; Creem charges what the product says.
  Change both together, then redeploy (the pricing page is built with them).
- **Settings** → billing: set the default cancellation to **at the end of the billing period**, so
  someone who cancels keeps what they paid for (the terms say so). The app itself cancels right
  away only when an account is deleted.

**2. API key.** **Developers** → **API keys** → copy the key → `CREEM_API_KEY`.

**3. Webhook.** **Developers** → **Webhooks** → add an endpoint:

- URL: `https://otto-sensei.vercel.app/api/billing/webhook` (your domain, if you have one).
- Events: `checkout.completed`, `subscription.active`, `subscription.trialing`,
  `subscription.paid`, `subscription.update`, `subscription.scheduled_cancel`,
  `subscription.past_due`, `subscription.unpaid`, `subscription.paused`, `subscription.canceled`,
  `subscription.expired`. (Others are answered 200 and ignored.)
- Copy the signing secret → `CREEM_WEBHOOK_SECRET`. Every delivery is checked against it (the
  `creem-signature` header, an HMAC-SHA256 of the body); a wrong one gets 401.

**4. Put them into Vercel.**

```bash
vercel env add CREEM_API_KEY production
vercel env add CREEM_WEBHOOK_SECRET production
vercel env add CREEM_TEST_MODE production              # true now (test-api.creem.io); false with live keys
vercel env add CREEM_PRO_MONTHLY_PRODUCT_ID production
vercel env add CREEM_PRO_TRIAL_PRODUCT_ID production
vercel env add CREEM_PRO_YEARLY_PRODUCT_ID production
vercel env add CREEM_PRO_WEEKLY_PRODUCT_ID production
vercel env add CREEM_MAX_MONTHLY_PRODUCT_ID production
vercel env add CREEM_MAX_YEARLY_PRODUCT_ID production
vercel env add CREEM_MAX_WEEKLY_PRODUCT_ID production
```

Checkout turns on only when the key, the webhook secret and Pro monthly are all set. Until then
production shows "email us". `CREEM_TEST_MODE` defaults to `true`: a missing value can never take
real money. Going live: live key, live webhook secret, live product ids, `CREEM_TEST_MODE=false`,
redeploy.

**5. Test it** (test mode, card `4111 1111 1111 1111`, any future date and CVC):

- A new account → **Try Pro for 3 days** → checkout says nothing is due today. Back on the
  account page it shows "Pro trial until <date>" within a few seconds (`subscription.trialing`).
- Cancel it from **Manage billing**: the account drops to Free. Checking out again now shows the
  normal $15/month, no trial.
- Pro to Max: the subscription moves in place (`POST /v1/subscriptions/{id}/upgrade`, prorated and
  charged right away), so nobody is billed twice.

**Mock billing.** In `bun dev` with no Creem key every option is offered and nothing is charged:
a new account's first Pro monthly checkout starts a local 3-day trial, anything else switches the
plan at once, and **Manage billing** switches back to Free.

**Feedback and invites need no setup.** "Send feedback" notes land in the `feedback` table: read
them in Supabase → **Table Editor** → `feedback` (newest first by `created_at`). Invite links work
as soon as the `20261108000200_feedback_referrals.sql` migration has run (step 5).

---

## Optional services at a glance

Everything below step 10 is optional. Leave a variable out and that one feature switches off
quietly; the rest of the app runs the same.

| Variable | Turns on | Step |
|---|---|---|
| `CREEM_PRO_TRIAL_PRODUCT_ID` | The free 3-day Pro trial for new accounts | 10 |
| `CREEM_PRO_YEARLY_PRODUCT_ID`, `CREEM_PRO_WEEKLY_PRODUCT_ID` | Yearly ($120) and weekly ($6) Pro | 10 |
| `CREEM_MAX_MONTHLY_PRODUCT_ID`, `_MAX_YEARLY_`, `_MAX_WEEKLY_PRODUCT_ID` | The Max plan ($29/month, $232/year, $12/week) | 10 |
| `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) | Error reports (+ readable stack traces) | 10b |
| `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST` for EU) | Funnel events | 10c |
| `GITHUB_TOKEN` | Higher GitHub limits for Import from GitHub and portfolio GitHub numbers | 10d |
| `CRON_SECRET` | Daily cleanup, follow-up reminders (bell), and clearing /jobs after the daily job read (also a GitHub secret) | 10e |
| `RESEND_API_KEY`, `EMAIL_FROM` | Reminder emails (needs `CRON_SECRET`) | 10e |

---

## 10b. Error reports: Sentry (optional)

Skip this and the app runs the same, it just doesn't report crashes anywhere.

1. sentry.io → **Create project** → platform **Next.js** → name `otto-sensei`. Copy the **DSN**
   (`https://...@o123.ingest.sentry.io/456`).
2. **Project Settings** → **Security & Privacy**: turn on **Prevent Storing of IP Addresses** and
   **Data Scrubber**. The app already removes emails, phone numbers, resume text, request bodies,
   cookies and sign-in headers before anything is sent (`src/lib/observability/scrub.ts`); this
   is the second lock.
3. Readable stack traces (optional): **Settings** → **Auth Tokens** → **Create New Token** (scope
   `project:releases`). Note your organization slug and the project slug.

```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production   # the DSN from 1 (it's safe in the browser)
vercel env add SENTRY_AUTH_TOKEN production         # optional, from 3: uploads source maps
vercel env add SENTRY_ORG production                # optional, with the token
vercel env add SENTRY_PROJECT production            # optional, with the token: otto-sensei
```

- Errors only: no performance tracing, no session replay. Each release is the Git commit.
- `bun dev` sends nothing, even with a DSN in `.env.local`. To test reporting on your laptop, add
  `NEXT_PUBLIC_SENTRY_DEV=1` too.
- Landing and policy pages don't load Sentry until the visitor moves into the app.

---

## 10c. Product analytics: PostHog (optional)

Skip this and the app runs the same, it just doesn't count funnel steps anywhere.

1. posthog.com → create a project (US or EU cloud). Copy the **Project API key** (`phc_...`).
2. **Project settings** → turn on **Discard client IP data**. The app already sends only named
   events with counts and flags (never resume text, job posts, names or emails), strips query
   strings and share links from URLs, and skips anyone whose browser sends Do Not Track or Global
   Privacy Control (`src/lib/analytics/`); this is the second lock.

```bash
vercel env add NEXT_PUBLIC_POSTHOG_KEY production    # the project key (safe in the browser)
vercel env add NEXT_PUBLIC_POSTHOG_HOST production   # only for EU: https://eu.i.posthog.com
```

- No autocapture, no page views, no session recording, no surveys, no cookies: a random id in
  local storage until sign-in, then the user id (never the email).
- Funnel: `landing_viewed` → `resume_imported` → `recruiter_view_seen` → `signed_in` →
  `line_fixed` → `tailor_run` → `screener_viewed` → `letter_written` → `pdf_downloaded` /
  `docx_downloaded` → `upgrade_clicked` → `checkout_completed`, plus `application_logged`.
  From the server: `signed_up`, `checkout_completed`, `line_fixed`, `tailor_run`,
  `letter_written`, `application_logged` and `ai_call` (task, model, latency, outcome).
- `bun dev` sends events when the key is in `.env.local`; leave it out locally unless you're
  testing analytics.

---

## 10d. GitHub import: a read-only token (optional)

"Import from GitHub" (a resume card's menu) reads the public repos and merged pull requests of the
GitHub account the person connected (step 8c), with this server's own token, not theirs. Without a
token GitHub allows the whole server 60 calls an hour (a lookup uses 2, a draft up to 10, repeats
within 10 minutes are free), so add one before launch:

1. github.com → **Settings** → **Developer settings** → **Fine-grained tokens** → **Generate new
   token**. Repository access: **Public repositories (read-only)**. No other permissions.
2. Set an expiry date and a reminder to renew it; when it lapses the import falls back to the
   60-call limit instead of breaking.

```bash
vercel env add GITHUB_TOKEN production
```

- The server only ever calls `api.github.com`, at most 10 times per request, with a 10-minute cache.
- Portfolios show the GitHub numbers (stars, repos, languages, recent activity) of the owner's
  connected GitHub account only (step 8c), with 3 calls, refreshed at most every 6 hours per page
  and stored with it, so page views never call GitHub. Numbers stored before connecting existed are
  never shown again.
- Each device can look up 20 names an hour and draft 12 times a day (60 and 40 per network).
- Drafting sends the picked repos' README and pull request text to OpenRouter, with the name on
  the resume and every email, phone and link swapped for placeholders. Nothing is added until the
  person confirms.

---

## 10e. Scheduled jobs and reminder emails (optional)

```
Vercel Cron    → /api/cron/cleanup     04:17 UTC daily → old rate-limit windows, tombstones, notifications
               → /api/cron/follow-ups  14:00 UTC daily → bell notification (+ email) per account
GitHub Actions → POST /api/cron/jobs, 05:40 UTC daily, called until every board and feed is read
                 (scripts/jobs-ingest-ci.ts does the same in one run, given a database URL)
```

The two Vercel schedules are in `vercel.json`. They only run on the production deployment, and only
once `CRON_SECRET` is set: without it every call answers 401 and nothing happens.

The daily job read runs in GitHub Actions (`.github/workflows/jobs-ingest.yml`) because a Vercel run
stops at 4 minutes, about half the boards; Actions reads all of them in one run (about 10-20
minutes, a few hundred of the free Actions minutes a month). In GitHub → the repo → **Settings** →
**Secrets and variables** → **Actions**, add:

- Secret `CRON_SECRET`: the same value as on Vercel. The workflow calls `POST /api/cron/jobs` up to 8 times
  (each call reads boards for up to 4 minutes and resumes where the last stopped), so no database
  password is stored in GitHub. Vercel hides sensitive values once saved, so make a new one if you
  don't have it: `openssl rand -hex 32`, set it on Vercel and here, then redeploy.
- Variable `OTTO_APP_URL`: the site's address, e.g. `https://ottosensei.com`.

Then **Actions** → **Daily jobs** → **Run workflow** fills the jobs the first time, without waiting
for 05:40 UTC. `POST /api/cron/jobs` (Bearer `CRON_SECRET`) still runs a 4-minute read on Vercel by hand.

1. Make a secret and add it (Vercel sends it to the jobs as `Authorization: Bearer <secret>`):

   ```bash
   openssl rand -hex 32
   vercel env add CRON_SECRET production
   ```

2. Reminder emails (optional; without them reminders stay in the dashboard bell). In Resend, the
   domain from step 6a is already verified: **API Keys** → **Create API Key** → name
   `otto-reminders`, permission **Sending access**. Then:

   ```bash
   vercel env add RESEND_API_KEY production
   vercel env add EMAIL_FROM production   # Otto Sensei <otto@yourdomain.com>
   ```

3. Redeploy (`vercel --prod`). Vercel → project → **Settings** → **Cron Jobs** lists all three
   jobs, with **Run** buttons and their logs.

- Marking a job applied sets its follow-up date by itself: 7 days after it was sent (each account
  can pick another number on the Account page), never sooner than a day after it was logged. When
  the date comes, the job adds one bell note. Each account gets at most one notification and one
  email per run, covering all its newly due applications. Snooze moves the date 3 days on; Done or
  any other status clears it.
- Reminder emails are opt-in: nobody gets one until they turn **Email me too** on in **Reminders**
  on the Account page. Each email has one-click **Done** and **Snooze 3 days** per application and
  a one-click **Unsubscribe**, all signed with `CRON_SECRET` (a new secret retires old links), plus
  the mail app's own one-click unsubscribe header. The bell keeps working either way.
- Cleanup and follow-ups stop after about 45 seconds and pick up the rest the next day. Running one
  twice does no harm. Run one by hand with
  `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/cleanup`.
- **Jobs** (`/api/cron/jobs`) needs no keys or new variables: every source is a public API
  (JOB-SOURCES.md). It runs up to 300 seconds (`maxDuration`), which Vercel allows on every plan with
  Fluid compute, the default for new projects (**Settings** → **Functions**). With a shorter limit it
  still works: it saves board by board, and the next run starts with the boards it didn't reach.
  The first run fills the table (about 15,000-20,000 jobs over a day or two; the table is capped at
  20,000 rows, roughly 100 MB). Its migration, `20261108001000_jobs.sql`, is applied by the deploy's
  build command like every other one. A run that answers 500 names the feed that failed (Himalayas
  or Remote OK); company boards that fail are only counted (`boardsFailed`) and retried tomorrow.
- **Portfolios** (`/p/<slug>`) need no keys, crons, storage or new variables. They are text only
  (owner decision 2026-11-10): no uploads and no pictures, so no Supabase Storage bucket. Their
  migrations, `20261108002000_portfolios.sql`, `20261108003000_portfolio_templates.sql` (round-1
  templates; its project-pictures column is unused now) and
  `20261108006000_reference_templates.sql` (the eight reference templates; moves pages
  margin→dock, broadsheet→paper, ledger→cv, showcase→folio, shell→bento, signal→navy; new pages
  start on navy), are applied by the deploy's build command like every other one; locally, restart
  `bun dev` once so `.pglite/` picks them up. The templates' fonts are self-hosted by next/font,
  fetched from Google Fonts once at build time.
- Cleanup keeps: rate-limit windows 2 days, deleted-resume markers 180 days, read notifications
  90 days (unread ones a year), billing webhook ids 400 days.

---

## 11. Deploy

```bash
vercel --prod
```

Added or changed an environment variable later? Run `vercel --prod` again: a deployment only sees
the values that existed when it was built.

**Custom domain** (optional): `vercel domains add ottosensei.com`, follow the DNS instructions, then
update the same address everywhere it was typed: `NEXT_PUBLIC_APP_URL` in Vercel, **Site URL** and
**Redirect URLs** in Supabase (step 7), **Authorized JavaScript origins** in Google (step 8a), and
the Creem webhook URL (step 10). Redeploy.

---

## 12. Final checklist

- [ ] `https://<your-domain>/api/health` shows `{"ok":true,"db":"up"}`.
- [ ] `bun scripts/migrate.ts --status` says every file is `applied`.
- [ ] Sign in with an email code: the email arrives from your domain, within a minute, with a
      6-digit code, and the code signs you in.
- [ ] Sign out, then **Continue with Google**: you come back signed in, to the same account.
- [ ] **Import from GitHub** → **Connect GitHub**: you come back to the same page, connected as
      your GitHub name (step 8c).
- [ ] Fix one line with Otto (proves OpenRouter and the usage counter).
- [ ] Run a test-mode trial checkout; the account shows the Pro trial and its end date within a
      few seconds (proves the webhook). A second checkout from the same email shows $15, no trial.
- [ ] Delete that test account from the account page; it disappears from Supabase
      **Authentication** → **Users**, and its Creem test subscription shows canceled.
- [ ] Supabase **Project Settings** → **API Keys**: the secret key exists only in Vercel and your
      `.env.local`.
- [ ] Vercel **Settings** → **Cron Jobs**: press **Run** on all three jobs; each log line ends in
      `cron.<job>.done` (not `cron.unauthorized`, which means `CRON_SECRET` is missing). After the
      jobs run, `/jobs` lists openings and `/dashboard/jobs` ranks them for your resume.
- [ ] Share a resume from its card menu and open the link in a private window: the page loads,
      and **Download PDF** works.
- [ ] On a Pro test account, write a pitch in **Portfolio** → **Intro**: it shows in the preview,
      and the page has no pictures to upload anywhere.
- [ ] If PostHog is set: upload a resume; PostHog **Activity** shows `resume_imported` within a
      minute.

Delete accounts from the app's account page, not from the Supabase dashboard. Both remove the
user's data, but only the app cancels their subscription first.

---

## Alternative: Supabase through the Vercel Marketplace

If you'd rather let Vercel create and bill the Supabase project:

```bash
vercel integration add supabase
```

Pick region **US East** and a plan, and connect it to the `otto-sensei` project. Vercel then sets
the variables itself (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `..._ANON_KEY`, `SUPABASE_SECRET_KEY` or
`SUPABASE_SERVICE_ROLE_KEY`, and a few the app doesn't use). The app reads those names as they are.

So skip steps 2 to 4 (still add `NEXT_PUBLIC_APP_URL`), run step 5 (`vercel env pull`, then
`bun scripts/migrate.ts`, which uses `POSTGRES_URL_NON_POOLING`), and continue from step 6. To open
the Supabase dashboard: Vercel project → **Storage** → your database → **Open in Supabase**.

---

## When something doesn't work

| What you see | What it means |
|---|---|
| "Sign-in isn't set up yet" | That deployment has no `NEXT_PUBLIC_SUPABASE_URL` or publishable key. Add them and redeploy. (Never in `bun dev`: it signs in with on-screen codes.) |
| `bun dev` won't start the database, or acts strangely after a crash | Stop `bun dev`, delete the `.pglite/` folder, start again. |
| "We couldn't send the email" | Supabase couldn't mail the code: custom SMTP is off or wrong (step 6b), or the Resend domain isn't verified. Supabase → **Logs** → **Auth** shows the reason. |
| The email has a link, not a code | The template still uses `{{ .ConfirmationURL }}` (step 6e). Fix both templates. |
| Google sends you to the home page, signed out | The return address isn't in **Redirect URLs** (step 7). |
| Google says `redirect_uri_mismatch` | The Google client's redirect URI isn't exactly the Supabase callback URL (step 8a.6). |
| "Connecting GitHub isn't set up yet" | The GitHub provider or **Allow manual linking** is off in Supabase (step 8c-2). |
| GitHub says "The redirect_uri is not associated with this application" | The OAuth App's callback URL isn't exactly the Supabase callback URL (step 8c-1.3). |
| "GitHub didn't connect" after approving | Supabase couldn't finish the link. Supabase → **Logs** → **Auth** shows why. |
| "Account deletion isn't available right now" | `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) is missing in Vercel. |
| `/api/health` answers 503 | `DATABASE_URL` is missing or wrong, or the project is paused. |
| `migrate.ts`: `password authentication failed` | Wrong password in the URL, or special characters not URL-encoded. |
| `migrate.ts`: `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | That's the IPv6-only direct URL. Use the **Session pooler** string (step 3). |
