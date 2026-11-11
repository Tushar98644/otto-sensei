import { TEXT_LIMITS } from "@/config/plans";
import {
  EXTRA_KIND_LABELS,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  ResumeSchema,
  SECTION_KEYS,
  emptyResume,
  newId,
  type Basics,
  type Bullet,
  type Certification,
  type Education,
  type Experience,
  type ExtraItem,
  type ExtraKind,
  type ExtraSection,
  type Project,
  type Resume,
  type SectionKey,
  type SkillGroup,
} from "./schema";
import {
  bulletText,
  extraKindOf,
  findDateRanges,
  findDates,
  findEmail,
  findLinks,
  findPhone,
  headingTitle,
  isLinkText,
  splitInlineHeading,
  splitIntoSections,
  type DateRange,
  type FoundLink,
  type SectionBlock,
} from "./sections";

// Schema caps (see ./schema). Clipping to them means the result always passes ResumeSchema.
const LIMITS = {
  text: 200,
  label: 100,
  url: 500,
  email: 254,
  phone: 50,
  date: 50,
  summary: 3_000,
  bullet: 1_000,
  item: 100,
  links: 10,
  experience: 40,
  experienceBullets: 40,
  education: 20,
  educationBullets: 20,
  projects: 30,
  projectBullets: 20,
  skillGroups: 30,
  skillItems: 100,
  certifications: 40,
  extraTitle: 100,
  extraDetail: 500,
  extraBullets: 20,
} as const;
const MAX_LINES = 2_000;

/**
 * Rule-based text -> Resume, used when the Claude API key is missing (demo mode) or the AI call
 * fails. Must never throw and never invent content: anything it can't place goes into the summary
 * or stays out. Detects name (first non-empty line), email/phone/links via regex, sections via
 * findSections, bullets via leading markers (•, -, *, ▪, numbered) or one line per item.
 * Returns source: "import".
 */
export function heuristicParse(text: string, now = Date.now()): Resume {
  const input = typeof text === "string" ? text.slice(0, TEXT_LIMITS.resumeChars) : "";
  try {
    const parsed = ResumeSchema.safeParse(parse(input, now));
    if (parsed.success) return parsed.data;
  } catch {
    // Fall through: a parser bug must never break an import.
  }
  return { ...emptyResume(now), source: "import", summary: clip(input, LIMITS.summary) };
}

function parse(text: string, now: number): Resume {
  const lines = toLines(text).slice(0, MAX_LINES);
  const blocks = splitIntoSections(lines);
  const first = blocks[0];
  const top = first && first.kind === null ? first.lines : [];
  // "Skills: Python, Go" under the name, with no Skills heading anywhere, is still a skills list.
  const isInlineSkills = (line: string) => splitInlineHeading(line)?.kind === "skills";
  const preamble = top.filter((line) => !isInlineSkills(line));
  const sections = blocks.filter((block) => block.kind !== null);

  // References list other people's phone numbers, so they're never searched for contact details.
  const contactText = blocks
    .filter((block) => !/refer/i.test(block.heading))
    .flatMap((block) => block.lines)
    .join("\n");
  const { basics, leftovers } = parseBasics(preamble, contactText);

  const resume: Resume = { ...emptyResume(now), source: "import", basics };
  resume.skills.push(...parseSkills(top.filter(isInlineSkills)));
  const summaries: string[] = [];
  const order: SectionKey[] = [];
  const extras: ExtraSection[] = [];
  for (const block of sections) {
    const extraKind = block.kind === "other" || block.kind === "experience" ? extraKindOf(block.heading) : null;
    if (extraKind) {
      addExtra(extras, parseExtra(block, extraKind));
      continue;
    }
    if (block.kind && block.kind !== "other" && !order.includes(block.kind)) order.push(block.kind);
    if (block.kind === "summary") summaries.push(paragraph(block.lines));
    else if (block.kind === "experience") resume.experience.push(...parseExperience(block.lines));
    else if (block.kind === "education") addEducation(resume.education, block);
    else if (block.kind === "projects") resume.projects.push(...parseProjects(block.lines));
    else if (block.kind === "skills") resume.skills.push(...parseSkills(block.lines));
    else if (block.kind === "certifications") resume.certifications.push(...parseCertifications(block.lines));
  }
  // Without a summary heading, prose under the name is the summary. Without any heading at all
  // nothing can be placed reliably, so the whole body goes there for the user to sort out.
  if (summaries.length === 0) summaries.push(paragraph(sections.length === 0 ? leftovers : leftovers.filter(isProse)));

  resume.summary = clip(summaries.filter(Boolean).join("\n\n"), LIMITS.summary);
  resume.experience = resume.experience.slice(0, LIMITS.experience);
  resume.education = resume.education.slice(0, LIMITS.education);
  resume.projects = resume.projects.slice(0, LIMITS.projects);
  resume.skills = resume.skills.slice(0, LIMITS.skillGroups);
  resume.certifications = resume.certifications.slice(0, LIMITS.certifications);
  resume.extras = extras.slice(0, MAX_EXTRA_SECTIONS);
  resume.sectionOrder = [...order, ...SECTION_KEYS.filter((key) => !order.includes(key))];
  return resume;
}

// ---------------------------------------------------------------------------------------------
// Name and contact details

const LABEL_WORDS = "e-?mail|phone|tel(?:ephone)?|mobile|mob|cell|whatsapp|linkedin|github|website|web|portfolio|address|location";
// "Email: ..." loses its label; a bare "Email" left over once the address is removed is dropped.
const CONTACT_LABEL = new RegExp(`^(?:${LABEL_WORDS})\\s*[:.]\\s*`, "i");
const BARE_LABEL = new RegExp(`^(?:${LABEL_WORDS})$`, "i");
const DOCUMENT_TITLE = /^(?:resume|résumé|curriculum vitae|cv)$/i;
// A profile, not a repository or a post: linkedin.com/in/jane, github.com/jane, behance.net/jane.
const PROFILE_LINK =
  /^(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[^/\s]+|(?:github\.com|gitlab\.com|behance\.net|dribbble\.com|kaggle\.com)\/[^/\s]+)\/?$/i;

