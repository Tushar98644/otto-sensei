import { findPlaces, rightsRegionOf } from "@/lib/eligibility/places";
import { customAnswer, payText, type ApplyAnswers, type Pay } from "@/lib/extension/answers";
import type { FillContact, FillDate, FillProfile } from "@/lib/extension/types";
import {
  classify,
  isYesNoQuestion,
  type AnswerField,
  type SchoolField,
  type Target,
  type WorkField,
} from "./classify";
import type { Question } from "./scan";

export type Want =
  | { kind: "text"; value: string }
  // Pick the option that reads like one of these, in order (a select, radios, a combobox, a list).
  | { kind: "choice"; values: string[] }
  | { kind: "yes"; value: boolean }
  | { kind: "check"; value: boolean }
  | { kind: "file" };

// Where an answer typed in the panel is kept, so the next form gets it without asking.
export type Store =
  | { kind: "answer"; field: AnswerField }
  | { kind: "rights"; place: string; need: "authorized" | "sponsorship" }
  | { kind: "custom"; question: string };

export type AskInput = "text" | "yesno" | "choice" | "multi" | "pay";

export type Planned =
  | { status: "fill"; question: Question; target: Target; want: Want }
  | { status: "ask"; question: Question; target: Target; store: Store; input: AskInput }
  | { status: "draft"; question: Question; target: Target }
  | { status: "protected"; question: Question; target: Target }
  | { status: "skip"; question: Question; target: Target };

export type PostContext = { title: string; company: string; location: string; text: string };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// The option that answers: yes or no by its first word; otherwise the closest wording, tried in order.
export function pickOption(options: readonly string[], want: Want): number {
  if (options.length === 0) return -1;
  if (want.kind === "yes") {
    const pattern = want.value ? /^(?:yes|y|true)\b/ : /^(?:no|n|false)\b/;
    return options.findIndex((option) => pattern.test(norm(option)));
  }
  if (want.kind !== "choice" && want.kind !== "text") return -1;
  const values = want.kind === "choice" ? want.values : [want.value];
  const normalized = options.map(norm);
  for (const raw of values) {
    const value = norm(raw);
    if (!value) continue;
    const exact = normalized.indexOf(value);
    if (exact >= 0) return exact;
    const starts = normalized.findIndex(
      (option) => option.startsWith(value) || value.startsWith(option),
    );
    if (starts >= 0 && normalized[starts]!.length > 1) return starts;
    const within = normalized.findIndex(
      (option) => option.length > 2 && (option.includes(value) || value.includes(option)),
    );
    if (within >= 0) return within;
  }
  // Last, the shortest option holding every telling word ("University of Texas at Austin" in "University of Texas, Austin").
  for (const raw of values) {
    const words = significantWords(raw);
    if (words.length === 0) continue;
    let best = -1;
    normalized.forEach((option, index) => {
      const own = new Set(option.split(" "));
      if (!words.every((word) => own.has(word))) return;
      if (best < 0 || option.length < normalized[best]!.length) best = index;
    });
    if (best >= 0) return best;
  }
  return -1;
}

const STOP_WORDS = new Set(["of", "the", "at", "and", "in", "for", "a", "an", "de"]);

