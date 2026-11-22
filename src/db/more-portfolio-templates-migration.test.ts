import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261122000100";
const ALLOWED = [
  ...["paper", "dock", "reel", "folio", "cv", "prose"],
  ...["gazette", "card", "brutal", "terminal", "bento", "navy"],
];

describe("more portfolio templates migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("keeps every page on its design and allows the new ones", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const user = crypto.randomUUID();
    const page = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [
      user,
      "more@example.com",
    ]);
    await client.query(
      "insert into public.users (id, email, created_at, updated_at) values ($1, $2, 1, 1)",
      [user, "more@example.com"],
    );
    await client.query(
      `insert into public.portfolios (id, user_id, resume_id, slug, template, snapshot, created_at, updated_at)
       values ($1, $2, 'r1', 'page-more', 'paper', '{}'::jsonb, 1, 1)`,
      [page, user],
    );
    await expect(
      client.query("update public.portfolios set template = 'gazette' where id = $1", [page]),
    ).rejects.toThrow(/portfolios_template_check/);

    const target = migrations.find((m) => m.version === VERSION);
    expect(target).toBeDefined();
    await client.exec(target!.sql);

    const kept = await client.query<{ template: string }>(
      "select template from public.portfolios where id = $1",
      [page],
    );
    expect(kept.rows[0]?.template).toBe("paper");
    for (const template of ALLOWED) {
      await client.query("update public.portfolios set template = $1 where id = $2", [
        template,
        page,
      ]);
    }
    await expect(
      client.query("update public.portfolios set template = 'broadsheet' where id = $1", [page]),
    ).rejects.toThrow(/portfolios_template_check/);

    const fallback = await client.query<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'portfolios' and column_name = 'template'",
    );
    expect(fallback.rows[0]?.column_default).toMatch(/'navy'/);
  });
});
