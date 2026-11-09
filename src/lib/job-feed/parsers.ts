import { z } from "zod";
import { decodeEntities, htmlToText } from "@/lib/jobs/html";
import { descriptionText } from "@/lib/jobs/jsonld";
import { toTime } from "@/lib/jobs/posting";
import type { EmploymentType, Seniority } from "./types";

// Server-only. Each source's JSON, as its public API returned it in November 2026, turned into one
// shape. Every field is read defensively: a job with a field we don't understand is kept without
// it, and only a job with no id, title or link is dropped.

export type RawJob = {
  externalId: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  // Epoch ms, or null when the source doesn't say.
  postedAt: number | null;
  validThrough: number | null;
  url: string;
  // Plain text of the post.
  text: string;
  // Some feeds tag the level themselves.
  seniority?: Seniority | null;
};

export class FeedShapeError extends Error {
  constructor(source: string) {
    super(`Unexpected ${source} response`);
    this.name = "FeedShapeError";
  }
}

const nullishString = z.string().nullish();

function httpsLink(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function joinLocation(parts: readonly (string | null | undefined)[]): string {
  const clean = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return [...new Set(clean)].join(" · ");
}

const REMOTE_WORDS = /\b(?:remote|anywhere|distributed|work from home)\b/i;

// Lists of items where one bad entry must not lose the rest.
function eachItem<T>(items: readonly unknown[], schema: z.ZodType<T>): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function typeFrom(value: string | null | undefined): EmploymentType | null {
  const text = (value ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!text) return null;
  if (/intern/.test(text)) return "internship";
  if (/parttime/.test(text)) return "part_time";
  if (/contract|freelance/.test(text)) return "contract";
  if (/temp/.test(text)) return "temporary";
  if (/fulltime|permanent|regular/.test(text)) return "full_time";
  return null;
}

const GreenhouseJob = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string().min(1),
  absolute_url: nullishString,
  location: z.object({ name: nullishString }).nullish(),
  content: nullishString,
  first_published: nullishString,
  updated_at: nullishString,
  application_deadline: nullishString,
});

/** GET boards-api.greenhouse.io/v1/boards/:token/jobs?content=true */
export function parseGreenhouse(json: unknown, company: string): RawJob[] {
  const board = z.object({ jobs: z.array(z.unknown()) }).safeParse(json);
  if (!board.success) throw new FeedShapeError("greenhouse");
  return eachItem(board.data.jobs, GreenhouseJob).flatMap((job) => {
    const url = httpsLink(job.absolute_url);
    if (!url) return [];
    const location = job.location?.name?.trim() ?? "";
    return [
      {
        externalId: String(job.id),
        company,
        title: job.title.trim(),
        location,
        remote: REMOTE_WORDS.test(location),
        employmentType: null,
        // first_published is when it went up; updated_at is only its last edit.
        postedAt: toTime(job.first_published) ?? toTime(job.updated_at),
        validThrough: toTime(job.application_deadline),
        url,
        // The content arrives HTML-escaped once more: "&lt;p&gt;".
        text: htmlToText(decodeEntities(job.content ?? "")),
      },
    ];
  });
}

const LeverPosting = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  hostedUrl: nullishString,
  categories: z
    .object({
      location: nullishString,
      allLocations: z.array(z.string()).nullish(),
      commitment: nullishString,
    })
    .nullish(),
  workplaceType: nullishString,
  description: nullishString,
  descriptionPlain: nullishString,
  lists: z.array(z.object({ text: nullishString, content: nullishString })).nullish(),
  additional: nullishString,
  additionalPlain: nullishString,
  createdAt: z.number().nullish(),
});

/** GET api.lever.co/v0/postings/:company?mode=json */
export function parseLever(json: unknown, company: string): RawJob[] {
  if (!Array.isArray(json)) throw new FeedShapeError("lever");
  return eachItem(json, LeverPosting).flatMap((job) => {
    const url = httpsLink(job.hostedUrl);
    if (!url) return [];
    const sections = [
      htmlToText(job.description ?? "") || job.descriptionPlain?.trim(),
      ...(job.lists ?? []).map((section) =>
        [section.text?.trim(), htmlToText(section.content ?? "")].filter(Boolean).join("\n"),
      ),
      htmlToText(job.additional ?? "") || job.additionalPlain?.trim(),
    ];
    const place = job.categories?.location || job.categories?.allLocations?.join(", ");
    const workplace = job.workplaceType?.toLowerCase();
    const remote = workplace === "remote" || REMOTE_WORDS.test(place ?? "");
    return [
      {
        externalId: job.id.toLowerCase(),
        company,
        title: job.text.trim(),
        location: joinLocation([
          place,
          workplace === "remote" ? "Remote" : workplace === "hybrid" ? "Hybrid" : null,
        ]),
        remote,
        employmentType: typeFrom(job.categories?.commitment),
        postedAt: toTime(job.createdAt),
        validThrough: null,
        url,
        text: sections.filter(Boolean).join("\n\n"),
      },
    ];
  });
}

