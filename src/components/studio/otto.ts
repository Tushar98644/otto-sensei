import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { countText } from "./count";

// What Otto says in the studio's upload and recruiter-view steps, in the page's language.
type Otto = Messages["studio"]["otto"];
type CheckCounts = { fail: number; warn: number; pass: number };

export function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function asSentence(text: string) {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function uploadFailed(otto: Otto, reason: string): string {
  return reason.trim()
    ? fmt(otto.upload.failed, { reason: asSentence(reason) })
    : otto.upload.failedBlank;
}

export function reviewSummary(otto: Otto, format: Format, counts: CheckCounts): string {
  const t = otto.review;
  const fail = whole(counts.fail);
  const warn = whole(counts.warn);
  const pass = whole(counts.pass);
  if (fail > 0) {
    const failed = countText(format, t.failed, fail);
    const first = warn > 0 ? fmt(t.failedAndWarned, { failed, warn }) : fmt(t.failedOnly, { failed });
    return pass > 0 ? `${first} ${countText(format, t.passed, pass)}` : first;
  }
  if (warn > 0) return countText(format, t.warnedOnly, warn);
  return t.allGood;
}

export function reviewOverall(
  otto: Otto,
  format: Format,
  counts: CheckCounts,
  toFix: number,
): string {
  const t = otto.review;
  const words = whole(toFix);
  if (whole(counts.fail) > 0 || words === 0) return reviewSummary(otto, format, counts);
  const start = whole(counts.warn) > 0 ? t.readableWithSnags : t.readable;
  return `${start} ${countText(format, t.wordsFirst, words)}`;
}
