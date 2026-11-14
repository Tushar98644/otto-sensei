import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { jobBoards, jobMatch, jobs } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { fakeNet } from "@/lib/jobs/test-network";
import { boardUrl, paceKey, runJobsIngest } from "./ingest";
import {
  ASHBY_BOARD,
  GREENHOUSE_BOARD,
  HIMALAYAS_PAGE,
  JOBICY_PAGE,
  LEVER_POSTINGS,
  PERSONIO_FEED,
  RECRUITEE_OFFERS,
  REMOTE_OK_FEED,
  WORKABLE_ACCOUNT,
} from "./test-fixtures";

vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock("@/lib/jobs/transport", async () => (await import("@/lib/jobs/test-network")).transportMock);

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
  fakeNet.json(`https://himalayas.app/jobs/api?limit=20&cursor=${HIMALAYAS_PAGE.nextCursor}`, { jobs: [] });
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

  it("stops at the deadline and leaves the rest for the next run", async () => {
    const outcome = await runJobsIngest({ now: Date.now(), deadline: Date.now() - 1 }, { ...OPTIONS, feeds: false });
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

describe("paceKey", () => {
  it("keeps one pace for every company subdomain of a service", () => {
    const spacing = { "recruitee.com": 1_000, "api.lever.co": 1_000 };
    expect(paceKey("bunq.recruitee.com", spacing)).toBe("recruitee.com");
    expect(paceKey("api.lever.co", spacing)).toBe("api.lever.co");
    expect(paceKey("evilrecruitee.com", spacing)).toBe("evilrecruitee.com");
  });
});
