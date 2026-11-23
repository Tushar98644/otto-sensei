import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { jobBoards, jobCountsRow, jobMatch, jobs } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { fakeNet } from "@/lib/jobs/test-network";
import { boardUrl, paceKey, runJobsIngest, usajobsUrl, withPlace } from "./ingest";
import { WORKDAY_LIMITS } from "./workday";
import {
  ASHBY_BOARD,
  GEM_BOARD,
  GREENHOUSE_BOARD,
  HIMALAYAS_PAGE,
  JOBICY_PAGE,
  JOBVITE_FEED,
  LEVER_POSTINGS,
  PERSONIO_FEED,
  PINPOINT_FEED,
  RECRUITEE_OFFERS,
  REMOTE_OK_FEED,
  USAJOBS_PAGE,
  WORKABLE_ACCOUNT,
  WORKDAY_JOB_ISRAEL,
  WORKDAY_JOB_UK,
  WORKDAY_LIST,
  WORKDAY_OTHER_PAGE,
  WORKDAY_ROBOTS,
  WORKDAY_TARGET_NEXT,
  WORKDAY_TARGET_PAGE,
} from "./test-fixtures";

vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock(
  "@/lib/jobs/transport",
  async () => (await import("@/lib/jobs/test-network")).transportMock,
);

const SEEDS = [
  { ats: "greenhouse" as const, token: "vercel", company: "Vercel" },
  { ats: "lever" as const, token: "spotify", company: "Spotify" },
  { ats: "ashby" as const, token: "linear", company: "Linear" },
  { ats: "greenhouse" as const, token: "gone", company: "Gone Inc" },
  { ats: "workable" as const, token: "blueground", company: "Blueground" },
  { ats: "recruitee" as const, token: "bunq", company: "bunq" },
  { ats: "personio" as const, token: "1komma5grad", company: "1KOMMA5°" },
];
const NOW = Date.UTC(2026, 10, 10, 6);
const rawJob = () => ({
  externalId: "1",
  company: "Acme",
  title: "Engineer",
  location: "",
  remote: false,
  employmentType: null,
  postedAt: NOW,
  validThrough: null,
  url: "https://example.com/jobs/1",
  text: "",
});
const OPTIONS = { seeds: SEEDS, spacing: {}, workers: 2, visa: false };
const context = () => ({ now: Date.now(), deadline: Date.now() + 20_000 });

function internet() {
  fakeNet.reset();
  for (const host of [
    "boards-api.greenhouse.io",
    "api.lever.co",
    "api.ashbyhq.com",
    "apply.workable.com",
    "bunq.recruitee.com",
    "1komma5grad.jobs.personio.de",
    "himalayas.app",
    "remoteok.com",
    "jobicy.com",
  ]) {
    fakeNet.resolve(host, "93.184.216.34");
  }
  fakeNet.json(boardUrl("greenhouse", "vercel").toString(), GREENHOUSE_BOARD);
  fakeNet.json(boardUrl("lever", "spotify").toString(), LEVER_POSTINGS);
  fakeNet.json(boardUrl("ashby", "linear").toString(), ASHBY_BOARD);
  fakeNet.json(boardUrl("greenhouse", "gone").toString(), { status: 404, error: "Not found" }, 404);
  fakeNet.json(boardUrl("workable", "blueground").toString(), WORKABLE_ACCOUNT);
  fakeNet.json(boardUrl("recruitee", "bunq").toString(), RECRUITEE_OFFERS);
  fakeNet.route(boardUrl("personio", "1komma5grad").toString(), {
    headers: { "content-type": "text/xml" },
    body: PERSONIO_FEED,
  });
  fakeNet.json("https://remoteok.com/api", REMOTE_OK_FEED);
  fakeNet.json("https://himalayas.app/jobs/api?limit=20", HIMALAYAS_PAGE);
  fakeNet.json(`https://himalayas.app/jobs/api?limit=20&cursor=${HIMALAYAS_PAGE.nextCursor}`, {
    jobs: [],
  });
  fakeNet.json("https://jobicy.com/api/jobs?count=100", JOBICY_PAGE);
}

