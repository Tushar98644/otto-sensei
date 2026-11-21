import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const RESET = "20261116000200";
const PADDLE_CUSTOMER = "ctm_01m7ewg4gtc04daxv580v9wx3x";
const PADDLE_SUBSCRIPTION = "sub_01m7ewg5e4j3m5jp3yp8bqpnee";

describe("reset Creem plans migration", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < RESET)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

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

  const rowOf = async (id: string) =>
    (
      await client.query<Record<string, unknown>>(
        `select plan, plan_interval, plan_status, billing_customer_id, billing_subscription_id,
                billing_event_at, trial_ends_at from public.users where id = $1`,
        [id],
      )
    ).rows[0];

  it("moves Creem accounts to Free and leaves Paddle, mock and hand-set plans alone", async () => {
    const creem = await addUser({
      plan: "max",
      plan_interval: "year",
      plan_status: "active",
      billing_customer_id: "cust_3kKw0VQ8bY1lN3m9",
      billing_subscription_id: "sub_creem_max",
      billing_event_at: 5,
      trial_ends_at: 9,
    });
    const creemFree = await addUser({ plan: "free", billing_customer_id: "cust_7aa" });
    const paddle = await addUser({
      plan: "pro",
      plan_interval: "month",
      plan_status: "active",
      billing_customer_id: PADDLE_CUSTOMER,
      billing_subscription_id: PADDLE_SUBSCRIPTION,
    });
    const mock = await addUser({
      plan: "pro",
      plan_status: "mock_active",
      billing_customer_id: "cust_x",
    });
    const comp = await addUser({ plan: "max", plan_interval: "month" });
    await client.query(
      `insert into public.trial_replacements (replaced_subscription_id, subscription_id, user_id, created_at)
       values ('sub_creem_trial', 'sub_creem_max', $1, 1), ($2, $2, $3, 1)`,
      [creem, PADDLE_SUBSCRIPTION, paddle],
    );

    const reset = migrations.find((m) => m.version === RESET);
    if (!reset) throw new Error(`missing migration ${RESET}`);
    await client.exec(reset.sql);

    expect(await rowOf(creem)).toMatchObject({
      plan: "free",
      plan_interval: null,
      plan_status: null,
      billing_customer_id: null,
      billing_subscription_id: null,
      billing_event_at: null,
      trial_ends_at: null,
    });
    expect(await rowOf(creemFree)).toMatchObject({ plan: "free", billing_customer_id: null });
    expect(await rowOf(paddle)).toMatchObject({
      plan: "pro",
      plan_status: "active",
      billing_customer_id: PADDLE_CUSTOMER,
      billing_subscription_id: PADDLE_SUBSCRIPTION,
    });
    expect(await rowOf(mock)).toMatchObject({ plan: "pro", plan_status: "mock_active" });
    expect(await rowOf(comp)).toMatchObject({ plan: "max", plan_interval: "month" });
    const left = await client.query<{ replaced_subscription_id: string }>(
      "select replaced_subscription_id from public.trial_replacements",
    );
    expect(left.rows.map((r) => r.replaced_subscription_id)).toEqual([PADDLE_SUBSCRIPTION]);
  });
});
