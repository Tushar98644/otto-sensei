import type { Basics, SectionKey } from "@/lib/resume/schema";

// Client-safe. The send check runs in the browser on the resume as it is now: a list of things a
// recruiter would catch that no spell checker does. Each item says what and where, never a score.

export type SendCheckRule = "placeholder" | "company" | "dates" | "tool-dates" | "copied";

// Where "Fix it" goes: a line, an entry (a job, school, project, certification or an extra
// section's item), a whole section or extra section, the summary, a contact field or the cover
// letter.
export type SendCheckTarget =
  | { kind: "line"; bulletId: string }
  | { kind: "entry"; entryId: string }
  | { kind: "section"; section: SectionKey }
  | { kind: "extra"; sectionId: string }
  | { kind: "summary" }
  | { kind: "basics"; field: Exclude<keyof Basics, "links"> | "links" }
  | { kind: "letter" };

export type SendCheckItem = {
  // Built from the rule, the place and the exact text, so "This is correct" outlives a reload but
  // not an edit: change the text and the item can come back.
  id: string;
  rule: SendCheckRule;
  // A few words: "Dates overlap", "Blank left in".
  title: string;
  // One or two plain sentences with the facts.
  message: string;
  // The exact text in question, for a highlight. Null when the item is about a whole entry.
  quote: string | null;
  // Where it is, in words: "Senior Engineer at Northwind", "Summary", "Cover letter".
  place: string;
  target: SendCheckTarget;
};

export type SendCheckContext = {
  // Epoch ms. Dates after this month count as in the future.
  now: number;
  // The job post a tailored copy was made for, when this browser still has it.
  jobText?: string;
  // Companies of the person's other tailored copies: the likeliest names to be left over in a
  // summary or letter written for another job.
  otherCompanies?: readonly string[];
};