describe("runJobsIngest", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    internet();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads every board and feed through the safe transport and saves their jobs", async () => {
    const outcome = await runJobsIngest(context(), OPTIONS);
    expect(outcome).toMatchObject({ complete: true, failed: [] });
    expect(outcome.stats).toMatchObject({
      boards: 6,
      boardsFailed: 1,
      feeds: 3,
      added: 14,
      boardsLeft: 0,
    });
    const db = await getDb();
    const saved = await db
      .select({ source: jobs.source, company: jobs.company, description: jobs.description })
      .from(jobs);
    const withText = saved.filter((job) => job.description).map((job) => job.source);
    expect(withText.sort()).toEqual(["himalayas", "remoteok"]);
    expect(saved.map((job) => `${job.source}:${job.company}`).sort()).toEqual([
      "ashby:Linear",
      "greenhouse:Vercel",
      "greenhouse:Vercel",
      "himalayas:Acme Health",
      "jobicy:Clipboard",
      "jobicy:GitLab",
      "lever:Spotify",
      "personio:1KOMMA5°",
      "personio:1KOMMA5°",
      "recruitee:bunq",
      "recruitee:bunq",
      "remoteok:Salvo Software",
      "workable:Blueground",
      "workable:Blueground",
    ]);
    for (const request of fakeNet.requests) {
      expect(request.url.protocol).toBe("https:");
      expect(request.headers["user-agent"]).toMatch(/^OttoResumeBot/);
    }
    const [gone] = await db.select().from(jobBoards).where(eq(jobBoards.token, "gone"));
    expect(gone).toMatchObject({ lastStatus: "not_found", failures: 1 });
    expect(outcome.stats.jobsFileMb).toBeGreaterThanOrEqual(0);
    expect(outcome.stats.jobsDeadRows).toBeGreaterThanOrEqual(0);
  });

  it("refreshes due visa registers before any board, so the same call's match index has them", async () => {
    const registers: Record<string, string> = {
      "https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers":
        JSON.stringify({
          details: {
            attachments: [
              {
                url: "https://assets.publishing.service.gov.uk/media/sponsors.csv",
                content_type: "text/csv",
              },
            ],
          },
        }),
      "https://assets.publishing.service.gov.uk/media/sponsors.csv": [
        "Organisation Name,Town/City,County,Type & Rating,Route",
        "Vercel UK Limited,London,,Worker (A rating),Skilled Worker",
        ...Array.from(
          { length: 10_000 },
          (_, i) => `Firm ${i} Ltd,Leeds,,Worker (A rating),Skilled Worker`,
        ),
      ].join("\n"),
      "https://www.uscis.gov/archive/h-1b-employer-data-hub-files":
        '<a href="/sites/default/files/document/data/h1b_datahubexport-2023.csv">FY2023</a>',
      "https://www.uscis.gov/sites/default/files/document/data/h1b_datahubexport-2023.csv": [
        '"Fiscal Year",Employer,"Initial Approval","Continuing Approval"',
        '2023,"VERCEL INC",3,4',
      ].join("\n"),
    };
    let boardReadsFirst = -1;
    vi.stubGlobal("fetch", async (url: string) => {
      if (boardReadsFirst === -1) boardReadsFirst = fakeNet.requests.length;
      const body = registers[url];
      return body === undefined ? new Response("", { status: 404 }) : new Response(body);
    });
    try {
      const outcome = await runJobsIngest(context(), { ...OPTIONS, visa: true, feeds: false });
      expect(outcome.stats.visa).toBeGreaterThan(0);
      expect(boardReadsFirst).toBe(0);
      expect(outcome.stats.boards).toBe(6);
      const db = await getDb();
      const vercel = await db
        .select({ ukSponsor: jobMatch.ukSponsor, h1bYear: jobMatch.h1bYear })
        .from(jobMatch)
        .where(eq(jobMatch.company, "Vercel"));
      expect(vercel.length).toBeGreaterThan(0);
      expect(vercel).toEqual(vercel.map(() => ({ ukSponsor: true, h1bYear: 2023 })));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("skips boards read in the last 20 hours, so a second run is cheap", async () => {
    await runJobsIngest(context(), OPTIONS);
    const before = fakeNet.requests.length;
    const again = await runJobsIngest(context(), OPTIONS);
    expect(fakeNet.requests.length).toBe(before);
    expect(again.stats).toMatchObject({ boards: 0, feeds: 0, added: 0 });
  });

  it("leaves the index and cached Matches as they are when a call reads nothing new", async () => {
    await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    const db = await getDb();
    const [built] = await db.select().from(jobCountsRow);
    vi.setSystemTime(NOW + 21 * 60 * 60 * 1_000);
    const again = await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    expect(again.stats).toMatchObject({ boards: 6, added: 0, updated: 0, closed: 0 });
    expect(again.stats).toMatchObject({ indexSkipped: 1, skills: -1 });
    const [kept] = await db.select().from(jobCountsRow);
    expect(kept).toMatchObject({ builtAt: built!.builtAt, matchable: built!.matchable });
    expect(kept!.checkedAt).toBeGreaterThan(built!.checkedAt!);
    fakeNet.json(boardUrl("greenhouse", "vercel").toString(), {
      jobs: GREENHOUSE_BOARD.jobs.slice(0, 1),
    });
    vi.setSystemTime(NOW + 42 * 60 * 60 * 1_000);
    await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    vi.setSystemTime(NOW + 63 * 60 * 60 * 1_000);
    const closing = await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    expect(closing.stats).toMatchObject({ closed: 1, indexSkipped: 0 });
    const [rebuilt] = await db.select().from(jobCountsRow);
    expect(rebuilt!.builtAt).toBeGreaterThan(kept!.builtAt);
  });

  it("puts a post that names no place in its employer's one country", () => {
    const [remote, placed] = withPlace(
      [
        { ...rawJob(), location: "Remote" },
        { ...rawJob(), location: "Austin, TX" },
      ],
      "United States",
    );
    expect(remote!.location).toBe("Remote · United States");
    expect(placed!.location).toBe("Austin, TX");
    expect(withPlace([{ ...rawJob(), location: "Remote" }], undefined)[0]!.location).toBe("Remote");
  });

  it("stops at the deadline and leaves the rest for the next run", async () => {
    const outcome = await runJobsIngest(
      { now: Date.now(), deadline: Date.now() - 1 },
      { ...OPTIONS, feeds: false },
    );
    expect(outcome.complete).toBe(false);
    expect(outcome.stats.boards).toBe(0);
    const next = await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    expect(next.stats.boards).toBe(6);
  });

  it("reads at most --limit boards for the dev script", async () => {
    const outcome = await runJobsIngest(context(), { ...OPTIONS, maxBoards: 1, feeds: false });
    expect((outcome.stats.boards ?? 0) + (outcome.stats.boardsFailed ?? 0)).toBe(1);
  });

  it("refuses boards whose address resolves to a private network", async () => {
    fakeNet.resolve("boards-api.greenhouse.io", "10.0.0.5");
    const outcome = await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    expect(outcome.stats.boardsFailed).toBe(2);
    expect(outcome.stats.boards).toBe(5);
    expect(fakeNet.urls().some((url) => url.includes("greenhouse"))).toBe(false);
  });
});

describe("runJobsIngest on Gem, Pinpoint and Jobvite boards", () => {
  const seeds = [
    { ats: "gem" as const, token: "function-health", company: "Function Health" },
    { ats: "pinpoint" as const, token: "nypl", company: "The New York Public Library" },
    { ats: "jobvite" as const, token: "qKr9VfwZ", company: "Nutanix" },
  ];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    fakeNet.reset();
    for (const host of ["api.gem.com", "nypl.pinpointhq.com", "app.jobvite.com"])
      fakeNet.resolve(host, "93.184.216.34");
    fakeNet.json(boardUrl("gem", "function-health").toString(), GEM_BOARD);
    fakeNet.json(boardUrl("pinpoint", "nypl").toString(), PINPOINT_FEED);
    fakeNet.route(boardUrl("jobvite", "qKr9VfwZ").toString(), {
      headers: { "content-type": "text/xml; charset=utf-8" },
      body: JOBVITE_FEED,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads each documented board feed and keeps no job text", async () => {
    const outcome = await runJobsIngest(context(), { ...OPTIONS, seeds, feeds: false });
    expect(outcome.stats).toMatchObject({ boards: 3, boardsFailed: 0, added: 7 });
    expect(fakeNet.urls().sort()).toEqual([
      "https://api.gem.com/job_board/v0/function-health/job_posts/",
      "https://app.jobvite.com/CompanyJobs/Xml.aspx?c=qKr9VfwZ",
      "https://nypl.pinpointhq.com/postings.json",
    ]);
    const db = await getDb();
    const saved = await db
      .select({ source: jobs.source, description: jobs.description })
      .from(jobs);
    expect(saved.map((job) => job.source).sort()).toEqual([
      "gem",
      "gem",
      "jobvite",
      "jobvite",
      "jobvite",
      "pinpoint",
      "pinpoint",
    ]);
    expect(saved.every((job) => job.description === "")).toBe(true);
  });

  it("refuses a Jobvite company id that isn't one", () => {
    expect(() => boardUrl("jobvite", "../x")).toThrow();
    expect(() => boardUrl("pinpoint", "a.b")).toThrow();
  });
});

describe("runJobsIngest on USAJOBS", () => {
  const item = USAJOBS_PAGE.SearchResult.SearchResultItems[0]!;
  const open = {
    ...USAJOBS_PAGE,
    SearchResult: {
      ...USAJOBS_PAGE.SearchResult,
      SearchResultCountAll: 1,
      SearchResultItems: [
        {
          ...item,
          MatchedObjectDescriptor: {
            ...item.MatchedObjectDescriptor,
            PublicationStartDate: "2026-11-09T00:00:00Z",
            ApplicationCloseDate: "2026-11-30T23:59:59Z",
          },
        },
      ],
    },
  };
  const options = { ...OPTIONS, seeds: [] };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    internet();
    fakeNet.resolve("data.usajobs.gov", "93.184.216.34");
    fakeNet.json(usajobsUrl(1).toString(), open);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.USAJOBS_API_KEY;
    delete process.env.USAJOBS_EMAIL;
    resetEnvForTests();
  });

  it("stays off until both the key and its email are set", async () => {
    process.env.USAJOBS_API_KEY = "key";
    resetEnvForTests();
    const outcome = await runJobsIngest(context(), options);
    expect(outcome.stats.feeds).toBe(3);
    expect(fakeNet.urls().some((url) => url.includes("usajobs"))).toBe(false);
  });

  it("reads open public announcements with the key and the registered email", async () => {
    process.env.USAJOBS_API_KEY = "key";
    process.env.USAJOBS_EMAIL = "jobs@example.com";
    resetEnvForTests();
    const outcome = await runJobsIngest(context(), options);
    expect(outcome).toMatchObject({ failed: [] });
    expect(outcome.stats.feeds).toBe(4);
    const [request] = fakeNet.requests.filter((r) => r.url.hostname === "data.usajobs.gov");
    expect(request?.headers).toMatchObject({
      "user-agent": "jobs@example.com",
      "authorization-key": "key",
    });
    const db = await getDb();
    const saved = await db
      .select({ title: jobs.title, url: jobs.url, description: jobs.description })
      .from(jobs)
      .where(eq(jobs.source, "usajobs"));
    expect(saved).toEqual([
      {
        title: "IT SPECIALIST (INFOSEC/NETWORK)",
        url: "https://www.usajobs.gov/GetJob/ViewDetails/21947200",
        description: "",
      },
    ]);
  });
});

