import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JobMatchPage, { metadata } from "./page";

describe("the job match page", () => {
  it("has its own title, description, canonical and share card", () => {
    expect(metadata.title).toBe("Free resume to job match check");
    expect(metadata.description).toMatch(/not a made-up score/);
    expect(metadata.alternates?.canonical).toBe("/job-match");
    expect(metadata.openGraph).toMatchObject({ url: "/job-match" });
  });

  it("renders one h1, the tool and the explainer, with no score and global copy", () => {
    const html = renderToStaticMarkup(<JobMatchPage />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Check the match");
    expect(html).toContain("What the check does");
    expect(html).not.toMatch(/\d+\s*%|₹|lakh|crore/i);
  });

  it("takes a link, offers a sample and keeps the check the only primary action", () => {
    const html = renderToStaticMarkup(<JobMatchPage />);
    expect(html).toContain("Paste a link");
    expect(html).toContain("Try with a sample");
    expect(html.match(/from-primary-top/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/studio"[^>]*>Check my resume/);
  });
});
