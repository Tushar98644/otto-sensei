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

const Place = z.object({ name: nullishString }).nullish();

const GemJob = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  absolute_url: nullishString,
  location: Place,
  location_type: nullishString,
  offices: z.array(z.object({ location: Place })).nullish(),
  employment_type: nullishString,
  first_published_at: nullishString,
  created_at: nullishString,
  content: nullishString,
  content_plain: nullishString,
});

export function parseGem(json: unknown, company: string): RawJob[] {
  const board = z.array(z.unknown()).safeParse(json);
  if (!board.success) throw new FeedShapeError("gem");
  return eachItem(board.data, GemJob).flatMap((job) => {
    const url = httpsLink(job.absolute_url);
    if (!url) return [];
    const places = [
      job.location?.name,
      ...(job.offices ?? []).map((office) => office.location?.name),
    ].filter((place): place is string => Boolean(place?.trim()));
    const kind = job.location_type?.toLowerCase();
    const remote = kind === "remote" || places.some((place) => REMOTE_WORDS.test(place));
    const named = places.some((place) => REMOTE_WORDS.test(place));
    return [
      {
        externalId: job.id,
        company,
        title: job.title.trim(),
        location: joinLocation([
          remote && !named ? "Remote" : kind === "hybrid" ? "Hybrid" : null,
          ...[...new Set(places)].slice(0, 3),
        ]),
        remote,
        employmentType: typeFrom(job.employment_type),
        postedAt: toTime(job.first_published_at) ?? toTime(job.created_at),
        validThrough: null,
        url,
        text: htmlToText(job.content ?? "") || (job.content_plain ?? "").trim(),
      },
    ];
  });
}
