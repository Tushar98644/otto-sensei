import type { Locale } from "@/i18n/config";
import { fmt, selectPlural } from "@/i18n/format";
import { issueText, joinList, type LintMessages } from "./i18n";
import { refPlace } from "@/lib/tailor/place";
import type { ResumeReview, ReviewItem, ReviewLine } from "./review";

function count(locale: Locale, forms: LintMessages["review"]["skills"]["title"], value: number) {
  return fmt(selectPlural(locale, forms, value), { count: value });
}

function lineText(line: ReviewLine, messages: LintMessages, locale: Locale): ReviewLine {
  const { copy } = line;
  if (!copy) return line;
  const t = messages.review;
  if (copy.kind === "issue") {
    return {
      ...line,
      place: refPlace(copy.ref, { at: t.firstLook.at, ...t.places }),
      message: issueText(copy.issue, messages, locale),
    };
  }
  if (copy.kind === "summary") {
    return {
      ...line,
      place: t.summary.place,
      message: copy.issues.map((issue) => issueText(issue, messages, locale)).join(" "),
    };
  }
  const named = [copy.title, copy.company].filter((part) => part.trim());
  const label =
    named.length === 2
      ? fmt(t.firstLook.at, { title: copy.title, company: copy.company })
      : (named[0] ?? t.firstLook.aJob);
  const parts = copy.missing.map((part) => t.firstLook.parts[part]);
  return {
    ...line,
    place: label,
    text: label,
    message: fmt(t.firstLook.missing, { parts: joinList(parts, locale, "disjunction") }),
  };
}

function itemWords(item: ReviewItem, messages: LintMessages, locale: Locale) {
  const { copy } = item;
  const t = messages.review;
  if (!copy) return { title: item.title, reason: item.reason };
  switch (copy.kind) {
    case "group": {
      const group = t.groups[copy.id];
      return { title: count(locale, group.title, copy.count), reason: group.reason };
    }
    case "summary":
      return { title: t.summary[copy.variant], reason: t.summary.reason };
    case "firstLook":
      return { title: count(locale, t.firstLook.title, copy.count), reason: t.firstLook.reason };
    case "headline":
      return { title: t.headline.title, reason: t.headline.reason };
    case "skills": {
      const skills =
        copy.rest > 0
          ? fmt(t.skills.more, { names: copy.named.join(", "), count: copy.rest })
          : joinList(copy.named, locale);
      return {
        title: count(locale, t.skills.title, copy.count),
        reason: fmt(selectPlural(locale, t.skills.reason, copy.count), { skills }),
      };
    }
  }
}

function itemText(item: ReviewItem, messages: LintMessages, locale: Locale): ReviewItem {
  const words = itemWords(item, messages, locale);
  return {
    ...item,
    ...words,
    lines: item.lines.map((line) => lineText(line, messages, locale)),
  };
}

// The review rebuilt from its copy in a language; English rebuilds it word for word.
export function rebuildReview(
  review: ResumeReview,
  messages: LintMessages,
  locale: Locale,
): ResumeReview {
  const items = review.items.map((item) => itemText(item, messages, locale));
  const byOld = new Map(review.items.map((item, index) => [item, items[index]]));
  return {
    items,
    top: review.top.map((item) => byOld.get(item) ?? itemText(item, messages, locale)),
  };
}

export function localizeReview(
  review: ResumeReview,
  messages: LintMessages,
  locale: Locale,
): ResumeReview {
  return locale === "en" ? review : rebuildReview(review, messages, locale);
}