const WORKDAY_HOST = "nvidia.wd5.myworkdayjobs.com";
const WORKDAY_API = `https://${WORKDAY_HOST}/wday/cxs/nvidia/NVIDIAExternalCareerSite`;
const WORKDAY_SEEDS = [
  { ats: "workday" as const, token: "nvidia.wd5/NVIDIAExternalCareerSite", company: "NVIDIA" },
];
const US_FACET = "2fcb99c455831013ea52fb338f2932d8";

function listWorkday(targetPage: typeof WORKDAY_TARGET_PAGE) {
  fakeNet.route(`${WORKDAY_API}/jobs`, (request) => {
    const body = JSON.parse(request.body ?? "{}") as {
      appliedFacets: Record<string, string[]>;
      offset: number;
    };
    const countries = body.appliedFacets.locationHierarchy1;
    const page = !countries
      ? WORKDAY_LIST
      : countries.includes(US_FACET)
        ? body.offset === 0
          ? targetPage
          : WORKDAY_TARGET_NEXT
        : WORKDAY_OTHER_PAGE;
    return { headers: { "content-type": "application/json" }, body: JSON.stringify(page) };
  });
}

function workdaySite() {
  fakeNet.reset();
  fakeNet.resolve(WORKDAY_HOST, "93.184.216.34");
  fakeNet.route(`https://${WORKDAY_HOST}/robots.txt`, {
    headers: { "content-type": "text/plain;charset=ISO-8859-1" },
    body: WORKDAY_ROBOTS,
  });
  listWorkday(WORKDAY_TARGET_PAGE);
  const post = (path: string) => `${WORKDAY_API}${path}`;
  fakeNet.json(post(WORKDAY_TARGET_PAGE.jobPostings[0]!.externalPath), WORKDAY_JOB_UK);
  fakeNet.json(post(WORKDAY_TARGET_PAGE.jobPostings[1]!.externalPath), {}, 404);
  fakeNet.json(post(WORKDAY_TARGET_NEXT.jobPostings[0]!.externalPath), WORKDAY_JOB_ISRAEL);
  fakeNet.json(post(WORKDAY_LIST.jobPostings[1]!.externalPath!), {}, 500);
}

