import { newId, type Education } from "../schema";
import { bulletText, findDateRanges, findDates, type SectionBlock } from "../sections";
import { splitTrailingLocation } from "./experience";
import { LIMITS } from "./limits";
import { clip, finishBullets, isTitleLike, segmentsOf, stripDates } from "./text";
import { isLocation } from "./words";

const SCHOOL_WORDS =
  /\b(?:university|universit[äéà]t?|universidad|universidade|college|school|institute|institution|academy|polytechnic|conservatory|seminary|hochschule|univ\.|iit|nit)\b/i;
const DEGREE_WORDS =
  /\b(?:bachelors?|masters?|doctor|doctorate|ph\.?\s?d|associate|diploma|certificate|degree|b\.?\s?sc|m\.?\s?sc|b\.?\s?s|m\.?\s?s|b\.?\s?a|m\.?\s?a|mba|bba|b\.?\s?tech|m\.?\s?tech|b\.?\s?eng|m\.?\s?eng|b\.?\s?e|m\.?\s?e|b\.?\s?com|m\.?\s?com|bca|mca|llb|llm|j\.?d|m\.?d|bfa|mfa|b\.?\s?ed|m\.?\s?ed|a-levels?|gcses?|high school|ged|hnd)(?![\p{L}])/iu;

const DEGREE_ABBREVIATION =
  /^((?:B|M)\.?\s?(?:Sc|S|A|Eng|E|Tech|Com|Ed|Phil|FA|BA)\.?|MBA|BBA|BCA|MCA|Ph\.?\s?D\.?|LL\.?B\.?|LL\.?M\.?|J\.?D\.?|M\.?D\.?)\s+(?!in\b|of\b)(\p{Lu}.*)$/u;

type EducationDraft = Omit<Education, "id" | "bullets"> & { bullets: string[] };
type EducationFields = Omit<EducationDraft, "bullets"> & { extras: string[] };
const EDUCATION_KEYS = ["school", "degree", "field", "location", "startDate", "endDate"] as const;

function parseEducation(lines: readonly string[]): Education[] {
  const drafts: EducationDraft[] = [];
  const open = (): EducationDraft => {
    const draft: EducationDraft = {
      school: "",
      degree: "",
      field: "",
      location: "",
      startDate: "",
      endDate: "",
      bullets: [],
    };
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

const TABLE_HEADING_WORD =
  /^(?:degree|certificate|qualification|course|program(?:me)?|institute|institution|board|university|school|college|c?gpa|cpi|percentage|grade|marks|score|result|year|duration|session)s?$/i;

function isTableHeading(line: string): boolean {
  const cells = line.split(/\t+/);
  return (
    cells.length >= 2 &&
    cells.every((cell) =>
      cell.split(/\s*[/&]\s*|\s+/).every((word) => TABLE_HEADING_WORD.test(word)),
    )
  );
}

export function addEducation(education: Education[], block: SectionBlock): void {
  const latest = education[0];
  if (latest && /\bcourse/i.test(block.heading)) {
    const courses = block.lines.map((line) => (bulletText(line) ?? line).split(/\t+/).join(", "));
    latest.bullets = [...latest.bullets, ...finishBullets(courses, LIMITS.educationBullets)].slice(
      0,
      LIMITS.educationBullets,
    );
    return;
  }
  education.push(...parseEducation(block.lines));
}

function educationFields(line: string): EducationFields {
  const fields: EducationFields = {
    school: "",
    degree: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    extras: [],
  };
  const range = findDateRanges(line)[0];
  let rest = line;
  if (range) {
    fields.startDate = range.start;
    fields.endDate = range.end;
    rest = stripDates(line);
  } else {
    const single = findDates(line)[0]?.text ?? "";
    fields.endDate = single;
    if (single) rest = line.replace(single, "\t");
  }
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

function splitSchoolAndDegree(segment: string): string[] {
  const parts = segment.split(/,\s*/);
  const schoolAt = parts.findIndex((part) => SCHOOL_WORDS.test(part));
  const degreeAt = parts.findIndex((part) => DEGREE_WORDS.test(part) && !SCHOOL_WORDS.test(part));
  if (schoolAt < 0 || degreeAt < 0) return [segment];
  const cut = Math.max(schoolAt, degreeAt);
  return [parts.slice(0, cut).join(", "), parts.slice(cut).join(", ")];
}
