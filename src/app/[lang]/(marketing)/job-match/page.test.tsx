import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JOB_MATCH_PAGE } from "@/lib/seo-pages/pages";
import JobMatchPage, { generateMetadata } from "./page";

describe("the job match page", () => {
  it("has its own title, description, canonical and share card", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Free resume to job description match checker");
    expect(metadata.description).toMatch(/which are missing. Free, no sign-in.$/);
    expect(metadata.alternates?.canonical).toBe("/job-match");
    expect(metadata.openGraph).toMatchObject({ url: "/job-match" });
  });

  it("says the same as the page entry llms.txt and the sitemap read", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(JOB_MATCH_PAGE.title);
    expect(metadata.description).toBe(JOB_MATCH_PAGE.description);
  });

  it("renders one h1, the tool and the explainer, with no score and global copy", async () => {
    const html = renderToStaticMarkup(await JobMatchPage());
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Check the match");
    expect(html).toContain("What the check does");
    expect(html).not.toMatch(/\d+\s*%|₹|lakh|crore/i);
  });

  it("takes a link, offers a sample and keeps the check the only primary action", async () => {
    const html = renderToStaticMarkup(await JobMatchPage());
    expect(html).toContain("Paste a link");
    expect(html).toContain("Try with a sample");
    expect(html.match(/from-primary-top/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/studio"[^>]*>Check my resume/);
  });
});
