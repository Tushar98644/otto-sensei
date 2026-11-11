import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { heuristicParse } from "@/lib/resume/heuristic-parse";
import {
  DEFAULT_SECTION_ORDER,
  EXTRA_KINDS,
  EXTRA_KIND_LABELS,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  newId,
  type Basics,
  type Bullet,
  type ExtraKind,
  type ExtraSection,
  type Resume,
} from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { bulletText, findLinks, headingTitle } from "@/lib/resume/sections";
import { runStructured } from "./client";
import { novelWordShare } from "./guards";
import { STRUCTURE_SYSTEM_PROMPT } from "./prompts";
import { createRedactor, looksLikePersonName, type Redactor } from "./redact";
import { clip, oneLine, tag } from "./text";
import { AIError } from "./types";

export type StructureResult = {
  resume: Resume;
  usedAI: boolean;
};

const MIN_AI_CHARS = 40;
const MAX_NOVEL_WORD_SHARE = 0.15;

const LIMIT = {
  text: 200,
  label: 100,
  url: 500,
  email: 254,
  phone: 50,
  date: 50,
  summary: 3_000,
  bullet: 1_000,
  item: 100,
  links: 10,
  experience: 40,
  experienceBullets: 40,
  education: 20,
  educationBullets: 20,
  projects: 30,
  projectBullets: 20,
  skillGroups: 30,
  skillItems: 100,
  certifications: 40,
  extraTitle: 100,
  extraDetail: 500,
  extraBullets: 20,
} as const;

// A fresh schema per field keeps the JSON schema inline instead of full of shared $refs.
const str = (description?: string) => (description ? z.string().describe(description) : z.string());
const lines = (description: string) => z.array(z.string()).describe(description);
const DATE = "As written, e.g. 'Jan 2022', '2019' or 'Present'. Empty if not stated.";

const ParsedResumeSchema = z.object({
  basics: z.object({
    name: str(),
    headline: str("Short professional title near the name. Empty if none."),
    email: str(),
    phone: str(),
    location: str("As written. Empty if none."),
    links: z.array(z.object({ label: str("e.g. 'LinkedIn', 'GitHub', 'Portfolio'"), url: str() })),
  }),
  summary: str("The resume's own summary, profile or objective. Empty if none."),
  experience: z.array(
    z.object({
      company: str(),
      title: str(),
      location: str(),
      startDate: str(DATE),
      endDate: str(DATE),
      bullets: lines("One item per achievement or duty line, without the bullet symbol."),
    }),
  ),
  education: z.array(
    z.object({
      school: str(),
      degree: str(),
      field: str("Field of study, e.g. 'Computer Science'. Empty if none."),
      location: str(),
      startDate: str(DATE),
      endDate: str(DATE),
      bullets: lines("Honors, coursework or other lines, one per item."),
    }),
  ),
  projects: z.array(
    z.object({
      name: str(),
      link: str("URL if given. Empty if none."),
      bullets: lines("One item per line, without the bullet symbol."),
    }),
  ),
  skills: z.array(
    z.object({
      label: str("The resume's label for the group. Empty for a flat list."),
      items: lines("One skill per item."),
    }),
  ),
  certifications: z.array(z.object({ name: str(), issuer: str(), date: str(DATE) })),
  extras: z.array(
    z.object({
      kind: z.enum(EXTRA_KINDS),
      title: str("The section's heading as written, e.g. 'Honors & Awards'."),
      items: z.array(
        z.object({
          title: str(),
          subtitle: str(),
          date: str(DATE),
          detail: str("One line of text about the item. Empty if none."),
          bullets: lines("One item per line under it, without the bullet symbol."),
        }),
      ),
    }),
  ),
});

type ParsedResume = z.infer<typeof ParsedResumeSchema>;

function toBullets(texts: readonly string[], max: number): Bullet[] {
  return texts
    .map((text) => oneLine(text))
    .map((line) => clip(bulletText(line) ?? line, LIMIT.bullet))
    .filter(Boolean)
    .slice(0, max)
    .map((text) => ({ id: newId(), text }));
}

function toItems(items: readonly string[]): string[] {
  return items
    .map((item) => clip(item, LIMIT.item))
    .filter(Boolean)
    .slice(0, LIMIT.skillItems);
}

function extraTitle(kind: ExtraKind, title: string): string {
  const own = clip(headingTitle(title), LIMIT.extraTitle);
  if (own) return own;
  return kind === "custom" ? "Additional information" : EXTRA_KIND_LABELS[kind];
}

