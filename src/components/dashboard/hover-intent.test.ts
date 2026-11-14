import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOVER_INTENT_MS, hoverIntent } from "./hover-intent";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hoverIntent", () => {
  it("does nothing for a pointer that only passes over the link", () => {
    const onIntent = vi.fn();
    const link = hoverIntent().handlers(onIntent);
    link.onMouseEnter();
    vi.advanceTimersByTime(100);
    link.onMouseLeave();
    vi.advanceTimersByTime(HOVER_INTENT_MS * 2);
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("acts once the pointer rests, and at once on focus, touch or press", () => {
    const onIntent = vi.fn();
    const link = hoverIntent().handlers(onIntent);
    link.onMouseEnter();
    vi.advanceTimersByTime(HOVER_INTENT_MS);
    expect(onIntent).toHaveBeenCalledTimes(1);
    link.onFocus();
    link.onTouchStart();
    link.onPointerDown();
    expect(onIntent).toHaveBeenCalledTimes(4);
  });

  it("a press before the wait is over acts once, not twice", () => {
    const onIntent = vi.fn();
    const link = hoverIntent().handlers(onIntent);
    link.onMouseEnter();
    link.onPointerDown();
    vi.advanceTimersByTime(HOVER_INTENT_MS * 2);
    expect(onIntent).toHaveBeenCalledTimes(1);
  });

  it("forgets a waiting hover when the link goes away", () => {
    const onIntent = vi.fn();
    const intent = hoverIntent();
    intent.handlers(onIntent).onMouseEnter();
    intent.cancel();
    vi.advanceTimersByTime(HOVER_INTENT_MS * 2);
    expect(onIntent).not.toHaveBeenCalled();
  });
});
