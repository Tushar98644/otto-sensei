import { detectLanguage, type Detection } from "@/lib/i18n/detect";
import { DEFAULT_CONTENT_LANG, type ContentLang } from "@/lib/i18n/languages";
import { extrasOf, type Bullet, type Resume } from "./schema";

const lines = (bullets: readonly Bullet[]) => bullets.map((bullet) => bullet.text);

// The words a person wrote themselves; names, companies, links and skill items say little about the language.
export function resumeProse(resume: Resume): string {
  return [
    resume.basics.headline,
    resume.summary,
    ...resume.experience.flatMap((job) => [job.title, ...lines(job.bullets)]),
    ...resume.education.flatMap((school) => [
      school.degree,
      school.field,
      ...lines(school.bullets),
    ]),
    ...resume.projects.flatMap((project) => lines(project.bullets)),
    ...resume.skills.map((group) => group.label),
    ...extrasOf(resume).flatMap((section) =>
      section.items.flatMap((item) => [item.subtitle, item.detail, ...lines(item.bullets)]),
    ),
  ]
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
}

export function detectResumeLang(resume: Resume): Detection {
  return detectLanguage(resumeProse(resume));
}

const detected = new WeakMap<Resume, ContentLang>();

// The language set on the resume, else the one its text reads as, else English.
export function resumeLang(resume: Resume): ContentLang {
  if (resume.lang) return resume.lang;
  const cached = detected.get(resume);
  if (cached) return cached;
  const { lang } = detectResumeLang(resume);
  const found = lang === "unknown" ? DEFAULT_CONTENT_LANG : lang;
  detected.set(resume, found);
  return found;
}

// On import and creation: records a language other than English, so English resumes keep their shape.
export function withDetectedLang<T extends Resume>(resume: T): T {
  if (resume.lang) return resume;
  const { lang } = detectResumeLang(resume);
  return lang === "unknown" || lang === DEFAULT_CONTENT_LANG ? resume : { ...resume, lang };
}

// For the language control: a language the person picked, or null to go back to detecting it.
export function setResumeLang<T extends Resume>(resume: T, lang: ContentLang | null): T {
  const next: T = { ...resume, lang: lang ?? undefined };
  if (lang === null) delete next.lang;
  return next;
}
