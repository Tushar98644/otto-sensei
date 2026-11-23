import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { meteredCalls } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import {
  openPass,
  PASS_TTL_MS,
  PASS_USES,
  passSubject,
  returnPass,
  takePass,
} from "./usage-passes";

const NOW = Date.UTC(2026, 10, 21, 9, 0);

beforeEach(async () => {
  await resetDb();
});

describe("usage passes", () => {
  it("binds a subject to every part of it", () => {
    expect(passSubject("Ran the blog", "Writer", "Acme")).toBe(
      passSubject("Ran the blog", "Writer", "Acme"),
    );
    expect(passSubject("Ran the blog", "Writer", "Acme")).not.toBe(
      passSubject("Ran the blog", "Writer", "Acm"),
    );
    expect(passSubject("a", "bc", "")).not.toBe(passSubject("ab", "c", ""));
  });

  it("gives a few uses to the account that opened it, then none", async () => {
    const ada = await createUser("ada@example.com");
    const bob = await createUser("bob@example.com");
    const pass = { userId: ada.id, feature: "fix" as const, subject: passSubject("line") };
    expect(await takePass(pass, NOW)).toBe(false);

    await openPass(pass, NOW);
    expect(await takePass({ ...pass, userId: bob.id }, NOW)).toBe(false);
    expect(await takePass({ ...pass, subject: passSubject("other line") }, NOW)).toBe(false);
    expect(await takePass({ ...pass, feature: "tailor" }, NOW)).toBe(false);
    for (let i = 0; i < PASS_USES; i++) expect(await takePass(pass, NOW)).toBe(true);
    expect(await takePass(pass, NOW)).toBe(false);

    await returnPass(pass);
    expect(await takePass(pass, NOW)).toBe(true);
  });

  it("ends at its expiry, and opening again starts it over", async () => {
    const ada = await createUser();
    const pass = { userId: ada.id, feature: "fix" as const, subject: passSubject("line") };
    await openPass(pass, NOW);
    expect(await takePass(pass, NOW + PASS_TTL_MS)).toBe(false);

    await openPass(pass, NOW + PASS_TTL_MS);
    expect(await takePass(pass, NOW + PASS_TTL_MS + 1)).toBe(true);
  });

  it("never gives back more uses than a pass starts with, and tidies the account's dead passes", async () => {
    const ada = await createUser();
    const pass = { userId: ada.id, feature: "fix" as const, subject: passSubject("line") };
    await openPass({ ...pass, subject: passSubject("old line") }, NOW);
    await openPass(pass, NOW);
    await returnPass(pass);
    const rows = await (await getDb()).select().from(meteredCalls);
    expect(rows.find((row) => row.key === `fix:${pass.subject}`)?.usesLeft).toBe(PASS_USES);

    await openPass(pass, NOW + PASS_TTL_MS + 1);
    expect((await (await getDb()).select().from(meteredCalls)).map((left) => left.key)).toEqual([
      `fix:${pass.subject}`,
    ]);
  });
});
