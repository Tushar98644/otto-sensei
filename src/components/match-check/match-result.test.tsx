import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { matchCheckFromText } from "@/lib/match-check/from-text";
import { ANALYST_POST, DESIGNER_POST, DESIGNER_RESUME } from "@/lib/match-check/test-fixtures";
import { MatchResult } from "./match-result";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

describe("MatchResult", () => {
  const html = renderToStaticMarkup(
    <MatchResult
      check={matchCheckFromText(DESIGNER_RESUME, DESIGNER_POST)}
      footer={<p>Footer</p>}
    />,
  );

  it("leads with the counts and never shows a percentage", () => {
    expect(html).toContain("<h2");
    expect(text(html)).toContain("Found 7 of 10 skills the post names");
    expect(text(html)).toContain("Must-haves: 4 of 5 found");
    expect(text(html)).toContain("Nice-to-haves: 3 of 5 found");
    expect(text(html).replace(/by 18%/, "")).not.toMatch(/%/);
  });

  it("groups the skills, gaps first, and quotes where each found one is", () => {
    const body = text(html);
    expect(body).toMatch(/Must-haves User research Not found Figma In a line/);
    expect(body).toContain(
      "Webflow Listed, not shown TOOLS: Figma, Sketch, Miro, Jira, Webflow Tools",
    );
    expect(body).toContain("The post also asks for");
    expect(body).toContain("Footer");
  });

  it("shows the hint for missing skills once", () => {
    expect(html.match(/add a line that says where/g)).toHaveLength(1);
  });

  it("uses one list when the post doesn't sort its skills", () => {
    const flat = text(
      renderToStaticMarkup(<MatchResult check={matchCheckFromText("", ANALYST_POST)} />),
    );
    expect(flat).toContain("Skills the post names");
    expect(flat).not.toContain("Must-haves");
  });

  it("says plainly when the post names nothing it knows", () => {
    const empty = text(
      renderToStaticMarkup(<MatchResult check={matchCheckFromText(DESIGNER_RESUME, "Be kind.")} />),
    );
    expect(empty).toContain("No skills or tools Otto knows in this post");
    expect(empty).toContain("Paste the whole post");
  });
});
