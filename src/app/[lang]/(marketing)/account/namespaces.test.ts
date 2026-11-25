import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { ACCOUNT_NAMESPACES } from "./namespaces";

// MessagesFor puts these into /account and the dashboard's Account page (about 18 KB in English and 21 KB in French and German today).
const BUDGET_BYTES = 35_000;

async function payloadBytes(locale: Locale): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, ACCOUNT_NAMESPACES)));
}

describe("the Account page's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it("sends only the account namespace", async () => {
    expect(Object.keys(await pickMessages("en", ACCOUNT_NAMESPACES))).toEqual(["account"]);
  });
});
