import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanPerks } from "./pro-perks";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PlanPerks", () => {
  it("lists monthly limits for monthly and yearly options", () => {
    for (const interval of [undefined, "month", "year"] as const) {
      const html = text(renderToStaticMarkup(<PlanPerks plan="pro" interval={interval} />));
      expect(html).toContain("60 tailored versions a month");
      expect(html).toContain("Free has 3.");
      expect(html).toContain("Limits reset on the 1st.");
    }
  });

  it("lists weekly limits for a weekly option, next to the plan below", () => {
    const pro = text(renderToStaticMarkup(<PlanPerks plan="pro" interval="week" />));
    expect(pro).toContain("15 tailored versions a week");
    expect(pro).toContain("75 line fixes a week");
    // Free has no weekly plan, so its monthly number says so.
    expect(pro).toContain("Free has 3 a month.");
    expect(pro).not.toContain("60 tailored versions");

    const max = text(renderToStaticMarkup(<PlanPerks plan="max" interval="week" />));
    expect(max).toContain("50 tailored versions a week");
    expect(max).toContain("Pro has 15.");
    expect(max).toContain("Limits reset each billing week");
  });
});
