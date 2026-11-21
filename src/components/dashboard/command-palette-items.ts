import {
  FilePlus2,
  FileText,
  FileUp,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { matchesQuery, recentResumes } from "./library";
import { APP_NAV, APP_NAV_FOOTER, showsProMark, type AppNavItem } from "./nav";
import { TRASH_ROUTE } from "./trash/trash-route";

type PaletteGroup = "Actions" | "Pages" | "Resumes";

export type PaletteCommand = {
  id: string;
  group: PaletteGroup;
  label: string;
  detail?: string;
  icon: LucideIcon;
  pro: boolean;
  run: () => void;
};

export type PaletteHandlers = {
  go: (href: string) => void;
  openResume: (id: string) => void;
  tailor: (resumeId: string, jobLink: string | null) => void;
  lockedTailor: () => void;
  upload: () => void;
  scratch: () => void;
  sample: () => void;
};

type PaletteInput = {
  query: string;
  resumes: readonly Resume[];
  activeId: string | null;
  proTools: boolean | null;
  tailorLocked: boolean;
  now: number;
};

const RECENT = 5;
const MATCHES = 8;
const MAX_LINK_CHARS = 2048;

// Other words people use for each page, so "tracker" or "cover letter" still finds it.
const PAGE_WORDS: Record<string, string> = {
  [ROUTES.dashboard]: "dashboard start overview",
  [ROUTES.dashboardResumes]: "library documents cv",
  [ROUTES.dashboardJobs]: "search openings matches roles",
  [ROUTES.dashboardApplications]: "tracker board applied pipeline",
  [ROUTES.dashboardLetters]: "cover letters messages outreach answers",
  [ROUTES.dashboardInterview]: "questions interviews practice",
  [PORTFOLIO_ROUTE]: "website site personal page",
  [ROUTES.dashboardFormats]: "templates looks design layout",
  [TRASH_ROUTE]: "trash bin deleted restore",
  [ROUTES.dashboardAccount]: "settings plan billing profile preferences work rights",
};

const ACCOUNT_PAGE: AppNavItem = { href: ROUTES.dashboardAccount, label: "Account", icon: UserRound };

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matches(query: string, ...texts: string[]): boolean {
  const haystack = fold(texts.join(" "));
  return fold(query)
    .split(" ")
    .every((term) => haystack.includes(term));
}

// Job links always have a path, so a bare word like "node.js" stays a search.
const BARE_LINK = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?[/?#]/i;

export function parseJobLink(text: string): string | null {
  const raw = text.trim();
  if (!raw || raw.length > MAX_LINK_CHARS || /\s/.test(raw)) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : BARE_LINK.test(raw) ? `https://${raw}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function tailorHref(jobLink: string | null): string {
  return jobLink ? `${ROUTES.studio}?job=${encodeURIComponent(jobLink)}` : ROUTES.studio;
}

function tailorTarget(resumes: readonly Resume[], activeId: string | null): Resume | null {
  return resumes.find((resume) => resume.id === activeId) ?? recentResumes(resumes, 1)[0] ?? null;
}

function hostOf(link: string): string {
  return new URL(link).hostname.replace(/^www\./, "");
}

function tailorCommand(
  input: PaletteInput,
  handlers: PaletteHandlers,
  jobLink: string | null,
): PaletteCommand | null {
  const target = tailorTarget(input.resumes, input.activeId);
  const base = {
    id: jobLink ? "tailor-link" : "tailor",
    group: "Actions",
    label: jobLink ? "Tailor to this job" : "Tailor to a job",
    icon: Target,
    pro: input.tailorLocked,
  } as const;
  if (input.tailorLocked) {
    return { ...base, detail: jobLink ? hostOf(jobLink) : undefined, run: handlers.lockedTailor };
  }
  if (!target) {
    return jobLink ? { ...base, detail: "Add your resume first", run: handlers.upload } : null;
  }
  return {
    ...base,
    detail: jobLink
      ? `${hostOf(jobLink)} · with “${resumeTitle(target)}”`
      : "Or paste a job link here",
    run: () => handlers.tailor(target.id, jobLink),
  };
}

export function paletteCommands(input: PaletteInput, handlers: PaletteHandlers): PaletteCommand[] {
  const jobLink = parseJobLink(input.query);
  if (jobLink) {
    const command = tailorCommand(input, handlers, jobLink);
    return command ? [command] : [];
  }
  const query = input.query.trim();

  const pages = [...APP_NAV, ...APP_NAV_FOOTER, ACCOUNT_PAGE]
    .filter((item) => !query || matches(query, item.label, PAGE_WORDS[item.href] ?? ""))
    .map<PaletteCommand>((item) => ({
      id: `page:${item.href}`,
      group: "Pages",
      label: item.label,
      icon: item.icon,
      pro: showsProMark(item, input.proTools),
      run: () => handlers.go(item.href),
    }));

  const shown = query
    ? recentResumes(
        input.resumes.filter((resume) => matchesQuery(resume, query)),
        MATCHES,
      )
    : recentResumes(input.resumes, RECENT);
  const resumes = shown.map<PaletteCommand>((resume) => ({
    id: `resume:${resume.id}`,
    group: "Resumes",
    label: resumeTitle(resume),
    detail: `Edited ${formatRelativeTime(resume.updatedAt, input.now)}`,
    icon: FileText,
    pro: false,
    run: () => handlers.openResume(resume.id),
  }));

  const tailor = tailorCommand(input, handlers, null);
  const actions: { command: PaletteCommand; words: string }[] = [
    ...(tailor ? [{ command: tailor, words: "job link match" }] : []),
    {
      command: {
        id: "upload",
        group: "Actions",
        label: "Upload a resume",
        detail: "PDF or Word",
        icon: FileUp,
        pro: false,
        run: handlers.upload,
      },
      words: "new resume import file pdf word docx",
    },
    {
      command: {
        id: "scratch",
        group: "Actions",
        label: "Start from scratch",
        icon: FilePlus2,
        pro: false,
        run: handlers.scratch,
      },
      words: "new resume blank empty",
    },
    {
      command: {
        id: "sample",
        group: "Actions",
        label: "Try a sample",
        icon: FileText,
        pro: false,
        run: handlers.sample,
      },
      words: "new resume example demo",
    },
  ];

  const shownActions = actions
    .filter(({ command, words }) => !query || matches(query, command.label, words))
    .map(({ command }) => command);
  // Before anything is typed the next steps lead; once it is, the pages people jump to do.
  return query
    ? [...pages, ...resumes, ...shownActions]
    : [...shownActions, ...resumes, ...pages];
}

export function groupCommands(
  commands: readonly PaletteCommand[],
): { group: PaletteGroup; commands: PaletteCommand[] }[] {
  const groups: { group: PaletteGroup; commands: PaletteCommand[] }[] = [];
  for (const command of commands) {
    const last = groups.at(-1);
    if (last?.group === command.group) last.commands.push(command);
    else groups.push({ group: command.group, commands: [command] });
  }
  return groups;
}

export function moveActive(current: number, total: number, key: string): number | null {
  if (total === 0) return null;
  if (key === "ArrowDown") return current >= total - 1 ? 0 : current + 1;
  if (key === "ArrowUp") return current <= 0 ? total - 1 : current - 1;
  if (key === "PageDown") return Math.min(total - 1, current + 5);
  if (key === "PageUp") return Math.max(0, current - 5);
  return null;
}
