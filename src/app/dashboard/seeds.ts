import "server-only";
import { GET as readApplications } from "@/app/api/applications/route";
import { GET as readCareerLog } from "@/app/api/career-log/route";
import { GET as readEmailTracking } from "@/app/api/email-tracking/route";
import { GET as readGitHubConnection } from "@/app/api/github/connection/route";
import { GET as readInterviewPacks } from "@/app/api/interview/route";
import { GET as readSavedJobs } from "@/app/api/jobs/saved/route";
import { GET as readNotifications } from "@/app/api/notifications/route";
import { GET as readReminderSettings } from "@/app/api/notifications/settings/route";
import { GET as readSavedPosts } from "@/app/api/saved-posts/route";
import { GET as readPortfolio } from "@/app/api/portfolio/route";
import { GET as readWorkProfile } from "@/app/api/profile/route";
import { listBackupVersions } from "@/app/api/resumes/backups";
import { GET as readAccountSetup } from "@/app/api/setup/route";
import { GET as readShares } from "@/app/api/share/route";
import { GET as readWritings } from "@/app/api/writings/route";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { hasProTools } from "@/config/plans";
import { CAREER_LOG_ROUTE, CHECKIN_ROUTE, homeCheckinMonth } from "@/lib/career-log/links";
import type { NotificationsResponse } from "@/lib/notifications/types";
import type { ApiSeeds, LetteredApplications, NextApplications, SeedKey } from "@/lib/api/seeds";
import type { ApplicationsResponse } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { letteredApplicationIds } from "@/lib/writings/records";

// Each key but the second page of applications, which follows the first (nextApplications).
type ReadKey = Exclude<SeedKey, "applicationsNext">;
type RouteKey = Exclude<ReadKey, "resumeVersions" | "letteredApplications">;

// The routes' own handlers, so a seed is exactly what the browser would have been sent.
const ROUTE_READS: Record<RouteKey, () => Promise<Response>> = {
  notifications: () => readNotifications(),
  workProfile: () => readWorkProfile(),
  accountSetup: () => readAccountSetup(),
  applications: () => readApplications(new Request("http://localhost/api/applications")),
  reminderSettings: () => readReminderSettings(),
  savedJobs: () => readSavedJobs(),
  writings: () => readWritings(),
  interviewPacks: () => readInterviewPacks(),
  portfolio: () => readPortfolio(),
  shares: () => readShares(),
  githubConnection: () => readGitHubConnection(),
  savedPosts: () => readSavedPosts(),
  emailTracking: () => readEmailTracking(),
  careerLog: () => readCareerLog(),
};

// The shell's reads (bell, setup defaults, resume list) and the other pages' small ones (see warmSharedReads).
function everyPage(user: SessionUser): ReadKey[] {
  const shell: ReadKey[] = ["notifications", "workProfile", "accountSetup", "resumeVersions"];
  const pro: ReadKey[] = ["reminderSettings", "savedJobs", "interviewPacks"];
  return [...shell, "shares", ...(hasProTools(user.plan) ? pro : [])];
}

// Up to 500 applications and 200 whole letters: only the pages that draw them as they open carry them.
const APPLICATION_PAGES: readonly string[] = [
  ROUTES.dashboard,
  ROUTES.dashboardResumes,
  ROUTES.dashboardJobs,
  ROUTES.dashboardLetters,
];
const APPLICATION_SECTIONS: readonly string[] = [
  ROUTES.dashboardApplications,
  ROUTES.dashboardInterview,
];

function largeReads(pathname: string, user: SessionUser): ReadKey[] {
  const keys: ReadKey[] = [];
  if (
    APPLICATION_PAGES.includes(pathname) ||
    APPLICATION_SECTIONS.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    keys.push("applications");
  }
  // Home's What's working sets applications sent with a letter against those without, on Pro tools.
  if (pathname === ROUTES.dashboard && hasProTools(user.plan)) keys.push("letteredApplications");
  return keys;
}

// What each page asks for as it opens on any plan (see the requests in components/dashboard/prefetch.ts).
function pageReads(pathname: string, user: SessionUser): ReadKey[] {
  switch (pathname) {
    case ROUTES.dashboardApplications:
      return ["savedJobs", "writings", "savedPosts", "emailTracking", "careerLog"];
    case CAREER_LOG_ROUTE:
    case CHECKIN_ROUTE:
      return ["careerLog"];
    case ROUTES.dashboardLetters:
      return ["writings"];
    case ROUTES.dashboardInterview:
      return ["interviewPacks"];
    case PORTFOLIO_ROUTE:
      return user.plan === "free" ? [] : ["portfolio", "githubConnection"];
    default:
      return [];
  }
}

async function routeAnswer(key: RouteKey): Promise<unknown> {
  try {
    const res = await ROUTE_READS[key]();
    return res.ok ? ((await res.json()) as unknown) : null;
  } catch {
    return null;
  }
}

function seedFor(key: ReadKey, user: SessionUser): Promise<unknown> {
  if (key === "resumeVersions") return listBackupVersions(user.id).catch(() => null);
  if (key === "letteredApplications") {
    return letteredApplicationIds(user.id).then(
      (ids): LetteredApplications => ({ ids }),
      () => null,
    );
  }
  return routeAnswer(key);
}

// Home's check-in card reads the career log, so Home brings it only when the bell has the card's note.
async function homeCareerLog(notifications: Promise<unknown> | undefined): Promise<unknown> {
  const bell = (await notifications) as NotificationsResponse | null;
  if (!bell || homeCheckinMonth(bell.notifications, Date.now()) === null) return null;
  return routeAnswer("careerLog");
}

// Past one page of applications, the next one too, so the list is whole when the page hydrates.
async function nextApplications(first: Promise<unknown>): Promise<NextApplications | null> {
  const page = (await first) as ApplicationsResponse | null;
  const cursor = page?.nextCursor;
  if (!cursor) return null;
  try {
    const res = await readApplications(
      new Request(`http://localhost/api/applications?cursor=${encodeURIComponent(cursor)}`),
    );
    return res.ok ? { cursor, page: (await res.json()) as ApplicationsResponse } : null;
  } catch {
    return null;
  }
}

// Started, not awaited: the page streams out at once and each answer follows in the same response.
export function dashboardSeeds(user: SessionUser, path: string | null): ApiSeeds {
  const pathname = (path ?? "").split(/[?#]/, 1)[0] ?? "";
  const seeds: ApiSeeds = {};
  const keys = [...everyPage(user), ...largeReads(pathname, user), ...pageReads(pathname, user)];
  for (const key of new Set(keys)) {
    seeds[key] = seedFor(key, user);
  }
  if (pathname === ROUTES.dashboard) seeds.careerLog = homeCareerLog(seeds.notifications);
  if (seeds.applications) seeds.applicationsNext = nextApplications(seeds.applications);
  return seeds;
}
