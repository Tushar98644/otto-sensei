# Setup: put Otto Sensei online

Step by step, from nothing to a live app. Do the steps in order. About an hour, most of it waiting
for DNS and Google.

You will end up with:

```
Browser → Vercel (app, US East iad1) → Supabase (database + sign-in, US East)
                                     → Resend (sign-in emails, through Supabase)
                                     → Google (sign-in), OpenRouter (AI), Dodo Payments (payments)
```

What you need: accounts at vercel.com, supabase.com, resend.com (plus a domain you can add DNS
records to), console.cloud.google.com, openrouter.ai and dodopayments.com (test mode first; the same
account goes live once Dodo verifies it). On your laptop: `bun` and the Vercel CLI
(`bun add -g vercel`).

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
> after `next build` succeeds, using the database URL the Supabase integration put in Vercel. Preview
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

## 10. Payments: Dodo Payments

Dodo Payments is the merchant of record (our online reseller): it runs the checkout page, charges
the card, adds sales tax or VAT, sends receipts and invoices, and hosts the customer portal.
Checkout is Dodo's own hosted page: the app asks Dodo for a checkout link and sends the buyer
there, so no payment script ever runs on our site. Dodo sends the buyer back to
`/api/billing/return`, which drops the email and ids Dodo adds to the address and opens
`/account?checkout=success` (or `checkout=cancelled`). The app only stores the plan its webhooks
report.

**What's free and what's paid.** Free (no card, no time limit) has everything that costs no AI
call: uploads read by the basic reader, the recruiter view, editing, formats, PDF downloads, the
Jobs tab and its matching, and the application tracker. On AI it has only 3 line fixes a month
(summaries count as fixes; `PLANS.free.limits.fix`). Every other AI feature (more line fixes,
tailoring, letters, answers, interview prep, Build with Otto, GitHub drafts, AI reading of uploads)
and the portfolio need Pro or Max. New accounts start Pro with a **3-day trial for $1 (charged at
checkout), card required**, then $15/month; one trial per person (by email, kept even after the
account is deleted). A trial has its own small allowance (`PRO_TRIAL` in `src/config/plans.ts`).
Plans are monthly or yearly; there are no weekly plans.

**Test mode first.** One Dodo account has two modes, **test** and **live**, switched with the
**Live Mode** toggle in the dashboard sidebar. Products, API keys and webhook endpoints belong to
one mode (a product copied to live gets a new id). Test keys (`dodo_test_...`) only work on
`test.dodopayments.com`, live keys (`dodo_live_...`) only on `live.dodopayments.com`. The business
profile, bank account and verification are shared. Do steps 1 to 11 in test mode; step 12 goes
live.

**1. Account.** Sign up at dodopayments.com and pick the account type that matches you:
**Individual** (an Indian individual must give a PAN) or **Registered Entity** (a sole proprietor
with a GSTIN registers as one). The payout bank account's holder must match it. Then set the brand:
**Settings** → **Business** → **Brands** → the brand's **...** → **Edit**: brand name `Otto Sensei`,
support email `hello@ottosensei.com`, the logo. In the business profile set the statement
descriptor, for example `DODOPAY_OTTOSENSEI` (Dodo's default is `DODOPAY_` plus up to 14 letters of
the business name; the pricing page tells buyers their statement starts with `DODOPAY`).

**2. Dashboard settings.** Dodo keeps these in the dashboard only, so no test or script can check
them. Walk this list in test mode now and again in live mode (step 12); `scripts/dodo-setup.ts`
prints the same list.

| Where | Setting | Why |
|---|---|---|
| **Settings** → **Pricing** | **Adaptive Currency** off | Buyers pay the USD price plus tax, as the pricing page says, with no 2-4% currency fee on top. |
| **Settings** → **Subscriptions** (customer portal) | **Allow Cancellation at Next Billing Date** on. **Allow Immediate Cancellation**, **Allow Subscription Updates** and **Allow Subscription Pause** off | The terms promise the plan lasts to the end of the paid period. Plan changes happen in the app, and the app can't resume a pause. |
| **Settings** → **Subscriptions** | **Allow Multiple Subscriptions** off | A second subscription fails with `CUSTOMER_HAS_EXISTING_SUBSCRIPTION` instead of charging twice. Checkout links can't be cancelled and stay payable for 24 hours. |
| **Settings** → **Subscriptions** | **Subscription Grace Period** on, **3 days**, ending in **on hold**; **Payment Retries** on | A failed renewal keeps the plan for 3 days (`past_due`) while Dodo retries. After that the subscription is on hold and the account is on Free until the card is fixed. |
| **Settings** → **Subscriptions** | **Prevent Trial Misuse** off | The app alone decides who gets the trial (one per person, by email). Dodo's check also strips plus-aliases, so it could charge $15 to someone the app offered $1. |
| **Settings** → **Communication** → **Email** → **Customer Emails** | **Subscription Trial Ending** off. Keep Payment Succeeded, Subscription Plan Changed, Refund Successful, Subscription Cancelled, Subscription Set to Cancel and Upcoming Renewal Reminder on | For a trial under 7 days Dodo sends "trial ending" the moment the trial starts. The app sends its own reminder 12 to 36 hours before the end (step 10e). |
| Disputes | **Visa RDR** on (the default, $100 threshold) | Visa disputes of $100 or less (every price we have) are refunded automatically: an $18 fee instead of a $30 chargeback, and the chargeback rate stays under the 0.5% at which Dodo can end the account. They arrive as `dispute.lost` with `is_resolved_by_rdr`, which the app logs. |

Payment Failed and Subscription Renewal Failed emails are off by default. Turning them on tells
buyers to fix their card during the grace days; that is the owner's call.

**3. API keys.** **Developer** → **API Keys** → **Create New Key**, in the mode you are in. Each key
gets None, Read or Write per resource. Copy it at once: Dodo shows it only once. Leave the IP
allowlist empty: Vercel's outgoing addresses change.

- `otto-sensei-setup`: **Write** on Products and Webhooks. Only for `scripts/dodo-setup.ts` on your
  laptop (step 4); never put it in Vercel.
- `otto-sensei`, the app's key (`DODO_API_KEY`), with only these:

| Resource | Access | Used for |
|---|---|---|
| Checkout Sessions | Write | Creating each checkout link |
| Subscriptions | Write | Finding live subscriptions, plan changes, cancelling on account deletion and for a refused second trial |
| Refunds | Write | Refunding the $1 of a refused second trial, and the charges of a subscription paid for an account already deleted |
| Customers | Read | The same-email lookup and the **Manage billing** portal link |
| Payments | Read | Finding the payments to refund: a refused trial's $1, or a deleted account's charges; the account page's billing history and invoice PDFs (`GET /invoices/payments/{id}`) |
| Products | Read | The catalog check (step 8) |
| Disputes | Read | Reading disputes; the app only logs dispute webhooks today |

