import type { JobPosting, JobSource } from "@/lib/api/types";
import { ASHBY_HOST, GREENHOUSE_HOSTS, LEVER_HOSTS } from "@/lib/jobs/hosts";
import type { HiringSystemId } from "./types";

const BY_SOURCE: Partial<Record<JobSource, HiringSystemId>> = {
  greenhouse: "greenhouse",
  lever: "lever",
  ashby: "ashby",
  workable: "workable",
  recruitee: "recruitee",
};

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
  { id: "taleo", matches: (host) => under(host, "taleo.net") && !host.endsWith(".tbe.taleo.net") },
  {
    id: "successfactors",
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
