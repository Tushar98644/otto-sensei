// Deterministic checks on model output. The prompts already forbid inventing facts; these catch a
// model that does it anyway, for the two kinds of fact that are cheap to verify in code: numbers
// and words.

// A standalone number as written: "40", "1,200", "3.5". Digits glued to letters on either side
// are names ("S3", "HTML5", "2FA"), not quantities; "k", "M", "B" and "x" are the exceptions
// ("2M", "10x").
const NUMBER = /(?<![\p{L}\p{N}.,])[$€£¥]?(\d+(?:[.,]\d+)*)(?:%|\+|[kKmMbBx](?![\p{L}\p{N}]))?(?![\p{L}\p{N}])/gu;
const PLACEHOLDER_OR_NUMBER = new RegExp(`\\[[^\\]]*\\]|${NUMBER.source}`, "gu");
const WORD = /[\p{L}\p{N}]+/gu;

// Spelled-out numbers in the source, so "two engineers" backs up a rewrite that says "2 engineers".
const ZERO_TO_TWENTY = (
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen " +
  "sixteen seventeen eighteen nineteen twenty"
).split(" ");
const NUMBER_WORDS = new Map<string, string>([
  ...ZERO_TO_TWENTY.map((word, value): [string, string] => [word, String(value)]),
  ["thirty", "30"],
  ["forty", "40"],
  ["fifty", "50"],
  ["sixty", "60"],
  ["seventy", "70"],
  ["eighty", "80"],
  ["ninety", "90"],
  ["hundred", "100"],
  ["thousand", "1000"],
  ["dozen", "12"],
]);

export const NUMBER_PLACEHOLDER = "[number]";

// "1,200" and "1200" are the same claim.
function numberKey(digits: string): string {
  return digits.replace(/,/g, "");
}

function knownNumbers(sources: readonly string[]): Set<string> {
  const known = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(NUMBER)) known.add(numberKey(match[1] ?? ""));
    for (const match of source.toLowerCase().matchAll(WORD)) {
      const value = NUMBER_WORDS.get(match[0]);
      if (value) known.add(value);
    }
  }
  return known;
}

// True when `output` states a number that none of the sources contain.
export function hasInventedNumbers(output: string, sources: readonly string[]): boolean {
  const known = knownNumbers(sources);
  for (const match of output.matchAll(NUMBER)) {
    if (!known.has(numberKey(match[1] ?? ""))) return true;
  }
  return false;
}

// Swaps each number the sources don't contain for a placeholder, so the person is asked for the
// real figure instead of being handed a made-up one. Existing placeholders are left alone.
export function maskInventedNumbers(output: string, sources: readonly string[]): string {
  const known = knownNumbers(sources);
  return output.replace(PLACEHOLDER_OR_NUMBER, (match: string, digits: string | undefined) => {
    if (digits === undefined) return match;
    return known.has(numberKey(digits)) ? match : NUMBER_PLACEHOLDER;
  });
}

// Share of the words in `values` that never occur in `source`, from 0 to 1. Text copied from the
// source scores near 0; rewritten or invented text pushes it up.
export function novelWordShare(values: readonly string[], source: string): number {
  const known = new Set(Array.from(source.toLowerCase().matchAll(WORD), (match) => match[0]));
  let total = 0;
  let novel = 0;
  for (const value of values) {
    for (const match of value.toLowerCase().matchAll(WORD)) {
      total += 1;
      if (!known.has(match[0])) novel += 1;
    }
  }
  return total === 0 ? 0 : novel / total;
}
