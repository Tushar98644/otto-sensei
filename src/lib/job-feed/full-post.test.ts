import { beforeEach, describe, expect, it, vi } from "vitest";
import { GREENHOUSE_JOB } from "@/lib/jobs/test-fixtures";
import { fakeNet } from "@/lib/jobs/test-network";
import { fullPostText, readFullPost } from "./full-post";
import { RECRUITEE_OFFERS } from "./test-fixtures";

vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock(
  "@/lib/jobs/transport",
  async () => (await import("@/lib/jobs/test-network")).transportMock,
);

const STORED = {
  source: "greenhouse" as const,
  board: "gitlab",
  externalId: "8638232002",
  url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
  description: "",
  closed: false,
};

beforeEach(() => {
  fakeNet.reset();
  for (const host of [
    "boards-api.greenhouse.io",
    "bunq.recruitee.com",
    "nvidia.wd5.myworkdayjobs.com",
  ]) {
    fakeNet.resolve(host, "93.184.216.34");
  }
});

describe("fullPostText", () => {
  it("reads the whole post from the board by its token and id", async () => {
    fakeNet.json(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true",
      GREENHOUSE_JOB,
    );
    const text = await fullPostText(STORED);
    expect(text).toContain("Salary range: $120,000–$180,000 & equity.");
  });

  it("reads a Recruitee offer by its id", async () => {
    fakeNet.json("https://bunq.recruitee.com/api/offers/2819200", {
      offer: RECRUITEE_OFFERS.offers[0],
    });
    const text = await fullPostText({
      ...STORED,
      source: "recruitee",
      board: "bunq",
      externalId: "2819200",
      url: "https://bunq.recruitee.com/o/security-lead",
    });
    expect(text).toContain("You know AWS and Kubernetes.");
  });

  it("reads a Workday job from its public page, the same way as a pasted link", async () => {
    const url =
      "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/UK-Remote/AI-Natives-Sales-Account-Manager---UK_JR2024148";
    const posting = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "AI Natives Sales Account Manager - UK",
      hiringOrganization: { "@type": "Organization", name: "NVIDIA" },
      datePosted: "2026-11-20",
      description: `<p>${"Own the relationship with AI-native companies across the UK. ".repeat(8)}</p>`,
    };
    fakeNet.html(
      url,
      `<html><head><script type="application/ld+json">${JSON.stringify(posting)}</script></head><body></body></html>`,
    );
    const { text, posting: read } = await readFullPost({
      ...STORED,
      source: "workday",
      board: "nvidia.wd5/NVIDIAExternalCareerSite",
      externalId:
        "nvidia/NVIDIAExternalCareerSite/job/UK-Remote/AI-Natives-Sales-Account-Manager---UK_JR2024148",
      url,
    });
    expect(text).toContain("Own the relationship with AI-native companies across the UK.");
    expect(read?.source).toBe("jsonld");
    expect(fakeNet.urls()).toEqual([url]);
  });

  it("gives nothing when the board can't be read, so the page shows the job's facts", async () => {
    fakeNet.json(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true",
      { status: 404 },
      404,
    );
    expect(await fullPostText(STORED)).toBe("");
  });

  it("doesn't read closed jobs again, and uses the text a feed's job keeps", async () => {
    expect(await fullPostText({ ...STORED, closed: true })).toBe("");
    const feed = { ...STORED, source: "remoteok" as const, board: "", description: "Kept text." };
    expect(await fullPostText(feed)).toBe("Kept text.");
    expect(fakeNet.requests).toHaveLength(0);
  });
});

describe("readFullPost", () => {
  it("keeps what the read said, so the tailor flow needn't read the link again", async () => {
    fakeNet.json(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true",
      GREENHOUSE_JOB,
    );
    const { text, posting } = await readFullPost(STORED);
    expect(text).toContain("Salary range: $120,000–$180,000 & equity.");
    expect(posting?.source).toBe("greenhouse");
    expect(posting).not.toHaveProperty("text");
  });

  it("has no posting when the text is the stored one", async () => {
    fakeNet.json(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true",
      { status: 404 },
      404,
    );
    expect((await readFullPost({ ...STORED, description: "Opening only." })).posting).toBeNull();
    const feed = { ...STORED, source: "remoteok" as const, board: "", description: "Kept text." };
    expect(await readFullPost(feed)).toEqual({ text: "Kept text.", posting: null });
  });
});
