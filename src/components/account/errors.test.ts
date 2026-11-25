import { describe, expect, it, vi } from "vitest";
import enApp from "@/i18n/messages/en/app";
import esApp from "@/i18n/messages/es/app";

const page = vi.hoisted(() => ({ current: null as null | { locale: string; messages: object } }));
vi.mock("@/i18n/client", () => ({ pageMessages: () => page.current }));

const { errorMessage } = await import("./errors");

describe("errorMessage without the caller's words", () => {
  it("keeps the English fallback on an English page or none", () => {
    expect(errorMessage(new Error("x"))).toBe("Something went wrong. Please try again.");
    page.current = { locale: "en", messages: { app: enApp } };
    expect(errorMessage(new Error("x"))).toBe("Something went wrong. Please try again.");
  });

  it("uses the page's words in another language", () => {
    page.current = { locale: "es", messages: { app: esApp } };
    expect(errorMessage(new Error("x"))).toBe(esApp.errors.fallback);
    expect(errorMessage(new Error("x"), { fallback: "given", offline: "off" })).toBe("given");
  });
});
