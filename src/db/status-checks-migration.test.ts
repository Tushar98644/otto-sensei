import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations, type MigrationFile } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const ADD = "20261122010100";
const VALIDATE = "20261122010110";

describe("application status checks migration", () => {
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
    for (const migration of migrations.filter((m) => m.version < ADD)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

  const userId = crypto.randomUUID();
  const addApplication = async (status: string, stage: string) => {
    const id = crypto.randomUUID();
    await client.query(
      `insert into public.applications (id, user_id, company, applied_at, status, stage_reached,
         status_changed_at, created_at, updated_at)
       values ($1, $2, 'Stripe', 1, $3, $4, 1, 1, 1)`,
      [id, userId, status, stage],
    );
    return id;
  };
  const addEmail = async (from: string | null, to: string | null) => {
    const id = crypto.randomUUID();
    await client.query(
      `insert into public.inbound_emails (id, user_id, message_key, kind, from_status, to_status, received_at)
       values ($1, $2, $3, 'interview', $4, $5, 1)`,
      [id, userId, "k".repeat(42) + id.slice(0, 1), from, to],
    );
    return id;
  };

  it("stores a stray screening or stage as the app reads it, keeps every other row, then refuses a status the app can't read", async () => {
    await client.query("insert into auth.users (id, email) values ($1, 'ada@x.dev')", [userId]);
    await client.query(
      "insert into public.users (id, email, plan, created_at, updated_at) values ($1, 'ada@x.dev', 'free', 1, 1)",
      [userId],
    );
    const screening = await addApplication("screening", "screening");
    const offer = await addApplication("offer", "offer");
    const closed = await addApplication("no_reply", "interview");
    // Read as Applied by readStage, so it is stored that way.
    const odd = await addApplication("rejected", "rejected");
    const moved = await addEmail("applied", "interview");
    const plain = await addEmail(null, null);

    await client.exec(file(ADD).sql);
    // The old app can still write between the two files; nothing it writes is outside the list.
    const late = await addApplication("rejected", "applied");
    await expect(addApplication("ghosted", "applied")).rejects.toThrow(/applications_status_check/);
    expect(file(VALIDATE).transaction).toBe(true);
    await client.exec(file(VALIDATE).sql);

    const rows = await client.query<{ id: string; status: string; stage_reached: string }>(
      "select id, status, stage_reached from public.applications",
    );
    expect(
      Object.fromEntries(rows.rows.map((row) => [row.id, [row.status, row.stage_reached]])),
    ).toEqual({
      [screening]: ["interview", "interview"],
      [offer]: ["offer", "offer"],
      [closed]: ["no_reply", "interview"],
      [odd]: ["rejected", "applied"],
      [late]: ["rejected", "applied"],
    });
    const emails = await client.query<{ id: string; from_status: string; to_status: string }>(
      "select id, from_status, to_status from public.inbound_emails",
    );
    expect(
      Object.fromEntries(emails.rows.map((row) => [row.id, [row.from_status, row.to_status]])),
    ).toEqual({
      [moved]: ["applied", "interview"],
      [plain]: [null, null],
    });
    await expect(addApplication("applied", "rejected")).rejects.toThrow(
      /applications_stage_reached_check/,
    );
    await expect(addEmail("applied", "hired")).rejects.toThrow(/inbound_emails_to_status_check/);
    const checks = await client.query<{ name: string; valid: boolean }>(
      `select conname as name, convalidated as valid from pg_constraint
       where conname in ('applications_status_check', 'applications_stage_reached_check',
         'inbound_emails_from_status_check', 'inbound_emails_to_status_check') order by 1`,
    );
    expect(checks.rows).toHaveLength(4);
    expect(checks.rows.every((row) => row.valid)).toBe(true);
  });
});
