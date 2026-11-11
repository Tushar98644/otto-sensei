import { describe, expect, it, vi } from "vitest";
import { createStepLoader } from "./step-loader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createStepLoader", () => {
  it("starts idle and imports nothing until asked", () => {
    const importer = vi.fn(() => Promise.resolve("step"));
    const loader = createStepLoader(importer);
    expect(loader.getState()).toEqual({ status: "idle" });
    expect(importer).not.toHaveBeenCalled();
  });

  it("shares one import between callers and keeps the result", async () => {
    const pending = deferred<string>();
    const importer = vi.fn(() => pending.promise);
    const loader = createStepLoader(importer);

    const first = loader.load();
    const second = loader.load();
    expect(loader.getState()).toEqual({ status: "loading" });
    pending.resolve("step");

    await expect(first).resolves.toBe("step");
    await expect(second).resolves.toBe("step");
    expect(loader.getState()).toEqual({ status: "ready", value: "step" });
    await expect(loader.load()).resolves.toBe("step");
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("returns the same state object until something changes", async () => {
    const loader = createStepLoader(() => Promise.resolve("step"));
    expect(loader.getState()).toBe(loader.getState());
    await loader.load();
    expect(loader.getState()).toBe(loader.getState());
  });

  it("tells subscribers about each change, and stops after unsubscribing", async () => {
    const loader = createStepLoader(() => Promise.resolve("step"));
    const listener = vi.fn();
    const unsubscribe = loader.subscribe(listener);
    await loader.load();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await loader.load();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reports a failed import, then tries again on the next load", async () => {
    const importer = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValueOnce("step");
    const loader = createStepLoader(importer);

    await expect(loader.load()).rejects.toThrow("chunk failed");
    const failed = loader.getState();
    expect(failed.status).toBe("failed");
    expect(failed.status === "failed" && failed.error).toBeInstanceOf(Error);

    await expect(loader.load()).resolves.toBe("step");
    expect(loader.getState()).toEqual({ status: "ready", value: "step" });
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
