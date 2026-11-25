import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyContent, type ContentResponse } from "@/lib/portfolio/content";

const api = vi.hoisted(() => ({ savePortfolioContent: vi.fn(), portfolioContent: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({ toast, dismissToast: vi.fn() }));

const {
  editContent,
  flushContent,
  loadContent,
  resetContentStore,
  setContentSaveWords,
  useContentStore,
} = await import("./content-store");
const { default: en } = await import("@/i18n/messages/en");
setContentSaveWords(en.portfolioContent);

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

describe("an edit typed while the saved content is loading", () => {
  const onScreen = { ...emptyContent(), intro: "Intro on the page" };
  const arrived = { ...emptyContent(), intro: "Intro from the server", about: ["Builds things"] };

  beforeEach(() => {
    resetContentStore();
  });

  it("shows on top of what's on screen, waits for the content, then is sent on top of it", async () => {
    const load = deferred<ContentResponse>();
    const save = deferred<ContentResponse>();
    api.portfolioContent.mockReturnValueOnce(load.promise);
    api.savePortfolioContent.mockReturnValueOnce(save.promise);
    const loading = loadContent("ada", { shown: onScreen });
    pitch("Typed early");
    expect(useContentStore.getState()).toMatchObject({
      status: "loading",
      content: { intro: "Intro on the page", pitch: "Typed early" },
      dirty: true,
    });
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(api.savePortfolioContent).not.toHaveBeenCalled();

    load.resolve({ ok: true, content: arrived, github: null });
    await loading;
    expect(useContentStore.getState()).toMatchObject({
      status: "ready",
      content: { intro: "Intro from the server", about: ["Builds things"], pitch: "Typed early" },
      dirty: true,
      saving: true,
    });
    expect(api.savePortfolioContent.mock.calls.map(([body]) => body.content)).toEqual([
      expect.objectContaining({
        intro: "Intro from the server",
        about: ["Builds things"],
        pitch: "Typed early",
      }),
    ]);

    save.resolve(ANSWER);
    await vi.advanceTimersByTimeAsync(0);
    expect(useContentStore.getState()).toMatchObject({ dirty: false, saving: false });
  });

  it("is still sent when the content fails to load", async () => {
    api.portfolioContent.mockRejectedValueOnce(new Error("offline"));
    api.savePortfolioContent.mockResolvedValue(ANSWER);
    const loading = loadContent("ada", { shown: onScreen });
    pitch("Typed early");
    await loading;
    await vi.advanceTimersByTimeAsync(0);
    expect(api.savePortfolioContent.mock.calls.map(([body]) => body.content)).toEqual([
      expect.objectContaining({ intro: "Intro on the page", pitch: "Typed early" }),
    ]);
    expect(useContentStore.getState()).toMatchObject({ status: "error", dirty: false });
  });

  it("leaves nothing to save when nothing was typed", async () => {
    api.portfolioContent.mockResolvedValueOnce({ ok: true, content: arrived, github: null });
    await loadContent("ada", { shown: onScreen });
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(api.savePortfolioContent).not.toHaveBeenCalled();
    expect(useContentStore.getState()).toMatchObject({ content: arrived, dirty: false });
  });
});
