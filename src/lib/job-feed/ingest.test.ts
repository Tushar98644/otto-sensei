import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { jobBoards, jobs } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { fakeNet } from "@/lib/jobs/test-network";
import { boardUrl, runJobsIngest } from "./ingest";
import { ASHBY_BOARD, GREENHOUSE_BOARD, HIMALAYAS_PAGE, LEVER_POSTINGS, REMOTE_OK_FEED } from "./test-fixtures";

vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock("@/lib/jobs/transport", async () => (await import("@/lib/jobs/test-network")).transportMock);

const SEEDS = [
  { ats: "greenhouse" as const, token: "vercel", company: "Vercel" },
  { ats: "lever" as const, token: "spotify", company: "Spotify" },
  { ats: "ashby" as const, token: "linear", company: "Linear" },
  { ats: "greenhouse" as const, token: "gone", company: "Gone Inc" },
];
const OPTIONS = { seeds: SEEDS, spacing: {}, workers: 2 };
const context = () => ({ now: Date.now(), deadline: Date.now() + 20_000 });

function internet() {
  fakeNet.reset();
  for (const host of ["boards-api.greenhouse.io", "api.lever.co", "api.ashbyhq.com", "himalayas.app", "remoteok.com"]) {
    fakeNet.resolve(host, "93.184.216.34");
  }
  fakeNet.json(boardUrl("greenhouse", "vercel").toString(), GREENHOUSE_BOARD);
  fakeNet.json(boardUrl("lever", "spotify").toString(), LEVER_POSTINGS);
  fakeNet.json(boardUrl("ashby", "linear").toString(), ASHBY_BOARD);
  fakeNet.json(boardUrl("greenhouse", "gone").toString(), { status: 404, error: "Not found" }, 404);
  fakeNet.json("https://remoteok.com/api", REMOTE_OK_FEED);
  // Two pages: the second has no cursor, so paging stops there.
  fakeNet.json("https://himalayas.app/jobs/api?limit=20", HIMALAYAS_PAGE);
  fakeNet.json(`https://himalayas.app/jobs/api?limit=20&cursor=${HIMALAYAS_PAGE.nextCursor}`, { jobs: [] });
}

describe("runJobsIngest", () => {
  beforeEach(async () => {
    await resetDb();
    internet();
  });

  it("reads every board and feed through the safe transport and saves their jobs", async () => {
    const outcome = await runJobsIngest(context(), OPTIONS);
    expect(outcome).toMatchObject({ complete: true, failed: [] });
    expect(outcome.stats).toMatchObject({ boards: 3, boardsFailed: 1, feeds: 2, added: 6, boardsLeft: 0 });
    const db = await getDb();
    const saved = await db.select({ source: jobs.source, company: jobs.company }).from(jobs);
    expect(saved.map((job) => `${job.source}:${job.company}`).sort()).toEqual([
      "ashby:Linear",
      "greenhouse:Vercel",
      "greenhouse:Vercel",
      "himalayas:Acme Health",
      "lever:Spotify",
      "remoteok:Salvo Software",
    ]);
    // Every request went to a pinned, checked address, with the bot's name.
    for (const request of fakeNet.requests) {
      expect(request.url.protocol).toBe("https:");
      expect(request.headers["user-agent"]).toMatch(/^OttoResumeBot/);
    }
    const [gone] = await db.select().from(jobBoards).where(eq(jobBoards.token, "gone"));
    expect(gone).toMatchObject({ lastStatus: "not_found", failures: 1 });
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
    expect(next.stats.boards).toBe(3);
  });

  it("reads at most --limit boards for the dev script", async () => {
    const outcome = await runJobsIngest(context(), { ...OPTIONS, maxBoards: 1, feeds: false });
    expect((outcome.stats.boards ?? 0) + (outcome.stats.boardsFailed ?? 0)).toBe(1);
  });

  it("refuses boards whose address resolves to a private network", async () => {
    fakeNet.resolve("boards-api.greenhouse.io", "10.0.0.5");
    const outcome = await runJobsIngest(context(), { ...OPTIONS, feeds: false });
    expect(outcome.stats.boardsFailed).toBe(2);
    expect(fakeNet.urls().some((url) => url.includes("greenhouse"))).toBe(false);
  });
});
