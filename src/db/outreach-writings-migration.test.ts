import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations, type MigrationFile } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const WIDEN = "20261118000200";
const VALIDATE = "20261118000210";

describe("outreach writings migration", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  const file = (version: string): MigrationFile => {
    const migration = migrations.find((m) => m.version === version);
    if (!migration) throw new Error(`missing migration ${version}`);
    return migration;
  };
  const userId = crypto.randomUUID();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < WIDEN))
      await client.exec(migration.sql);
    const email = `${userId}@example.com`;
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, email]);
    await client.query(
      `insert into public.users (id, email, plan, created_at, updated_at)
       values ($1, $2, 'pro', 1, 1)`,
      [userId, email],
    );
  }, MIGRATIONS_TIMEOUT_MS);

  const insert = (kind: string, extra: Record<string, unknown> = {}) => {
    const columns = [
      "id",
      "user_id",
      "kind",
      "body",
      "created_at",
      "updated_at",
      ...Object.keys(extra),
    ];
    const values = [
      crypto.randomUUID(),
      userId,
      kind,
      "Hi [first name],",
      1,
      1,
      ...Object.values(extra),
    ];
    return client.query(
      `insert into public.writings (${columns.join(", ")})
       values (${values.map((_, index) => `$${index + 1}`).join(", ")}) returning id`,
      values,
    );
  };

  it("keeps old rows, takes outreach messages with a subject, note and job, and checks every row", async () => {
    await insert("letter");
    await expect(insert("outreach")).rejects.toThrow(/writings_kind_check/);

    expect(file(WIDEN).transaction).toBe(true);
    await client.exec(file(WIDEN).sql);
    const jobId = crypto.randomUUID();
    await insert("outreach", {
      subject: "Designer at Northwind",
      note: "Hi [first name], hello.",
      job_id: jobId,
    });
    expect(file(VALIDATE).transaction).toBe(true);
    await client.exec(file(VALIDATE).sql);

    const rows = await client.query<{
      kind: string;
      subject: string;
      note: string;
      job_id: string | null;
    }>("select kind, subject, note, job_id from public.writings order by kind");
    expect(rows.rows).toEqual([
      { kind: "letter", subject: "", note: "", job_id: null },
      {
        kind: "outreach",
        subject: "Designer at Northwind",
        note: "Hi [first name], hello.",
        job_id: jobId,
      },
    ]);

    await expect(insert("essay")).rejects.toThrow(/writings_kind_check/);
    await expect(insert("outreach", { subject: "s".repeat(201) })).rejects.toThrow(/check/);
    await expect(insert("outreach", { note: "n".repeat(1_001) })).rejects.toThrow(/check/);

    const constraint = await client.query<{ convalidated: boolean; definition: string }>(
      `select convalidated, pg_get_constraintdef(oid) as definition from pg_constraint
       where conname = 'writings_kind_check'`,
    );
    expect(constraint.rows).toHaveLength(1);
    expect(constraint.rows[0]?.convalidated).toBe(true);
    expect(constraint.rows[0]?.definition).toContain("outreach");
  });
});
