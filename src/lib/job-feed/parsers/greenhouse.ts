import { z } from "zod";
import { decodeEntities, htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  nullishString,
  REMOTE_WORDS,
  type RawJob,
} from "./shared";

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
        postedAt: toTime(job.first_published) ?? toTime(job.updated_at),
        validThrough: toTime(job.application_deadline),
        url,
        // The content arrives HTML-escaped once more: "&lt;p&gt;".
        text: htmlToText(decodeEntities(job.content ?? "")),
      },
    ];
  });
}
