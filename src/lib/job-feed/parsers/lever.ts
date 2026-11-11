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

// GET api.lever.co/v0/postings/:company?mode=json
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