The portal link is a POST under Customers. If **Manage billing** says "payments aren't set up right
on our side" (Dodo answered `INSUFFICIENT_PERMISSION`), give Customers **Write** too.

**4. Products and webhook: the setup script.** Put the setup key in a local file (git ignores every
`.env*` file except `.env.example`, and `vercel --prod` leaves it out):

```bash
# .env.dodo.local
DODO_ENVIRONMENT=test
DODO_SETUP_API_KEY=dodo_test_...
# DODO_SETUP_APP_URL=https://www.ottosensei.com   (the default; it must be https)
```

Then run `bun --env-file=.env.dodo.local scripts/dodo-setup.ts`. It:

- refuses a key that isn't `dodo_test_...` or `dodo_live_...`, a key from the other mode than
  `DODO_ENVIRONMENT`, and an app address that isn't https;
- finds our five products by their `otto_plan`, `otto_interval` and `otto_trial` metadata, creates
  any that is missing, and updates one that drifted from the spec (the id stays; existing
  subscriptions keep their old price);
- creates the webhook endpoint `<app address>/api/billing/webhook` (or turns it back on, or fixes
  its event list), reads its secret and checks that it starts with `whsec_`;
- writes `DODO_ENVIRONMENT`, the five `DODO_*_PRODUCT_ID` values and `DODO_WEBHOOK_SECRET` into the
  same file (mode 600), each as soon as it is known, and prints ids only, never a key or a secret;
- prints the dashboard checklist (step 2) and the next steps.

Running it again finds everything instead of making it twice. Exit code 2 means a product still
doesn't match after the update: read its `warning` lines. For live (step 12) use
`.env.dodo.live.local` with `DODO_ENVIRONMENT=live` and a live setup key, so the test values stay
usable.

The products, all in USD with tax added on top (not tax-inclusive), tax category SaaS, no
purchasing-power pricing, discounts or add-ons, and a 20-year subscription period (Dodo ends a
subscription when its period runs out, so it gets the longest one):

| Variable | Product | Price | Bills every | Trial |
|---|---|---|---|---|
| `DODO_PRO_MONTHLY_PRODUCT_ID` (required) | Otto Sensei Pro (monthly) | $15.00 | 1 month | none |
| `DODO_PRO_TRIAL_PRODUCT_ID` | Otto Sensei Pro (monthly, 3-day trial) | $15.00 | 1 month | **3 days, $1.00 charged at checkout** (`trial_amount` 100) |
| `DODO_PRO_YEARLY_PRODUCT_ID` | Otto Sensei Pro (yearly) | $120.00 | 1 year | none |
| `DODO_MAX_MONTHLY_PRODUCT_ID` | Otto Sensei Max (monthly) | $29.00 | 1 month | none |
| `DODO_MAX_YEARLY_PRODUCT_ID` | Otto Sensei Max (yearly) | $232.00 | 1 year | none |

- The trial product is the one new accounts check out on. A paid trial always needs a card: Dodo
  charges $1 plus tax at checkout and $15 when the 3 days end, unless the person cancels first.
  Everyone who has trialed or paid before gets Pro monthly instead, so the trial is once per
  person. Without the trial product there is simply no trial.
- Dodo sets a paid trial on a product, not per checkout, which is why the trial is its own product.
  The app never sends `trial_period_days` with a checkout: that would override the product's trial.
- Each option shows on the pricing page, the upgrade dialog and the account page only while its id
  is set (Pro monthly is required; Max needs at least one of its two). The webhook maps each product
  id to its plan and billing period, which sets the allowance, so no two variables may hold the
  same id. Don't create weekly products.
- The app shows `PRICES_USD` from `src/config/plans.ts`; Dodo charges what the product says. Change
  both together: edit `plans.ts`, run the setup script again (it updates the products in place),
  then redeploy.
- Cancelling needs no code: the portal cancels at the next billing date (step 2), so someone who
  cancels keeps what they paid for. The app itself cancels at once only when an account is deleted
  or a second trial is refused.

**Prepaid credit (off until the owner turns it on).** The script also makes `Otto Sensei credit
($1)`: a one-time $1.00 product in USD, tax on top, tax category SaaS, pay what you want off, tagged
`otto_topup`, and writes its id as `DODO_TOPUP_PRODUCT_ID`. Credit stays hidden everywhere (account
page, limit dialogs, pricing, FAQ) until that variable is in Vercel; leave it out until the owner
says yes.

- A paid Pro or Max plan past its trial adds credit in whole dollars, from `TOPUP_LIMITS.minUsd`
  ($5) to $100 at a time, up to a $300 balance (`src/config/topup.ts`). The checkout buys the $1
  product with **quantity = dollars**, so the amount is set on our server and the payment's
  `product_cart` shows it. Before Dodo hears of the checkout, the app stores its own record
  (`billing_log` kind `topup_checkout`: the account and the cents) and signs that record's id into
  the metadata (`topup_id`, `topup_sig`).
- `payment.succeeded` credits the record's cents once per payment id, and only when the product,
  the quantity, the signed record, the signed account, the checkout session and (in USD) the pre-tax
  total all match it. Anything else is logged as `billing.topup_mismatch` and not credited: refund
  it from the dashboard. Subscription payments never reach this path.
- `refund.succeeded` takes the refund's share of the credit back (a partial refund by its share of
  the total charged), and `dispute.lost` or `dispute.accepted` takes all of it, never below a zero
  balance; each is logged as `billing.topup_taken_back`. No new webhook events or key permissions
  are needed.
- Prices per action come from Pro: $1 buys what a fifteenth of Pro buys in that feature (today 10¢
  a tailored version or letter, 2¢ a line fix, 15¢ an AI resume read, 30¢ a Build with Otto or
  GitHub draft). They follow `PLANS.pro` by themselves, so nothing in Dodo changes with them.

**5. The webhook endpoint** (made by step 4; **Developer** → **Webhooks** shows it):

- URL `https://<your app>/api/billing/webhook`, with exactly these 23 events: the 12
  `subscription.*` events (`active`, `renewed`, `updated`, `plan_changed`, `past_due`, `on_hold`,
  `paused`, `unpaused`, `cancelled`, `expired`, `failed`, `update_payment_method`),
  `payment.succeeded`, `payment.failed`, `refund.succeeded`, `refund.failed`, and the 7 `dispute.*`
  events (`opened`, `challenged`, `accepted`, `cancelled`, `expired`, `won`, `lost`). Others are
  answered 200 and ignored. Never leave the list empty: an endpoint with no events picked receives
  every event.
