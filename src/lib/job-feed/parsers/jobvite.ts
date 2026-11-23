import { decodeEntities, htmlToText } from "@/lib/jobs/html";
import { FeedShapeError, httpsLink, REMOTE_WORDS, typeFrom, type RawJob } from "./shared";

// One requisition posted in several places lists each as "{job id}-{posting id}".
const ID = /^[A-Za-z0-9]{4,20}(?:-[A-Za-z0-9]{4,20})?$/;
const DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const JOBVITE_HOST = "app.jobvite.com";

function xmlField(block: string, tag: string): string {
  const raw = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)?.[1] ?? "";
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return (cdata ? cdata[1]! : decodeEntities(raw)).trim();
}

function dateOf(value: string): number | null {
  const match = DATE.exec(value);
  if (!match) return null;
  const at = Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return Number.isFinite(at) ? at : null;
}

// "United States, United States" names the country twice when the job has no town.
function placeOf(value: string): string {
  const parts = value.split(/\s*,\s*/).filter(Boolean);
  return parts.filter((part, i) => part !== parts[i - 1]).join(", ");
}

// The detail link is http and on Jobvite's own host; anything else is refused.
function jobLink(value: string, company: string): string | null {
  const link = httpsLink(value);
  if (!link) return null;
  const url = new URL(link);
  if (url.hostname !== JOBVITE_HOST || url.searchParams.get("c") !== company) return null;
  url.protocol = "https:";
  return url.toString();
}

export function parseJobvite(xml: string, company: string, companyId: string): RawJob[] {
  if (!/<result[\s>]/.test(xml)) throw new FeedShapeError("jobvite");
  const blocks = xml.match(/<job>[\s\S]*?<\/job>/g) ?? [];
  return blocks.flatMap((block): RawJob[] => {
    const id = xmlField(block, "id");
    const title = xmlField(block, "title");
    const url = jobLink(xmlField(block, "detail-url"), companyId);
    if (!ID.test(id) || !title || !url) return [];
    const location = placeOf(xmlField(block, "location"));
    return [
      {
        externalId: id,
        company,
        title,
        location,
        remote: REMOTE_WORDS.test(location),
        employmentType: typeFrom(xmlField(block, "jobtype")),
        postedAt: dateOf(xmlField(block, "date")),
        validThrough: null,
        url,
        text: htmlToText(xmlField(block, "description")),
      },
    ];
  });
}
