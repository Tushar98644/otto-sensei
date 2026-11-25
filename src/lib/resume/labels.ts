import type { ContentLang } from "@/lib/i18n/languages";
import {
  EXTRA_KIND_LABELS,
  SECTION_LABELS,
  type ExtraKind,
  type ExtraSection,
  type Resume,
  type SectionKey,
} from "./schema";

// Headings printed on the resume itself, so they follow the resume's language, not the app's.

const ADDITIONAL = "Additional information";

const SECTION_HEADINGS: Record<ContentLang, Record<SectionKey, string>> = {
  en: SECTION_LABELS,
  es: {
    summary: "Perfil",
    experience: "Experiencia",
    projects: "Proyectos",
    education: "Educación",
    skills: "Habilidades",
    certifications: "Certificaciones",
  },
  pt: {
    summary: "Resumo",
    experience: "Experiência",
    projects: "Projetos",
    education: "Formação",
    skills: "Habilidades",
    certifications: "Certificações",
  },
  fr: {
    summary: "Profil",
    experience: "Expérience",
    projects: "Projets",
    education: "Formation",
    skills: "Compétences",
    certifications: "Certifications",
  },
  de: {
    summary: "Profil",
    experience: "Berufserfahrung",
    projects: "Projekte",
    education: "Ausbildung",
    skills: "Kenntnisse",
    certifications: "Zertifikate",
  },
};

const EXTRA_HEADINGS: Record<ContentLang, Record<ExtraKind, string>> = {
  en: { ...EXTRA_KIND_LABELS, custom: ADDITIONAL },
  es: {
    languages: "Idiomas",
    awards: "Premios",
    volunteering: "Voluntariado",
    publications: "Publicaciones",
    custom: "Información adicional",
  },
  pt: {
    languages: "Idiomas",
    awards: "Prêmios",
    volunteering: "Voluntariado",
    publications: "Publicações",
    custom: "Informações adicionais",
  },
  fr: {
    languages: "Langues",
    awards: "Distinctions",
    volunteering: "Bénévolat",
    publications: "Publications",
    custom: "Informations complémentaires",
  },
  de: {
    languages: "Sprachen",
    awards: "Auszeichnungen",
    volunteering: "Ehrenamt",
    publications: "Publikationen",
    custom: "Weitere Informationen",
  },
};

const DOCUMENT_TITLES: Record<ContentLang, { resume: string; letter: string }> = {
  en: { resume: "Resume", letter: "Cover letter" },
  es: { resume: "Currículum", letter: "Carta de presentación" },
  pt: { resume: "Currículo", letter: "Carta de apresentação" },
  fr: { resume: "CV", letter: "Lettre de motivation" },
  de: { resume: "Lebenslauf", letter: "Anschreiben" },
};

export function sectionHeadingIn(key: SectionKey, lang: ContentLang): string {
  return SECTION_HEADINGS[lang][key];
}

export function extraHeadingIn(kind: ExtraKind, lang: ContentLang): string {
  return EXTRA_HEADINGS[lang][kind];
}

export function documentTitles(lang: ContentLang): { resume: string; letter: string } {
  return DOCUMENT_TITLES[lang];
}

// The person's own title wins; one still reading as the English default takes the resume's language.
export function sectionHeading(resume: Resume, key: SectionKey, lang: ContentLang): string {
  const own = resume.sectionTitles?.[key]?.trim();
  if (own && (lang === "en" || own !== SECTION_LABELS[key])) return own;
  return sectionHeadingIn(key, lang);
}

export function extraHeading(section: ExtraSection, lang: ContentLang): string {
  const own = section.title.trim();
  const englishDefault = own === EXTRA_KIND_LABELS[section.kind] || own === ADDITIONAL;
  if (own && (lang === "en" || !englishDefault)) return own;
  return extraHeadingIn(section.kind, lang);
}
