import type { ZodString } from "zod";
import type { BulletSection } from "@/lib/resume/ops";
import {
  BasicsSchema,
  BulletSchema,
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  ExtraItemSchema,
  ExtraSectionSchema,
  LinkSchema,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  MAX_SECTION_TITLE_CHARS,
  ProjectSchema,
  ResumeSchema,
  SkillGroupSchema,
} from "@/lib/resume/schema";

// Inputs stop at the schema's caps, so the editor never holds a resume that cloud sync would
// reject. Text caps are read from the schema itself. zod has no public getter for list caps, so
// those are mirrored here and pinned to the schema by limits.test.ts.

export const LIST_LIMITS = {
  links: 10,
  experience: 40,
  education: 20,
  projects: 30,
  skillGroups: 30,
  skillsPerGroup: 100,
  certifications: 40,
  extraSections: MAX_EXTRA_SECTIONS,
  extraItems: MAX_EXTRA_ITEMS,
} as const;

export const BULLET_LIMITS: Readonly<Record<BulletSection, number>> = {
  experience: 40,
  education: 20,
  projects: 20,
  extras: 20,
};

// Only used if a field ever loses its .max(). The server validates either way.
export const UNCAPPED_TEXT = 10_000;

function cap(schema: ZodString): number {
  return schema.maxLength ?? UNCAPPED_TEXT;
}

export const CHAR_LIMITS = {
  name: cap(BasicsSchema.shape.name),
  headline: cap(BasicsSchema.shape.headline),
  email: cap(BasicsSchema.shape.email),
  phone: cap(BasicsSchema.shape.phone),
  location: cap(BasicsSchema.shape.location),
  linkLabel: cap(LinkSchema.shape.label),
  linkUrl: cap(LinkSchema.shape.url),
  summary: cap(ResumeSchema.shape.summary),
  bullet: cap(BulletSchema.shape.text),
  jobTitle: cap(ExperienceSchema.shape.title),
  company: cap(ExperienceSchema.shape.company),
  jobLocation: cap(ExperienceSchema.shape.location),
  date: cap(ExperienceSchema.shape.startDate),
  school: cap(EducationSchema.shape.school),
  degree: cap(EducationSchema.shape.degree),
  field: cap(EducationSchema.shape.field),
  schoolLocation: cap(EducationSchema.shape.location),
  projectName: cap(ProjectSchema.shape.name),
  projectLink: cap(ProjectSchema.shape.link),
  projectTech: cap(ProjectSchema.shape.tech.unwrap()),
  skillGroupLabel: cap(SkillGroupSchema.shape.label),
  skill: cap(SkillGroupSchema.shape.items.element),
  certName: cap(CertificationSchema.shape.name),
  certIssuer: cap(CertificationSchema.shape.issuer),
  certDate: cap(CertificationSchema.shape.date),
  sectionTitle: MAX_SECTION_TITLE_CHARS,
  extraSectionTitle: cap(ExtraSectionSchema.shape.title),
  extraTitle: cap(ExtraItemSchema.shape.title),
  extraSubtitle: cap(ExtraItemSchema.shape.subtitle),
  extraDate: cap(ExtraItemSchema.shape.date),
  extraDetail: cap(ExtraItemSchema.shape.detail),
} as const;
