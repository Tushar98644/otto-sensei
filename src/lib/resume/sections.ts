import type { ExtraKind, SectionKey } from "./schema";

export type HeadingMatch = {
  lineIndex: number;
  section: SectionKey;
  text: string;
};

export type HeadingKind = SectionKey | "other";

const PHRASES: Record<HeadingKind, readonly string[]> = {
  experience: [
    "experience", "work experience", "professional experience", "relevant experience", "employment",
    "employment history", "employment experience", "work history", "career history", "professional history",
    "career experience", "job history", "relevant work experience", "professional background", "work",
    "career", "positions", "positions held", "internships", "internship experience", "volunteer",
    "volunteering", "volunteer experience", "volunteer work", "leadership experience", "research experience",
    "teaching experience", "military experience", "military service", "industry experience",
    "freelance experience", "consulting experience", "work and leadership experience",
  ],
  education: [
    "education", "academic background", "educational background", "academic history", "education history",
    "education and training", "academic qualifications", "educational qualifications", "education and qualifications",
    "academics", "academic credentials", "academic profile", "studies", "coursework", "relevant coursework",
    "courses", "schooling", "degrees",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "competencies", "key skills", "core skills",
    "areas of expertise", "expertise", "technical expertise", "skills and abilities", "skills summary",
    "summary of skills", "skill set", "skillset", "skills and expertise", "technologies", "tech stack",
    "technical stack", "tools", "tools and technologies", "technical proficiencies", "proficiencies", "strengths",
    "hard skills", "soft skills", "professional skills", "computer skills", "it skills", "programming languages",
    "languages and tools", "languages and technologies", "languages and frameworks", "technical competencies",
    "key competencies", "capabilities", "abilities", "toolkit", "toolbox", "skills and tools",
    "skills and technologies", "skills and interests", "skills and languages", "specialties", "specializations",
    "areas of specialization", "technical knowledge", "knowledge", "software", "software skills",
  ],
  summary: [
    "summary", "professional summary", "profile", "professional profile", "personal profile", "career profile",
    "about", "about me", "objective", "career objective", "professional objective", "career summary",
    "executive summary", "personal statement", "personal summary", "overview", "professional overview",
    "career overview", "summary of qualifications", "qualifications summary", "highlights", "career highlights",
    "professional highlights", "introduction", "bio", "biography", "background", "who i am",
  ],
  projects: [
    "projects", "personal projects", "side projects", "academic projects", "key projects", "selected projects",
    "notable projects", "featured projects", "relevant projects", "technical projects", "university projects",
    "independent projects", "research projects", "project experience", "project work", "project highlights",
    "capstone project", "capstone projects", "open source", "open source projects", "open source contributions",
    "portfolio", "projects and publications",
  ],
  certifications: [
    "certifications", "certification", "certificates", "licenses", "licences", "licensure",
    "licenses and certifications", "licences and certifications", "certifications and licenses",
    "certifications and licences", "professional certifications", "accreditations", "credentials",
    "training", "training and certifications", "certifications and training", "courses and certifications",
    "certifications and courses", "certificates and training", "professional development", "continuing education",
  ],
  other: [
    "awards", "honors", "honours", "awards and honors", "honors and awards", "awards and honours",
    "honours and awards", "achievements", "key achievements", "accomplishments", "awards and achievements",
    "scholarships", "awards and scholarships", "grants", "fellowships", "recognition", "publications", "patents",
    "presentations", "talks", "speaking", "conferences", "languages", "spoken languages", "language skills",
    "foreign languages", "language proficiency", "selected publications",
    "interests", "hobbies", "hobbies and interests", "interests and hobbies", "personal interests", "activities",
    "extracurricular activities", "extracurriculars", "leadership", "leadership and activities",
    "activities and leadership", "research", "research interests", "teaching", "service", "community service",
    "community involvement", "affiliations", "professional affiliations", "memberships", "professional memberships",
    "associations", "references", "referees", "qualifications", "additional information", "additional", "other",
    "miscellaneous", "personal details", "personal information", "contact", "contact information",
    "contact details", "contact me", "links", "social", "online presence",
  ],
};

const WEAK_HEADINGS = new Set([
  "work", "career", "positions", "volunteer", "volunteering", "studies", "coursework", "courses", "degrees",
  "academics", "tools", "abilities", "capabilities", "knowledge", "software", "specialties", "about",
  "background", "portfolio", "credentials", "training", "talks", "speaking", "leadership", "research",
  "teaching", "service", "additional", "other", "contact", "links", "social", "qualifications",
]);

