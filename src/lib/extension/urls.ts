export const JOB_SITES = [
  "linkedin",
  "naukri",
  "indeed",
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "workable",
  "other",
] as const;
export type JobSite = (typeof JOB_SITES)[number];

export const SITE_NAMES: Record<JobSite, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  other: "the web",
};

const TRACKING =
  /^(?:utm_|gh_src$|gclid$|fbclid$|msclkid$|trk$|trkInfo$|refId$|trackingId$|lipi$|src$|source$|ref$|referrer$|from$|tk$|advn$|vjs$|lever-source|lever-origin|ashby_)/i;

function parse(input: string): URL | null {
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function host(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

const within = (name: string, domain: string) => name === domain || name.endsWith(`.${domain}`);

export function jobSiteOf(input: string): JobSite {
  const url = parse(input);
  if (!url) return "other";
  const name = host(url);
  if (within(name, "linkedin.com")) return "linkedin";
  if (within(name, "naukri.com")) return "naukri";
  if (within(name, "indeed.com")) return "indeed";
  if (/^(?:job-)?boards(?:\.eu)?\.greenhouse\.io$/.test(name)) return "greenhouse";
  if (/^jobs(?:\.eu)?\.lever\.co$/.test(name)) return "lever";
  if (name === "jobs.ashbyhq.com") return "ashby";
  if (within(name, "myworkdayjobs.com")) return "workday";
  if (within(name, "smartrecruiters.com")) return "smartrecruiters";
  if (within(name, "workable.com")) return "workable";
  return "other";
}

function clean(url: URL): string {
  url.hash = "";
  url.username = "";
  url.password = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.hostname = host(url);
  return url.href;
}

// One link per job, so the same post saved from a search pane and from its own page is one card.
export function canonicalJobUrl(input: string): string | null {
  const url = parse(input.trim());
  if (!url) return null;
  const site = jobSiteOf(url.href);
  const name = host(url);
  if (site === "linkedin") {
    const id =
      /\/jobs\/view\/(?:[^/]*?-)?(\d{6,})/.exec(url.pathname)?.[1] ??
      url.searchParams.get("currentJobId");
    return id && /^\d{6,}$/.test(id) ? `https://www.linkedin.com/jobs/view/${id}/` : clean(url);
  }
  if (site === "indeed") {
    const id = url.searchParams.get("jk") ?? url.searchParams.get("vjk");
    return id && /^[a-f0-9]{8,32}$/i.test(id) ? `https://${name}/viewjob?jk=${id}` : clean(url);
  }
  if (site === "greenhouse") {
    const board = url.searchParams.get("for");
    const token = url.searchParams.get("token") ?? url.searchParams.get("gh_jid");
    if (url.pathname.startsWith("/embed/") && board && token) {
      return `https://job-boards.greenhouse.io/${encodeURIComponent(board)}/jobs/${encodeURIComponent(token)}`;
    }
    const path = /^\/([^/]+)\/jobs\/(\d+)/.exec(url.pathname);
    if (path) return `https://job-boards.greenhouse.io/${path[1]}/jobs/${path[2]}`;
    return clean(url);
  }
  if (site === "lever" || site === "ashby") {
    const path = /^\/([^/]+)\/([0-9a-f-]{36})/i.exec(url.pathname);
    if (path) return `https://${name}/${path[1]}/${path[2]!.toLowerCase()}`;
    return clean(url);
  }
  if (
    site === "workday" ||
    site === "naukri" ||
    site === "smartrecruiters" ||
    site === "workable"
  ) {
    url.search = "";
    url.pathname =
      url.pathname.replace(/\/(?:apply|application)\/?$/i, "").replace(/\/$/, "") || "/";
    return clean(url);
  }
  return clean(url);
}
