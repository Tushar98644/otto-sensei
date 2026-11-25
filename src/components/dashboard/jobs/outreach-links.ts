// Links the user opens and searches they run themselves: Otto never looks people up.

export const MAILTO_MAX_CHARS = 1_900;
const MAX_POST_EMAILS = 3;

export type EmailDraft = { to: string; subject: string; body: string };

const SENIORITY = new Set([
  "senior",
  "sr",
  "junior",
  "jr",
  "lead",
  "staff",
  "principal",
  "associate",
  "mid",
  "mid-level",
  "entry",
  "entry-level",
  "level",
  "intern",
  "graduate",
  "trainee",
  "apprentice",
  "remote",
  "hybrid",
  "contract",
  "freelance",
  "temporary",
  "part-time",
  "full-time",
]);
// Last in a title these name the role, as in "Tech Lead" or "Sales Associate".
const ROLE_NOUNS = new Set(["lead", "associate"]);
const RANK = /^(?:l?\d+|i{1,3}|iv|v)$/i;
const GENDER_TAG = /^[mwfdx](?:\/[mwfdx]){1,3}$/i;
// A slash breaks a title only with spaces around it, so "UI/UX Designer" stays whole.
const TITLE_BREAKS = /\s[-–—/]\s|[,;:|\\()[\]{}•·@–—]/;
// Keeps the dot of ".NET" and the signs of "C++" and "C#".
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}.#]+|[^\p{L}\p{N}+#]+$/gu;
const MAX_KEYWORD_WORDS = 3;

const LEGAL_SUFFIX =
  /[,\s]+(?:&\s*)?(?:inc|llc|llp|ltd|limited|(?:pvt|private)\s+(?:ltd|limited)|pvt|pte|gmbh|kg|corp|corporation|co|plc|ag|sa|sas|sarl|sl|spa|srl|sro|bv|nv|pty|oy|oyj|ab|as|asa|aps|kk)\.?$/i;
const TRAILING_ASIDE = /\s*\([^()]*\)$/;
// "B.V.", "S.p.A." and "L.L.C." become "BV", "SpA" and "LLC" so the suffix list can match them.
const DOTTED_SUFFIX = /(?<![\p{L}\p{N}.])(?:\p{L}\.){2,}$/u;

// Matched anywhere in the local part: no-reply, legal, accessibility and fraud inboxes aren't for a pitch.
const SKIP_LOCAL = [
  "noreply",
  "donotreply",
  "privacy",
  "abuse",
  "mailerdaemon",
  "postmaster",
  "unsubscribe",
  "gdpr",
  "dataprotection",
  "accommodation",
  "accessib",
  "disabilit",
  "adjustment",
  "fraud",
  "security",
  "legal",
  "compliance",
  "ethics",
  "whistleblow",
  "support",
  "helpdesk",
  "notification",
];
// Matched as whole words, since they hide inside names ("lee.o" holds "eeo", "phelps" holds "help").
const SKIP_WORDS = new Set(["dpo", "eeo", "eeoc", "help", "scam", "scams"]);
// Only the whole local part, since Ada is also a first name.
const SKIP_EXACT_LOCAL = new Set(["ada"]);
// Inboxes meant for applicants go first in the list and on the To line.
const HIRING_LOCAL = ["job", "career", "talent", "recruit", "hiring", "apply", "application"];
const HIRING_WORDS = new Set(["hr", "hire", "people", "join", "joinus", "work", "workwithus"]);
const PLACEHOLDER_DOMAINS = new Set(["example.com", "example.org", "example.net", "domain.com"]);
const IMAGE_ENDINGS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "avif",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "heic",
]);
const EMAIL =
  /(?<![\w.%+-])[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?![\w-])/gi;
const PLACEHOLDER = /\[[^\]]+\]/;

const enc = encodeURIComponent;

function google(query: string): string {
  return `https://www.google.com/search?q=${enc(query)}`;
}