function parseBasics(preamble: readonly string[], contactText: string): { basics: Basics; leftovers: string[] } {
  const header = preamble.join("\n");
  const email = findEmail(header) ?? findEmail(contactText) ?? "";
  const phone = findPhone(header) ?? findPhone(contactText) ?? "";
  // Profile links anywhere count; other URLs only from the header (body URLs belong to projects).
  const links = dedupeLinks([...findLinks(header), ...findLinks(contactText).filter((link) => PROFILE_LINK.test(link.url))]);
  const contact = [email, phone, ...links.map((link) => link.url)].filter(Boolean);

  let name = "";
  let headline = "";
  let location = "";
  const leftovers: string[] = [];
  for (const line of preamble) {
    let used = false;
    let hasOtherText = false;
    const rest = removeAll(line, contact);
    for (const segment of segmentsOf(rest)) {
      const value = segment.replace(CONTACT_LABEL, "").trim();
      if (!value || BARE_LABEL.test(value) || DOCUMENT_TITLE.test(value)) continue;
      const labelledLocation = /^(?:address|location)\b/i.test(segment);
      if (!name && isNameLike(value)) name = value;
      else if (!location && (labelledLocation || isLocation(value))) location = value;
      else if (name && !headline && isHeadlineLike(value)) headline = value;
      else {
        hasOtherText = true;
        continue;
      }
      used = true;
    }
    // A contact line's other bits are icon glyphs and link labels ("° portfolio/jane"), not a summary.
    if (rest !== line) continue;
    if (hasOtherText || (!used && isProse(line))) leftovers.push(line);
  }
  return {
    basics: {
      name: clip(name, LIMITS.text),
      headline: clip(headline, LIMITS.text),
      email: clip(email, LIMITS.email),
      phone: clip(phone, LIMITS.phone),
      location: clip(location, LIMITS.text),
      links: links.slice(0, LIMITS.links).map((link) => ({
        id: newId(),
        label: clip(link.label, LIMITS.label),
        url: clip(link.url, LIMITS.url),
      })),
    },
    leftovers,
  };
}

function removeAll(line: string, values: readonly string[]): string {
  return values.reduce((rest, value) => rest.split(value).join("\t"), line);
}

function dedupeLinks(links: readonly FoundLink[]): FoundLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNameLike(value: string): boolean {
  return (
    value.length <= 60 &&
    value.split(/\s+/).length <= 6 &&
    /\p{L}/u.test(value) &&
    !/[\d@/:]/.test(value) &&
    !value.endsWith(".")
  );
}

function isHeadlineLike(value: string): boolean {
  return (
    value.length <= 120 &&
    value.split(/\s+/).length <= 14 &&
    (value.match(/\p{L}/gu)?.length ?? 0) >= 2 &&
    !value.includes("@") &&
    !value.endsWith(".") &&
    !isLinkText(value)
  );
}


// "Berlin, Germany", "Austin, TX 78701", "Rio de Janeiro, Brazil", "Remote". Short capitalised
// place names only, so "Senior Engineer, Acme Corp" isn't mistaken for a city.
const PLACE = "\\p{Lu}[\\p{L}.'-]*(?:\\s+(?:\\p{Lu}[\\p{L}.'-]*|de|da|do|del|la|le|of|upon|am|an))*";
const LOCATION = new RegExp(`^${PLACE},\\s*${PLACE}(?:,\\s*${PLACE})?(?:\\s+\\d{4,6})?$`, "u");

function isLocation(value: string): boolean {
  if (/^(?:remote|hybrid|on-?site)\b/i.test(value)) return true;
  if (value.length > 50 || !LOCATION.test(value)) return false;
  return value.split(/,\s*/).every((part) => part.split(/\s+/).length <= 3 && !NOT_A_PLACE.test(part));
}

// ---------------------------------------------------------------------------------------------
// Experience

type Entry = { header: string[]; range: DateRange | null; date: string | null; body: string[] };

const TITLE_WORDS =
  /\b(?:engineer|developer|manager|designer|analyst|intern|lead|director|consultant|specialist|scientist|architect|officer|coordinator|associate|assistant|administrator|head|vp|vice president|president|founder|co-?founder|owner|partner|teacher|tutor|nurse|accountant|representative|technician|writer|editor|researcher|professor|lecturer|programmer|advisor|adviser|strategist|producer|marketer|recruiter|executive|supervisor|agent|clerk|chef|attorney|lawyer|paralegal|pharmacist|physician|therapist|trainee|apprentice|fellow|volunteer|instructor|coach|mentor|operator|planner|controller|auditor|economist|swe|sde|cto|ceo|cfo|coo)\b/i;
const COMPANY_WORDS =
  /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|co|company|plc|ag|bv|pty|technologies|technology|labs|group|solutions|systems|software|consulting|partners|bank|agency|studio|studios|ventures|capital|holdings|foundation|hospital|media|networks|services)\b\.?/i;
const CORPORATE_SUFFIX = /^(?:inc|llc|ltd|co|corp|plc|gmbh)\.?$/i;
// Strong signals only, for deciding where a job starts: "group" or "systems" also turn up in
// descriptions, a legal suffix doesn't. Role nouns are singular in titles ("engineer") and often
// plural in descriptions ("mentored two engineers").
const COMPANY_NAME = /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|plc|ag|bv|pty|labs|bank)\b\.?/i;
const looksLikeJobHeader = (line: string) =>
  line.split(/\s+/).length <= 8 && (TITLE_WORDS.test(line) || COMPANY_NAME.test(line));

