import type { FillContact } from "@/lib/extension/types";
import type { Question } from "./scan";

export type ContactField = keyof FillContact;
export type WorkField =
  | "company"
  | "title"
  | "location"
  | "current"
  | "description"
  | "startMonth"
  | "startYear"
  | "endMonth"
  | "endYear"
  | "start"
  | "end";
export type SchoolField =
  | "school"
  | "degree"
  | "field"
  | "startMonth"
  | "startYear"
  | "endMonth"
  | "endYear"
  | "start"
  | "end";
export type AnswerField =
  "noticePeriod" | "currentPay" | "expectedPay" | "relocate" | "startDate" | "heardFrom";

export type Target =
  | { kind: "contact"; field: ContactField }
  | { kind: "current"; field: "company" | "title" }
  | { kind: "resume" }
  | { kind: "work"; field: WorkField }
  | { kind: "school"; field: SchoolField }
  | { kind: "answer"; field: AnswerField }
  | { kind: "rights"; need: "authorized" | "sponsorship" }
  // Self-identification and consent: Otto never touches them.
  | { kind: "protected"; why: "self-id" | "consent" }
  // A question to write in words: Draft with Otto.
  | { kind: "free" }
  // A short question with no field of its own: asked once in the panel, then remembered.
  | { kind: "custom" }
  // Left alone: a cover letter file, a second upload, a control with no question.
  | { kind: "skip" };

const SELF_ID =
  /\b(?:gender|sex|race|racial|ethnic\w*|hispanic|latin[oax]|veteran|disabilit\w*|sexual orientation|lgbt\w*|transgender|pronouns?|demographic|self[- ]identif\w*|voluntary (?:self|disclosure)\w*|equal (?:employment|opportunity)|eeo\w*|date of birth|birth ?date|religio\w*|marital|caste)\b/i;
const SELF_ID_SECTION =
  /demographic|eeo|self-?identif|selfidentif|voluntary|disclosure|diversity|equal-?opportunity/;
const CONSENT =
  /\b(?:consent|i agree|agree to|acknowledg\w*|privacy (?:policy|notice)|terms (?:and|&) conditions|gdpr|certify|attest|i understand|i confirm|confirm (?:that|receipt)|by checking|by submitting|notetaker|data (?:processing|retention)|opt[- ]?in|subscribe|marketing|text messages?|sms)\b/i;
// "Are you located in the US?" is a yes or no question, not a place to type a city into.
const YES_NO_QUESTION = /^(?:are|do|does|did|will|would|have|has|is|can|could|should|were|was)\b/i;
const FREE_TEXT =
  /^(?:why|what|how|describe|tell|explain|share|please (?:describe|tell|explain|share|provide|elaborate)|in (?:a|one|two|\d+)\b|give us|walk us)\b|\?\s*$/i;
const LINK_HINT = /\b(?:url|link|profile|website|site|portfolio|github|linkedin)\b/i;
const DESCRIBE = /\b(?:describe|explain|tell us|share|elaborate)\b/i;
const NOT_A_QUESTION =
  /^(?:additional information|cover letter|anything else)\b|\bcover letter\b|phone.?(?:device|type|extension|ext\b)|country.?phone.?code|countryphonecode|phone-device-type|middle.?name/i;
// Facts about the person a draft must never make up: asked once and remembered instead.
const FACTS =
  /\b(?:citizen\w*|nationalit\w*|passport|clearance|criminal|convict\w*|non-?compete|related to|relatives?)\b/i;
const ATTENDED = /\b(?:university|college|school)\b.*\b(?:attend\w*|graduat\w*|studied|study)\b/i;

type Rule = [RegExp, Target];

