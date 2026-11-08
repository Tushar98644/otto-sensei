// Client-safe types for the AI features. Implementations live in ./structure.ts, ./fix.ts, ./tailor.ts.

export type FixInput = {
  bullet: string;
  role: { title: string; company: string };
  // Answers to questions Otto asked in a previous call. Empty on the first call.
  answers: { question: string; answer: string }[];
};

export type FixResult = {
  // Plain-language problems with the original line. e.g. "No result: what changed because of this?"
  issues: string[];
  // Facts Otto needs before it can write a strong line without inventing anything. At most 3.
  // Always empty when the input already had answers.
  questions: string[];
  // The improved line. Contains [square-bracket placeholders] only where a fact is missing.
  suggestion: string;
  // True when `suggestion` still has placeholders the user should fill via `questions`.
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

// How the importance was read. "wording": the post's own words say it ("required", "a plus").
// "structure": it sits under a heading such as "Requirements" or "Nice to have". "guess": neither,
// so it is never treated as a must-have.
export type RequirementSource = "wording" | "structure" | "guess";

// One qualification from the job post, the unit an AI screener grades. Whether the resume proves
// it is never stored here: code works that out from the resume (src/lib/tailor/requirements.ts),
// so it stays right as the resume changes.
export type TailorRequirement = {
  // "r1", "r2"… in the post's order; unique within one result.
  id: string;
  // Short, close to the post's wording: "Go in production", "5+ years of backend experience".
  text: string;
  importance: RequirementImportance;
  source: RequirementSource;
  // Names a screener searches for word for word: tools, languages, certifications, degrees.
  // Empty for a kind of experience ("mentoring engineers"), which is judged by `quote` instead.
  terms: string[];
  // Only when `terms` is empty: resume words the model says show this requirement. Kept only when
  // code finds them word for word in one resume line; "" otherwise.
  quote: string;
  // Yes/no question for when the resume doesn't show it: "Have you used Terraform?"
  ask: string;
};

export type TailorQuestion = {
  term: string;
  // Yes/no question, e.g. "Have you used Kubernetes in a job or project?"
  question: string;
};

export type TailorResult = {
  job: { title: string; company: string };
  // At most 16, must-haves first. The screener view is built from these.
  requirements: TailorRequirement[];
  // The requirements' searchable terms, kept for the tailored copy's keyword list.
  keywords: TailorKeyword[];
  // Important terms the resume doesn't show. We ask; we never add them without a "yes".
  askUser: TailorQuestion[];
  // Per experience entry, bullet ids ordered most-relevant-first. Each list is an exact permutation
  // of that entry's bullet ids (invalid orderings are dropped before returning).
  bulletOrder: { experienceId: string; bulletIds: string[] }[];
  // Suggested summary using only facts already in the resume. "" when there's nothing to suggest.
  summary: string;
  // Up to 3 short, specific tips.
  notes: string[];
};

// Cover letters and answers to application questions: what the job and resume give Otto to work
// from. `question` is only set for an answer.
export type WritingInput = {
  jobText: string;
  jobTitle: string;
  company: string;
};

export type CoverLetterResult = {
  // Greeting, 2-4 paragraphs and a sign-off, separated by blank lines: ready to edit and paste.
  letter: string;
  // Words in the body, without the greeting and sign-off.
  words: number;
  // Plain-language things to check before sending, such as a blank Otto left for a number.
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
