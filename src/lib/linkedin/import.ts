import JSZip from "jszip";
import { clip, cleanList, oneLine } from "@/lib/ai/text";
import { bulletText } from "@/lib/resume/sections";
import {
  emptyResume,
  MAX_EXTRA_ITEMS,
  newBullet,
  newId,
  newSkillGroup,
  type Bullet,
  type Resume,
} from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { csvRecords, type CsvRecord } from "./csv";
import { extraItem, extraSection } from "./extras";

// Nothing is scraped and nothing leaves the browser: the person picks their own data export.

// The full archive can be large; only a few small CSVs are read.
export const LINKEDIN_MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_CSV_CHARS = 2_000_000;

export const LINKEDIN_FILES = {
  profile: "profile.csv",
  positions: "positions.csv",
  education: "education.csv",
  skills: "skills.csv",
  certifications: "certifications.csv",
  languages: "languages.csv",
  projects: "projects.csv",
  honors: "honors.csv",
  emails: "email addresses.csv",
  phones: "phonenumbers.csv",
} as const;

export type LinkedInFile = keyof typeof LINKEDIN_FILES;
export type LinkedInCsvs = Partial<Record<LinkedInFile, string>>;

export type LinkedInImportErrorCode = "not_zip" | "not_linkedin" | "too_large" | "empty";

export class LinkedInImportError extends Error {
  readonly code: LinkedInImportErrorCode;
  constructor(code: LinkedInImportErrorCode, message: string) {
    super(message);
    this.name = "LinkedInImportError";
    this.code = code;
  }
}

export type LinkedInCounts = {
  jobs: number;
  schools: number;
  skills: number;
  certifications: number;
  projects: number;
  languages: number;
  honors: number;
};

export type LinkedInImport = { resume: Resume; counts: LinkedInCounts };

const PRESENT = "Present";

export async function readLinkedInExport(data: Uint8Array | ArrayBuffer, now = Date.now()): Promise<LinkedInImport> {
  if (data.byteLength > LINKEDIN_MAX_ZIP_BYTES) {
    throw new LinkedInImportError("too_large", "That ZIP is over 50 MB. Ask LinkedIn for the smaller copy of your data.");
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new LinkedInImportError("not_zip", "That file isn't a ZIP. Pick the ZIP LinkedIn emailed you, without unpacking it.");
  }
  return linkedInToResume(await readCsvs(zip), now);
}

// Matched by file name at any depth, shallowest first: the archive's folder name changes per export.
async function readCsvs(zip: JSZip): Promise<LinkedInCsvs> {
  const wanted = new Map<string, LinkedInFile>(
    Object.entries(LINKEDIN_FILES).map(([key, name]): [string, LinkedInFile] => [name, key as LinkedInFile]),
  );
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((a, b) => a.name.split("/").length - b.name.split("/").length);
  const csvs: LinkedInCsvs = {};
  for (const entry of entries) {
    const base = entry.name.split("/").pop()?.toLowerCase() ?? "";
    const key = wanted.get(base) ?? (base === "phone numbers.csv" ? "phones" : undefined);
    if (!key || csvs[key] !== undefined) continue;
    const text = await entry.async("string");
    csvs[key] = text.length > MAX_CSV_CHARS ? text.slice(0, MAX_CSV_CHARS) : text;
  }
  return csvs;
}

const field = (record: CsvRecord, ...names: string[]): string => {
  for (const name of names) {
    const value = record[name.toLowerCase()];
    if (value) return value;
  }
  return "";
};

const line = (value: string, max: number) => clip(oneLine(value), max);

function bulletsFrom(text: string, max: number): Bullet[] {
  return text
    .split(/\r?\n/)
    .map((raw) => bulletText(raw) ?? raw.trim())
    .filter((value) => value !== "")
    .slice(0, max)
    .map((value) => newBullet(clip(oneLine(value), 1_000)));
}

function profileLinks(websites: string) {
  // "[PORTFOLIO:https://ana.dev],[COMPANY:https://contoso.com]" or plain URLs.
  const urls = websites.match(/https?:\/\/[^\s,\]]+/gi) ?? [];
  return [...new Set(urls)].slice(0, 10).map((url) => ({ id: newId(), label: "Website", url: clip(url, 500) }));
}

function primaryValue(records: CsvRecord[], valueKey: string): string {
  const primary = records.find((record) => /^yes$/i.test(field(record, "Primary")));
  return field(primary ?? records[0] ?? {}, valueKey);
}

