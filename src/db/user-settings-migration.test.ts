import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations, type MigrationFile } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const MERGE = "20261122010000";
const DROP = "20261122010900";
const OLD_TABLES = [
  "work_profiles",
  "notification_settings",
  "writing_styles",
  "account_setup",
  "career_log_settings",
  "apply_answers",
  "user_activity",
  "trial_watch",
];

describe("user settings migration", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  const file = (version: string): MigrationFile => {
    const migration = migrations.find((m) => m.version === version);
    if (!migration) throw new Error(`missing migration ${version}`);
    return migration;
  };
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < MERGE)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

  const addUser = async () => {
    const id = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@x.dev`]);
    await client.query(
      `insert into public.users (id, email, plan, created_at, updated_at) values ($1, $2, 'free', 1, 1)`,
      [id, `${id}@x.dev`],
    );
    return id;
  };

  const settingsOf = async (id: string) =>
    (
      await client.query<Record<string, unknown>>(
        "select * from public.user_settings where user_id = $1",
        [id],
      )
    ).rows[0];

  const snapshot = async () => {
    const tables: Record<string, unknown[]> = {};
    for (const table of OLD_TABLES) {
      tables[table] = (await client.query(`select * from public.${table} order by user_id`)).rows;
    }
    return tables;
  };

  it("copies every old row, keeps copying the old app's writes, and loses nothing when the old tables go", async () => {
    const ada = await addUser();
    const bo = await addUser();
    const cy = await addUser();
    const dee = await addUser();
    await client.query(
      `insert into public.work_profiles (user_id, country, time_zone, work_us, work_uk, work_eu, work_ca,
         full_time, contract, remote_only, target_title, target_family, target_occupation, target_level,
         target_place, created_at, updated_at)
       values ($1, 'PT', 'Europe/Lisbon', 'sponsorship', 'authorized', 'authorized', null, false, true, true,
         'Backend Engineer', 'engineering', '15-1252.00', 'senior', 'g:eu', 100, 110)`,
      [ada],
    );
    await client.query(
      `insert into public.notification_settings (user_id, email_reminders, follow_up_days, updated_at,
         job_emails, tip_emails, jobs_emailed_at, jobs_checked_at, job_prompt_closed_at, reminders_chosen,
         job_prompt_snoozed_at, reminder_prompt_snoozed_at, view_emails, view_prompt_closed_at,
         view_prompt_snoozed_at, views_emailed_at)
       values ($1, true, 21, 120, true, false, 200, 210, 5, true, 6, 220, true, 7, 8, 9)`,
      [ada],
    );
    // A row from before reminders_chosen existed: the column's old default says a choice was made.
    await client.query(
      "insert into public.notification_settings (user_id, email_reminders, updated_at) values ($1, false, 50)",
      [bo],
    );
    await client.query(
      `insert into public.writing_styles (user_id, tone, length, spelling, sign_off, notes, updated_at)
       values ($1, 'warm', 'shorter', 'uk', 'Cheers, Ada', 'No exclamation marks.', 130)`,
      [ada],
    );
    await client.query(
      `insert into public.account_setup (user_id, step_at, step_outcome, checklist_hidden_at, created_at,
         updated_at, defaults_at, looking_for_at, country_guess, country_from, region_guess)
       values ($1, 10, 'skipped', 11, 1, 140, 12, 13, 'PT', 'resume', 'eu')`,
      [ada],
    );
    await client.query(
      `insert into public.career_log_settings (user_id, checkins, emails, week, weekday, time_zone,
         next_checkin_on, paused_until, job_role, job_company, last_checkin_month, last_checkin_at,
         emailed_month, emailed_at, prompt_closed_at, prompt_snoozed_at, updated_at)
       values ($1, true, false, 5, 0, 'Asia/Kolkata', '2026-12-28', '2027-02-01', 'Staff Engineer', 'Stripe',
         '2026-11', 300, '2026-10', 301, 302, 303, 150)`,
      [ada],
    );
    await client.query(
      `insert into public.apply_answers (user_id, answers, updated_at)
       values ($1, '{"v":1,"noticePeriod":"2 weeks"}', 160)`,
      [ada],
    );
    await client.query(
      "insert into public.user_activity (user_id, active_on) values ($1, '2026-11-20'), ($2, '2026-11-21')",
      [ada, cy],
    );
    await client.query(
      "insert into public.trial_watch (user_id, trial_ends_at, seen_at) values ($1, 1, 1)",
      [cy],
    );
    const before = await snapshot();

    expect(file(MERGE).transaction).toBe(true);
    await client.exec(file(MERGE).sql);

    expect(await snapshot()).toEqual(before);
    expect(await settingsOf(ada)).toEqual({
      user_id: ada,
      updated_at: 160,
      country: "PT",
      time_zone: "Europe/Lisbon",
      work_us: "sponsorship",
      work_uk: "authorized",
      work_eu: "authorized",
      work_ca: null,
      full_time: false,
      contract: true,
      remote_only: true,
      target_title: "Backend Engineer",
      target_family: "engineering",
      target_occupation: "15-1252.00",
      target_level: "senior",
      target_place: "g:eu",
      work_updated_at: 110,
      email_reminders: true,
      follow_up_days: 21,
      reminders_chosen: true,
      reminder_prompt_snoozed_at: 220,
      jobs_noted_at: 200,
      jobs_checked_at: 210,
      job_emails: true,
      tip_emails: false,
      view_emails: true,
      writing_tone: "warm",
      writing_length: "shorter",
      writing_spelling: "uk",
      writing_sign_off: "Cheers, Ada",
      writing_notes: "No exclamation marks.",
      writing_updated_at: 130,
      setup_step_at: 10,
      setup_step_outcome: "skipped",
      checklist_hidden_at: 11,
      setup_defaults_at: 12,
      setup_looking_for_at: 13,
      country_guess: "PT",
      country_guess_from: "resume",
      region_guess: "eu",
      career_checkins: true,
      career_emails: false,
      career_week: 5,
      career_weekday: 0,
      career_time_zone: "Asia/Kolkata",
      career_next_on: new Date("2026-12-28T00:00:00.000Z"),
      career_paused_until: new Date("2027-02-01T00:00:00.000Z"),
      career_job_role: "Staff Engineer",
      career_job_company: "Stripe",
      career_last_month: "2026-11",
      career_last_at: 300,
      career_emailed_month: "2026-10",
      career_emailed_at: 301,
      career_prompt_closed_at: 302,
      career_prompt_snoozed_at: 303,
      apply_answers: { v: 1, noticePeriod: "2 weeks" },
      apply_answers_at: 160,
      active_on: new Date("2026-11-20T00:00:00.000Z"),
    });
    expect(await settingsOf(bo)).toMatchObject({
      updated_at: 50,
      email_reminders: false,
      follow_up_days: 7,
      reminders_chosen: true,
      tip_emails: true,
      work_updated_at: null,
      writing_updated_at: null,
      apply_answers: null,
      active_on: null,
      career_checkins: false,
      career_time_zone: "UTC",
    });
    expect(await settingsOf(cy)).toMatchObject({
      active_on: new Date("2026-11-21T00:00:00.000Z"),
      reminders_chosen: false,
      work_updated_at: null,
    });
    expect(await settingsOf(dee)).toBeUndefined();

    // The old app keeps writing its tables until the new code is live; every write reaches user_settings.
    await client.query(
      "update public.work_profiles set country = 'ES', time_zone = 'Europe/Madrid', updated_at = 500 where user_id = $1",
      [ada],
    );
    await client.query(
      "insert into public.writing_styles (user_id, tone, updated_at) values ($1, 'formal', 510)",
      [bo],
    );
    await client.query(
      "update public.user_activity set active_on = '2026-11-22' where user_id = $1",
      [cy],
    );
    await client.query(
      "insert into public.notification_settings (user_id, follow_up_days, reminders_chosen, updated_at) values ($1, 3, false, 520)",
      [dee],
    );
    await client.query(
      "update public.apply_answers set answers = '{\"v\":1}', updated_at = 530 where user_id = $1",
      [ada],
    );
    await client.query(
      "update public.career_log_settings set checkins = false, next_checkin_on = null, updated_at = 540 where user_id = $1",
      [ada],
    );
    await client.query(
      "update public.account_setup set checklist_hidden_at = null, updated_at = 550 where user_id = $1",
      [ada],
    );
    expect(await settingsOf(ada)).toMatchObject({
      country: "ES",
      time_zone: "Europe/Madrid",
      work_updated_at: 500,
      apply_answers: { v: 1 },
      apply_answers_at: 530,
      career_checkins: false,
      career_next_on: null,
      checklist_hidden_at: null,
      updated_at: 550,
      writing_tone: "warm",
    });
    expect(await settingsOf(bo)).toMatchObject({
      writing_tone: "formal",
      writing_updated_at: 510,
      reminders_chosen: true,
      updated_at: 510,
    });
    expect(await settingsOf(cy)).toMatchObject({ active_on: new Date("2026-11-22T00:00:00.000Z") });
    expect(await settingsOf(dee)).toMatchObject({
      follow_up_days: 3,
      reminders_chosen: false,
      updated_at: 520,
    });

    const kept = await client.query("select * from public.user_settings order by user_id");
    expect(file(DROP).transaction).toBe(true);
    await client.exec(file(DROP).sql);

    expect(
      (await client.query("select * from public.user_settings order by user_id")).rows,
    ).toEqual(kept.rows);
    const left = await client.query<{ name: string }>(
      `select relname as name from pg_class
       where relnamespace = 'public'::regnamespace and relname = any($1::text[])`,
      [OLD_TABLES],
    );
    expect(left.rows).toEqual([]);
    const functions = await client.query(
      "select proname from pg_proc where proname like 'user_settings_from_%'",
    );
    expect(functions.rows).toEqual([]);
    const rls = await client.query<{ on: boolean }>(
      "select relrowsecurity as on from pg_class where oid = 'public.user_settings'::regclass",
    );
    expect(rls.rows[0]?.on).toBe(true);

    // Account deletion still takes the row with it.
    await client.query("delete from public.users where id = $1", [ada]);
    expect(await settingsOf(ada)).toBeUndefined();
  });
});
