import { z } from "zod";
import { descriptionText } from "@/lib/jobs/jsonld";
import { toTime } from "@/lib/jobs/posting";
import type { Seniority } from "../types";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  typeFrom,
  type RawJob,
} from "./shared";

const JOBICY_LEVELS: Record<string, Seniority> = {
  entry: "junior",
  junior: "junior",
  midweight: "mid",
  senior: "senior",
  manager: "lead",
  director: "director",
  executive: "director",
};

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
