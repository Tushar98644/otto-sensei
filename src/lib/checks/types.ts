import type { FileKind } from "@/lib/parse/types";
import type { SectionKey } from "@/lib/resume/schema";

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
  title: string;
  detail: string;
  fix: string | null;
};

export type RecruiterReport = {
  kind: FileKind;
  pageCount: number;
  wordCount: number;
  checks: RecruiterCheck[];
  counts: Record<CheckStatus, number>;
  readText: string;
  sectionsFound: SectionKey[];
  checkedAt: number;
};
