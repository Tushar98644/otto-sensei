import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { SHARE_NAMESPACES } from "./namespaces";

// Every shared resume page carries these to the browser (about 1.5 KB in English and 1.8 KB in German today), so they stay small.
const BUDGET_BYTES = 4_000;

async function payloadBytes(locale: Locale): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, SHARE_NAMESPACES)));
}

describe("the share page's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it("sends only the share namespace", async () => {
    expect(Object.keys(await pickMessages("en", SHARE_NAMESPACES))).toEqual(["share"]);
  });
});