export function significantWords(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

const DEGREE_LEVELS: [RegExp, string[]][] = [
  [/\bph\.?\s?d\b|\bdoctor|\bdphil\b/i, ["doctor", "phd", "ph d"]],
  [/\bm\.?\s?b\.?\s?a\b/i, ["mba", "master of business", "master"]],
  [/\bmaster|\bm\.?\s?(?:s|sc|a|tech|eng|e|phil|com|ca)\b\.?|\bpost ?grad/i, ["master"]],
  [/\bbachelor|\bb\.?\s?(?:s|sc|a|tech|e|eng|com|ca|ba|ba)\b\.?|\bundergrad/i, ["bachelor"]],
  [/\bassociate/i, ["associate"]],
  [/\bdiploma/i, ["diploma"]],
  [/\bhigh school|\bsecondary|\b12th\b|\bhsc\b|\bged\b/i, ["high school", "secondary"]],
];

export function degreeChoices(degree: string): string[] {
  const found = DEGREE_LEVELS.find(([pattern]) => pattern.test(degree));
  return [degree, ...(found ? found[1] : [])].filter(Boolean);
}

function monthText(question: Question, date: FillDate | null): Want | null {
  if (!date?.month) return null;
  const name = MONTHS[date.month - 1]!;
  if (question.kind === "text" || question.kind === "combobox") {
    return { kind: "text", value: String(date.month).padStart(2, "0") };
  }
  return {
    kind: "choice",
    values: [name, name.slice(0, 3), String(date.month).padStart(2, "0"), String(date.month)],
  };
}

function yearText(question: Question, date: FillDate | null): Want | null {
  if (!date) return null;
  const year = String(date.year);
  return question.kind === "text"
    ? { kind: "text", value: year }
    : { kind: "choice", values: [year] };
}

function dateText(date: FillDate | null): string {
  if (!date) return "";
  return date.month ? `${String(date.month).padStart(2, "0")}/${date.year}` : String(date.year);
}

function asText(question: Question, value: string, extra: string[] = []): Want | null {
  if (!value) return null;
  if (question.kind === "text" || question.kind === "textarea") return { kind: "text", value };
  return { kind: "choice", values: [value, ...extra] };
}

function yesNo(question: Question, value: boolean | null): Want | null {
  if (value === null) return null;
  if (question.kind === "text" || question.kind === "textarea") {
    return { kind: "text", value: value ? "Yes" : "No" };
  }
  return { kind: "yes", value };
}

// "Other" only where the form says to pick it for a school it doesn't list.
function otherIfAsked(question: Question): string[] {
  return /\bother\b/i.test(question.label) ? ["other"] : [];
}

function workWant(question: Question, fill: FillProfile, field: WorkField): Want | null {
  const job = fill.work[question.index] ?? (question.index === 0 ? fill.work[0] : undefined);
  if (!job) return null;
  switch (field) {
    case "company":
    case "title":
    case "location":
    case "description":
      return asText(question, job[field]);
    case "current":
      return { kind: "check", value: job.current };
    case "startMonth":
      return monthText(question, job.start);
    case "startYear":
      return yearText(question, job.start);
    case "endMonth":
      return job.current ? null : monthText(question, job.end);
    case "endYear":
      return job.current ? null : yearText(question, job.end);
    case "start":
      return asText(question, dateText(job.start));
    case "end":
      return job.current ? null : asText(question, dateText(job.end));
  }
}

function schoolWant(question: Question, fill: FillProfile, field: SchoolField): Want | null {
  const school = fill.education[question.index];
  if (!school) return null;
  switch (field) {
    case "school":
      return asText(question, school.school, otherIfAsked(question));
    case "degree":
      return school.degree ? { kind: "choice", values: degreeChoices(school.degree) } : null;
    case "field":
      return asText(question, school.field, otherIfAsked(question));
    case "startMonth":
      return monthText(question, school.start);
    case "startYear":
      return yearText(question, school.start);
    case "endMonth":
      return monthText(question, school.end);
    case "endYear":
      return yearText(question, school.end);
    case "start":
      return asText(question, dateText(school.start));
    case "end":
      return asText(question, dateText(school.end));
  }
}

// What a list of websites gets, one link per entry; LinkedIn and X have fields of their own.
export function websiteLinks(contact: FillContact): string[] {
  return [
    ...new Set([contact.portfolio, contact.website, contact.github].map((link) => link.trim())),
  ].filter(Boolean);
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return code ? (countryNames.of(code) ?? code) : "";
  } catch {
    return code;
  }
}

// The country a work-rights question asks about: named in it, else where the job is, else home.
export function placeKey(label: string, post: PostContext | null, home: string): string {
  const fromText = (text: string) => {
    for (const { place } of findPlaces(text)) {
      if (place.kind === "group") {
        if (place.group === "eu") return "EU";
        continue;
      }
      return place.code;
    }
    return null;
  };
  return fromText(label) ?? (post ? fromText(post.location) : null) ?? (home.toUpperCase() || "US");
}

function rightsAnswer(
  answers: ApplyAnswers,
  key: string,
  need: "authorized" | "sponsorship",
): boolean | null {
  const own = answers.workRights[key]?.[need];
  if (own !== undefined && own !== null) return own;
  if (key.length === 2 && rightsRegionOf({ kind: "country", code: key }) === "eu") {
    return answers.workRights.EU?.[need] ?? null;
  }
  return null;
}

function payWant(question: Question, pay: Pay | null): Want | null {
  if (!pay) return null;
  const text = `${question.label} ${question.hints}`;
  const lakhs = /\blpa\b|lakh|lac\b/i.test(text);
  const digits =
    question.inputType === "number" || /\b(?:numbers? only|numeric|digits)\b/i.test(text);
  return asText(question, payText(pay, { lakhs, digits }));
}

