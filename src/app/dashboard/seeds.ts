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
import { CAREER_LOG_ROUTE, CHECKIN_ROUTE } from "@/lib/career-log/links";
import type { ApiSeeds, SeedKey } from "@/lib/api/seeds";
import type { SessionUser } from "@/lib/auth/types";

type RouteKey = Exclude<SeedKey, "resumeVersions">;

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
function everyPage(user: SessionUser): SeedKey[] {
  const shell: SeedKey[] = ["notifications", "workProfile", "accountSetup", "resumeVersions"];
  const pro: SeedKey[] = ["reminderSettings", "savedJobs", "writings", "interviewPacks"];
  return [...shell, "applications", "shares", ...(hasProTools(user.plan) ? pro : [])];
}

// What each page asks for as it opens on any plan (see the requests in components/dashboard/prefetch.ts).
function pageReads(pathname: string, user: SessionUser): SeedKey[] {
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

function seedFor(key: SeedKey, user: SessionUser): Promise<unknown> {
  if (key !== "resumeVersions") return routeAnswer(key);
  return listBackupVersions(user.id).catch(() => null);
}

// Started, not awaited: the page streams out at once and each answer follows in the same response.
export function dashboardSeeds(user: SessionUser, path: string | null): ApiSeeds {
  const pathname = (path ?? "").split(/[?#]/, 1)[0] ?? "";
  const seeds: ApiSeeds = {};
  for (const key of new Set([...everyPage(user), ...pageReads(pathname, user)])) {
    seeds[key] = seedFor(key, user);
  }
  return seeds;
}
