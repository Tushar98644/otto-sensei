import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import studioTailorEn from "@/i18n/messages/en/studio-tailor";
import type { Translation } from "@/i18n/types";
import { joinList } from "@/lib/lint/i18n";
import type { Resume } from "@/lib/resume/schema";
import { findTermIn } from "./keywords";
import type { RequirementRow } from "./requirements";
import { foldCase, textTokens } from "./tokens";

const SENIORITY = new Set(
  "senior sr jr junior lead principal staff head chief associate entry level mid i ii iii iv".split(
    " ",
  ),
);
const TITLE_STOPWORDS = new Set("a an and the of for to in on with at".split(" "));

export function coreTitle(title: string): string {
  return title.split(/\s+[-–—|]\s+|,|\(|\s+at\s+/i)[0]?.trim() ?? "";
}

function titleWords(title: string): string[] {
  return (foldCase(title).match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (word) => !SENIORITY.has(word) && !TITLE_STOPWORDS.has(word),
  );
}

function covers(have: string, want: readonly string[]): boolean {
  const words = new Set(titleWords(have));
  return want.length > 0 && want.every((word) => words.has(word));
}

export type TitleCheck = { status: "match" | "differs" | "missing"; text: string; core: string };

export type TitleWords = Translation<typeof studioTailorEn.reasons.title>;
export type SummaryWords = Translation<typeof studioTailorEn.reasons.summary>;

export function titleCheck(
  resume: Resume,
  jobTitle: string,
  t: TitleWords = studioTailorEn.reasons.title,
): TitleCheck | null {
  const core = coreTitle(jobTitle);
  const want = titleWords(core);
  if (want.length === 0) return null;
  const headline = resume.basics.headline.trim();
  if (covers(headline, want)) {
    return { status: "match", text: fmt(t.headline, { title: core }), core };
  }
  const latest = resume.experience.find((job) => !job.hidden && job.title.trim());
  if (latest && covers(latest.title, want)) {
    return { status: "match", text: fmt(t.latest, { title: core }), core };
  }
  if (!headline) {
    return { status: "missing", text: fmt(t.missing, { title: core }), core };
  }
  return { status: "differs", text: fmt(t.differs, { title: core, headline }), core };
}

export type SummaryCheck = { status: "match" | "differs" | "missing"; text: string };

export function summaryCheck(
  resume: Resume,
  rows: readonly RequirementRow[],
  jobTitle: string,
  t: SummaryWords = studioTailorEn.reasons.summary,
  locale: Locale = "en",
): SummaryCheck {
  const summary = resume.summary.trim();
  if (!summary) return { status: "missing", text: t.missing };
  const tokens = textTokens(summary);
  const want = titleWords(coreTitle(jobTitle));
  const named = rows
    .filter((row) => row.importance === "must" && row.terms.length > 0)
    .filter((row) => row.terms.some((term) => findTermIn(summary, tokens, term).found));
  if (named.length > 0 || covers(summary, want)) {
    const what =
      named.length > 0
        ? named
            .map((row) => row.terms[0])
            .slice(0, 3)
            .join(", ")
        : t.theTitle;
    return { status: "match", text: fmt(t.names, { what }) };
  }
  const proven = rows
    .filter((row) => row.importance === "must" && row.status === "proven" && row.terms.length > 0)
    .map((row) => row.terms[0] ?? "")
    .slice(0, 3);
  const suggest = proven.length > 0 ? fmt(t.suggest, { names: joinList(proven, locale) }) : "";
  return { status: "differs", text: `${t.differs}${suggest}` };
}
