import type { JsonLdData } from "@/lib/seo/json-ld";
import type { PortfolioContentView } from "./content";
import { contentUsesFor } from "./content-uses";
import type { PortfolioTemplateId } from "./types";
import type { PortfolioView } from "./view";

// Email and phone never go in, even when shown: a machine-readable copy only helps spammers.

const DRAWS: Record<PortfolioTemplateId, { skills: boolean; education: boolean }> = {
  navy: { skills: true, education: false },
  dock: { skills: true, education: true },
  reel: { skills: false, education: false },
  bento: { skills: true, education: false },
  cv: { skills: true, education: true },
  prose: { skills: false, education: false },
  folio: { skills: false, education: false },
  paper: { skills: false, education: true },
  gazette: { skills: true, education: true },
  terminal: { skills: true, education: true },
  brutal: { skills: true, education: true },
  card: { skills: true, education: true },
};

const LIMITS = { description: 300, sameAs: 12, employers: 5, schools: 10, skills: 40 } as const;

const unique = (items: readonly string[]) => [...new Set(items.filter(Boolean))];

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export type ProfileJsonLdInput = {
  view: PortfolioView;
  content: PortfolioContentView;
  template: PortfolioTemplateId;
  url: string;
  updatedAt: number;
};

export function profilePageJsonLd({
  view,
  content,
  template,
  url,
  updatedAt,
}: ProfileJsonLdInput): JsonLdData | null {
  if (!view.name) return null;
  const draws = DRAWS[template];
  const city = contentUsesFor(template).includes("location") ? content.location?.city : "";
  const sameAs = unique(
    content.socials
      .filter((social) => social.kind !== "email" && /^https?:\/\//i.test(social.href))
      .map((social) => social.href),
  ).slice(0, LIMITS.sameAs);
  const employers = unique(
    content.experience.filter((job) => job.current).map((job) => job.company),
  ).slice(0, LIMITS.employers);
  const schools = draws.education
    ? unique(content.education.map((school) => school.school)).slice(0, LIMITS.schools)
    : [];
  const skills = draws.skills
    ? unique(content.skills.flatMap((group) => group.items.map((item) => item.name))).slice(
        0,
        LIMITS.skills,
      )
    : [];
  const about = content.about[0] ?? "";

  const person: JsonLdData = {
    "@type": "Person",
    name: view.name,
    url,
    ...(view.headline ? { jobTitle: view.headline } : {}),
    ...(about ? { description: clip(about, LIMITS.description) } : {}),
    ...(city && !/\bremote\b/i.test(city)
      ? { address: { "@type": "PostalAddress", addressLocality: city } }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(employers.length > 0
      ? { worksFor: employers.map((name) => ({ "@type": "Organization", name })) }
      : {}),
    ...(schools.length > 0
      ? { alumniOf: schools.map((name) => ({ "@type": "EducationalOrganization", name })) }
      : {}),
    ...(skills.length > 0 ? { knowsAbout: skills } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    dateModified: new Date(updatedAt).toISOString(),
    mainEntity: person,
  };
}
