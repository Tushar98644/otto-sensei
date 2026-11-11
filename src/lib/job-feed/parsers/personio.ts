import { decodeEntities, htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import type { EmploymentType } from "../types";
import {
  FeedShapeError,
  httpsLink,
  joinLocation,
  levelFrom,
  REMOTE_WORDS,
  typeFrom,
  type RawJob,
} from "./shared";

// Small flat XML with no attributes we need, so a few patterns read it without an XML library.
function xmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return cdata ? cdata[1]! : decodeEntities(raw);
}

function xmlField(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return match ? xmlText(match[1]!).trim() : null;
}

const PERSONIO_TYPES: Record<string, EmploymentType> = {
  intern: "internship",
  trainee: "internship",
  working_student: "part_time",
  freelance: "contract",
  temporary: "temporary",
};

// GET :company.jobs.personio.de/xml?language=en. Each job's page is /job/:id on the same host.
export function parsePersonio(xml: string, company: string, host: string): RawJob[] {
  if (!/<workzag-jobs[\s>]/.test(xml)) throw new FeedShapeError("personio");
  const positions = xml.match(/<position>[\s\S]*?<\/position>/g) ?? [];
  return positions.flatMap((block): RawJob[] => {
    // The descriptions have <name> fields of their own; the job's fields sit outside them.
    const descriptions = /<jobDescriptions>([\s\S]*?)<\/jobDescriptions>/.exec(block)?.[1] ?? "";
    const fields = block.replace(descriptions, "");
    const id = xmlField(fields, "id");
    const title = xmlField(fields, "name");
    if (!id || !/^\d{1,20}$/.test(id) || !title) return [];
    const url = httpsLink(`https://${host}/job/${id}?language=en`);
    if (!url) return [];
    const offices = /<additionalOffices>([\s\S]*?)<\/additionalOffices>/.exec(fields)?.[1] ?? "";
    const place = joinLocation([
      xmlField(fields.replace(offices, ""), "office"),
      ...[...offices.matchAll(/<office>([\s\S]*?)<\/office>/g)]
        .slice(0, 2)
        .map((m) => xmlText(m[1]!)),
    ]);
    const text = [...descriptions.matchAll(/<jobDescription>([\s\S]*?)<\/jobDescription>/g)]
      .map((section) => {
        const heading = xmlField(section[1]!, "name");
        const body = htmlToText(xmlField(section[1]!, "value") ?? "");
        return [heading, body].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
    const kind = xmlField(fields, "employmentType")?.toLowerCase() ?? "";
    return [
      {
        externalId: id,
        company,
        title,
        location: place,
        remote: REMOTE_WORDS.test(place),
        employmentType: PERSONIO_TYPES[kind] ?? typeFrom(xmlField(fields, "schedule")),
        postedAt: toTime(xmlField(fields, "createdAt")),
        validThrough: null,
        url,
        text,
        seniority: levelFrom(xmlField(fields, "seniority")),
      },
    ];
  });
}
