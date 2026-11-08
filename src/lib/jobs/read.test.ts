import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASHBY_BOARD_MAX_BYTES } from "./boards";
import { JobReadError, type JobReadReason } from "./errors";
import { ashbyOrg, greenhouseToken, postingFromHtml, readJob } from "./read";
import {
  ASHBY_BOARD,
  ASHBY_JOB_ID,
  ASHBY_JSON_LD,
  GREENHOUSE_JOB,
  htmlPage,
  jsonLdScript,
  LEVER_POSTING,
  LONG_POST,
} from "./test-fixtures";
import { fakeNet } from "./test-network";
import { parseJobLink } from "./url";

vi.mock("node:dns", async (importOriginal) =>
  (await import("./test-network")).dnsMock(await importOriginal()),
);
vi.mock("./transport", async () => (await import("./test-network")).transportMock);

const GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards";
const LEVER_ID = "2a55d6c9-c564-443a-be3e-a3851db5a93b";

async function reasonOf(promise: Promise<unknown>): Promise<JobReadReason | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (!(error instanceof JobReadError)) throw error;
    return error.reason;
  }
}

const read = (link: string) => readJob(parseJobLink(link));

beforeEach(() => {
  fakeNet.reset();
  for (const host of [
    "boards-api.greenhouse.io",
    "api.lever.co",
    "jobs.ashbyhq.com",
    "api.ashbyhq.com",
    "careers.airbnb.com",
    "stripe.com",
    "jobs.example.com",
  ]) {
    fakeNet.resolve(host, "93.184.216.34");
  }
});

describe("readJob on job boards", () => {
  it("reads Greenhouse through its API", async () => {
    fakeNet.json(`${GREENHOUSE_API}/gitlab/jobs/8638232002?questions=true`, GREENHOUSE_JOB);
    const posting = await read("https://job-boards.greenhouse.io/gitlab/jobs/8638232002");
    expect(posting).toMatchObject({
      source: "greenhouse",
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
    });
    expect(fakeNet.requests[0]?.headers.accept).toBe("application/json");
  });

  it("says not found for a closed Greenhouse job", async () => {
    fakeNet.json(
      `${GREENHOUSE_API}/gitlab/jobs/1?questions=true`,
      { status: 404, error: "Job not found" },
      404,
    );
    expect(await reasonOf(read("https://boards.greenhouse.io/gitlab/jobs/1"))).toBe("not_found");
  });

  it("reads Lever through its API", async () => {
    fakeNet.json(`https://api.lever.co/v0/postings/spotify/${LEVER_ID}`, LEVER_POSTING);
    const posting = await read(`https://jobs.lever.co/spotify/${LEVER_ID}/apply`);
    expect(posting).toMatchObject({
      source: "lever",
      company: "Spotify",
      location: "New York, NY · Hybrid",
    });
  });

  it("reads Ashby from its job page, and from the posting API when the page has no JSON-LD", async () => {
    const page = `https://jobs.ashbyhq.com/linear/${ASHBY_JOB_ID}`;
    fakeNet.html(
      page,
      htmlPage({ head: jsonLdScript(ASHBY_JSON_LD), body: "<div id=root></div>" }),
    );
    expect(await read(page)).toMatchObject({
      source: "ashby",
      company: "Linear",
      firstPostedAt: Date.UTC(2021, 3, 27),
    });
    expect(fakeNet.urls()).toEqual([page]);

    fakeNet.reset();
    fakeNet.resolve("jobs.ashbyhq.com", "93.184.216.34");
    fakeNet.resolve("api.ashbyhq.com", "93.184.216.34");
    fakeNet.html(page, htmlPage({ body: "<div id=root></div>" }));
    fakeNet.json("https://api.ashbyhq.com/posting-api/job-board/linear", ASHBY_BOARD);
    expect(await read(page)).toMatchObject({ source: "ashby", location: "Remote · Europe" });
    expect(fakeNet.urls()).toEqual([page, "https://api.ashbyhq.com/posting-api/job-board/linear"]);
    expect(ASHBY_BOARD_MAX_BYTES).toBeGreaterThan(14 * 1024 * 1024);
  });
});

