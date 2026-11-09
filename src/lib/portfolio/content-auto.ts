import {
  webHref,
  type ContentProject,
  type GitHubRepoSummary,
  type GitHubStats,
  type PortfolioContent,
  type SocialKind,
} from "./content";
import {
  clean,
  clip,
  link,
  mentions,
  repoName,
  resumeGitHubUsername,
  sentences,
  spanOf,
  toSocial,
  wholeSentences,
  yearOf,
} from "./content-rules";
import { bestMetric, compactNumber, metricText, topMetrics } from "./metrics";
import { findPlace } from "./places";
import type { PortfolioExtra, PortfolioView } from "./view";

// Pure and client-safe. What every automatic (null) field of the content document would be,
// filled in by rules (no AI) from the resume as the page shows it (PortfolioView: privacy and
// hidden sections already applied) and the stored GitHub numbers. The editor shows these as the
// starting values; ./content-view.ts merges the owner's own values on top.

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_MS = 90 * DAY_MS;
// A number has to be this clear (./metrics.ts scores) to stand alone as a highlight or a stat.
const HIGHLIGHT_SCORE = 60;

export type AutoProject = Omit<
  ContentProject,
  "images" | "video" | "device" | "logo" | "details" | "roles"
>;

export type AutoContent = {
  pitch: string;
  intro: string;
  disciplines: string[];
  availability: { open: boolean; text: string; short: string } | null;
  location: {
    label: string;
    city: string;
    timezone: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  socials: { id: string; kind: SocialKind; label: string; url: string }[];
  about: string[];
  highlights: string[];
  now: { id: string; label: string; text: string }[];
  stats: { id: string; value: string; label: string }[];
  milestones: NonNullable<PortfolioContent["milestones"]>;
  talks: NonNullable<PortfolioContent["talks"]>;
  writing: NonNullable<PortfolioContent["writing"]>;
  interests: NonNullable<PortfolioContent["interests"]>;
  projects: AutoProject[];
  jobs: Record<string, { highlight: string; summary: string; type: string; tags: string[] }>;
  skillYears: Record<string, number | null>;
  githubUsername: string | null;
};

// ---------------------------------------------------------------------------------------------
// Automatic content
// ---------------------------------------------------------------------------------------------

const AVAILABLE =
  /\b(?:open to|available (?:for|from|to)|looking for|seeking|currently exploring|taking on)\b/i;
const MONTHS = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+((?:19|20)\d{2})\b/i;

function availabilityOf(about: readonly string[]): AutoContent["availability"] {
  const sentence = about.flatMap(sentences).find((line) => AVAILABLE.test(line));
  if (!sentence) return null;
  const month = MONTHS.exec(sentence);
  const short = month ? `Available ${month[1]} ${month[2]}` : "Open to work";
  return { open: true, text: clip(sentence, 120), short };
}

function disciplinesOf(headline: string): string[] {
  const parts = headline
    .split(/\s*(?:[/|·•,&+]|\band\b)\s*/i)
    .map(clean)
    .filter((part) => part.length > 1 && part.length <= 40);
  return [...new Set(parts.map((part) => part[0]!.toUpperCase() + part.slice(1)))].slice(0, 6);
}

const SECTION_MATCH = {
  milestones: /award|honou?r|achievement|hackathon|prize|recognition|competition/i,
  talks: /talk|speaking|presentation|conference|keynote|workshop/i,
  writing: /writing|publication|article|blog|post|essay|press/i,
  interests: /interest|hobb|outside work|personal|passion/i,
} as const;

function extrasMatching(view: PortfolioView, pattern: RegExp): PortfolioExtra["items"] {
  return view.extras
    .filter((section) => pattern.test(section.title))
    .flatMap((section) => section.items);
}

const URL_IN_TEXT = /https?:\/\/[^\s)]+/i;

function firstUrl(...texts: string[]): string {
  for (const text of texts) {
    const match = URL_IN_TEXT.exec(text);
    if (match && webHref(match[0])) return match[0];
  }
  return "";
}

const RESULT =
  /\b(winner|won|1st|first place|2nd|second place|3rd|finalist|runner[- ]up|honou?rable mention|top \d+)\b/i;

export function categoryOf(
  lines: readonly string[],
  repo: string | null,
  topics: readonly string[],
): string {
  const text = `${lines.join(" ")} ${topics.join(" ")}`;
  const kinds: string[] = [];
  if (/\bhack(?:athon|\s?week|fest)\b/i.test(text)) kinds.push("Hackathon");
  if (repo) kinds.push("Open source");
  if (/\b(?:saas|mrr|arr|paying (?:customers|users|venues|teams)|subscribers)\b/i.test(text))
    kinds.push("SaaS");
  if (/\b(?:cli|command[- ]line)\b/i.test(text)) kinds.push("CLI");
  else if (/\b(?:library|package|sdk|npm module|framework)\b/i.test(text)) kinds.push("Library");
  else if (/\b(?:ios|android|mobile app|react native|pwa)\b/i.test(text)) kinds.push("App");
  return kinds.slice(0, 2).join(" · ");
}

