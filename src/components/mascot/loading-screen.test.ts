import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLoadingScreen, LOADING_SCREEN_TIMING } from "./loading-screen";

const { delayMs, minShownMs, fadeMs } = LOADING_SCREEN_TIMING;

describe("loading screen timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("never shows for a wait shorter than the delay", () => {
    const screen = createLoadingScreen();
    const release = screen.request("Loading your resumes");
    vi.advanceTimersByTime(delayMs - 1);
    release();
    vi.advanceTimersByTime(5_000);
    expect(screen.getState()).toEqual({ phase: "hidden", detail: null });
  });

  it("shows after the delay with what is really happening", () => {
    const screen = createLoadingScreen();
    screen.request("Signing you in");
    vi.advanceTimersByTime(delayMs - 1);
    expect(screen.getState().phase).toBe("hidden");
    vi.advanceTimersByTime(1);
    expect(screen.getState()).toEqual({ phase: "shown", detail: "Signing you in" });
  });

  it("stays up for the minimum time once shown, then fades out", () => {
    const screen = createLoadingScreen();
    const release = screen.request("Loading your resumes");
    vi.advanceTimersByTime(delayMs + 100);
    release();
    expect(screen.getState().phase).toBe("shown");
    vi.advanceTimersByTime(minShownMs - 100 - 1);
    expect(screen.getState().phase).toBe("shown");
    vi.advanceTimersByTime(1);
    expect(screen.getState()).toEqual({ phase: "leaving", detail: "Loading your resumes" });
    vi.advanceTimersByTime(fadeMs);
    expect(screen.getState()).toEqual({ phase: "hidden", detail: null });
  });

  it("leaves without extra hold once it has been up long enough", () => {
    const screen = createLoadingScreen();
    const release = screen.request();
    vi.advanceTimersByTime(delayMs + minShownMs + 500);
    release();
    expect(screen.getState().phase).toBe("leaving");
  });

  it("serves several requests with one screen, newest line first", () => {
    const screen = createLoadingScreen();
    const signIn = screen.request("Signing you in");
    vi.advanceTimersByTime(delayMs);
    const resumes = screen.request("Loading your resumes");
    expect(screen.getState().detail).toBe("Loading your resumes");
    signIn();
    vi.advanceTimersByTime(minShownMs + fadeMs);
    expect(screen.getState()).toEqual({ phase: "shown", detail: "Loading your resumes" });
    resumes();
    vi.advanceTimersByTime(fadeMs);
    expect(screen.getState().phase).toBe("hidden");
  });

  it("comes straight back if asked again while fading", () => {
    const screen = createLoadingScreen();
    const first = screen.request("Opening your dashboard");
    vi.advanceTimersByTime(delayMs + minShownMs);
    first();
    expect(screen.getState().phase).toBe("leaving");
    screen.request("Loading your resumes");
    expect(screen.getState()).toEqual({ phase: "shown", detail: "Loading your resumes" });
    vi.advanceTimersByTime(fadeMs * 4);
    expect(screen.getState().phase).toBe("shown");
  });

  it("tells subscribers about each change and ignores a second release", () => {
    const screen = createLoadingScreen();
    const listener = vi.fn();
    screen.subscribe(listener);
    const release = screen.request("Setting up your Pro plan");
    vi.advanceTimersByTime(delayMs);
    expect(listener).toHaveBeenCalledTimes(1);
    release();
    release();
    vi.advanceTimersByTime(minShownMs + fadeMs);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
