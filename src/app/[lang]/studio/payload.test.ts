import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { STUDIO_NAMESPACES } from "./namespaces";

// The studio page carries these messages in its HTML (about 57 KB in English, 66 KB in German today).
const BUDGET_BYTES = 72_000;

async function payloadBytes(locale: (typeof LOCALES)[number]): Promise<number> {
  const messages = await pickMessages(locale, STUDIO_NAMESPACES);
  return new TextEncoder().encode(JSON.stringify(messages)).length;
}

describe("studio messages payload", () => {
  it.each(LOCALES)("keeps %s under the budget", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it("passes only the studio's own namespaces", async () => {
    expect(Object.keys(await pickMessages("en", STUDIO_NAMESPACES)).sort()).toEqual(
      [...STUDIO_NAMESPACES].sort(),
    );
  });
});