describe("readJob on company career pages", () => {
  it("tries the board named after the company first, without fetching the page", async () => {
    fakeNet.json(`${GREENHOUSE_API}/airbnb/jobs/8306554?questions=true`, {
      ...GREENHOUSE_JOB,
      company_name: "Airbnb",
    });
    const posting = await read("https://careers.airbnb.com/positions/8306554?gh_jid=8306554");
    expect(posting).toMatchObject({ source: "greenhouse", company: "Airbnb" });
    expect(fakeNet.urls()).toEqual([`${GREENHOUSE_API}/airbnb/jobs/8306554?questions=true`]);
  });

  it("finds the board in the page's embed script when the guess misses", async () => {
    const link = "https://stripe.com/jobs/search?gh_jid=8172510";
    fakeNet.html(
      link,
      htmlPage({
        body: '<script src="https://boards.greenhouse.io/embed/job_board/js?for=stripejobs"></script>',
      }),
    );
    fakeNet.json(`${GREENHOUSE_API}/stripejobs/jobs/8172510?questions=true`, {
      ...GREENHOUSE_JOB,
      company_name: "Stripe",
    });
    const posting = await read(link);
    expect(posting).toMatchObject({ source: "greenhouse", company: "Stripe" });
    expect(fakeNet.urls()).toEqual([
      `${GREENHOUSE_API}/stripe/jobs/8172510?questions=true`,
      link,
      `${GREENHOUSE_API}/stripejobs/jobs/8172510?questions=true`,
    ]);
  });

  it("falls back to the page itself when no board answers", async () => {
    const link = "https://stripe.com/jobs/listing/engineer/1?gh_jid=1";
    fakeNet.html(
      link,
      htmlPage({
        head: jsonLdScript({
          "@type": "JobPosting",
          title: "Engineer",
          hiringOrganization: "Stripe",
          description: LONG_POST,
        }),
        body: "",
      }),
    );
    expect(await read(link)).toMatchObject({
      source: "jsonld",
      title: "Engineer",
      company: "Stripe",
    });
  });
});

describe("postingFromHtml", () => {
  const url = new URL("https://jobs.example.com/backend-engineer");

  it("prefers JSON-LD", () => {
    const html = htmlPage({
      head: jsonLdScript({
        "@type": "JobPosting",
        title: "Backend Engineer",
        hiringOrganization: { name: "Acme" },
        description: LONG_POST,
      }),
      body: "<main><p>Something else entirely</p></main>",
    });
    expect(postingFromHtml(html, url)).toMatchObject({
      source: "jsonld",
      title: "Backend Engineer",
      company: "Acme",
    });
  });

  it("falls back to the main text, the first heading and the site name", () => {
    const html = htmlPage({
      head: '<title>Careers | Acme</title><meta property="og:site_name" content="Acme">',
      body: `<nav><a>Home</a></nav><main><h1>Backend Engineer</h1>${LONG_POST}</main><footer>Cookie settings</footer>`,
    });
    const posting = postingFromHtml(html, url);
    expect(posting).toMatchObject({
      source: "page",
      title: "Backend Engineer",
      company: "Acme",
      location: "",
    });
    expect(posting.text).toMatch(/^Backend Engineer\n\nAbout the role\n\nWe are looking/);
    expect(posting.text).toContain("- Design and build APIs in TypeScript and Go");
    expect(posting.text).not.toMatch(/Home|Cookie/);
  });

  it("uses the page text when the JSON-LD description is only a teaser", () => {
    const html = htmlPage({
      head: jsonLdScript({
        "@type": "JobPosting",
        title: "Backend Engineer",
        hiringOrganization: "Acme",
        description: "Join us!",
      }),
      body: `<article>${LONG_POST}</article>`,
    });
    expect(postingFromHtml(html, url)).toMatchObject({
      source: "page",
      title: "Backend Engineer",
      company: "Acme",
    });
  });

  it("treats a thin page as couldn't read, and names bot checks and login walls", () => {
    expect(
      reasonSync(() => postingFromHtml(htmlPage({ body: '<div id="app">Loading…</div>' }), url)),
    ).toBe("no_text");
    expect(
      reasonSync(() =>
        postingFromHtml(
          htmlPage({
            head: "<title>Just a moment...</title>",
            body: "<p>Checking your browser</p>",
          }),
          url,
        ),
      ),
    ).toBe("blocked");
    expect(
      reasonSync(() =>
        postingFromHtml(htmlPage({ body: "<form>Email</form>" }), new URL("https://x.com/login")),
      ),
    ).toBe("login_required");
  });
});

function reasonSync(run: () => unknown): JobReadReason | null {
  try {
    run();
    return null;
  } catch (error) {
    if (!(error instanceof JobReadError)) throw error;
    return error.reason;
  }
}

describe("board references in career pages", () => {
  it("finds Greenhouse and Ashby boards", () => {
    expect(
      greenhouseToken(
        '<script src="https://boards.greenhouse.io/embed/job_board/js?for=airbnb"></script>',
      ),
    ).toBe("airbnb");
    expect(
      greenhouseToken(
        '<iframe src="https://job-boards.greenhouse.io/embed/job_app?token=1&amp;for=acme">',
      ),
    ).toBe("acme");
    expect(greenhouseToken('<a href="https://boards.greenhouse.io/acme/jobs/123">')).toBe("acme");
    expect(greenhouseToken("<p>No board</p>")).toBeNull();
    expect(
      ashbyOrg('<script src="https://jobs.ashbyhq.com/Acme%20Labs/embed?version=2"></script>'),
    ).toBe("Acme Labs");
  });
});
