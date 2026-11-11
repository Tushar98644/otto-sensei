import type { ExtraKind, SectionKey } from "./schema";

// How resume text is structured: section headings, plus the line-level patterns (bullets, dates,
// contact details) that the heuristic parser and the recruiter checks both rely on. Client-safe.

export type HeadingMatch = {
  lineIndex: number;
  section: SectionKey;
  text: string;
};

// "other" is a real heading for a section outside the six standard ones (awards, languages...).
// It still ends the section above it, so awards don't leak into skills. extraKindOf() says which
// extra section it becomes, if any.
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

// Single words that also show up as plain list items ("Leadership" in a soft-skills list, a DOCX
// list whose bullets mammoth drops). They only count as headings in capitals or with a colon.
const WEAK_HEADINGS = new Set([
  "work", "career", "positions", "volunteer", "volunteering", "studies", "coursework", "courses", "degrees",
  "academics", "tools", "abilities", "capabilities", "knowledge", "software", "specialties", "about",
  "background", "portfolio", "credentials", "training", "talks", "speaking", "leadership", "research",
  "teaching", "service", "additional", "other", "contact", "links", "social", "qualifications",
]);

// For combinations the phrase list doesn't spell out ("Selected Professional Experience"): every word
// must be a known heading word, and the first head word decides the section.
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
  // "Responsibilities:" alone often labels a job's own bullets, so only the singular counts.
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

/**
 * Maps a resume heading line to a canonical section, or null when the line isn't a heading.
 * Covers common variants and casing: "WORK EXPERIENCE", "Professional Experience",
 * "Employment History" -> experience; "Technical Skills", "Core Competencies" -> skills;
 * "Profile", "About Me", "Professional Summary" -> summary; "Licenses & Certifications" ->
 * certifications; "Personal Projects" -> projects; "Academic Background" -> education.
 * Rejects long lines and lines that read like sentences.
 */
export function matchHeading(line: string): SectionKey | null {
  const kind = classifyHeading(line);
  return kind === "other" ? null : kind;
}

// Like matchHeading, but also recognises headings of sections the schema doesn't model.
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
  // "W O R K  E X P E R I E N C E": mostly one-letter tokens means letter-spaced capitals.
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

// Which extra section a whole-line heading becomes. Volunteer headings count as work history for
// the recruiter checks (classifyHeading says "experience"), but they get their own section here.
// Contact details, personal details and references are never kept: null.
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

// "HONORS & AWARDS:" -> "Honors & Awards", "— Volunteer work (continued) —" -> "Volunteer work".
// Mixed-case headings keep the person's own capitals.
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

// Headings in a line, including side-by-side ones ("SKILLS⇥EXPERIENCE") that a two-column page
// produces when both columns have a heading on the same row.
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

// All heading lines in reading order.
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
  // null for the lines before the first heading (name and contact details, usually).
  kind: HeadingKind | null;
  heading: string;
  // Index in the input of the block's first content line.
  start: number;
  lines: string[];
};

// Splits lines at whole-line headings. A heading of the same kind right after a block continues it
// ("EXPERIENCE" on page 1, "EXPERIENCE (CONTINUED)" on page 2). "other" blocks never merge, so
// "AWARDS" and "LANGUAGES" stay apart, and neither do work and volunteer experience.
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

// "Technical Skills: Python, Go" -> { kind: "skills", label: "Technical Skills", rest: "Python, Go" }.
export function splitInlineHeading(line: string): { kind: HeadingKind; label: string; rest: string } | null {
  const match = /^([^:\t]{2,40}):\s*(.+)$/.exec(line.trim());
  const label = match?.[1]?.trim();
  const rest = match?.[2]?.trim();
  if (!label || !rest) return null;
  const kind = classifyHeading(`${label}:`);
  return kind ? { kind, label, rest } : null;
}

// "— EXPERIENCE —", "| Skills |", "::: Projects :::" -> the words inside.
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

// ---------------------------------------------------------------------------------------------
// Line patterns shared by the heuristic parser and the recruiter checks.

// Symbol bullets (including the private-use glyphs Word's bullets become in PDF text), dashes and
// asterisks followed by a space, "1." / "1)" numbering, and Word's "o" sub-bullet.
const BULLET_MARKER =
  /^(?:[•●○◦▪▫■□◆◇❖►▸▹▶➢➤➣➔→✓✔☑⦿⁃∙·‣\uf0b7\uf0a7\uf076\uf0d8\uf0fc\uf06e\uf06c\uf0a8\uf0d2\uf0e8]\s*|[-–—*]\s+|\(?\d{1,2}[.)]\s+|o\s+(?=\p{Lu}))/u;

// The text after a leading bullet marker, or null when the line doesn't start with one.
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

// "Jan 2021 - Present", "2019 – 2021", "03/2020 to 06/2022", kept exactly as written.
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

// Quantifiers are bounded (RFC 5321 lengths) so a 40k-character token can't trigger quadratic
// backtracking.
const EMAIL = /[A-Z0-9._%+-]{1,64}@[A-Z0-9-]{1,63}(?:\.[A-Z0-9-]{1,63}){0,8}\.[A-Z]{2,24}(?![A-Z0-9-])/i;

export function findEmail(text: string): string | null {
  return text.includes("@") ? (EMAIL.exec(text)?.[0] ?? null) : null;
}

// Digit runs that may hold a phone number; findPhone() then rules out dates, years and ids.
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
    // Bare digit strings without a "+" or separators are more often ids than phone numbers.
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

/**
 * "portfolio/jane", "bit.ly/Jane-CV": the visible text of a link (whose address a PDF keeps
 * apart), not words. "Designer/Developer" and "iOS/Android" are words.
 */
export function isLinkText(value: string): boolean {
  if (/\s/.test(value) || !value.includes("/")) return false;
  return !/\p{Lu}/u.test(value) || /\.[a-z]{2,}\//i.test(value);
}

// URLs exactly as written (no protocol added), labelled by site.
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
