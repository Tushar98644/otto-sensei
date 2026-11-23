import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { meteredCalls } from "@/db/schema";
import { REQUEST_ID_HEADER, RESULT_TTL_MS, RESUME_HEADER } from "@/lib/api/request-id";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import {
  claimRun,
  dropRun,
  isResume,
  readRequestId,
  requestKey,
  RUN_MS,
  saveResult,
} from "./metered-results";

const NOW = Date.UTC(2026, 10, 21, 9, 0);
const QUICK = { pollMs: 1, polls: 2 };
const RESUME = { ...QUICK, resume: true };

beforeEach(async () => {
  await resetDb();
});

describe("metered results", () => {
  it("reads only a well-formed request id", () => {
    const withId = (id: string) =>
      new Request("http://localhost/api/tailor", { headers: { [REQUEST_ID_HEADER]: id } });
    expect(readRequestId(withId("0f8c2b7e-6a59-4c1e-9d43-1b2a3c4d5e6f"))).toBe(
      "0f8c2b7e-6a59-4c1e-9d43-1b2a3c4d5e6f",
    );
    expect(readRequestId(withId("short"))).toBeNull();
    expect(readRequestId(withId("not a valid id at all!"))).toBeNull();
    expect(readRequestId(new Request("http://localhost/api/tailor"))).toBeNull();

    expect(
      isResume(new Request("http://localhost/api/tailor", { headers: { [RESUME_HEADER]: "1" } })),
    ).toBe(true);
    expect(
      isResume(new Request("http://localhost/api/tailor", { headers: { [RESUME_HEADER]: "yes" } })),
    ).toBe(false);
    expect(isResume(new Request("http://localhost/api/tailor"))).toBe(false);
  });

  it("keys on the feature, the id and the input together", () => {
    const id = "0f8c2b7e-6a59-4c1e-9d43-1b2a3c4d5e6f";
    const key = requestKey("tailor", id, { job: "a" });
    expect(requestKey("tailor", id, { job: "a" })).toBe(key);
    expect(requestKey("tailor", id, { job: "b" })).not.toBe(key);
    expect(requestKey("letter", id, { job: "a" })).not.toBe(key);
    expect(requestKey("tailor", `${id}0`, { job: "a" })).not.toBe(key);
  });

  it("runs once, keeps the answer for its owner, and never shares it", async () => {
    const ada = await createUser("ada@example.com");
    const bob = await createUser("bob@example.com");
    expect(await claimRun(ada.id, "key", NOW, QUICK)).toEqual({ kind: "run", key: "key" });
    expect(await claimRun(ada.id, "key", NOW, QUICK)).toEqual({ kind: "busy" });

    await saveResult(ada.id, "key", { text: "paid for" }, true, NOW);
    expect(await claimRun(ada.id, "key", NOW + 1, QUICK)).toEqual({
      kind: "done",
      result: { text: "paid for" },
      demo: true,
    });
    expect(await claimRun(bob.id, "key", NOW + 1, QUICK)).toEqual({ kind: "run", key: "key" });
  });

  it("lets the next try run after a failed run is dropped, or a run died", async () => {
    const ada = await createUser();
    await claimRun(ada.id, "key", NOW, QUICK);
    await dropRun(ada.id, "key");
    expect(await claimRun(ada.id, "key", NOW, QUICK)).toEqual({ kind: "run", key: "key" });
    expect(await claimRun(ada.id, "key", NOW + RUN_MS - 10, QUICK)).toEqual({ kind: "busy" });
    expect(await claimRun(ada.id, "key", NOW + RUN_MS + 1, QUICK)).toEqual({
      kind: "run",
      key: "key",
    });
  });

  it("forgets an answer after ten minutes, and a saved answer is never dropped", async () => {
    const ada = await createUser();
    await claimRun(ada.id, "key", NOW, QUICK);
    await saveResult(ada.id, "key", { text: "paid for" }, false, NOW);
    await dropRun(ada.id, "key");
    expect((await claimRun(ada.id, "key", NOW + RESULT_TTL_MS - 1, QUICK)).kind).toBe("done");
    expect(await claimRun(ada.id, "key", NOW + RESULT_TTL_MS + 1, QUICK)).toEqual({
      kind: "run",
      key: "key",
    });

    await claimRun(ada.id, "old", NOW, QUICK);
    await saveResult(ada.id, "key", { text: "again" }, false, NOW + 2 * RESULT_TTL_MS);
    expect((await (await getDb()).select().from(meteredCalls)).map((row) => row.key)).toEqual([
      "key",
    ]);
  });

  it("hands a resume only an answer already there, waiting while it runs, and never takes the slot", async () => {
    const ada = await createUser("ada@example.com");
    expect(await claimRun(ada.id, "key", NOW, RESUME)).toEqual({ kind: "missing" });
    expect(await (await getDb()).select().from(meteredCalls)).toEqual([]);

    await claimRun(ada.id, "key", NOW, QUICK);
    expect(await claimRun(ada.id, "key", NOW + 1, RESUME)).toEqual({ kind: "busy" });
    expect(await claimRun(ada.id, "key", NOW + RUN_MS, RESUME)).toEqual({ kind: "missing" });

    const pending = claimRun(ada.id, "key", NOW + 1, { resume: true, pollMs: 5, polls: 20 });
    await saveResult(ada.id, "key", { text: "paid for" }, false, NOW);
    expect(await pending).toEqual({ kind: "done", result: { text: "paid for" }, demo: false });

    const bob = await createUser("bob@example.com");
    expect(await claimRun(bob.id, "key", NOW + 1, RESUME)).toEqual({ kind: "missing" });
    expect(await claimRun(ada.id, "key", NOW + RESULT_TTL_MS + 1, RESUME)).toEqual({
      kind: "missing",
    });
  });
});
