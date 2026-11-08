import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { execSql, resetDb } from "@/db/testing";

describe("test database", () => {
  it("builds every table from the migrations and empties them on reset", async () => {
    const db = await getDb();
    const id = crypto.randomUUID();
    await execSql("insert into auth.users (id, email) values ($1, $2)", [id, "ada@example.com"]);
    await db.insert(users).values({ id, email: "ada@example.com", createdAt: 1, updatedAt: 2 });
    expect(await db.select().from(users).where(eq(users.id, id))).toMatchObject([
      { id, plan: "free", createdAt: 1, updatedAt: 2 },
    ]);
    await resetDb();
    expect(await db.select({ n: sql<number>`count(*)::int` }).from(users)).toEqual([{ n: 0 }]);
  });

  it("turns row level security on for every app table", async () => {
    const db = await getDb();
    const rows = await db.execute(
      sql`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(rows).toMatchObject({ rows: [] });
  });
});
