import type { ApplicationStatus } from "@/lib/applications/status";
import type { EmailKind } from "./types";

export type Card = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedAt: number;
  interviewAt: number | null;
};

export type EmailFacts = { company: string; role: string; jobUrl: string };

const SUFFIXES =
  /\b(?:inc|incorporated|llc|llp|ltd|limited|pvt|private|corp|corporation|co|company|gmbh|plc|sa|ag|bv|pte|pty|technologies|technology|tech|solutions|systems|labs|group|holdings|global|india|software|services)\b/g;

export function companyKey(name: string): string {
  const words = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ");
  const core = words.replace(SUFFIXES, " ").replace(/\s+/g, " ").trim();
  return core || words.replace(/\s+/g, " ").trim();
}

export function sameCompany(a: string, b: string): boolean {
  const left = companyKey(a);
  const right = companyKey(b);
  if (!left || !right) return false;
  return left === right || left.startsWith(`${right} `) || right.startsWith(`${left} `);
}

const ROLE_WORDS: Record<string, string> = {
  sr: "senior",
  jr: "junior",
  eng: "engineer",
  engg: "engineer",
  mgr: "manager",
  dev: "developer",
  swe: "software engineer",
  pm: "product manager",
};
const ROLE_NOISE = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "for",
  "at",
  "in",
  "to",
  "role",
  "position",
  "job",
  "i",
  "ii",
  "iii",
  "iv",
  "1",
  "2",
  "3",
]);

function roleWords(role: string): Set<string> {
  const words = role
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .flatMap((word) => (ROLE_WORDS[word] ?? word).split(" "))
    .filter((word) => word && !ROLE_NOISE.has(word));
  return new Set(words);
}

// Dice overlap of the title's words, or one title holding all of the other's.
export function similarRole(a: string, b: string): boolean {
  const left = roleWords(a);
  const right = roleWords(b);
  if (left.size === 0 || right.size === 0) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  if (shared === Math.min(left.size, right.size)) return true;
  return (2 * shared) / (left.size + right.size) >= 0.6;
}

function linkKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return "";
  }
}

export const isOpen = (status: ApplicationStatus) =>
  status === "applied" || status === "interview" || status === "offer";

const newestFirst = (a: Card, b: Card) =>
  Number(isOpen(b.status)) - Number(isOpen(a.status)) || b.appliedAt - a.appliedAt;

export type Match = { card: Card; by: "link" | "company_role" | "company" };

// The job link first, then the company with a like title, then the company alone when only one card there is open.
export function matchCard(cards: readonly Card[], email: EmailFacts): Match | null {
  const link = email.jobUrl ? linkKey(email.jobUrl) : "";
  if (link) {
    const byLink = cards
      .filter((card) => card.jobUrl && linkKey(card.jobUrl) === link)
      .sort(newestFirst);
    if (byLink[0]) return { card: byLink[0], by: "link" };
  }
  if (!email.company) return null;
  const atCompany = cards.filter((card) => sameCompany(card.company, email.company));
  if (email.role) {
    const byRole = atCompany.filter((card) => similarRole(card.role, email.role)).sort(newestFirst);
    if (byRole[0]) return { card: byRole[0], by: "company_role" };
  }
  const open = atCompany.filter((card) => isOpen(card.status));
  if (open.length === 1) return { card: open[0]!, by: "company" };
  // One closed card there: the same job unless the email names a different one.
  const only = atCompany.length === 1 ? atCompany[0]! : null;
  if (open.length === 0 && only && (!email.role || !only.role))
    return { card: only, by: "company" };
  return null;
}

export type Plan =
  | { change: "none" }
  | { change: "created"; status: ApplicationStatus; interviewAt: number | null }
  | { change: "moved"; status: ApplicationStatus; interviewAt: number | null }
  | { change: "dated"; interviewAt: number };

const TARGET: Record<Exclude<EmailKind, "unknown">, ApplicationStatus> = {
  applied: "applied",
  interview: "interview",
  assessment: "interview",
  offer: "offer",
  rejected: "rejected",
};

// Which cards each kind of email may move: never back down the board, and never out of a decision.
const MOVES_FROM: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  applied: [],
  interview: ["applied", "no_reply"],
  offer: ["applied", "interview", "no_reply"],
  rejected: ["applied", "interview", "no_reply"],
  no_reply: [],
};

export function planChange(kind: EmailKind, card: Card | null, interviewAt: number | null): Plan {
  if (kind === "unknown") return { change: "none" };
  const status = TARGET[kind];
  // A test's date is a deadline, so only an interview sets the card's day.
  const day = kind === "interview" ? interviewAt : null;
  if (!card) return { change: "created", status, interviewAt: day };
  if (MOVES_FROM[status].includes(card.status))
    return { change: "moved", status, interviewAt: day };
  if (
    kind === "interview" &&
    card.status === "interview" &&
    day !== null &&
    card.interviewAt !== day
  ) {
    return { change: "dated", interviewAt: day };
  }
  return { change: "none" };
}
