// Eight or more words in a row lifted from the job post read as pasted to a recruiter who just
// wrote that post, and some screening tools flag it. Shorter runs are fine: job titles and tool
// names are meant to match.

export const MIN_COPIED_WORDS = 8;

type Word = { folded: string; start: number; end: number };

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu;

function wordsOf(text: string): Word[] {
  return [...text.matchAll(WORD)].map((match) => ({
    folded: match[0].normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/’/g, "'"),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

const key = (words: readonly Word[], from: number) =>
  words
    .slice(from, from + MIN_COPIED_WORDS)
    .map((word) => word.folded)
    .join(" ");

/** Every run of MIN_COPIED_WORDS words in the post, for quick lookups. */
export function jobPhrases(jobText: string): ReadonlySet<string> {
  const words = wordsOf(jobText);
  const phrases = new Set<string>();
  for (let i = 0; i + MIN_COPIED_WORDS <= words.length; i++) phrases.add(key(words, i));
  return phrases;
}

/** Runs of MIN_COPIED_WORDS or more words in `text` that also appear in the post, as written. */
export function copiedRuns(text: string, phrases: ReadonlySet<string>): string[] {
  if (phrases.size === 0) return [];
  const words = wordsOf(text);
  const copied = new Array<boolean>(words.length).fill(false);
  for (let i = 0; i + MIN_COPIED_WORDS <= words.length; i++) {
    if (phrases.has(key(words, i))) copied.fill(true, i, i + MIN_COPIED_WORDS);
  }
  const runs: string[] = [];
  for (let i = 0; i < words.length;) {
    if (!copied[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < words.length && copied[j + 1]) j++;
    runs.push(text.slice(words[i]!.start, words[j]!.end));
    i = j + 1;
  }
  return runs;
}
