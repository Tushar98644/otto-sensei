import type { JobPosting } from "@/lib/api/types";
import { readAshby, readGreenhouse, readLever } from "./boards";
import { JobReadError } from "./errors";
import { safeFetch } from "./fetch";
import { scanPage } from "./html";
import { findJsonLdJob } from "./jsonld";
import { buildPosting, MIN_TEXT_CHARS, realLength } from "./posting";
import { companyLabel, type JobTarget } from "./url";

// Server-only. Reads one job from a parsed link: the board's API when there is one, otherwise the
// page's JobPosting JSON-LD, otherwise the page's main text.

// One read may take up to three requests (a guessed board, the page, the board the page names).
const READ_BUDGET_MS = 20_000;

const GREENHOUSE_REFERENCE =
  /greenhouse\.io\/(?:embed\/job_(?:board|app)(?:\/js)?\?(?:[^"'\s<>]{0,200}?[&;])?for=([a-z0-9_-]{1,100})|([a-z0-9_-]{1,100})\/jobs\/\d)/i;
const ASHBY_REFERENCE = /jobs\.ashbyhq\.com\/([a-z0-9][a-z0-9._%-]{0,99})/i;
const LOGIN_PATH = /\/(?:log-?in|sign-?in|auth|sso)(?:\/|$)/i;

/** The Greenhouse board a career page embeds, from its script or links. */
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

/** A posting from a fetched page: JSON-LD first, then the page's own text. */
export function postingFromHtml(html: string, url: URL): JobPosting {
  const page = scanPage(html);
  const job = findJsonLdJob(page.jsonLd);
  if (job && realLength(job.text) >= MIN_TEXT_CHARS)
    return buildPosting({ ...job, url, source: "jsonld" });

  const text = [page.main, page.article, page.body].find(
    (candidate) => realLength(candidate) >= MIN_TEXT_CHARS,
  );
  if (!text) {
    // Bot check scripts sit on many ordinary pages too, so they only explain a page with no post.
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

// A board lookup that fails leaves the next way of reading the page to decide; the shared
// deadline still bounds the whole read.
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
  // Greenhouse job ids are unique across all boards, so a guessed board that has this id is the
  // right one. Most companies use their own name, which saves fetching their career page.
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

/** Reads the job a link points to. Every expected failure leaves as a JobReadError. */
export async function readJob(target: JobTarget, now = Date.now()): Promise<JobPosting> {
  const deadline = now + READ_BUDGET_MS;
  switch (target.kind) {
    case "greenhouse":
      return readGreenhouse(target.token, target.id, target.url, deadline);
    case "lever":
      return readLever(target.company, target.id, target.eu, target.url, deadline);
    case "ashby":
      return readAshby(target.org, target.id, target.url, deadline);
    case "page":
      return readPage(target, deadline);
  }
}