- Its signing secret (`whsec_...`, on the endpoint's **Overview** tab) is `DODO_WEBHOOK_SECRET`.
  Deliveries follow Standard Webhooks: `webhook-signature` is an HMAC-SHA256 of the `webhook-id`,
  the `webhook-timestamp` and the body. A wrong signature, or one more than 5 minutes off, gets
  401. A `webhook-id` already applied gets 200 `duplicate`.
- Dodo retries any answer that isn't 2xx, up to 8 times over about 27 hours. The endpoint's
  **Logs** show each message and our answer, and can replay it.
- Don't delete and recreate the endpoint: a new one has a new secret. To change the secret, use
  **Rotate secret** (the old one keeps working for 24 hours), then put the new one in Vercel and
  redeploy within that day.
- Dodo's sending addresses change, so there is no IP allowlist: the signature is the only check.
- Test and live each have their own endpoint and secret.
- If the endpoint exists before the Dodo build runs in production, disable it in **Developer** →
  **Webhooks** until the cutover (step 10): the old build turns every delivery away, and Dodo keeps
  retrying. Running the setup script again turns it back on.

**6. The signing secret.** Make one with `openssl rand -hex 32` → `BILLING_SIGNING_SECRET`. The app
puts the account id in each checkout's metadata (`user_id`) with an HMAC of it made with this secret
(`user_sig`), and trusts an account id from a webhook only with that signature: anyone could
otherwise build a Dodo payment link carrying someone else's id. Production keeps one value for test
and live; your laptop gets its own (step 9). Changing it only drops the signature from later events of existing subscriptions, which still match
by their subscription id.

**7. Put them into Vercel** (production only: leave billing unset on preview deployments, since Dodo
reviews every new domain a checkout returns to):

```bash
vercel env add DODO_ENVIRONMENT production              # test now; live in step 12
vercel env add DODO_API_KEY production                  # the otto-sensei key, not the setup key
vercel env add DODO_WEBHOOK_SECRET production
vercel env add BILLING_SIGNING_SECRET production
vercel env add DODO_PRO_MONTHLY_PRODUCT_ID production
vercel env add DODO_PRO_TRIAL_PRODUCT_ID production
vercel env add DODO_PRO_YEARLY_PRODUCT_ID production
vercel env add DODO_MAX_MONTHLY_PRODUCT_ID production
vercel env add DODO_MAX_YEARLY_PRODUCT_ID production
```

| Variable | Value |
|---|---|
| `DODO_ENVIRONMENT` | `test` or `live`. Only `live` (or `live_mode`, `production`) uses Dodo's live API; anything else, or nothing, is test mode, so a typo never takes real money |
| `DODO_API_KEY` | The `otto-sensei` key (step 3): `dodo_test_...` or `dodo_live_...`, matching `DODO_ENVIRONMENT` |
| `DODO_WEBHOOK_SECRET` | The endpoint's `whsec_...` secret (step 5) |
| `BILLING_SIGNING_SECRET` | Step 6 |
| `DODO_PRO_MONTHLY_PRODUCT_ID` and the other four | The `pdt_...` ids the setup script wrote (step 4); test and live ids differ |
| `DODO_TOPUP_PRODUCT_ID` | Optional: the credit product's id (step 4). Set it only once the owner wants credit on sale |

They take effect with the next deploy (step 10). Billing turns on (`/api/me` answers
`billing.mode: "dodo"`) only when `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `BILLING_SIGNING_SECRET`
and `DODO_PRO_MONTHLY_PRODUCT_ID` are all set and the key's prefix matches `DODO_ENVIRONMENT`.
Until then production shows "email us". A key from the other mode keeps billing off and logs
`billing.key_environment_mismatch`. `NEXT_PUBLIC_APP_URL` builds the return and cancel addresses,
so it must be the domain Dodo approved. Changed a value? Redeploy: the pricing page is built with
the product ids.

**8. Check the catalog** (it only reads). Add the app key and the signing secret to the same file,
the values you gave Vercel:

```bash
# also in .env.dodo.local
DODO_API_KEY=dodo_test_...
BILLING_SIGNING_SECRET=...
```

Run `bun --env-file=.env.dodo.local scripts/check-dodo-catalog.ts`. It sends only GETs and checks:

- the key is from the mode `DODO_ENVIRONMENT` names, the webhook secret is `whsec_` plus base64,
  and the signing secret has at least 32 characters;
- Pro monthly is set, at least one Max id is set, no id is used twice, and every id is a Dodo
  product id (`pdt_...`), not a leftover Paddle `pri_...`;
- each product is active and recurring, in USD, priced at `PRICES_USD`, billed every 1 month or 1
  year as its variable says, runs 20 years, has tax added on top and tax category SaaS, has no
  purchasing-power or localized pricing, discounts or add-ons, and is named for its plan; only the
  trial product has a trial (3 days, $1, card required);
- the app address has exactly one webhook endpoint, it is on, it gets every event the app needs,
  and its secret equals `DODO_WEBHOOK_SECRET`.

Each line says `ok` or `problem` (keys and secrets are never printed), and any problem fails it:
fix them before testing. The app key has no Webhooks access, so the endpoint lines come out as a
note; the setup script already checked the endpoint when it ran. Run the check again after any
change, and in step 12 before the live redeploy.

**9. Test-mode spike: settle what Dodo doesn't document.** Several rules in the code come from Dodo's
docs alone. Before the cutover, run real test-mode flows once and settle every point below. If an
answer breaks the design (for example, a paid trial has no recognizable trial window), stop and fix
the code before step 10.

How:

- Put the test values in `.env.local` (`DODO_ENVIRONMENT=test`, the app key from step 3, the five
  product ids from step 4, and a new `BILLING_SIGNING_SECRET` from `openssl rand -hex 32`) and start
  `bun dev`. With them set, `bun dev` uses Dodo's test mode instead of mock billing; take them out
  again afterwards.
- Never reuse production's signing secret on your laptop. Production cancels and refunds a
  subscription signed for an account its database doesn't have, so with a shared secret it would
  cancel every checkout you make locally. With separate secrets, an event that reaches the other
  side arrives unsigned and is only logged.
- Forward Dodo's events to your laptop: `bun install -g dodopayments-cli`, then
  `dodo wh listen http://localhost:3000/api/billing/webhook` (test keys only). The CLI adds its own
  relay endpoint under **Developer** → **Webhooks**: put that endpoint's secret in `.env.local` as
  `DODO_WEBHOOK_SECRET` and restart `bun dev`. The relay rewrites the JSON, so a forwarded event can
  fail the signature check (`billing.webhook_invalid`) even with the headers intact; then read the
  raw payloads from the endpoint's **Logs** instead.
- Turn on **Test Mode Emails** (**Settings** → **Communication**) to see what buyers receive
  (subjects start `[TEST MODE]`, at most 100 a week).
- Add test funds to the wallet: refunds come out of the balance, in test mode too.
- Cards: `4242 4242 4242 4242`, any future date (for example 06/32), CVC `123`. Renewals fail with
  `4000 0000 0000 0341`.
- Save sanitized payloads (no emails, names, addresses or keys) in a new file,
  `src/lib/billing/dodo-fixtures.ts`, and load them in the billing tests. Write each answer under its item below and in the PR.

Each item says what the code assumes today and where to change it if Dodo does something else.

- [ ] **Id shapes.** The real `sub_`, `cus_`, `pay_`, `pdt_` and `ref_` ids: length and characters.
  Today: 8 to 64 letters and digits after the prefix, and never a Paddle-shaped `sub_` (26 lowercase
  letters or digits; the Paddle reset relies on that). Change: `isDodoId` in `dodo-status.ts`,
  `dodoId` in `dodo-testing.ts`.
- [ ] **Key prefixes.** Today: `dodo_test_` and `dodo_live_`; any other key leaves billing off.
  Change: `dodoKeyMatchesEnvironment` in `dodo.ts`, `keyEnvironment` in `dodo-catalog.ts`.
- [ ] **The $1 trial.** Which events a trial checkout sends, in what order, and the subscription's
  `previous_billing_date`, `next_billing_date`, `created_at` and `trial_period_days` during the trial
  and after the first full charge. Does the $1.00 subscription minimum accept `trial_amount` 100 with
  no tax? Today: a trial is `trial_period_days` above 0 and a first billing period no longer than
  that (plus an hour), starting no later than that after `created_at` (does a `keep_cycle` plan
  change move `previous_billing_date`?), it ends at `next_billing_date`, and
  `billing.trial_not_detected` warns when a trial-product subscription isn't seen as one. Change:
  `inTrialWindow` and `trialEndOf` in `dodo-status.ts`. If Dodo refuses $1, raise
  `PRO_TRIAL.priceUsd` and every "$1" in the copy and tests.
- [ ] **Timestamps.** Today: ISO 8601 with `Z` and microseconds; a time with no zone is read as UTC.
  Change: `toMs` in `dodo-status.ts` and its copy in `dodo-events.ts`.
- [ ] **The trial's payment.** Today: `payment.succeeded` with `charge_type` `new`, carrying the
  checkout metadata (`plan`, `interval`, `trial`) as strings; otherwise the `checkout_completed`
  event never fires (the refused-trial refund doesn't depend on it). A plan change's charge is
  `plan_change`. Change: `recordPayment` in `webhook.ts`.
- [ ] **The return address.** Which `status` Dodo adds for a paid trial, a full-price plan, a
  declined card, 3-D Secure and an abandoned checkout, and whether it joins its own parameters with
  `&`. Today: `active`, `succeeded`, `pending` and `processing` mean paid, anything else cancelled;
  `billing.checkout_returned` logs each status seen. Also: must the return address be on the
  approved domain, and does the checkout ask for a name when only the email is sent? Change:
  `PAID_STATUSES` in `src/app/api/billing/return/route.ts`.
- [ ] **Multiple subscriptions off.** Open two checkout links before paying either. Does
  `CUSTOMER_HAS_EXISTING_SUBSCRIPTION` come when the link is made or at payment? Today: it is shown
  as "You're already on that plan."; if Dodo only refuses at payment, the buyer sees Dodo's own
  error page. Change: `REASON_BY_CODE` in `dodo.ts`.
- [ ] **Plan changes.** Pro monthly to Max monthly with `prorated_immediately_keep_cycle` (expect
  the prorated difference now and the same renewal date). Trial to Max monthly and to Max yearly
  with `full_immediately` (expect the trial to end, the full price charged now, the $1 not credited,
  `subscription.plan_changed` with the dates on the new period, and `trial_period_days` 0). A
  declined card with `on_payment_failure: prevent_change` (expect the trial unchanged and
  `payment.failed` with `charge_type` `plan_change`). A plan change while a cancel is scheduled
  (which refusal code and HTTP status). Does `change-plan` answer 200 with an empty body? Change:
  `changePlan` in `dodo.ts`, `planChangeRoute` in `index.ts`.
- [ ] **Cancel at the period end.** Set `cancel_at_next_billing_date` true, then false: which events
  come (expected: `subscription.updated`), and is the period end `cancelled` or `expired`? Can the
  portal resume a scheduled cancel, update the card and show invoices, and does a card update bring
  an `on_hold` subscription back? Today: a scheduled cancel is `scheduled_cancel`; the account page
  and upgrade dialog say "Your trial is set to end. Resume it in Manage billing, then start Max." and
  their button opens the portal. If the portal can't resume, change that copy (`resumeFirstNotice`
  in `trial-upgrade.ts`) and `planChangeRoute`.
- [ ] **Immediate cancel** (`PATCH` `status: cancelled`, as account deletion does): which events,
  and which HTTP status and code for an already-cancelled subscription and for a `pending` one.
  Today: a refused cancel is read back, and an ended subscription or one already set to end counts
  as done; if a pending one can't be cancelled, deleting that account stays blocked until it settles.
  Change: `cancelSubscription` in `dodo.ts`.
- [ ] **Refund of the $1.** The `refund.succeeded` payload and the code for a second refund. Today:
  `PAYMENT_ALREADY_REFUNDED`, `PAYMENT_HAS_BEEN_REFUNDED`, `EXISTING_REFUND_REQUEST_PROCESSING` and
  `NOTHING_TO_REFUND` count as done. Change: `refundPayment` in `dodo.ts`.
- [ ] **A failed renewal** with `4000 0000 0000 0341` (the charge when the trial ends is the first
  one; move `next_billing_date` in test mode if Dodo allows it). Expect `subscription.past_due` and
  the plan kept for 3 days, then `subscription.on_hold` and Free. Do the dates stay on the trial
  window during the grace days? Do the grace period and retries cover the first full charge after a
  trial? Today: past due inside the trial window still counts as an unpaid trial; on hold is Free
  but still cancelled on account deletion. Change: `internalStatus` in `dodo-status.ts`,
  `PLAN_BY_STATUS` in `entitlements.ts`.
- [ ] **Webhook delivery.** Header names (`webhook-id`, `webhook-timestamp`, `webhook-signature`
  with space-separated `v1,` entries) and a `whsec_` secret. Does a dashboard replay reuse the
  `webhook-id`? Do the events of one action share a timestamp? During **Rotate secret**, does Dodo
  sign with both secrets? Today: dedupe by `webhook-id`, order by the envelope `timestamp`. Change:
  `verifyWebhook` and `readEnvelope` in `dodo-events.ts`.
- [ ] **Payload fields.** Every subscription payload (pending and failed ones too) has
  `subscription_id`, `product_id` and `customer.customer_id`; payments have `payment_id`; refunds
  `refund_id`, `payment_id`, `status`, `is_partial`; disputes `dispute_id`, `payment_id`,
  `dispute_status`, `dispute_stage`, `amount`, `currency`. Metadata strings come back unchanged.
  Today: a payload missing one gets 500 `malformed`, and Dodo retries it for about a day. Change:
  the schemas in `dodo-status.ts` and `dodo-events.ts`.
- [ ] **API details.** The error body is `{code, message}`; which HTTP status each refusal uses;
  lists are `{items}` with `page_size` up to 100; does `page_number` start at 0 or 1; is
  `GET /customers?email=` an exact match; does `GET /products?archived=true` list only archived
  products; does `GET /webhooks` accept `limit=100`; the portal link call (`send_email=false`)
  answers `link`. Change: `dodo.ts`, `dodo-catalog.ts`.
- [ ] **Products.** Did `POST /products` take `trial_amount` 100 and the 20-year period? Does
  `PATCH /products` take `addons: []` and `pricing_mode: null`? Change: `productSpec` in
  `dodo-catalog.ts`, `scripts/dodo-setup.ts`.
- [ ] **Emails.** What a trialist receives from Dodo with Trial Ending off, and whether Payment
  Succeeded carries the invoice link the refund page mentions. Change: step 2, or the refund page.
- [ ] **What Dodo sends about the buyer.** The privacy page says Dodo's notices carry name, email,
  billing address and card network and last four, and that the app stores none of them. Change:
  `src/app/(marketing)/privacy/page.tsx`.

**10. Cutover from the Paddle sandbox** (once, with the deploy that brings the Dodo code):

1. In the Paddle sandbox, deactivate the notification destination (**Events** → **Notifications**),
   so the old deployment can't write Paddle ids while the new build runs. Cancelling the sandbox
   subscriptions is optional: no money moves.
2. In Vercel, remove the nine Paddle variables from production (and preview and development, if
   they are there): `vercel env rm PADDLE_API_KEY production`, and the same for
   `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
   `PADDLE_PRO_MONTHLY_PRICE_ID`, `PADDLE_PRO_TRIAL_PRICE_ID`, `PADDLE_PRO_YEARLY_PRICE_ID`,
   `PADDLE_MAX_MONTHLY_PRICE_ID` and `PADDLE_MAX_YEARLY_PRICE_ID`. The app no longer reads them.
   Add the Dodo test values (step 7).
3. Make sure the test-mode endpoint points at `https://www.ottosensei.com/api/billing/webhook` and is
   on: run the setup script again (step 4).
4. Push. The build applies `20261120000100_reset_paddle_plans.sql`: every account holding a Paddle
   sandbox id (`ctm_` or `sub_` plus 26 lowercase letters or digits) moves to Free with every billing
   field cleared, and its trial reminders and trial-watch rows go, along with the Paddle trial
   replacements and all trial history (nobody ever paid, and old rows would keep the owner's and
   testers' emails from the Dodo trial). Every account's trial usage counts go back to zero, invite
   extras kept, so a new trial doesn't start used up. Mock plans and plans set by hand stay.
5. Signed in, `/api/me` answers `billing.mode: "dodo"`. Against the production database (the
   `.env.local` from step 5), `bun scripts/reset-billing.ts --paddle` counts accounts still holding
   a Paddle id: it should say 0. `--paddle --apply` clears any that remain; it never touches Dodo
   ids.

Rollback before going live: revert the deploy and put the Paddle variables back; the reset sandbox
rows stay reset, which is fine for test data. After going live there is no way back to Paddle.

Creem ran in test mode only, before Paddle; its plans were reset by
`20261116000200_reset_creem_plans.sql`. Remove any `CREEM_*` variable still in Vercel.

**11. Test it end to end** (test mode, on the production domain, right after step 10). Keep this phase
short: until going live, anyone with a public test card can get Pro (the go-live reset clears it).

- A new account → **Try Pro for 3 days** → the checkout says $1 plus tax today, then $15/month. Back
  on the account page it shows "Pro trial until <date>" within a few seconds; that date is Dodo's
  next billing date, and the trial reminder goes out the day before.
- Start a checkout and leave Dodo's page without paying: the account page says the checkout was
  cancelled.
- During the trial, **Start Max now**: no checkout page opens; the card on file is charged the full
  Max price at once (the $1 isn't credited), the trial ends and the account shows Max.
- On a paid Pro plan, move to Max: the same subscription changes in place, the prorated difference
  is charged now and the renewal date stays.
- **Manage billing** opens Dodo's portal. Cancel there: the plan stays until the trial or the paid
  period ends, with no renewal date shown, then the account is on Free. Until then the upgrade card
  asks to resume it in **Manage billing** and offers no charge.
- Delete the account from the account page: its subscription shows cancelled in Dodo at once. Sign up
  again with the same email: checkout now shows $15/month and no trial.
- A refused second trial: open a trial checkout and leave it unpaid; in another window pay a trial
  with the same email, then cancel that subscription at once from the Dodo dashboard; now pay the
  first checkout. The app cancels the new trial and refunds its $1 exactly once.
- A failed renewal (`4000 0000 0000 0341`): the plan stays for 3 days (`past_due`), then the account
  is on Free (`on_hold`) until the card is updated in **Manage billing**, which the account page
  shows with "Your last payment didn't go through" and no upgrade offer.
- Replay a delivery from the endpoint's **Logs**: the app answers `duplicate`. A request with a wrong
  signature gets 401.
- The logs show no `billing.unsigned_subscription`, `billing.unsigned_custom_data`,
  `billing.second_live_subscription` or `billing.trial_not_detected`.

**12. Going live.**

1. **Compliance, early** (long lead time). Email compliance@dodopayments.com:
   - The category pre-check. Dodo often reviews AI writing tools, outreach tools and resume and
     hiring tools, and it prohibits scraping and mass outreach. Explain where the jobs feed comes
     from (public job board APIs, job-sources.md), that outreach drafts are sent by the user one at
     a time, and that the app never promises jobs or interviews.
   - The merchant-of-record sentence and the refund wording, for approval: Dodo's terms want the
     reseller notice "in a form agreed with Dodo Payments". The sentence lives in one place,
     `MERCHANT.disclosure` in `src/app/(marketing)/_components/merchant.ts`, and the terms, refund,
     privacy and pricing pages all read it. The refund page defers to Dodo's buyer terms and promises
     nothing of its own. After any change, bump `LEGAL_LAST_UPDATED` in
     `src/components/site/routes.ts`.
2. **Website.** A visitor with no account must reach: pricing with the billing period, the terms,
   the privacy policy, the refund and cancellation policy, and a contact address. The footer links
   all of them, and they name Dodo Payments. The live site must match the verification form
   (product description, pricing, how it is delivered); give the public home page as the product
   address, never a sign-in page. Sales may only run on the approved site, so billing stays off on
   previews and other domains.
3. **Verification** (dashboard, in order): Product Information → Identity Verification (KYC through
   Persona: a government ID and a selfie, 3 tries) → Business Verification (KYB, Registered Entity
   only) → Bank Verification. Most reviews take 1 to 3 business days; a failed form can be appealed
   once. Live payments turn on when every form is approved; payouts also need Dodo's monitoring
   review.
4. **Payouts** (**Settings** → **Payouts**): add a **Local** transfer payout account (no SWIFT fee).
   Payouts run twice a month once the balance is over the minimum ($100 by default, $50 at the
   lowest), with a $5 fee for a payout under $1,000. Refunds and disputes come out of the balance:
   keep about $20 in it so early refunds of refused trials don't fail.
5. **Vercel Pro.** Hobby forbids commercial use: upgrade before taking real money.
6. **The processor-change notice.** The terms and the privacy policy promise signed-in users an email
   before a change like this takes effect, so it goes out before going live. `--date` is the day live
   payments start (UTC); it must be after today. Against the production database (the `.env.local`
   from step 5, with `RESEND_API_KEY`, `EMAIL_FROM` and `NEXT_PUBLIC_APP_URL` set to the public
   https site):

   ```bash
   bun scripts/send-processor-notice.ts --date 2026-12-01            # dry run: counts only
   bun scripts/send-processor-notice.ts --date 2026-12-01 --apply    # sends
   ```

   - Every account with an email gets it once, whatever its email settings. Each is logged before it
     is sent, so a rerun never emails anyone twice.
   - A run sends at most what is left of the day's optional email allowance
     (`OPTIONAL_EMAILS_PER_DAY`, 25 by default), so run
     it once a day until it says `Still to notify: 0`, or pass `--limit N` on a paid Resend plan.
     Start early enough that the last one goes out before the date.
   - First read the copy (`processorNoticeEmail` in `src/lib/notifications/processor-notice.ts`)
     against the wording Dodo approved. Only the owner runs `--apply`.
7. **Switch to live**, back to back:
   1. Turn on **Live Mode** and walk step 2's settings again (Dodo says settings are shared between
      the modes; check each anyway).
   2. Make the live keys (step 3). Put `DODO_ENVIRONMENT=live` and the live setup key in
      `.env.dodo.live.local`, then run `bun --env-file=.env.dodo.live.local scripts/dodo-setup.ts`.
   3. Add the live app key and `BILLING_SIGNING_SECRET` to that file, run
      `bun --env-file=.env.dodo.live.local scripts/check-dodo-catalog.ts`, and fix every problem.
   4. In test mode, cancel every test subscription (they keep renewing until cancelled); each cancel
      reaches the app and moves that account to Free. Then disable the test-mode endpoint that
      points at production, and the CLI's relay endpoint.
   5. Against the production database, `bun scripts/reset-billing.ts --go-live` prints how many
      accounts hold any billing state (it changes nothing). Then
      `bun scripts/reset-billing.ts --go-live --apply` moves every one of them to Free, clears their
      billing fields, and deletes their trial reminders, every trial replacement and all trial
      history; every account's trial usage counts go back to zero (invite extras
      stay). Test and live ids look alike, so this goes by billing state, not by id.
      It prints counts only, never emails. Go straight to the next step. **This is the only time
      `--go-live --apply` is ever run**: once production is live, it would move paying customers to
      Free while Dodo keeps charging them.
      **Done on 2026-11-21**, after a test-mode check on production: migration
      `20261121000100_reset_dodo_test_billing.sql` applied this reset in the deploy that switched
      production back to live keys. Never run `--go-live --apply` again.
   6. In Vercel production, replace (`vercel env rm NAME production`, then
      `vercel env add NAME production`) `DODO_ENVIRONMENT` (now `live`), `DODO_API_KEY`,
      `DODO_WEBHOOK_SECRET` and the five product ids with the live values. `BILLING_SIGNING_SECRET`
      stays. Redeploy. From now on, never roll production back to a build made with the test values.
8. **Live smoke test.** Start a real $1 trial with your own card (discount codes are off at
   checkout), and check the webhook, the plan and the trial reminder. Then cancel in **Manage
   billing**, or refund yourself from the dashboard if the balance covers it. For 48 hours, watch the
   logs for `billing.webhook_invalid`, `billing.provider_failed`, `billing.unsigned_subscription`,
   `billing.second_live_subscription`, `billing.reused_trial_refund_failed`,
   `billing.orphan_subscription_cancelled`, `billing.orphan_cancel_failed`,
   `billing.trial_not_detected`, `billing.plan_change_payment_failed` and
   `billing.key_environment_mismatch`.
9. **Afterwards.** Close the Paddle sandbox account and delete `.env.paddle.local` and
   `.env.paddle.live.local`. Watch Dodo's changelog: its API has no versions and changes in place.
   Once the in-place trial upgrade has worked live, delete the older trial-replacement flow
   (`replaces_subscription_id`) from the code.

**Mock billing.** In `bun dev` with no Dodo values every option is offered and nothing is charged:
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
| `DODO_PRO_TRIAL_PRODUCT_ID` | The $1, 3-day Pro trial for new accounts | 10 |
| `DODO_PRO_YEARLY_PRODUCT_ID` | Yearly Pro ($120) | 10 |
| `DODO_MAX_MONTHLY_PRODUCT_ID`, `DODO_MAX_YEARLY_PRODUCT_ID` | The Max plan ($29/month, $232/year) | 10 |
| `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_TRACES_SAMPLE_RATE`) | Error reports (+ readable stack traces, + the share of server requests traced) | 10b |
| `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST` for EU) | Page views, funnel events and page speed | 10c |
| `GITHUB_TOKEN` | Higher GitHub limits for Import from GitHub and portfolio GitHub numbers | 10d |
| `CRON_SECRET` | Daily cleanup, follow-up reminders (bell), and clearing /jobs after the daily job read (also a GitHub secret) | 10e |
| `RESEND_API_KEY`, `EMAIL_FROM` | The trial-ending email and one-time service notices; follow-ups, new matches and views are bell only | 10e |
| `EMAIL_POSTAL_ADDRESS` | A postal address (a PO box or virtual mailbox is fine) shown in the footer of optional emails. Tip emails stay off until it's set | 10e |
| `INBOUND_EMAIL_SECRET` (+ optional `INBOUND_ADDRESS_STYLE`, `INBOUND_DOMAIN`) | Applications that track themselves from forwarded job emails, through a Cloudflare Email Worker; addresses are `otto+<handle>@track.ottosensei.com` | inbound-email.md |
| `OPTIONAL_EMAILS_PER_DAY` | Optional, default 25: the daily allowance for the one-time processor-change notice (step 10.12), kept under Resend's free quota next to sign-in codes. Raise it on a paid Resend plan; 0 stops optional emails | 10e |

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
vercel env add SENTRY_TRACES_SAMPLE_RATE production # optional: 0.05 (5% of server requests) by default, 0 for none
```

- Errors from every page (uncaught errors, failed promises and the error screens), from server
  rendering and route handlers (`onRequestError` in `src/instrumentation.ts`), from `log.error`
  and from cron runs that fail in whole or in part. No session replay; the browser never traces.
  Each release is the Git commit and the environment is Vercel's (production or preview).
- Browser reports go through our own `/api/relay` (Sentry's tunnel), so ad blockers don't drop
  them; it only forwards to our own project and is limited to 30 a minute per address.
- Without `SENTRY_AUTH_TOKEN` no source maps upload, and a failed upload never fails the build.
- `bun dev` sends nothing, even with a DSN in `.env.local`. To test reporting on your laptop, add
  `NEXT_PUBLIC_SENTRY_DEV=1` too.
- Landing, pricing, policy, portfolio and share pages don't load Sentry until the visitor moves into
  the app or something breaks there; errors from before it loads are still sent.

---

## 10c. Product analytics: PostHog (optional)

Skip this and the app runs the same, it just doesn't count page views or funnel steps anywhere.

1. posthog.com → create a project (US or EU cloud). Copy the **Project API key** (`phc_...`).
2. **Project settings** → turn on **Discard client IP data**. The app already sends only named
   events with counts and flags (never resume text, job posts, names or emails), strips query
   strings and share links from URLs, and skips anyone whose browser sends Do Not Track or Global
   Privacy Control (`src/lib/analytics/`); this is the second lock.

```bash
vercel env add NEXT_PUBLIC_POSTHOG_KEY production    # the project key (safe in the browser)
vercel env add NEXT_PUBLIC_POSTHOG_HOST production   # only for EU: https://eu.i.posthog.com
```

- No PostHog script on any page. The browser sends a small beacon to our own `/api/activity`
  (once the page is idle, or as it's hidden) and the server forwards it to PostHog in one batch.
- Page views on every page (`$pageview`): the page's template (`/resume-examples/[role]`, never
  the address with its ids or slugs), the referring site's name only, utm tags, the device type
  and a session id, so PostHog's **Web analytics** works. Web vitals (LCP, INP, CLS, TTFB) for a
  20% sample of page loads, by page (`$web_vitals`, PostHog's **Web vitals** tab).
- No autocapture, no session recording, no surveys, no cookies: a random id in local storage until
  sign-in, then the user id (never the email); the two are linked once, at the first page opened
  signed in, and signing out starts a new random id.
- Funnel: `landing_viewed` → `resume_imported` → `recruiter_view_seen` → `signup_started` →
  `signed_up` / `signed_in` → `line_fixed` → `tailor_run` → `screener_viewed` → `letter_written` →
  `pdf_downloaded` / `docx_downloaded` → `upgrade_clicked` → `checkout_started` →
  `checkout_completed`, plus `application_logged`. From the server: `signed_up`, `signed_in`,
  `checkout_started`, `checkout_completed`, `line_fixed`, `tailor_run`, `letter_written`,
  `application_logged` and `ai_call` (task, model, latency, outcome).
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

## 10e. Scheduled jobs (optional)

```
Vercel Cron    → /api/cron/cleanup     04:17 UTC daily → old rate-limit windows, tombstones, notifications
               → /api/cron/trial-reminders 13:30 UTC daily → bell notification (+ email) a day before a trial ends
               → /api/cron/follow-ups  14:00 UTC daily → bell notification per account (no email)
               → /api/cron/jobs        six times, 05:45 to 08:15 UTC → every board and feed, resuming each time
                 (scripts/jobs-ingest-ci.ts does the same in one run, given a database URL)
