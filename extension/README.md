# Otto for Chrome

A Manifest V3 extension that meets job seekers on the pages where they read job posts. On a job post it shows a small Otto badge: the role and company, how many of the post's skills the person's resume has and which are missing, and whether they can take the job (place and work rights). Save puts the job in To apply on the Applications board with a copy of the post; Tailor and Letter open Otto on that saved job.

On a Greenhouse, Lever, Ashby or Workday application form, **Fill with Otto** (Pro and Max) fills the form from the resume the person picked and their saved answers, attaches the resume's PDF, and puts a **Draft with Otto** button beside each question to write. The person checks everything and presses Submit themselves: Otto never sends a form, never answers self-identification (gender, race, veteran, disability) or consent questions, and never touches LinkedIn's or Naukri's own Easy Apply. Once the company's page thanks them, the application is added to their board, with an Undo.

## Build

```bash
bun run extension:build        # extension/dist/dev, extension/dist/prod and the store zip
bun extension/build.ts dev     # only the dev build
bun extension/build.ts prod    # only the store build and its zip
bun run extension:icons        # redraws store/icons from src/app/icon.svg (commit the PNGs)
```

- **Dev** (`dist/dev`) talks to `http://localhost:3314` (or `OTTO_DEV_ORIGIN=http://localhost:<port>`), keeps a source map and opens its shadow root so browser tests can reach the badge. Its manifest carries a public `key`, which pins the id to `noofbknlfdjpiihgeghjeoalkjlfafeb`; the dev server lets that id call `/api/extension/*`.
- **Store** (`dist/prod`, zipped to `dist/otto-for-chrome-<version>.zip`) talks to `https://www.ottosensei.com`, is minified and keeps its shadow root closed. The version comes from `extension/version.json`.

The build is Bun's own bundler: three IIFE bundles (`background.js`, `content.js`, `bridge.js`), with the app's pure modules from `src/lib` bundled in. Next never compiles this folder (the root `tsconfig.json` excludes it and `.vercelignore` leaves it out of deploys).

## Load it unpacked

1. Run the app on port 3314: `OTTO_PGLITE_DIR=<a scratch copy> node_modules/.bin/next dev -p 3314`.
2. `bun extension/build.ts dev`.
3. Open `chrome://extensions`, turn on **Developer mode** (top right), press **Load unpacked** and pick `extension/dist/dev`.
4. Chrome opens `/extension/connect`. Sign in there and it connects at once.
5. Open a job post (for example a LinkedIn job, a Greenhouse board or a Lever post). After a rebuild, press the reload arrow on the extension's card in `chrome://extensions`.

## Publish to the Chrome Web Store

1. Bump `extension/version.json`, then `bun run extension:build`.
2. In the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole), add a new item (first time) or a new package, and upload `extension/dist/otto-for-chrome-<version>.zip`.
3. Fill the listing from `extension/store/listing.md`, the privacy tab from `extension/store/privacy.md` (single purpose, permission justifications, data use) and the images from `extension/store/icons/` plus screenshots at 1280×800.
4. After the first upload the dashboard shows the extension's id. Add it to `STORE_EXTENSION_IDS` in `src/lib/extension/route.ts` (or set `OTTO_EXTENSION_IDS` in Vercel, comma-separated) and deploy, or the API refuses the published extension. Then submit for review.
5. Optional: copy the dashboard's public key (Package → View public key) into the dev manifest's `key` in `extension/manifest.ts`, so unpacked builds share the store id.

## What runs where

| File                | Where                                                                                            | What                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `src/content.ts`    | Job pages listed in `manifest.ts` (`JOB_MATCHES`), and any page the toolbar button is pressed on | Reads the post, runs the match in the page, draws the badge in a shadow root                                              |
| `src/bridge.ts`     | Otto's own site                                                                                  | Hands the connect page's token to the worker; asks for fresh match data after a visit to Otto                             |
| `src/background.ts` | Service worker                                                                                   | Keeps the token and match data in `chrome.storage.local`, calls `/api/extension/*`, opens Otto tabs                       |
| `src/page/`         | Content script                                                                                   | One reader per site (`sites/`), falling back from JSON-LD to the site's selectors to the page's largest block of text     |
| `src/match.ts`      | Content script                                                                                   | `src/lib/match-check` and `src/lib/eligibility`, run locally: the badge never sends the post anywhere                     |
| `src/forms/`        | Content script, on Greenhouse, Lever, Ashby and Workday forms                                    | Finds the questions, maps each to what fills it, fills with real input events, drafts, and watches for the thank-you page |

Supported sites: LinkedIn (`/jobs/view/*` and the search pane, `currentJobId`), Naukri, Indeed, Greenhouse (boards and the embed frame on company sites), Lever, Ashby, Workday, SmartRecruiters and Workable. On any other page the toolbar button reads a schema.org JobPosting, or asks the person to select the post's text. There is no `<all_urls>` permission: `activeTab` plus `scripting` covers that one tab.

