import type { JobPosting, JobSource } from "@/lib/api/types";
import { ASHBY_HOST, GREENHOUSE_HOSTS, LEVER_HOSTS } from "@/lib/jobs/hosts";
import type { HiringSystemId } from "./types";

// Client-safe. Which hiring system a job runs on, from what reading its link already told us (the
// board it was read from) and, for every other system, the address of its job page. Company
// career sites on their own domain can't be told apart, so they get no notes.

const BY_SOURCE: Partial<Record<JobSource, HiringSystemId>> = {
  greenhouse: "greenhouse",
  lever: "lever",
  ashby: "ashby",
};

// Subdomains vendors use for their own sites, which are never a job.
const VENDOR_PAGES = new Set([
  "www",
  "help",
  "support",
  "docs",
  "blog",
  "community",
  "status",
  "developers",
  "api",
  "partners",
  "resources",
  "care",
  "learn",
]);

// Anything under the vendor's domain except its own help, blog and marketing pages.
function under(host: string, domain: string): boolean {
  if (!host.endsWith(`.${domain}`)) return false;
  const label = host.slice(0, -domain.length - 1).split(".")[0] ?? "";
  return label !== "" && !VENDOR_PAGES.has(label);
}

const JOB_NUMBER = /^\d{1,20}$/;

type Rule = { id: HiringSystemId; matches: (host: string, url: URL) => boolean };

const RULES: readonly Rule[] = [
  {
    id: "greenhouse",
    // Company career pages that embed a Greenhouse board name the job in the query.
    matches: (host, url) =>
      GREENHOUSE_HOSTS.has(host) || JOB_NUMBER.test(url.searchParams.get("gh_jid") ?? ""),
  },
  { id: "lever", matches: (host) => LEVER_HOSTS.has(host) },
  {
    id: "ashby",
    matches: (host, url) => host === ASHBY_HOST || url.searchParams.has("ashby_jid"),
  },
  {
    id: "workday",
    matches: (host) => under(host, "myworkdayjobs.com") || under(host, "myworkdaysite.com"),
  },
  { id: "icims", matches: (host) => under(host, "icims.com") },
  // Taleo Business Edition (*.tbe.taleo.net) is a different product, and these docs don't cover it.
  { id: "taleo", matches: (host) => under(host, "taleo.net") && !host.endsWith(".tbe.taleo.net") },
  {
    id: "successfactors",
    // SAP's own job site runs on its SuccessFactors career site builder.
    matches: (host) =>
      /^career\d*\.successfactors\.(?:com|eu)$/.test(host) ||
      under(host, "jobs2web.com") ||
      host === "jobs.sap.com",
  },
  {
    id: "smartrecruiters",
    matches: (host) => host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com",
  },
  { id: "workable", matches: (host) => host === "apply.workable.com" },
  { id: "bamboohr", matches: (host) => under(host, "bamboohr.com") },
  { id: "jobvite", matches: (host) => host === "jobs.jobvite.com" },
  { id: "recruitee", matches: (host) => under(host, "recruitee.com") },
  { id: "teamtailor", matches: (host) => under(host, "teamtailor.com") },
];

function toUrl(value: string | null | undefined): URL | null {
  const text = value?.trim() ?? "";
  if (!text || text.length > 2048 || /\s/.test(text)) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
}

/**
 * The hiring system behind a job: the board a posting was read from, else the posting's own
 * address, else the link as typed (when reading it failed, the link is all there is).
 */
export function hiringSystemOf(
  posting: Pick<JobPosting, "source" | "url"> | null,
  link?: string | null,
): HiringSystemId | null {
  const known = posting ? BY_SOURCE[posting.source] : undefined;
  if (known) return known;
  for (const candidate of [posting?.url, link]) {
    const url = toUrl(candidate);
    if (!url) continue;
    const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
    const rule = RULES.find((entry) => entry.matches(host, url));
    if (rule) return rule.id;
  }
  return null;
}
