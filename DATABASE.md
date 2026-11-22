# Database

Postgres on Supabase in production, PGlite locally and in tests. `supabase/migrations` owns the schema (keys, CHECKs, RLS); `src/db/schema.ts` mirrors it for queries. Timestamps are epoch milliseconds (`bigint`) unless the column is a `date`.

Every table has row level security on with no policies (only the server connects, as the owner), a primary key, and, when it holds an account's data, a foreign key to `users` with `on delete cascade` (`inbound_handles`: `set null`, so a released address stays held). Deleting the account (`DELETE /api/account`) deletes the `users` row and the cascades take the rest. `src/db/tables.test.ts` lists every table with how deletion reaches it and which file of the data export (`src/lib/account/data-export.ts`) holds it, or why none does; a new table fails that test until it is listed.

Until `20261122010900_drop_merged_settings.sql` ships (after the release that reads `user_settings` is live), the seven old settings tables and `trial_watch` still exist, and a trigger on each copies the old app's writes into `user_settings`.

## Tables

Accounts and settings

- `users`: one row per Supabase Auth user: email copy, plan, billing ids and period.
- `user_settings`: one row per account, every column at its default until changed: where the person can work and Looking for, reminders and the weekly matches note, the old email lists' opt-outs, writing style, first-login setup, career log check-ins, Fill with Otto answers, and the last day active.
- `usage`: AI allowance counts per account, feature and period (`YYYY-MM`, `cycle:<start>`, `trial`), plus invite extras.
- `usage_passes`: a charged line fix's pass for its follow-up answers, minutes long.
- `metered_results`: a paid AI result replayed under the browser's request id for ten minutes.
- `rate_limits`: fixed-window abuse counters by device, address or email.

Resumes, applications and writing

- `resumes`: cloud backups of resumes (JSON).
- `resume_tombstones`: ids of deleted resumes, so another device can't bring one back.
- `applications`: tracked applications with status history, follow-up and interview dates, interview prep.
- `writings`: cover letters, application answers and outreach messages.
- `career_log_entries`: one career note per month.
- `notifications`: the bell.

Sharing

- `shares`: share links to a frozen copy of a resume.
- `portfolios`: the one portfolio page per account.
- `portfolio_redirects`: old portfolio addresses, 90 days.
- `referral_codes`, `referrals`: invite codes and who joined through them.
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

- `inbound_handles`, `inbound_addresses`, `inbound_emails`: the tracking addresses, each account's setup, and what Otto read in each job email.
- `extension_tokens`: hashes of Otto for Chrome sign-ins.
- `saved_posts`: job posts saved from the extension, with their text.
- `calendar_feeds`: the hash of the private calendar link's token.

Recap, billing and email records

- `active_days`, `weekly_recaps`: days active and built weekly recaps.
- `billing_events`: webhook ids already handled.
- `trial_history`: one SHA-256 of the email per person who trialed or paid, kept after deletion so a trial isn't taken twice.
- `trial_replacements`: trials replaced by a purchase, and their cancel retries.
- `trial_reminders`: which trial end was reminded.
- `email_log`: which one-time emails went out.

## How long rows are kept

The daily cleanup cron (`src/lib/cron/cleanup.ts`, 04:17 UTC) deletes in batches of 1,000. The jobs ingest and the recap code own their own deletes.

| Rows                                                                   | Kept                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `rate_limits`                                                          | 2 days                                                                |
| `usage_passes`, `metered_results`, `extension_tokens`                  | until they expire                                                     |
| `match_cache`                                                          | 1 day                                                                 |
| `match_events` impressions                                             | 30 days                                                               |
| `match_events` actions (open, save, tailor, applied, not a fit, asked) | 90 days                                                               |
| `notifications`                                                        | read: 90 days; unread: 1 year                                         |
| `email_log` tips                                                       | 90 days                                                               |
| `email_log` service notices                                            | 2 years (the record that a notice the terms promise went out)         |
| `trial_reminders`                                                      | 90 days after the trial's end                                         |
| `inbound_emails`                                                       | 180 days                                                              |
| `inbound_handles` released                                             | 90 days after release                                                 |
| `resume_tombstones`                                                    | 180 days                                                              |
| `portfolio_redirects`                                                  | until they expire (90 days)                                           |
| `usage`                                                                | 400 days after the period                                             |
| `billing_events`                                                       | 400 days                                                              |
| `active_days`, `weekly_recaps`                                         | about 10 weeks                                                        |
| `jobs`                                                                 | closed: 7 days, or 30 when saved or linked to an application (ingest) |
| `saved_jobs`                                                           | with their job                                                        |
| everything else                                                        | until the person deletes it or the account                            |
