# Google Calendar connect (not built yet)

What it would take to write interviews straight into a person's Google Calendar, so a change shows there within seconds instead of on Google's next read of the subscribed feed. Nothing in the app uses it yet: Google has to verify the app first, and the owner has to start that.

Today, without it: every account has a private feed link (`/api/calendar/<token>.ics`, made on the Interview prep page or under Account → Emails and reminders) and the per-interview "Add to calendar" file. Google reads a subscribed feed only every several hours, which is the gap this would close.

## What Otto would do with it

- **Scope:** `https://www.googleapis.com/auth/calendar.events` only. Google lists it as **sensitive**, not restricted, so it needs app verification but no CASA security assessment.
- **Asked when:** only when someone presses "Connect Google Calendar" on Interview prep or Account. Never at sign-in, and Google sign-in keeps its basic scopes.
- **Writes:** one event per interview in the person's primary calendar (`events.insert`), changed when the day or time changes (`events.patch`), removed when the interview is cleared or the application deleted (`events.delete`). The same title, time zone, description and prep link as the feed. Follow-up days stay in the feed only.
- **Reads:** nothing. The scope would allow reading events; Otto would only touch events whose ids it stored when it made them.
- **Stores:** the refresh token (encrypted at rest), the calendar id, and each event's id on its application. Disconnect revokes the token at Google, deletes it, and asks whether to remove the events Otto made.
- **Plans:** the same as the feed: anyone with an interview logged.

## Google Cloud console steps

Use the existing `Otto Sensei` project from SETUP.md §8a, so the consent screen shows one app.

1. **APIs & Services → Library:** search **Google Calendar API** → **Enable**.
2. **Google Auth Platform → Branding:** check the app name `Otto Sensei`, the logo (120×120 PNG, needs review if changed), support email, home page `https://www.ottosensei.com`, privacy policy `https://www.ottosensei.com/privacy`, terms `https://www.ottosensei.com/terms`. **Authorized domains:** `ottosensei.com` (and `supabase.co`, already there for sign-in). **Save**.
3. **Audience:** User type **External**, publishing status **In production**. (In Testing, only listed test users can connect and their tokens expire after 7 days.)
4. **Data Access → Add or remove scopes:** filter for `calendar.events` and tick `.../auth/calendar.events` ("View and edit events on all your calendars"). Don't pick `.../auth/calendar`, the wider scope that can also share and delete whole calendars. It appears under **Your sensitive scopes**. **Update**, then **Save**. In the justification box, write: "Otto Sensei adds the job interviews a user logs in the app to their Google Calendar and keeps them up to date when the user changes the interview's day or time. It only creates, updates and deletes the events it made, and never reads other events."
5. **Clients → Create client:** Web application, name `Otto Sensei calendar`. Authorized JavaScript origins `https://www.ottosensei.com` and `http://localhost:3000`. Authorized redirect URIs `https://www.ottosensei.com/api/calendar/google/callback` and `http://localhost:3000/api/calendar/google/callback` (the route to build). **Create**, then keep the Client ID and secret for Vercel as `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` (never in chat, email or git).
6. **Verification Center:** **Prepare for verification**, check every item below, then **Submit for verification**. Answer Google's emails from the developer contact address; review usually takes several business days and can take a few weeks.

## Verification checklist

- [ ] `ottosensei.com` is verified in Google Search Console under the same Google account that owns the Cloud project.
- [ ] The home page explains what Otto Sensei does and is reachable without signing in.
- [ ] The privacy policy, on `ottosensei.com`, says what Google data is used (the calendar events Otto creates), why, that it isn't sold or used for ads or AI training, how to disconnect and delete it, and includes: "Otto Sensei's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements." (Legal copy: the owner's call; the marketing pages are the lead's area.)
- [ ] The app name, logo and home page on the consent screen match the site.
- [ ] A short unlisted YouTube video: sign in to Otto, press Connect Google Calendar, the consent screen in English with the `calendar.events` scope and the client ID visible in the address bar, then an interview appearing and moving in Google Calendar, then Disconnect.
- [ ] The scope justification above is filled in, and only `calendar.events` (plus the basic sign-in scopes) is requested.
- [ ] Support email and developer contact are monitored inboxes.
- [ ] After approval, the consent screen shows no "unverified app" warning for a fresh Google account.

## When it's approved: what to build

- A `google_calendar_links` table (user id, encrypted refresh token, calendar id, connected at) and a `google_event_id` column on applications.
- `/api/calendar/google/start` and `/callback` (state parameter tied to the session, PKCE, offline access, `prompt=consent` only on first connect).
- Sync on every interview change from the applications API and the "How did it go?" answers, retried from the hourly interview run if Google is down; stop and ask to reconnect on `invalid_grant`.
- Connect and Disconnect beside the feed's Subscribe keys, with the feed kept as the fallback.
