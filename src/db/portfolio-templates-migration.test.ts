import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261108003000";

describe("portfolio templates migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("moves old pages to the new designs and only allows the six", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const ids: Record<string, string> = {};
    for (const template of ["minimal", "studio", "developer"]) {
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

    const rows = await client.query<{ id: string; template: string; project_images: unknown }>(
      "select id, template, project_images from public.portfolios",
    );
    const byId = Object.fromEntries(rows.rows.map((row) => [row.id, row]));
    expect(byId[ids.minimal!]).toMatchObject({ template: "margin", project_images: {} });
    expect(byId[ids.studio!]?.template).toBe("showcase");
    expect(byId[ids.developer!]?.template).toBe("shell");

    await expect(
      client.query("update public.portfolios set template = 'minimal' where id = $1", [
        ids.minimal,
      ]),
    ).rejects.toThrow(/portfolios_template_check/);
    await expect(
      client.query("update public.portfolios set project_images = '[]'::jsonb where id = $1", [
        ids.minimal,
      ]),
    ).rejects.toThrow(/check/);
    for (const template of ["margin", "broadsheet", "ledger", "showcase", "shell", "signal"]) {
      await client.query("update public.portfolios set template = $1 where id = $2", [
        template,
        ids.minimal,
      ]);
    }

    const fallback = await client.query<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'portfolios' and column_name = 'template'",
    );
    expect(fallback.rows[0]?.column_default).toMatch(/'margin'/);
    const rls = await client.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = 'portfolios'",
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
  });
});
