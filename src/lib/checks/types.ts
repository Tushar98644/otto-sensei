import type { FileKind } from "@/lib/parse/types";
import type { SectionKey } from "@/lib/resume/schema";

// Client-safe types for the "recruiter view". Deliberately no 0-100 score: every vendor invents
// its own, and users don't trust them. We show concrete pass/warn/fail checks instead.

export type CheckStatus = "pass" | "warn" | "fail";

export type CheckId =
  | "text-layer"
  | "contact-email"
  | "contact-phone"
  | "contact-in-header"
  | "sections"
  | "columns"
  | "tables"
  | "text-boxes"
  | "images"
  | "icons"
  | "dates"
  | "length"
  | "bullets";

export type RecruiterCheck = {
  id: CheckId;
  status: CheckStatus;
  // Plain words, short. e.g. "Two-column layout"
  title: string;
  // What we saw and why it matters. e.g. "Your skills column gets mixed into your job history..."
  detail: string;
  // One concrete action, or null when the check passed.
  fix: string | null;
};

export type RecruiterReport = {
  kind: FileKind;
  pageCount: number;
  wordCount: number;
  // Ordered: fail first, then warn, then pass.
  checks: RecruiterCheck[];
  counts: Record<CheckStatus, number>;
  // Exactly the extracted text the checks ran on (Extraction.text).
  readText: string;
  sectionsFound: SectionKey[];
  checkedAt: number;
};
