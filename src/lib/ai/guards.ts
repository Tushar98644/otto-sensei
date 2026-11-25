import type { ContentLang } from "@/lib/i18n/languages";

const NUMBER = /(?<![\p{L}\p{N}.,])[$€£¥]?(\d+(?:[.,]\d+)*)(?:%|\+|[kKmMbBx](?![\p{L}\p{N}]))?(?![\p{L}\p{N}])/gu;
const PLACEHOLDER_OR_NUMBER = new RegExp(`\\[[^\\]]*\\]|${NUMBER.source}`, "gu");
// Other languages also write "12 000", "1.250,5" and "12 %".
const GROUPED = "\\d{1,3}(?:[\\u00a0\\u202f ]\\d{3})+(?!\\p{N})";
const LOOSE_NUMBER = new RegExp(
  `(?<![\\p{L}\\p{N}.,])[$€£¥]?(${GROUPED}|\\d+(?:[.,]\\d+)*)(?:[\\u00a0\\u202f ]?%|\\+|[kKmMbBx](?![\\p{L}\\p{N}]))?(?![\\p{L}\\p{N}])`,
  "gu",
);
const LOOSE_PLACEHOLDER_OR_NUMBER = new RegExp(`\\[[^\\]]*\\]|${LOOSE_NUMBER.source}`, "gu");
const WORD = /[\p{L}\p{N}]+/gu;
const SPACES = /[\s  ]+/gu;

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

// value:words, so "3:tres" reads "tres" as 3.
const FOREIGN_NUMBER_WORDS: Record<Exclude<ContentLang, "en">, string> = {
  es: `0:cero 1:uno 1:una 2:dos 3:tres 4:cuatro 5:cinco 6:seis 7:siete 8:ocho 9:nueve 10:diez 11:once
    12:doce 13:trece 14:catorce 15:quince 16:dieciséis 17:diecisiete 18:dieciocho 19:diecinueve
    20:veinte 30:treinta 40:cuarenta 50:cincuenta 60:sesenta 70:setenta 80:ochenta 90:noventa
    100:cien 1000:mil 12:docena`,
  pt: `0:zero 1:um 1:uma 2:dois 2:duas 3:três 4:quatro 5:cinco 6:seis 7:sete 8:oito 9:nove 10:dez
    11:onze 12:doze 13:treze 14:catorze 14:quatorze 15:quinze 16:dezesseis 17:dezessete 18:dezoito
    19:dezenove 20:vinte 30:trinta 40:quarenta 50:cinquenta 60:sessenta 70:setenta 80:oitenta
    90:noventa 100:cem 1000:mil 12:dúzia`,
  fr: `0:zéro 1:un 1:une 2:deux 3:trois 4:quatre 5:cinq 6:six 7:sept 8:huit 9:neuf 10:dix 11:onze
    12:douze 13:treize 14:quatorze 15:quinze 16:seize 20:vingt 30:trente 40:quarante 50:cinquante
    60:soixante 100:cent 1000:mille 12:douzaine`,
  de: `0:null 1:eins 1:ein 1:eine 2:zwei 3:drei 4:vier 5:fünf 6:sechs 7:sieben 8:acht 9:neun 10:zehn
    11:elf 12:zwölf 13:dreizehn 14:vierzehn 15:fünfzehn 16:sechzehn 17:siebzehn 18:achtzehn
    19:neunzehn 20:zwanzig 30:dreißig 40:vierzig 50:fünfzig 60:sechzig 70:siebzig 80:achtzig
    90:neunzig 100:hundert 1000:tausend 12:dutzend`,
};

function foreignWords(lang: Exclude<ContentLang, "en">): Map<string, string> {
  const words = new Map<string, string>();
  for (const entry of FOREIGN_NUMBER_WORDS[lang].trim().split(/\s+/)) {
    const [value = "", word = ""] = entry.split(":");
    words.set(word, value);
    words.set(word.normalize("NFKD").replace(/\p{M}+/gu, ""), value);
  }
  return words;
}

const FOREIGN_WORDS = {
  es: foreignWords("es"),
  pt: foreignWords("pt"),
  fr: foreignWords("fr"),
  de: foreignWords("de"),
};

export const NUMBER_PLACEHOLDER = "[number]";

// The languages a check reads in; English alone keeps today's exact behaviour.
export type NumberLangs = readonly ContentLang[];
const ENGLISH_ONLY: NumberLangs = ["en"];

const isLoose = (langs: NumberLangs) => langs.some((lang) => lang !== "en");

function numberKey(digits: string): string {
  return digits.replace(/,/g, "");
}

// One spelling for a number written either way: "1.250,5", "1,250.5" and "1 250,5" are all 1250.5.
export function canonicalNumber(digits: string): string {
  const plain = digits.replace(SPACES, "");
  const dot = plain.lastIndexOf(".");
  const comma = plain.lastIndexOf(",");
  if (dot >= 0 && comma >= 0) {
    const [decimal, group] = dot > comma ? [".", ","] : [",", "."];
    return plain.split(group).join("").replace(decimal, ".");
  }
  const separator = dot >= 0 ? "." : comma >= 0 ? "," : null;
  if (!separator) return plain;
  const parts = plain.split(separator);
  const head = parts[0] ?? "";
  const grouped = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
  if (grouped && head.length <= 3 && head !== "0") return parts.join("");
  return parts.length === 2 ? parts.join(".") : parts.join("");
}

function knownNumbers(sources: readonly string[], langs: NumberLangs): Set<string> {
  const loose = isLoose(langs);
  const known = new Set<string>();
  const words = [
    NUMBER_WORDS,
    ...langs.flatMap((lang) => (lang === "en" ? [] : [FOREIGN_WORDS[lang]])),
  ];
  for (const source of sources) {
    for (const match of source.matchAll(loose ? LOOSE_NUMBER : NUMBER)) {
      const digits = match[1] ?? "";
      known.add(numberKey(digits));
      if (loose) {
        known.add(canonicalNumber(digits));
        for (const part of digits.split(SPACES)) known.add(numberKey(part));
      }
    }
    for (const match of source.toLowerCase().matchAll(WORD)) {
      for (const list of words) {
        const value = list.get(match[0]);
        if (value) known.add(value);
      }
    }
  }
  return known;
}

function isKnown(digits: string, known: ReadonlySet<string>, loose: boolean): boolean {
  if (known.has(numberKey(digits))) return true;
  if (!loose) return false;
  if (known.has(canonicalNumber(digits))) return true;
  const parts = digits.split(SPACES);
  return parts.length > 1 && parts.every((part) => known.has(numberKey(part)));
}

export function hasInventedNumbers(
  output: string,
  sources: readonly string[],
  langs: NumberLangs = ENGLISH_ONLY,
): boolean {
  const loose = isLoose(langs);
  const known = knownNumbers(sources, langs);
  for (const match of output.matchAll(loose ? LOOSE_NUMBER : NUMBER)) {
    if (!isKnown(match[1] ?? "", known, loose)) return true;
  }
  return false;
}

export function maskInventedNumbers(
  output: string,
  sources: readonly string[],
  langs: NumberLangs = ENGLISH_ONLY,
): string {
  const loose = isLoose(langs);
  const known = knownNumbers(sources, langs);
  const pattern = loose ? LOOSE_PLACEHOLDER_OR_NUMBER : PLACEHOLDER_OR_NUMBER;
  return output.replace(pattern, (match: string, digits: string | undefined) => {
    if (digits === undefined) return match;
    return isKnown(digits, known, loose) ? match : NUMBER_PLACEHOLDER;
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
