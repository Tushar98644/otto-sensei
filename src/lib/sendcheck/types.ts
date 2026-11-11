import type { Basics, SectionKey } from "@/lib/resume/schema";

// Each item says what and where, never a score.

export type SendCheckRule = "placeholder" | "company" | "dates" | "tool-dates" | "copied";

// Where "Fix it" goes.
export type SendCheckTarget =
  | { kind: "line"; bulletId: string }
  | { kind: "entry"; entryId: string }
  | { kind: "section"; section: SectionKey }
  | { kind: "extra"; sectionId: string }
  | { kind: "summary" }
  | { kind: "basics"; field: Exclude<keyof Basics, "links"> | "links" }
  | { kind: "letter" };

export type SendCheckItem = {
  // From the rule, place and exact text, so "This is correct" outlives a reload but not an edit.
  id: string;
  rule: SendCheckRule;
  title: string;
  message: string;
  // Null when the item is about a whole entry.
  quote: string | null;
  place: string;
  target: SendCheckTarget;
};

export type SendCheckContext = {
  // Epoch ms. Dates after this month count as in the future.
  now: number;
  jobText?: string;
  // The likeliest names to be left over in a summary or letter written for another job.
  otherCompanies?: readonly string[];
};
