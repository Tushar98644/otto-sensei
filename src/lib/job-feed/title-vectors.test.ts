import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { titleVectors } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { GET, POST } from "@/app/api/cron/title-vectors/route";
import { occupationVectors } from "./semantic";
import {
  blend,
  cosine,
  noteTitles,
  readTitleVectors,
  saveTitleVectors,
  titleVectorKey,
  waitingTitles,
  type TitleVectorRow,
} from "./title-vectors";

const NOW = Date.UTC(2026, 10, 23, 6);
const SECRET = "cron-secret-for-tests-0123456789";
const SOFTWARE = "15-1252.00";
const SUPPORT = "15-1232.00";

function encoded(code: string): string {
  const vector = occupationVectors().get(code)!;
  return Buffer.from(vector.buffer, vector.byteOffset, vector.length).toString("base64");
}

const row = (key: string, code: string): TitleVectorRow => [key, encoded(code), [code], [0.9]];

describe("title vectors", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keys a title once however it is written", () => {
    expect(titleVectorKey("Senior Software Engineer (m/w/d)")).toBe("senior software engineer");
    expect(titleVectorKey("  Data &amp; Analytics   Lead ")).toBe("data & analytics lead");
    expect(titleVectorKey("x".repeat(300))).toHaveLength(120);
  });

  it("reads the shipped occupation vectors and compares them", () => {
    const software = occupationVectors().get(SOFTWARE)!;
    const support = occupationVectors().get(SUPPORT)!;
    const nurse = occupationVectors().get("29-1141.00")!;
    expect(occupationVectors().size).toBeGreaterThan(1_000);
    expect(cosine(software, software)).toBeCloseTo(1, 5);
    expect(cosine(software, support)).toBeGreaterThan(cosine(software, nurse));
    const mixed = blend([
      { vector: software, weight: 1 },
      { vector: nurse, weight: 0.3 },
    ])!;
    expect(cosine(mixed, software)).toBeGreaterThan(cosine(mixed, nurse));
  });

  it("fills only titles waiting for a vector, newest first", async () => {
    const db = await getDb();
    expect(await noteTitles(db, ["backend engineer", "support engineer"], NOW)).toBe(2);
    expect(await noteTitles(db, ["backend engineer"], NOW + 1)).toBe(0);
    await noteTitles(db, ["registered nurse"], NOW + 2);
    expect(await waitingTitles(db, 10)).toEqual([
      "registered nurse",
      "backend engineer",
      "support engineer",
    ]);
    const saved = await saveTitleVectors(
      db,
      [row("backend engineer", SOFTWARE), row("never asked for", SOFTWARE)],
      NOW + 3,
    );
    expect(saved).toBe(1);
    expect(await waitingTitles(db, 10)).toEqual(["registered nurse", "support engineer"]);
    const stored = await readTitleVectors(db, ["backend engineer", "support engineer"]);
    expect([...stored.keys()]).toEqual(["backend engineer"]);
    expect(cosine(stored.get("backend engineer")!, occupationVectors().get(SOFTWARE)!)).toBeCloseTo(
      1,
      5,
    );
    expect(await db.select().from(titleVectors)).toHaveLength(3);
  });

  it("serves the workflow only with the cron secret", async () => {
    process.env.CRON_SECRET = SECRET;
    resetEnvForTests();
    try {
      const db = await getDb();
      await noteTitles(db, ["backend engineer"], NOW);
      const refused = await GET(new Request("http://localhost/api/cron/title-vectors"));
      expect(refused.status).toBe(401);
      const auth = { authorization: `Bearer ${SECRET}` };
      const listed = await GET(
        new Request("http://localhost/api/cron/title-vectors", { headers: auth }),
      );
      expect(await listed.json()).toMatchObject({ ok: true, keys: ["backend engineer"] });
      const bad = await POST(
        new Request("http://localhost/api/cron/title-vectors", {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ vectors: [["backend engineer", "not base64", [], []]] }),
        }),
      );
      expect(bad.status).toBe(400);
      const sent = await POST(
        new Request("http://localhost/api/cron/title-vectors", {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ vectors: [row("backend engineer", SOFTWARE)], rebuild: true }),
        }),
      );
      expect(await sent.json()).toMatchObject({ ok: true, saved: 1 });
      expect(await waitingTitles(db, 10)).toEqual([]);
    } finally {
      delete process.env.CRON_SECRET;
      resetEnvForTests();
    }
  });
});