function parseExperience(lines: readonly string[]): Experience[] {
  return groupEntries(lines)
    .map((entry): Experience => {
      const { parts, location } = headerFields(entry.header);
      const [title, company] = assignTitleAndCompany(parts);
      const single = entry.range ? null : (entry.date ?? firstSingleDate(entry.header));
      return {
        id: newId(),
        title: clip(title, LIMITS.text),
        company: clip(company, LIMITS.text),
        location: clip(location, LIMITS.text),
        startDate: clip(entry.range?.start ?? single ?? "", LIMITS.date),
        endDate: clip(entry.range?.end ?? "", LIMITS.date),
        bullets: toBullets(entry.body, LIMITS.experienceBullets),
      };
    })
    .filter((job) => job.title || job.company || job.bullets.length > 0);
}

// Splits a section into entries anchored on their date lines, which every common layout has:
// "Title / Company | dates", "Title, Company <tab> dates", "dates / Title, Company", ...
function groupEntries(lines: readonly string[]): Entry[] {
  const isBullet = lines.map((line) => bulletText(line) !== null);
  const ranges = lines.map((line, i) => (isBullet[i] ? null : (findDateRanges(line)[0] ?? null)));
  const singles = lines.map((line, i) => (isBullet[i] || ranges[i] ? null : setApartDate(line)));
  const anchors = lines.flatMap((_, i) => (ranges[i] || singles[i] ? [i] : []));
  if (anchors.length === 0) return groupWithoutDates(lines);

  // With bullet markers, unmarked lines between jobs are headers. Without them, a short line above
  // a date could just as well be the last line of the previous job, so only clear titles qualify.
  const usesMarkers = isBullet.some(Boolean);
  const canLeadHeader = (i: number) => {
    const line = lines[i] ?? "";
    if (isBullet[i] || !isTitleLike(line)) return false;
    if (i > 0 && isBullet[i - 1] && continues(lines[i - 1] ?? "", line)) return false;
    return usesMarkers || looksLikeJobHeader(line);
  };
  const starts = anchors.map((anchor, k) => {
    const floor = k === 0 ? 0 : (anchors[k - 1] ?? 0) + 1;
    const maxBack = usesMarkers ? 3 : 2;
    let start = anchor;
    while (start - 1 >= floor && anchor - start < maxBack && canLeadHeader(start - 1)) start--;
    return start;
  });

  return anchors.map((anchor, k) => {
    const start = starts[k] ?? anchor;
    const next = starts[k + 1] ?? lines.length;
    // "dates / Title, Company / Location" puts the header after the date line.
    const dateOnly = !segmentsOf(stripDates(lines[anchor] ?? "")).length && start === anchor;
    let end = anchor;
    for (let j = anchor + 1; j < next && j <= anchor + 2; j++) {
      const line = lines[j] ?? "";
      if (isBullet[j] || !isTitleLike(line)) break;
      const firstAfterDates = dateOnly && j === anchor + 1;
      const headerLike = isLocation(line) || (usesMarkers ? isBullet[j + 1] === true : looksLikeJobHeader(line));
      if (!firstAfterDates && !headerLike) break;
      end = j;
    }
    return {
      header: lines.slice(start, end + 1),
      range: ranges[anchor] ?? null,
      date: singles[anchor] ?? null,
      body: lines.slice(end + 1, next),
    };
  });
}

// A lone date set apart from the words before it ("Developer Intern<tab>Summer 2020", "Acme | 2019"),
// as opposed to one inside a sentence ("Led the 2020 migration").
function setApartDate(line: string): string | null {
  if (!isTitleLike(line)) return null;
  const date = findDates(line).at(-1);
  if (!date) return null;
  const before = line.slice(0, date.index).replace(/ +$/, "");
  const after = line.slice(date.index + date.text.length).trim();
  const apart = before === "" || /[\t|,(–—-]$/.test(before);
  return apart && /^[)\]]?$/.test(after) ? date.text : null;
}

// No dates anywhere: an entry is a run of header-looking lines followed by its body.
function groupWithoutDates(lines: readonly string[]): Entry[] {
  const entries: Entry[] = [];
  let current: Entry | undefined;
  let previous = "";
  for (const line of lines) {
    const isHeader = bulletText(line) === null && isTitleLike(line);
    // Once a job has body text, a header-looking line opens the next job if it names a role or a
    // company, or if it follows a marked bullet without continuing it.
    const opensEntry =
      isHeader &&
      current !== undefined &&
      current.body.length > 0 &&
      (looksLikeJobHeader(line) || (bulletText(previous) !== null && !continues(previous, line)));
    if (!current || opensEntry) {
      current = { header: [], range: null, date: null, body: [] };
      entries.push(current);
    }
    if (isHeader && current.body.length === 0 && current.header.length < 3) current.header.push(line);
    else current.body.push(line);
    previous = line;
  }
  return entries;
}

// Header lines -> descriptive parts in reading order (title and company, in some order) plus a location.
function headerFields(header: readonly string[]): { parts: string[]; location: string } {
  const parts: string[] = [];
  let location = "";
  for (const line of header) {
    for (const segment of segmentsOf(stripDates(line))) {
      if (isLinkText(segment)) continue;
      const trailing = splitTrailingLocation(segment);
      if (!location && isLocation(segment)) location = segment;
      else if (!location && trailing) {
        location = trailing.location;
        parts.push(...splitTitleAndCompany(trailing.rest));
      } else {
        parts.push(...splitTitleAndCompany(segment));
      }
    }
  }
  return { parts, location };
}

