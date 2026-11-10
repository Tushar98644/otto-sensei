import { z } from "zod";

// The one shape every part of the app agrees on. Client-safe: no server imports.
// Length caps exist so a PUT to /api/resumes can't store unbounded blobs.

const text = (max = 2_000) => z.string().max(max);
const id = z.string().min(1).max(64);

// Fields added after launch are optional in the type, because copies in localStorage are never
// re-parsed. Flags, kinds and look settings fall back on a bad value (`.catch`), so one unknown
// setting never fails a whole saved resume. Content caps stay strict like every other field: a
// silent fallback there would drop the person's words from the cloud copy.
const hiddenFlag = z.boolean().optional().catch(undefined);

// A 250-word letter is about 1,700 characters; the rest is room for the person's own edits.
export const COVER_LETTER_CHARS = 5_000;
// The same cap /api/tailor puts on a job post (TEXT_LIMITS.jobPostChars), so any post that could be
// tailored to fits on its copy.
export const JOB_TEXT_CHARS = 20_000;
export const MAX_SAVED_REQUIREMENTS = 40;

export const SECTION_KEYS = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
] as const;
export const SectionKeySchema = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof SectionKeySchema>;

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
};

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...SECTION_KEYS];

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
  // Dates stay as the user wrote them ("Jan 2022", "2019", "Present").
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
  // Added after launch, so optional: a project saved before them prints without dates or tools.
  startDate: text(50).optional(),
  endDate: text(50).optional(),
  // The tools it was built with, as written ("TypeScript, PostgreSQL").
  tech: text(300).optional(),
  bullets: z.array(BulletSchema).max(20),
  hidden: hiddenFlag,
});

export const SkillGroupSchema = z.object({
  id,
  // Empty label means a flat, ungrouped list.
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

// Sections beyond the standard six. They aren't in `sectionOrder`: they print after the ordered
// sections, in array order.
export const EXTRA_KINDS = [
  "languages",
  "awards",
  "volunteering",
  "publications",
  "custom",
] as const;
export const ExtraKindSchema = z.enum(EXTRA_KINDS);
export type ExtraKind = z.infer<typeof ExtraKindSchema>;

export const EXTRA_KIND_LABELS: Record<ExtraKind, string> = {
  languages: "Languages",
  awards: "Awards",
  volunteering: "Volunteering",
  publications: "Publications",
  custom: "Custom section",
};

export const MAX_EXTRA_SECTIONS = 10;
export const MAX_EXTRA_ITEMS = 30;

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
  // A kind this build doesn't know keeps its title and items as a custom section.
  kind: ExtraKindSchema.catch("custom"),
  title: text(100),
  items: z.array(ExtraItemSchema).max(MAX_EXTRA_ITEMS),
  hidden: hiddenFlag,
});

export const MAX_SECTION_TITLE_CHARS = 60;
const sectionTitleField = text(MAX_SECTION_TITLE_CHARS).optional().catch(undefined);

// The person's own heading for a standard section ("Work history" for Experience). A bad title
// falls back to the standard label and unknown keys are dropped, so the rest are kept.
export const SectionTitlesSchema = z.object({
  summary: sectionTitleField,
  experience: sectionTitleField,
  projects: sectionTitleField,
  education: sectionTitleField,
  skills: sectionTitleField,
  certifications: sectionTitleField,
} satisfies Record<SectionKey, typeof sectionTitleField>);

export const DESIGN_ACCENTS = ["ink", "forest", "navy", "burgundy", "slate"] as const;
export const DESIGN_FONTS = ["sans", "serif"] as const;
export const DESIGN_DENSITIES = ["normal", "compact"] as const;
export type DesignAccent = (typeof DESIGN_ACCENTS)[number];
export type DesignFont = (typeof DESIGN_FONTS)[number];
export type DesignDensity = (typeof DESIGN_DENSITIES)[number];

// Look settings on top of the format. An unset value means the format's own choice, so resumes
// saved before these existed print exactly as they did.
export const ResumeDesignSchema = z.object({
  accent: z.enum(DESIGN_ACCENTS).optional().catch(undefined),
  font: z.enum(DESIGN_FONTS).optional().catch(undefined),
  density: z.enum(DESIGN_DENSITIES).optional().catch(undefined),
});

// Keeps the known keys of a bad list (an unknown key, a repeat past the cap) instead of showing
// every section the person hid.
function knownSectionKeys(value: unknown): SectionKey[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = value.filter(
    (key: unknown): key is SectionKey => SectionKeySchema.safeParse(key).success,
  );
  return [...new Set(keys)];
}

// One thing the job asked for, as the screener read it.
export const SavedRequirementSchema = z.object({
  text: text(300),
  importance: z.enum(["must", "nice"]).catch("nice"),
  terms: z.array(text(100)).max(8).catch([]),
});

