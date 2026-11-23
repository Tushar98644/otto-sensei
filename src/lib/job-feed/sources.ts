import type { JobSourceId } from "./types";

// Source terms require every job to link to its posting and name its source (docs/job-sources.md).

export type SourceInfo = {
  name: string;
  homeUrl: string;
  termsUrl: string;
  republish: boolean;
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
  workday: {
    name: "Workday",
    homeUrl: "https://www.workday.com",
    termsUrl: "https://www.workday.com/en-us/legal/site-terms.html",
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
  jobicy: {
    name: "Jobicy",
    homeUrl: "https://jobicy.com",
    termsUrl: "https://jobicy.com/jobs-rss-feed",
    republish: false,
    liveText: true,
  },
};

export function sourceCredit(source: JobSourceId): string {
  return `via ${SOURCE_INFO[source].name}`;
}