// "Acme Corp, San Francisco, CA" -> rest "Acme Corp", location "San Francisco, CA".
function splitTrailingLocation(segment: string): { rest: string; location: string } | null {
  const parts = segment.split(/,\s*/);
  if (parts.length < 3) return null;
  const location = parts.slice(-2).join(", ");
  return isLocation(location) ? { rest: parts.slice(0, -2).join(", "), location } : null;
}

// "Engineer at Acme", "Software Engineer, Acme Corp" -> two parts; "Acme, Inc." stays whole.
function splitTitleAndCompany(segment: string): string[] {
  const at = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(segment);
  if (at?.[1] && at[2] && TITLE_WORDS.test(at[1])) return [at[1].trim(), at[2].trim()];
  const comma = /^([^,]+),\s*([^,]+)$/.exec(segment);
  const left = comma?.[1]?.trim();
  const right = comma?.[2]?.trim();
  if (!left || !right || CORPORATE_SUFFIX.test(right)) return [segment];
  return TITLE_WORDS.test(left) || TITLE_WORDS.test(right) || COMPANY_WORDS.test(right) ? [left, right] : [segment];
}

function assignTitleAndCompany(parts: readonly string[]): [string, string] {
  const [first = "", second = "", ...rest] = parts;
  const others = [second, ...rest].filter(Boolean).join(", ");
  // Company-first layouts ("Acme Corp | Senior Engineer") are as common as title-first ones.
  const firstIsCompany = COMPANY_WORDS.test(first) && !TITLE_WORDS.test(first);
  const secondIsTitle = TITLE_WORDS.test(second) && !COMPANY_WORDS.test(second) && !TITLE_WORDS.test(first);
  if (second && (firstIsCompany || secondIsTitle)) return [[second, ...rest].join(", "), first];
  // "Program - Organisation <tab> dates / Student Developer": the one part that names a role.
  const roles = parts.filter((part) => TITLE_WORDS.test(part.split(/\s+/).at(-1) ?? ""));
  const [role] = roles;
  if (role && roles.length === 1 && !TITLE_WORDS.test(first)) {
    return [role, parts.filter((part) => part !== role).join(", ")];
  }
  return [first, others];
}

