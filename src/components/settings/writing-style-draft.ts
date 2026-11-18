import {
  DEFAULT_WRITING_STYLE,
  type WritingStyle,
  type WritingStyleBody,
} from "@/lib/writing-style/schema";

export function bodyOf(style: WritingStyle | WritingStyleBody): WritingStyleBody {
  const { tone, length, spelling, signOff, notes } = style;
  return { tone, length, spelling, signOff, notes };
}

export const DEFAULT_BODY: WritingStyleBody = bodyOf(DEFAULT_WRITING_STYLE);

// The same clean-up the server does, so spaces alone never count as a change.
export function tidyStyle(body: WritingStyleBody): WritingStyleBody {
  return {
    ...bodyOf(body),
    signOff: body.signOff.replace(/\s+/g, " ").trim(),
    notes: body.notes.trim(),
  };
}

export function sameStyle(a: WritingStyleBody, b: WritingStyleBody): boolean {
  const left = tidyStyle(a);
  const right = tidyStyle(b);
  return (
    left.tone === right.tone &&
    left.length === right.length &&
    left.spelling === right.spelling &&
    left.signOff === right.signOff &&
    left.notes === right.notes
  );
}

// The saved copy once a save lands, unless the person kept editing while it was on its way.
export function draftAfterSave(
  current: WritingStyleBody,
  sent: WritingStyleBody,
  saved: WritingStyle,
): WritingStyleBody {
  return sameStyle(current, sent) ? bodyOf(saved) : current;
}
