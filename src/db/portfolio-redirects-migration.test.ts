import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const MOVE = "20261123100700";
const INDEX = "20261123100720";

describe("portfolio redirects migration", () => {
  const client = new PGlite();
  const migrations = readMigrations();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < MOVE)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

  const run = (sql: string, params: unknown[] = []) => client.query(sql, params);
  const addPortfolio = async (slug: string) => {
    const userId = crypto.randomUUID();
    const id = crypto.randomUUID();
    await run("insert into auth.users (id, email) values ($1, $2)", [userId, `${slug}@x.dev`]);
    await run(
      "insert into public.users (id, email, plan, created_at, updated_at) values ($1, $2, 'pro', 1, 1)",
      [userId, `${slug}@x.dev`],
    );
    await run(
      `insert into public.portfolios (id, user_id, resume_id, slug, snapshot, published, created_at, updated_at)
       values ($1, $2, 'r1', $3, '{}', true, 1, 1)`,
      [id, userId, slug],
    );
    return { id, userId };
  };
  const oldSlugsOf = async (id: string) =>
    (
      await client.query<{ old_slugs: unknown }>(
        "select old_slugs from public.portfolios where id = $1",
        [id],
      )
    ).rows[0]?.old_slugs;
  const redirect = (
    slug: string,
    page: { id: string; userId: string },
    at: number,
    until: number,
  ) =>
    run(
      `insert into public.portfolio_redirects (slug, portfolio_id, user_id, created_at, expires_at)
       values ($1, $2, $3, $4, $5)`,
      [slug, page.id, page.userId, at, until],
    );

  it("copies every old address onto its page, keeps copying the old app's changes, and loses none when the table goes", async () => {
    const ada = await addPortfolio("ada-lovelace");
    const bo = await addPortfolio("bo-diddley");
    const cy = await addPortfolio("cy-twombly");
    await redirect("ada", ada, 10, 1000);
    await redirect("ada-l", ada, 20, 2000);
    await redirect("bob-d", bo, 30, 3000);
    const before = (await client.query("select * from public.portfolio_redirects order by slug"))
      .rows;

    for (const migration of migrations.filter((m) => m.version >= MOVE && m.version <= INDEX)) {
      await client.exec(migration.sql);
    }

    expect(
      (await client.query("select * from public.portfolio_redirects order by slug")).rows,
    ).toEqual(before);
    expect(await oldSlugsOf(ada.id)).toEqual({
      ada: { at: 10, until: 1000 },
      "ada-l": { at: 20, until: 2000 },
    });
    expect(await oldSlugsOf(bo.id)).toEqual({ "bob-d": { at: 30, until: 3000 } });
    expect(await oldSlugsOf(cy.id)).toBeNull();

    // The old app keeps writing redirects until the new code is live; each change lands on the page.
    await redirect("cyt", cy, 40, 4000);
    await run("delete from public.portfolio_redirects where slug = 'ada'");
    await run(
      "update public.portfolio_redirects set portfolio_id = $1, user_id = $2, created_at = 50, expires_at = 5000 where slug = 'bob-d'",
      [cy.id, cy.userId],
    );
    expect(await oldSlugsOf(ada.id)).toEqual({ "ada-l": { at: 20, until: 2000 } });
    expect(await oldSlugsOf(bo.id)).toEqual({});
    expect(await oldSlugsOf(cy.id)).toEqual({
      cyt: { at: 40, until: 4000 },
      "bob-d": { at: 50, until: 5000 },
    });

    const held = await client.query<{ slug: string }>(
      "select slug from public.portfolios where old_slugs ? 'bob-d'",
    );
    expect(held.rows).toEqual([{ slug: "cy-twombly" }]);
  });
});