function firstSingleDate(lines: readonly string[]): string | null {
  for (const line of lines) {
    const date = findDates(line)[0];
    if (date) return date.text;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Education

const SCHOOL_WORDS =
  /\b(?:university|universit[äéà]t?|universidad|universidade|college|school|institute|institution|academy|polytechnic|conservatory|seminary|hochschule|univ\.|iit|nit)\b/i;
const DEGREE_WORDS =
  /\b(?:bachelors?|masters?|doctor|doctorate|ph\.?\s?d|associate|diploma|certificate|degree|b\.?\s?sc|m\.?\s?sc|b\.?\s?s|m\.?\s?s|b\.?\s?a|m\.?\s?a|mba|bba|b\.?\s?tech|m\.?\s?tech|b\.?\s?eng|m\.?\s?eng|b\.?\s?e|m\.?\s?e|b\.?\s?com|m\.?\s?com|bca|mca|llb|llm|j\.?d|m\.?d|bfa|mfa|b\.?\s?ed|m\.?\s?ed|a-levels?|gcses?|high school|ged|hnd)(?![\p{L}])/iu;

// Words that never appear in a place name. Short abbreviations ("Co", "MA", "MS") are left out on
// purpose: they're also state codes, as in "Denver, CO" or "Boston, MA". Schools are matched by the
// shape of their names ("University of ...", "... College"), since "College Park" is a city.
const NOT_A_PLACE = new RegExp(
  [
    TITLE_WORDS.source,
    /^(?:university|college|institute|school|academy)\s+of\b|\b(?:university|college|institute|school|academy|polytechnic)$/
      .source,
    /\b(?:inc|llc|ltd|limited|gmbh|corp|corporation|company|plc|technologies|labs|group|solutions|systems|software|consulting|partners|bank|agency|studios?|ventures|capital|holdings|foundation|hospital|media|networks|services)\b/
      .source,
    /\b(?:bachelors?|masters?|doctorate|diploma|degree|certificate)\b/.source,
  ].join("|"),
  "i",
);
// "BSc Computer Science" -> "BSc" + "Computer Science".
const DEGREE_ABBREVIATION =
  /^((?:B|M)\.?\s?(?:Sc|S|A|Eng|E|Tech|Com|Ed|Phil|FA|BA)\.?|MBA|BBA|BCA|MCA|Ph\.?\s?D\.?|LL\.?B\.?|LL\.?M\.?|J\.?D\.?|M\.?D\.?)\s+(?!in\b|of\b)(\p{Lu}.*)$/u;

type EducationDraft = Omit<Education, "id" | "bullets"> & { bullets: string[] };
type EducationFields = Omit<EducationDraft, "bullets"> & { extras: string[] };
const EDUCATION_KEYS = ["school", "degree", "field", "location", "startDate", "endDate"] as const;

// Entries split where a second school, degree or date would land on the one being filled.
function parseEducation(lines: readonly string[]): Education[] {
  const drafts: EducationDraft[] = [];
  const open = (): EducationDraft => {
    const draft: EducationDraft = { school: "", degree: "", field: "", location: "", startDate: "", endDate: "", bullets: [] };
    drafts.push(draft);
    return draft;
  };
  let current: EducationDraft | undefined;
  for (const line of lines) {
    const bullet = bulletText(line);
    if (isTableHeading(line)) continue;
    if (bullet !== null || !isTitleLike(line)) {
      current ??= open();
      current.bullets.push(bullet ?? line);
      continue;
    }
    const fields = educationFields(line);
    const draft: EducationDraft = current ?? open();
    const collides =
      (fields.school && draft.school) ||
      (fields.degree && draft.degree) ||
      ((fields.startDate || fields.endDate) && (draft.startDate || draft.endDate)) ||
      (draft.bullets.length > 0 && (fields.school || fields.degree));
    const target: EducationDraft = collides ? open() : draft;
    current = target;
    for (const key of EDUCATION_KEYS) {
      if (fields[key] && !target[key]) target[key] = fields[key];
    }
    for (const extra of fields.extras) {
      // "GPA 3.9", "Coursework: ..." are details, not names.
      if (/[\d:]/.test(extra)) target.bullets.push(extra);
      else if (!target.school) target.school = extra;
      else if (!target.degree) target.degree = extra;
      else if (!target.field) target.field = extra;
      else target.bullets.push(extra);
    }
  }
  return drafts
    .filter((draft) => draft.school || draft.degree || draft.bullets.length > 0)
    .map((draft) => ({
      id: newId(),
      school: clip(draft.school, LIMITS.text),
      degree: clip(draft.degree, LIMITS.text),
      field: clip(draft.field, LIMITS.text),
      location: clip(draft.location, LIMITS.text),
      startDate: clip(draft.startDate, LIMITS.date),
      endDate: clip(draft.endDate, LIMITS.date),
      bullets: finishBullets(draft.bullets, LIMITS.educationBullets),
    }));
}

// "Degree/Certificate<tab>Institute/Board<tab>CGPA/Percentage<tab>Year": the head of a table.
const TABLE_HEADING_WORD =
  /^(?:degree|certificate|qualification|course|program(?:me)?|institute|institution|board|university|school|college|c?gpa|cpi|percentage|grade|marks|score|result|year|duration|session)s?$/i;

function isTableHeading(line: string): boolean {
  const cells = line.split(/\t+/);
  return cells.length >= 2 && cells.every((cell) => cell.split(/\s*[/&]\s*|\s+/).every((word) => TABLE_HEADING_WORD.test(word)));
}

// "Relevant Coursework" under its own heading lists courses of a degree above it.
function addEducation(education: Education[], block: SectionBlock): void {
  // Entries run newest first, so the courses belong to the first (latest) degree.
  const latest = education[0];
  if (latest && /\bcourse/i.test(block.heading)) {
    const courses = block.lines.map((line) => (bulletText(line) ?? line).split(/\t+/).join(", "));
    latest.bullets = [...latest.bullets, ...finishBullets(courses, LIMITS.educationBullets)].slice(0, LIMITS.educationBullets);
    return;
  }
  education.push(...parseEducation(block.lines));
}

function educationFields(line: string): EducationFields {
  const fields: EducationFields = { school: "", degree: "", field: "", location: "", startDate: "", endDate: "", extras: [] };
  const range = findDateRanges(line)[0];
  let rest = line;
  if (range) {
    fields.startDate = range.start;
    fields.endDate = range.end;
    rest = stripDates(line);
  } else {
    // A single date on an education line is almost always the graduation date.
    const single = findDates(line)[0]?.text ?? "";
    fields.endDate = single;
    if (single) rest = line.replace(single, "\t");
  }
  // Peel off "City, Region" first, so "University of Maryland, College Park, MD" keeps its name.
  const pieces = segmentsOf(rest).flatMap((segment) => {
    const trailing = fields.location ? null : splitTrailingLocation(segment);
    if (trailing) fields.location = trailing.location;
    return splitSchoolAndDegree(trailing ? trailing.rest : segment);
  });
  for (const segment of pieces) {
    if (!fields.location && isLocation(segment)) {
      fields.location = segment;
    } else if (!fields.degree && DEGREE_WORDS.test(segment) && !SCHOOL_WORDS.test(segment)) {
      const split = /^(.+?)\s+in\s+(.+)$/i.exec(segment) ?? DEGREE_ABBREVIATION.exec(segment);
      fields.degree = split?.[1]?.trim() ?? segment;
      fields.field = split?.[2]?.trim() ?? "";
    } else if (!fields.school && SCHOOL_WORDS.test(segment)) {
      fields.school = segment;
    } else {
      fields.extras.push(segment);
    }
  }
  return fields;
}

// "BSc Physics, University of Leeds, Leeds" -> ["BSc Physics", "University of Leeds, Leeds"].
function splitSchoolAndDegree(segment: string): string[] {
  const parts = segment.split(/,\s*/);
  const schoolAt = parts.findIndex((part) => SCHOOL_WORDS.test(part));
  const degreeAt = parts.findIndex((part) => DEGREE_WORDS.test(part) && !SCHOOL_WORDS.test(part));
  if (schoolAt < 0 || degreeAt < 0) return [segment];
  const cut = Math.max(schoolAt, degreeAt);
  return [parts.slice(0, cut).join(", "), parts.slice(cut).join(", ")];
}

// ---------------------------------------------------------------------------------------------
// Projects, skills, certifications

// "demo/github", "github/Apex", "Details": where a PDF had a link, read as text.
const LINK_WORDS = /^(?:demo|live|code|source|github|gitlab|website|site|link|links|details|repo|app|video|slides)(?:\s*\/\s*[\w.-]+)?$/i;
const isLinkWord = (segment: string) => LINK_WORDS.test(segment) || isLinkText(segment);

type ProjectDraft = { name: string; link: string; bullets: string[]; dated: boolean; body: number };

function parseProjects(lines: readonly string[]): Project[] {
  const drafts: ProjectDraft[] = [];
  const open = (): ProjectDraft => {
    const draft: ProjectDraft = { name: "", link: "", bullets: [], dated: false, body: 0 };
    drafts.push(draft);
    return draft;
  };
  let current: ProjectDraft | undefined;
  for (const line of lines) {
    const bullet = bulletText(line);
    const last = current?.bullets.at(-1);
    const link = findLinks(line)[0]?.url ?? "";
    const withoutLink = link ? line.split(link).join("\t").trim() : line;
    const undated = stripDates(withoutLink);
    // "Typeface Finder - A tool that names any font." names the project and describes it at once.
    const named = /^([^:—–]{2,60}?)(?:\s+[—–-]\s+|:\s+)(.+)$/.exec(undated);
    const namePart = named?.[1] ?? withoutLink;
    const dated = undated !== withoutLink.trim();
    // "Name – tagline" opens the next project even when the last one has no bullets yet.
    const dashed = /^[^:—–]{2,60}?\s+[—–-]\s/.test(undated);
    const startsProject = isTitleLike(namePart) && (!current || current.body > 0 || !current.name || dashed);
    // The line under a project's name, before its bullets: "Go | Postgres | AWS<tab>demo/github".
    const segments = segmentsOf(undated);
    const details =
      current !== undefined &&
      current.name !== "" &&
      current.body === 0 &&
      !named &&
      !(dated && current.dated) &&
      isTitleLike(line) &&
      segments.length >= 2 &&
      segments.every((segment) => segment.split(/\s+/).length <= 5);
    if (bullet !== null) {
      current ??= open();
      current.bullets.push(bullet);
      current.body += 1;
    } else if (link && current && !segmentsOf(withoutLink).length) {
      current.link ||= link;
    } else if (current && segments.length > 0 && segments.every(isLinkWord)) {
      current.link ||= link;
    } else if (details && current) {
      const words = segments.filter((segment) => !isLinkWord(segment));
      if (words.length) current.bullets.push(words.join(" · "));
      current.link ||= link;
      current.dated ||= dated;
    } else if (current && last !== undefined && continues(last, line)) {
      current.bullets[current.bullets.length - 1] = `${last} ${line}`;
    } else if (startsProject) {
      // Reuse an empty draft so a stray line can't leave a nameless project behind.
      if (!current || current.name || current.bullets.length > 0) current = open();
      current.name = segmentsOf(namePart).join(" · ");
      current.link ||= link;
      current.dated = dated;
      if (named?.[2]) current.bullets.push(named[2].trim());
    } else {
      current ??= open();
      current.bullets.push(line);
      current.body += 1;
      current.link ||= findLinks(line)[0]?.url ?? "";
    }
  }
  return drafts
    .filter((draft) => draft.name || draft.bullets.length > 0)
    .map((draft) => ({
      id: newId(),
      name: clip(draft.name, LIMITS.text),
      link: clip(draft.link, LIMITS.url),
      bullets: finishBullets(draft.bullets, LIMITS.projectBullets),
    }));
}

const GROUP_LABEL = /^([^:\t]{1,40}):\s*(.+)$/;

function parseSkills(lines: readonly string[]): SkillGroup[] {
  const groups: { label: string; items: string[] }[] = [];
  let flat: { label: string; items: string[] } | undefined;
  // A two-column table reads as one line per row: "Languages: Go, Rust<tab>Cloud: AWS, GCP".
  const cells = lines.flatMap((line) => (bulletText(line) ?? line).split(/\t+(?=[^:\t,]{1,40}:\s)/));
  for (const content of cells) {
    const labelled = GROUP_LABEL.exec(content);
    const label = labelled?.[1]?.trim() ?? "";
    if (labelled?.[2] && label.split(/\s+/).length <= 5 && !/\d|https?/i.test(label)) {
      groups.push({ label: /^skills$/i.test(label) ? "" : label, items: splitList(labelled[2]) });
      continue;
    }
    if (!flat) {
      flat = { label: "", items: [] };
      groups.push(flat);
    }
    flat.items.push(...splitList(content));
  }
  return groups.map((group) => skillGroup(group.label, group.items)).filter((group) => group.items.length > 0);
}

function skillGroup(label: string, items: readonly string[]): SkillGroup {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const value = clip(item, LIMITS.item);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return { id: newId(), label: clip(label, LIMITS.label), items: unique.slice(0, LIMITS.skillItems) };
}

// Splits "Python, Go | AWS (EC2, S3); Docker" at separators outside brackets.
function splitList(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  const flush = () => {
    const item = current
      .trim()
      .replace(/^(?:and|&)\s+/i, "")
      .replace(/[.;:]+$/, "")
      .trim();
    if (item) items.push(item);
    current = "";
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? "";
    if (char === "(" || char === "[") depth++;
    if ((char === ")" || char === "]") && depth > 0) depth--;
    const spacedSlash = char === "/" && text[i - 1] === " " && text[i + 1] === " ";
    if (depth === 0 && (/[,;|•·▪\t]/.test(char) || spacedSlash)) flush();
    else current += char;
  }
  flush();
  return items;
}

function parseCertifications(lines: readonly string[]): Certification[] {
  const certifications: Certification[] = [];
  for (const line of lines) {
    const content = bulletText(line) ?? line;
    const previous = certifications.at(-1);
    if (previous && /^\p{Ll}/u.test(content)) {
      previous.name = clip(`${previous.name} ${content}`, LIMITS.text);
      continue;
    }
    const range = findDateRanges(content)[0];
    const date = range?.text ?? findDates(content)[0]?.text ?? "";
    const rest = (date ? content.split(date).join("\t") : content).replace(/\(\s*\)|\[\s*\]/g, "");
    const [name = "", ...issuer] = rest
      .split(/\t|\s*\|\s*|\s+[—–-]\s+|,\s+|\s+by\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!name) continue;
    certifications.push({
      id: newId(),
      name: clip(name, LIMITS.text),
      issuer: clip(issuer.join(", "), LIMITS.text),
      date: clip(date, LIMITS.date),
    });
  }
  return certifications;
}

// ---------------------------------------------------------------------------------------------
// Extra sections: languages, awards, volunteering, publications and the rest (interests,
// memberships...). References, contact and personal details never get here (extraKindOf).

type ExtraDraft = { title: string; subtitle: string; date: string; detail: string; bullets: string[] };

const emptyExtra = (): ExtraDraft => ({ title: "", subtitle: "", date: "", detail: "", bullets: [] });

function parseExtra(block: SectionBlock, kind: ExtraKind): ExtraSection | null {
  // A volunteer section under an experience-style heading is laid out like jobs.
  const drafts =
    kind === "languages"
      ? languageDrafts(block.lines)
      : block.kind === "experience"
        ? parseExperience(block.lines).map(roleDraft)
        : listDrafts(block.lines, kind);
  const items = drafts
    .map(toExtraItem)
    .filter((item) => item.title || item.subtitle || item.detail || item.bullets.length > 0)
    .slice(0, MAX_EXTRA_ITEMS);
  if (items.length === 0) return null;
  const title = clip(headingTitle(block.heading), LIMITS.extraTitle) || EXTRA_KIND_LABELS[kind];
  return { id: newId(), kind, title, items };
}

// "AWARDS" then "AWARDS (CONTINUED)" on the next page is one section.
function addExtra(extras: ExtraSection[], section: ExtraSection | null): void {
  if (!section) return;
  const previous = extras.at(-1);
  if (previous && previous.kind === section.kind && previous.title.toLowerCase() === section.title.toLowerCase()) {
    previous.items = [...previous.items, ...section.items].slice(0, MAX_EXTRA_ITEMS);
    return;
  }
  extras.push(section);
}

function toExtraItem(draft: ExtraDraft): ExtraItem {
  return {
    id: newId(),
    title: clip(draft.title, LIMITS.text),
    subtitle: clip(draft.subtitle, LIMITS.text),
    date: clip(draft.date, LIMITS.date),
    detail: clip(draft.detail.replace(/\t+/g, " "), LIMITS.extraDetail),
    bullets: finishBullets(draft.bullets, LIMITS.extraBullets),
  };
}

// "English (native), Spanish - B2", "German: fluent" -> language and level.
const LEVEL_IN_BRACKETS = /^(.+?)\s*[([]\s*([^)\]]+?)\s*[)\]]$/u;
const LEVEL_AFTER = /^(.+?)\s*(?::|\s[-–—]\s|[–—])\s*(.+)$/u;

