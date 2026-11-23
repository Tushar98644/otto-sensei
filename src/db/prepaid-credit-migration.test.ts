import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations, type MigrationFile } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const ADD = "20261123110000";
const VALIDATE = "20261123110010";

describe("prepaid credit migration", () => {
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
    for (const migration of migrations.filter((m) => m.version < ADD))
      await client.exec(migration.sql);
  }, MIGRATIONS_TIMEOUT_MS);

  const addUser = async (plan = "pro") => {
    const id = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@x.com`]);
    await client.query(
      `insert into public.users (id, email, plan, created_at, updated_at) values ($1, $2, $3, 1, 1)`,
      [id, `${id}@x.com`, plan],
    );
    return id;
  };

  // Before the migration there is no cents column, so a row without cents leaves it out.
  const log = (kind: string, key: string, userId: string | null, ref: string, cents?: number) =>
    cents === undefined
      ? client.query(
          `insert into public.billing_log (kind, key, user_id, ref, at) values ($1, $2, $3, $4, 1)`,
          [kind, key, userId, ref],
        )
      : client.query(
          `insert into public.billing_log (kind, key, user_id, ref, at, cents) values ($1, $2, $3, $4, 1, $5)`,
          [kind, key, userId, ref, cents],
        );

  const refused = async (run: () => Promise<unknown>) => {
    await expect(run()).rejects.toThrow(/violates check constraint/);
  };

  it("adds a zero balance and the credit kinds, keeps every row, and then holds to the rules", async () => {
    const buyer = await addUser();
    const other = await addUser("free");
    await log("event", "evt_1", null, "subscription.active");
    await log("trial", "hash-1", null, "paid");
    await log("replacement", "sub_old", buyer, "sub_new");
    // Not a kind yet: the old check still holds.
    await refused(() => log("topup", "pay_early", buyer, "1000 USD"));

    expect(file(ADD).transaction).toBe(true);
    await client.exec(file(ADD).sql);

    const balances = await client.query<{ credit_cents: number }>(
      "select credit_cents from public.users where id in ($1, $2)",
      [buyer, other],
    );
    expect(balances.rows).toEqual([{ credit_cents: 0 }, { credit_cents: 0 }]);
    const kept = await client.query<{ kind: string; cents: number | null }>(
      "select kind, cents from public.billing_log order by kind",
    );
    expect(kept.rows).toEqual([
      { kind: "event", cents: null },
      { kind: "replacement", cents: null },
      { kind: "trial", cents: null },
    ]);

    await log("topup_checkout", crypto.randomUUID(), buyer, "cks_1", 1000);
    await log("topup", "pay_1", buyer, "1088 USD", 1000);
    await log("topup_back", "refund:ref_1", buyer, "pay_1", 500);
    await log("credit_spend", crypto.randomUUID(), buyer, "tailor", 10);
    await client.query("update public.users set credit_cents = 490 where id = $1", [buyer]);

    expect(file(VALIDATE).transaction).toBe(true);
    await client.exec(file(VALIDATE).sql);

    await refused(() =>
      client.query("update public.users set credit_cents = -1 where id = $1", [buyer]),
    );
    await refused(() => log("topup", "pay_2", null, "1000 USD", 1000));
    await refused(() => log("topup", "pay_3", buyer, "1000 USD"));
    await refused(() => log("credit_spend", "spend-negative", buyer, "fix", -2));
    await refused(() => log("event", "evt_2", null, "payment.succeeded", 100));
    await refused(() => log("event", "evt_3", buyer, "payment.succeeded"));
    await refused(() => log("gift", "gift_1", buyer, "", 100));

    const constraints = await client.query<{ name: string; valid: boolean }>(
      `select conname as name, convalidated as valid from pg_constraint
       where conname in ('users_credit_cents_check', 'billing_log_kind_check', 'billing_log_check', 'billing_log_cents_check')
       order by conname`,
    );
    expect(constraints.rows.every((row) => row.valid)).toBe(true);
    expect(constraints.rows).toHaveLength(4);
  });

  it("deletes an account's credit rows with it, and keeps the trial's email hash", async () => {
    const buyer = await addUser();
    await log("topup", "pay_gone", buyer, "500 USD", 500);
    await log("credit_spend", crypto.randomUUID(), buyer, "fix", 2);
    await log("trial", "hash-gone", null, "trial");
    await client.query("delete from auth.users where id = $1", [buyer]);
    const left = await client.query<{ kind: string }>(
      "select kind from public.billing_log where key in ('pay_gone', 'hash-gone') or user_id = $1",
      [buyer],
    );
    expect(left.rows).toEqual([{ kind: "trial" }]);
  });
});
