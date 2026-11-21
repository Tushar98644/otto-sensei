import { describe, expect, it } from "vitest";
import { commandPaletteShortcut, isApplePlatform, isPaletteShortcut } from "./command-palette-store";

const key = (over: Partial<Parameters<typeof isPaletteShortcut>[0]> = {}) => ({
  key: "k",
  code: "KeyK",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
});

describe("isPaletteShortcut", () => {
  it("takes ⌘K on Apple devices and Ctrl+K elsewhere", () => {
    expect(isPaletteShortcut(key({ metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key({ metaKey: true, key: "K" }), true)).toBe(true);
    expect(isPaletteShortcut(key({ ctrlKey: true }), false)).toBe(true);
  });

  it("leaves Ctrl+K to the text field on a Mac, and ⌘K alone elsewhere", () => {
    expect(isPaletteShortcut(key({ ctrlKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true, ctrlKey: true }), true)).toBe(false);
  });

  it("ignores other keys, extra modifiers and typing in progress", () => {
    expect(isPaletteShortcut(key(), true)).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true, key: "j", code: "KeyJ" }), true)).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key({ ctrlKey: true, altKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true, isComposing: true }), true)).toBe(false);
  });

  it("finds the K key on non-Latin layouts without taking another letter on Latin ones", () => {
    expect(isPaletteShortcut(key({ ctrlKey: true, key: "л" }), false)).toBe(true);
    expect(isPaletteShortcut(key({ metaKey: true, key: "t" }), true)).toBe(false);
  });
});

describe("commandPaletteShortcut", () => {
  it("names the keys the way each platform prints them", () => {
    expect(isApplePlatform("MacIntel")).toBe(true);
    expect(isApplePlatform("macOS")).toBe(true);
    expect(isApplePlatform("iPhone")).toBe(true);
    expect(isApplePlatform("Win32")).toBe(false);
    expect(isApplePlatform("Linux x86_64")).toBe(false);
    expect(commandPaletteShortcut(true)).toBe("⌘K");
    expect(commandPaletteShortcut(false)).toBe("Ctrl K");
  });
});
