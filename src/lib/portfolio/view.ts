import { parseGitHubUsername } from "@/lib/github/username";
import { webLink } from "@/lib/pdf/links";
import { extrasOf, sectionTitleOf, type Resume } from "@/lib/resume/schema";
import { isLinkText } from "@/lib/resume/sections";
import { shareSnapshot } from "@/lib/share/snapshot";
import { PORTFOLIO_SECTIONS, type PortfolioSection, type PortfolioSettings } from "./types";

// Pure and client-safe. A resume as a portfolio page reads it: what every template draws, with
// the owner's privacy choices already applied. Templates get only this, never the resume, so a
// hidden section or a phone number can't slip into one of them.

export type PortfolioLink = {
  label: string;
  // "github.com/octocat": shorter than the address, and what a reader would type.
  text: string;
  // Only http(s) addresses become links.
  href: string | null;
  kind: "github" | "linkedin" | "web";
};

export type PortfolioProject = {
  id: string;
  name: string;
  href: string | null;
  // "github.com", "maya.dev"; "" without a link.
  host: string;
  // "octocat/otto-resume" for a GitHub repo, else null.
  repo: string | null;
  lines: string[];
};

export type PortfolioRole = {
  id: string;
  title: string;
  company: string;
  location: string;
  // "Jan 2022 – Present"; start and end as written, for templates that set them apart.
  dates: string;
  start: string;
  end: string;
  lines: string[];
};

export type PortfolioSchool = {
  id: string;
  school: string;
  degree: string;
  dates: string;
  start: string;
  end: string;
  lines: string[];
};
export type PortfolioSkillGroup = { id: string; label: string; items: string[] };
export type PortfolioCertification = { id: string; name: string; issuer: string; date: string };
export type PortfolioExtraItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  detail: string;
  lines: string[];
};
export type PortfolioExtra = { id: string; title: string; items: PortfolioExtraItem[] };

export type PortfolioView = {
  name: string;
  headline: string;
  location: string;
  // Null unless the owner turned it on.
  email: string | null;
  phone: string | null;
  about: string[];
  links: PortfolioLink[];
  // The GitHub profile, from the resume's links or its imported repos; null when there is none.
  github: PortfolioLink | null;
  projects: PortfolioProject[];
  experience: PortfolioRole[];
  skills: PortfolioSkillGroup[];
  education: PortfolioSchool[];
  certifications: PortfolioCertification[];
  extras: PortfolioExtra[];
  // The resume's own section headings ("Work history" for Experience).
  titles: Record<Exclude<PortfolioSection, "links" | "extras">, string>;
  // When the resume behind this copy was last edited (ms), for "Updated November 2026" lines.
  updatedAt: number;
  // The sections the owner hid, so what they wrote for them in the content editor (an edited
  // About, an added project, a hand-picked link) stays off the page too.
  hidden: PortfolioSection[];
};

export type ViewSettings = Pick<PortfolioSettings, "showEmail" | "showPhone" | "hiddenSections">;

// Control codes are icon-font glyphs a PDF read leaves behind.
const clean = (value: string) =>
  value
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const lines = (bullets: readonly { text: string }[]) =>
  bullets.map((b) => clean(b.text)).filter(Boolean);
const dates = (start: string, end: string) =>
  [clean(start), clean(end)].filter(Boolean).join(" – ");

const GITHUB_REPO = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+)/i;
const LINKEDIN = /(?:^|\/\/|\.)linkedin\.com\//i;

function repoOf(link: string): { owner: string; name: string } | null {
  const match = GITHUB_REPO.exec(link.trim());
  if (!match?.[1] || !match[2]) return null;
  const owner = parseGitHubUsername(match[1]);
  return owner ? { owner, name: match[2].replace(/\.git$/i, "") } : null;
}

