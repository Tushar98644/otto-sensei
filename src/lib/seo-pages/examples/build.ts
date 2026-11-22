import {
  DEFAULT_SECTION_ORDER,
  newBullet,
  newId,
  type Basics,
  type Certification,
  type Education,
  type Experience,
  type Project,
  type Resume,
  type SectionKey,
  type SkillGroup,
  type TemplateId,
} from "@/lib/resume/schema";

export type JobInput = Omit<Experience, "id" | "bullets" | "location"> & {
  location?: string;
  bullets: readonly string[];
};

export type SchoolInput = Omit<Education, "id" | "bullets" | "location" | "startDate"> & {
  location?: string;
  startDate?: string;
  bullets?: readonly string[];
};

export type ProjectInput = Omit<Project, "id" | "bullets" | "link"> & {
  link?: string;
  bullets: readonly string[];
};

export type ResumeInput = {
  title: string;
  basics: Omit<Basics, "links"> & { links?: readonly { label: string; url: string }[] };
  summary: string;
  experience?: readonly JobInput[];
  education: readonly SchoolInput[];
  projects?: readonly ProjectInput[];
  skills: readonly { label: string; items: readonly string[] }[];
  certifications?: readonly Omit<Certification, "id">[];
  sectionOrder?: readonly SectionKey[];
  template: TemplateId;
};

const bullets = (lines: readonly string[] = []) => lines.map((text) => newBullet(text));

// Every call makes fresh ids, so each copy opened in the studio is its own resume.
export function buildResume(input: ResumeInput, now = Date.now()): Resume {
  const { links = [], ...basics } = input.basics;
  return {
    id: newId(),
    version: 1,
    title: input.title,
    basics: { ...basics, links: links.map((link) => ({ id: newId(), ...link })) },
    summary: input.summary,
    experience: (input.experience ?? []).map(({ bullets: lines, location = "", ...job }) => ({
      id: newId(),
      location,
      ...job,
      bullets: bullets(lines),
    })),
    education: input.education.map(
      ({ bullets: lines, location = "", startDate = "", ...school }) => ({
        id: newId(),
        location,
        startDate,
        ...school,
        bullets: bullets(lines),
      }),
    ),
    projects: (input.projects ?? []).map(({ bullets: lines, link = "", ...project }) => ({
      id: newId(),
      link,
      ...project,
      bullets: bullets(lines),
    })),
    skills: input.skills.map((group): SkillGroup => ({
      id: newId(),
      label: group.label,
      items: [...group.items],
    })),
    certifications: (input.certifications ?? []).map((item) => ({ id: newId(), ...item })),
    sectionOrder: [...(input.sectionOrder ?? DEFAULT_SECTION_ORDER)],
    source: "scratch",
    tailor: null,
    template: input.template,
    extras: [],
    createdAt: now,
    updatedAt: now,
  };
}