function skillNames(view: PortfolioView): string[] {
  return [...new Set(view.skills.flatMap((group) => group.items))];
}

function techIn(text: string, skills: readonly string[], max: number): string[] {
  return skills.filter((skill) => mentions(text, skill)).slice(0, max);
}

export function findRepo(
  github: GitHubStats | null,
  fullName: string | null,
): GitHubRepoSummary | null {
  if (!github || !fullName) return null;
  const wanted = fullName.toLowerCase();
  return github.repos.find((repo) => repo.fullName.toLowerCase() === wanted) ?? null;
}

export function autoContent(
  view: PortfolioView,
  github: GitHubStats | null,
  now = Date.now(),
): AutoContent {
  const nowYear = new Date(now).getUTCFullYear();
  const skills = skillNames(view);
  const firstParagraph = sentences(view.about[0] ?? "");
  const pitchSentence = firstParagraph[0] ?? "";
  const pitch =
    pitchSentence && pitchSentence.length <= 200 ? pitchSentence : clip(view.headline, 200);
  const intro = pitchSentence ? wholeSentences(firstParagraph.slice(1), 400) : "";

  const place = findPlace(view.location);
  const location = view.location
    ? {
        label: view.location,
        city: place?.city ?? clean(view.location.split(",")[0] ?? ""),
        timezone: place?.timezone ?? null,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
      }
    : null;

  const socials: AutoContent["socials"] = [];
  const seen = new Set<string>();
  const addSocial = (label: string, raw: string) => {
    const social = toSocial(undefined, label, raw);
    if (!social || seen.has(social.href)) return;
    seen.add(social.href);
    socials.push({
      id: `s${socials.length + 1}`,
      kind: social.kind,
      label: social.label,
      url: social.href,
    });
  };
  for (const item of view.links) if (item.href) addSocial(item.label, item.href);
  if (view.github?.href) addSocial("GitHub", view.github.href);
  if (view.email) addSocial("Email", view.email);

  const about = view.about;
  const aboutText = about.join(" ");
  const highlights = [
    ...view.experience.map((job) => job.company),
    ...view.projects.map((project) => project.name),
  ]
    .filter(
      (term, i, all) => term.length >= 2 && all.indexOf(term) === i && mentions(aboutText, term),
    )
    .slice(0, 6);

  const githubUsername = resumeGitHubUsername(view);

  // Projects
  const projects: AutoProject[] = view.projects.map((project, index) => {
    const fullName = project.repo ?? repoName(project.href ?? "");
    const repo = findRepo(github, fullName);
    const lines =
      project.lines.length > 0 ? project.lines : repo?.description ? [repo.description] : [];
    const firstLine = sentences(lines[0] ?? "")[0] ?? "";
    const metrics = topMetrics(lines, 2).map(metricText);
    const stars = repo ? repo.stars : null;
    const outcome = [
      stars !== null && stars >= 10 ? `${compactNumber(stars)} stars` : "",
      ...metrics,
    ]
      .filter(Boolean)
      .join(" · ");
    const tech = [
      ...techIn(lines.join(" "), skills, 6),
      ...(repo?.language ? [repo.language] : []),
    ].filter(
      (name, i, all) => all.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === i,
    );
    const years = yearOf(lines.join(" ")) ?? null;
    const sourceHref = fullName ? `https://github.com/${fullName}` : null;
    const websiteHref = !fullName && project.href ? project.href : repo?.homepage || null;
    return {
      id: project.id,
      from: "resume",
      name: project.name,
      line: clip(firstLine, 200),
      description: clip(lines.join(" "), 1200),
      lines: project.lines,
      category: categoryOf(lines, fullName, repo?.topics ?? []),
      years: years ? String(years) : "",
      outcome: clip(outcome, 160),
      tech: tech.slice(0, 6),
      website: link(websiteHref),
      source: sourceHref
        ? { href: sourceHref, text: `github.com/${fullName}`, repo: fullName }
        : null,
      featured: index === 0,
      active: repo ? now - Date.parse(repo.pushedAt || "1970") <= ACTIVE_MS : false,
      stars,
    };
  });

  // Jobs and skills
  const jobs: AutoContent["jobs"] = {};
  const spans = new Map<string, [number, number][]>();
  for (const job of view.experience) {
    const text = `${job.title} ${job.lines.join(" ")}`;
    const best = bestMetric(job.lines);
    jobs[job.id] = {
      highlight: best && best.score >= HIGHLIGHT_SCORE ? clip(metricText(best), 80) : "",
      summary: "",
      type: "",
      tags: techIn(text, skills, 6),
    };
    const span = spanOf(job.start, job.end, nowYear);
    if (!span) continue;
    for (const skill of skills) {
      if (!mentions(text, skill)) continue;
      const key = skill.toLowerCase();
      spans.set(key, [...(spans.get(key) ?? []), span]);
    }
  }
  const skillYears: AutoContent["skillYears"] = {};
  for (const skill of skills) {
    const list = spans.get(skill.toLowerCase());
    if (!list) {
      skillYears[skill.toLowerCase()] = null;
      continue;
    }
    const from = Math.min(...list.map(([start]) => start));
    const to = Math.max(...list.map(([, end]) => end));
    skillYears[skill.toLowerCase()] = Math.max(1, to - from);
  }

  // Headline stats
  const stats: AutoContent["stats"] = [];
  const starts = view.experience
    .map((job) => spanOf(job.start, job.end, nowYear)?.[0])
    .filter((value): value is number => typeof value === "number");
  if (starts.length > 0) {
    const years = nowYear - Math.min(...starts);
    if (years >= 1)
      stats.push({ id: "st-years", value: String(years), label: "years of experience" });
  }
  if (github && github.totalStars >= 50) {
    stats.push({ id: "st-stars", value: compactNumber(github.totalStars), label: "GitHub stars" });
  }
  const candidates = [
    ...view.experience.flatMap((job) => job.lines),
    ...view.projects.flatMap((project) => project.lines),
  ]
    .flatMap((line) => topMetrics([line], 3))
    .filter((metric) => (metric.kind === "count" || metric.kind === "money") && metric.score >= 65)
    .sort((a, b) => b.score - a.score);
  for (const metric of candidates) {
    if (stats.length >= 4) break;
    if (stats.some((stat) => stat.value === metric.value)) continue;
    stats.push({
      id: `st-${stats.length + 1}`,
      value: metric.value,
      label: clip(metric.label, 60),
    });
  }

  // Lists from the resume's extra sections
  const milestones: AutoContent["milestones"] = extrasMatching(view, SECTION_MATCH.milestones).map(
    (item) => {
      const text = `${item.title} ${item.detail} ${item.lines.join(" ")}`;
      return {
        id: `m-${item.id}`,
        kind: /hack/i.test(text) ? "hackathon" : "award",
        date: item.date,
        title: clip(item.title || item.detail, 200),
        place: clip(item.subtitle, 120),
        detail: clip(item.title ? item.detail || item.lines[0] || "" : "", 400),
        result: clip(RESULT.exec(text)?.[0] ?? "", 40),
        url: firstUrl(item.detail, ...item.lines),
        logo: null,
      };
    },
  );
  const talks: AutoContent["talks"] = extrasMatching(view, SECTION_MATCH.talks).map((item) => ({
    id: `t-${item.id}`,
    title: clip(item.title || item.detail, 200),
    event: clip(item.subtitle, 200),
    date: item.date,
    place: "",
    url: firstUrl(item.detail, ...item.lines),
    recording: "",
    slides: "",
  }));
  const writing: AutoContent["writing"] = extrasMatching(view, SECTION_MATCH.writing).map(
    (item) => ({
      id: `w-${item.id}`,
      title: clip(item.title || item.detail, 200),
      url: firstUrl(item.detail, ...item.lines),
      date: item.date,
      minutes: null,
      publisher: clip(item.subtitle, 80),
    }),
  );
  const interestItems = extrasMatching(view, SECTION_MATCH.interests);
  const interests: AutoContent["interests"] = interestItems.flatMap((item) => {
    const words = `${item.title}${item.detail ? `, ${item.detail}` : ""}`;
    // "Bouldering, film photography, cycling" as one line becomes three interests.
    if (interestItems.length === 1 && !item.lines.length && words.includes(",")) {
      return words
        .split(/\s*[,;·]\s*/)
        .filter(Boolean)
        .slice(0, 12)
        .map((title, i) => ({
          id: `i-${item.id}-${i}`,
          title: clip(title, 80),
          stat: "",
          line: "",
        }));
    }
    return [
      {
        id: `i-${item.id}`,
        title: clip(item.title || item.detail, 80),
        stat: "",
        line: clip(item.title ? item.detail || item.lines[0] || "" : "", 400),
      },
    ];
  });

  // "Now": what the person pushed to most recently, when it was lately.
  const now_: AutoContent["now"] = [];
  const latest = github?.repos
    .filter((repo) => repo.pushedAt && now - Date.parse(repo.pushedAt) <= 60 * DAY_MS)
    .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))[0];
  if (latest) {
    now_.push({
      id: "n-building",
      label: "Building",
      text: clip(latest.description ? `${latest.name}: ${latest.description}` : latest.name, 160),
    });
  }

  return {
    pitch,
    intro,
    disciplines: disciplinesOf(view.headline),
    availability: availabilityOf(about),
    location,
    socials: socials.slice(0, 12),
    about,
    highlights,
    now: now_,
    stats,
    milestones,
    talks,
    writing,
    interests,
    projects,
    jobs,
    skillYears,
    githubUsername,
  };
}