function toExtras(parsed: ParsedResume): ExtraSection[] {
  return parsed.extras
    .map((section) => ({
      id: newId(),
      kind: section.kind,
      title: extraTitle(section.kind, section.title),
      items: section.items
        .map((item) => ({
          id: newId(),
          title: clip(item.title, LIMIT.text),
          subtitle: clip(item.subtitle, LIMIT.text),
          date: clip(item.date, LIMIT.date),
          detail: clip(oneLine(item.detail), LIMIT.extraDetail),
          bullets: toBullets(item.bullets, LIMIT.extraBullets),
        }))
        .filter((item) => item.title || item.subtitle || item.detail || item.bullets.length > 0)
        .slice(0, MAX_EXTRA_ITEMS),
    }))
    .filter((section) => section.items.length > 0)
    .slice(0, MAX_EXTRA_SECTIONS);
}

function toResume(parsed: ParsedResume, now: number): Resume {
  const { basics } = parsed;
  const experience = parsed.experience
    .map((job) => ({
      id: newId(),
      company: clip(job.company, LIMIT.text),
      title: clip(job.title, LIMIT.text),
      location: clip(job.location, LIMIT.text),
      startDate: clip(job.startDate, LIMIT.date),
      endDate: clip(job.endDate, LIMIT.date),
      bullets: toBullets(job.bullets, LIMIT.experienceBullets),
    }))
    .filter((job) => job.company || job.title || job.bullets.length > 0);
  const education = parsed.education
    .map((school) => ({
      id: newId(),
      school: clip(school.school, LIMIT.text),
      degree: clip(school.degree, LIMIT.text),
      field: clip(school.field, LIMIT.text),
      location: clip(school.location, LIMIT.text),
      startDate: clip(school.startDate, LIMIT.date),
      endDate: clip(school.endDate, LIMIT.date),
      bullets: toBullets(school.bullets, LIMIT.educationBullets),
    }))
    .filter((entry) => entry.school || entry.degree || entry.field || entry.bullets.length > 0);
  const projects = parsed.projects
    .map((project) => ({
      id: newId(),
      name: clip(project.name, LIMIT.text),
      link: clip(project.link, LIMIT.url),
      bullets: toBullets(project.bullets, LIMIT.projectBullets),
    }))
    .filter((project) => project.name || project.link || project.bullets.length > 0);
  const skills = parsed.skills
    .map((group) => ({
      id: newId(),
      label: clip(group.label, LIMIT.label),
      items: toItems(group.items),
    }))
    .filter((group) => group.items.length > 0);
  const certifications = parsed.certifications
    .map((cert) => ({
      id: newId(),
      name: clip(cert.name, LIMIT.text),
      issuer: clip(cert.issuer, LIMIT.text),
      date: clip(cert.date, LIMIT.date),
    }))
    .filter((cert) => cert.name);

  return {
    id: newId(),
    version: 1,
    title: "Imported resume",
    basics: {
      name: clip(basics.name, LIMIT.text),
      headline: clip(basics.headline, LIMIT.text),
      email: clip(basics.email, LIMIT.email),
      phone: clip(basics.phone, LIMIT.phone),
      location: clip(basics.location, LIMIT.text),
      links: basics.links
        .map((link) => ({
          id: newId(),
          label: clip(link.label, LIMIT.label),
          url: clip(link.url, LIMIT.url),
        }))
        .filter((link) => link.url)
        .slice(0, LIMIT.links),
    },
    summary: clip(parsed.summary, LIMIT.summary),
    experience: experience.slice(0, LIMIT.experience),
    education: education.slice(0, LIMIT.education),
    projects: projects.slice(0, LIMIT.projects),
    skills: skills.slice(0, LIMIT.skillGroups),
    certifications: certifications.slice(0, LIMIT.certifications),
    extras: toExtras(parsed),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "import",
    tailor: null,
    createdAt: now,
    updatedAt: now,
  };
}

function copiedStrings(parsed: ParsedResume): string[] {
  const { basics } = parsed;
  return [
    basics.name,
    basics.headline,
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((link) => link.url),
    parsed.summary,
    ...parsed.experience.flatMap((job) => [
      job.company,
      job.title,
      job.location,
      job.startDate,
      job.endDate,
      ...job.bullets,
    ]),
    ...parsed.education.flatMap((school) => [
      school.school,
      school.degree,
      school.field,
      school.location,
      school.startDate,
      school.endDate,
      ...school.bullets,
    ]),
    ...parsed.projects.flatMap((project) => [project.name, project.link, ...project.bullets]),
    ...parsed.skills.flatMap((group) => [group.label, ...group.items]),
    ...parsed.certifications.flatMap((cert) => [cert.name, cert.issuer, cert.date]),
    ...parsed.extras.flatMap((section) => [
      section.title,
      ...section.items.flatMap((item) => [
        item.title,
        item.subtitle,
        item.date,
        item.detail,
        ...item.bullets,
      ]),
    ]),
  ];
}

