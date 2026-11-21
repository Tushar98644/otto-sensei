import {
  EXTRA_KIND_LABELS,
  extrasOf,
  isSectionHidden,
  newId,
  newSkillGroup,
  sectionTitleOf,
  type Bullet,
  type ExtraSection,
  type Resume,
  type SectionKey,
} from "./schema";

export type EntrySection = "experience" | "education" | "projects";
export type BulletSection = EntrySection | "extras";

export type BulletRef = {
  bulletId: string;
  text: string;
  section: BulletSection;
  parentId: string;
  parentLabel: string;
  roleTitle: string;
  company: string;
};

type Hideable = { hidden?: boolean };

export function isHidden(item: Hideable): boolean {
  return item.hidden === true;
}

function shown<T extends Hideable>(items: readonly T[]): T[] {
  return items.filter((item) => !isHidden(item));
}

export type ListBulletsOptions = {
  includeHidden?: boolean;
};

export function extraSectionTitle(section: Pick<ExtraSection, "kind" | "title">): string {
  return section.title.trim() || EXTRA_KIND_LABELS[section.kind];
}

export function listBullets(resume: Resume, options: ListBulletsOptions = {}): BulletRef[] {
  const all = options.includeHidden === true;
  const keep = <T extends Hideable>(items: readonly T[]): readonly T[] =>
    all ? items : shown(items);
  const open = (key: SectionKey) => all || !isSectionHidden(resume, key);
  const refs: BulletRef[] = [];
  const add = (bullets: readonly Bullet[], owner: Omit<BulletRef, "bulletId" | "text">) => {
    for (const bullet of keep(bullets))
      refs.push({ bulletId: bullet.id, text: bullet.text, ...owner });
  };
  if (open("experience")) {
    for (const job of keep(resume.experience)) {
      add(job.bullets, {
        section: "experience",
        parentId: job.id,
        parentLabel: [job.title, job.company].filter(Boolean).join(" at ") || "Experience",
        roleTitle: job.title,
        company: job.company,
      });
    }
  }
  if (open("projects")) {
    for (const project of keep(resume.projects)) {
      add(project.bullets, {
        section: "projects",
        parentId: project.id,
        parentLabel: project.name || "Project",
        roleTitle: project.name,
        company: "",
      });
    }
  }
  if (open("education")) {
    for (const school of keep(resume.education)) {
      add(school.bullets, {
        section: "education",
        parentId: school.id,
        parentLabel: [school.degree, school.school].filter(Boolean).join(", ") || "Education",
        roleTitle: school.degree,
        company: school.school,
      });
    }
  }
  for (const extra of keep(extrasOf(resume))) {
    const joiner = extra.kind === "volunteering" ? " at " : ", ";
    for (const item of keep(extra.items)) {
      add(item.bullets, {
        section: "extras",
        parentId: item.id,
        parentLabel:
          [item.title, item.subtitle].filter(Boolean).join(joiner) || extraSectionTitle(extra),
        roleTitle: item.title,
        company: item.subtitle,
      });
    }
  }
  return refs;
}

export function findBullet(resume: Resume, bulletId: string): BulletRef | null {
  return (
    listBullets(resume, { includeHidden: true }).find((ref) => ref.bulletId === bulletId) ?? null
  );
}

export function setBulletText(resume: Resume, bulletId: string, text: string): Resume {
  const has = (item: { bullets: { id: string }[] }) => item.bullets.some((b) => b.id === bulletId);
  const update = <T extends { bullets: Bullet[] }>(items: T[]): T[] =>
    items.map((item) =>
      has(item)
        ? { ...item, bullets: item.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)) }
        : item,
    );
  const next: Resume = {
    ...resume,
    experience: update(resume.experience),
    projects: update(resume.projects),
    education: update(resume.education),
  };
  if (resume.extras) {
    next.extras = resume.extras.map((section) =>
      section.items.some(has) ? { ...section, items: update(section.items) } : section,
    );
  }
  return next;
}