const HEAD_WORDS: Record<string, HeadingKind> = {
  experience: "experience", experiences: "experience", employment: "experience", internships: "experience",
  internship: "experience", work: "experience", volunteering: "experience",
  education: "education", academics: "education", coursework: "education", studies: "education",
  skills: "skills", skill: "skills", skillset: "skills", competencies: "skills", competences: "skills",
  expertise: "skills", proficiencies: "skills", technologies: "skills", tools: "skills", toolkit: "skills",
  strengths: "skills", capabilities: "skills", specialties: "skills", specializations: "skills",
  summary: "summary", profile: "summary", objective: "summary", overview: "summary", introduction: "summary",
  highlights: "summary", bio: "summary", statement: "summary",
  projects: "projects", project: "projects", portfolio: "projects",
  certifications: "certifications", certification: "certifications", certificates: "certifications",
  licenses: "certifications", licences: "certifications", accreditations: "certifications",
  credentials: "certifications", training: "certifications",
  awards: "other", honors: "other", honours: "other", achievements: "other", accomplishments: "other",
  publications: "other", patents: "other", presentations: "other", languages: "other", interests: "other",
  hobbies: "other", activities: "other", affiliations: "other", memberships: "other", references: "other",
  qualifications: "other", leadership: "other", volunteer: "other",
  courses: "education", responsibility: "other", extracurriculars: "other",
};
const MODIFIERS = new Set([
  "professional", "relevant", "selected", "recent", "key", "core", "technical", "tech", "additional", "other",
  "notable", "featured", "career", "industry", "prior", "previous", "related", "academic", "personal", "side",
  "history", "background", "open", "source", "university", "independent", "freelance", "consulting",
  "international", "global", "and", "of", "the", "my", "in", "for", "language", "software", "programming",
  "teaching", "research", "community", "positions", "taken",
]);

const MAX_HEADING_CHARS = 60;
const MAX_HEADING_WORDS = 6;

const PHRASE_INDEX = new Map<string, HeadingKind>();
const SQUASHED_INDEX = new Map<string, HeadingKind>();
for (const [kind, phrases] of Object.entries(PHRASES) as [HeadingKind, readonly string[]][]) {
  for (const phrase of phrases) {
    PHRASE_INDEX.set(phrase, kind);
    SQUASHED_INDEX.set(phrase.replace(/ /g, ""), kind);
  }
}

export function matchHeading(line: string): SectionKey | null {
  const kind = classifyHeading(line);
  return kind === "other" ? null : kind;
}

export function classifyHeading(line: string): HeadingKind | null {
  if (line.length > 2 * MAX_HEADING_CHARS) return null;
  const segments = line.split("\t").filter((segment) => segment.trim());
  if (segments.length !== 1) return null;
  const raw = unwrapDecoration((segments[0] ?? "").trim());
  if (!raw || raw.length > MAX_HEADING_CHARS || /@|https?:|www\./i.test(raw)) return null;
  if (bulletText(raw) !== null) return null;

  const letters = raw.replace(/[^\p{L}]/gu, "");
  const isCapitals = letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
  const strong = isCapitals || /:\s*$/.test(raw);

  const words = normalizeWords(raw);
  if (words.length === 0) return null;
  const singles = words.filter((word) => word.length === 1).length;
  if (words.length >= 3 && singles / words.length >= 0.7) {
    return SQUASHED_INDEX.get(words.join("")) ?? null;
  }
  if (words.length > MAX_HEADING_WORDS) return null;

  const phrase = words.join(" ");
  if (words.length === 1 && WEAK_HEADINGS.has(phrase) && !strong) return null;
  const exact = PHRASE_INDEX.get(phrase);
  if (exact) return exact;

  let kind: HeadingKind | null = null;
  for (const word of words) {
    const head = HEAD_WORDS[word];
    if (head) kind ??= head;
    else if (!MODIFIERS.has(word)) return null;
  }
  return kind;
}

const EXTRA_PHRASES: Record<ExtraKind, readonly string[]> = {
  languages: ["languages", "spoken languages", "language skills", "foreign languages", "language proficiency"],
  awards: [
    "awards", "honors", "honours", "awards and honors", "honors and awards", "awards and honours", "honours and awards",
    "achievements", "key achievements", "accomplishments", "awards and achievements", "scholarships",
    "awards and scholarships", "grants", "fellowships", "recognition",
  ],
  volunteering: ["community service", "community involvement"],
  publications: ["publications", "selected publications"],
  custom: [],
};
const EXTRA_HEAD_WORDS: Record<string, ExtraKind | null> = {
  languages: "languages",
  awards: "awards", honors: "awards", honours: "awards", achievements: "awards", accomplishments: "awards",
  scholarships: "awards", grants: "awards", fellowships: "awards", recognition: "awards",
  volunteer: "volunteering", volunteering: "volunteering",
  publications: "publications",
  references: null, referees: null, contact: null, links: null, social: null,
};
const DROPPED_HEADINGS = new Set([
  "personal details", "personal information", "contact information", "contact details", "contact me",
  "online presence",
]);
const EXTRA_INDEX = new Map<string, ExtraKind>();
for (const [kind, phrases] of Object.entries(EXTRA_PHRASES) as [ExtraKind, readonly string[]][]) {
  for (const phrase of phrases) EXTRA_INDEX.set(phrase, kind);
}

