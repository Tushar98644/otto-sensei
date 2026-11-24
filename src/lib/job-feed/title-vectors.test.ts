import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { titles } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { GET, POST } from "@/app/api/cron/title-vectors/route";
import rawVectors from "./occupations/vectors.json";
import { occupationVectors } from "./semantic";
import {
  blendSimilarity,
  codeSimilarity,
  encodeTitleVector,
  TITLE_CODE_BYTES,
  titleCodeFrom,
} from "./title-code";
import {
  noteTitles,
  readTitleVectors,
  saveTitleVectors,
  titleVectorKey,
  waitingTitles,
  type TitleVectorRow,
} from "./title-vectors";

const NOW = Date.UTC(2026, 10, 23, 6);
const DAY = 24 * 60 * 60 * 1_000;
const SECRET = "cron-secret-for-tests-0123456789";
const SOFTWARE = "15-1252.00";
const SUPPORT = "15-1232.00";

// An occupation's 256 int8 values, as scripts/title-vectors.py sends a title's.
function int8(code: string): Int8Array {
  const file = rawVectors as { codes: string[]; vectors: string };
  const at = file.codes.indexOf(code) * 256;
  return new Int8Array(Buffer.from(file.vectors, "base64").subarray(at, at + 256));
}

const encoded = (code: string) => Buffer.from(int8(code)).toString("base64");

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

  it("reads the shipped occupation vectors as codes and compares them", () => {
    const software = occupationVectors().get(SOFTWARE)!;
    const support = occupationVectors().get(SUPPORT)!;
    const nurse = occupationVectors().get("29-1141.00")!;
    expect(occupationVectors().size).toBeGreaterThan(1_000);
    expect(software).toHaveLength(TITLE_CODE_BYTES);
    expect(codeSimilarity(software, software)).toBeCloseTo(1, 5);
    expect(codeSimilarity(software, support)).toBeGreaterThan(codeSimilarity(software, nurse));
    const mixed = [
      { code: software, weight: 1 },
      { code: nurse, weight: 0.3 },
    ];
    expect(blendSimilarity(mixed, software)).toBeGreaterThan(blendSimilarity(mixed, nurse));
  });

  it("keeps a code's similarity close to the full vectors' cosine", () => {
    const cosine = (a: Int8Array, b: Int8Array) => {
      let dot = 0;
      let x = 0;
      let y = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!;
        x += a[i]! ** 2;
        y += b[i]! ** 2;
      }
      return dot / Math.sqrt(x * y);
    };
    const codes = [SOFTWARE, SUPPORT, "29-1141.00", "13-2011.00", "41-3091.00", "27-1024.00"];
    for (const a of codes) {
      for (const b of codes) {
        const full = cosine(int8(a), int8(b));
        const kept = codeSimilarity(encodeTitleVector(int8(a))!, encodeTitleVector(int8(b))!);
        expect(Math.abs(kept - full)).toBeLessThan(0.12);
      }
    }
    // A 256-byte vector stored before codes reads as the same code.
    const legacy = new Uint8Array(int8(SOFTWARE).buffer);
    expect(titleCodeFrom(legacy)).toEqual(encodeTitleVector(int8(SOFTWARE)));
  });

  it("fills only titles waiting for a vector, newest first", async () => {
    const db = await getDb();
    expect(await noteTitles(db, ["backend engineer", "support engineer"], NOW)).toBe(2);
    expect(await noteTitles(db, ["backend engineer"], NOW + DAY)).toBe(0);
    await noteTitles(db, ["registered nurse"], NOW + 2 * DAY);
    const waiting = await waitingTitles(db, 10);
    expect(waiting[0]).toBe("registered nurse");
    expect(waiting.slice(1).sort()).toEqual(["backend engineer", "support engineer"]);
    const saved = await saveTitleVectors(db, [
      row("backend engineer", SOFTWARE),
      row("never asked for", SOFTWARE),
    ]);
    expect(saved).toBe(1);
    expect(await waitingTitles(db, 10)).toEqual(["registered nurse", "support engineer"]);
    const stored = await readTitleVectors(db, ["backend engineer", "support engineer"]);
    expect([...stored.keys()]).toEqual(["backend engineer"]);
    expect(
      codeSimilarity(stored.get("backend engineer")!, occupationVectors().get(SOFTWARE)!),
    ).toBeCloseTo(1, 5);
    expect(await db.select().from(titles)).toHaveLength(3);
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
