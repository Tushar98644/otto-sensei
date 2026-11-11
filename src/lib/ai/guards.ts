const NUMBER = /(?<![\p{L}\p{N}.,])[$€£¥]?(\d+(?:[.,]\d+)*)(?:%|\+|[kKmMbBx](?![\p{L}\p{N}]))?(?![\p{L}\p{N}])/gu;
const PLACEHOLDER_OR_NUMBER = new RegExp(`\\[[^\\]]*\\]|${NUMBER.source}`, "gu");
const WORD = /[\p{L}\p{N}]+/gu;

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

export function hasInventedNumbers(output: string, sources: readonly string[]): boolean {
  const known = knownNumbers(sources);
  for (const match of output.matchAll(NUMBER)) {
    if (!known.has(numberKey(match[1] ?? ""))) return true;
  }
  return false;
}

export function maskInventedNumbers(output: string, sources: readonly string[]): string {
  const known = knownNumbers(sources);
  return output.replace(PLACEHOLDER_OR_NUMBER, (match: string, digits: string | undefined) => {
    if (digits === undefined) return match;
    return known.has(numberKey(digits)) ? match : NUMBER_PLACEHOLDER;
  });
}

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
