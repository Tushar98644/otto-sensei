import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261122001100";
const VALIDATE = "20261122001110";

describe("fifteen portfolio templates migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("keeps every page on its design, allows Retro, Headliner and Bubblegum, and validates", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const user = crypto.randomUUID();
    const page = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [
      user,
      "fifteen@example.com",
    ]);
    await client.query(
      "insert into public.users (id, email, created_at, updated_at) values ($1, $2, 1, 1)",
      [user, "fifteen@example.com"],
    );
    await client.query(
      `insert into public.portfolios (id, user_id, resume_id, slug, template, snapshot, created_at, updated_at)
       values ($1, $2, 'r1', 'page-fifteen', 'card', '{}'::jsonb, 1, 1)`,
      [page, user],
    );
    await expect(
      client.query("update public.portfolios set template = 'retro' where id = $1", [page]),
    ).rejects.toThrow(/portfolios_template_check/);

    for (const version of [VERSION, VALIDATE]) {
      const target = migrations.find((m) => m.version === version);
      expect(target, version).toBeDefined();
      await client.exec(target!.sql);
    }

    const kept = await client.query<{ template: string }>(
      "select template from public.portfolios where id = $1",
      [page],
    );
    expect(kept.rows[0]?.template).toBe("card");
    for (const template of PORTFOLIO_TEMPLATE_IDS) {
      await client.query("update public.portfolios set template = $1 where id = $2", [
        template,
        page,
      ]);
    }
    await expect(
      client.query("update public.portfolios set template = 'starry' where id = $1", [page]),
    ).rejects.toThrow(/portfolios_template_check/);

    const check = await client.query<{ convalidated: boolean }>(
      "select convalidated from pg_constraint where conname = 'portfolios_template_check'",
    );
    expect(check.rows[0]?.convalidated).toBe(true);
    const fallback = await client.query<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'portfolios' and column_name = 'template'",
    );
    expect(fallback.rows[0]?.column_default).toMatch(/'navy'/);
  });
});
