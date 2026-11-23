import { z } from "zod";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  REMOTE_WORDS,
  typeFrom,
  type RawJob,
} from "./shared";

const PinpointPosting = z.object({
  id: z.union([z.string().min(1), z.number()]),
  title: z.string().min(1),
  url: nullishString,
  description: nullishString,
  key_responsibilities: nullishString,
  skills_knowledge_expertise: nullishString,
  benefits: nullishString,
  employment_type: nullishString,
  workplace_type: nullishString,
  deadline_at: nullishString,
  location: z
    .object({ name: nullishString, city: nullishString, province: nullishString })
    .nullish(),
});

// The feed has no posted date, so a job counts from our first read of it.
export function parsePinpoint(json: unknown, company: string, host: string): RawJob[] {
  const feed = z.object({ data: z.array(z.unknown()) }).safeParse(json);
  if (!feed.success) throw new FeedShapeError("pinpoint");
  return eachItem(feed.data.data, PinpointPosting).flatMap((job) => {
    const url = httpsLink(job.url);
    if (!url || new URL(url).hostname !== host) return [];
    const place = job.location;
    const town = [place?.city?.trim(), place?.province?.trim()].filter(Boolean).join(", ");
    const where = town || place?.name?.trim() || "";
    const workplace = job.workplace_type?.toLowerCase();
    const remote = workplace === "remote" || REMOTE_WORDS.test(where);
    return [
      {
        externalId: String(job.id),
        company,
        title: job.title.trim(),
        location: joinLocation([
          remote && !REMOTE_WORDS.test(where) ? "Remote" : workplace === "hybrid" ? "Hybrid" : null,
          where,
        ]),
        remote,
        employmentType: typeFrom(job.employment_type),
        postedAt: null,
        validThrough: toTime(job.deadline_at),
        url,
        text: [
          job.description,
          job.key_responsibilities,
          job.skills_knowledge_expertise,
          job.benefits,
        ]
          .map((part) => htmlToText(part ?? ""))
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
  });
}
