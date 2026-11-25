import { describe, expect, it, vi } from "vitest";
import { emailLocale, emailMessages, localizedPath, signOff } from "./locale";

const live = vi.hoisted(() => new Set<string>(["en"]));

// config.ts lists only English as live today; this stands in for the day Spanish goes live.
vi.mock("@/i18n/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/i18n/config")>();
  return { ...real, isEnabledLocale: (value: unknown) => real.isLocale(value) && live.has(value) };
});

describe("emailLocale", () => {
  it("reads the saved language, and anything else as English", () => {
    expect(emailLocale("es")).toBe("es");
    expect(emailLocale("pt-BR")).toBe("pt-BR");
    for (const value of [null, undefined, "", "pt", "es-MX", "EN", "xx", 42]) {
      expect(emailLocale(value)).toBe("en");
    }
    expect(emailMessages(emailLocale(null))).toBe(emailMessages("en"));
  });
});

describe("localizedPath", () => {
  it("leaves English, and a language that isn't live, unprefixed", () => {
    expect(localizedPath("en", "/dashboard/account#reminders")).toBe(
      "/dashboard/account#reminders",
    );
    expect(localizedPath("es", "/account")).toBe("/account");
    expect(localizedPath("de", "/terms")).toBe("/terms");
  });

  it("prefixes a live language, so the visit sets its cookie", () => {
    live.add("es");
    live.add("pt-BR");
    try {
      expect(localizedPath("es", "/dashboard/career-log/check-in?month=2026-11")).toBe(
        "/es/dashboard/career-log/check-in?month=2026-11",
      );
      expect(localizedPath("pt-BR", "/dashboard/account#career-log")).toBe(
        "/pt-br/dashboard/account#career-log",
      );
      expect(localizedPath("es", "/terms")).toBe("/es/terms");
      expect(localizedPath("es", "/")).toBe("/es");
      expect(localizedPath("fr", "/terms")).toBe("/terms");
    } finally {
      live.delete("es");
      live.delete("pt-BR");
    }
  });
});

describe("signOff", () => {
  it("signs as Otto in every language", () => {
    expect(signOff("en")).toBe("Otto, from Otto Sensei");
    expect(signOff("de")).toBe("Otto von Otto Sensei");
  });
});
