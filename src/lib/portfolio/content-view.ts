import type { Resume } from "@/lib/resume/schema";
import {
  webHref,
  type ContentProject,
  type ContentSocial,
  type GitHubStats,
  type PortfolioContent,
  type PortfolioContentView,
} from "./content";
import {
  ACTIVE_MS,
  autoContent,
  categoryOf,
  findRepo,
  type AutoContent,
  type AutoProject,
} from "./content-auto";
import {
  clean,
  clip,
  hostOf,
  initialsOf,
  isCurrent,
  link,
  markParts,
  repoName,
  resumeGitHubUsername,
  sentences,
  toSocial,
} from "./content-rules";
import { compactNumber } from "./metrics";
import { findPlace } from "./places";
import { portfolioView, type PortfolioView, type ViewSettings } from "./view";

// Pure and client-safe. The finished PortfolioContentView a template draws: the automatic content
// (./content-auto.ts) with the owner's own values merged on top.
//
//   autoContent(view, github)        what each automatic field would be, for the editor
//   contentView({ view, content })   what a template draws
//   portfolioViews(...)              both at once: the page's copy and the editor's

export { autoContent, type AutoContent, type AutoProject } from "./content-auto";
export {
  initialsOf,
  markParts,
  mentions,
  sentences,
  socialHandle,
  socialKindOf,
} from "./content-rules";

// ---------------------------------------------------------------------------------------------
// The finished view
// ---------------------------------------------------------------------------------------------

export type ContentSources = {
  view: PortfolioView;
  content: PortfolioContent;
  github: GitHubStats | null;
  now?: number;
};

/** What a design draws where a logo or icon would go: "LE" for Ledgerly, "·" for no name. */
const monogramOf = (name: string) => initialsOf(name) || "·";

const pick = <T>(own: T | null | undefined, fallback: T): T =>
  own === null || own === undefined ? fallback : own;