function languageDrafts(lines: readonly string[]): ExtraDraft[] {
  return lines
    .flatMap((line) => splitList(bulletText(line) ?? line))
    .map((entry) => {
      const match = LEVEL_IN_BRACKETS.exec(entry) ?? LEVEL_AFTER.exec(entry);
      return { ...emptyExtra(), title: match?.[1] ?? entry, subtitle: match?.[2] ?? "" };
    });
}

function roleDraft(job: Experience): ExtraDraft {
  return {
    title: job.title,
    subtitle: [job.company, job.location].filter(Boolean).join(", "),
    date: [job.startDate, job.endDate].filter(Boolean).join(" – "),
    detail: "",
    bullets: job.bullets.map((bullet) => bullet.text),
  };
}

// "Employee of the Year | Northwind | 2021", "Dean's List, University of Leeds", one per line or
// per bullet. Bullets under unmarked header lines belong to that item; a sentence under a header
// describes it.
function listDrafts(lines: readonly string[], kind: ExtraKind): ExtraDraft[] {
  const marked = lines.map((line) => bulletText(line));
  const usesMarkers = marked.some((text) => text !== null);
  const mixed = usesMarkers && lines.some((line, i) => marked[i] === null && isTitleLike(line));
  const drafts: ExtraDraft[] = [];
  let current: ExtraDraft | undefined;
  let previous = "";
  for (const [i, line] of lines.entries()) {
    const bullet = marked[i] ?? null;
    const text = bullet ?? line;
    if (mixed && bullet !== null) {
      current ??= pushed(drafts, emptyExtra());
      current.bullets.push(bullet);
    } else if (bullet === null && current && previous && continues(previous, line)) {
      appendToLast(current, line);
    } else if (isExtraDescription(text, kind)) {
      // Each line of a publication list is its own paper, sentence or not.
      const describes = kind !== "publications" && bullet === null && !usesMarkers;
      // "Won the regional final.<tab>2023 | Details" is an item of its own, dated.
      const cells = text.split(/\t+/);
      const tail = cells.length > 1 ? (cells.at(-1) ?? "").replace(/\s*\|?\s*details$/i, "").trim() : "";
      const dated = tail.split(/\s+/).length <= 5 && findDates(tail).length > 0 ? tail : "";
      if (current && describes && current.bullets.length === 0 && !dated) {
        current.detail = current.detail ? `${current.detail} ${text}` : text;
      } else if (dated) {
        current = pushed(drafts, { ...emptyExtra(), detail: cells.slice(0, -1).join(" "), date: dated });
      } else {
        current = pushed(drafts, { ...emptyExtra(), detail: text });
      }
    } else {
      current = pushed(drafts, extraHeader(text, kind));
    }
    previous = text;
  }
  return drafts;
}

