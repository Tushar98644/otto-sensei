# Otto's inbound email Worker

Applications can track themselves from email. Each Pro account picks a handle and gets the
address `otto+<handle>@track.ottosensei.com`; one Gmail filter forwards job emails to it. This
Cloudflare Email Worker receives that mail, turns it into plain text and a few headers, checks its
DKIM and ARC signatures, and posts it to `https://www.ottosensei.com/api/inbound/email`, signed.
Otto reads it with rules (no AI) and moves the card on the Applications board.

The same Worker also runs Otto's hourly interview run: see
[The hourly interview run](#the-hourly-interview-run).

- Mail for any other domain is refused, mail over 10 MB is refused unread, and only the first
  1 MB of anything else is read (the text comes first; attachments come last and are skipped).
- Nothing is stored: no KV, no R2, no forwarding, no stored logs. The text goes to Otto once and
  the Worker forgets it. Otto keeps only the sender's domain, the subject and what it read.
- Each post carries `x-otto-timestamp` (Unix seconds) and `x-otto-signature: v1=<hex>`, an
  HMAC-SHA256 of `<timestamp>.<body>` with `INBOUND_EMAIL_SECRET`. Otto refuses a bad signature
  and anything signed more than 5 minutes away from its clock. `workers/inbound-email/src/sign.ts` and
  `src/lib/inbound/signature.ts` must change together.
- Otto answers 404 for an address it doesn't know (turned off, or a handle changed more than
  14 days ago): the Worker bounces that mail. Any other failure throws, so it shows in
  `wrangler tail`.

## Why the Worker checks signatures itself

Handles are guessable, so anyone could write to `otto+priya@...`. Otto moves a card on its own
only when the mail provably came from the person's own Gmail (Gmail's filter forward, sealed by
Google's ARC signature, from a mailbox the person confirmed in Otto) or from a hiring system or
employer that DKIM-signed it. Everything else waits in a "Check this" list for the person to apply
or ignore.

Email Routing doesn't give a Worker trustworthy Authentication-Results headers (see
cloudflare/workerd#6740), so `workers/inbound-email/src/dkim.ts` verifies the DKIM signatures and the newest ARC message
signature itself (RFC 6376, 8463, 8617; RSA-SHA256 and Ed25519), looking keys up over DNS over
HTTPS at cloudflare-dns.com. It sends Otto the domains whose signatures passed, plus the SMTP
envelope sender, inside the signed body. Its tests include the signed message from RFC 8463.

## Setting it up (once)

You need Node 20 or later, and Bun (already used for the app).

### 1. Turn on Email Routing for the subdomain

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com), pick your account, then
   **ottosensei.com**.
2. Go to **Compute** > **Email Service** > **Email Routing**, then the **Settings** tab.
3. Under **Subdomains**, type `track.ottosensei.com` and press **Add**. Cloudflare adds the MX and
   SPF records for `track.ottosensei.com` itself. Wait until it shows as active (a few minutes).
4. On the same **Settings** tab, turn on **Subaddressing**. Email Routing has no catch-all on a
   subdomain, so every address is `otto+<handle>@track.ottosensei.com`: with subaddressing on,
   the one rule for `otto@track.ottosensei.com` takes all of them, and the Worker still sees the
   `+<handle>` part.

### 2. Make the shared secret

```sh
openssl rand -hex 32
```

Keep the value for the next two steps. It is the same on Cloudflare and on Vercel.

### 3. Deploy the Worker

```sh
cd workers/inbound-email
bun install
bunx wrangler login
bunx wrangler secret put INBOUND_EMAIL_SECRET   # paste the value from step 2
bunx wrangler secret put CRON_SECRET            # the same value as CRON_SECRET on Vercel
bunx wrangler deploy
```

`wrangler login` opens the browser to allow Wrangler on your Cloudflare account. `wrangler deploy`
uploads the Worker and, because `workers/inbound-email/wrangler.toml` lists `addresses = ["otto@track.ottosensei.com"]`,
creates the Email Routing rule that sends that address (and every `otto+...` address) to it. This
needs Wrangler 4.113.0 or later, which `bun install` brings.