function quoted(text: string): string {
  const clean = text.replace(/"/g, "").trim();
  return clean ? `"${clean}"` : "";
}

// "Acme, Inc." finds fewer people than "Acme", since profiles rarely carry the legal name.
export function searchName(company: string): string {
  let name = company.trim();
  for (;;) {
    const next = name
      .replace(TRAILING_ASIDE, "")
      .replace(DOTTED_SUFFIX, (dotted) => dotted.replace(/\./g, ""))
      .replace(LEGAL_SUFFIX, "")
      .trim();
    if (!next || next === name) return name;
    name = next;
  }
}

function isModifier(word: string): boolean {
  return SENIORITY.has(word.toLowerCase()) || RANK.test(word) || GENDER_TAG.test(word);
}

// "Senior Backend Engineer, Payments (Remote)" becomes "Backend Engineer", and "Tech Lead" stays whole.
export function roleKeyword(title: string): string {
  for (const segment of title.split(TITLE_BREAKS)) {
    const words = segment
      .split(/\s+/)
      .map((word) => word.replace(EDGE_PUNCTUATION, ""))
      .filter(Boolean);
    let start = 0;
    while (start < words.length && isModifier(words[start]!)) start++;
    let end = words.length;
    while (
      end > start &&
      isModifier(words[end - 1]!) &&
      !ROLE_NOUNS.has(words[end - 1]!.toLowerCase())
    ) {
      end--;
    }
    if (end > start) return words.slice(start, Math.min(end, start + MAX_KEYWORD_WORDS)).join(" ");
  }
  return "";
}

// A link to LinkedIn's own company search; Otto never reads LinkedIn.
export function linkedInCompanyUrl(company: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${enc(searchName(company) || company)}`;
}

export function linkedInPeopleUrl(company: string, title = ""): string {
  const keywords = searchName(company) || roleKeyword(title);
  return `https://www.linkedin.com/search/results/people/?keywords=${enc(keywords)}`;
}

export function hiringPeopleUrl(company: string, title: string): string {
  const query = [
    "site:linkedin.com/in",
    quoted(searchName(company)),
    roleKeyword(title),
    "(manager OR lead OR head OR director OR recruiter OR founder)",
  ];
  return google(query.filter(Boolean).join(" "));
}

export function teamPageUrl(company: string): string {
  const name = quoted(searchName(company));
  return google([name, '(team OR "about us" OR leadership OR founders)'].filter(Boolean).join(" "));
}

function localWords(local: string): string[] {
  return local.split(/[^a-z0-9]+/).filter(Boolean);
}

function skipEmail(email: string): boolean {
  const [local, domain] = email.split("@") as [string, string];
  const plain = local.replace(/[^a-z0-9]/g, "");
  if (SKIP_EXACT_LOCAL.has(plain) || SKIP_LOCAL.some((part) => plain.includes(part))) return true;
  if (localWords(local).some((word) => SKIP_WORDS.has(word))) return true;
  if (PLACEHOLDER_DOMAINS.has(domain)) return true;
  return IMAGE_ENDINGS.has(domain.slice(domain.lastIndexOf(".") + 1));
}

function forApplicants(email: string): boolean {
  const local = email.slice(0, email.indexOf("@"));
  const plain = local.replace(/[^a-z0-9]/g, "");
  return (
    HIRING_LOCAL.some((part) => plain.includes(part)) ||
    localWords(local).some((word) => HIRING_WORDS.has(word))
  );
}

// "jobs@acme.com.Benefits" is a missing space after a full stop, not a longer domain.
function dropRunOnWord(email: string): string {
  const labels = email.slice(email.lastIndexOf("@") + 1).split(".");
  const last = labels.at(-1) ?? "";
  const before = labels.at(-2) ?? "";
  if (labels.length > 2 && /^\p{Lu}.*\p{Ll}/u.test(last) && /^[a-z]{2,24}$/.test(before)) {
    return email.slice(0, email.lastIndexOf("."));
  }
  return email;
}

// Addresses written in the post itself, lowercased and deduped, without no-reply, legal or image-file ones.
// Applicant inboxes such as jobs@ come first, since the first one fills the To line.
export function postEmails(text: string, max = MAX_POST_EMAILS): string[] {
  const found: string[] = [];
  for (const [match] of text.matchAll(EMAIL)) {
    const email = dropRunOnWord(match).toLowerCase();
    if (!found.includes(email) && !skipEmail(email)) found.push(email);
  }
  const ranked = [
    ...found.filter(forApplicants),
    ...found.filter((email) => !forApplicants(email)),
  ];
  return ranked.slice(0, max);
}

// The first fill-in left in the text, such as "[first name]".
export function placeholderIn(...texts: string[]): string | null {
  for (const text of texts) {
    const found = PLACEHOLDER.exec(text);
    if (found) return found[0];
  }
  return null;
}

export function gmailUrl({ to, subject, body }: EmailDraft): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;
}

export function outlookUrl({ to, subject, body }: EmailDraft): string {
  return `https://outlook.office.com/mail/deeplink/compose?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}`;
}

function mailtoHref(to: string, subject: string, body: string): string {
  const address = enc(to).replace(/%40/g, "@");
  // RFC 6068 asks for CRLF line breaks in a mailto body.
  const lines = body.replace(/\r?\n/g, "\r\n");
  return `mailto:${address}?subject=${enc(subject)}&body=${enc(lines)}`;
}

// Some email apps drop long mailto links, so a long body is cut at a word and ends with an ellipsis.
export function mailtoLink(
  { to, subject, body }: EmailDraft,
  max = MAILTO_MAX_CHARS,
): { href: string; clipped: boolean } {
  const whole = mailtoHref(to, subject, body);
  if (whole.length <= max) return { href: whole, clipped: false };
  const cuts = [...body.matchAll(/\s+/g)].map((match) => match.index);
  let best = mailtoHref(to, subject, "");
  let low = 0;
  let high = cuts.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const start = body.slice(0, cuts[middle]).trimEnd();
    const href = mailtoHref(to, subject, start ? `${start}…` : "");
    if (href.length <= max) {
      best = href;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return { href: best, clipped: true };
}
