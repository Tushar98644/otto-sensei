import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PricingPlans } from "./pricing-plans";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PricingPlans", () => {
  it("shows the monthly reference prices, their discounts and the Rezi line on Pro only", () => {
    const html = text(
      renderToStaticMarkup(
        <PricingPlans offer={{ pro: ["month", "year", "week"], max: ["month", "year"] }} />,
      ),
    );
    expect(html).toContain("Reference price $30 $15 /month");
    expect(html).toContain("50% off");
    expect(html).toContain("Reference price $60 $29 /month");
    expect(html).toContain("52% off");
    expect(html.match(/About half the price of Rezi Pro \(\$29\/mo\)/g)).toHaveLength(1);
    expect(html.match(/Less than a pizza a month\./g)).toHaveLength(1);
    // Free lists exactly its basics.
    expect(html).toContain("1 resume");
    expect(html).toContain("Classic and Compact formats");
  });
});
