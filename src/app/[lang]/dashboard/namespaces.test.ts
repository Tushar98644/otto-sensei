import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import type { Namespace } from "@/i18n/messages";
import { pickMessages } from "@/i18n/server";
import { DASHBOARD_NAMESPACES, PAGE_NAMESPACES } from "./namespaces";

// MessagesFor puts these into every full dashboard load (about 47 KB in English and 55 KB in German today); a page's own namespaces come on top (Interview prep about 15 KB more, Applications about 7 KB). Room for the rest of the dashboard, not for a stray namespace.
const BUDGET_BYTES = 90_000;

async function payloadBytes(locale: Locale, namespaces: readonly Namespace[]): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, namespaces)));
}

describe("the dashboard's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale, DASHBOARD_NAMESPACES)).toBeLessThan(BUDGET_BYTES);
  });

  it.each(LOCALES)(
    "stays under the budget with each page's own namespaces in %s",
    async (locale) => {
      for (const page of Object.values(PAGE_NAMESPACES)) {
        const bytes =
          (await payloadBytes(locale, DASHBOARD_NAMESPACES)) + (await payloadBytes(locale, page));
        expect(bytes).toBeLessThan(BUDGET_BYTES);
      }
    },
  );

  it("sends only the dashboard's namespaces", async () => {
    expect(Object.keys(await pickMessages("en", DASHBOARD_NAMESPACES)).sort()).toEqual(
      [...DASHBOARD_NAMESPACES].sort(),
    );
  });

  it("keeps a page's namespaces out of the layout's", () => {
    const layout: readonly Namespace[] = DASHBOARD_NAMESPACES;
    for (const page of Object.values(PAGE_NAMESPACES)) {
      for (const namespace of page) expect(layout).not.toContain(namespace);
    }
  });
});
