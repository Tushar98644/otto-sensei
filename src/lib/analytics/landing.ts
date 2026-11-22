// Pure and safe in the browser: which app page a path is, and the utm tags our own emails carry.

export const DASHBOARD_SECTIONS = [
  "home",
  "resumes",
  "jobs",
  "applications",
  "application",
  "prep",
  "letters",
  "interview",
  "interview_pack",
  "portfolio",
  "formats",
  "account",
  "trash",
  "studio",
  "billing",
  "career_log",
  "career_checkin",
] as const;
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

const DASHBOARD_PAGES: Record<string, DashboardSection> = {
  "": "home",
  resumes: "resumes",
  jobs: "jobs",
  applications: "applications",
  letters: "letters",
  interview: "interview",
  portfolio: "portfolio",
  formats: "formats",
  account: "account",
  trash: "trash",
  "career-log": "career_log",
};

export function dashboardSection(pathname: string): DashboardSection | null {
  const path = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") ?? "";
  if (path === "/studio" || path.startsWith("/studio/")) return "studio";
  if (path === "/account") return "billing";
  if (path !== "/dashboard" && !path.startsWith("/dashboard/")) return null;
  const [page = "", id, more] = path.slice("/dashboard/".length).split("/");
  if (id === undefined) return DASHBOARD_PAGES[page] ?? null;
  if (page === "applications") {
    if (more === undefined) return "application";
    return more === "prep" ? "prep" : null;
  }
  if (page === "career-log")
    return id === "check-in" && more === undefined ? "career_checkin" : null;
  return page === "interview" && more === undefined ? "interview_pack" : null;
}

export const EMAIL_CAMPAIGNS = [
  "follow_up",
  "weekly_jobs",
  "tips",
  "trial_ending",
  "views",
  "career_checkin",
] as const;
export type EmailCampaign = (typeof EMAIL_CAMPAIGNS)[number];

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
// Read from any landing for page views; only our own emails' tags are taken off the address.
export const TRAFFIC_UTM_KEYS = [...UTM_KEYS, "utm_term"] as const;

const SOURCE = "otto";
const MEDIUM = "email";
const LINK = /^[a-z0-9_]{1,40}$/;

// Only the email and which of its links: never the person, the job or the page they open.
export function emailLink(url: string, campaign: EmailCampaign, link: string): string {
  const tagged = new URL(url);
  tagged.searchParams.set("utm_source", SOURCE);
  tagged.searchParams.set("utm_medium", MEDIUM);
  tagged.searchParams.set("utm_campaign", campaign);
  if (LINK.test(link)) tagged.searchParams.set("utm_content", link);
  return tagged.toString();
}

export type EmailLanding = { campaign: EmailCampaign; link?: string };

function isCampaign(value: string | null): value is EmailCampaign {
  return value !== null && (EMAIL_CAMPAIGNS as readonly string[]).includes(value);
}

export function emailLanding(search: string): EmailLanding | null {
  const params = new URLSearchParams(search);
  if (params.get("utm_source") !== SOURCE || params.get("utm_medium") !== MEDIUM) return null;
  const campaign = params.get("utm_campaign");
  if (!isCampaign(campaign)) return null;
  const link = params.get("utm_content");
  return link !== null && LINK.test(link) ? { campaign, link } : { campaign };
}

export function withoutUtm(href: string): string {
  const url = new URL(href);
  for (const key of UTM_KEYS) url.searchParams.delete(key);
  return url.toString();
}