function hostOf(href: string | null): string {
  if (!href) return "";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// A summary that is only the contact line ("° github.com/jane | jane@mail.com | +1 555..."), as
// older reads of icon-font resumes left it. It would show the phone on the page.
function isContactLine(paragraph: string, contact: readonly string[]): boolean {
  let rest = paragraph;
  for (const value of contact) rest = rest.split(value).join(" ");
  if (rest === paragraph) return false;
  return rest
    .split(/[\s|•·,;]+/)
    .every(
      (token) => token.length <= 1 || /[@/]|\.[a-z]{2,}$/i.test(token) || !/\p{L}{2}/u.test(token),
    );
}

function toLink(label: string, url: string): PortfolioLink | null {
  const link = webLink(url, clean);
  if (!link) return null;
  const kind = parseGitHubUsername(url) ? "github" : LINKEDIN.test(url) ? "linkedin" : "web";
  return { label: clean(label) || link.text, text: link.text, href: link.href, kind };
}

function githubProfile(resume: Resume, links: PortfolioLink[]): PortfolioLink | null {
  const own = links.find((link) => link.kind === "github");
  if (own) return own;
  // Repos brought in by "Import from GitHub" name their owner; their most common one is the person.
  const owners = new Map<string, number>();
  for (const project of resume.projects) {
    const repo = repoOf(project.link);
    if (repo) owners.set(repo.owner, (owners.get(repo.owner) ?? 0) + 1);
  }
  const [owner] = [...owners.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!owner) return null;
  return {
    label: "GitHub",
    text: `github.com/${owner}`,
    href: `https://github.com/${owner}`,
    kind: "github",
  };
}

/** The page's content for this resume and these settings. */
export function portfolioView(source: Resume, settings: ViewSettings): PortfolioView {
  // The same copy a share link keeps: hidden lines, entries and sections stay out.
  const resume = shareSnapshot(source);
  const hidden = new Set(settings.hiddenSections);
  const on = (section: PortfolioSection) => !hidden.has(section);
  const { basics } = resume;

  const links = on("links")
    ? basics.links.map((link) => toLink(link.label, link.url)).filter((link) => link !== null)
    : [];
  const contact = [basics.email, basics.phone, ...basics.links.map((link) => link.url)]
    .map(clean)
    .filter(Boolean);
  const headline = clean(basics.headline);
  // Written into the summary, a hidden email or phone would still reach the page.
  const hiddenContact = [
    settings.showEmail ? "" : clean(basics.email),
    settings.showPhone ? "" : clean(basics.phone),
  ].filter(Boolean);
  const withoutHidden = (text: string) =>
    clean(hiddenContact.reduce((rest, value) => rest.split(value).join(""), text));

  return {
    name: clean(basics.name),
    headline: isLinkText(headline) ? "" : headline,
    location: clean(basics.location),
    email: settings.showEmail && clean(basics.email) ? clean(basics.email) : null,
    phone: settings.showPhone && clean(basics.phone) ? clean(basics.phone) : null,
    about: on("about")
      ? resume.summary
          .split(/\n+/)
          .map(clean)
          .filter((paragraph) => paragraph && !isContactLine(paragraph, contact))
          .map(withoutHidden)
      : [],
    links,
    github: on("links") ? githubProfile(resume, links) : null,
    projects: on("projects")
      ? resume.projects
          .filter((project) => clean(project.name) || lines(project.bullets).length > 0)
          .map((project) => {
            const link = project.link.trim() ? webLink(project.link, clean) : null;
            const repo = repoOf(project.link);
            return {
              id: project.id,
              name: clean(project.name) || (repo?.name ?? "Project"),
              href: link?.href ?? null,
              host: hostOf(link?.href ?? null),
              repo: repo ? `${repo.owner}/${repo.name}` : null,
              lines: lines(project.bullets),
            };
          })
      : [],
    experience: on("experience")
      ? resume.experience
          .filter((job) => clean(job.title) || clean(job.company))
          .map((job) => ({
            id: job.id,
            title: clean(job.title),
            company: clean(job.company),
            location: clean(job.location),
            dates: dates(job.startDate, job.endDate),
            start: clean(job.startDate),
            end: clean(job.endDate),
            lines: lines(job.bullets),
          }))
      : [],
    skills: on("skills")
      ? resume.skills
          .map((group) => ({
            id: group.id,
            label: clean(group.label),
            items: group.items.map(clean).filter(Boolean),
          }))
          .filter((group) => group.items.length > 0)
      : [],
    education: on("education")
      ? resume.education
          .filter((school) => clean(school.school) || clean(school.degree))
          .map((school) => ({
            id: school.id,
            school: clean(school.school),
            degree: [clean(school.degree), clean(school.field)].filter(Boolean).join(", "),
            dates: dates(school.startDate, school.endDate),
            start: clean(school.startDate),
            end: clean(school.endDate),
            lines: lines(school.bullets),
          }))
      : [],
    certifications: on("certifications")
      ? resume.certifications
          .filter((cert) => clean(cert.name))
          .map((cert) => ({
            id: cert.id,
            name: clean(cert.name),
            issuer: clean(cert.issuer),
            date: clean(cert.date),
          }))
      : [],
    extras: on("extras")
      ? extrasOf(resume)
          .map((section) => ({
            id: section.id,
            title: clean(section.title),
            items: section.items
              .map((item) => ({
                id: item.id,
                title: clean(item.title),
                subtitle: clean(item.subtitle),
                date: clean(item.date),
                detail: clean(item.detail),
                lines: lines(item.bullets),
              }))
              .filter((item) => item.title || item.detail || item.lines.length > 0),
          }))
          .filter((section) => section.title && section.items.length > 0)
      : [],
    titles: {
      about:
        sectionTitleOf(resume, "summary") === "Summary"
          ? "About"
          : sectionTitleOf(resume, "summary"),
      projects: sectionTitleOf(resume, "projects"),
      experience: sectionTitleOf(resume, "experience"),
      skills: sectionTitleOf(resume, "skills"),
      education: sectionTitleOf(resume, "education"),
      certifications: sectionTitleOf(resume, "certifications"),
    },
    updatedAt: resume.updatedAt,
    hidden: PORTFOLIO_SECTIONS.filter((section) => hidden.has(section)),
  };
}

/** The sections this resume has something for, so the editor offers only those. */
export function sectionsWithContent(resume: Resume): PortfolioSection[] {
  const view = portfolioView(resume, { showEmail: false, showPhone: false, hiddenSections: [] });
  const filled: Record<PortfolioSection, boolean> = {
    about: view.about.length > 0,
    projects: view.projects.length > 0,
    experience: view.experience.length > 0,
    skills: view.skills.length > 0,
    education: view.education.length > 0,
    certifications: view.certifications.length > 0,
    extras: view.extras.length > 0,
    links: view.links.length > 0 || view.github !== null,
  };
  return (Object.keys(filled) as PortfolioSection[]).filter((key) => filled[key]);
}

/** A one-line description for previews and the Open Graph card. */
export function portfolioDescription(
  view: Pick<PortfolioView, "headline" | "about" | "name">,
): string {
  const text = view.headline || view.about[0] || "";
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}...` : text;
}