GitHub Actions → /api/cron/title-vectors 08:45 UTC daily → JobBERT-v2 vectors for the day's new titles
```

The three Vercel schedules are in `vercel.json`. They only run on the production deployment, and only
once `CRON_SECRET` is set: without it every call answers 401 and nothing happens.

The daily job read runs on Vercel: each of the six calls reads boards for up to 4 minutes and resumes
where the last stopped, and finishes at once when nothing is left. GitHub Actions runs only what needs a
runner: the title vectors (`.github/workflows/title-vectors.yml`, the model can't run on Vercel, a few
minutes a day) and the daily IndexNow ping. CI, E2E and Evals run only by hand from the Actions tab. In
GitHub → the repo → **Settings** → **Secrets and variables** → **Actions**, add:

- Secret `CRON_SECRET`: the same value as on Vercel, so no database password is stored in GitHub.
  Vercel hides sensitive values once saved, so make a new one if you don't have it:
  `openssl rand -hex 32`, set it on Vercel and here, then redeploy.
- Variable `OTTO_APP_URL`: the site's address, e.g. `https://ottosensei.com`.

Then **Actions** → **Title vectors** → **Run workflow** embeds the first titles without waiting for
08:45 UTC. `POST /api/cron/jobs` (Bearer `CRON_SECRET`) runs a 4-minute read by hand.

