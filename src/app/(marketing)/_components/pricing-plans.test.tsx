import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHOW_REFERENCE_PRICES } from "@/config/plans";
import { PricingPlans } from "./pricing-plans";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PricingPlans", () => {
  it("shows monthly prices (struck-through references only when switched on) and the Rezi line on Pro only", () => {
    const html = text(
      renderToStaticMarkup(
        <PricingPlans offer={{ pro: ["month", "year", "week"], max: ["month", "year"] }} />,
      ),
    );
    if (SHOW_REFERENCE_PRICES) {
      expect(html).toContain("Reference price $30 $15 /month");
      expect(html).toContain("50% off");
      expect(html).toContain("Reference price $60 $29 /month");
      expect(html).toContain("52% off");
    } else {
      expect(html).not.toContain("Reference price");
      expect(html).not.toMatch(/\d+% off/);
      expect(html).toContain("$15 /month");
      expect(html).toContain("$29 /month");
    }
    expect(html.match(/About half the price of Rezi Pro \(\$29\/mo\)/g)).toHaveLength(1);
    expect(html.match(/Less than a pizza a month\./g)).toHaveLength(1);
    // Free lists exactly its basics.
    expect(html).toContain("1 resume");
    expect(html).toContain("Classic and Compact formats");
  });
});
