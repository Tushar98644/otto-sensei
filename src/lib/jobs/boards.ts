import { z } from "zod";
import type { JobPosting } from "@/lib/api/types";
import { parsePersonio, parseWorkable, recruiteeJob } from "@/lib/job-feed/parsers";
import { JobReadError } from "./errors";
import { safeFetch } from "./fetch";
import { decodeEntities, htmlToText, scanPage } from "./html";
import { findJsonLdJob } from "./jsonld";
import { buildPosting, humanizeSlug, toTime } from "./posting";
import { greenhouseQuestions } from "./questions";

export const ASHBY_BOARD_MAX_BYTES = 24 * 1024 * 1024;

const GreenhouseJobSchema = z.object({
  title: z.string(),
  company_name: z.string().nullish(),
  absolute_url: z.string().nullish(),
  location: z.object({ name: z.string().nullish() }).nullish(),
  content: z.string().nullish(),
  first_published: z.string().nullish(),
  updated_at: z.string().nullish(),
  application_deadline: z.string().nullish(),
  questions: z.unknown(),
});

const LeverPostingSchema = z.object({
  text: z.string(),
  hostedUrl: z.string().nullish(),
  categories: z
    .object({ location: z.string().nullish(), allLocations: z.array(z.string()).nullish() })
    .nullish(),
  workplaceType: z.string().nullish(),
  description: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
  lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() })).nullish(),
  additional: z.string().nullish(),
  additionalPlain: z.string().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
});

const AshbyBoardSchema = z.object({ jobs: z.array(z.unknown()) });
const AshbyJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string().nullish(),
  secondaryLocations: z.array(z.object({ location: z.string().nullish() })).nullish(),
  isRemote: z.boolean().nullish(),
  workplaceType: z.string().nullish(),
  publishedAt: z.string().nullish(),
  jobUrl: z.string().nullish(),
  descriptionHtml: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
});

function shapeError(board: string): JobReadError {
  return new JobReadError("unreachable", { detail: `${board}_shape` });
}

function parseJson(body: string, board: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw shapeError(board);
  }
}

function linkOr(value: string | null | undefined, fallback: URL): string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : fallback.toString();
  } catch {
    return fallback.toString();
  }
}

function joinLocation(parts: readonly (string | null | undefined)[]): string {
  const clean = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return [...new Set(clean)].join(" · ");
}

function workplace(type: string | null | undefined): string | null {
  const value = type?.toLowerCase();
  if (value === "remote") return "Remote";
  if (value === "hybrid") return "Hybrid";
  return null;
}

export function greenhousePosting(json: unknown, token: string, url: URL): JobPosting {
  const parsed = GreenhouseJobSchema.safeParse(json);
  if (!parsed.success) throw shapeError("greenhouse");
  const job = parsed.data;
  const posting = buildPosting({
    url: linkOr(job.absolute_url, url),
    source: "greenhouse",
    title: job.title,
    company: job.company_name || humanizeSlug(token),
    location: job.location?.name,
    text: htmlToText(decodeEntities(job.content ?? "")),
    firstPostedAt: toTime(job.first_published),
    updatedAt: toTime(job.updated_at),
    closesAt: toTime(job.application_deadline),
  });
  const questions = greenhouseQuestions(job.questions);
  return questions.length > 0 ? { ...posting, questions } : posting;
}

export function leverPosting(json: unknown, company: string, url: URL): JobPosting {
  const parsed = LeverPostingSchema.safeParse(json);
  if (!parsed.success) throw shapeError("lever");
  const job = parsed.data;
  const sections = [
    htmlToText(job.description ?? "") || job.descriptionPlain?.trim(),
    ...(job.lists ?? []).map((section) =>
      [section.text?.trim(), htmlToText(section.content ?? "")].filter(Boolean).join("\n"),
    ),
    htmlToText(job.additional ?? "") || job.additionalPlain?.trim(),
  ];
  const place = job.categories?.location || job.categories?.allLocations?.join(", ");
  return buildPosting({
    url: linkOr(job.hostedUrl, url),
    source: "lever",
    title: job.text,
    company: humanizeSlug(company),
    location: joinLocation([place, workplace(job.workplaceType)]),
    text: sections.filter(Boolean).join("\n\n"),
    firstPostedAt: toTime(job.createdAt),
    updatedAt: toTime(job.updatedAt),
  });
}

export function ashbyPosting(json: unknown, org: string, id: string, url: URL): JobPosting {
  const board = AshbyBoardSchema.safeParse(json);
  if (!board.success) throw shapeError("ashby");
  const raw = board.data.jobs.find(
    (job) =>
      typeof job === "object" && job !== null && "id" in job && String(job.id).toLowerCase() === id,
  );
  if (raw === undefined) throw new JobReadError("not_found");
  const parsed = AshbyJobSchema.safeParse(raw);
  if (!parsed.success) throw shapeError("ashby");
  const job = parsed.data;
  return buildPosting({
    url: linkOr(job.jobUrl, url),
    source: "ashby",
    title: job.title,
    company: humanizeSlug(org),
    location: joinLocation([
      job.isRemote ? "Remote" : workplace(job.workplaceType),
      job.location,
      ...(job.secondaryLocations ?? []).slice(0, 2).map((entry) => entry.location),
    ]),
    text: htmlToText(job.descriptionHtml ?? "") || (job.descriptionPlain ?? ""),
    firstPostedAt: toTime(job.publishedAt),
  });
}

