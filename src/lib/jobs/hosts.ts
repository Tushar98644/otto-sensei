// Client-safe. The hosts of the job boards Otto reads through their own APIs, shared by link
// parsing (./url.ts) and the hiring-system notes (@/lib/ats/detect.ts).

export const GREENHOUSE_HOSTS: ReadonlySet<string> = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "boards.eu.greenhouse.io",
  "job-boards.eu.greenhouse.io",
]);
export const LEVER_HOSTS: ReadonlySet<string> = new Set(["jobs.lever.co", "jobs.eu.lever.co"]);
export const ASHBY_HOST = "jobs.ashbyhq.com";
export const WORKABLE_HOST = "apply.workable.com";
// Each company has its own subdomain: acme.recruitee.com, acme.jobs.personio.de.
export const RECRUITEE_DOMAIN = "recruitee.com";
export const PERSONIO_DOMAINS: readonly string[] = ["jobs.personio.de", "jobs.personio.com"];