export function contentView({
  view,
  content,
  github,
  now = Date.now(),
}: ContentSources): PortfolioContentView {
  const auto = autoContent(view, github, now);
  const hidden = new Set(content.hidden);
  // Sections hidden on the page (About, Projects, Links) also keep out what the owner wrote for
  // them here, not just what came from the resume.
  const pageHides = new Set(view.hidden);
  const shown = <T>(section: (typeof content.hidden)[number], value: T, empty: T): T =>
    hidden.has(section) ? empty : value;

  const location = content.location
    ? (() => {
        const label = content.location.label || auto.location?.label || "";
        const place = findPlace(label);
        const lat = content.location.lat ?? place?.lat ?? null;
        const lng = content.location.lng ?? place?.lng ?? null;
        return {
          label,
          city: place?.city ?? clean(label.split(",")[0] ?? ""),
          timezone: content.location.timezone || place?.timezone || auto.location?.timezone || null,
          coords: lat !== null && lng !== null ? { lat, lng } : null,
        };
      })()
    : auto.location
      ? {
          label: auto.location.label,
          city: auto.location.city,
          timezone: auto.location.timezone,
          coords:
            auto.location.lat !== null && auto.location.lng !== null
              ? { lat: auto.location.lat, lng: auto.location.lng }
              : null,
        }
      : null;

  const socials = (content.socials ?? auto.socials)
    .map((item) => toSocial("kind" in item ? item.kind : undefined, item.label, item.url))
    .filter((item): item is ContentSocial => item !== null)
    // Email only goes on the page when the owner turned it on; the rest only with Links shown.
    .filter((item) => (item.kind === "email" ? view.email !== null : !pageHides.has("links")));

  const about = pageHides.has("about") ? [] : pick(content.about, auto.about).filter(Boolean);
  const highlights = pick(content.highlights, auto.highlights);

  // Projects: the owner's order first, then resume projects that are new since.
  const autoById = new Map(auto.projects.map((project) => [project.id, project]));
  const entries = new Map(content.projects.map((entry) => [entry.id, entry]));
  const order = pageHides.has("projects")
    ? []
    : [
        ...content.projects.map((entry) => entry.id),
        ...auto.projects.map((project) => project.id).filter((id) => !entries.has(id)),
      ];
  const projects: ContentProject[] = [];
  for (const id of order) {
    const entry = entries.get(id);
    const base = autoById.get(id);
    // A resume project that's gone (deleted or hidden on the resume) takes its extras with it.
    if (!base && !id.startsWith("gh:") && !id.startsWith("c:")) continue;
    if (entry?.hidden) continue;
    const repoFull = id.startsWith("gh:") ? id.slice(3) : (base?.source?.repo ?? null);
    const repo = findRepo(github, repoFull);
    const fallback: AutoProject = base ?? {
      id,
      from: id.startsWith("gh:") ? "github" : "custom",
      name: repo?.name ?? "",
      line: clip(sentences(repo?.description ?? "")[0] ?? "", 200),
      description: clip(repo?.description ?? "", 1200),
      lines: [],
      category: repo ? categoryOf([repo.description], repo.fullName, repo.topics) : "",
      years: "",
      outcome: repo && repo.stars >= 10 ? `${compactNumber(repo.stars)} stars` : "",
      tech: repo?.language ? [repo.language] : [],
      website: link(repo?.homepage),
      source: repo
        ? { href: repo.url, text: `github.com/${repo.fullName}`, repo: repo.fullName }
        : null,
      featured: false,
      active: repo ? now - Date.parse(repo.pushedAt || "1970") <= ACTIVE_MS : false,
      stars: repo?.stars ?? null,
    };
    const website = entry && entry.website !== null ? link(entry.website) : fallback.website;
    const sourceLink = entry && entry.source !== null ? link(entry.source) : null;
    const source =
      entry && entry.source !== null
        ? sourceLink
          ? { ...sourceLink, repo: repoName(sourceLink.href) }
          : null
        : fallback.source;
    const name = pick(entry?.name, fallback.name) || fallback.name;
    if (!name) continue;
    projects.push({
      ...fallback,
      name,
      line: pick(entry?.line, fallback.line),
      description: pick(entry?.description, fallback.description),
      details: entry?.details ?? [],
      category: pick(entry?.category, fallback.category),
      years: pick(entry?.years, fallback.years),
      outcome: pick(entry?.outcome, fallback.outcome),
      tech: pick(entry?.tech, fallback.tech),
      roles: entry?.roles ?? [],
      website,
      source,
      featured: pick(entry?.featured, fallback.featured),
      device: entry?.device ?? "auto",
      monogram: monogramOf(name),
    });
  }

  const experience = view.experience.map((job) => {
    const own = content.jobs[job.id];
    const base = auto.jobs[job.id]!;
    return {
      ...job,
      current: isCurrent(job.end),
      highlight: pick(own?.highlight, base.highlight),
      summary: pick(own?.summary, base.summary),
      type: pick(own?.type, base.type),
      website: link(own?.website),
      monogram: monogramOf(job.company || job.title),
      tags: pick(own?.tags, base.tags),
    };
  });

  const education = view.education.map((school) => {
    const own = content.schools[school.id];
    return {
      ...school,
      website: link(own?.website),
      monogram: monogramOf(school.school || school.degree),
    };
  });

  const skills = view.skills.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((name) => {
      const key = name.toLowerCase();
      const own = content.skillYears[key];
      return { name, years: own !== undefined ? own : (auto.skillYears[key] ?? null) };
    }),
  }));

  const now_ = pick(content.now, auto.now).filter((item) => item.text);
  const githubUsername = content.github.username ?? auto.githubUsername;
  const githubView =
    github && githubUsername && github.username.toLowerCase() === githubUsername.toLowerCase()
      ? {
          username: github.username,
          name: github.name,
          bio: github.bio,
          followers: github.followers,
          publicRepos: github.publicRepos,
          totalStars: github.totalStars,
          languages: github.languages,
          repos: github.repos,
          activity: github.activity,
          joinedAt: github.joinedAt,
          href: `https://github.com/${github.username}`,
        }
      : null;

  return {
    name: view.name,
    first: view.name.split(/\s+/)[0] ?? "",
    initials: initialsOf(view.name),
    headline: view.headline,
    pitch: pick(content.pitch, auto.pitch),
    intro: pick(content.intro, auto.intro),
    disciplines: pick(content.disciplines, auto.disciplines).filter(Boolean),
    availability: (() => {
      const value = content.availability ?? auto.availability;
      if (!value || (!value.text && !value.short)) return null;
      return { open: value.open, text: value.text, short: value.short || value.text };
    })(),
    location: shown("location", location, null),
    email: view.email,
    phone: view.phone,
    socials,
    about,
    aboutParts: about.map((paragraph) => markParts(paragraph, highlights)),
    now: shown(
      "now",
      now_.length > 0
        ? {
            items: now_.map(({ label, text }) => ({ label, text })),
            updatedAt: content.nowUpdatedAt,
          }
        : null,
      null,
    ),
    stats: shown(
      "stats",
      pick(content.stats, auto.stats).map(({ value, label }) => ({ value, label })),
      [],
    ),
    projects,
    experience,
    education,
    skills,
    milestones: shown(
      "milestones",
      pick(content.milestones, auto.milestones).map((item) => ({
        id: item.id,
        kind: item.kind,
        date: item.date,
        title: item.title,
        place: item.place,
        detail: item.detail,
        result: item.result,
        href: webHref(item.url),
      })),
      [],
    ),
    talks: shown(
      "talks",
      pick(content.talks, auto.talks).map((item) => ({
        id: item.id,
        title: item.title,
        event: item.event,
        date: item.date,
        place: item.place,
        href: webHref(item.url),
        recording: webHref(item.recording),
        slides: webHref(item.slides),
      })),
      [],
    ),
    writing: shown(
      "writing",
      pick(content.writing, auto.writing).map((item) => {
        const href = webHref(item.url);
        return {
          id: item.id,
          title: item.title,
          href,
          date: item.date,
          minutes: item.minutes,
          publisher: item.publisher || (href ? hostOf(href) : ""),
        };
      }),
      [],
    ),
    testimonials: shown(
      "testimonials",
      content.testimonials.map((item) => ({
        id: item.id,
        quote: item.quote,
        name: item.name,
        role: item.role,
        href: webHref(item.url),
        initials: initialsOf(item.name),
      })),
      [],
    ),
    interests: shown("interests", pick(content.interests, auto.interests), []),
    shelf: shown(
      "shelf",
      content.shelf.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        by: item.by,
        href: webHref(item.url),
      })),
      [],
    ),
    github: shown("github", githubView, null),
    updatedAt: view.updatedAt,
  };
}

