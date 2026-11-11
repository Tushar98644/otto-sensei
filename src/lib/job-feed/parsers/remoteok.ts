import { z } from "zod";
import { descriptionText } from "@/lib/jobs/jsonld";
import { toTime } from "@/lib/jobs/posting";
import {
  eachItem,
  epochSeconds,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  type RawJob,
} from "./shared";

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

// GET remoteok.com/api. The first item is its legal notice, not a job.
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
