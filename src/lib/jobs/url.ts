import { isIP } from "node:net";
import { isPublicAddress } from "./address";
import { JobReadError } from "./errors";
import {
  ASHBY_HOST,
  GREENHOUSE_HOSTS,
  LEVER_HOSTS,
  PERSONIO_DOMAINS,
  RECRUITEE_DOMAIN,
  WORKABLE_HOST,
} from "./hosts";

export const MAX_LINK_CHARS = 2048;

export type JobTarget =
  | { kind: "greenhouse"; url: URL; token: string; id: string }
  | { kind: "lever"; url: URL; company: string; id: string; eu: boolean }
  | { kind: "ashby"; url: URL; org: string; id: string }
  | { kind: "workable"; url: URL; account: string; shortcode: string }
  | { kind: "recruitee"; url: URL; company: string; slug: string }
  | { kind: "personio"; url: URL; host: string; id: string }
  | { kind: "page"; url: URL; greenhouseId: string | null; ashbyId: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOB_NUMBER = /^\d{1,20}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
const ASHBY_ORG = /^[a-z0-9][a-z0-9 ._-]{0,99}$/i;
const WORKABLE_SHORTCODE = /^[a-z0-9]{6,16}$/i;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const VENDOR_LABELS = new Set(["www", "app", "api", "help", "support", "docs", "blog", "careers"]);

function companySubdomain(host: string, domain: string): string | null {
  if (!host.endsWith(`.${domain}`)) return null;
  const label = host.slice(0, -domain.length - 1);
  return HOST_LABEL.test(label) && !VENDOR_LABELS.has(label) ? label : null;
}

const UNREADABLE_SITES: Record<string, { site: string; reason: "login_required" | "blocked" }> = {
  linkedin: { site: "LinkedIn", reason: "login_required" },
  lnkd: { site: "LinkedIn", reason: "login_required" },
  glassdoor: { site: "Glassdoor", reason: "login_required" },
  indeed: { site: "Indeed", reason: "blocked" },
};

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan", ".corp"];
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu", "ne", "or"]);

// Runs before every request, redirects included; DNS is checked again at connect time.
export function toFetchableUrl(input: string | URL, base?: URL): URL {
  let url: URL;
  try {
    url = new URL(input, base);
  } catch {
    throw new JobReadError("invalid_url");
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:" || url.username || url.password)
    throw new JobReadError("invalid_url");
  url.hash = "";

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const name = host.replace(/\.$/, "");
  // URL parsing already turned every IPv4 spelling (2130706433, 0x7f.1) into dotted form.
  const local = isIP(host)
    ? !isPublicAddress(host)
    : !name.includes(".") ||
      name === "localhost" ||
      LOCAL_SUFFIXES.some((suffix) => name.endsWith(suffix));
  if (local) throw new JobReadError("private_address");
  if (url.port !== "" && url.port !== "443")
    throw new JobReadError("unreachable", { detail: "port" });
  return url;
}

function decodePart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function param(url: URL, name: string, pattern: RegExp): string | null {
  const value = url.searchParams.get(name)?.trim() ?? "";
  return pattern.test(value) ? value : null;
}

function unreadableSite(host: string) {
  const labels = host.split(".").slice(0, -1);
  for (const label of labels) {
    const site = UNREADABLE_SITES[label];
    if (site) return site;
  }
  return null;
}

export function companyLabel(hostname: string): string | null {
  const labels = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .split(".")
    .filter((label) => label !== "www");
  if (labels.length < 2) return null;
  const tld = labels.at(-1)!;
  const second = labels.at(-2)!;
  const label =
    labels.length >= 3 && tld.length === 2 && SECOND_LEVEL.has(second) ? labels.at(-3)! : second;
  return SLUG.test(label) ? label : null;
}

function greenhouseTarget(url: URL, parts: string[]): JobTarget {
  const [first, second, third] = parts;
  if (first === "embed" && second === "job_app") {
    const token = param(url, "for", SLUG);
    const id = param(url, "token", JOB_NUMBER);
    if (token && id) return { kind: "greenhouse", url, token, id };
  } else if (first && SLUG.test(first) && first !== "embed") {
    if (second === "jobs" && third && JOB_NUMBER.test(third))
      return { kind: "greenhouse", url, token: first, id: third };
    const id = param(url, "gh_jid", JOB_NUMBER);
    if (!second && id) return { kind: "greenhouse", url, token: first, id };
  }
  throw new JobReadError("listing");
}

export function parseJobLink(raw: string): JobTarget {
  const link = raw.trim();
  if (!link || link.length > MAX_LINK_CHARS || /\s/.test(link))
    throw new JobReadError("invalid_url");
  const hasScheme = /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(link);
  const url = toFetchableUrl(hasScheme ? link : `https://${link.replace(/^\/\//, "")}`);
  const host = url.hostname.replace(/\.$/, "").replace(/^www\./, "");

  const unreadable = unreadableSite(host);
  if (unreadable) throw new JobReadError(unreadable.reason, { site: unreadable.site });

  const parts = url.pathname.split("/").filter(Boolean).map(decodePart);
  if (GREENHOUSE_HOSTS.has(host)) return greenhouseTarget(url, parts);
  if (LEVER_HOSTS.has(host)) {
    const [company, id] = parts;
    if (company && id && SLUG.test(company) && UUID.test(id)) {
      return { kind: "lever", url, company, id: id.toLowerCase(), eu: host === "jobs.eu.lever.co" };
    }
    throw new JobReadError("listing");
  }
  if (host === ASHBY_HOST) {
    const [org, id] = parts;
    if (org && id && ASHBY_ORG.test(org) && UUID.test(id))
      return { kind: "ashby", url, org, id: id.toLowerCase() };
    throw new JobReadError("listing");
  }
  if (host === WORKABLE_HOST) {
    const [account, j, shortcode] = parts;
    if (
      account &&
      j === "j" &&
      shortcode &&
      SLUG.test(account) &&
      WORKABLE_SHORTCODE.test(shortcode)
    )
      return { kind: "workable", url, account, shortcode };
    if (account !== "j") throw new JobReadError("listing");
  }
  const recruitee = companySubdomain(host, RECRUITEE_DOMAIN);
  if (recruitee) {
    const [o, slug] = parts;
    if (o === "o" && slug && SLUG.test(slug))
      return { kind: "recruitee", url, company: recruitee, slug };
    throw new JobReadError("listing");
  }
  const personio = PERSONIO_DOMAINS.find((domain) => companySubdomain(host, domain));
  if (personio) {
    const [job, id] = parts;
    if (job === "job" && id && JOB_NUMBER.test(id)) return { kind: "personio", url, host, id };
    throw new JobReadError("listing");
  }
  return {
    kind: "page",
    url,
    greenhouseId: param(url, "gh_jid", JOB_NUMBER),
    ashbyId: param(url, "ashby_jid", UUID)?.toLowerCase() ?? null,
  };
}
