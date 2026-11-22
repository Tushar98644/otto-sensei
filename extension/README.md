# Otto for Chrome

A Manifest V3 extension that meets job seekers on the pages where they read job posts. On a job post it shows a small Otto badge: the role and company, how many of the post's skills the person's resume has and which are missing, and whether they can take the job (place and work rights). Save puts the job in To apply on the Applications board with a copy of the post; Tailor and Letter open Otto on that saved job.

It never fills in or sends an application, never touches LinkedIn's or Naukri's own Easy Apply, and only reads job pages (see "What runs where").

## Build

```bash
bun run extension:build        # extension/dist/dev, extension/dist/prod and the store zip
bun extension/build.ts dev     # only the dev build
bun extension/build.ts prod    # only the store build and its zip
bun run extension:icons        # redraws store/icons from src/app/icon.svg (commit the PNGs)
```

- **Dev** (`dist/dev`) talks to `http://localhost:3314`, keeps a source map and opens its shadow root so browser tests can reach the badge. Its manifest carries a public `key`, which pins the id to `noofbknlfdjpiihgeghjeoalkjlfafeb`; the dev server lets that id call `/api/extension/*`.
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

| File                | Where                                                                                            | What                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/content.ts`    | Job pages listed in `manifest.ts` (`JOB_MATCHES`), and any page the toolbar button is pressed on | Reads the post, runs the match in the page, draws the badge in a shadow root                                          |
| `src/bridge.ts`     | Otto's own site                                                                                  | Hands the connect page's token to the worker; asks for fresh match data after a visit to Otto                         |
| `src/background.ts` | Service worker                                                                                   | Keeps the token and match data in `chrome.storage.local`, calls `/api/extension/*`, opens Otto tabs                   |
| `src/page/`         | Content script                                                                                   | One reader per site (`sites/`), falling back from JSON-LD to the site's selectors to the page's largest block of text |
| `src/match.ts`      | Content script                                                                                   | `src/lib/match-check` and `src/lib/eligibility`, run locally: the badge never sends the post anywhere                 |

Supported sites: LinkedIn (`/jobs/view/*` and the search pane, `currentJobId`), Naukri, Indeed, Greenhouse (boards and the embed frame on company sites), Lever, Ashby, Workday, SmartRecruiters and Workable. On any other page the toolbar button reads a schema.org JobPosting, or asks the person to select the post's text. There is no `<all_urls>` permission: `activeTab` plus `scripting` covers that one tab.

## Server side

- `/extension/connect` (page): signed in, it mints a token with `POST /api/account/extension` (session cookie, JSON only, same-site) and posts it to the bridge script with `window.postMessage`, checked against the page's own origin on both ends.
- Tokens (`src/lib/extension/tokens.ts`, table `extension_tokens`): 32 random bytes, stored as SHA-256 only, scope `extension`, 90-day sliding expiry (moved at most once a day), 10 browsers per account; the cleanup cron deletes expired ones. Disconnect from the Account page (`DELETE /api/account/extension`, every browser) or from the panel (`DELETE /api/extension/session`, this browser).
- Token routes (`src/lib/extension/route.ts`): `Authorization: Bearer` only, never cookies; an `Origin` that isn't an allowed extension is refused, and CORS answers only the extension's origin; rate-limited per account.
  - `GET /api/extension/profile[?known=<version>]`: resume text without contacts (up to 10, newest first, tailored copies left out), work profile, where they look, plan access, saved post keys. An unchanged version answers without reading any resume.
  - `POST /api/extension/posts`: saves a post (table `saved_posts`, one row per account and canonical link).
- Saved posts show in To apply (`GET /api/saved-posts`), open in Tailor (`/studio?post=<id>[&resume=<id>]&start=1`) and Letter (`/dashboard/letters?post=<id>…&start=1`). Only `start=1`, sent by the extension's own buttons, starts a generation; without it the page waits for a press.
- Plan rules live in `src/lib/extension/plan.ts`: badge and Save for everyone, Tailor and Letter where the plan includes them (Free gets the app's own upgrade path), Fill with Otto (phase 2) Pro and Max only.

## Tests

`bunx vitest run extension src/lib/extension src/app/api/extension`. The readers run on saved pages in `fixtures/` through a small test-only DOM (`src/testing/mini-dom.ts`). Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable and the LinkedIn guest page are real public pages, trimmed. Signed-in LinkedIn, Naukri and Indeed can't be saved by a script, so those fixtures are written by hand from their current markup: try them signed in before each release.

## Phase 2 hooks

- **Fill with Otto** goes in a new `src/forms/` module beside `src/page/`, one filler per ATS (Greenhouse, Lever, Ashby, Workday), reading saved answers and the resume file from a new token route. Its plan rule is already there: `access.fill`, Pro and Max only.
- **Applied after submitting**: a token route that creates an application with the saved post's link. The board already takes a saved post out of To apply once an application has its link.