1. Make a secret and add it (Vercel sends it to the jobs as `Authorization: Bearer <secret>`):

   ```bash
   openssl rand -hex 32
   vercel env add CRON_SECRET production
   ```

2. The trial-ending email (optional; without it the notice stays in the dashboard bell). In Resend,
   the domain from step 6a is already verified: **API Keys** → **Create API Key** → name
   `otto-reminders`, permission **Sending access**. Then:

   ```bash
   vercel env add RESEND_API_KEY production
   vercel env add EMAIL_FROM production   # Otto Sensei <otto@yourdomain.com>
   ```

3. Redeploy (`vercel --prod`). Vercel → project → **Settings** → **Cron Jobs** lists all three
   jobs, with **Run** buttons and their logs.

- Marking a job applied sets its follow-up date by itself: 7 days after it was sent (each account
  can pick another number on the Account page), never sooner than a day after it was logged. When
  the date comes, the job adds bell notes, covering all its newly due applications; it sends no
  email. Snooze moves the date 3 days on; Done or any other status clears it.
- Reminder, weekly jobs, tips and views emails are gone. Links in ones already sent (**Done**,
  **Snooze 3 days**, **Unsubscribe**, signed with `CRON_SECRET`) still work until the secret
  changes; each opens a page that acts only when its one button is pressed.