function hasContent(resume: Resume): boolean {
  const { basics } = resume;
  const sections =
    resume.experience.length +
    resume.education.length +
    resume.projects.length +
    resume.skills.length +
    resume.certifications.length +
    (resume.extras?.length ?? 0);
  return Boolean(basics.name || basics.email || basics.phone || resume.summary) || sections > 0;
}

function importRedactor(found: Basics): Redactor {
  return createRedactor({
    name: looksLikePersonName(found.name) ? found.name : "",
    emails: [found.email],
    phones: [found.phone],
    links: found.links.map((link) => link.url),
  });
}

function hostOf(url: string): string {
  return (
    url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0] ?? ""
  ).toLowerCase();
}

const GENERIC_LABEL = /^(?:links?|urls?|web|website|site|homepage|other|profile)?$/i;

function linkLabel(url: string, label: string): string {
  const found = findLinks(url)[0];
  if (found && found.label.toLowerCase() !== hostOf(url)) return found.label;
  const own = label.trim();
  if (!GENERIC_LABEL.test(own)) return own;
  return /portfolio/i.test(url) ? "Portfolio" : "Website";
}

function restoreParsed(parsed: ParsedResume, redactor: Redactor, text: string): ParsedResume {
  const restored = redactor.restoreDeep(parsed, { dropUnknown: true });
  const hidden = new Set(redactor.hidden("LINK"));
  const projectLinks = new Set(restored.projects.map((project) => project.link));
  const duplicated = (url: string) =>
    hidden.has(url) && projectLinks.has(url) && text.split(url).length <= 2;
  const links = restored.basics.links
    .filter((link) => !duplicated(link.url))
    .map((link) => ({ ...link, label: linkLabel(link.url, link.label) }));
  return { ...restored, basics: { ...restored.basics, links } };
}

function withHiddenContact(resume: Resume, found: Basics, redactor: Redactor): Resume {
  const hid = (kind: "NAME" | "EMAIL" | "PHONE", value: string) =>
    value !== "" && redactor.hidden(kind).includes(value);
  const basics = { ...resume.basics };
  if (!basics.name && hid("NAME", found.name)) basics.name = found.name;
  if (!basics.email && hid("EMAIL", found.email)) basics.email = found.email;
  if (!basics.phone && hid("PHONE", found.phone)) basics.phone = found.phone;
  if (basics.links.length === 0) {
    const hiddenLinks = redactor.hidden("LINK");
    basics.links = found.links.filter((link) => hiddenLinks.includes(link.url));
  }
  return { ...resume, basics };
}

function acceptedResume(parsed: ParsedResume, text: string, now: number): Resume {
  const problem = (reason: string) => {
    log.warn("ai.structure_rejected", { reason });
    return new AIError("invalid_output", `Structured resume rejected: ${reason}`);
  };
  if (novelWordShare(copiedStrings(parsed), text) > MAX_NOVEL_WORD_SHARE) {
    throw problem("unfaithful");
  }
  const checked = ResumeSchema.safeParse(toResume(parsed, now));
  if (!checked.success) throw problem("schema");
  if (!hasContent(checked.data)) throw problem("empty");
  return checked.data;
}

export async function structureResume(
  text: string,
  now = Date.now(),
  { ai = true }: { ai?: boolean } = {},
): Promise<StructureResult> {
  if (text.length > TEXT_LIMITS.resumeChars) {
    throw new AIError("too_long", `Resume text is over ${TEXT_LIMITS.resumeChars} characters`);
  }
  if (!ai || !aiEnabled() || text.trim().length < MIN_AI_CHARS) {
    return { resume: heuristicParse(text, now), usedAI: false };
  }
  const fallback = heuristicParse(text, now);
  const redactor = importRedactor(fallback.basics);
  try {
    const parsed = await runStructured({
      task: "structure",
      system: STRUCTURE_SYSTEM_PROMPT,
      user: tag("resume", redactor.redact(text)),
      schema: ParsedResumeSchema,
      effort: "low",
    });
    const resume = acceptedResume(restoreParsed(parsed, redactor, text), text, now);
    return { resume: withHiddenContact(resume, fallback.basics, redactor), usedAI: true };
  } catch (error) {
    const reason = error instanceof AIError ? error.code : "unexpected";
    log.warn("ai.structure_fallback", { reason });
    return { resume: fallback, usedAI: false };
  }
}
