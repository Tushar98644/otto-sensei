import type { z } from "zod";
import type {
  BasicsSchema,
  BulletSchema,
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  ExtraItemSchema,
  ExtraKindSchema,
  ExtraSectionSchema,
  LinkSchema,
  ProjectSchema,
  ResumeDesignSchema,
  ResumeSchema,
  ResumeSourceSchema,
  SavedRequirementSchema,
  SectionKeySchema,
  SectionTitlesSchema,
  SkillGroupSchema,
  TailorMetaSchema,
  TemplateIdSchema,
} from "./validation";

export const COVER_LETTER_CHARS = 5_000;
export const JOB_TEXT_CHARS = 20_000;
export const MAX_SAVED_REQUIREMENTS = 40;
export const SAVED_REQUIREMENT_LIMITS = { textChars: 300, terms: 8, termChars: 100 } as const;

export const SECTION_KEYS = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
] as const;
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

export const EXTRA_KINDS = [
  "languages",
  "awards",
  "volunteering",
  "publications",
  "custom",
] as const;
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

export const MAX_SECTION_TITLE_CHARS = 60;

export const DESIGN_ACCENTS = ["ink", "forest", "navy", "burgundy", "slate"] as const;
export const DESIGN_FONTS = ["sans", "serif"] as const;
export const DESIGN_DENSITIES = ["normal", "compact"] as const;
export type DesignAccent = (typeof DESIGN_ACCENTS)[number];
export type DesignFont = (typeof DESIGN_FONTS)[number];
export type DesignDensity = (typeof DESIGN_DENSITIES)[number];

export const TEMPLATE_IDS = [
  "classic",
  "modern",
  "compact",
  "executive",
  "developer",
  "minimal",
] as const;
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export const DEFAULT_TEMPLATE: TemplateId = "classic";

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