const long = () => ({ now: Date.now(), deadline: Date.now() + 120_000 });
const postReads = () => fakeNet.urls().filter((url) => url.includes("/job/")).length;

describe("runJobsIngest on a Workday career site", () => {
  const options = { ...OPTIONS, seeds: WORKDAY_SEEDS, feeds: false };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    workdaySite();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks robots.txt, lists US jobs first, then the other target countries, then reads each new post", async () => {
    const outcome = await runJobsIngest(long(), options);
    expect(outcome).toMatchObject({ complete: true });
    expect(outcome.stats).toMatchObject({ boards: 1, added: 2, boardsPartial: 0 });
    expect(fakeNet.urls()[0]).toBe(`https://${WORKDAY_HOST}/robots.txt`);
    const lists = fakeNet.requests.filter((request) => request.url.pathname.endsWith("/jobs"));
    expect(lists.map((request) => JSON.parse(request.body!).offset)).toEqual([0, 0, 2, 0, 0]);
    const countries = lists.map(
      (request) =>
        (JSON.parse(request.body!) as { appliedFacets: Record<string, string[]> }).appliedFacets
          .locationHierarchy1?.length ?? 0,
    );
    expect(countries).toEqual([0, 1, 1, 2, 2]);
    expect(lists.every((request) => request.headers["content-type"] === "application/json")).toBe(
      true,
    );
    expect(postReads()).toBe(4);
    const db = await getDb();
    const saved = await db
      .select({ title: jobs.title, location: jobs.location, description: jobs.description })
      .from(jobs)
      .where(eq(jobs.source, "workday"));
    expect(saved.map((job) => job.title).sort()).toEqual([
      "AI Natives Sales Account Manager - UK",
      "Senior Technical Trainer and Content Developer, AI Compute Systems",
    ]);
    expect(saved.every((job) => job.description === "")).toBe(true);
  });

  it("reads a site every other day, and a post only when it's new or its listing changed", async () => {
    await runJobsIngest(long(), options);
    fakeNet.requests.length = 0;
    vi.setSystemTime(NOW + 21 * 60 * 60 * 1_000);
    expect((await runJobsIngest(long(), options)).stats.boards).toBe(0);
    vi.setSystemTime(NOW + 45 * 60 * 60 * 1_000);
    const again = await runJobsIngest(long(), options);
    expect(again.stats).toMatchObject({ boards: 1, added: 0, updated: 0, closed: 0 });
    // The two that failed last time are tried again; the two saved ones aren't.
    expect(postReads()).toBe(2);
  });

  it("reads a saved post again when its listing changes", async () => {
    await runJobsIngest(long(), options);
    const [uk, ...rest] = WORKDAY_TARGET_PAGE.jobPostings;
    const renamed = {
      ...WORKDAY_TARGET_PAGE,
      jobPostings: [{ ...uk!, title: "AI Natives Sales Lead - UK" }, ...rest],
    };
    listWorkday(renamed);
    fakeNet.requests.length = 0;
    vi.setSystemTime(NOW + 45 * 60 * 60 * 1_000);
    const again = await runJobsIngest(long(), options);
    expect(again.stats).toMatchObject({ added: 0, updated: 1 });
    expect(fakeNet.urls()).toContain(`${WORKDAY_API}${uk!.externalPath}`);
  });

  it("reads one post when a site lists the same job twice under one title and place", async () => {
    const [uk, ...rest] = WORKDAY_TARGET_PAGE.jobPostings;
    const again = { ...uk!, externalPath: `${uk!.externalPath}-1` };
    listWorkday({ ...WORKDAY_TARGET_PAGE, total: 4, jobPostings: [uk!, again, ...rest] });
    await runJobsIngest(long(), options);
    expect(fakeNet.urls()).not.toContain(`${WORKDAY_API}${again.externalPath}`);
    expect(postReads()).toBe(4);
  });

  it("leaves the posts it has no time for to the next call, which comes back to the site", async () => {
    const limits = { ...WORKDAY_LIMITS };
    Object.assign(WORKDAY_LIMITS, { postsPerRead: 2 });
    try {
      const first = await runJobsIngest(long(), options);
      expect(first).toMatchObject({ complete: false });
      expect(first.stats).toMatchObject({ boards: 1, boardsPartial: 1, added: 1 });
      expect(postReads()).toBe(2);
      const next = await runJobsIngest(long(), options);
      expect(next.stats).toMatchObject({ boards: 1, boardsPartial: 1, added: 1 });
      expect(postReads()).toBe(4);
    } finally {
      Object.assign(WORKDAY_LIMITS, limits);
    }
  });

  it("starts no Workday read within a minute of the deadline", async () => {
    const late = await runJobsIngest({ now: Date.now(), deadline: Date.now() + 30_000 }, options);
    expect(late).toMatchObject({ complete: false });
    expect(late.stats).toMatchObject({ boards: 0, boardsFailed: 0 });
    expect(fakeNet.requests).toHaveLength(0);
    expect((await runJobsIngest(long(), options)).stats).toMatchObject({ boards: 1, added: 2 });
  });

  it("leaves a site alone when its robots.txt disallows the job search", async () => {
    fakeNet.route(`https://${WORKDAY_HOST}/robots.txt`, {
      headers: { "content-type": "text/plain" },
      body: "User-agent: *\nDisallow: /wday/\n",
    });
    const outcome = await runJobsIngest(long(), options);
    expect(outcome.stats).toMatchObject({ boards: 0, boardsFailed: 1 });
    expect(fakeNet.urls()).toEqual([`https://${WORKDAY_HOST}/robots.txt`]);
  });
});

describe("paceKey", () => {
  it("keeps one pace for every company subdomain of a service", () => {
    const spacing = { "recruitee.com": 1_000, "api.lever.co": 1_000 };
    expect(paceKey("bunq.recruitee.com", spacing)).toBe("recruitee.com");
    expect(paceKey("api.lever.co", spacing)).toBe("api.lever.co");
    expect(paceKey("evilrecruitee.com", spacing)).toBe("evilrecruitee.com");
  });

  it("keeps a pace for each Workday tenant", () => {
    const spacing = { "*.myworkdayjobs.com": 1_500 };
    expect(paceKey("nvidia.wd5.myworkdayjobs.com", spacing)).toBe("nvidia.wd5.myworkdayjobs.com");
    expect(paceKey("adobe.wd5.myworkdayjobs.com", spacing)).toBe("adobe.wd5.myworkdayjobs.com");
  });
});