function pushed(drafts: ExtraDraft[], draft: ExtraDraft): ExtraDraft {
  drafts.push(draft);
  return draft;
}

function appendToLast(draft: ExtraDraft, line: string): void {
  const last = draft.bullets.length - 1;
  if (last >= 0) draft.bullets[last] = `${draft.bullets[last]} ${line}`;
  else if (draft.detail) draft.detail = `${draft.detail} ${line}`;
  else draft.title = draft.title ? `${draft.title} ${line}` : line;
}

// Sentences, and in a custom section any list ("Chess, hiking, jazz piano"), read as text rather
// than as a bold name.
function isExtraDescription(text: string, kind: ExtraKind): boolean {
  // A table row names its item in the first cell: "Hackathon<tab>Won first of 200 teams. 2023".
  const [first = "", ...cells] = text.split(/\t+/);
  if (cells.length > 0 && first.split(/\s+/).length <= 8 && isTitleLike(first)) return false;
  if (!isTitleLike(text)) return true;
  // Counted per segment, so "Best Paper Award | ACM CHI | 2019" stays a name.
  if (segmentsOf(stripDates(text)).some((segment) => segment.split(/\s+/).length >= 10)) return true;
  return kind === "custom" && /[,;]/.test(text);
}

function extraHeader(line: string, kind: ExtraKind): ExtraDraft {
  // "...Digital Public Goods. 2023": the year after a full stop is the item's date.
  const year = /\.\s+((?:19|20)\d{2})$/.exec(line);
  const text = year ? line.slice(0, year.index + 1) : line;
  const date = findDateRanges(text)[0]?.text ?? setApartDate(text) ?? year?.[1] ?? "";
  let parts = segmentsOf(stripDates(text));
  // "Dean's List, University of Leeds" names the award and who gave it. Titles of papers and
  // custom entries keep their commas.
  const only = parts.length === 1 ? parts[0] : undefined;
  const comma = only && kind !== "publications" && kind !== "custom" ? /^([^,]+),\s*([^,]+)$/.exec(only) : null;
  if (comma?.[1] && comma[2] && !CORPORATE_SUFFIX.test(comma[2].trim())) parts = [comma[1], comma[2]];
  const [title = "", ...rest] = parts.map((part) => part.trim());
  return { ...emptyExtra(), title, subtitle: rest.join(", "), date };
}

