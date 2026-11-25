import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import type { Namespace } from "@/i18n/messages";
import { ACCOUNT_NAMESPACES, ACCOUNT_PAGE_NAMESPACES } from "./namespaces";

// MessagesFor puts these into /account and the dashboard's Account page (about 18 KB in English and 21 KB in French and German today).
const BUDGET_BYTES = 35_000;

// /account alone adds Otto's lines and the app's dialogs, which the dashboard's layout already sends.
const PAGE_BUDGET_BYTES = 60_000;

async function payloadBytes(
  locale: Locale,
  namespaces: readonly Namespace[] = ACCOUNT_NAMESPACES,
): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, namespaces)));
}

describe("the Account page's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it.each(LOCALES)("stays under its budget on /account in %s", async (locale) => {
    expect(await payloadBytes(locale, ACCOUNT_PAGE_NAMESPACES)).toBeLessThan(PAGE_BUDGET_BYTES);
  });

  it("sends only the account namespace", async () => {
    expect(Object.keys(await pickMessages("en", ACCOUNT_NAMESPACES))).toEqual(["account"]);
  });
});
