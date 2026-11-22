import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261108006000";

const MOVES = {
  margin: "dock",
  broadsheet: "paper",
  ledger: "cv",
  showcase: "folio",
  shell: "bento",
  signal: "navy",
} as const;

describe("reference templates migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("moves round-1 pages to the closest new design and only allows the eight", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const ids: Record<string, string> = {};
    for (const template of Object.keys(MOVES)) {
      const user = crypto.randomUUID();
      ids[template] = crypto.randomUUID();
      await client.query("insert into auth.users (id, email) values ($1, $2)", [
        user,
        `${template}@example.com`,
      ]);
      await client.query(
        "insert into public.users (id, email, created_at, updated_at) values ($1, $2, 1, 1)",
        [user, `${template}@example.com`],
      );
      await client.query(
        `insert into public.portfolios (id, user_id, resume_id, slug, template, snapshot, created_at, updated_at)
         values ($1, $2, 'r1', $3, $4, '{}'::jsonb, 1, 1)`,
        [ids[template], user, `page-${template}`, template],
      );
    }

    const target = migrations.find((m) => m.version === VERSION);
    expect(target).toBeDefined();
    await client.exec(target!.sql);

    const rows = await client.query<{ id: string; template: string }>(
      "select id, template from public.portfolios",
    );
    const byId = Object.fromEntries(rows.rows.map((row) => [row.id, row.template]));
    for (const [from, to] of Object.entries(MOVES)) expect(byId[ids[from]!], from).toBe(to);

    await expect(
      client.query("update public.portfolios set template = 'margin' where id = $1", [ids.margin]),
    ).rejects.toThrow(/portfolios_template_check/);
    for (const template of ["navy", "dock", "reel", "bento", "cv", "prose", "folio", "paper"]) {
      await client.query("update public.portfolios set template = $1 where id = $2", [
        template,
        ids.margin,
      ]);
    }

    const fallback = await client.query<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'portfolios' and column_name = 'template'",
    );
    expect(fallback.rows[0]?.column_default).toMatch(/'navy'/);
    const rls = await client.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = 'portfolios'",
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
  });
});