export function extraKindOf(line: string): ExtraKind | null {
  const kind = classifyHeading(line);
  if (kind !== "other" && kind !== "experience") return null;
  const words = normalizeWords(unwrapDecoration(line.trim()));
  if (kind === "experience") {
    const head = words.find((word) => !MODIFIERS.has(word));
    return head === "volunteer" || head === "volunteering" ? "volunteering" : null;
  }
  const phrase = words.join(" ");
  const exact = EXTRA_INDEX.get(phrase);
  if (exact) return exact;
  if (DROPPED_HEADINGS.has(phrase)) return null;
  for (const word of words) {
    if (Object.hasOwn(EXTRA_HEAD_WORDS, word)) return EXTRA_HEAD_WORDS[word] ?? null;
  }
  return "custom";
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

export function headingTitle(line: string): string {
  const text = unwrapDecoration(line.trim())
    .replace(/\(\s*cont(?:inued|['’]d|\.)?\s*\)/giu, " ")
    .replace(/[\s:]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/\p{Ll}/u.test(text)) return text;
  return text
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word) ? word : word.replace(/\p{L}/u, (letter) => letter.toUpperCase()),
    )
    .join(" ");
}

export function headingsInLine(line: string): { kind: HeadingKind; text: string }[] {
  const whole = classifyHeading(line);
  if (whole) return [{ kind: whole, text: line.trim() }];
  if (!line.includes("\t")) return [];
  const found: { kind: HeadingKind; text: string }[] = [];
  for (const segment of line.split("\t")) {
    const kind = classifyHeading(segment);
    if (kind) found.push({ kind, text: segment.trim() });
  }
  return found;
}

export function findSections(lines: string[]): HeadingMatch[] {
  const matches: HeadingMatch[] = [];
  lines.forEach((line, lineIndex) => {
    for (const { kind, text } of headingsInLine(line)) {
      if (kind !== "other") matches.push({ lineIndex, section: kind, text });
    }
  });
  return matches;
}

export type SectionBlock = {
  kind: HeadingKind | null;
  heading: string;
  start: number;
  lines: string[];
};

export function splitIntoSections(lines: readonly string[]): SectionBlock[] {
  const preamble: SectionBlock = { kind: null, heading: "", start: 0, lines: [] };
  const blocks: SectionBlock[] = [preamble];
  let current = preamble;
  lines.forEach((line, index) => {
    const kind = classifyHeading(line);
    if (!kind) {
      current.lines.push(line);
    } else if (kind !== current.kind || kind === "other" || extraKindOf(line) !== extraKindOf(current.heading)) {
      current = { kind, heading: line.trim(), start: index + 1, lines: [] };
      blocks.push(current);
    }
  });
  return blocks.filter((block) => block.kind !== null || block.lines.length > 0);
}

export function splitInlineHeading(line: string): { kind: HeadingKind; label: string; rest: string } | null {
  const match = /^([^:\t]{2,40}):\s*(.+)$/.exec(line.trim());
  const label = match?.[1]?.trim();
  const rest = match?.[2]?.trim();
  if (!label || !rest) return null;
  const kind = classifyHeading(`${label}:`);
  return kind ? { kind, label, rest } : null;
}

function unwrapDecoration(text: string): string {
  const wrapped = /^[-–—=~*•·|:#_]+\s*(.*?)\s*[-–—=~*•·|:#_]+$/u.exec(text);
  return wrapped ? `${wrapped[1]}${text.endsWith(":") ? ":" : ""}` : text;
}

function normalizeWords(text: string): string[] {
  return text
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .toLowerCase()
    .replace(/[&+/]/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const BULLET_MARKER =
  /^(?:[•●○◦▪▫■□◆◇❖►▸▹▶➢➤➣➔→✓✔☑⦿⁃∙·‣\uf0b7\uf0a7\uf076\uf0d8\uf0fc\uf06e\uf06c\uf0a8\uf0d2\uf0e8]\s*|[-–—*]\s+|\(?\d{1,2}[.)]\s+|o\s+(?=\p{Lu}))/u;

export function bulletText(line: string): string | null {
  const trimmed = line.trim();
  const match = BULLET_MARKER.exec(trimmed);
  if (!match) return null;
  const rest = trimmed.slice(match[0].length).trim();
  return rest || null;
}

const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const YEAR = "(?:19|20)\\d{2}";
const SEASON = "(?:spring|summer|fall|autumn|winter)";
const DATE =
  `(?:${MONTH},?\\s*${YEAR}|${MONTH}\\s*['’]\\d{2}|${SEASON},?\\s+${YEAR}` +
  `|(?:0?[1-9]|1[0-2])[/.-]${YEAR}|${YEAR}[/.-](?:0[1-9]|1[0-2])(?!\\d)|${YEAR})`;
const PRESENT = "(?:present|current|now|today|ongoing|date)";
const RANGE_SEPARATOR = "\\s*(?:-|–|—|―|‒|−|~|to|until|till|through|thru)\\s*";
const EDGE_BEFORE = "(?<![\\p{L}\\p{N}])";
const EDGE_AFTER = "(?![\\p{L}\\p{N}])";

const DATE_RANGE = new RegExp(`${EDGE_BEFORE}(${DATE})${RANGE_SEPARATOR}(${DATE}|${PRESENT})${EDGE_AFTER}`, "giu");
const SINGLE_DATE = new RegExp(`${EDGE_BEFORE}${DATE}${EDGE_AFTER}`, "giu");

export type DateRange = { text: string; start: string; end: string; index: number };

export function findDateRanges(line: string): DateRange[] {
  return [...line.matchAll(DATE_RANGE)].map((match) => ({
    text: match[0],
    start: (match[1] ?? "").trim(),
    end: (match[2] ?? "").trim(),
    index: match.index,
  }));
}

export function findDates(line: string): { text: string; index: number }[] {
  return [...line.matchAll(SINGLE_DATE)].map((match) => ({ text: match[0], index: match.index }));
}

export type DateStyle = "month-name" | "numeric" | "year" | "season";

const STARTS_WITH_SEASON = new RegExp(`^${SEASON}`, "i");
const PRESENT_ONLY = new RegExp(`^${PRESENT}$`, "i");

export function dateStyle(date: string): DateStyle {
  if (STARTS_WITH_SEASON.test(date)) return "season";
  if (/^\p{L}/u.test(date)) return "month-name";
  return /^\d{4}$/.test(date.trim()) ? "year" : "numeric";
}

export function isPresent(date: string): boolean {
  return PRESENT_ONLY.test(date.trim());
}

// Bounded quantifiers (RFC 5321 lengths) so a 40k-character token can't backtrack for long.
const EMAIL = /[A-Z0-9._%+-]{1,64}@[A-Z0-9-]{1,63}(?:\.[A-Z0-9-]{1,63}){0,8}\.[A-Z]{2,24}(?![A-Z0-9-])/i;

export function findEmail(text: string): string | null {
  return text.includes("@") ? (EMAIL.exec(text)?.[0] ?? null) : null;
}

const PHONE_CANDIDATE = /(?<![\p{L}\p{N}+])\+?\(?\d[\d ().-]{5,22}\d(?![\p{L}\p{N}])/gu;
const YEAR_PAIR = /^(?:19|20)\d{2}\s*[-.]?\s*(?:19|20)\d{2}$/;
const DAY_MONTH_YEAR = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$|^(?:19|20)\d{2}[./-]\d{1,2}[./-]\d{1,2}$/;

export function findPhone(text: string): string | null {
  for (const match of text.matchAll(PHONE_CANDIDATE)) {
    const candidate = match[0].trim();
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    if (YEAR_PAIR.test(candidate) || DAY_MONTH_YEAR.test(candidate)) continue;
    if (/\s{2,}/.test(candidate)) continue;
    if (digits.length === candidate.length && digits.length < 10) continue;
    return candidate;
  }
  return null;
}

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s|,;<>"'()[\]{}]{1,500}|(?<![\p{L}\p{N}.@-])(?:[a-z0-9-]{1,63}\.){0,4}(?:linkedin\.com|github\.com|gitlab\.com|bitbucket\.org|behance\.net|dribbble\.com|medium\.com|stackoverflow\.com|kaggle\.com)\/[^\s|,;<>"'()[\]{}]{0,500}/giu;

const LINK_LABELS: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "bitbucket.org": "Bitbucket",
  "behance.net": "Behance",
  "dribbble.com": "Dribbble",
  "medium.com": "Medium",
  "stackoverflow.com": "Stack Overflow",
  "kaggle.com": "Kaggle",
};

export type FoundLink = { label: string; url: string };

export function isLinkText(value: string): boolean {
  if (/\s/.test(value) || !value.includes("/")) return false;
  return !/\p{Lu}/u.test(value) || /\.[a-z]{2,}\//i.test(value);
}

export function findLinks(text: string): FoundLink[] {
  const seen = new Set<string>();
  const links: FoundLink[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(/[.,;:!?]+$/, "");
    const key = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const host = key.split("/")[0] ?? key;
    const site = Object.keys(LINK_LABELS).find((domain) => host === domain || host.endsWith(`.${domain}`));
    links.push({ label: (site && LINK_LABELS[site]) || host, url });
  }
  return links;
}
