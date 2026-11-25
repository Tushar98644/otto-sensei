import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { applicationsWords } from "./application-dialog-anywhere";

describe("the Mark applied dialog's own words", () => {
  it("loads the dialog's words in every language, for pages that don't send them", async () => {
    expect((await applicationsWords("en")).dialog.markApplied).toBe("Mark as applied");
    for (const locale of LOCALES) {
      const words = await applicationsWords(locale);
      expect(words.dialog.markApplied.length).toBeGreaterThan(0);
      expect(words.dialog.add.length).toBeGreaterThan(0);
    }
    expect((await applicationsWords("es")).dialog.markApplied).not.toBe("Mark as applied");
  });
});
