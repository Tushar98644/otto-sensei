import { TEXT_LIMITS } from "@/config/plans";
import { ResumeSchema } from "@/lib/resume/validation";
import { parseBasics } from "./heuristic-parse/basics";
import { addEducation } from "./heuristic-parse/education";
import { parseExperience } from "./heuristic-parse/experience";
import { addExtra, parseExtra } from "./heuristic-parse/extras";
import { LIMITS } from "./heuristic-parse/limits";
import { parseProjects } from "./heuristic-parse/projects";
import { parseCertifications, parseSkills } from "./heuristic-parse/skills";
import { clip, isProse, paragraph, toLines } from "./heuristic-parse/text";
import {
  emptyResume,
  MAX_EXTRA_SECTIONS,
  SECTION_KEYS,
  type ExtraSection,
  type Resume,
  type SectionKey,
} from "./schema";
import { extraKindOf, splitInlineHeading, splitIntoSections } from "./sections";

const MAX_LINES = 2_000;

// The no-AI fallback: never throws, never invents; what it can't place goes to the summary.
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
    const extraKind =
      block.kind === "other" || block.kind === "experience" ? extraKindOf(block.heading) : null;
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
    else if (block.kind === "certifications")
      resume.certifications.push(...parseCertifications(block.lines));
  }
  // No summary heading: prose under the name is the summary, or the whole body if nothing has one.
  if (summaries.length === 0)
    summaries.push(paragraph(sections.length === 0 ? leftovers : leftovers.filter(isProse)));

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
