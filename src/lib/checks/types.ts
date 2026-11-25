import type fileChecks from "@/i18n/messages/en/file-checks";
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

export type CheckResultKey = keyof typeof fileChecks.results;
export type CheckFixKey = keyof typeof fileChecks.fixes;

// What rebuilds a check's words in the reader's language (text.ts); reports saved before it have none and stay English.
export type CheckCopy = {
  key: CheckResultKey;
  fix: CheckFixKey | null;
  params?: Readonly<Record<string, string | number | readonly SectionKey[]>>;
};

export type RecruiterCheck = {
  id: CheckId;
  status: CheckStatus;
  title: string;
  detail: string;
  fix: string | null;
  copy?: CheckCopy;
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