export function linkedInToResume(csvs: LinkedInCsvs, now = Date.now()): LinkedInImport {
  const read = (key: LinkedInFile, required: string[]) => {
    const text = csvs[key];
    return text ? csvRecords(text, required) : [];
  };
  const profile = read("profile", ["First Name", "Last Name"])[0];
  const positions = read("positions", ["Company Name", "Title"]);
  const education = read("education", ["School Name"]);
  if (!profile && positions.length === 0 && education.length === 0) {
    throw new LinkedInImportError(
      "not_linkedin",
      "That ZIP doesn't look like a LinkedIn data export. It needs Profile.csv or Positions.csv inside.",
    );
  }
  const skills = cleanList(read("skills", ["Name"]).map((r) => field(r, "Name")), 100, 100);
  const certifications = read("certifications", ["Name"]);
  const projects = read("projects", ["Title"]);
  const languages = read("languages", ["Name"]).map((r) =>
    extraItem(field(r, "Name"), field(r, "Proficiency"), "", ""),
  );
  const honors = read("honors", ["Title"]).map((r) =>
    extraItem(field(r, "Title"), "", field(r, "Issued On"), field(r, "Description")),
  );

  const resume = emptyResume(now);
  const name = profile ? oneLine(`${field(profile, "First Name")} ${field(profile, "Last Name")}`) : "";
  resume.source = "import";
  resume.title = name ? `${name} (LinkedIn)` : "LinkedIn resume";
  resume.basics = {
    name: clip(name, 200),
    headline: profile ? line(field(profile, "Headline"), 200) : "",
    email: line(primaryValue(read("emails", ["Email Address"]), "Email Address"), 254),
    phone: line(primaryValue(read("phones", ["Number"]), "Number"), 50),
    location: profile ? line(field(profile, "Geo Location", "Location"), 200) : "",
    links: profile ? profileLinks(field(profile, "Websites")) : [],
  };
  resume.summary = profile ? clip(field(profile, "Summary"), 3_000) : "";

  resume.experience = positions.slice(0, 40).map((r) => {
    const startDate = line(field(r, "Started On"), 50);
    return {
      id: newId(),
      company: line(field(r, "Company Name"), 200),
      title: line(field(r, "Title"), 200),
      location: line(field(r, "Location"), 200),
      startDate,
      endDate: line(field(r, "Finished On"), 50) || (startDate ? PRESENT : ""),
      bullets: bulletsFrom(field(r, "Description"), 40),
    };
  });

  resume.education = education.slice(0, 20).map((r) => {
    const activities = field(r, "Activities");
    const notes = bulletsFrom(field(r, "Notes"), 18);
    return {
      id: newId(),
      school: line(field(r, "School Name"), 200),
      degree: line(field(r, "Degree Name", "Degree"), 200),
      field: line(field(r, "Field Of Study", "Field of Study"), 200),
      location: "",
      startDate: line(field(r, "Start Date", "Started On"), 50),
      endDate: line(field(r, "End Date", "Finished On"), 50),
      bullets: activities ? [...notes, newBullet(clip(`Activities: ${oneLine(activities)}`, 1_000))] : notes,
    };
  });

  resume.projects = projects.slice(0, 30).map((r) => ({
    id: newId(),
    name: line(field(r, "Title"), 200),
    link: line(field(r, "Url", "URL"), 500),
    bullets: bulletsFrom(field(r, "Description"), 20),
  }));

  resume.certifications = certifications.slice(0, 40).map((r) => ({
    id: newId(),
    name: line(field(r, "Name"), 200),
    issuer: line(field(r, "Authority"), 200),
    date: line(field(r, "Started On"), 50),
  }));

  resume.skills = skills.length ? [{ ...newSkillGroup(), items: skills }] : [];
  const languageItems = languages.filter((item) => item.title !== "").slice(0, MAX_EXTRA_ITEMS);
  const honorItems = honors.filter((item) => item.title !== "").slice(0, MAX_EXTRA_ITEMS);
  resume.extras = [
    extraSection("languages", languageItems),
    extraSection("awards", honorItems),
  ].filter((section) => section !== null);

  return {
    // Every field is clipped above; parsing guards the caps if the schema ever tightens.
    resume: ResumeSchema.parse(resume),
    counts: {
      jobs: resume.experience.length,
      schools: resume.education.length,
      skills: skills.length,
      certifications: resume.certifications.length,
      projects: resume.projects.length,
      languages: languageItems.length,
      honors: honorItems.length,
    },
  };
}
