import { z } from "zod";
import { clip, cleanList, oneLine } from "@/lib/ai/text";
import { extraItem, extraSection } from "@/lib/linkedin/extras";
import {
  emptyResume,
  MAX_EXTRA_ITEMS,
  newBullet,
  newId,
  newSkillGroup,
  type Bullet,
  type ExtraSection,
  type Resume,
  type SkillGroup,
} from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { fromIsoDate } from "./dates";

export const JSON_RESUME_MAX_BYTES = 2 * 1024 * 1024;

export class JsonResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonResumeError";
  }
}

const str = z.string().optional().catch(undefined);
const strList = z.array(z.unknown()).optional().catch(undefined).transform((list) =>
  (list ?? []).filter((item): item is string => typeof item === "string"),
);
const list = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((items) =>
      (items ?? []).flatMap((value) => {
        const parsed = item.safeParse(value);
        return parsed.success ? [parsed.data as z.output<T>] : [];
      }),
    );

const Dated = { startDate: str, endDate: str };
const JsonResumeInputSchema = z.object({
  basics: z
    .object({
      name: str,
      label: str,
      email: str,
      phone: str,
      url: str,
      summary: str,
      location: z
        .object({ address: str, city: str, region: str, countryCode: str, postalCode: str })
        .optional()
        .catch(undefined),
      profiles: list(z.object({ network: str, username: str, url: str })),
    })
    .optional()
    .catch(undefined),
  work: list(z.object({ name: str, company: str, position: str, location: str, summary: str, highlights: strList, ...Dated })),
  volunteer: list(z.object({ organization: str, position: str, summary: str, highlights: strList, ...Dated })),
  education: list(
    z.object({ institution: str, area: str, studyType: str, score: str, courses: strList, highlights: strList, location: str, ...Dated }),
  ),
  awards: list(z.object({ title: str, date: str, awarder: str, summary: str })),
  certificates: list(z.object({ name: str, date: str, issuer: str, url: str })),
  publications: list(z.object({ name: str, publisher: str, releaseDate: str, summary: str })),
  skills: list(z.object({ name: str, keywords: strList })),
  languages: list(z.object({ language: str, fluency: str })),
  projects: list(z.object({ name: str, description: str, url: str, highlights: strList, ...Dated })),
});

type JsonResumeInput = z.output<typeof JsonResumeInputSchema>;

const line = (value: string | undefined, max: number) => clip(oneLine(value ?? ""), max);

function bullets(values: readonly (string | undefined)[], max: number): Bullet[] {
  return values
    .flatMap((value) => (value ?? "").split(/\r?\n/))
    .map((value) => oneLine(value.replace(/^[•\-*–]\s+/u, "")))
    .filter(Boolean)
    .slice(0, max)
    .map((value) => newBullet(clip(value, 1_000)));
}

function dates(entry: { startDate?: string; endDate?: string }) {
  const startDate = line(fromIsoDate(entry.startDate), 50);
  return { startDate, endDate: line(fromIsoDate(entry.endDate), 50) || (startDate ? "Present" : "") };
}

function location(basics: NonNullable<JsonResumeInput["basics"]>): string {
  const place = basics.location;
  if (!place) return "";
  const parts = [place.city, place.region, place.countryCode].map((part) => oneLine(part ?? "")).filter(Boolean);
  return line(parts.length ? parts.join(", ") : place.address, 200);
}

function skillGroups(skills: JsonResumeInput["skills"]): SkillGroup[] {
  const loose: string[] = [];
  const groups: SkillGroup[] = [];
  for (const skill of skills) {
    const name = line(skill.name, 100);
    const items = cleanList(skill.keywords, 100, 100);
    if (items.length) groups.push({ ...newSkillGroup(name), items });
    else if (name) loose.push(name);
  }
  const flat = cleanList(loose, 100, 100);
  return [...(flat.length ? [{ ...newSkillGroup(), items: flat }] : []), ...groups].slice(0, 30);
}

