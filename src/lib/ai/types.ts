export type FixInput = {
  bullet: string;
  role: { title: string; company: string };
  answers: { question: string; answer: string }[];
};

export type FixResult = {
  // Plain-language problems, e.g. "No result: what changed because of this?"
  issues: string[];
  // At most 3; empty once the input has answers.
  questions: string[];
  // [Square-bracket placeholders] only where a fact is missing.
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
  // Recomputed in code with findTerm(); never trusted from the model.
  inResume: boolean;
  evidence: string;
};

export type RequirementImportance = "must" | "nice";

// "wording": the post says it ("required"). "structure": under a heading like "Requirements".
// "guess": neither, so never a must-have.
export type RequirementSource = "wording" | "structure" | "guess";

// Whether the resume proves it isn't stored: code works it out, so it stays right as the resume
// changes.
export type TailorRequirement = {
  id: string;
  text: string;
  importance: RequirementImportance;
  source: RequirementSource;
  // Names a screener searches for word for word. Empty for a kind of experience, judged by `quote`.
  terms: string[];
  // Only when `terms` is empty; kept only if found word for word in one resume line, else "".
  quote: string;
  ask: string;
};

export type TailorQuestion = {
  term: string;
  question: string;
};

export type TailorResult = {
  job: { title: string; company: string };
  // At most 16, must-haves first.
  requirements: TailorRequirement[];
  keywords: TailorKeyword[];
  // We ask; we never add them without a "yes".
  askUser: TailorQuestion[];
  // Bullet ids most-relevant-first; each list is an exact permutation of the entry's bullet ids.
  bulletOrder: { experienceId: string; bulletIds: string[] }[];
  // Only facts already in the resume. "" when there's nothing to suggest.
  summary: string;
  notes: string[];
};

export type WritingInput = {
  jobText: string;
  jobTitle: string;
  company: string;
};

export type CoverLetterResult = {
  // Greeting, 2-4 paragraphs and a sign-off, separated by blank lines.
  letter: string;
  words: number;
  // e.g. a blank Otto left for a number.
  warnings: string[];
};

export type AnswerResult = {
  answer: string;
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
