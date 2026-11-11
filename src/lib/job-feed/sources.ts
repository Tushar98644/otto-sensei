import type { JobSourceId } from "./types";

// Every job links to its original posting and names its source (terms quoted in JOB-SOURCES.md).

export type SourceInfo = {
  name: string;
  homeUrl: string;
  termsUrl: string;
  // Every other source's terms (no search engines, traffic back, careers-page-only) mean link out.
  republish: boolean;
  // No text stored. Himalayas' pages refuse bots and Remote OK can't return one job, so theirs is
  // kept.
  liveText: boolean;
};

export const SOURCE_INFO: Record<JobSourceId, SourceInfo> = {
  greenhouse: {
    name: "Greenhouse",
    homeUrl: "https://www.greenhouse.com",
    termsUrl: "https://docs.greenhouse.io/job-board.html",
    republish: true,
    liveText: true,
  },
  lever: {
    name: "Lever",
    homeUrl: "https://www.lever.co",
    termsUrl: "https://github.com/lever/postings-api",
    republish: true,
    liveText: true,
  },
  ashby: {
    name: "Ashby",
    homeUrl: "https://www.ashbyhq.com",
    termsUrl: "https://developers.ashbyhq.com/docs/public-job-posting-api",
    republish: true,
    liveText: true,
  },
  workable: {
    name: "Workable",
    homeUrl: "https://www.workable.com",
    termsUrl: "https://help.workable.com/hc/en-us/articles/115012771647",
    republish: false,
    liveText: true,
  },
  recruitee: {
    name: "Recruitee",
    homeUrl: "https://recruitee.com",
    termsUrl: "https://docs.recruitee.com/reference/intro-to-careers-site-api",
    republish: false,
    liveText: true,
  },
  personio: {
    name: "Personio",
    homeUrl: "https://www.personio.com",
    termsUrl: "https://developer.personio.de/docs/integration-of-open-positions",
    republish: false,
    liveText: true,
  },
  himalayas: {
    name: "Himalayas",
    homeUrl: "https://himalayas.app",
    termsUrl: "https://himalayas.app/terms",
    republish: false,
    liveText: false,
  },
  remoteok: {
    name: "Remote OK",
    homeUrl: "https://remoteok.com",
    termsUrl: "https://remoteok.com/api",
    republish: false,
    liveText: false,
  },
  // Its terms let us store the jobs; every Apply must go to the job's Jobicy page, credited.
  jobicy: {
    name: "Jobicy",
    homeUrl: "https://jobicy.com",
    termsUrl: "https://jobicy.com/jobs-rss-feed",
    republish: false,
    liveText: true,
  },
};

/** "via Greenhouse": the credit line on every job. */
export function sourceCredit(source: JobSourceId): string {
  return `via ${SOURCE_INFO[source].name}`;
}
