import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { MAX_JOB_PAGE, JOB_PAGE_SIZE } from "@/lib/job-feed/types";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261122002000";
const VALIDATE = "20261122002010";

describe("match positions migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("keeps stored events and lets a match sit anywhere on the last page", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const user = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [
      user,
      "pages@example.com",
    ]);
    await client.query(
      "insert into public.users (id, email, created_at, updated_at) values ($1, $2, 1, 1)",
      [user, "pages@example.com"],
    );
    const insert = (position: number) =>
      client.query(
        `insert into public.match_events (id, user_id, kind, job_id, position, variant, created_at)
         values ($1, $2, 'impression', $3, $4, 'occupation-v5', 1)`,
        [crypto.randomUUID(), user, crypto.randomUUID(), position],
      );
    await insert(1_000);
    await expect(insert(1_001)).rejects.toThrow(/match_events_position_check/);

    for (const version of [VERSION, VALIDATE]) {
      const target = migrations.find((m) => m.version === version);
      expect(target, version).toBeDefined();
      await client.exec(target!.sql);
    }

    await insert(MAX_JOB_PAGE * JOB_PAGE_SIZE);
    await expect(insert(MAX_JOB_PAGE * JOB_PAGE_SIZE + 1)).rejects.toThrow(
      /match_events_position_check/,
    );
    const stored = await client.query<{ n: number }>(
      "select count(*)::int as n from public.match_events",
    );
    expect(stored.rows[0]?.n).toBe(2);
  });
});