export function visibleResume(resume: Resume): Resume {
  const off = (key: SectionKey) => isSectionHidden(resume, key);
  const withLines = <T extends { bullets: Bullet[] }>(item: T): T =>
    item.bullets.some(isHidden) ? { ...item, bullets: shown(item.bullets) } : item;
  return {
    ...resume,
    summary: off("summary") ? "" : resume.summary,
    experience: off("experience") ? [] : shown(resume.experience).map(withLines),
    education: off("education") ? [] : shown(resume.education).map(withLines),
    projects: off("projects") ? [] : shown(resume.projects).map(withLines),
    skills: off("skills") ? [] : shown(resume.skills),
    certifications: off("certifications") ? [] : shown(resume.certifications),
    sectionOrder: resume.sectionOrder.filter((key) => !off(key)),
    hiddenSections: [],
    extras: shown(extrasOf(resume)).map((section) => ({
      ...section,
      items: shown(section.items).map(withLines),
    })),
  };
}

export function touch(resume: Resume, now = Date.now()): Resume {
  return { ...resume, updatedAt: now };
}

// Copies keep nested ids so a tailor result (base bullet ids) still applies to the copy.
export function cloneResume(
  resume: Resume,
  overrides: Partial<Resume> = {},
  now = Date.now(),
): Resume {
  const copy = structuredClone(resume);
  return { ...copy, id: newId(), createdAt: now, updatedAt: now, ...overrides };
}

export function reorderBullets(resume: Resume, experienceId: string, orderedIds: string[]): Resume {
  const job = resume.experience.find((j) => j.id === experienceId);
  if (!job) return resume;
  const permutes = (ids: readonly string[]) =>
    orderedIds.length === ids.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((bulletId) => ids.includes(bulletId));
  const byId = new Map(job.bullets.map((b) => [b.id, b]));
  const ordered = orderedIds.map((bulletId) => byId.get(bulletId)!);
  let bullets: Bullet[];
  if (permutes(job.bullets.map((b) => b.id))) {
    bullets = ordered;
  } else if (job.bullets.some(isHidden) && permutes(shown(job.bullets).map((b) => b.id))) {
    let next = 0;
    bullets = job.bullets.map((bullet) => (isHidden(bullet) ? bullet : ordered[next++]!));
  } else {
    return resume;
  }
  return {
    ...resume,
    experience: resume.experience.map((j) => (j.id === experienceId ? { ...j, bullets } : j)),
  };
}

const MAX_GROUP_ITEMS = 100;
const MAX_GROUPS = 30;

export function addSkills(resume: Resume, items: string[]): Resume {
  const seen = new Set(
    shown(resume.skills).flatMap((g) => g.items.map((s) => s.trim().toLowerCase())),
  );
  const fresh: string[] = [];
  for (const raw of items) {
    const skill = raw.trim();
    const key = skill.toLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key);
    fresh.push(skill);
  }
  if (fresh.length === 0) return resume;
  const at = resume.skills.findIndex((group) => !isHidden(group));
  const target = resume.skills[at];
  if (!target) {
    if (resume.skills.length >= MAX_GROUPS) return resume;
    const group = { ...newSkillGroup(""), items: fresh.slice(0, MAX_GROUP_ITEMS) };
    return { ...resume, skills: [group, ...resume.skills] };
  }
  const room = Math.max(0, MAX_GROUP_ITEMS - target.items.length);
  if (room === 0) return resume;
  const grown = { ...target, items: [...target.items, ...fresh.slice(0, room)] };
  return { ...resume, skills: resume.skills.map((group, index) => (index === at ? grown : group)) };
}

export function displayName(resume: Resume): string {
  return resume.basics.name.trim() || "Untitled resume";
}

export const TITLE_MAX = 200;

export function resumeTitle(resume: Resume): string {
  return resume.title.trim() || displayName(resume);
}

export function cleanTitle(draft: string): string {
  return draft.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX).trim();
}

