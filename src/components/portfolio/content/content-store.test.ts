import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyContent, type ContentResponse } from "@/lib/portfolio/content";

const api = vi.hoisted(() => ({ savePortfolioContent: vi.fn(), portfolioContent: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({ toast, dismissToast: vi.fn() }));

const { editContent, flushContent, resetContentStore, useContentStore } =
  await import("./content-store");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

const ANSWER: ContentResponse = { ok: true, content: emptyContent(), github: null };
const SAVE_AFTER_MS = 900;

const pitch = (text: string) => editContent((content) => ({ ...content, pitch: text }));
const sent = () =>
  api.savePortfolioContent.mock.calls.map(([body, options]) => [
    body.content.pitch,
    options.keepalive,
  ]);

beforeEach(() => {
  vi.useFakeTimers();
  resetContentStore();
  useContentStore.setState({ status: "ready", owner: "ada" });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("content autosave", () => {
  it("sends one save at a time: edits made meanwhile go next, newest only", async () => {
    const first = deferred<ContentResponse>();
    api.savePortfolioContent.mockReturnValueOnce(first.promise).mockResolvedValue(ANSWER);
    pitch("Builds");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    pitch("Builds tools");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    pitch("Builds tools for teams");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(sent()).toEqual([["Builds", false]]);
    expect(useContentStore.getState().dirty).toBe(true);

    first.resolve(ANSWER);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent()).toEqual([
      ["Builds", false],
      ["Builds tools for teams", false],
    ]);
    expect(useContentStore.getState()).toMatchObject({ dirty: false, saving: false });
  });

  it("waits for the save on its way when asked to flush, then sends what's left", async () => {
    const first = deferred<ContentResponse>();
    api.savePortfolioContent.mockReturnValueOnce(first.promise).mockResolvedValue(ANSWER);
    pitch("Builds");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    pitch("Builds tools");
    const flushed = flushContent();
    expect(sent()).toEqual([["Builds", false]]);

    first.resolve(ANSWER);
    await flushed;
    expect(sent()).toEqual([
      ["Builds", false],
      ["Builds tools", false],
    ]);
    expect(useContentStore.getState().dirty).toBe(false);
  });

  it("sends a page's last edits at once when it's being left, even with a save on its way", async () => {
    const first = deferred<ContentResponse>();
    api.savePortfolioContent.mockReturnValueOnce(first.promise).mockResolvedValue(ANSWER);
    pitch("Builds");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    pitch("Builds tools");
    await flushContent({ keepalive: true });
    expect(sent()).toEqual([
      ["Builds", false],
      ["Builds tools", true],
    ]);
    first.resolve(ANSWER);
    await vi.advanceTimersByTimeAsync(0);
    expect(sent()).toHaveLength(2);
  });

  it("keeps the edit after a failed save and sends it with the next one", async () => {
    api.savePortfolioContent.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(ANSWER);
    pitch("Builds");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't save that" }));
    expect(useContentStore.getState().dirty).toBe(true);

    pitch("Builds tools");
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(sent()).toEqual([
      ["Builds", false],
      ["Builds tools", false],
    ]);
    expect(useContentStore.getState().dirty).toBe(false);
  });
});