const AshbyJob = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  location: nullishString,
  secondaryLocations: z.array(z.object({ location: nullishString })).nullish(),
  isRemote: z.boolean().nullish(),
  isListed: z.boolean().nullish(),
  workplaceType: nullishString,
  employmentType: nullishString,
  publishedAt: nullishString,
  jobUrl: nullishString,
  descriptionHtml: nullishString,
  descriptionPlain: nullishString,
});

/** GET api.ashbyhq.com/posting-api/job-board/:org */
export function parseAshby(json: unknown, company: string): RawJob[] {
  const board = z.object({ jobs: z.array(z.unknown()) }).safeParse(json);
  if (!board.success) throw new FeedShapeError("ashby");
  return eachItem(board.data.jobs, AshbyJob).flatMap((job) => {
    const url = httpsLink(job.jobUrl);
    // Unlisted jobs are only for people the company sends the link to.
    if (!url || job.isListed === false) return [];
    const workplace = job.workplaceType?.toLowerCase();
    const remote = job.isRemote === true || workplace === "remote";
    return [
      {
        externalId: job.id.toLowerCase(),
        company,
        title: job.title.trim(),
        location: joinLocation([
          remote ? "Remote" : workplace === "hybrid" ? "Hybrid" : null,
          job.location,
          ...(job.secondaryLocations ?? []).slice(0, 2).map((entry) => entry.location),
        ]),
        remote,
        employmentType: typeFrom(job.employmentType),
        postedAt: toTime(job.publishedAt),
        validThrough: null,
        url,
        text: htmlToText(job.descriptionHtml ?? "") || (job.descriptionPlain ?? "").trim(),
      },
    ];
  });
}

const epochSeconds = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? toTime(value * 1000) : null;

const HIMALAYAS_LEVELS: Record<string, Seniority> = {
  "entry-level": "junior",
  "mid-level": "mid",
  senior: "senior",
  manager: "lead",
  director: "director",
  executive: "director",
};

const HimalayasJob = z.object({
  guid: z.string().min(1),
  title: z.string().min(1),
  companyName: z.string().min(1),
  employmentType: nullishString,
  seniority: z.array(z.string()).nullish(),
  locationRestrictions: z.array(z.string()).nullish(),
  description: nullishString,
  excerpt: nullishString,
  pubDate: z.number().nullish(),
  expiryDate: z.number().nullish(),
  applicationLink: nullishString,
});

export type HimalayasPage = { jobs: RawJob[]; nextCursor: string | null };

/** GET himalayas.app/jobs/api?limit=20&cursor=… */
export function parseHimalayas(json: unknown): HimalayasPage {
  const page = z
    .object({ jobs: z.array(z.unknown()), nextCursor: z.string().nullish() })
    .safeParse(json);
  if (!page.success) throw new FeedShapeError("himalayas");
  const jobs = eachItem(page.data.jobs, HimalayasJob).flatMap((job): RawJob[] => {
    // Its terms ask for every Apply to use applicationLink, unchanged.
    const url = httpsLink(job.applicationLink) ?? httpsLink(job.guid);
    if (!url) return [];
    const level = job.seniority?.map((entry) => HIMALAYAS_LEVELS[entry.toLowerCase()]).find(Boolean);
    return [
      {
        externalId: job.guid,
        company: job.companyName.trim(),
        title: job.title.trim(),
        location: joinLocation(["Remote", ...(job.locationRestrictions ?? []).slice(0, 4)]),
        remote: true,
        employmentType: typeFrom(job.employmentType),
        postedAt: epochSeconds(job.pubDate),
        validThrough: epochSeconds(job.expiryDate),
        url,
        text: descriptionText(job.description ?? job.excerpt ?? ""),
        seniority: level ?? null,
      },
    ];
  });
  return { jobs, nextCursor: page.data.nextCursor || null };
}

const RemoteOkJob = z.object({
  id: z.union([z.string(), z.number()]),
  epoch: z.number().nullish(),
  date: nullishString,
  company: z.string().min(1),
  position: z.string().min(1),
  description: nullishString,
  location: nullishString,
  url: nullishString,
});

/** GET remoteok.com/api. The first item is its legal notice, not a job. */
export function parseRemoteOk(json: unknown): RawJob[] {
  if (!Array.isArray(json)) throw new FeedShapeError("remoteok");
  return eachItem(json, RemoteOkJob).flatMap((job) => {
    // Its terms ask for a followed link back to the job's own Remote OK page.
    const url = httpsLink(job.url);
    if (!url) return [];
    return [
      {
        externalId: String(job.id),
        company: job.company.trim(),
        title: job.position.trim(),
        location: joinLocation(["Remote", job.location]),
        remote: true,
        employmentType: null,
        postedAt: epochSeconds(job.epoch) ?? toTime(job.date),
        validThrough: null,
        url,
        text: descriptionText(job.description ?? ""),
      },
    ];
  });
}
