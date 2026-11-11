import { z } from "zod";
import { decodeEntities, htmlToText } from "@/lib/jobs/html";
import { descriptionText } from "@/lib/jobs/jsonld";
import { toTime } from "@/lib/jobs/posting";
import type { EmploymentType, Seniority } from "./types";

// Read defensively: an unreadable field is dropped; only a job with no id, title or link is
// skipped.

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
  text: string;
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

// LinkedIn-style levels (Workable, Recruitee) and Personio's four; the title's level wins over
// these.
const BOARD_LEVELS: Record<string, Seniority> = {
  internship: "intern",
  student: "intern",
  student_college: "intern",
  "entry level": "junior",
  entry_level: "junior",
  "entry-level": "junior",
  associate: "junior",
  director: "director",
  executive: "director",
  manager: "lead",
};

const levelFrom = (value: string | null | undefined): Seniority | null =>
  BOARD_LEVELS[(value ?? "").trim().toLowerCase()] ?? null;

// "Athens, Attica, Greece": one place, its parts from the narrowest.
function placeName(parts: readonly (string | null | undefined)[]): string {
  const clean = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return [...new Set(clean)].join(", ");
}

const WorkableLocation = z.object({
  city: nullishString,
  region: nullishString,
  country: nullishString,
  hidden: z.boolean().nullish(),
});

const WorkableJob = z.object({
  shortcode: z.string().min(1),
  title: z.string().min(1),
  employment_type: nullishString,
  telecommuting: z.boolean().nullish(),
  published_on: nullishString,
  created_at: nullishString,
  city: nullishString,
  state: nullishString,
  country: nullishString,
  experience: nullishString,
  locations: z.array(z.unknown()).nullish(),
  description: nullishString,
});

/** GET apply.workable.com/api/v1/widget/accounts/:account?details=true */
// Its own links don't name the account, so the account's job page is used: it can be read again.
export function parseWorkable(json: unknown, company: string, account: string): RawJob[] {
  const board = z.object({ jobs: z.array(z.unknown()) }).safeParse(json);
  if (!board.success) throw new FeedShapeError("workable");
  return eachItem(board.data.jobs, WorkableJob).flatMap((job) => {
    const url = httpsLink(
      `https://apply.workable.com/${encodeURIComponent(account)}/j/${encodeURIComponent(job.shortcode)}/`,
    );
    if (!url) return [];
    const places = eachItem(job.locations ?? [], WorkableLocation)
      .filter((place) => place.hidden !== true)
      .map((place) => placeName([place.city, place.region, place.country]));
    if (places.length === 0) places.push(placeName([job.city, job.state, job.country]));
    const remote = job.telecommuting === true || places.some((place) => REMOTE_WORDS.test(place));
    return [
      {
        externalId: job.shortcode,
        company,
        title: job.title.trim(),
        location: joinLocation([remote ? "Remote" : null, ...places.slice(0, 3)]),
        remote,
        employmentType: typeFrom(job.employment_type),
        postedAt: toTime(job.published_on) ?? toTime(job.created_at),
        validThrough: null,
        url,
        text: htmlToText(job.description ?? ""),
        seniority: levelFrom(job.experience),
      },
    ];
  });
}

// "2026-11-06 17:01:19 UTC": not a format every engine's Date.parse reads.
function recruiteeTime(value: string | null | undefined): number | null {
  const iso = value
    ?.trim()
    .replace(" ", "T")
    .replace(/\s*UTC$/, "Z");
  return toTime(iso);
}

const RecruiteeOffer = z.object({
  id: z.union([z.number(), z.string()]),
  slug: nullishString,
  title: z.string().min(1),
  status: nullishString,
  careers_url: nullishString,
  location: nullishString,
  remote: z.boolean().nullish(),
  hybrid: z.boolean().nullish(),
  employment_type_code: nullishString,
  experience_code: nullishString,
  published_at: nullishString,
  created_at: nullishString,
  close_at: nullishString,
  description: nullishString,
  requirements: nullishString,
});

export type RecruiteeOfferShape = z.infer<typeof RecruiteeOffer>;

// Links to the offer on recruitee.com, which, unlike the careers page, the API can read again.
export function recruiteeJob(offer: unknown, company: string, account: string): RawJob | null {
  const parsed = RecruiteeOffer.safeParse(offer);
  if (!parsed.success) return null;
  const job = parsed.data;
  const url = job.slug
    ? httpsLink(
        `https://${encodeURIComponent(account)}.recruitee.com/o/${encodeURIComponent(job.slug)}`,
      )
    : httpsLink(job.careers_url);
  if (!url || (job.status && job.status !== "published")) return null;
  const place = job.location?.trim() ?? "";
  const remote = job.remote === true || REMOTE_WORDS.test(place);
  return {
    externalId: String(job.id),
    company,
    title: job.title.trim(),
    location: joinLocation([remote ? "Remote" : job.hybrid ? "Hybrid" : null, place]),
    remote,
    // "fulltime_permanent", "parttime_permanent", "internship", "freelance", "fulltime_fixed_term"
    employmentType: /fixed_term/.test(job.employment_type_code ?? "")
      ? "contract"
      : typeFrom(job.employment_type_code),
    postedAt: recruiteeTime(job.published_at) ?? recruiteeTime(job.created_at),
    validThrough: recruiteeTime(job.close_at),
    url,
    text: [htmlToText(job.description ?? ""), htmlToText(job.requirements ?? "")]
      .filter(Boolean)
      .join("\n\n"),
    seniority: levelFrom(job.experience_code),
  };
}

