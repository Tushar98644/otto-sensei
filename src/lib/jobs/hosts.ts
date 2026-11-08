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
