import { describe, expect, it } from "vitest";
import { isFocusMusicOn, parseFocusMusic, setFocusMusic } from "./use-focus-music";

describe("focus music choice", () => {
  it("is on only when the browser remembered on", () => {
    expect(parseFocusMusic("on")).toBe(true);
    expect(parseFocusMusic("off")).toBe(false);
    expect(parseFocusMusic(null)).toBe(false);
    expect(parseFocusMusic("true")).toBe(false);
  });

  it("starts off, and holds the choice for the visit when storage is blocked", () => {
    expect(isFocusMusicOn()).toBe(false);
    setFocusMusic(true);
    expect(isFocusMusicOn()).toBe(true);
    setFocusMusic(false);
    expect(isFocusMusicOn()).toBe(false);
  });
});
