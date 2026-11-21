import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiClientError } from "@/lib/api/client";
import { hiringSystemLink, linkProblem, readJobLink } from "./job-link";

vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  api: { readJob: vi.fn() },
}));

const LINK = "https://boards.greenhouse.io/acme/jobs/4012345";
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

beforeEach(() => {
  vi.mocked(api.readJob).mockReset();
});

describe("linkProblem", () => {
  it("asks for one link from the address bar", () => {
    expect(linkProblem("")).toMatch(/Paste the link/);
    expect(linkProblem("acme jobs")).toMatch(/doesn't look like a link/);
    expect(linkProblem(`https://acme.com/${"a".repeat(2048)}`)).toMatch(/too long/);
    expect(linkProblem(LINK)).toBeNull();
  });
});

describe("hiringSystemLink", () => {
  it("names the hiring system from the link and points to its guide", () => {
    expect(
      hiringSystemLink(null, "https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42"),
    ).toEqual({ name: "Workday", href: "/ats/workday" });
    expect(hiringSystemLink(null, "https://acme.com/careers/42")).toBeNull();
  });
});

describe("readJobLink", () => {
  it("returns the post, the posting and its hiring system", async () => {
    vi.mocked(api.readJob).mockResolvedValue({
      ok: true,
      posting: { ...posting, text: "The whole post." },
    });
    expect(await readJobLink(LINK)).toEqual({
      ok: true,
      link: LINK,
      posting,
      text: "The whole post.",
      system: { name: "Greenhouse", href: "/ats/greenhouse" },
    });
    expect(api.readJob).toHaveBeenCalledWith({ url: LINK });
  });

  it("passes on the reader's own message and still names the system", async () => {
    const message = "That page lists many jobs. Open one job and paste its link.";
    vi.mocked(api.readJob).mockRejectedValue(new ApiClientError("parse_failed", message, 422));
    expect(await readJobLink(LINK)).toEqual({
      ok: false,
      link: LINK,
      message,
      system: { name: "Greenhouse", href: "/ats/greenhouse" },
    });
  });

  it("says when the device is offline, and stays plain for anything else", async () => {
    vi.mocked(api.readJob).mockRejectedValue(
      new ApiClientError("network_error", "Can't reach the server.", 0),
    );
    expect(await readJobLink(LINK)).toMatchObject({ ok: false, message: /offline/ });
    vi.mocked(api.readJob).mockRejectedValue(new ApiClientError("server_error", "Boom 500", 500));
    expect(await readJobLink(LINK)).toMatchObject({
      ok: false,
      message: "Otto couldn't read that link just now. Paste the job text instead.",
    });
  });
});
