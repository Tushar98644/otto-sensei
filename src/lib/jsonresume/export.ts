import { extrasOf, type ExtraItem, type Resume } from "@/lib/resume/schema";
import { isPresent, toIsoDate } from "./dates";

// Hidden lines stay out. Dates that aren't clearly dates keep their text rather than being dropped.

export const JSON_RESUME_SCHEMA_URL =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonResume = { [key: string]: Json };

const shown = <T extends { hidden?: boolean }>(items: readonly T[]) => items.filter((item) => !item.hidden);
const texts = (bullets: readonly { text: string; hidden?: boolean }[]) =>
  shown(bullets)
    .map((bullet) => bullet.text.trim())
    .filter(Boolean);

function compact(entries: Record<string, Json | undefined>): { [key: string]: Json } {
  const out: { [key: string]: Json } = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    out[key] = value;
  }
  return out;
}

function range(startDate: string, endDate: string) {
  return {
    startDate: toIsoDate(startDate) ?? undefined,
    // An open end ("Present") is a missing endDate in JSON Resume.
    endDate: isPresent(endDate) ? undefined : (toIsoDate(endDate) ?? undefined),
  };
}

const date = (value: string) => toIsoDate(value) ?? undefined;

export function toJsonResume(resume: Resume): JsonResume {
  const { basics } = resume;
  const extras = shown(extrasOf(resume));
  const extraItems = (kind: string) =>
    extras.filter((section) => section.kind === kind).flatMap((section) => shown(section.items));
  const hidden = new Set(resume.hiddenSections ?? []);
  const section = <T>(key: (typeof resume.sectionOrder)[number], items: T[]) => (hidden.has(key) ? [] : items);

  return compact({
    $schema: JSON_RESUME_SCHEMA_URL,
    basics: compact({
      name: basics.name.trim(),
      label: basics.headline.trim(),
      email: basics.email.trim(),
      phone: basics.phone.trim(),
      summary: hidden.has("summary") ? "" : resume.summary.trim(),
      location: basics.location.trim() ? { city: basics.location.trim() } : undefined,
      profiles: basics.links
        .filter((link) => link.url.trim())
        .map((link) => compact({ network: link.label.trim(), url: link.url.trim() })),
    }),
    work: section("experience", shown(resume.experience)).map((job) =>
      compact({
        name: job.company,
        position: job.title,
        location: job.location,
        ...range(job.startDate, job.endDate),
        highlights: texts(job.bullets),
      }),
    ),
    volunteer: extraItems("volunteering").map((item) => {
      // Imports store a volunteer role's dates as one line: "2020 – Present".
      const [start = "", end = ""] = item.date.split(/\s+[–-]\s+/u);
      return compact({
        organization: item.subtitle,
        position: item.title,
        ...range(start, end),
        summary: item.detail,
        highlights: texts(item.bullets),
      });
    }),
    education: section("education", shown(resume.education)).map((school) =>
      compact({
        institution: school.school,
        area: school.field,
        studyType: school.degree,
        ...range(school.startDate, school.endDate),
        // Not in the v1 schema, which allows extra fields; this importer reads it back.
        highlights: texts(school.bullets),
      }),
    ),
    awards: extraItems("awards").map((item) =>
      compact({ title: item.title, awarder: item.subtitle, date: date(item.date), summary: item.detail }),
    ),
    certificates: section("certifications", shown(resume.certifications)).map((cert) =>
      compact({ name: cert.name, issuer: cert.issuer, date: date(cert.date) }),
    ),
    publications: extraItems("publications").map((item: ExtraItem) =>
      compact({ name: item.title, publisher: item.subtitle, releaseDate: date(item.date), summary: item.detail }),
    ),
    // An unlabeled group is a flat list, which JSON Resume writes as one skill per entry.
    skills: section("skills", shown(resume.skills)).flatMap((group) =>
      group.label.trim()
        ? [compact({ name: group.label.trim(), keywords: group.items })]
        : group.items.map((item) => ({ name: item })),
    ),
    languages: extraItems("languages").map((item) => compact({ language: item.title, fluency: item.subtitle })),
    projects: section("projects", shown(resume.projects)).map((project) =>
      compact({ name: project.name, url: project.link, highlights: texts(project.bullets) }),
    ),
    meta: { version: "v1.0.0", lastModified: new Date(resume.updatedAt).toISOString() },
  });
}

export function jsonResumeFileName(resume: Resume): string {
  const name = resume.basics.name
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${name ? `${name}-` : ""}resume.json`;
}
