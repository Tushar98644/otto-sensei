import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations, type MigrationFile } from "./migration-files";

const MOVE = "20261115000100";
const VALIDATE = "20261115000110";
const OLD_WEEK_KEY = "week:2026-11-19T09:30:00.000Z";

describe("no weekly plans migration", () => {
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
    for (const migration of migrations.filter((m) => m.version < MOVE))
      await client.exec(migration.sql);
  });

  const addUser = async (interval: string | null, usagePeriod?: string) => {
    const id = crypto.randomUUID();
    const email = `${id}@example.com`;
    await client.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    await client.query(
      `insert into public.users (id, email, plan, plan_interval, created_at, updated_at)
       values ($1, $2, $3, $4, 1, 1)`,
      [id, email, interval ? "pro" : "free", interval],
    );
    if (usagePeriod) {
      await client.query(
        "insert into public.usage (subject, feature, period, count) values ($1, 'tailor', $2, 7)",
        [id, usagePeriod],
      );
    }
    return id;
  };

  const intervalOf = async (id: string) =>
    (
      await client.query<{ plan: string; plan_interval: string | null }>(
        "select plan, plan_interval from public.users where id = $1",
        [id],
      )
    ).rows[0];

  it("moves weekly plans to monthly, keeps their old usage rows, and then refuses weekly", async () => {
    const weekly = await addUser("week", OLD_WEEK_KEY);
    const monthly = await addUser("month");
    const yearly = await addUser("year");
    const free = await addUser(null);

    expect(file(MOVE).transaction).toBe(true);
    await client.exec(file(MOVE).sql);
    // The old app can still write between the move and the new rule; the validate file catches that row.
    await client.exec(`alter table public.users drop constraint users_plan_interval_check`);
    const late = await addUser("week");
    await client.exec(
      `alter table public.users add constraint users_plan_interval_check
         check (plan_interval in ('month', 'year')) not valid`,
    );
    expect(file(VALIDATE).transaction).toBe(true);
    await client.exec(file(VALIDATE).sql);

    expect(await intervalOf(weekly)).toEqual({ plan: "pro", plan_interval: "month" });
    expect(await intervalOf(late)).toEqual({ plan: "pro", plan_interval: "month" });
    expect(await intervalOf(monthly)).toEqual({ plan: "pro", plan_interval: "month" });
    expect(await intervalOf(yearly)).toEqual({ plan: "pro", plan_interval: "year" });
    expect(await intervalOf(free)).toEqual({ plan: "free", plan_interval: null });

    const kept = await client.query<{ period: string; count: number }>(
      "select period, count from public.usage where subject = $1",
      [weekly],
    );
    expect(kept.rows).toEqual([{ period: OLD_WEEK_KEY, count: 7 }]);

    await expect(
      client.query("update public.users set plan_interval = 'week' where id = $1", [monthly]),
    ).rejects.toThrow(/users_plan_interval_check/);
    await expect(addUser("week")).rejects.toThrow(/users_plan_interval_check/);
    const constraint = await client.query<{ convalidated: boolean; definition: string }>(
      `select convalidated, pg_get_constraintdef(oid) as definition from pg_constraint
       where conname = 'users_plan_interval_check'`,
    );
    expect(constraint.rows).toHaveLength(1);
    expect(constraint.rows[0]?.convalidated).toBe(true);
    expect(constraint.rows[0]?.definition).not.toContain("week");
  });
});
