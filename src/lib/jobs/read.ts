import type { JobPosting } from "@/lib/api/types";
import {
  readAshby,
  readGreenhouse,
  readLever,
  readPersonio,
  readRecruitee,
  readWorkable,
} from "./boards";
import { JobReadError } from "./errors";
import { safeFetch } from "./fetch";
import { scanPage } from "./html";
import { findJsonLdJob } from "./jsonld";
import { buildPosting, MIN_TEXT_CHARS, realLength } from "./posting";
import { companyLabel, type JobTarget } from "./url";

const READ_BUDGET_MS = 20_000;

const GREENHOUSE_REFERENCE =
  /greenhouse\.io\/(?:embed\/job_(?:board|app)(?:\/js)?\?(?:[^"'\s<>]{0,200}?[&;])?for=([a-z0-9_-]{1,100})|([a-z0-9_-]{1,100})\/jobs\/\d)/i;
const ASHBY_REFERENCE = /jobs\.ashbyhq\.com\/([a-z0-9][a-z0-9._%-]{0,99})/i;
const LOGIN_PATH = /\/(?:log-?in|sign-?in|auth|sso)(?:\/|$)/i;

export function greenhouseToken(html: string): string | null {
  const match = GREENHOUSE_REFERENCE.exec(html);
  const token = (match?.[1] ?? match?.[2])?.toLowerCase();
  return token && token !== "embed" ? token : null;
}

export function ashbyOrg(html: string): string | null {
  const raw = ASHBY_REFERENCE.exec(html)?.[1];
  if (!raw) return null;
  try {
    const org = decodeURIComponent(raw);
    return org === "api" ? null : org;
  } catch {
    return null;
  }
}

export function postingFromHtml(html: string, url: URL): JobPosting {
  const page = scanPage(html);
  const job = findJsonLdJob(page.jsonLd);
  if (job && realLength(job.text) >= MIN_TEXT_CHARS)
    return buildPosting({ ...job, url, source: "jsonld" });

  const text = [page.main, page.article, page.body].find(
    (candidate) => realLength(candidate) >= MIN_TEXT_CHARS,
  );
  if (!text) {
    if (page.challenge) throw new JobReadError("blocked");
    if (LOGIN_PATH.test(url.pathname)) throw new JobReadError("login_required");
    throw new JobReadError("no_text");
  }
  return buildPosting({
    url,
    source: "page",
    title: job?.title ?? page.h1 ?? page.meta.get("og:title") ?? page.title,
    company: job?.company ?? page.meta.get("og:site_name"),
    location: job?.location,
    text,
    firstPostedAt: job?.firstPostedAt,
    updatedAt: job?.updatedAt,
    closesAt: job?.closesAt,
  });
}

async function attempt(read: () => Promise<JobPosting>): Promise<JobPosting | null> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof JobReadError) return null;
    throw error;
  }
}

async function readPage(
  target: Extract<JobTarget, { kind: "page" }>,
  deadline: number,
): Promise<JobPosting> {
  const { url, greenhouseId, ashbyId } = target;
  const tried = new Set<string>();
  // Greenhouse job ids are unique across boards, so a guessed board holding this id is right.
  const guess = greenhouseId ? companyLabel(url.hostname) : null;
  if (greenhouseId && guess) {
    tried.add(guess);
    const found = await attempt(() => readGreenhouse(guess, greenhouseId, url, deadline));
    if (found) return found;
  }

  const page = await safeFetch(url, { kind: "html", deadline });
  const token = greenhouseId ? greenhouseToken(page.body) : null;
  if (greenhouseId && token && !tried.has(token)) {
    const found = await attempt(() => readGreenhouse(token, greenhouseId, url, deadline));
    if (found) return found;
  }
  const org = ashbyId ? ashbyOrg(page.body) : null;
  if (ashbyId && org) {
    const found = await attempt(() => readAshby(org, ashbyId, url, deadline));
    if (found) return found;
  }
  return postingFromHtml(page.body, page.url);
}

export async function readJob(
  target: JobTarget,
  now = Date.now(),
  budgetMs = READ_BUDGET_MS,
): Promise<JobPosting> {
  const deadline = now + budgetMs;
  switch (target.kind) {
    case "greenhouse":
      return readGreenhouse(target.token, target.id, target.url, deadline);
    case "lever":
      return readLever(target.company, target.id, target.eu, target.url, deadline);
    case "ashby":
      return readAshby(target.org, target.id, target.url, deadline);
    case "workable":
      return readWorkable(target.account, target.shortcode, target.url, deadline);
    case "recruitee":
      return readRecruitee(target.company, target.slug, target.url, deadline);
    case "personio":
      return readPersonio(target.host, target.id, target.url, deadline);
    case "page":
      return readPage(target, deadline);
  }
}
