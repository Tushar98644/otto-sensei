import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";

// 20261109005000_merge_screening.sql runs on databases that still hold "screening" rows. This
// replays the migrations before it, adds such rows, then applies it.

const VERSION = "20261109005000";
const DAY = 24 * 60 * 60 * 1_000;

describe("merge screening migration", () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("moves screening to interview in the status, the furthest step and the timeline", async () => {
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

    const application = async (status: string, stage: string, history: unknown[]) => {
      const id = crypto.randomUUID();
      await client.query(
        `insert into public.applications (id, user_id, company, applied_at, status, stage_reached,
           status_changed_at, status_history, created_at, updated_at)
         values ($1, $2, 'Acme', $3, $4, $5, $3, $6::jsonb, 1, 1)`,
        [id, user, DAY, status, stage, JSON.stringify(history)],
      );
      return id;
    };
    const talking = await application("screening", "screening", [
      { status: "applied", at: DAY },
      { status: "screening", at: 3 * DAY },
    ]);
    const closedAfterCall = await application("rejected", "screening", [
      { status: "applied", at: DAY },
      { status: "screening", at: 3 * DAY },
      { status: "rejected", at: 9 * DAY },
    ]);
    const untouched = await application("offer", "offer", [
      { status: "applied", at: DAY },
      { status: "interview", at: 4 * DAY },
      { status: "offer", at: 8 * DAY },
    ]);

    const target = migrations.find((m) => m.version === VERSION);
    expect(target).toBeDefined();
    await client.exec(target!.sql);

    const rows = await client.query<{
      id: string;
      status: string;
      stage_reached: string;
      status_history: unknown;
    }>("select id, status, stage_reached, status_history from public.applications");
    const byId = Object.fromEntries(rows.rows.map((row) => [row.id, row]));
    expect(byId[talking]).toMatchObject({
      status: "interview",
      stage_reached: "interview",
      status_history: [
        { status: "applied", at: DAY },
        { status: "interview", at: 3 * DAY },
      ],
    });
    // It ended after the call, so it keeps its ending and now counts as having reached Interviewing.
    expect(byId[closedAfterCall]).toMatchObject({
      status: "rejected",
      stage_reached: "interview",
      status_history: [
        { status: "applied", at: DAY },
        { status: "interview", at: 3 * DAY },
        { status: "rejected", at: 9 * DAY },
      ],
    });
    expect(byId[untouched]).toMatchObject({
      status: "offer",
      stage_reached: "offer",
      status_history: [
        { status: "applied", at: DAY },
        { status: "interview", at: 4 * DAY },
        { status: "offer", at: 8 * DAY },
      ],
    });

    const left = await client.query<{ n: number }>(
      `select count(*)::int as n from public.applications
       where status = 'screening' or stage_reached = 'screening'
         or status_history @> '[{"status": "screening"}]'`,
    );
    expect(left.rows[0]?.n).toBe(0);
  });
});
