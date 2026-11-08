import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { TEMPLATE_IDS, emptyResume } from "@/lib/resume/schema";
import { publicResume, shareSnapshot } from "@/lib/share/snapshot";
import { ResumeWeb } from "./resume-web";

function sample() {
  const resume = createSampleResume(1_000);
  return {
    ...resume,
    basics: {
      ...resume.basics,
      email: "jordan@example.com",
      phone: "+1 555 0100",
      links: [
        { id: "l1", label: "Site", url: "jordanellis.dev" },
        { id: "l2", label: "Bad", url: "javascript:alert(1)" },
      ],
    },
  };
}

describe("ResumeWeb", () => {
  it("renders the resume as headings, lists and links", () => {
    const html = renderToStaticMarkup(<ResumeWeb resume={sample()} />);
    expect(html).toContain(`<h1`);
    expect(html.match(/<section aria-labelledby="section-/g)?.length).toBeGreaterThan(1);
    expect(html).toContain(`role="list"`);
    expect(html).toContain(`href="https://jordanellis.dev/"`);
    expect(html).toContain(`rel="noopener noreferrer nofollow ugc"`);
    expect(html).toContain(`href="mailto:jordan@example.com"`);
  });

  it("never turns a non-web address into a link", () => {
    const html = renderToStaticMarkup(<ResumeWeb resume={sample()} />);
    expect(html).not.toContain(`href="javascript:`);
  });

  it("leaves out email and phone when the owner hid them", () => {
    const shown = publicResume(shareSnapshot(sample()), false);
    const html = renderToStaticMarkup(<ResumeWeb resume={shown} />);
    expect(html).not.toContain("jordan@example.com");
    expect(html).not.toContain("555 0100");
    expect(html).toContain("jordanellis.dev");
  });

  it("draws every format, scaled in points", () => {
    for (const template of TEMPLATE_IDS) {
      const html = renderToStaticMarkup(<ResumeWeb resume={{ ...sample(), template }} />);
      expect(html).toContain(`data-format="${template}"`);
      expect(html).toContain("var(--pt)");
    }
  });

  it("still has a page heading when the resume has no name", () => {
    const html = renderToStaticMarkup(<ResumeWeb resume={emptyResume(1)} />);
    expect(html).toContain(`<h1 class="sr-only">Resume</h1>`);
  });
});