// ---------------------------------------------------------------------------------------------
// Shared line helpers

// A wrapped line continues the previous one when it starts in lower case or the previous one
// clearly stops mid-phrase.
const JOINER =
  /(?:[,;:&/–-]|\b(?:and|or|to|of|the|with|for|in|a|an|by|on|at|from|into|across|over|via|using|including|between|within|per|as|than|that|which|while))$/i;

function continues(previous: string, line: string): boolean {
  return /^\p{Ll}/u.test(line) || JOINER.test(previous.trim());
}

// With markers, unmarked lines are wrapped continuations. Without, each line is its own bullet
// unless it clearly continues the one before.
function toBullets(lines: readonly string[], max: number): Bullet[] {
  const usesMarkers = lines.some((line) => bulletText(line) !== null);
  const texts: string[] = [];
  for (const line of lines) {
    const bullet = bulletText(line);
    const last = texts.at(-1);
    if (bullet !== null) texts.push(bullet);
    else if (last !== undefined && (usesMarkers || continues(last, line))) texts[texts.length - 1] = `${last} ${line}`;
    else texts.push(line);
  }
  return finishBullets(texts, max);
}

function finishBullets(texts: readonly string[], max: number): Bullet[] {
  return texts
    .map((text) => clip(text.replace(/\t+/g, " "), LIMITS.bullet))
    .filter(Boolean)
    .slice(0, max)
    .map((text) => ({ id: newId(), text }));
}

function paragraph(lines: readonly string[]): string {
  let text = "";
  for (const line of lines) {
    const bullet = bulletText(line);
    if (bullet !== null) text += `${text ? "\n" : ""}${bullet}`;
    else text += text && !text.endsWith("\n") ? ` ${line}` : line;
  }
  return text.replace(/\t+/g, " ").trim();
}

const SEGMENT_SEPARATOR = /\t|\s*\|\s*|\s+[•·▪◦]\s+|\s+[—–]\s+|\s+-\s+/;

function segmentsOf(line: string): string[] {
  return line
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.replace(/^[\s,;:()]+|[\s,;:(]+$/g, ""))
    .filter((segment) => /[\p{L}\p{N}]/u.test(segment));
}

// Removes date ranges (and the brackets around them) so the rest of a header line can be split.
function stripDates(line: string): string {
  let rest = line;
  for (const range of findDateRanges(line)) rest = rest.split(range.text).join("\t");
  const single = rest === line ? setApartDate(line) : null;
  if (single) rest = rest.slice(0, rest.lastIndexOf(single)) + "\t" + rest.slice(rest.lastIndexOf(single) + single.length);
  return rest
    .replace(/[([]\s*\t\s*[)\]]/g, "\t")
    .replace(/\b(?:since|from)\s*\t/gi, "\t")
    .trim();
}

// Short, without sentence punctuation, not starting mid-sentence: a title, company or school line.
function isTitleLike(line: string): boolean {
  const text = line.replace(/\t/g, " ").trim();
  return (
    text.length > 0 &&
    text.length <= 120 &&
    text.split(/\s+/).length <= 16 &&
    !/[.!?;]$/.test(text) &&
    !/^\p{Ll}/u.test(text)
  );
}

function isProse(line: string): boolean {
  return line.split(/\s+/).length >= 8;
}

function toLines(text: string): string[] {
  return text
    .split(/\r\n?|\n/)
    .map((line) =>
      line
        // Icon fonts (FontAwesome in LaTeX templates) often come out of a PDF as control codes.
        .replace(/(?!\t)\p{Cc}/gu, "")
        .replace(/[ \u00a0]+/g, " ")
        .replace(/ *\t[\t ]*/g, "\t")
        .trim(),
    )
    .filter(Boolean);
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  // Never cut a surrogate pair in half.
  const end = /[\ud800-\udbff]/.test(trimmed.charAt(max - 1)) ? max - 1 : max;
  return trimmed.slice(0, end).trimEnd();
}
