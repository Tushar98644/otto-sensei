import type { JobSourceId } from "./types";

// Client-safe. Where jobs come from and what each source's terms let us do (JOB-SOURCES.md has
// the quotes). Every job links to its original posting and names its source.

export type SourceInfo = {
  name: string;
  homeUrl: string;
  termsUrl: string;
  // The terms allow showing the post's text on our own page with JobPosting structured data.
  // Himalayas forbids passing jobs to job search engines (structured data included) and Remote OK
  // asks for traffic back, so their jobs only ever link out.
  republish: boolean;
};

export const SOURCE_INFO: Record<JobSourceId, SourceInfo> = {
  greenhouse: {
    name: "Greenhouse",
    homeUrl: "https://www.greenhouse.com",
    termsUrl: "https://docs.greenhouse.io/job-board.html",
    republish: true,
  },
  lever: {
    name: "Lever",
    homeUrl: "https://www.lever.co",
    termsUrl: "https://github.com/lever/postings-api",
    republish: true,
  },
  ashby: {
    name: "Ashby",
    homeUrl: "https://www.ashbyhq.com",
    termsUrl: "https://developers.ashbyhq.com/docs/public-job-posting-api",
    republish: true,
  },
  himalayas: {
    name: "Himalayas",
    homeUrl: "https://himalayas.app",
    termsUrl: "https://himalayas.app/terms",
    republish: false,
  },
  remoteok: {
    name: "Remote OK",
    homeUrl: "https://remoteok.com",
    termsUrl: "https://remoteok.com/api",
    republish: false,
  },
};

/** "via Greenhouse": the credit line on every job. */
export function sourceCredit(source: JobSourceId): string {
  return `via ${SOURCE_INFO[source].name}`;
}
