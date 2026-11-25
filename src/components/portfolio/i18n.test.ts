import { describe, expect, it } from "vitest";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";
import { loadMessages } from "@/i18n/messages";
import { contentChecklist } from "@/lib/portfolio/content-uses";
import { jordanContentView } from "@/lib/portfolio/fixtures/jordan";
import { SLUG_MAX, SLUG_MESSAGES, SLUG_MIN } from "@/lib/portfolio/slug";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_SECTION_LABELS, PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { joinAnd } from "./i18n";

// The editor reads these from messages; the marketing pages and the API still read lib's English.
describe("the portfolio's English messages", () => {
  it("describe each design as the template list does", () => {
    for (const id of PORTFOLIO_TEMPLATE_IDS) {
      expect(en.portfolio.templates[id]).toBe(PORTFOLIO_TEMPLATE_INFO[id].description);
    }
  });

  it("word the address rules as the API does", () => {
    const values = { min: SLUG_MIN, max: SLUG_MAX };
    for (const [problem, text] of Object.entries(en.portfolio.address.problems)) {
      expect(fmt(text, values)).toBe(SLUG_MESSAGES[problem as keyof typeof SLUG_MESSAGES]);
    }
  });

  it("name the sections as the page settings do", () => {
    expect(en.portfolio.sections).toEqual(PORTFOLIO_SECTION_LABELS);
  });

  it("join lists without a serial comma, as before", () => {
    expect(joinAnd("{list} and {last}", ["a", "b", "c"])).toBe("a, b and c");
    expect(joinAnd("{list} and {last}", ["a"])).toBe("a");
  });
});

describe("the content checklist in Spanish", () => {
  it("names each part and counts in Spanish", async () => {
    const { checklist } = await loadMessages("es", "portfolioContent");
    const items = contentChecklist(
      jordanContentView(),
      ["talks", "writing", "github"],
      checklist,
      formatFor("es"),
    );
    expect(items.map((item) => item.label)).toEqual(["Charlas", "Escritos", "GitHub"]);
    expect(items[0]?.note).toMatch(/^\d+ charlas?$/);
    expect(items[1]?.note).toMatch(/^\d+ artículos?$/);
  });
});
