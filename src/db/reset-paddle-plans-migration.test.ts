import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";

const RESET = "20261120000100";
const PADDLE_CUSTOMER = "ctm_01m7ewg4gtc04daxv580v9wx3x";
const PADDLE_SUBSCRIPTION = "sub_01m7ewg5e4j3m5jp3yp8bqpnee";
const PADDLE_MAX_SUBSCRIPTION = "sub_01m7ewh2p9q8r7s6t5u4v3w2x1";
const DODO_CUSTOMER = "cus_Ab12Cd34Ef56Gh78Ij90";
const DODO_SUBSCRIPTION = "sub_Xy34Zw56Uv78St90Qr12";

describe("reset Paddle plans migration", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < RESET)) {
      await client.exec(migration.sql);
    }
  });

  const addUser = async (fields: Record<string, string | number | null>) => {
    const id = crypto.randomUUID();
    const email = `${id}@example.com`;
    await client.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    const columns = ["id", "email", "created_at", "updated_at", ...Object.keys(fields)];
    const values = [id, email, 1, 1, ...Object.values(fields)];
    const params = values.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `insert into public.users (${columns.join(", ")}) values (${params})`,
      values,
    );
    return id;
  };

  const addTrialRows = async (userId: string) => {
    await client.query(
      "insert into public.trial_reminders (user_id, trial_ends_at, created_at) values ($1, 9, 1)",
      [userId],
    );
    await client.query(
      "insert into public.trial_watch (user_id, trial_ends_at, seen_at) values ($1, 9, 1)",
      [userId],
    );
  };

  const rowOf = async (id: string) =>
    (
      await client.query<Record<string, unknown>>(
        `select plan, plan_interval, plan_status, plan_renews_at, trial_ends_at,
                plan_period_starts_at, plan_period_ends_at, billing_customer_id,
                billing_subscription_id, billing_event_at, updated_at
         from public.users where id = $1`,
        [id],
      )
    ).rows[0];

  const userIdsIn = async (table: "trial_reminders" | "trial_watch") =>
    (await client.query<{ user_id: string }>(`select user_id from public.${table}`)).rows
      .map((r) => r.user_id)
      .sort();

  const cleared = {
    plan: "free",
    plan_interval: null,
    plan_status: null,
    plan_renews_at: null,
    trial_ends_at: null,
    plan_period_starts_at: null,
    plan_period_ends_at: null,
    billing_customer_id: null,
    billing_subscription_id: null,
    billing_event_at: null,
  };

  it("moves Paddle accounts to Free, drops their trial rows and all trial history, and leaves Dodo, mock and hand-set plans alone", async () => {
    const trialist = await addUser({
      plan: "pro",
      plan_interval: "month",
      plan_status: "trialing",
      plan_renews_at: 9,
      trial_ends_at: 9,
      plan_period_starts_at: 1,
      plan_period_ends_at: 9,
      billing_customer_id: PADDLE_CUSTOMER,
      billing_subscription_id: PADDLE_SUBSCRIPTION,
      billing_event_at: 5,
    });
    await addTrialRows(trialist);
    const subscriptionOnly = await addUser({
      plan: "max",
      plan_interval: "year",
      plan_status: "past_due",
      billing_subscription_id: PADDLE_MAX_SUBSCRIPTION,
    });
    const customerOnly = await addUser({
      plan: "free",
      plan_status: "canceled",
      billing_customer_id: `ctm_${"b8".repeat(13)}`,
    });
    await client.query(
      "insert into public.trial_watch (user_id, trial_ends_at, seen_at) values ($1, 9, 1)",
      [customerOnly],
    );
    const dodo = await addUser({
      plan: "pro",
      plan_interval: "month",
      plan_status: "trialing",
      trial_ends_at: 9,
      billing_customer_id: DODO_CUSTOMER,
      billing_subscription_id: DODO_SUBSCRIPTION,
      billing_event_at: 5,
    });
    await addTrialRows(dodo);
    const mock = await addUser({
      plan: "pro",
      plan_status: "mock_trialing",
      trial_ends_at: 9,
      billing_customer_id: PADDLE_CUSTOMER.replace("ctm_01", "ctm_02"),
    });
    await addTrialRows(mock);
    const comp = await addUser({ plan: "max", plan_interval: "month" });
    const upper = await addUser({
      plan: "pro",
      plan_status: "active",
      billing_customer_id: PADDLE_CUSTOMER.toUpperCase(),
    });
    await client.query(
      `insert into public.trial_replacements (replaced_subscription_id, subscription_id, user_id, created_at)
       values ($1, $2, $3, 1), ($4, $4, $5, 1)`,
      [PADDLE_SUBSCRIPTION, PADDLE_MAX_SUBSCRIPTION, trialist, DODO_SUBSCRIPTION, dodo],
    );
    await client.query(
      `insert into public.trial_history (email_hash, kind, created_at)
       values ('hash-owner', 'trial', 1), ('hash-tester', 'paid', 1)`,
    );
    await client.query(
      "insert into public.billing_events (id, type, received_at) values ('evt_01m7ewg4', 'subscription.created', 1)",
    );

    const reset = migrations.find((m) => m.version === RESET);
    if (!reset) throw new Error(`missing migration ${RESET}`);
    expect(reset.transaction).toBe(true);
    await client.exec(reset.sql);

    for (const id of [trialist, subscriptionOnly, customerOnly]) {
      const row = await rowOf(id);
      expect(row).toMatchObject(cleared);
      expect(Number(row?.updated_at)).toBeGreaterThan(1);
    }
    expect(await rowOf(dodo)).toMatchObject({
      plan: "pro",
      plan_status: "trialing",
      trial_ends_at: 9,
      billing_customer_id: DODO_CUSTOMER,
      billing_subscription_id: DODO_SUBSCRIPTION,
      billing_event_at: 5,
      updated_at: 1,
    });
    expect(await rowOf(mock)).toMatchObject({
      plan: "pro",
      plan_status: "mock_trialing",
      updated_at: 1,
    });
    expect(await rowOf(comp)).toMatchObject({ plan: "max", plan_interval: "month", updated_at: 1 });
    expect(await rowOf(upper)).toMatchObject({ plan: "pro", plan_status: "active", updated_at: 1 });

    expect(await userIdsIn("trial_reminders")).toEqual([dodo, mock].sort());
    expect(await userIdsIn("trial_watch")).toEqual([dodo, mock].sort());
    const replacements = await client.query<{ replaced_subscription_id: string }>(
      "select replaced_subscription_id from public.trial_replacements",
    );
    expect(replacements.rows.map((r) => r.replaced_subscription_id)).toEqual([DODO_SUBSCRIPTION]);
    expect((await client.query("select * from public.trial_history")).rows).toEqual([]);
    expect((await client.query("select id from public.billing_events")).rows).toEqual([
      { id: "evt_01m7ewg4" },
    ]);
  });

  it("zeroes every account's trial usage so a new trial starts fresh, keeping invite extras and monthly counts", async () => {
    const paddleTrialist = await addUser({
      plan: "pro",
      plan_status: "trialing",
      trial_ends_at: 9,
      billing_customer_id: `ctm_${"c7".repeat(13)}`,
    });
    const creemTrialist = await addUser({ plan: "free" });
    const rows = [
      [paddleTrialist, "tailor", "trial", 10, 3],
      [paddleTrialist, "ai_tokens", "trial", 480_000, 0],
      [paddleTrialist, "tailor", "2026-11", 4, 1],
      [creemTrialist, "draft", "trial", 3, 2],
      [creemTrialist, "letter", "trial", 0, 5],
      [creemTrialist, "tailor", "cycle:2026-11-01T00:00:00.000Z", 7, 0],
    ] as const;
    for (const row of rows) {
      await client.query(
        "insert into public.usage (subject, feature, period, count, bonus) values ($1, $2, $3, $4, $5)",
        [...row],
      );
    }

    const reset = migrations.find((m) => m.version === RESET);
    if (!reset) throw new Error(`missing migration ${RESET}`);
    await client.exec(reset.sql);

    const after = await client.query<Record<string, unknown>>(
      "select subject, feature, period, count, bonus from public.usage where subject in ($1, $2)",
      [paddleTrialist, creemTrialist],
    );
    const expected = [
      [paddleTrialist, "tailor", "trial", 0, 3],
      [paddleTrialist, "ai_tokens", "trial", 0, 0],
      [paddleTrialist, "tailor", "2026-11", 4, 1],
      [creemTrialist, "draft", "trial", 0, 2],
      [creemTrialist, "letter", "trial", 0, 5],
      [creemTrialist, "tailor", "cycle:2026-11-01T00:00:00.000Z", 7, 0],
    ].map(([subject, feature, period, count, bonus]) => ({
      subject,
      feature,
      period,
      count,
      bonus,
    }));
    expect(after.rows).toHaveLength(expected.length);
    expect(after.rows).toEqual(expect.arrayContaining(expected));
  });
});
