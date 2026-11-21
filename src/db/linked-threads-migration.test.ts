import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261109003000";
const DAY = 24 * 60 * 60 * 1_000;

describe("linked threads migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("links old rows only where one match is certain, and starts each timeline", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const user = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, 'ada@example.com')", [user]);
    await client.query(
      "insert into public.users (id, email, created_at, updated_at) values ($1, 'ada@example.com', 1, 1)",
      [user],
    );

    const job = async (externalId: string, url: string) => {
      const id = crypto.randomUUID();
      await client.query(
        `insert into public.jobs (id, source, external_id, company, title, posted_at, url, search,
           dedupe_key, content_hash, first_seen_at, last_seen_at, created_at, updated_at)
         values ($1, 'greenhouse', $2, 'Acme', 'Engineer', 1, $3, ''::tsvector, $2, 'h', 1, 1, 1, 1)`,
        [id, externalId, url],
      );
      return id;
    };
    const only = await job("1", "https://boards.example.com/acme/1");
    await job("2", "https://boards.example.com/acme/shared");
    await job("3", "https://boards.example.com/acme/shared");

    const application = async (
      company: string,
      role: string,
      jobUrl: string,
      status = "applied",
      changedAt = 10 * DAY,
    ) => {
      const id = crypto.randomUUID();
      await client.query(
        `insert into public.applications (id, user_id, company, role, job_url, applied_at, status,
           stage_reached, status_changed_at, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, 'applied', $8, 1, 1)`,
        [id, user, company, role, jobUrl, 5 * DAY, status, changedAt],
      );
      return id;
    };
    const linked = await application("Acme", "Engineer", "https://boards.example.com/acme/1");
    const shared = await application("Acme", "Data", "https://boards.example.com/acme/shared", "interview");
    const byName = await application("Globex", "Designer", "");
    const twinA = await application("Initech", "Analyst", "");
    await application("Initech", "Analyst", "");

    const writing = async (company: string, role: string, jobUrl: string) => {
      const id = crypto.randomUUID();
      await client.query(
        `insert into public.writings (id, user_id, kind, company, role, job_url, body, created_at, updated_at)
         values ($1, $2, 'letter', $3, $4, $5, 'Dear team,', 1, 1)`,
        [id, user, company, role, jobUrl],
      );
      return id;
    };
    const letterByLink = await writing("Acme", "Engineer", "https://boards.example.com/acme/1");
    const letterByName = await writing("GLOBEX", "designer", "https://globex.example.com/7");
    const letterTwins = await writing("Initech", "Analyst", "");
    const letterNone = await writing("Umbrella", "Chemist", "");

    const target = migrations.find((m) => m.version === VERSION);
    expect(target).toBeDefined();
    await client.exec(target!.sql);

    const apps = await client.query<{ id: string; job_id: string | null; status_history: unknown }>(
      "select id, job_id, status_history from public.applications",
    );
    const appById = Object.fromEntries(apps.rows.map((row) => [row.id, row]));
    expect(appById[linked]?.job_id).toBe(only);
    expect(appById[shared]?.job_id).toBeNull();
    expect(appById[linked]?.status_history).toEqual([{ status: "applied", at: 5 * DAY }]);
    expect(appById[shared]?.status_history).toEqual([
      { status: "applied", at: 5 * DAY },
      { status: "interview", at: 10 * DAY },
    ]);

    const letters = await client.query<{ id: string; application_id: string | null }>(
      "select id, application_id from public.writings",
    );
    const letterById = Object.fromEntries(letters.rows.map((row) => [row.id, row.application_id]));
    expect(letterById[letterByLink]).toBe(linked);
    expect(letterById[letterByName]).toBe(byName);
    expect(letterById[letterTwins]).toBeNull();
    expect(letterById[letterNone]).toBeNull();
    expect(twinA).toBeTruthy();

    await client.query("delete from public.applications where id = $1", [linked]);
    const [after] = (
      await client.query<{ application_id: string | null }>(
        "select application_id from public.writings where id = $1",
        [letterByLink],
      )
    ).rows;
    expect(after?.application_id).toBeNull();
    await expect(
      client.query(
        "update public.applications set status_history = (select jsonb_agg(n) from generate_series(1, 31) n) where id = $1",
        [shared],
      ),
    ).rejects.toThrow(/status_history/);
  });
});
