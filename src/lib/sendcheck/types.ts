import type { Format } from "@/i18n/intl";
import type studioDownloadEn from "@/i18n/messages/en/studio-download";
import type { Translation } from "@/i18n/types";
import type { Basics, SectionKey } from "@/lib/resume/schema";

export type SendCheckRule = "placeholder" | "company" | "dates" | "tool-dates" | "copied";

export type SendCheckTarget =
  | { kind: "line"; bulletId: string }
  | { kind: "entry"; entryId: string }
  | { kind: "section"; section: SectionKey }
  | { kind: "extra"; sectionId: string }
  | { kind: "summary" }
  | { kind: "basics"; field: Exclude<keyof Basics, "links"> | "links" }
  | { kind: "letter" };

export type SendCheckItem = {
  id: string;
  rule: SendCheckRule;
  title: string;
  message: string;
  quote: string | null;
  place: string;
  target: SendCheckTarget;
};

export type SendCheckContext = {
  now: number;
  jobText?: string;
  otherCompanies?: readonly string[];
  // The reader's words and formats; English when left out.
  words?: SendCheckWords;
  format?: Format;
};

export type SendCheckWords = Translation<typeof studioDownloadEn.sendItems>;
