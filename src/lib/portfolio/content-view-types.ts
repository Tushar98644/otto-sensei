import type { DeviceFrame, MilestoneKind, ShelfKind, SocialKind } from "./content";

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
  totalStars: number;
  languages: { name: string; repos: number; percent: number }[];
  repos: GitHubRepoSummary[];
  activity: {
    lastActiveAt: string | null;
    events90d: number;
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
  active: boolean;
  stars: number | null;
  device: DeviceFrame;
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
  location: {
    label: string;
    city: string;
    timezone: string | null;
    coords: { lat: number; lng: number } | null;
  } | null;
  email: string | null;
  phone: string | null;
  socials: ContentSocial[];
  about: string[];
  aboutParts: TextPart[][];
  now: { items: { label: string; text: string }[]; updatedAt: number | null } | null;
  stats: { value: string; label: string }[];
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