const CONTACT_RULES: Rule[] = [
  [
    /\bpreferred (?:first )?names?\b.*\b(?:last|family|sur) ?name\b/i,
    { kind: "contact", field: "fullName" },
  ],
  [
    /\bpreferred (?:first )?name\b|\bname you(?:'|’)?d (?:prefer|like)|\bnick ?name\b/i,
    { kind: "contact", field: "firstName" },
  ],
  [
    /\b(?:first|given|fore)[\s_-]*name\b|\bfirstname\b|legalnamesection_firstname/i,
    { kind: "contact", field: "firstName" },
  ],
  [
    /\b(?:last|family|sur)[\s_-]*name\b|\blastname\b|\bsurname\b|legalnamesection_lastname/i,
    { kind: "contact", field: "lastName" },
  ],
  [
    /^(?:full |legal |your )?name$|^full name\b|_systemfield_name|^name$/i,
    { kind: "contact", field: "fullName" },
  ],
  [/\be-?mail\b/i, { kind: "contact", field: "email" }],
  [/\blinked ?in\b/i, { kind: "contact", field: "linkedin" }],
  [/\bgit ?hub\b/i, { kind: "contact", field: "github" }],
  [/\btwitter\b|\bx\.com\b/i, { kind: "contact", field: "twitter" }],
  [/\bportfolio\b/i, { kind: "contact", field: "portfolio" }],
  [
    /\b(?:other )?(?:web ?site|personal site|blog|homepage)\b|urls\[other\]/i,
    { kind: "contact", field: "website" },
  ],
  [
    /\b(?:phone|mobile|cell)(?:[\s_-]*number)?\b|\btelephone\b/i,
    { kind: "contact", field: "phone" },
  ],
  [/\bcountry\b/i, { kind: "contact", field: "country" }],
  [/\bcity\b|addresssection_city/i, { kind: "contact", field: "city" }],
  [
    /^(?:current |your )?location\b|\bwhere (?:are you|do you) (?:currently )?(?:based|live|located)\b|candidate-location/i,
    { kind: "contact", field: "location" },
  ],
  [
    /\bcurrent (?:company|employer|organi[sz]ation)\b|^(?:company|employer|organi[sz]ation)$|^org$/i,
    { kind: "current", field: "company" },
  ],
  [
    /\bcurrent (?:job )?(?:title|role|position|designation)\b|^(?:job )?title$/i,
    { kind: "current", field: "title" },
  ],
];

const ANSWER_RULES: Rule[] = [
  [
    /\bnotice period\b|\bnotice\b.*\b(?:days|weeks|months|period)\b|\bhow (?:much|long) notice\b/i,
    { kind: "answer", field: "noticePeriod" },
  ],
  [
    /\b(?:expected|desired|target)\b.*\b(?:ctc|salary|compensation|pay|package|remuneration)\b|\b(?:salary|compensation|pay) (?:expectation|requirement)s?\b|\bexpectations?\b.*\b(?:salary|compensation)\b|\bectc\b/i,
    { kind: "answer", field: "expectedPay" },
  ],
  [
    /\b(?:current|present|existing|last drawn)\b.*\b(?:ctc|salary|compensation|pay|package|remuneration)\b|\bcctc\b|^ctc\b/i,
    { kind: "answer", field: "currentPay" },
  ],
  [
    /\bsponsor\w*\b|\bvisa (?:support|assistance)\b|\bh-?1b\b/i,
    { kind: "rights", need: "sponsorship" },
  ],
  [
    /\b(?:legally |lawfully )?(?:authori[sz]ed|eligible|entitled|permitted|allowed)\b.*\bwork\b|\bright to work\b|\bwork (?:authori[sz]ation|permit|eligibility)\b|\bwork lawfully\b/i,
    { kind: "rights", need: "authorized" },
  ],
  [/\brelocat\w*\b/i, { kind: "answer", field: "relocate" }],
  [
    /\b(?:earliest|soonest)\b.*\b(?:start|join|begin|available)\b|\bstart date\b|\bwhen (?:can|could|would) you (?:start|join|begin)\b|\bavailab\w* to (?:start|join|begin)\b|\bdate (?:of )?availab\w*\b|\bjoining date\b/i,
    { kind: "answer", field: "startDate" },
  ],
  [
    /\bhow did you (?:hear|learn|find|come across)\b|\bwhere did you (?:hear|find|learn|see)\b|\bhow you (?:heard|found)\b|\bhear about (?:us|this)\b|^source$|\bformfield-source\b|sourceprompt/i,
    { kind: "answer", field: "heardFrom" },
  ],
];

function workTarget(hints: string, label: string): Target | null {
  const text = `${hints} ${label}`.toLowerCase();
  const field: WorkField | null =
    /currently ?work|current-role|currentlyworkhere|i currently work/.test(text)
      ? "current"
      : /job ?title|\btitle\b/.test(text)
        ? "title"
        : /company|employer/.test(text)
          ? "company"
          : /description|role ?description|responsibilit/.test(text)
            ? "description"
            : /location/.test(text)
              ? "location"
              : dateField(text);
  return field ? { kind: "work", field } : null;
}

function schoolTarget(hints: string, label: string): Target | null {
  const text = `${hints} ${label}`.toLowerCase();
  const field: SchoolField | null = /school|university|college|institution/.test(text)
    ? "school"
    : /degree/.test(text)
      ? "degree"
      : /discipline|field of study|fieldofstudy|major|specializ/.test(text)
        ? "field"
        : dateField(text);
  return field ? { kind: "school", field } : null;
}

function dateField(
  text: string,
): "startMonth" | "startYear" | "endMonth" | "endYear" | "start" | "end" | null {
  const start = /start|from|firstyear|first year/.test(text);
  const end = /end|to\b|lastyear|last year|graduat/.test(text);
  if (!start && !end) return null;
  const month = /month/.test(text);
  const year = /year/.test(text);
  if (start) return month ? "startMonth" : year ? "startYear" : "start";
  return month ? "endMonth" : year ? "endYear" : "end";
}

function inWork(question: Question): boolean {
  return /workexperience|work-experience|employment|experience--|company-name|employer/.test(
    `${question.section} ${question.hints.toLowerCase()}`,
  );
}

function inEducation(question: Question): boolean {
  return /education|school--|degree--|discipline--/.test(
    `${question.section} ${question.hints.toLowerCase()}`,
  );
}

const AUTOCOMPLETE: Record<string, Target> = {
  "given-name": { kind: "contact", field: "firstName" },
  "family-name": { kind: "contact", field: "lastName" },
  name: { kind: "contact", field: "fullName" },
  email: { kind: "contact", field: "email" },
  tel: { kind: "contact", field: "phone" },
  "tel-national": { kind: "contact", field: "phone" },
  "address-level2": { kind: "contact", field: "city" },
  "country-name": { kind: "contact", field: "country" },
  organization: { kind: "current", field: "company" },
  "organization-title": { kind: "current", field: "title" },
};

export function isYesNoQuestion(label: string): boolean {
  return YES_NO_QUESTION.test(label);
}

export function classify(question: Question): Target {
  const { label, kind } = question;
  const hints = question.hints.toLowerCase();
  const text = `${label} ${hints}`;
  if (SELF_ID.test(label) || SELF_ID_SECTION.test(question.section) || SELF_ID.test(hints)) {
    return { kind: "protected", why: "self-id" };
  }
  if (kind === "file") {
    return /resume|\bcv\b|curriculum/i.test(text) && !/cover/i.test(text)
      ? { kind: "resume" }
      : { kind: "skip" };
  }
  if ((kind === "checkbox" || kind === "radio") && CONSENT.test(label)) {
    return { kind: "protected", why: "consent" };
  }
  if (kind === "radio" && question.options.some((option) => CONSENT.test(option))) {
    return { kind: "protected", why: "consent" };
  }
  if (kind === "checkbox" && question.options.length < 2) {
    const work = inWork(question) ? workTarget(hints, label) : null;
    return work?.kind === "work" && work.field === "current"
      ? work
      : { kind: "protected", why: "consent" };
  }
  if (inEducation(question)) {
    const school = schoolTarget(hints, label);
    if (school) return school;
  }
  if (inWork(question)) {
    const work = workTarget(hints, label);
    if (work) return work;
  }
  if (NOT_A_QUESTION.test(label) || NOT_A_QUESTION.test(hints)) return { kind: "skip" };
  if (ATTENDED.test(label)) return { kind: "school", field: "school" };
  const auto = AUTOCOMPLETE[question.autocomplete];
  if (auto) return auto;
  for (const [pattern, target] of ANSWER_RULES) if (pattern.test(label)) return target;
  for (const [pattern, target] of ANSWER_RULES) if (pattern.test(hints)) return target;
  const questionLike = YES_NO_QUESTION.test(label);
  if (!questionLike) {
    for (const [pattern, target] of CONTACT_RULES) {
      if (!pattern.test(label) && !pattern.test(hints)) continue;
      // "LinkedIn" in a question about LinkedIn ("Have you used LinkedIn Learning?") isn't a link field.
      if (
        target.kind === "contact" &&
        /linkedin|github|twitter|portfolio|website/.test(target.field)
      ) {
        if (label.length > 80 && !LINK_HINT.test(label)) continue;
      }
      return target;
    }
  }
  // A one-line box asks for words only when it says so; a textarea always does.
  const asksForWords =
    kind === "text" && label.length > 24 && (DESCRIBE.test(label) || /^why\b/i.test(label));
  if (FACTS.test(label)) return label ? { kind: "custom" } : { kind: "skip" };
  if ((kind === "textarea" && (FREE_TEXT.test(label) || label.length > 24)) || asksForWords) {
    return { kind: "free" };
  }
  if (!label) return { kind: "skip" };
  return { kind: "custom" };
}
