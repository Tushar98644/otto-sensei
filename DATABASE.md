# Database

Postgres on Supabase in production, PGlite locally and in tests. `supabase/migrations` owns the schema (keys, CHECKs, RLS); `src/db/schema.ts` mirrors it for queries. Timestamps are epoch milliseconds (`bigint`) unless the column is a `date`.

Every table has row level security on with no policies (only the server connects, as the owner), a primary key, and, when it holds an account's data, a foreign key to `users` with `on delete cascade` (`inbound_handles`: `set null`, so a released address stays held). Deleting the account (`DELETE /api/account`) deletes the `users` row and the cascades take the rest. `src/db/tables.test.ts` lists every table with how deletion reaches it and which file of the data export (`src/lib/account/data-export.ts`) holds it, or why none does; a new table fails that test until it is listed.

Until `20261123100900_drop_merged_tables.sql` ships (after the release that reads `user_settings`, `metered_calls` and `billing_log` is live), the fourteen tables they replaced still exist, and a trigger on each copies the old app's writes into the new place.

## Tables

Accounts and settings

- `users`: one row per Supabase Auth user: email copy, plan, billing ids and period.
- `user_settings`: one row per account, every column at its default until changed: where the person can work and Looking for, reminders and the weekly matches note, the old email lists' opt-outs, writing style, first-login setup, career log check-ins, Fill with Otto answers, the last day active and the recap's days active and built weeks, the invite code and the invite the account joined through, the private calendar link's hash, the email-tracking setup, the last trial end reminded, the one-time notices emailed, and the ids of deleted resumes.
- `usage`: AI allowance counts per account, feature and period (`YYYY-MM`, `cycle:<start>`, `trial`), plus invite extras.
- `metered_calls`: short-lived rows of a charged AI call: a paid result replayed under the browser's request id for ten minutes (`result`), and a line fix's pass for its follow-up answers (`pass`).
- `rate_limits`: fixed-window abuse counters by device, address or email.
- `billing_log`: billing's do-it-once records: webhook ids and other handled keys (`event`), one SHA-256 of the email per person who trialed or paid, kept after deletion so a trial isn't taken twice (`trial`), and trials replaced by a purchase with their cancel retries (`replacement`).

Resumes, applications and writing

- `resumes`: cloud backups of resumes (JSON).
- `applications`: tracked applications with status history, follow-up and interview dates, interview prep.
- `writings`: cover letters, application answers and outreach messages.
- `career_log_entries`: one career note per month.
- `notifications`: the bell.

Sharing

- `shares`: share links to a frozen copy of a resume.
- `portfolios`: the one portfolio page per account.
- `portfolio_redirects`: old portfolio addresses, 90 days.
- `feedback`: feedback notes.

Jobs (not per account unless named)

- `jobs`: openings from public boards (capped at 150,000 rows).
- `job_boards`: each board and when it was last read.
- `job_skills`, `match_skills`: skill weights and small ids for ranking.
- `job_match`: the narrow copy of open jobs that ranking reads.
- `job_counts`: one row of counts from the last ingest.
- `company_visa`: companies on the UK and US visa registers.
- `saved_jobs`: jobs an account saved.
- `match_cache`: one page of an account's Matches, a day (unlogged).
- `match_events`: what Matches showed and what was done with it, to measure ranking.

Email tracking and the extension

- `inbound_handles`, `inbound_emails`: the tracking addresses (held 90 days after release, past account deletion) and what Otto read in each job email.
- `extension_tokens`: hashes of Otto for Chrome sign-ins.
- `saved_posts`: job posts saved from the extension, with their text.

## How long rows are kept

The daily cleanup cron (`src/lib/cron/cleanup.ts`, 04:17 UTC) deletes in batches of 1,000. The jobs ingest and the recap code own their own deletes.

| Rows                                                                   | Kept                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `rate_limits`                                                          | 2 days                                                                |
| `metered_calls`, `extension_tokens`                                    | until they expire                                                     |
| `match_cache`                                                          | 1 day                                                                 |
| `match_events` impressions                                             | 30 days                                                               |
| `match_events` actions (open, save, tailor, applied, not a fit, asked) | 90 days                                                               |
| `notifications`                                                        | read: 90 days; unread: 1 year                                         |
| `inbound_emails`                                                       | 180 days                                                              |
| `inbound_handles` released                                             | 90 days after release                                                 |
| `user_settings.deleted_resumes`                                        | 180 days, and the newest 1,000                                        |
| `user_settings.active_days`, `user_settings.recaps`                    | about 10 weeks                                                        |
| `portfolio_redirects`                                                  | until they expire (90 days)                                           |
| `usage`                                                                | 400 days after the period                                             |
| `billing_log` events                                                   | 400 days                                                              |
| `billing_log` trials                                                   | always (only an email hash)                                           |
| `jobs`                                                                 | closed: 7 days, or 30 when saved or linked to an application (ingest) |
| `saved_jobs`                                                           | with their job                                                        |
| everything else                                                        | until the person deletes it or the account                            |
