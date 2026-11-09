# Job sources

Where the Jobs tab and `/jobs` get their openings, what each source's terms allow, and why some were left out. Checked on 2026-11-08. Re-check a source's terms before changing how its jobs are used.

Rules that apply to every source we use:

- Only public, documented APIs that need no login, no key and no bot check. Never LinkedIn, Indeed, Glassdoor, or anything behind a login or a challenge page.
- robots.txt is respected (each host's file was read; none disallows the paths we call, and Lever's `Crawl-delay: 1` is honored).
- Every job names its source ("via Greenhouse") and links to the original posting. That link is a normal followed link (`rel="noopener"`, no `nofollow`).
- Reads go through the app's SSRF-safe transport (`src/lib/jobs/fetch.ts`), say who we are (`OttoResumeBot/1.0`), send no cookies, and keep a per-host pace (`HOST_SPACING_MS` in `src/lib/job-feed/ingest.ts`).
- Matching is rule-based on our own server. Job text never goes to the AI unless the person presses "Tailor my resume", which is the same as pasting the link themselves.
- JobPosting structured data (`/jobs/[id]`) only where the terms allow republishing; every other job only links out.

## Used

| Source | Endpoint | Terms | What they allow | How we use it |
|---|---|---|---|---|
| **Greenhouse Job Board API** | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | [docs.greenhouse.io/job-board.html](https://docs.greenhouse.io/job-board.html) | "Job Board data is publicly available, so authentication is not required for any GET endpoints." No rate limit or reuse restriction is stated; the API exists so job boards can be built on it. robots.txt only disallows `/embed/`. | Seed list of company boards, read whole daily. Own page with JSON-LD on `/jobs/[id]`. |
| **Lever Postings API** | `api.lever.co/v0/postings/{company}?mode=json` | [github.com/lever/postings-api](https://github.com/lever/postings-api) | "This API is designed to help you create a job site." Published postings "may be scraped by third parties." robots.txt: `Allow: /`, `Crawl-delay: 1`. | Seed list, read daily, 1 request a second at most. Own page with JSON-LD. |
| **Ashby public job posting API** | `api.ashbyhq.com/posting-api/job-board/{org}` | [developers.ashbyhq.com/docs/public-job-posting-api](https://developers.ashbyhq.com/docs/public-job-posting-api) | Public, no auth, "all currently published Job Postings" for an organization; no restriction on consumers stated. `isListed: false` jobs are for people with the link only. | Seed list, read daily; unlisted jobs skipped. Own page with JSON-LD. |
| **Himalayas jobs API** | `himalayas.app/jobs/api?limit=20&cursor=…` | [himalayas.app/api](https://himalayas.app/api), [terms clause 113](https://himalayas.app/terms) | Personal and commercial use on sites and apps you operate, without asking. Must: use `applicationLink` unchanged for every Apply, credit Himalayas with a visible link, remove expired jobs, stay within limits (keyless calls share one public allowance; data refreshes daily). Must not: pass jobs to other job boards, aggregators, job search engines, Google Jobs or LinkedIn Jobs, including via feeds or JobPosting structured data. | The newest 200 jobs once a day (10 pages). "Open job" goes to `applicationLink`. No `/jobs/[id]` page and no JSON-LD. Jobs close at `expiryDate` or 30 days after posting. |
| **Remote OK API** | `remoteok.com/api` | The API's own `legal` field; robots.txt | "Please link back (with follow, and without nofollow!) to the URL on Remote OK and mention Remote OK as a source." Don't use the Remote OK logo; do use the name. robots.txt allows `/` for all agents (`Content-Signal: search=yes, ai-train=no`). | The latest ~100 jobs once a day. "Open job" is the job's Remote OK page as a followed link, credited "via Remote OK". No JSON-LD (not granted). Jobs close 30 days after posting. |

### The seed list

`src/lib/job-feed/seeds.ts`: **323 company boards** (157 Greenhouse, 27 Lever, 139 Ashby). Every token was requested once on 2026-11-08 and had at least one open job; names were taken from the board itself where it gives one. False hits were removed by hand (a "ramp" board that isn't Ramp, an "archer" that is a vet clinic). Left out on purpose: boards of mostly on-site manufacturing roles that need US citizenship (SpaceX, Anduril, Rocket Lab, Relativity Space, Lucid Motors), which would crowd out everything else.

To add a company: find its board token in its careers page links (`boards.greenhouse.io/<token>`, `jobs.lever.co/<token>`, `jobs.ashbyhq.com/<token>`), check the API answers with jobs, add a line to `seeds.ts`. A board removed from the file has its jobs closed on the next run.

## Evaluated and dropped

| Source | Why not |
|---|---|
| **Remotive API** (`remotive.com/api/remote-jobs`) | Its terms say "Displaying our jobs in order to collect signups/email addresses to show a listing constitutes a breach of our terms of services." The matched Jobs tab is behind a free sign-in, so using Remotive there would break that. Its jobs are also delayed 24 hours. [github.com/remotive-com/remote-jobs-api](https://github.com/remotive-com/remote-jobs-api) |
| **Arbeitnow API** (`arbeitnow.com/api/job-board-api`) | The API asks for a link back and points to its terms of service, and those terms license the site's materials for "personal, non-commercial transitory viewing only" and forbid "any public display". Otto Sensei is commercial, so the permission is unclear. Most of its jobs are also copies of Greenhouse and other boards we already read directly. [arbeitnow.com/terms](https://www.arbeitnow.com/terms) |
| **Hacker News "Who is hiring" via the Algolia API** | Y Combinator's terms forbid copying, distributing or making commercial use of site content without permission, and the poster's license goes to Y Combinator, not to us. The official HN API's repository is MIT-licensed code, not a data license. The posts are also free text, so company, title and location would be guesses. [ycombinator.com/legal](https://www.ycombinator.com/legal/) |
| **LinkedIn, Indeed, Glassdoor** | Login walls and bot checks; their terms forbid automated access. Excluded by the brief. |

## Limits we keep

| What | Where | Value |
|---|---|---|
| Jobs kept per company board (newest first) | `STORE_LIMITS.perBoard` | 200 |
| Rows in `jobs`, open and closed | `STORE_LIMITS.maxRows` | 50,000 (was 20,000, which trimmed open jobs once the boards held 27,833); about 290 MB at 5.9 KB a row |
| Stored text per job | `JOB_LIMITS.descriptionChars` | 6,000 characters |
| Closed after missing from | `STORE_LIMITS.missedRunsToClose` | 2 reads of its board in a row |
| Closed jobs deleted after | `STORE_LIMITS.closedRetentionMs` | 30 days |
| Feed jobs close at | `STORE_LIMITS.feedMaxAgeMs` | their own end date, or 30 days after posting |
| A board is read again after | `INGEST_LIMITS.refreshAfterMs` | 20 hours |
| Openings one match request ranks | `CANDIDATE_POOL` | the best 300 by skill-weighted overlap, out of every open job |
| Hidden from Matches (still on `/jobs`) | `isFillerTitle`, `EVERGREEN_AFTER_MS` | "General application", "Talent community" and similar posts, and posts open 120+ days |
