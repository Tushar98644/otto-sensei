import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import { DASHBOARD_NAMESPACES } from "./namespaces";

// MessagesFor puts these into every full dashboard load (about 43 KB in English and 50 KB in German today, 13 to 15 KB gzipped); room for the rest of the dashboard, not for a stray namespace.
const BUDGET_BYTES = 90_000;

async function payloadBytes(locale: Locale): Promise<number> {
  return Buffer.byteLength(JSON.stringify(await pickMessages(locale, DASHBOARD_NAMESPACES)));
}

describe("the dashboard's messages payload", () => {
  it.each(LOCALES)("stays under the budget in %s", async (locale) => {
    expect(await payloadBytes(locale)).toBeLessThan(BUDGET_BYTES);
  });

  it("sends only the dashboard's namespaces", async () => {
    expect(Object.keys(await pickMessages("en", DASHBOARD_NAMESPACES)).sort()).toEqual(
      [...DASHBOARD_NAMESPACES].sort(),
    );
  });
});
