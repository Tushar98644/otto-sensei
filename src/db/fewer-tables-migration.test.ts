import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const FIRST = "20261123100000";
const LAST = "20261123100600";
const DROP = "20261123100900";
const OLD_TABLES = [
  "active_days",
  "weekly_recaps",
  "referral_codes",
  "referrals",
  "calendar_feeds",
  "inbound_addresses",
  "trial_reminders",
  "email_log",
  "resume_tombstones",
  "metered_results",
  "usage_passes",
  "billing_events",
  "trial_history",
  "trial_replacements",
];

describe("fewer tables migrations", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < FIRST)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

  const run = (sql: string, params: unknown[] = []) => client.query(sql, params);
  const addUser = async () => {
    const id = crypto.randomUUID();
    await run("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@x.dev`]);
    await run(
      "insert into public.users (id, email, plan, created_at, updated_at) values ($1, $2, 'free', 1, 1)",
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
  const rows = async (sql: string) => (await client.query<Record<string, unknown>>(sql)).rows;
  const snapshot = async () => {
    const tables: Record<string, unknown[]> = {};
    for (const table of OLD_TABLES)
      tables[table] = await rows(`select * from public.${table} order by 1, 2`);
    return tables;
  };

  it("copies every row of the fourteen tables, keeps copying the old app's writes, and loses nothing when they go", async () => {
    const ada = await addUser();
    const bo = await addUser();
    const cy = await addUser();
    const hash = "a".repeat(43);

    await run(
      "insert into public.active_days (user_id, day) values ($1, '2026-11-10'), ($1, '2026-11-02'), ($1, '2026-11-12')",
      [ada],
    );
    await run(
      `insert into public.weekly_recaps (user_id, week_start, data, built_at, seen_at)
       values ($1, '2026-11-09', '{"week": "2026-11-09", "quiet": false}', 100, 150),
              ($1, '2026-11-16', '{"week": "2026-11-16", "quiet": true}', 200, null)`,
      [ada],
    );
    await run(
      "insert into public.referral_codes (user_id, code, device_ids, created_at) values ($1, 'abcd2345', '{d1,d2}', 300)",
      [ada],
    );
    await run(
      `insert into public.referrals (referred_id, referrer_id, status, device_id, rewarded_period, rewarded_at, created_at)
       values ($1, $2, 'rewarded', 'd9', '2026-11', 320, 310)`,
      [bo, ada],
    );
    await run(
      `insert into public.referrals (referred_id, referrer_id, status, blocked_reason, device_id, created_at)
       values ($1, $2, 'blocked', 'same_device', 'd1', 330)`,
      [cy, ada],
    );
    await run(
      "insert into public.calendar_feeds (user_id, feed_id, token_hash, created_at) values ($1, $2, $3, 400)",
      [ada, crypto.randomUUID(), hash],
    );
    await run(
      `insert into public.inbound_addresses (user_id, created_at, confirm_code, confirm_url, confirm_source, confirm_at,
         confirmed_at, sources, test_at, last_email_at)
       values ($1, 500, '123456', 'https://mail.google.com/x', 'bo@gmail.com', 510, 520, '{bo@gmail.com}', 530, 540)`,
      [bo],
    );
    await run(
      "insert into public.trial_reminders (user_id, trial_ends_at, created_at) values ($1, 600, 1), ($1, 700, 2)",
      [ada],
    );
    await run(
      `insert into public.email_log (user_id, kind, occasion, created_at)
       values ($1, 'processor_notice', 'paddle_to_dodo', 800), ($2, 'no_resume', 'once', 810)`,
      [ada, bo],
    );
    await run(
      "insert into public.resume_tombstones (user_id, id, deleted_at) values ($1, 'r1', 900), ($1, 'r2', 910)",
      [ada],
    );
    await run(
      `insert into public.metered_results (user_id, request_key, result, demo, started_at, expires_at)
       values ($1, 'req-1', '{"lines": 3}', true, 1000, 1600)`,
      [ada],
    );
    await run(
      `insert into public.usage_passes (user_id, feature, subject, uses_left, expires_at)
       values ($1, 'fix', 'line-1', 2, 1700)`,
      [ada],
    );
    await run(
      "insert into public.billing_events (id, type, received_at) values ('evt_1', 'subscription.active', 1100), ('ended:sub_1', 'subscription_ended', 1110)",
    );
    await run(
      "insert into public.trial_history (email_hash, kind, created_at) values ($1, 'trial', 1200)",
      ["e".repeat(64)],
    );
    await run(
      `insert into public.trial_replacements (replaced_subscription_id, subscription_id, user_id, attempts, created_at)
       values ('sub_old', 'sub_new', $1, 1, 1300)`,
      [bo],
    );
    const before = await snapshot();

    for (const migration of migrations.filter((m) => m.version >= FIRST && m.version <= LAST)) {
      await client.exec(migration.sql);
    }

    expect(await snapshot()).toEqual(before);
    expect(await settingsOf(ada)).toMatchObject({
      active_days: [
        new Date("2026-11-02T00:00:00.000Z"),
        new Date("2026-11-10T00:00:00.000Z"),
        new Date("2026-11-12T00:00:00.000Z"),
      ],
      recaps: {
        "2026-11-09": { data: { week: "2026-11-09", quiet: false }, builtAt: 100, seenAt: 150 },
        "2026-11-16": { data: { week: "2026-11-16", quiet: true }, builtAt: 200, seenAt: null },
      },
      referral_code: "abcd2345",
      referral_device_ids: ["d1", "d2"],
      referral_code_at: 300,
      referred_by: null,
      calendar_token_hash: hash,
      calendar_feed_at: 400,
      trial_reminded_for: 700,
      notices: { "processor_notice:paddle_to_dodo": 800 },
      notice_sent_at: 800,
      deleted_resumes: { r1: 900, r2: 910 },
      tracking_at: null,
    });
    expect(await settingsOf(bo)).toMatchObject({
      referred_by: ada,
      referral_status: "rewarded",
      referral_blocked_reason: null,
      referral_device_id: "d9",
      referral_rewarded_period: "2026-11",
      referral_rewarded_at: 320,
      referred_at: 310,
      tracking_at: 500,
      tracking_confirm_code: "123456",
      tracking_confirm_url: "https://mail.google.com/x",
      tracking_confirm_source: "bo@gmail.com",
      tracking_confirm_at: 510,
      tracking_confirmed_at: 520,
      tracking_sources: ["bo@gmail.com"],
      tracking_test_at: 530,
      tracking_last_email_at: 540,
      notices: { "no_resume:once": 810 },
      active_days: [],
      recaps: null,
    });
    expect(await settingsOf(cy)).toMatchObject({
      referred_by: ada,
      referral_status: "blocked",
      referral_blocked_reason: "same_device",
    });
    expect(await rows("select * from public.metered_calls order by kind")).toEqual([
      {
        user_id: ada,
        kind: "pass",
        key: "fix:line-1",
        result: null,
        demo: false,
        started_at: null,
        uses_left: 2,
        expires_at: 1700,
      },
      {
        user_id: ada,
        kind: "result",
        key: "req-1",
        result: { lines: 3 },
        demo: true,
        started_at: 1000,
        uses_left: null,
        expires_at: 1600,
      },
    ]);
    expect(await rows("select * from public.billing_log order by kind, key")).toEqual([
      {
        kind: "event",
        key: "ended:sub_1",
        user_id: null,
        ref: "subscription_ended",
        attempts: 0,
        at: 1110,
        done_at: null,
      },
      {
        kind: "event",
        key: "evt_1",
        user_id: null,
        ref: "subscription.active",
        attempts: 0,
        at: 1100,
        done_at: null,
      },
      {
        kind: "replacement",
        key: "sub_old",
        user_id: bo,
        ref: "sub_new",
        attempts: 1,
        at: 1300,
        done_at: null,
      },
      {
        kind: "trial",
        key: "e".repeat(64),
        user_id: null,
        ref: "trial",
        at: 1200,
        attempts: 0,
        done_at: null,
      },
    ]);

    // The old app keeps writing its tables until the new code is live; every write reaches the new places.
    await run("insert into public.active_days (user_id, day) values ($1, '2026-11-20')", [cy]);
    await run(
      "update public.weekly_recaps set seen_at = 250 where user_id = $1 and week_start = '2026-11-16'",
      [ada],
    );
    await run("update public.referral_codes set device_ids = '{d2,d3}' where user_id = $1", [ada]);
    await run("update public.referrals set status = 'capped' where referred_id = $1", [bo]);
    await run(
      "insert into public.calendar_feeds (user_id, feed_id, token_hash, created_at) values ($1, $2, $3, 410)",
      [bo, crypto.randomUUID(), "b".repeat(43)],
    );
    await run("update public.inbound_addresses set last_email_at = 550 where user_id = $1", [bo]);
    await run(
      "insert into public.trial_reminders (user_id, trial_ends_at, created_at) values ($1, 650, 3)",
      [cy],
    );
    await run("delete from public.email_log where user_id = $1", [ada]);
    await run("delete from public.resume_tombstones where user_id = $1 and id = 'r1'", [ada]);
    await run(
      "insert into public.resume_tombstones (user_id, id, deleted_at) values ($1, 'r3', 920)",
      [bo],
    );
    await run("update public.metered_results set result = '{\"lines\": 4}' where user_id = $1", [
      ada,
    ]);
    await run("delete from public.usage_passes where user_id = $1", [ada]);
    await run(
      "insert into public.billing_events (id, type, received_at) values ('refund:pay_1', 'trial_refund', 1400)",
    );
    await run("delete from public.billing_events where id = 'evt_1'");
    await run(
      "update public.trial_replacements set cancelled_at = 1500, attempts = 2 where replaced_subscription_id = 'sub_old'",
    );
    await run(
      "insert into public.trial_history (email_hash, kind, created_at) values ($1, 'paid', 1250)",
      ["f".repeat(64)],
    );

    expect(await settingsOf(cy)).toMatchObject({
      active_days: [new Date("2026-11-20T00:00:00.000Z")],
      trial_reminded_for: 650,
    });
    expect(await settingsOf(ada)).toMatchObject({
      referral_device_ids: ["d2", "d3"],
      notices: {},
      deleted_resumes: { r2: 910 },
      recaps: { "2026-11-16": { seenAt: 250 } },
    });
    expect(await settingsOf(bo)).toMatchObject({
      referral_status: "capped",
      calendar_token_hash: "b".repeat(43),
      tracking_last_email_at: 550,
      deleted_resumes: { r3: 920 },
    });
    expect(await rows("select kind, key, result from public.metered_calls")).toEqual([
      { kind: "result", key: "req-1", result: { lines: 4 } },
    ]);
    expect(
      await rows("select kind, key, attempts, done_at from public.billing_log order by kind, key"),
    ).toEqual([
      { kind: "event", key: "ended:sub_1", attempts: 0, done_at: null },
      { kind: "event", key: "refund:pay_1", attempts: 0, done_at: null },
      { kind: "replacement", key: "sub_old", attempts: 2, done_at: 1500 },
      { kind: "trial", key: "e".repeat(64), attempts: 0, done_at: null },
      { kind: "trial", key: "f".repeat(64), attempts: 0, done_at: null },
    ]);

    // Deleting the inviter ends the invite, as deleting its row did; the friend's own settings stay.
    await run("delete from public.users where id = $1", [ada]);
    expect(await settingsOf(bo)).toMatchObject({ referred_by: null, tracking_at: 500 });
    expect(await settingsOf(ada)).toBeUndefined();
    expect(await rows("select key from public.metered_calls")).toEqual([]);

    const keptSettings = await rows("select * from public.user_settings order by user_id");
    const keptCalls = await rows("select * from public.metered_calls");
    const keptLog = await rows("select * from public.billing_log order by kind, key");
    const drop = migrations.find((m) => m.version === DROP);
    expect(drop?.transaction).toBe(true);
    await client.exec(drop!.sql);

    expect(await rows("select * from public.user_settings order by user_id")).toEqual(keptSettings);
    expect(await rows("select * from public.metered_calls")).toEqual(keptCalls);
    expect(await rows("select * from public.billing_log order by kind, key")).toEqual(keptLog);
    const left = await client.query(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relname = any($1::text[])",
      [OLD_TABLES],
    );
    expect(left.rows).toEqual([]);
    expect(
      await rows(
        "select proname from pg_proc where proname like '%_from_%' and pronamespace = 'public'::regnamespace",
      ),
    ).toEqual([]);
    const rls = await rows(
      "select relname, relrowsecurity from pg_class where relname in ('metered_calls', 'billing_log') order by 1",
    );
    expect(rls).toEqual([
      { relname: "billing_log", relrowsecurity: true },
      { relname: "metered_calls", relrowsecurity: true },
    ]);
  });
});
