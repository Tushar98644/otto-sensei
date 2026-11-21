import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LinkRead } from "./job-link";
import { JobPostCard, type JobPostCardProps } from "./job-post-card";
import type { JobLinkReader } from "./use-job-link";

const LINK = "https://boards.greenhouse.io/acme/jobs/4012345";
const system = { name: "Greenhouse", href: "/ats/greenhouse" };

function reader(read: LinkRead | null, extra: Partial<JobLinkReader> = {}): JobLinkReader {
  return {
    link: LINK,
    reading: false,
    error: read && !read.ok ? read.message : null,
    read,
    latest: read?.ok ? read : null,
    edit: () => {},
    readLink: () => Promise.resolve(null),
    prepare: () => {},
    ...extra,
  };
}

function render(props: Partial<JobPostCardProps>): string {
  return renderToStaticMarkup(
    <JobPostCard
      mode="link"
      onModeChange={() => {}}
      text=""
      onTextChange={() => {}}
      error={null}
      hint="Paste all of it."
      textRef={createRef()}
      linkRef={createRef()}
      reader={reader(null)}
      onFocus={() => {}}
      onShowText={() => {}}
      onPasteLink={() => {}}
      {...props}
    />,
  );
}

describe("JobPostCard", () => {
  it("offers a link next to pasted text, under a sans heading", () => {
    const html = render({ mode: "paste" });
    expect(html).toContain("Paste text");
    expect(html).toContain("Paste a link");
    expect(html).toMatch(/<h2 class="font-sans[^"]*">The job post<\/h2>/);
    expect(html).toContain('placeholder="Paste the job post here, or its link"');
  });

  it("shows the job read from a link, its hiring system and the guide", () => {
    const posting = {
      url: LINK,
      source: "greenhouse" as const,
      title: "Product Designer",
      company: "Acme",
      location: "Remote",
      firstPostedAt: null,
      updatedAt: null,
      closesAt: null,
    };
    const html = render({
      reader: reader({ ok: true, link: LINK, posting, text: "The post.", system }),
    });
    expect(html).toContain("Product Designer");
    expect(html).toContain("Acme · Remote");
    expect(html).toContain("This job uses Greenhouse.");
    expect(html).toMatch(/href="\/ats\/greenhouse" target="_blank"/);
    expect(html).toContain("Read the Greenhouse guide");
    expect(html).toContain("See the text Otto read");
  });

  it("names the system even when the link can't be read, and offers pasting instead", () => {
    const html = render({
      reader: reader({ ok: false, link: LINK, message: "That job has closed.", system }),
      error: "Paste the job post first.",
    });
    expect(html).toContain("That job has closed.");
    expect(html).not.toContain("Paste the job post first.");
    expect(html).toContain("Read the Greenhouse guide");
    expect(html).toContain("Paste the job text instead");
  });

  it("holds back the post error while a typed link waits to be read", () => {
    expect(render({ error: "Paste the job post first." })).not.toContain(
      "Paste the job post first.",
    );
    const empty = reader(null, { link: "" });
    expect(render({ reader: empty, error: "Paste the job post first." })).toContain(
      "Paste the job post first.",
    );
  });

  it("says Otto is reading while the link is read", () => {
    const html = render({ reader: reader(null, { reading: true }) });
    expect(html).toContain("Otto is reading the job post");
  });
});
