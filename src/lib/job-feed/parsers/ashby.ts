import { z } from "zod";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  typeFrom,
  type RawJob,
} from "./shared";

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

// GET api.ashbyhq.com/posting-api/job-board/:org
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
