import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanPerks } from "./pro-perks";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PlanPerks", () => {
  it("lists monthly limits for monthly and yearly options, next to a Free with no AI", () => {
    for (const interval of [undefined, "month", "year"] as const) {
      const html = text(renderToStaticMarkup(<PlanPerks plan="pro" interval={interval} />));
      expect(html).toContain("60 tailored versions a month");
      expect(html).toContain("Not on Free.");
      expect(html).toContain("A portfolio page from your resume");
      expect(html).toContain("All 6 formats, up to 50 resumes and Word downloads");
      expect(html).toContain("Free has 1 resume, Classic and Compact, and PDFs.");
      expect(html).toContain("Every job match, every application tracked, share links");
      expect(html).toContain("Limits reset on the 1st.");
    }
  });

  it("lists weekly limits for a weekly option, next to the plan below", () => {
    const pro = text(renderToStaticMarkup(<PlanPerks plan="pro" interval="week" />));
    expect(pro).toContain("15 tailored versions a week");
    expect(pro).toContain("75 line fixes a week");
    expect(pro).not.toContain("60 tailored versions");

    const max = text(renderToStaticMarkup(<PlanPerks plan="max" interval="week" />));
    expect(max).toContain("50 tailored versions a week");
    expect(max).toContain("Pro has 15.");
    expect(max).toContain("Limits reset each billing week");
  });

  it("offers the trial's own allowance first, then Pro's, and says nothing is charged", () => {
    const trial = text(renderToStaticMarkup(<PlanPerks plan="pro" trial />));
    expect(trial).toContain("10 tailored versions during the trial");
    expect(trial).toContain("Then 60 a month on Pro.");
    expect(trial).toContain("50 line fixes during the trial");
    expect(trial).toContain("It goes public once Pro starts.");
    expect(trial).toContain("Nothing is charged for 3 days.");
    expect(trial).not.toMatch(/unlimited/i);
  });
});
