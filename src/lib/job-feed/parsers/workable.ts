import { z } from "zod";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  joinLocation,
  levelFrom,
  nullishString,
  REMOTE_WORDS,
  typeFrom,
  type RawJob,
} from "./shared";

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