If you'd rather make the rule by hand (or Wrangler is older): **Email Routing** > **Routing
rules** > **Create address**, custom address `otto` on `track.ottosensei.com`, action **Send to a
Worker**, destination **otto-inbound-email**, then **Save**.

### 4. Set the app's variable on Vercel

In Vercel: the project > **Settings** > **Environment Variables**, for **Production**, add
`INBOUND_EMAIL_SECRET` with the value from step 2 (the same one the Worker has; at least 32
characters). Then redeploy (Deployments > the latest > **Redeploy**). Until it's set, the
Applications page doesn't offer email tracking at all.

`INBOUND_ADDRESS_STYLE` and `INBOUND_DOMAIN` can stay unset: they default to
`otto+<handle>@track.ottosensei.com`.

### 5. Check it

1. Sign in on the site with a Pro or trial account, open **Applications**, press **Set up**, pick
   a handle and press **Get my address**.
2. Press **Send a test**. Your mail app opens a message to your address with the subject
   `Otto test`. Send it; within a minute the setup card says "Test received".
3. Add the address in Gmail's forwarding settings. Gmail's confirmation shows up on the
   Applications page with the Gmail address that asked; press **Confirm**.
4. To watch the Worker live: `bunx wrangler tail` in `workers/inbound-email` (it shows each run and any error,
   never the mail).

## The hourly interview run

A Cron Trigger in `wrangler.toml` (`crons = ["7 * * * *"]`) wakes the Worker at minute 7 of every
hour (UTC). Its `scheduled` handler (`workers/inbound-email/src/cron.ts`) posts to `APP_URL/api/cron/interview-briefs`
with `Authorization: Bearer <CRON_SECRET>`, the same header Vercel sends to the other crons. That
run puts the interview-morning brief in the bell at about 7:00 on each person's clock (or two hours
before an earlier interview) and asks "How did it go?" there the morning after. It sends no email.
Otto stamps every interview day it handles, so a late, repeated or retried run never rings twice.

- `APP_URL` is a plain variable in `wrangler.toml`: `https://www.ottosensei.com`.
- `CRON_SECRET` is a Worker secret with the same value as `CRON_SECRET` on Vercel:
  `bunx wrangler secret put CRON_SECRET`. If you change it on Vercel, change it here too.
- Until the secret is set, or if Otto refuses it, each run throws, so it shows as failed in the
  Worker's cron events and in `bunx wrangler tail`. Any answer other than 200 also throws; the
  next hour picks up what's left.
- To check it: run `bunx wrangler tail` in `workers/inbound-email` a little before minute 7 and watch the
  scheduled run finish, or look for `cron.interview_briefs.done` in the Vercel logs.

`vercel.json` also calls `/api/cron/interview-briefs` once a day at 02:37 UTC (about 08:00 in
India) as a safety net, so the morning after's "How did it go?" and its follow-up still happen if
the Worker isn't deployed or misses a run.

## Changing the secret

Make a new value, then set it in both places close together, since mail signed with the old
value is refused once Vercel has the new one (the sending server retries for a while):

```sh
bunx wrangler secret put INBOUND_EMAIL_SECRET
```

then update `INBOUND_EMAIL_SECRET` on Vercel and redeploy.

## A short domain instead (optional, not in use)

The code also supports `<handle>@<short domain>` for a separate domain with a catch-all on its
root. To switch: add the domain to Cloudflare with Email Routing on, add `"*@<short domain>"` to
`addresses` in `wrangler.toml` and the domain to `INBOUND_DOMAINS`, deploy, then set
`INBOUND_ADDRESS_STYLE=domain` and `INBOUND_DOMAIN=<short domain>` on Vercel. Otto keeps
accepting the `otto+<handle>@track.ottosensei.com` form, so existing filters keep working.

## Developing

The Worker's tests run with the app's: `bun run test workers` (or the whole suite). `bun run
typecheck` checks it too. To try the whole path on a dev server, start `next dev` with
`INBOUND_EMAIL_SECRET` set and post a signed body the way `src/lib/inbound/inbound-testing.ts`
does.
