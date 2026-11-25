import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { PORTFOLIO_NAMESPACES } from "./namespaces";

// Sent on the portfolio page only, beside the dashboard's own (about 21 KB in English and 24 KB in French and German today).
const BUDGET_BYTES = 40_000;

async function payloadBytes(locale: Locale): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, PORTFOLIO_NAMESPACES)));
}

describe("the portfolio editor's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it("sends only the editor's namespaces", async () => {
    expect(Object.keys(await pickMessages("en", PORTFOLIO_NAMESPACES)).sort()).toEqual(
      [...PORTFOLIO_NAMESPACES].sort(),
    );
  });
});
