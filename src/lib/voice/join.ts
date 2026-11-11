const SENTENCE_END = /[.!?…。！？]["'”’»)\]]*$/u;
const LEADING_PUNCTUATION = /^[,.!?;:…]/;

export type Appended = { text: string; full: boolean };

export function joinDictation(current: string, chunk: string): string {
  const words = chunk.trim().replace(/\s+/g, " ");
  if (!words) return current;
  const before = baseOf(current);
  if (before === "") return capitalize(words);
  if (before.endsWith("\n")) return before + capitalize(words);
  const next = SENTENCE_END.test(before) ? capitalize(words) : words;
  return LEADING_PUNCTUATION.test(next) ? before + next : `${before} ${next}`;
}

// Cuts at a word boundary so a full box never ends in half a word, and never touches what was there.
export function appendDictation(
  current: string,
  chunk: string,
  maxLength = Number.POSITIVE_INFINITY,
): Appended {
  const joined = joinDictation(current, chunk);
  if (joined.length <= maxLength) return { text: joined, full: false };
  const kept = baseOf(current).length;
  let end = maxLength;
  while (end > kept && !/\s/.test(joined[end] ?? " ")) end -= 1;
  const text = joined.slice(0, end).trimEnd();
  return { text: text.length > kept ? text : current, full: true };
}

function baseOf(current: string): string {
  const before = current.replace(/[^\S\n]+$/, "");
  return before.trim() === "" ? "" : before;
}

function capitalize(words: string): string {
  return words.replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase());
}
