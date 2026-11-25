import { z } from "zod";
import { CONTENT_LANGS } from "@/lib/i18n/languages";
import {
  COVER_LETTER_CHARS,
  DEFAULT_TEMPLATE,
  DESIGN_ACCENTS,
  DESIGN_DENSITIES,
  DESIGN_FONTS,
  EXTRA_KINDS,
  JOB_TEXT_CHARS,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  MAX_SAVED_REQUIREMENTS,
  MAX_SECTION_TITLE_CHARS,
  SAVED_REQUIREMENT_LIMITS,
  SECTION_KEYS,
  TEMPLATE_IDS,
  type SectionKey,
} from "./schema";

const text = (max = 2_000) => z.string().max(max);

const id = z.string().min(1).max(64);

// Fields added after launch stay optional: localStorage copies are never re-parsed.
const hiddenFlag = z.boolean().optional().catch(undefined);

export const SectionKeySchema = z.enum(SECTION_KEYS);

export const BulletSchema = z.object({ id, text: text(1_000), hidden: hiddenFlag });

export const LinkSchema = z.object({ id, label: text(100), url: text(500) });

export const BasicsSchema = z.object({
  name: text(200),
  headline: text(200),
  email: text(254),
  phone: text(50),
  location: text(200),
  links: z.array(LinkSchema).max(10),
});

export const ExperienceSchema = z.object({
  id,
  company: text(200),
  title: text(200),
  location: text(200),
  startDate: text(50),
  endDate: text(50),
  bullets: z.array(BulletSchema).max(40),
  hidden: hiddenFlag,
});

export const EducationSchema = z.object({
  id,
  school: text(200),
  degree: text(200),
  field: text(200),
  location: text(200),
  startDate: text(50),
  endDate: text(50),
  bullets: z.array(BulletSchema).max(20),
  hidden: hiddenFlag,
});

export const ProjectSchema = z.object({
  id,
  name: text(200),
  link: text(500),
  startDate: text(50).optional(),
  endDate: text(50).optional(),
  tech: text(300).optional(),
  bullets: z.array(BulletSchema).max(20),
  hidden: hiddenFlag,
});

export const SkillGroupSchema = z.object({
  id,
  label: text(100),
  items: z.array(text(100)).max(100),
  hidden: hiddenFlag,
});

export const CertificationSchema = z.object({
  id,
  name: text(200),
  issuer: text(200),
  date: text(50),
  hidden: hiddenFlag,
});

export const ExtraKindSchema = z.enum(EXTRA_KINDS);

export const ExtraItemSchema = z.object({
  id,
  title: text(200),
  subtitle: text(200),
  date: text(50),
  detail: text(500),
  bullets: z.array(BulletSchema).max(20),
  hidden: hiddenFlag,
});

export const ExtraSectionSchema = z.object({
  id,
  kind: ExtraKindSchema.catch("custom"),
  title: text(100),
  items: z.array(ExtraItemSchema).max(MAX_EXTRA_ITEMS),
  hidden: hiddenFlag,
});

const sectionTitleField = text(MAX_SECTION_TITLE_CHARS).optional().catch(undefined);

export const SectionTitlesSchema = z.object({
  summary: sectionTitleField,
  experience: sectionTitleField,
  projects: sectionTitleField,
  education: sectionTitleField,
  skills: sectionTitleField,
  certifications: sectionTitleField,
} satisfies Record<SectionKey, typeof sectionTitleField>);

export const ResumeDesignSchema = z.object({
  accent: z.enum(DESIGN_ACCENTS).optional().catch(undefined),
  font: z.enum(DESIGN_FONTS).optional().catch(undefined),
  density: z.enum(DESIGN_DENSITIES).optional().catch(undefined),
});

function knownSectionKeys(value: unknown): SectionKey[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = value.filter(
    (key: unknown): key is SectionKey => SectionKeySchema.safeParse(key).success,
  );
  return [...new Set(keys)];
}

export const SavedRequirementSchema = z.object({
  text: text(SAVED_REQUIREMENT_LIMITS.textChars),
  importance: z.enum(["must", "nice"]).catch("nice"),
  terms: z
    .array(text(SAVED_REQUIREMENT_LIMITS.termChars))
    .max(SAVED_REQUIREMENT_LIMITS.terms)
    .catch([]),
});

export const TailorMetaSchema = z.object({
  baseResumeId: id,
  jobTitle: text(200),
  company: text(200),
  keywords: z.array(text(100)).max(60),
  createdAt: z.number(),
  coverLetter: text(COVER_LETTER_CHARS).optional(),
  jobText: text(JOB_TEXT_CHARS).optional(),
  jobUrl: text(2_048).optional(),
  requirements: z.array(SavedRequirementSchema).max(MAX_SAVED_REQUIREMENTS).optional(),
  jobId: z.uuid().optional().catch(undefined),
});

export const ResumeSourceSchema = z.enum(["import", "scratch", "sample", "tailored"]);

export const TemplateIdSchema = z.enum(TEMPLATE_IDS);

export const ResumeSchema = z.object({
  id,
  version: z.literal(1),
  title: text(200),
  basics: BasicsSchema,
  summary: text(3_000),
  experience: z.array(ExperienceSchema).max(40),
  education: z.array(EducationSchema).max(20),
  projects: z.array(ProjectSchema).max(30),
  skills: z.array(SkillGroupSchema).max(30),
  certifications: z.array(CertificationSchema).max(40),
  sectionOrder: z.array(SectionKeySchema).max(SECTION_KEYS.length),
  source: ResumeSourceSchema,
  tailor: TailorMetaSchema.nullable(),
  template: TemplateIdSchema.default(DEFAULT_TEMPLATE).catch(DEFAULT_TEMPLATE).optional(),
  extras: z.array(ExtraSectionSchema).max(MAX_EXTRA_SECTIONS).default([]).optional(),
  sectionTitles: SectionTitlesSchema.optional().catch(undefined),
  hiddenSections: z
    .array(SectionKeySchema)
    .max(SECTION_KEYS.length)
    .optional()
    .catch((ctx) => knownSectionKeys(ctx.value)),
  design: ResumeDesignSchema.optional().catch(undefined),
  // The language the resume is written in; absent means detect it from the text.
  lang: z.enum(CONTENT_LANGS).optional().catch(undefined),
  createdAt: z.number(),
  updatedAt: z.number(),
});
