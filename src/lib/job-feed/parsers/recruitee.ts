import { z } from "zod";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import {
  FeedShapeError,
  httpsLink,
  joinLocation,
  levelFrom,
  nullishString,
  REMOTE_WORDS,
  typeFrom,
  type RawJob,
} from "./shared";

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

export function parseRecruitee(json: unknown, company: string, account: string): RawJob[] {
  const board = z.object({ offers: z.array(z.unknown()) }).safeParse(json);
  if (!board.success) throw new FeedShapeError("recruitee");
  return board.data.offers.flatMap((offer) => recruiteeJob(offer, company, account) ?? []);
}
