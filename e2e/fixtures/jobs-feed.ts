import type { Page } from "@playwright/test";
import { FREE_JOB_MATCHES } from "@/config/plans";
import type {
  JobMatchesResponse,
  MatchedJob,
  SavedJob,
  SavedJobResponse,
  SavedJobsResponse,
} from "@/lib/job-feed/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Added to the real count of open jobs, which is 0 in the e2e database.
const OPEN_JOBS = 1_250;

type Posting = Pick<MatchedJob, "company" | "title" | "location" | "remote"> & {
  label: MatchedJob["match"]["label"];
  daysAgo: number;
};

const POSTINGS: readonly Posting[] = [
  {
    company: "Northwind Labs",
    title: "Product Marketing Manager",
    location: "Remote",
    remote: true,
    label: "strong",
    daysAgo: 1,
  },
  {
    company: "Bluefin Analytics",
    title: "Senior Product Marketer",
    location: "Toronto, Canada",
    remote: false,
    label: "strong",
    daysAgo: 2,
  },
  {
    company: "Kestrel Health",
    title: "Growth Marketing Lead",
    location: "Berlin, Germany",
    remote: false,
    label: "good",
    daysAgo: 3,
  },
  {
    company: "Juniper Robotics",
    title: "Content Marketing Manager",
    location: "Austin, TX",
    remote: false,
    label: "good",
    daysAgo: 4,
  },
  {
    company: "Copperleaf",
    title: "Lifecycle Marketing Manager",
    location: "London, UK",
    remote: false,
    label: "good",
    daysAgo: 5,
  },
  {
    company: "Halcyon Maps",
    title: "Brand Marketing Manager",
    location: "Remote",
    remote: true,
    label: "stretch",
    daysAgo: 6,
  },
  {
    company: "Tidewater Systems",
    title: "Partner Marketing Manager",
    location: "Denver, CO",
    remote: false,
    label: "stretch",
    daysAgo: 8,
  },
];

// Ids in the uuid shape the routes accept; no job with these ids exists in the e2e database.
export const FEED_JOBS: readonly MatchedJob[] = POSTINGS.map((posting, index) => ({
  id: `e2e0b000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  source: "greenhouse",
  company: posting.company,
  title: posting.title,
  location: posting.location,
  remote: posting.remote,
  employmentType: "full_time",
  seniority: "mid",
  postedAt: Date.now() - posting.daysAgo * DAY_MS,
  url: `https://jobs.example.com/${posting.company.toLowerCase().replaceAll(" ", "-")}/${index + 1}`,
  keywords: ["product marketing", "positioning", "b2b"],
  closed: false,
  match: {
    label: posting.label,
    found: ["product marketing", "positioning"],
    missing: posting.label === "stretch" ? ["paid media"] : [],
    reason: `Your resume shows product marketing and positioning, which ${posting.company} asks for.`,
    notes: [],
    blocked: false,
  },
  saved: false,
  otherPlaces: [],
  morePlaces: 0,
  visa: [],
  position: index + 1,
}));

function savedJob(job: MatchedJob, savedAt: number): SavedJob {
  const { id, source, company, title, location, remote, employmentType, seniority } = job;
  const { postedAt, url, keywords, closed } = job;
  return {
    id,
    source,
    company,
    title,
    location,
    remote,
    employmentType,
    seniority,
    postedAt,
    url,
    keywords,
    closed,
    savedAt,
  };
}

// The e2e database has no jobs and the boards can't be read offline, so these are added to the real answers in the browser.
export async function fakeJobFeed(page: Page): Promise<void> {
  const byId = new Map(FEED_JOBS.map((job) => [job.id, job]));
  const saved = new Map<string, number>();

  await page.route("**/api/jobs/matches", async (route) => {
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const real = (await response.json()) as JobMatchesResponse;
    const { view } = route.request().postDataJSON() as { view?: string };
    const listed =
      view === "saved" && !real.locked ? FEED_JOBS.filter((job) => saved.has(job.id)) : FEED_JOBS;
    const shown = (real.locked ? listed.slice(0, FREE_JOB_MATCHES) : listed).map((job) => ({
      ...job,
      saved: saved.has(job.id),
    }));
    const body: JobMatchesResponse = {
      ...real,
      jobs: [...shown, ...real.jobs],
      total: real.total + listed.length,
      matching: real.matching + listed.length,
      strong: real.strong + listed.filter((job) => job.match.label === "strong").length,
      savedCount: real.savedCount + saved.size,
      openJobs: real.openJobs + OPEN_JOBS,
      // The page reads its clock before this answer lands, so a bare 2 hours could floor to 1.
      checkedAt: Date.now() - 2.5 * HOUR_MS,
    };
    return route.fulfill({ status: 200, json: body });
  });

  await page.route(/\/api\/jobs\/saved$/, async (route) => {
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const real = (await response.json()) as SavedJobsResponse;
    const extra = [...saved].flatMap(([id, at]) => {
      const job = byId.get(id);
      return job ? [savedJob(job, at)] : [];
    });
    return route.fulfill({ status: 200, json: { ...real, jobs: [...extra, ...real.jobs] } });
  });

  await page.route(/\/api\/jobs\/saved\/[^/?]+$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const method = route.request().method();
    const response = await route.fetch();
    // The real route answers first, so sign-in and the Pro check still decide; only "no such job" is replaced.
    if (byId.has(id) && method === "PUT" && response.status() === 404) saved.set(id, Date.now());
    else if (byId.has(id) && method === "DELETE" && response.ok()) saved.delete(id);
    else return route.fulfill({ response });
    const body: SavedJobResponse = { ok: true, saved: method === "PUT", savedCount: saved.size };
    return route.fulfill({ status: 200, json: body });
  });
}