function answerWant(question: Question, answers: ApplyAnswers, field: AnswerField): Want | null {
  switch (field) {
    case "noticePeriod":
      return asText(question, answers.noticePeriod);
    case "startDate":
      return asText(question, answers.startDate);
    case "heardFrom":
      return asText(question, answers.heardFrom, [
        "company website",
        "careers page",
        "career site",
        "website",
        "other",
      ]);
    case "relocate":
      return yesNo(question, answers.relocate);
    case "currentPay":
      return payWant(question, answers.currentPay);
    case "expectedPay":
      return payWant(question, answers.expectedPay);
  }
}

function askInput(question: Question, store: Store): AskInput {
  if (store.kind === "rights" || (store.kind === "answer" && store.field === "relocate"))
    return "yesno";
  if (store.kind === "answer" && (store.field === "currentPay" || store.field === "expectedPay")) {
    return question.options.length > 0 ? "choice" : "pay";
  }
  if (question.kind === "checkbox") return "multi";
  if (question.kind === "yesno") return "yesno";
  if (question.options.length > 0) return "choice";
  // A list Otto can't read before it opens, asking a yes or no question.
  if (
    (question.kind === "combobox" || question.kind === "dropdown") &&
    isYesNoQuestion(question.label)
  ) {
    return "yesno";
  }
  return "text";
}

function customWant(question: Question, saved: string): Want {
  if (question.kind === "checkbox") return { kind: "choice", values: saved.split("\n") };
  if (question.kind === "yesno") return { kind: "yes", value: /^y/i.test(saved) };
  if (
    question.kind !== "text" &&
    question.kind !== "textarea" &&
    /^(?:yes|no)$/i.test(saved.trim())
  ) {
    return { kind: "yes", value: /^y/i.test(saved) };
  }
  return question.kind === "text" || question.kind === "textarea"
    ? { kind: "text", value: saved }
    : { kind: "choice", values: [saved] };
}

export function planField(
  question: Question,
  fill: FillProfile,
  post: PostContext | null,
): Planned {
  const target = classify(question);
  const fillWith = (want: Want | null): Planned | null =>
    want ? { status: "fill", question, target, want } : null;
  const ask = (store: Store): Planned => ({
    status: "ask",
    question,
    target,
    store,
    input: askInput(question, store),
  });
  switch (target.kind) {
    case "protected":
      return { status: "protected", question, target };
    case "skip":
      return { status: "skip", question, target };
    case "free":
      return { status: "draft", question, target };
    case "resume":
      return { status: "fill", question, target, want: { kind: "file" } };
    case "contact": {
      const value = fill.contact[target.field];
      const shown = target.field === "country" ? countryName(value) : value;
      return fillWith(asText(question, shown)) ?? { status: "skip", question, target };
    }
    case "current":
      return (
        fillWith(asText(question, fill.current?.[target.field] ?? "")) ?? {
          status: "skip",
          question,
          target,
        }
      );
    case "work":
      return (
        fillWith(workWant(question, fill, target.field)) ?? { status: "skip", question, target }
      );
    case "school":
      return (
        fillWith(schoolWant(question, fill, target.field)) ?? { status: "skip", question, target }
      );
    case "link":
      return (
        fillWith(asText(question, websiteLinks(fill.contact)[question.index] ?? "")) ?? {
          status: "skip",
          question,
          target,
        }
      );
    case "answer":
      return (
        fillWith(answerWant(question, fill.answers, target.field)) ??
        ask({ kind: "answer", field: target.field })
      );
    case "rights": {
      const place = placeKey(question.label, post, fill.contact.country);
      return (
        fillWith(yesNo(question, rightsAnswer(fill.answers, place, target.need))) ??
        ask({ kind: "rights", place, need: target.need })
      );
    }
    case "custom": {
      const saved = customAnswer(fill.answers, question.label);
      if (saved !== null)
        return { status: "fill", question, target, want: customWant(question, saved) };
      // Only a required question is asked; an optional one stays for the person.
      return question.required
        ? ask({ kind: "custom", question: question.label })
        : { status: "skip", question, target };
    }
  }
}

export function planForm(
  questions: readonly Question[],
  fill: FillProfile,
  post: PostContext | null,
): Planned[] {
  return questions.map((question) => planField(question, fill, post));
}

export function wantForAnswer(question: Question, store: Store, answer: string): Want | null {
  if (store.kind === "custom") return customWant(question, answer);
  if (store.kind === "rights" || (store.kind === "answer" && store.field === "relocate")) {
    return yesNo(question, /^y/i.test(answer));
  }
  return asText(question, answer);
}
