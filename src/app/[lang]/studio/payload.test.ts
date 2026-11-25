import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { STUDIO_NAMESPACES } from "./namespaces";

// The studio page carries these messages in its HTML (about 73 KB in English, 85 KB in French and German today).
// Raised from 72 KB when the sign-in, upgrade and share dialogs, Otto's limit lines and the app's shared words joined it.
const BUDGET_BYTES = 100_000;

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
