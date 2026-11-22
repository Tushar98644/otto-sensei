import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetBilling } from "@/lib/billing/billing-reset";
import type { Db } from "./client";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";
import * as schema from "./schema";

const RESET = "20261121000100";
const DODO_CUSTOMER = "cus_DYcrwU3lOP7V109UY81x7";
const DODO_SUBSCRIPTION = "sub_0NsQXovHc5Gftt0FyewQo";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ACCOUNTS: Record<number, Record<string, string | number | null>> = {
  1: {
    plan: "pro",
    plan_interval: "month",
    plan_status: "trialing",
    plan_renews_at: 9,
    trial_ends_at: 9,
    plan_period_starts_at: 1,
    plan_period_ends_at: 9,
    billing_customer_id: DODO_CUSTOMER,
    billing_subscription_id: DODO_SUBSCRIPTION,
    billing_event_at: 5,
  },
  2: {
    plan: "max",
    plan_interval: "year",
    plan_status: "active",
    billing_subscription_id: "sub_2",
  },
  3: { plan: "free", billing_event_at: 5 },
  4: { plan: "free", plan_status: "on_hold" },
  5: { plan: "free", billing_customer_id: "cus_only" },
  6: { plan: "pro", plan_status: "mockXactive" },
  7: { plan: "pro", plan_status: "mock_trialing", trial_ends_at: 9 },
  8: { plan: "max", plan_interval: "month" },
  9: { plan: "free" },
};
const RESET_ACCOUNTS = [1, 2, 3, 4, 5, 6];

async function migratedClient(): Promise<PGlite> {
  const client = new PGlite();
  await client.exec(LOCAL_ONLY_DDL);
  for (const migration of readMigrations().filter((m) => m.version < RESET)) {
    await client.exec(migration.sql);
  }
  return client;
}

async function seed(client: PGlite): Promise<void> {
  for (const [n, fields] of Object.entries(ACCOUNTS)) {
    const userId = id(Number(n));
    const email = `u${n}@example.com`;
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, email]);
    const columns = ["id", "email", "created_at", "updated_at", ...Object.keys(fields)];
    const values = [userId, email, 1, 1, ...Object.values(fields)];
    const params = values.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `insert into public.users (${columns.join(", ")}) values (${params})`,
      values,
    );
  }
  for (const n of [1, 3, 7, 8]) {
    await client.query(
      "insert into public.trial_reminders (user_id, trial_ends_at, created_at) values ($1, 9, 1)",
      [id(n)],
    );
    await client.query(
      "insert into public.trial_watch (user_id, trial_ends_at, seen_at) values ($1, 9, 1)",
      [id(n)],
    );
  }
  await client.query(
    `insert into public.trial_replacements (replaced_subscription_id, subscription_id, user_id, created_at)
     values ('sub_old1', $1, $2, 1), ('sub_old7', 'sub_new7', $3, 1)`,
    [DODO_SUBSCRIPTION, id(1), id(7)],
  );
  await client.query(
    `insert into public.trial_history (email_hash, kind, created_at)
     values ('hash-owner', 'trial', 1), ('hash-tester', 'paid', 1)`,
  );
  await client.query(
    "insert into public.billing_events (id, type, received_at) values ('evt_test', 'subscription.active', 1)",
  );
  const usage = [
    [id(1), "tailor", "trial", 4, 2],
    [id(1), "tailor", "2026-11", 7, 0],
    [id(8), "draft", "trial", 3, 0],
    [id(9), "letter", "trial", 0, 5],
  ] as const;
  for (const row of usage) {
    await client.query(
      "insert into public.usage (subject, feature, period, count, bonus) values ($1, $2, $3, $4, $5)",
      [...row],
    );
  }
}

async function dump(client: PGlite) {
  const all = async (query: string) => (await client.query<Record<string, unknown>>(query)).rows;
  return {
    users: await all(
      `select id, plan, plan_interval, plan_status, plan_renews_at, trial_ends_at,
              plan_period_starts_at, plan_period_ends_at, billing_customer_id,
              billing_subscription_id, billing_event_at, updated_at <> 1 as touched
       from public.users order by id`,
    ),
    reminders: await all("select user_id from public.trial_reminders order by user_id"),
    watch: await all("select user_id from public.trial_watch order by user_id"),
    replacements: await all("select * from public.trial_replacements"),
    history: await all("select * from public.trial_history"),
    usage: await all("select * from public.usage order by subject, feature, period"),
    events: await all("select id from public.billing_events"),
  };
}

describe("reset Dodo test billing migration", () => {
  const clients: PGlite[] = [];
  afterAll(() => Promise.all(clients.map((c) => c.close())));

  let migrated: Awaited<ReturnType<typeof dump>>;
  beforeAll(async () => {
    const client = await migratedClient();
    clients.push(client);
    await seed(client);
    const reset = readMigrations().find((m) => m.version === RESET);
    if (!reset) throw new Error(`missing migration ${RESET}`);
    expect(reset.transaction).toBe(true);
    await client.exec(reset.sql);
    migrated = await dump(client);
  }, MIGRATIONS_TIMEOUT_MS);

  it("moves every account with billing state to Free and leaves mock, hand-set and plain Free plans alone", () => {
    const touched = migrated.users.filter((u) => u.touched).map((u) => u.id);
    expect(touched).toEqual(RESET_ACCOUNTS.map(id));
    for (const user of migrated.users.filter((u) => u.touched)) {
      expect(user).toMatchObject({
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
      });
    }
    const byId = new Map(migrated.users.map((u) => [u.id, u]));
    expect(byId.get(id(7))).toMatchObject({ plan: "pro", plan_status: "mock_trialing" });
    expect(byId.get(id(8))).toMatchObject({ plan: "max", plan_interval: "month" });
    expect(byId.get(id(9))).toMatchObject({ plan: "free" });
  });

  it("drops the reset accounts' trial rows, every replacement and all trial history, keeps dedupe keys", () => {
    expect(migrated.reminders).toEqual([{ user_id: id(7) }, { user_id: id(8) }]);
    expect(migrated.watch).toEqual([{ user_id: id(7) }, { user_id: id(8) }]);
    expect(migrated.replacements).toEqual([]);
    expect(migrated.history).toEqual([]);
    expect(migrated.events).toEqual([{ id: "evt_test" }]);
  });

  it("zeroes trial usage for everyone, keeping invite extras and monthly counts", () => {
    expect(migrated.usage).toEqual([
      { subject: id(1), feature: "tailor", period: "2026-11", count: 7, bonus: 0 },
      { subject: id(1), feature: "tailor", period: "trial", count: 0, bonus: 2 },
      { subject: id(8), feature: "draft", period: "trial", count: 0, bonus: 0 },
      { subject: id(9), feature: "letter", period: "trial", count: 0, bonus: 5 },
    ]);
  });

  it("leaves the database exactly as reset-billing --go-live --apply does", async () => {
    const client = await migratedClient();
    clients.push(client);
    await seed(client);
    await resetBilling(drizzle(client, { schema }) as unknown as Db, {
      mode: "go-live",
      apply: true,
      now: 2,
    });
    // trial_watch never had a writer, so the script no longer clears it; 20261122010900 drops the table.
    const { watch: _scriptWatch, ...script } = await dump(client);
    const { watch: _migratedWatch, ...expected } = migrated;
    void _scriptWatch;
    void _migratedWatch;
    expect(script).toEqual(expected);
  });
});
