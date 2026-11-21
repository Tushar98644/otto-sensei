import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsageSnapshot } from "@/config/plans";
import type { TailorResult } from "@/lib/ai/types";
import { RESULT_TTL_MS } from "@/lib/api/request-id";
import type { TailorResponse } from "@/lib/api/types";
import { emptyResume } from "@/lib/resume/schema";

const mocks = vi.hoisted(() => ({ tailor: vi.fn(), patchMe: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { tailor: mocks.tailor } }));
vi.mock("@/components/account/use-me", () => ({ patchMe: mocks.patchMe }));

const { loadDraft, loadResult, saveTailorSession } = await import("./session");
const { cancelTailorTask, forgetTailorTask, startTailorTask, tailorTaskFor } =
  await import("./tailor-task");

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const result: TailorResult = {
  job: { title: "Designer", company: "Canva" },
  requirements: [],
  keywords: [],
  askUser: [],
  bulletOrder: [],
  summary: "",
  notes: [],
};
const usage = {} as UsageSnapshot;
const source = { ...emptyResume(5_000), id: "resume-1" };
const job = { title: "Designer", company: "Canva", text: "The post as it was sent." };

beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: memoryStorage(), addEventListener: () => {} });
  mocks.tailor.mockReset();
  mocks.patchMe.mockReset();
});

afterEach(() => {
  window.sessionStorage.clear();
  const task = tailorTaskFor(source);
  if (task) forgetTailorTask(source.id, task);
  vi.unstubAllGlobals();
});

describe("a tailor run", () => {
  it("keeps a result that lands after the step was left, and a remount adopts the same run", async () => {
    const reply = Promise.withResolvers<TailorResponse>();
    mocks.tailor.mockReturnValueOnce(reply.promise);
    const task = startTailorTask(source, job);
    expect(tailorTaskFor(source)).toBe(task);
    expect(startTailorTask(source, job)).toBe(task);
    expect(mocks.tailor).toHaveBeenCalledTimes(1);

    const typedSince = { ...job, text: "Edited while Otto worked." };
    saveTailorSession(typedSince, null);
    reply.resolve({ ok: true, result, usage, demo: false });
    const saved = await task.promise;

    expect(saved).toMatchObject({ sourceId: source.id, sourceUpdatedAt: 5_000, job, result });
    expect(task.done).toBe(saved);
    const kept = { ...saved, demo: undefined };
    expect(loadResult(source.id)).toEqual(kept);
    expect(loadDraft()).toEqual(typedSince);
    expect(mocks.patchMe).toHaveBeenCalledWith({ usage });

    forgetTailorTask(source.id, task);
    expect(tailorTaskFor(source)).toBeNull();
    expect(loadResult(source.id)).toEqual(kept);
  });

  it("drops a cancelled run's result but keeps the usage it spent, and lets a new run start", async () => {
    const reply = Promise.withResolvers<TailorResponse>();
    mocks.tailor.mockReturnValueOnce(reply.promise);
    const before = Date.now();
    const task = startTailorTask(source, job);
    expect(task.startedAt).toBeGreaterThanOrEqual(before);

    cancelTailorTask(source.id, task);
    expect(tailorTaskFor(source)).toBeNull();
    expect(mocks.tailor).toHaveBeenCalledTimes(1);
    mocks.tailor.mockReturnValueOnce(new Promise(() => {}));
    expect(startTailorTask(source, job)).not.toBe(task);
    const [first, again] = mocks.tailor.mock.calls.map((call: unknown[]) => call[1]);
    expect(again).toEqual(first);

    reply.resolve({ ok: true, result, usage, demo: false });
    await task.promise;
    expect(loadResult(source.id)).toBeNull();
    expect(mocks.patchMe).toHaveBeenCalledWith({ usage });
  });

  it("forgets a failed run, so trying again sends a new one", async () => {
    mocks.tailor.mockRejectedValueOnce(new Error("offline"));
    const failed = startTailorTask(source, job);
    await expect(failed.promise).rejects.toThrow("offline");
    expect(tailorTaskFor(source)).toBeNull();
    expect(loadResult(source.id)).toBeNull();

    mocks.tailor.mockResolvedValueOnce({ ok: true, result, usage, demo: true });
    const retry = startTailorTask(source, job);
    expect(retry).not.toBe(failed);
    expect((await retry.promise).demo).toBe(true);
    expect(mocks.tailor).toHaveBeenCalledTimes(2);
  });

  it("sends the same request id for the same run until it lands, so a retry never pays twice", async () => {
    const run = async (draft = job) => {
      const task = startTailorTask(source, draft);
      await task.promise.catch(() => {});
      forgetTailorTask(source.id, task);
    };
    mocks.tailor.mockRejectedValueOnce(new Error("offline"));
    await run();
    mocks.tailor.mockResolvedValue({ ok: true, result, usage, demo: false });
    await run();
    const [first, retry] = mocks.tailor.mock.calls.map((call: unknown[]) => call[1]);
    expect(first).toEqual({ id: expect.any(String) });
    expect(retry).toEqual(first);

    await run();
    await run({ ...job, text: "Another post entirely." });
    const later = mocks.tailor.mock.calls.slice(2).map((call: unknown[]) => call[1]);
    expect(later[0]).not.toEqual(first);
    expect(later[1]).not.toEqual(later[0]);
  });

  it("picks a run cut off by a reload up again, asking only for the answer already paid for", async () => {
    mocks.tailor.mockReturnValueOnce(new Promise(() => {}));
    const cut = startTailorTask(source, job);
    forgetTailorTask(source.id, cut);
    const [sent] = mocks.tailor.mock.calls.map((call: unknown[]) => call[1]) as { id: string }[];

    mocks.tailor.mockResolvedValueOnce({ ok: true, result, usage, demo: false });
    const picked = tailorTaskFor(source);
    expect(picked).not.toBeNull();
    expect(mocks.tailor).toHaveBeenLastCalledWith(mocks.tailor.mock.calls[0]?.[0], {
      id: sent?.id,
      resume: true,
    });
    expect((await picked?.promise)?.job).toEqual(job);
    expect(loadResult(source.id)?.result).toEqual(result);

    if (picked) forgetTailorTask(source.id, picked);
    expect(tailorTaskFor(source)).toBeNull();
    expect(mocks.tailor).toHaveBeenCalledTimes(2);
  });

  it("leaves a run alone once it failed, the resume changed or the answer is too old to be kept", async () => {
    mocks.tailor.mockRejectedValueOnce(new Error("offline"));
    const failed = startTailorTask(source, job);
    await failed.promise.catch(() => {});
    expect(tailorTaskFor(source)).toBeNull();

    mocks.tailor.mockReturnValue(new Promise(() => {}));
    forgetTailorTask(source.id, startTailorTask(source, job));
    expect(tailorTaskFor({ ...source, updatedAt: 6_000 })).toBeNull();

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + RESULT_TTL_MS + 1);
    expect(tailorTaskFor(source)).toBeNull();
    vi.mocked(Date.now).mockRestore();
    expect(mocks.tailor).toHaveBeenCalledTimes(2);
  });
});
