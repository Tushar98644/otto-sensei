import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanPerks } from "./pro-perks";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PlanPerks", () => {
  it("lists monthly limits for monthly and yearly options, next to Free's line fixes", () => {
    for (const interval of [undefined, "month", "year"] as const) {
      const html = text(renderToStaticMarkup(<PlanPerks plan="pro" interval={interval} />));
      expect(html).toContain("150 tailored versions a month");
      expect(html).toContain("Not on Free.");
      expect(html).toContain("750 line fixes a month Free has 3 a month.");
      expect(html).toContain("A portfolio page from your resume");
      expect(html).toContain("All 6 formats, up to 50 resumes and Word downloads");
      expect(html).toContain("Free has 1 resume, Classic and Compact, and PDFs.");
      expect(html).toContain("Every job match, every application tracked, share links");
      expect(html).toContain(
        interval === "year"
          ? "Limits reset each month, on the day of the month your plan started."
          : "Limits reset each month, when your plan renews.",
      );
      expect(html).toContain("Uploads always work, read by the basic reader past the AI reads.");
      expect(html).toContain("PDF downloads stay free on every plan.");
      expect(html).not.toContain("1st");
    }
  });

  it("lists Max's monthly limits on either option, next to Pro's", () => {
    for (const interval of ["month", "year"] as const) {
      const max = text(renderToStaticMarkup(<PlanPerks plan="max" interval={interval} />));
      expect(max).toContain("300 tailored versions a month");
      expect(max).toContain("Pro has 150.");
      expect(max).not.toMatch(/a week/);
    }
  });

  it("offers the trial's own allowance first, then Pro's, and says what the trial costs", () => {
    const trial = text(renderToStaticMarkup(<PlanPerks plan="pro" trial />));
    expect(trial).toContain("10 tailored versions during the trial");
    expect(trial).toContain("Then 150 a month on Pro.");
    expect(trial).toContain("50 line fixes during the trial");
    expect(trial).toContain("It goes public once Pro starts.");
    expect(trial).toContain("$1 for 3 days. Cancel before the trial ends and you pay nothing more.");
    expect(trial).not.toMatch(/unlimited/i);
  });
});
