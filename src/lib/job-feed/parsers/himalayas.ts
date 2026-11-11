import { z } from "zod";
import { descriptionText } from "@/lib/jobs/jsonld";
import type { Seniority } from "../types";
import {
  eachItem,
  epochSeconds,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  typeFrom,
  type RawJob,
} from "./shared";

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

// GET himalayas.app/jobs/api?limit=20&cursor=…
export function parseHimalayas(json: unknown): HimalayasPage {
  const page = z
    .object({ jobs: z.array(z.unknown()), nextCursor: z.string().nullish() })
    .safeParse(json);
  if (!page.success) throw new FeedShapeError("himalayas");
  const jobs = eachItem(page.data.jobs, HimalayasJob).flatMap((job): RawJob[] => {
    // Its terms ask for every Apply to use applicationLink, unchanged.
    const url = httpsLink(job.applicationLink) ?? httpsLink(job.guid);
    if (!url) return [];
    const level = job.seniority
      ?.map((entry) => HIMALAYAS_LEVELS[entry.toLowerCase()])
      .find(Boolean);
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
