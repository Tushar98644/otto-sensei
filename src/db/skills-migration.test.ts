import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readSkills } from "@/lib/job-feed/records";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import * as schema from "./schema";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const FIRST = "20261123130000";

describe("skills migration", () => {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrations = readMigrations();
  afterAll(() => client.close());

  beforeAll(async () => {
    await client.exec(LOCAL_ONLY_DDL);
    for (const migration of migrations.filter((m) => m.version < FIRST)) {
      await client.exec(migration.sql);
    }
  }, MIGRATIONS_TIMEOUT_MS);

  const run = (sql: string, params: unknown[] = []) => client.query(sql, params);
  const rows = async (sql: string) => (await client.query<Record<string, unknown>>(sql)).rows;
  const skills = () =>
    rows("select skill, sid, open_jobs, weight from public.skills order by skill");

  it("copies every row of job_skills and match_skills, keeps copying the old app's writes, and loses nothing", async () => {
    await run(
      "insert into public.match_skills (sid, skill) values (1, 'Python'), (2, 'SQL'), (3, 'Go'), (4, 'Kafka')",
    );
    await run(
      `insert into public.job_skills (skill, open_jobs, weight, updated_at)
       values ('Python', 10, 0.5, 100), ('SQL', 20, 0.25, 100), ('Go', 5, 1.5, 100), ('Elm', 1, 3, 100)`,
    );
    const before = {
      job: await rows("select * from public.job_skills order by skill"),
      match: await rows("select * from public.match_skills order by sid"),
    };

    const started = Date.now();
    await client.exec(migrations.find((m) => m.version === FIRST)!.sql);

    expect({
      job: await rows("select * from public.job_skills order by skill"),
      match: await rows("select * from public.match_skills order by sid"),
    }).toEqual(before);
    // Kafka's row is new, so it is stamped with the copy's time.
    const [kafka] = await rows("select updated_at from public.skills where skill = 'Kafka'");
    expect(Number(kafka?.updated_at)).toBeGreaterThanOrEqual(started);
    expect(await skills()).toEqual([
      { skill: "Elm", sid: null, open_jobs: 1, weight: 3 },
      { skill: "Go", sid: 3, open_jobs: 5, weight: 1.5 },
      { skill: "Kafka", sid: 4, open_jobs: 0, weight: null },
      { skill: "Python", sid: 1, open_jobs: 10, weight: 0.5 },
      { skill: "SQL", sid: 2, open_jobs: 20, weight: 0.25 },
    ]);
    expect(await readSkills(db)).toEqual({
      ids: new Map([
        ["Python", 1],
        ["SQL", 2],
        ["Go", 3],
        ["Kafka", 4],
      ]),
      weights: new Map([
        ["Elm", 3],
        ["Go", 1.5],
        ["Python", 0.5],
        ["SQL", 0.25],
      ]),
    });

    // The old app's index build gives new skills the next ids, as it reads them from match_skills.
    await run("insert into public.match_skills (sid, skill) values (5, 'Elm'), (6, 'Rust')");
    // Its weight refresh rewrites job_skills whole in one transaction.
    await client.transaction(async (tx) => {
      await tx.query("delete from public.job_skills");
      await tx.query(
        `insert into public.job_skills (skill, open_jobs, weight, updated_at)
         values ('Python', 12, 0.5, 200), ('Go', 6, 1.5, 200), ('Rust', 2, 3, 200)`,
      );
    });
    // An id the new app already gave stays with its skill: the old app's clash is skipped, not raised.
    await run("insert into public.skills (skill, sid, updated_at) values ('Scala', 7, 300)");
    await run("insert into public.match_skills (sid, skill) values (7, 'Haskell'), (8, 'Scala')");

    expect(await skills()).toEqual([
      { skill: "Elm", sid: 5, open_jobs: 0, weight: null },
      { skill: "Go", sid: 3, open_jobs: 6, weight: 1.5 },
      { skill: "Kafka", sid: 4, open_jobs: 0, weight: null },
      { skill: "Python", sid: 1, open_jobs: 12, weight: 0.5 },
      { skill: "Rust", sid: 6, open_jobs: 2, weight: 3 },
      { skill: "SQL", sid: 2, open_jobs: 0, weight: null },
      { skill: "Scala", sid: 7, open_jobs: 0, weight: null },
    ]);
    expect(await rows("select skill, updated_at from public.skills where open_jobs > 0")).toEqual(
      expect.arrayContaining([
        { skill: "Python", updated_at: 200 },
        { skill: "Rust", updated_at: 200 },
      ]),
    );
    const rls = await rows("select relrowsecurity from pg_class where relname = 'skills'");
    expect(rls).toEqual([{ relrowsecurity: true }]);
  });
});