export function titleKey(title: string): string {
  return cleanTitle(title).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isTitleTaken(title: string, resumes: Iterable<Resume>, exceptId?: string): boolean {
  const key = titleKey(title);
  for (const resume of resumes) {
    if (resume.id !== exceptId && titleKey(resumeTitle(resume)) === key) return true;
  }
  return false;
}

export function uniqueTitle(wanted: string, resumes: Iterable<Resume>, exceptId?: string): string {
  const list = [...resumes];
  const base = cleanTitle(wanted);
  if (!isTitleTaken(base, list, exceptId)) return base;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = `${base.slice(0, TITLE_MAX - suffix.length).trim()}${suffix}`;
    if (!isTitleTaken(candidate, list, exceptId)) return candidate;
  }
}

export function titleFromFileName(fileName: string): string {
  return cleanTitle(fileName.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_-]+/g, " "));
}

export function uploadTitle(resume: Resume, fileName: string): string {
  return cleanTitle(resume.basics.name) || titleFromFileName(fileName) || resume.title;
}

export function copyTitle(resume: Resume): string {
  const suffix = " (copy)";
  return `${resumeTitle(resume)
    .slice(0, TITLE_MAX - suffix.length)
    .trim()}${suffix}`;
}

function fileNamePart(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function suggestedFileName(resume: Resume): string {
  const parts = [fileNamePart(resume.basics.name), fileNamePart(resume.tailor?.company ?? "")];
  return [...parts.filter(Boolean), "Resume"].join("-") + ".pdf";
}

function bulletLines(bullets: { text: string }[]): string[] {
  return bullets.filter((b) => b.text.trim() !== "").map((b) => `- ${b.text}`);
}

function sectionText(resume: Resume, key: SectionKey): string[] {
  switch (key) {
    case "summary":
      return resume.summary ? [resume.summary] : [];
    case "experience":
      return resume.experience.flatMap((job) => [
        [job.title, job.company, job.location].filter(Boolean).join(" | "),
        [job.startDate, job.endDate].filter(Boolean).join(" - "),
        ...bulletLines(job.bullets),
      ]);
    case "projects":
      return resume.projects.flatMap((p) => [
        [p.name, p.link].filter(Boolean).join(" | "),
        ...bulletLines(p.bullets),
      ]);
    case "education":
      return resume.education.flatMap((e) => [
        [e.degree, e.field, e.school, e.location].filter(Boolean).join(" | "),
        [e.startDate, e.endDate].filter(Boolean).join(" - "),
        ...bulletLines(e.bullets),
      ]);
    case "skills":
      return resume.skills.map((g) =>
        g.label ? `${g.label}: ${g.items.join(", ")}` : g.items.join(", "),
      );
    case "certifications":
      return resume.certifications.map((c) =>
        [c.name, c.issuer, c.date].filter(Boolean).join(" | "),
      );
  }
}

function extraText(section: ExtraSection): string[] {
  return section.items.flatMap((item) => [
    [item.title, item.subtitle, item.date]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" | "),
    item.detail,
    ...bulletLines(item.bullets),
  ]);
}

function block(title: string, lines: readonly string[]): string[] {
  const kept = lines.filter((line) => line.trim() !== "");
  return kept.length ? ["", title.toUpperCase(), ...kept] : [];
}

export function resumeToText(resume: Resume): string {
  const shownResume = visibleResume(resume);
  const { basics } = shownResume;
  const header = [
    basics.name,
    basics.headline,
    [basics.email, basics.phone, basics.location].filter(Boolean).join(" | "),
    basics.links
      .map((l) => l.url.trim())
      .filter(Boolean)
      .join(" | "),
  ].filter(Boolean);
  const body = shownResume.sectionOrder.flatMap((key) =>
    block(sectionTitleOf(resume, key), sectionText(shownResume, key)),
  );
  const extras = extrasOf(shownResume).flatMap((section) =>
    block(extraSectionTitle(section), extraText(section)),
  );
  return [...header, ...body, ...extras].join("\n").trim();
}
