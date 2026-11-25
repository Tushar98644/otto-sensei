import type { ContentLang } from "@/lib/i18n/languages";

export type FixInput = {
  bullet: string;
  role: { title: string; company: string };
  answers: { question: string; answer: string }[];
  // The resume's language; read from the line when not given.
  lang?: ContentLang;
};

export type FixResult = {
  issues: string[];
  questions: string[];
  suggestion: string;
  needsAnswers: boolean;
};

export type TailorInput = {
  jobText: string;
  jobTitle: string;
  company: string;
};

export type TailorKeyword = {
  term: string;
  importance: "must" | "nice";
  inResume: boolean;
  evidence: string;
};

export type RequirementImportance = "must" | "nice";

export type RequirementSource = "wording" | "structure" | "guess";

export type TailorRequirement = {
  id: string;
  text: string;
  importance: RequirementImportance;
  source: RequirementSource;
  terms: string[];
  quote: string;
  ask: string;
};

export type TailorQuestion = {
  term: string;
  question: string;
};

export type TailorResult = {
  job: { title: string; company: string };
  requirements: TailorRequirement[];
  keywords: TailorKeyword[];
  askUser: TailorQuestion[];
  bulletOrder: { experienceId: string; bulletIds: string[] }[];
  summary: string;
  notes: string[];
};

export type WritingInput = {
  jobText: string;
  jobTitle: string;
  company: string;
};

export type CoverLetterResult = {
  letter: string;
  words: number;
  warnings: string[];
};

export type AnswerResult = {
  answer: string;
  words: number;
  warnings: string[];
};

export type OutreachResult = {
  subject: string;
  email: string;
  note: string;
  words: number;
  warnings: string[];
};

export type AIErrorCode = "refused" | "rate_limited" | "unavailable" | "invalid_output" | "too_long";

export class AIError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}