export async function readGreenhouse(
  token: string,
  id: string,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  const api = new URL(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${id}`,
  );
  api.searchParams.set("questions", "true");
  const res = await safeFetch(api, { kind: "json", deadline });
  return greenhousePosting(parseJson(res.body, "greenhouse"), token, url);
}

export async function readLever(
  company: string,
  id: string,
  eu: boolean,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  const host = eu ? "api.eu.lever.co" : "api.lever.co";
  const api = new URL(`https://${host}/v0/postings/${encodeURIComponent(company)}/${id}`);
  const res = await safeFetch(api, { kind: "json", deadline });
  return leverPosting(parseJson(res.body, "lever"), company, url);
}

export async function readAshby(
  org: string,
  id: string,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  const page = new URL(`https://jobs.ashbyhq.com/${encodeURIComponent(org)}/${id}`);
  try {
    const res = await safeFetch(page, { kind: "html", deadline });
    const job = findJsonLdJob(scanPage(res.body).jsonLd);
    if (job) return buildPosting({ ...job, url: page, source: "ashby" });
  } catch (error) {
    if (!(error instanceof JobReadError)) throw error;
  }
  const api = new URL(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}`);
  const res = await safeFetch(api, { kind: "json", deadline, maxBytes: ASHBY_BOARD_MAX_BYTES });
  return ashbyPosting(parseJson(res.body, "ashby"), org, id, url);
}

export const ACCOUNT_FEED_MAX_BYTES = 8 * 1024 * 1024;

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function workablePosting(
  json: unknown,
  account: string,
  shortcode: string,
  url: URL,
): JobPosting {
  let jobs;
  try {
    jobs = parseWorkable(json, "", account);
  } catch {
    throw shapeError("workable");
  }
  const job = jobs.find((entry) => entry.externalId.toLowerCase() === shortcode.toLowerCase());
  if (!job) throw new JobReadError("not_found");
  const name = z.object({ name: z.string().nullish() }).safeParse(json);
  return buildPosting({
    url: linkOr(job.url, url),
    source: "workable",
    title: job.title,
    company: (name.success && name.data.name) || humanizeSlug(account),
    location: job.location,
    text: job.text,
    firstPostedAt: job.postedAt,
  });
}

export function recruiteePosting(json: unknown, company: string, url: URL): JobPosting {
  const parsed = z.object({ offer: z.unknown() }).safeParse(json);
  const job = parsed.success ? recruiteeJob(parsed.data.offer, "", company) : null;
  if (!job) throw shapeError("recruitee");
  const name = z.object({ company_name: z.string().nullish() }).safeParse(parsed.data?.offer);
  return buildPosting({
    url: linkOr(job.url, url),
    source: "recruitee",
    title: job.title,
    company: (name.success && name.data.company_name) || humanizeSlug(company),
    location: job.location,
    text: job.text,
    firstPostedAt: job.postedAt,
    closesAt: job.validThrough,
  });
}

export function personioPosting(xml: string, host: string, id: string, url: URL): JobPosting {
  let jobs;
  try {
    jobs = parsePersonio(xml, "", host);
  } catch {
    throw shapeError("personio");
  }
  const job = jobs.find((entry) => entry.externalId === id);
  if (!job) throw new JobReadError("not_found");
  const company = /<subcompany>([^<]{1,200})<\/subcompany>/.exec(xml)?.[1]?.trim();
  return buildPosting({
    url: linkOr(job.url, url),
    source: "personio",
    title: job.title,
    company: company ? decodeEntities(company) : humanizeSlug(host.split(".")[0] ?? ""),
    location: job.location,
    text: job.text,
    firstPostedAt: job.postedAt,
  });
}

export async function readWorkable(
  account: string,
  shortcode: string,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  const api = new URL(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(account)}?details=true`,
  );
  const res = await safeFetch(api, { kind: "json", deadline, maxBytes: ACCOUNT_FEED_MAX_BYTES });
  return workablePosting(parseJson(res.body, "workable"), account, shortcode, url);
}

export async function readRecruitee(
  company: string,
  offer: string,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  if (!HOST_LABEL.test(company)) throw new JobReadError("invalid_url");
  const api = new URL(`https://${company}.recruitee.com/api/offers/${encodeURIComponent(offer)}`);
  const res = await safeFetch(api, { kind: "json", deadline });
  return recruiteePosting(parseJson(res.body, "recruitee"), company, url);
}

export async function readPersonio(
  host: string,
  id: string,
  url: URL,
  deadline: number,
): Promise<JobPosting> {
  const feed = new URL(`https://${host}/xml?language=en`);
  const res = await safeFetch(feed, { kind: "xml", deadline, maxBytes: ACCOUNT_FEED_MAX_BYTES });
  return personioPosting(res.body, host, id, url);
}
