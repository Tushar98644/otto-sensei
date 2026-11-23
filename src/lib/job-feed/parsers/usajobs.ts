import { z } from "zod";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import type { EmploymentType } from "../types";
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

export const USAJOBS_PAGE_SIZE = 500;

const Named = z.array(z.object({ Name: nullishString })).nullish();
const Text = z.union([z.string(), z.array(z.string())]).nullish();

const Announcement = z.object({
  MatchedObjectId: z.union([z.string().min(1), z.number()]),
  MatchedObjectDescriptor: z.object({
    PositionTitle: z.string().trim().min(1),
    PositionURI: nullishString,
    PositionLocationDisplay: nullishString,
    PositionLocation: z.array(z.object({ LocationName: nullishString })).nullish(),
    OrganizationName: nullishString,
    DepartmentName: nullishString,
    PositionSchedule: Named,
    PositionOfferingType: Named,
    QualificationSummary: nullishString,
    PublicationStartDate: nullishString,
    ApplicationCloseDate: nullishString,
    UserArea: z
      .object({
        Details: z
          .object({
            JobSummary: nullishString,
            MajorDuties: Text,
            Education: nullishString,
            Requirements: nullishString,
            KeyRequirements: Text,
            RemoteIndicator: z.boolean().nullish(),
          })
          .nullish(),
      })
      .nullish(),
  }),
});

export type UsajobsPage = { jobs: RawJob[]; total: number; count: number };

const lines = (value: string | string[] | null | undefined) =>
  (Array.isArray(value) ? value : [value ?? ""]).map((part) => htmlToText(part)).filter(Boolean);

function kindOf(
  offering: readonly { Name?: string | null }[],
  schedule: readonly { Name?: string | null }[],
): EmploymentType | null {
  const offered = offering.map((entry) => entry.Name ?? "").join(" ");
  if (/\bintern/i.test(offered)) return "internship";
  if (/\b(?:temporary|term|seasonal)\b/i.test(offered)) return "temporary";
  return typeFrom(schedule[0]?.Name);
}

export function parseUsajobs(json: unknown): UsajobsPage {
  const page = z
    .object({
      SearchResult: z.object({
        SearchResultCountAll: z.number().nullish(),
        SearchResultItems: z.array(z.unknown()),
      }),
    })
    .safeParse(json);
  if (!page.success) throw new FeedShapeError("usajobs");
  const items = page.data.SearchResult.SearchResultItems;
  const jobs = eachItem(items, Announcement).flatMap((item): RawJob[] => {
    const job = item.MatchedObjectDescriptor;
    const url = httpsLink(job.PositionURI);
    if (!url || new URL(url).hostname !== "www.usajobs.gov") return [];
    const places = (job.PositionLocation ?? []).map((place) => place.LocationName);
    const location = joinLocation(
      places.length > 0 ? places.slice(0, 3) : [job.PositionLocationDisplay],
    );
    const details = job.UserArea?.Details;
    return [
      {
        externalId: String(item.MatchedObjectId),
        company:
          job.OrganizationName?.trim() || job.DepartmentName?.trim() || "U.S. federal government",
        title: job.PositionTitle,
        location,
        remote: details?.RemoteIndicator === true || REMOTE_WORDS.test(location),
        employmentType: kindOf(job.PositionOfferingType ?? [], job.PositionSchedule ?? []),
        postedAt: toTime(job.PublicationStartDate),
        validThrough: toTime(job.ApplicationCloseDate),
        url,
        text: [
          ...lines(details?.JobSummary),
          ...lines(details?.MajorDuties),
          ...lines(job.QualificationSummary),
          ...lines(details?.Education),
          ...lines(details?.Requirements),
          ...lines(details?.KeyRequirements),
        ].join("\n\n"),
      },
    ];
  });
  return { jobs, total: page.data.SearchResult.SearchResultCountAll ?? 0, count: items.length };
}