/** GET :account.recruitee.com/api/offers/ */
export function parseRecruitee(json: unknown, company: string, account: string): RawJob[] {
  const board = z.object({ offers: z.array(z.unknown()) }).safeParse(json);
  if (!board.success) throw new FeedShapeError("recruitee");
  return board.data.offers.flatMap((offer) => recruiteeJob(offer, company, account) ?? []);
}

// Small flat XML with no attributes we need, so a few patterns read it without an XML library.
function xmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return cdata ? cdata[1]! : decodeEntities(raw);
}

function xmlField(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return match ? xmlText(match[1]!).trim() : null;
}

const PERSONIO_TYPES: Record<string, EmploymentType> = {
  intern: "internship",
  trainee: "internship",
  working_student: "part_time",
  freelance: "contract",
  temporary: "temporary",
};

/** GET :company.jobs.personio.de/xml?language=en. Each job's page is /job/:id on the same host. */
export function parsePersonio(xml: string, company: string, host: string): RawJob[] {
  if (!/<workzag-jobs[\s>]/.test(xml)) throw new FeedShapeError("personio");
  const positions = xml.match(/<position>[\s\S]*?<\/position>/g) ?? [];
  return positions.flatMap((block): RawJob[] => {
    // The descriptions have <name> fields of their own; the job's fields sit outside them.
    const descriptions = /<jobDescriptions>([\s\S]*?)<\/jobDescriptions>/.exec(block)?.[1] ?? "";
    const fields = block.replace(descriptions, "");
    const id = xmlField(fields, "id");
    const title = xmlField(fields, "name");
    if (!id || !/^\d{1,20}$/.test(id) || !title) return [];
    const url = httpsLink(`https://${host}/job/${id}?language=en`);
    if (!url) return [];
    const offices = /<additionalOffices>([\s\S]*?)<\/additionalOffices>/.exec(fields)?.[1] ?? "";
    const place = joinLocation([
      xmlField(fields.replace(offices, ""), "office"),
      ...[...offices.matchAll(/<office>([\s\S]*?)<\/office>/g)]
        .slice(0, 2)
        .map((m) => xmlText(m[1]!)),
    ]);
    const text = [...descriptions.matchAll(/<jobDescription>([\s\S]*?)<\/jobDescription>/g)]
      .map((section) => {
        const heading = xmlField(section[1]!, "name");
        const body = htmlToText(xmlField(section[1]!, "value") ?? "");
        return [heading, body].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
    const kind = xmlField(fields, "employmentType")?.toLowerCase() ?? "";
    return [
      {
        externalId: id,
        company,
        title,
        location: place,
        remote: REMOTE_WORDS.test(place),
        employmentType: PERSONIO_TYPES[kind] ?? typeFrom(xmlField(fields, "schedule")),
        postedAt: toTime(xmlField(fields, "createdAt")),
        validThrough: null,
        url,
        text,
        seniority: levelFrom(xmlField(fields, "seniority")),
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

const JOBICY_LEVELS: Record<string, Seniority> = {
  entry: "junior",
  junior: "junior",
  midweight: "mid",
  senior: "senior",
  manager: "lead",
  director: "director",
  executive: "director",
};

// Jobicy's lists come as arrays from /api/jobs and as strings from its older v2 path.
const listOrString = z.union([z.array(z.string()), z.string()]).nullish();
const firstOf = (value: string[] | string | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

const JobicyJob = z.object({
  id: z.union([z.number(), z.string()]),
  url: nullishString,
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  jobType: listOrString,
  jobGeo: nullishString,
  jobLevel: nullishString,
  jobExcerpt: nullishString,
  jobDescription: nullishString,
  pubDate: nullishString,
});

export type JobicyPage = { jobs: RawJob[]; nextCursor: string | null };

/** GET jobicy.com/api/jobs?count=100&cursor=… (the last 7 days, newest first). */
export function parseJobicy(json: unknown): JobicyPage {
  const page = z
    .object({
      jobs: z.array(z.unknown()),
      nextCursor: z.string().nullish(),
      hasMore: z.union([z.boolean(), z.string()]).nullish(),
    })
    .safeParse(json);
  if (!page.success) throw new FeedShapeError("jobicy");
  const jobs = eachItem(page.data.jobs, JobicyJob).flatMap((job): RawJob[] => {
    // Its terms: every Apply goes to the job's own Jobicy page.
    const url = httpsLink(job.url);
    if (!url) return [];
    const geo = job.jobGeo?.trim();
    return [
      {
        externalId: String(job.id),
        company: job.companyName.trim(),
        title: job.jobTitle.trim(),
        location: joinLocation(["Remote", geo && !/^anywhere$/i.test(geo) ? geo : null]),
        remote: true,
        employmentType: typeFrom(firstOf(job.jobType)),
        postedAt: toTime(job.pubDate),
        validThrough: null,
        url,
        text: descriptionText(job.jobDescription ?? job.jobExcerpt ?? ""),
        seniority: JOBICY_LEVELS[(job.jobLevel ?? "").trim().toLowerCase()] ?? null,
      },
    ];
  });
  const more = page.data.hasMore === true || page.data.hasMore === "True";
  return { jobs, nextCursor: more ? page.data.nextCursor || null : null };
}