function extras(data: JsonResumeInput): ExtraSection[] {
  const cap = <T>(items: T[]) => items.slice(0, MAX_EXTRA_ITEMS);
  return [
    extraSection(
      "languages",
      cap(data.languages.map((l) => extraItem(l.language ?? "", l.fluency ?? "", "", "")).filter((i) => i.title)),
    ),
    extraSection(
      "awards",
      cap(
        data.awards
          .map((a) => extraItem(a.title ?? "", a.awarder ?? "", fromIsoDate(a.date), a.summary ?? ""))
          .filter((i) => i.title),
      ),
    ),
    extraSection(
      "volunteering",
      cap(
        data.volunteer
          .map((v) => {
            const { startDate, endDate } = dates(v);
            const item = extraItem(v.position ?? "", v.organization ?? "", [startDate, endDate].filter(Boolean).join(" – "), v.summary ?? "");
            return { ...item, bullets: bullets(v.highlights, 20) };
          })
          .filter((i) => i.title || i.subtitle),
      ),
    ),
    extraSection(
      "publications",
      cap(
        data.publications
          .map((p) => extraItem(p.name ?? "", p.publisher ?? "", fromIsoDate(p.releaseDate), p.summary ?? ""))
          .filter((i) => i.title),
      ),
    ),
  ].filter((section) => section !== null);
}

export function parseJsonResume(text: string, now = Date.now()): Resume {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new JsonResumeError("That file isn't valid JSON. Export it again and pick the .json file.");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new JsonResumeError("That file isn't a JSON Resume. It needs basics, work or education.");
  }
  return fromJsonResume(JsonResumeInputSchema.parse(raw), now);
}

function fromJsonResume(data: JsonResumeInput, now: number): Resume {
  const basics = data.basics;
  if (!basics?.name && data.work.length === 0 && data.education.length === 0) {
    throw new JsonResumeError("That file isn't a JSON Resume. It needs basics, work or education.");
  }
  const resume = emptyResume(now);
  resume.source = "import";
  const name = line(basics?.name, 200);
  resume.title = name ? `${name} (JSON Resume)` : "JSON Resume";
  const links = [
    ...(basics?.url ? [{ label: "Website", url: basics.url }] : []),
    ...(basics?.profiles ?? []).map((p) => ({ label: p.network ?? "Profile", url: p.url || p.username || "" })),
  ]
    .filter((link) => link.url.trim() !== "")
    .slice(0, 10)
    .map((link) => ({ id: newId(), label: line(link.label, 100), url: line(link.url, 500) }));

  resume.basics = {
    name,
    headline: line(basics?.label, 200),
    email: line(basics?.email, 254),
    phone: line(basics?.phone, 50),
    location: basics ? location(basics) : "",
    links,
  };
  resume.summary = clip(basics?.summary ?? "", 3_000);
  resume.experience = data.work.slice(0, 40).map((w) => ({
    id: newId(),
    company: line(w.name ?? w.company, 200),
    title: line(w.position, 200),
    location: line(w.location, 200),
    ...dates(w),
    bullets: bullets([w.summary, ...w.highlights], 40),
  }));
  resume.education = data.education.slice(0, 20).map((e) => {
    const extra = [
      ...(e.score ? [`Grade: ${oneLine(e.score)}`] : []),
      ...(e.courses.length ? [`Courses: ${e.courses.map(oneLine).filter(Boolean).join(", ")}`] : []),
    ];
    return {
      id: newId(),
      school: line(e.institution, 200),
      degree: line(e.studyType, 200),
      field: line(e.area, 200),
      location: line(e.location, 200),
      startDate: line(fromIsoDate(e.startDate), 50),
      endDate: line(fromIsoDate(e.endDate), 50),
      bullets: bullets([...e.highlights, ...extra], 20),
    };
  });
  resume.projects = data.projects.slice(0, 30).map((p) => ({
    id: newId(),
    name: line(p.name, 200),
    link: line(p.url, 500),
    bullets: bullets([p.description, ...p.highlights], 20),
  }));
  resume.skills = skillGroups(data.skills);
  resume.certifications = data.certificates.slice(0, 40).map((c) => ({
    id: newId(),
    name: line(c.name, 200),
    issuer: line(c.issuer, 200),
    date: line(fromIsoDate(c.date), 50),
  }));
  resume.extras = extras(data);
  return ResumeSchema.parse(resume);
}