- Trial reminders: Dodo's own **Subscription Trial Ending** email is turned off (step 10.2: for a
  trial under 7 days it goes out the moment the trial starts), so every trialist gets one bell note
  and one email (whatever their reminder setting: it's a billing notice) 12 to 36 hours before the
  trial ends (later, if a failed run missed it, while an hour is left),
  with the end date, the price after it and a link to cancel on `/account`. Set `CRON_SECRET` (and
  Resend, for the email) before real trials start.
- Cleanup and follow-ups stop after about 45 seconds and pick up the rest the next day. Running one
  twice does no harm. Run one by hand with
  `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/cleanup`.
- **Jobs** (`/api/cron/jobs`) needs no keys or new variables: every source is a public API
  (job-sources.md). It runs up to 300 seconds (`maxDuration`), which Vercel allows on every plan with
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
in Dodo (step 10) the webhook endpoint: run `scripts/dodo-setup.ts` again with `DODO_SETUP_APP_URL`
set to the new address, then delete the old endpoint and put the new endpoint's secret in Vercel. A
new domain is a new site for Dodo's review, so tell Dodo before checkouts return there. Redeploy.

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
- [ ] `/api/me` (signed in) answers `billing.mode: "dodo"`, and `bun --env-file=.env.dodo.local
      scripts/check-dodo-catalog.ts` prints no `problem` line (step 10.8).
- [ ] Run a test-mode trial checkout (card `4242 4242 4242 4242`, any future date, CVC `123`); the
      account shows the Pro trial and its end date within a few seconds (proves the webhook).
- [ ] Delete that test account from the account page; it disappears from Supabase
      **Authentication** → **Users**, and its Dodo test subscription shows cancelled. Sign up again
      with the same email: checkout shows $15, no trial.
- [ ] Supabase **Project Settings** → **API Keys**: the secret key exists only in Vercel and your
      `.env.local`.
- [ ] Vercel **Settings** → **Cron Jobs**: press **Run** on all three jobs; each log line ends in
      `cron.<job>.done` (not `cron.unauthorized`, which means `CRON_SECRET` is missing). After the
      jobs run, `/jobs` lists openings and `/dashboard/jobs` ranks them for your resume.
- [ ] Share a resume from its card menu and open the link in a private window: the page loads,
      and **Download PDF** works.
- [ ] On a Pro test account, write a pitch in **Portfolio** → **Intro**: it shows in the preview,
      and the page has no pictures to upload anywhere.
- [ ] If PostHog is set: open the home page and upload a resume; PostHog **Activity** shows a
      `$pageview` for `/` and `resume_imported` within a minute.
- [ ] If Sentry is set: in the browser console on any page run
      `setTimeout(() => { throw new Error("Sentry check") })`; the Network tab shows a POST to
      `/api/relay` answered 200, and Sentry **Issues** shows "Sentry check" within a minute.

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
| "Payments aren't live yet" in production | Billing is off: `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `BILLING_SIGNING_SECRET` or `DODO_PRO_MONTHLY_PRODUCT_ID` is missing, or the key is from the other mode than `DODO_ENVIRONMENT` (the log says `billing.key_environment_mismatch`). Fix it and redeploy (step 10.7). |
| Paid, but the plan never changes | The webhook isn't arriving or is refused. Dodo → **Developer** → **Webhooks** → the endpoint → **Logs** shows each delivery and our answer: 401 (`billing.webhook_invalid`) means the wrong `DODO_WEBHOOK_SECRET` (test and live differ) or a value changed without a redeploy; 503 (`billing.webhook_not_configured`) means the webhook or signing secret is missing or unreadable. Replay the message once it's fixed. |
| "We couldn't open billing: payments aren't set up right on our side" | Dodo refused the app's key (`INSUFFICIENT_PERMISSION`, or an IP allowlist). Check the key's permissions (step 10.3). |
| "We couldn't cancel your subscription, so your account wasn't deleted" | Dodo didn't confirm the cancel, so the account was kept; trying again usually works. A 404 (`billing.cancel_not_found`) usually means a test-mode id meeting the live key: the go-live reset (step 10.12) clears those. "We can't cancel your subscription right now" means `DODO_API_KEY` is missing in production. |
| `/api/health` answers 503 | `DATABASE_URL` is missing or wrong, or the project is paused. |
| `migrate.ts`: `password authentication failed` | Wrong password in the URL, or special characters not URL-encoded. |
| `migrate.ts`: `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | That's the IPv6-only direct URL. Use the **Session pooler** string (step 3). |
| `migrate.ts`: `... needs a session connection (port 5432), not the transaction pooler` | The build only has the 6543 pooler URL, and a `-- no-transaction` file needs a session. Add `POSTGRES_URL_NON_POOLING` (the **Session pooler** string, port 5432) to Vercel production and redeploy. |
| `migrate.ts`: `a lock it needs was still taken after 6 tries` | Something held that table for about 2 minutes (a long query, or a `vacuum full` in the SQL editor). Nothing from that file was applied. Deploy again. |
| `migrate.ts`: `canceling statement due to statement timeout` | A statement in the first file not marked `done` ran over 2 minutes, and nothing from that file was applied. Start that file with `set local statement_timeout = '10min';` and deploy again. |
| `migrate.ts`: `left an unusable index` | An earlier `create index concurrently` stopped part-way. Run the `drop index concurrently public.<name>;` it names in the SQL editor, then deploy again. |
