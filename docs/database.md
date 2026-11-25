# Database

Postgres on Supabase in production, PGlite locally and in tests. `supabase/migrations` owns the schema (keys, CHECKs, RLS); `src/db/schema.ts` mirrors it for queries. Timestamps are epoch milliseconds (`bigint`) unless the column is a `date`.

Every table has row level security on with no policies (only the server connects, as the owner), a primary key, and, when it holds an account's data, a foreign key to `users` with `on delete cascade` (`inbound_handles`: `set null`, so a released address stays held). Deleting the account (`DELETE /api/account`) deletes the `users` row and the cascades take the rest. `src/db/tables.test.ts` lists every table with how deletion reaches it and which file of the data export (`src/lib/account/data-export.ts`) holds it, or why none does; a new table fails that test until it is listed.

## Tables

Accounts and settings

- `users`: one row per Supabase Auth user: email copy, plan, billing ids and period, and the prepaid credit balance in cents (`credit_cents`, beside the plan so a spend takes the same row lock).
- `user_settings`: one row per account, every column at its default until changed: where the person can work and Looking for, reminders and the weekly matches note, the old email lists' opt-outs, writing style, first-login setup, career log check-ins, Fill with Otto answers, the last day active and the recap's days active and built weeks, the invite code and the invite the account joined through, the private calendar link's hash, the email-tracking setup, the last trial end reminded, the one-time notices emailed, the ids of deleted resumes, the app's language, the job post languages Looking for keeps, and up to five job alerts (`job_alerts`: saved searches the bell watches, with a city but never a point; `src/lib/job-feed/alerts.ts`).
- `usage`: AI allowance counts per account, feature and period (`YYYY-MM`, `cycle:<start>`, `trial`), plus invite extras.
- `metered_calls`: short-lived rows of a charged AI call: a paid result replayed under the browser's request id for ten minutes (`result`), and a line fix's pass for its follow-up answers (`pass`).
- `rate_limits`: fixed-window abuse counters by device, address or email.
- `billing_log`: billing's do-it-once records: webhook ids and other handled keys (`event`), one SHA-256 of the email per person who trialed or paid, kept after deletion so a trial isn't taken twice (`trial`), and trials replaced by a purchase with their cancel retries (`replacement`). It is also the prepaid credit ledger, in `cents`: a credit checkout started (`topup_checkout`), a credited payment (`topup`, keyed by payment id), credit a refund or lost dispute took back (`topup_back`), and credit spent on an AI action (`credit_spend`, with its feature). The ledger rows go with the account and are in the data export's `credit.json`.

Resumes, applications and writing

- `resumes`: cloud backups of resumes (JSON).
- `applications`: tracked applications with status history, follow-up and interview dates, interview prep, and a snapshot of the linked job (`job`) that shows once the job is gone.
- `writings`: cover letters, application answers and outreach messages.
- `career_log_entries`: one career note per month.
- `notifications`: the bell.

Sharing

- `shares`: share links to a frozen copy of a resume.
- `portfolios`: the one portfolio page per account, with its old addresses (`old_slugs`, the newest five, 90 days each).
- `feedback`: feedback notes.

Jobs (not per account unless named)

- `listings`: one compact row per open job (capped at 150,000 rows; about 240 bytes each with its key). A closed job is deleted at once. No column is null and no post text is kept: numbers and codes stand for what repeats (`src/lib/job-feed/codes.ts`): the id is the board in the top bits and a hash of the board's own job id (so one board is one key range, and a job that closes and comes back keeps its id; the app shows it in a UUID's shape), times are minutes since 1970, level, kind and occupation are small codes, `flags` holds remote, general application, the job type, the post's language (bits 9-11, 0 when not known) and what the last rebuild marked (lead of its opening, copy, opening remote), the link is rebuilt from the board's `url_template` unless the job keeps its own, the title is a `titles` key (`title_text` only when this job writes it otherwise), skills are `skills.sid` values, `places` are the countries and regions it can be taken from, and `facts` are its work-rights facts in about 13 bytes (`src/lib/eligibility/facts.ts`), and `city` is the GeoNames id of the first city its location names (`src/lib/geo`, 0 for none; 4 bytes). Feeds whose posts can't be read again (Himalayas, Remote OK) keep up to 6,000 characters in `post`.
- `job_boards`: each board, its small `id` for `listings.board`, its link pattern and when it was last read.
- `companies`: one row per board and stored company name (`listings.company`, "" for the board's own), each carrying its whole company's facts: display name, the city most of its open jobs name, open jobs, how many are remote or hybrid, and when its newest job was posted or read. Rebuilt with the match index, writing only rows that changed (`src/lib/job-feed/companies.ts`); a few thousand rows, under 1 MB.
- `titles`: one row per way a job title is written (`titleVectorKey`): its text, its 64-byte meaning code (`src/lib/job-feed/title-code.ts`), filled by the daily title vectors workflow, and its nearest occupation.
- `skills`: each skill that posts name, with the small id listings store for it (given once, never changed) and its rarity weight while open posts name it.
- `job_counts`: one row of counts from the last ingest.
- `company_visa`: companies on the UK and US visa registers.
- `saved_jobs`: jobs an account saved, each with a snapshot of the job (`job`) that shows once the job is gone.
- `match_cache`: one page of an account's Matches, a day. Unlogged, so keeping a page writes no WAL; in a logged table each page (about 6 KB stored) would write 7-25 KB of WAL.
- `match_events`: what Matches showed and what was done with it, to measure ranking.

Email tracking and the extension

- `inbound_handles`, `inbound_emails`: the tracking addresses (held 90 days after release, past account deletion) and what Otto read in each job email.
- `extension_tokens`: hashes of Otto for Chrome sign-ins.
- `saved_posts`: job posts saved from the extension, with their text.

## How long rows are kept

The daily cleanup (`src/lib/cron/cleanup.ts`, called once a day by `.github/workflows/daily.yml`) deletes in batches of 1,000. The jobs ingest and the recap code own their own deletes.

| Rows                                                                   | Kept                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `rate_limits`                                                          | 2 days                                                              |
| `metered_calls`, `extension_tokens`                                    | until they expire                                                   |
| `match_cache`                                                          | 1 day                                                               |
| `match_events` impressions                                             | 30 days                                                             |
| `match_events` actions (open, save, tailor, applied, not a fit, asked) | 90 days                                                             |
| `notifications`                                                        | read: 90 days; unread: 1 year                                       |
| `inbound_emails`                                                       | 180 days                                                            |
| `inbound_handles` released                                             | 90 days after release                                               |
| `user_settings.deleted_resumes`                                        | 180 days, and the newest 1,000                                      |
| `user_settings.active_days`, `user_settings.recaps`                    | about 10 weeks                                                      |
| `portfolios.old_slugs`                                                 | until they expire (90 days)                                         |
| `usage`                                                                | 400 days after the period                                           |
| `billing_log` events                                                   | 400 days                                                            |
| `billing_log` trials                                                   | always (only an email hash)                                         |
| `billing_log` credit checkouts                                         | 30 days                                                             |
| `billing_log` credit spends                                            | 400 days                                                            |
| `billing_log` top-ups and take-backs                                   | until the account is deleted                                        |
| `listings`                                                             | while open: deleted when it closes (ingest)                         |
| `titles`                                                               | while a listing carries it, or 30 days after a person last chose it |
| `companies`                                                            | while it has an open job (each match index rebuild)                 |
| `skills`                                                               | always (a few hundred rows; `listings` holds their ids)             |
| `saved_jobs`                                                           | until the person removes it, with its snapshot once the job is gone |
| everything else                                                        | until the person deletes it or the account                          |