/** The GitHub username the page uses: the owner's, else the one on the resume. */
export function githubUsernameFor(
  view: Pick<PortfolioView, "github">,
  content: PortfolioContent,
): string | null {
  return content.github.username ?? resumeGitHubUsername(view);
}

export type PortfolioViews = {
  // What the page and its preview draw: every privacy choice applied.
  page: { view: PortfolioView; content: PortfolioContentView };
  // What the content editor lists: everything the owner has, as if nothing were hidden. Hiding is
  // a choice about the page, so the editor keeps showing (and marks) what the page leaves out,
  // and the owner can still edit it or turn it back on.
  editor: { view: PortfolioView; content: PortfolioContentView; auto: AutoContent };
};

/** The page's copy and the editor's, from the same resume, settings and content. */
export function portfolioViews({
  resume,
  settings,
  content,
  github,
  now = Date.now(),
}: Omit<ContentSources, "view"> & { resume: Resume; settings: ViewSettings }): PortfolioViews {
  const pageView = portfolioView(resume, settings);
  const editorView = portfolioView(resume, {
    ...settings,
    showEmail: true,
    showPhone: true,
    hiddenSections: [],
  });
  return {
    page: {
      view: pageView,
      content: contentView({ view: pageView, content, github, now }),
    },
    editor: {
      view: editorView,
      content: contentView({
        view: editorView,
        content: { ...content, hidden: [] },
        github,
        now,
      }),
      auto: autoContent(editorView, github, now),
    },
  };
}
