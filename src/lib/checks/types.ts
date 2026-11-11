import type { FileKind } from "@/lib/parse/types";
import type { SectionKey } from "@/lib/resume/schema";

// Deliberately no 0-100 score: every vendor invents its own, and users don't trust them.

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
  // e.g. "Two-column layout"
  title: string;
  detail: string;
  // null when the check passed.
  fix: string | null;
};

export type RecruiterReport = {
  kind: FileKind;
  pageCount: number;
  wordCount: number;
  // Fail first, then warn, then pass.
  checks: RecruiterCheck[];
  counts: Record<CheckStatus, number>;
  // Exactly Extraction.text.
  readText: string;
  sectionsFound: SectionKey[];
  checkedAt: number;
};
