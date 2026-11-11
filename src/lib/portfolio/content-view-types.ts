import type { DeviceFrame, MilestoneKind, ShelfKind, SocialKind } from "./content";

// What templates read, resolved by contentView(). An empty list or null leaves the section out.

export type GitHubRepoSummary = {
  name: string;
  fullName: string;
  url: string;
  description: string;
  homepage: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string;
};

export type GitHubStats = {
  username: string;
  name: string;
  bio: string;
  followers: number;
  publicRepos: number;
  // Over the person's own public repos, forks left out.
  totalStars: number;
  languages: { name: string; repos: number; percent: number }[];
  repos: GitHubRepoSummary[];
  activity: {
    // ISO time of the newest public event, null when GitHub lists none (it keeps 90 days).
    lastActiveAt: string | null;
    events90d: number;
    // Public events per week for the last 12 weeks, oldest first.
    weeks: number[];
    recent: { repo: string; kind: "push" | "pull" | "release" | "create" | "issue"; at: string }[];
  };
  joinedAt: string;
  fetchedAt: number;
};

export type ContentLink = { href: string; text: string };

export type ContentSocial = { kind: SocialKind; label: string; handle: string; href: string };

export type TextPart = { text: string; mark: boolean };

export type ContentProject = {
  id: string;
  from: "resume" | "github" | "custom";
  name: string;
  line: string;
  description: string;
  details: string[];
  lines: string[];
  category: string;
  years: string;
  outcome: string;
  tech: string[];
  roles: string[];
  website: ContentLink | null;
  source: (ContentLink & { repo: string | null }) | null;
  featured: boolean;
  // Pushed to on GitHub in the last 90 days.
  active: boolean;
  stars: number | null;
  device: DeviceFrame;
  // "TA" for Tally: what a design draws where an icon would go.
  monogram: string;
};

export type ContentRole = {
  id: string;
  title: string;
  company: string;
  location: string;
  dates: string;
  start: string;
  end: string;
  current: boolean;
  lines: string[];
  highlight: string;
  summary: string;
  type: string;
  website: ContentLink | null;
  monogram: string;
  tags: string[];
};

export type ContentSchool = {
  id: string;
  school: string;
  degree: string;
  dates: string;
  start: string;
  end: string;
  lines: string[];
  website: ContentLink | null;
  monogram: string;
};

export type ContentSkillGroup = {
  id: string;
  label: string;
  items: { name: string; years: number | null }[];
};

export type ContentMilestone = {
  id: string;
  kind: MilestoneKind;
  date: string;
  title: string;
  place: string;
  detail: string;
  result: string;
  href: string | null;
};

export type ContentTalk = {
  id: string;
  title: string;
  event: string;
  date: string;
  place: string;
  href: string | null;
  recording: string | null;
  slides: string | null;
};

export type ContentWriting = {
  id: string;
  title: string;
  href: string | null;
  date: string;
  minutes: number | null;
  publisher: string;
};

export type ContentTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  href: string | null;
  initials: string;
};

export type ContentInterest = { id: string; title: string; stat: string; line: string };
export type ContentShelfItem = {
  id: string;
  kind: ShelfKind;
  title: string;
  by: string;
  href: string | null;
};

export type ContentGitHub = Omit<GitHubStats, "fetchedAt"> & { href: string };

export type PortfolioContentView = {
  name: string;
  first: string;
  initials: string;
  headline: string;
  pitch: string;
  intro: string;
  disciplines: string[];
  availability: { open: boolean; text: string; short: string } | null;
  // For a clock or map tile. coords only for places the app knows (./places.ts) or the owner set.
  location: {
    label: string;
    city: string;
    timezone: string | null;
    coords: { lat: number; lng: number } | null;
  } | null;
  // Only what the owner chose to show on the page.
  email: string | null;
  phone: string | null;
  socials: ContentSocial[];
  about: string[];
  aboutParts: TextPart[][];
  now: { items: { label: string; text: string }[]; updatedAt: number | null } | null;
  stats: { value: string; label: string }[];
  // In the owner's order; featured ones keep their place (templates pick them out).
  projects: ContentProject[];
  experience: ContentRole[];
  education: ContentSchool[];
  skills: ContentSkillGroup[];
  milestones: ContentMilestone[];
  talks: ContentTalk[];
  writing: ContentWriting[];
  testimonials: ContentTestimonial[];
  interests: ContentInterest[];
  shelf: ContentShelfItem[];
  github: ContentGitHub | null;
  updatedAt: number;
};
