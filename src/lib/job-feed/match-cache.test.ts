import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { matchCache } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { DAY_MS } from "@/lib/time";
import { MATCH_CACHE_PER_ACCOUNT, readMatchCache, writeMatchCache } from "./match-cache";

const NOW = 20_000 * DAY_MS + 12 * 60 * 60 * 1_000;
// Real keys are 32 base64url characters, and the table checks it.
const k = (name: string) => name.padEnd(32, "x");

async function keysOf(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ key: matchCache.key })
    .from(matchCache)
    .where(eq(matchCache.userId, userId));
  return rows.map((row) => row.key).sort();
}

describe("writeMatchCache", () => {
  beforeEach(resetDb);

  it("keeps only an account's newest pages", async () => {
    const db = await getDb();
    const ada = await createUser("ada@example.com");
    const total = MATCH_CACHE_PER_ACCOUNT + 5;
    for (let page = 0; page < total; page++) {
      await writeMatchCache(
        db,
        ada.id,
        [{ key: k(`k${String(page).padStart(2, "0")}`), value: { page } }],
        NOW + page,
      );
    }
    const kept = await keysOf(ada.id);
    expect(kept).toHaveLength(MATCH_CACHE_PER_ACCOUNT);
    expect(kept[0]).toBe(k(`k${String(total - MATCH_CACHE_PER_ACCOUNT).padStart(2, "0")}`));
    expect(await readMatchCache(db, ada.id, k(`k${String(total - 1).padStart(2, "0")}`))).toEqual({
      page: total - 1,
    });
  });

  it("drops pages from earlier days when a new one is saved", async () => {
    const db = await getDb();
    const ada = await createUser("ada@example.com");
    await writeMatchCache(db, ada.id, [{ key: k("yesterday"), value: 1 }], NOW - DAY_MS);
    await writeMatchCache(db, ada.id, [{ key: k("today"), value: 2 }], NOW);
    expect(await keysOf(ada.id)).toEqual([k("today")]);
  });

  it("never touches another account's pages", async () => {
    const db = await getDb();
    const ada = await createUser("ada@example.com");
    const raj = await createUser("raj@example.com");
    await writeMatchCache(db, raj.id, [{ key: k("raj-old"), value: 1 }], NOW - DAY_MS);
    for (let page = 0; page < MATCH_CACHE_PER_ACCOUNT + 2; page++) {
      await writeMatchCache(db, ada.id, [{ key: k(`a${page}`), value: page }], NOW + page);
    }
    expect(await keysOf(raj.id)).toEqual([k("raj-old")]);
  });

  it("keeps both pages of one write, the page shown and the next", async () => {
    const db = await getDb();
    const ada = await createUser("ada@example.com");
    await writeMatchCache(
      db,
      ada.id,
      [
        { key: k("p1"), value: 1 },
        { key: k("p2"), value: 2 },
      ],
      NOW,
    );
    expect(await keysOf(ada.id)).toEqual([k("p1"), k("p2")]);
  });
});