export const TailorMetaSchema = z.object({
  baseResumeId: id,
  jobTitle: text(200),
  company: text(200),
  keywords: z.array(text(100)).max(60),
  createdAt: z.number(),
  // The latest cover letter written for this job, as the person last edited it. Optional so copies
  // saved before letters existed still parse.
  coverLetter: text(COVER_LETTER_CHARS).optional(),
  // The job itself, so interview prep, skill gaps and the send check use the real post rather
  // than the keywords. Optional: copies made before these existed have none.
  jobText: text(JOB_TEXT_CHARS).optional(),
  jobUrl: text(2_048).optional(),
  requirements: z.array(SavedRequirementSchema).max(MAX_SAVED_REQUIREMENTS).optional(),
  // The Jobs tab opening it was tailored for, so the job, this copy and its application find each
  // other by id. A bad value is dropped rather than failing the whole resume.
  jobId: z.uuid().optional().catch(undefined),
});

export const ResumeSourceSchema = z.enum(["import", "scratch", "sample", "tailored"]);

// PDF formats (src/lib/pdf/templates.ts has their names). All are one column of real text, so the
// choice changes only how the page looks, never what hiring software can read.
export const TEMPLATE_IDS = [
  "classic",
  "modern",
  "compact",
  "executive",
  "developer",
  "minimal",
] as const;
export const TemplateIdSchema = z.enum(TEMPLATE_IDS);
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export const DEFAULT_TEMPLATE: TemplateId = "classic";

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
  // Resumes saved before formats existed parse as "classic", and so does an id this build doesn't
  // know: a dropped format must never make a whole resume fail validation. Optional in the type
  // because copies in localStorage are never re-parsed: read it with templateOf() from
  // @/lib/pdf/templates.
  template: TemplateIdSchema.default(DEFAULT_TEMPLATE).catch(DEFAULT_TEMPLATE).optional(),
  // Read these four with extrasOf(), sectionTitleOf() and isSectionHidden() below, and treat a
  // missing `design` as the format's own look.
  extras: z.array(ExtraSectionSchema).max(MAX_EXTRA_SECTIONS).default([]).optional(),
  sectionTitles: SectionTitlesSchema.optional().catch(undefined),
  hiddenSections: z
    .array(SectionKeySchema)
    .max(SECTION_KEYS.length)
    .optional()
    .catch((ctx) => knownSectionKeys(ctx.value)),
  design: ResumeDesignSchema.optional().catch(undefined),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Bullet = z.infer<typeof BulletSchema>;
export type ResumeLink = z.infer<typeof LinkSchema>;
export type Basics = z.infer<typeof BasicsSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type ExtraItem = z.infer<typeof ExtraItemSchema>;
export type ExtraSection = z.infer<typeof ExtraSectionSchema>;
export type SectionTitles = z.infer<typeof SectionTitlesSchema>;
export type ResumeDesign = z.infer<typeof ResumeDesignSchema>;
export type TailorMeta = z.infer<typeof TailorMetaSchema>;
export type SavedRequirement = z.infer<typeof SavedRequirementSchema>;
export type ResumeSource = z.infer<typeof ResumeSourceSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyResume(now = Date.now()): Resume {
  return {
    id: newId(),
    version: 1,
    title: "My resume",
    basics: { name: "", headline: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "scratch",
    tailor: null,
    template: DEFAULT_TEMPLATE,
    extras: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function newBullet(text = ""): Bullet {
  return { id: newId(), text };
}

export function newExperience(): Experience {
  return {
    id: newId(),
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    bullets: [newBullet()],
  };
}

export function newEducation(): Education {
  return {
    id: newId(),
    school: "",
    degree: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    bullets: [],
  };
}

export function newProject(): Project {
  return { id: newId(), name: "", link: "", bullets: [newBullet()] };
}

export function newSkillGroup(label = ""): SkillGroup {
  return { id: newId(), label, items: [] };
}

export function newCertification(): Certification {
  return { id: newId(), name: "", issuer: "", date: "" };
}

export function newExtraItem(): ExtraItem {
  return { id: newId(), title: "", subtitle: "", date: "", detail: "", bullets: [] };
}

export function newExtraSection(kind: ExtraKind): ExtraSection {
  // "Custom section" names the menu choice; on the page it starts as a heading that reads well
  // until the person renames it.
  const title = kind === "custom" ? "Additional information" : EXTRA_KIND_LABELS[kind];
  return { id: newId(), kind, title, items: [newExtraItem()] };
}

export function extrasOf(resume: Resume): ExtraSection[] {
  return resume.extras ?? [];
}

export function sectionTitleOf(resume: Resume, key: SectionKey): string {
  return resume.sectionTitles?.[key]?.trim() || SECTION_LABELS[key];
}

export function isSectionHidden(resume: Resume, key: SectionKey): boolean {
  return resume.hiddenSections?.includes(key) ?? false;
}