## Fill with Otto

- `forms/platforms.ts`: where each platform's form lives, what holds one question, its submit buttons and thank-you pages. `formPlatformOf()` answers only for Greenhouse (boards and the embed frame), Lever, Ashby and Workday.
- `forms/scan.ts` reads every control into a question (label, hints, options, required, section, which repeated block); `forms/classify.ts` decides what answers it: a contact field, the current job, a line of work history or education, a saved answer, work rights for a country, the resume file, a question to write (Draft with Otto), a question to ask once, or one Otto must leave alone (self-identification and consent, never filled). `forms/plan.ts` turns that and the fill data into a value; all three are pure and tested on the saved forms in `fixtures/forms/`.
- `forms/apply.ts` fills in the page: the element's own value setter plus `input`, `change` and key events (Greenhouse opens its lists on key-up), list options picked by meaning, checkboxes only for "I currently work here", the PDF put on a `DataTransfer` on the file input. It never overwrites what the person typed and outlines what it filled.
- `forms/session.ts` runs a fill: `GET /api/extension/fill` (contacts and history from the resume to send: the copy tailored for this job if there is one, else the one picked in the badge), `GET /api/extension/resume-file` (that resume's PDF, drawn on the server by the app's own renderer and template), then the form. Questions with no saved answer are asked once in the card and saved (`POST /api/extension/answers`). On Workday it fills each next step as it appears, and never presses Next or Submit. On My Experience it presses each list's own Add (Work Experience, Education, and Websites where the step has it) until there is a panel per job, school and link on the resume, waits for each panel to show, then fills them; panels already there count, and what is typed in them stays (`forms/workday.ts`). The card's "Fill these yourself" names each required field still empty, the ones the resume has nothing for included.
- Lever's and Ashby's forms and Workday's steps don't show the post, so the content script reads it from the job's own page (same site) for the badge, drafts and the application.
- After a fill the tab is armed (`chrome.storage.session`, 6 hours). A press on the form's Submit and then its thank-you page (Greenhouse `/confirmation`, Lever `/thanks`, Ashby's and Workday's confirmation in the page) add the application (`POST /api/extension/applications`, idempotent by its id); Undo (`DELETE /api/extension/applications/<id>`) works for 30 minutes.

## Server side

- `/extension/connect` (page): signed in, it mints a token with `POST /api/account/extension` (session cookie, JSON only, same-site) and posts it to the bridge script with `window.postMessage`, checked against the page's own origin on both ends.
- Tokens (`src/lib/extension/tokens.ts`, table `extension_tokens`): 32 random bytes, stored as SHA-256 only, scope `extension`, 90-day sliding expiry (moved at most once a day), 10 browsers per account; the cleanup cron deletes expired ones. Disconnect from the Account page (`DELETE /api/account/extension`, every browser) or from the panel (`DELETE /api/extension/session`, this browser).
- Token routes (`src/lib/extension/route.ts`): `Authorization: Bearer` only, never cookies; an `Origin` that isn't an allowed extension is refused, and CORS answers only the extension's origin; rate-limited per account.
  - `GET /api/extension/profile[?known=<version>]`: resume text without contacts (up to 10, newest first, tailored copies left out), work profile, where they look, plan access, saved post keys. An unchanged version answers without reading any resume.
  - `POST /api/extension/posts`: saves a post (table `saved_posts`, one row per account and canonical link).
  - Fill with Otto, Pro and Max only (`fillRequired`, 402 `upgrade_required` otherwise): `GET /api/extension/fill?url=&resume=`, `GET /api/extension/resume-file?id=&size=A4|LETTER` (the server PDF needs `public/fonts/pdf`, traced into that function in `next.config.ts`), `GET`/`POST /api/extension/answers` (table `apply_answers`, one JSON object per account, a partial update per call, in the data export), `POST /api/extension/answer` (Draft with Otto: the app's own metered answer flow, `runMetered` with the token's account, so the same plan rule, allowance, burst limit and replay by request id apply), `POST /api/extension/applications` and `DELETE /api/extension/applications/<id>`.
- Saved posts show in To apply (`GET /api/saved-posts`), open in Tailor (`/studio?post=<id>[&resume=<id>]&start=1`) and Letter (`/dashboard/letters?post=<id>…&start=1`). Only `start=1`, sent by the extension's own buttons, starts a generation; without it the page waits for a press.
- Plan rules live in `src/lib/extension/plan.ts`: badge and Save for everyone, Tailor and Letter where the plan includes them (Free gets the app's own upgrade path), Fill with Otto (phase 2) Pro and Max only.

## Tests

`bunx vitest run extension src/lib/extension src/app/api/extension`. The readers run on saved pages in `fixtures/` through a small test-only DOM (`src/testing/mini-dom.ts`). Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable and the LinkedIn guest page are real public pages, trimmed. Signed-in LinkedIn, Naukri and Indeed can't be saved by a script, so those fixtures are written by hand from their current markup: try them signed in before each release.
