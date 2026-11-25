import { CONTENT_LANGS, DEFAULT_CONTENT_LANG, type ContentLang } from "./languages";

// Dependency-free: common words, word endings and accents, scored per language.

export type DetectedLang = ContentLang | "unknown";
export type Detection = { lang: DetectedLang; confidence: number };

type Scores = Record<ContentLang, number>;

const MAX_CHARS = 20_000;
// Evidence below this reads as unsure, however lopsided it is.
const ENOUGH_EVIDENCE = 6;
const MIN_EVIDENCE = 2;
const MIN_CONFIDENCE = 0.5;
const CAPITALIZED_WEIGHT = 0.3;

// Function words: an all-caps one ("MIT", "LA") doesn't count, and a capitalized one ("Los Angeles") counts less.
const FUNCTION_WORDS: Record<ContentLang, string> = {
  en: `the and of to in for with on at by from an is was were are be been as that this these those
    which who our my i we it its has have had will would can not or but into over than their they you
    your all more also through across about while during after before each per using including within
    i'm i've we're it's don't`,
  es: `el la los las de del y en con para por que un una unos unas al se su sus es son fue como más
    lo le les este esta estos estas entre sobre desde hasta también mediante durante hacia según mi
    mis nuestro nuestra nuestros nuestras cada o sin muy ya pero donde cuando sólo solo e u través
    gracias así tanto todo todos ser`,
  pt: `o a os as de do da dos das e em no na nos nas com para por pelo pela pelos pelas que um uma
    ao à aos se seu sua seus suas é foi são como mais mas entre sobre desde até também através
    durante meu minha nosso nossa cada ou sem muito já onde quando não assim todo todos ser`,
  fr: `le la les de des du et en avec pour par que qui un une au aux à se sa son ses est sont été
    comme plus dans sur entre depuis lors pendant vers mon ma mes notre nos chaque ou sans très déjà
    mais où quand ne pas ce cette ces l' d' j' qu' n' s' c' grâce afin ainsi leur leurs
    tout tous être avoir`,
  de: `der die das den dem des und in im mit für von vom zu zur zum auf aus bei beim ein eine einen
    einem einer ist sind war wurde wurden als wie mehr über zwischen seit bis auch durch während
    nach mein meine unser unsere jede oder ohne sehr bereits aber wo wenn nicht sowie dass sich alle
    werden haben`,
};

// Words resumes and job posts use a lot, so a short line still gives something to go on.
const VOCABULARY: Record<ContentLang, string> = {
  en: `experience team years skills managed developed led built improved customers responsible`,
  es: `año años equipo empresa gestión desarrollo proyectos clientes ventas experiencia
    conocimientos trabajo actualidad ingeniero diseño mejora responsable tiempo usuarios`,
  pt: `ano anos equipe empresa gestão desenvolvimento projetos clientes vendas experiência
    conhecimentos trabalho atual engenheiro melhoria responsável tempo usuários`,
  fr: `an ans équipe entreprise gestion développement projets ventes expérience connaissances
    travail ingénieur conception amélioration responsable temps utilisateurs`,
  de: `jahr jahre unternehmen leitung entwicklung projekte kunden vertrieb erfahrung kenntnisse
    arbeit heute ingenieur verbesserung verantwortlich zeit nutzer`,
};

// Each word's weight is shared by every language that uses it, so "de" counts a third each for es, pt and fr.
function weightsOf(lists: Record<ContentLang, string>): ReadonlyMap<string, Partial<Scores>> {
  const owners = new Map<string, ContentLang[]>();
  for (const lang of CONTENT_LANGS) {
    for (const word of lists[lang].trim().split(/\s+/)) {
      owners.set(word, [...(owners.get(word) ?? []), lang]);
    }
  }
  const weights = new Map<string, Partial<Scores>>();
  for (const [word, langs] of owners) {
    weights.set(word, Object.fromEntries(langs.map((lang) => [lang, 1 / langs.length])));
  }
  return weights;
}

const FUNCTION_WEIGHTS = weightsOf(FUNCTION_WORDS);
const VOCABULARY_WEIGHTS = weightsOf(VOCABULARY);

// Longest first; only the first ending that fits counts, on words of 5 letters or more.
const ENDINGS: readonly [string, Partial<Scores>][] = [
  ["ções", { pt: 1 }],
  ["ção", { pt: 1 }],
  ["ciones", { es: 1 }],
  ["ción", { es: 1 }],
  ["ungen", { de: 1 }],
  ["schaft", { de: 1 }],
  ["keit", { de: 1 }],
  ["heit", { de: 1 }],
  ["lich", { de: 0.8 }],
  ["isch", { de: 0.8 }],
  ["ung", { de: 1 }],
  ["idad", { es: 1 }],
  ["dade", { pt: 1 }],
  ["eurs", { fr: 0.8 }],
  ["euse", { fr: 0.8 }],
  ["ées", { fr: 1 }],
  ["ée", { fr: 0.8 }],
  ["ité", { fr: 0.8 }],
  ["eur", { fr: 0.6 }],
  ["aux", { fr: 0.6 }],
  ["iendo", { es: 1 }],
  ["endo", { pt: 0.6 }],
  ["indo", { pt: 0.6 }],
  ["ando", { es: 0.5, pt: 0.5 }],
  ["mente", { es: 0.5, pt: 0.5 }],
  ["ness", { en: 0.8 }],
  ["ing", { en: 1 }],
  ["ed", { en: 0.6 }],
  ["ly", { en: 0.5 }],
];

const CHARS: Readonly<Record<string, Partial<Scores>>> = {
  ñ: { es: 2 },
  "¿": { es: 2 },
  "¡": { es: 2 },
  ã: { pt: 2 },
  õ: { pt: 2 },
  ç: { pt: 0.7, fr: 0.7 },
  ä: { de: 2 },
  ö: { de: 2 },
  ü: { de: 1.5 },
  ß: { de: 2 },
  è: { fr: 1.5 },
  ù: { fr: 1.5 },
  ë: { fr: 1 },
  ï: { fr: 1 },
  î: { fr: 1 },
  û: { fr: 1 },
  œ: { fr: 2 },
  é: { es: 0.2, pt: 0.2, fr: 0.5 },
  á: { es: 0.4, pt: 0.4 },
  í: { es: 0.4, pt: 0.4 },
  ó: { es: 0.4, pt: 0.4 },
  ú: { es: 0.4, pt: 0.4 },
  â: { pt: 0.4, fr: 0.4 },
  ê: { pt: 0.4, fr: 0.4 },
  ô: { pt: 0.4, fr: 0.4 },
  à: { pt: 0.3, fr: 0.5 },
};

const WORD = /\p{L}+(?:'\p{L}+)*/gu;
const ELISION = /^(l|d|j|qu|n|s|c|m|t|jusqu|lorsqu|puisqu)'(\p{L}{2,}.*)$/u;

function emptyScores(): Scores {
  return { en: 0, es: 0, pt: 0, fr: 0, de: 0 };
}

function add(scores: Scores, weights: Partial<Scores> | undefined, times = 1): void {
  if (!weights || times === 0) return;
  for (const lang of CONTENT_LANGS) scores[lang] += (weights[lang] ?? 0) * times;
}

type Word = { lower: string; text: string };

// French elisions split off ("l'équipe" is "l'" and "équipe"); English contractions stay whole.
export function detectionWords(text: string): Word[] {
  const words: Word[] = [];
  for (const [match] of text.replaceAll("’", "'").matchAll(WORD)) {
    const lower = match.toLowerCase();
    const elided = ELISION.exec(lower);
    if (elided) {
      const head = `${elided[1]}'`;
      words.push({ lower: head, text: match.slice(0, head.length) });
      words.push({ lower: elided[2] ?? "", text: match.slice(head.length) });
    } else {
      words.push({ lower, text: match });
    }
  }
  return words;
}

function caseWeight(text: string): number {
  if (!/^\p{Lu}/u.test(text)) return 1;
  return text.length > 1 && text === text.toUpperCase() ? 0 : CAPITALIZED_WEIGHT;
}

function scoresOf(text: string): Scores {
  const scores = emptyScores();
  const sample = text.slice(0, MAX_CHARS);
  for (const { lower, text: original } of detectionWords(sample)) {
    add(scores, FUNCTION_WEIGHTS.get(lower), caseWeight(original));
    add(scores, VOCABULARY_WEIGHTS.get(lower));
    if (lower.length >= 5) add(scores, ENDINGS.find(([ending]) => lower.endsWith(ending))?.[1]);
  }
  for (const char of sample.toLowerCase()) add(scores, CHARS[char]);
  return scores;
}

// Unsure (too little text, or two languages too close) comes back as "unknown".
export function detectLanguage(text: string): Detection {
  const scores = scoresOf(text);
  const ranked = [...CONTENT_LANGS].sort((a, b) => scores[b] - scores[a]);
  const [first = DEFAULT_CONTENT_LANG, second = DEFAULT_CONTENT_LANG] = ranked;
  const best = scores[first];
  const total = CONTENT_LANGS.reduce((sum, lang) => sum + scores[lang], 0);
  if (best <= 0 || total < MIN_EVIDENCE) return { lang: "unknown", confidence: 0 };
  const share = best / total;
  const margin = (best - scores[second]) / best;
  const amount = Math.min(1, total / ENOUGH_EVIDENCE);
  const confidence = Math.round(amount * (share + margin) * 50) / 100;
  return { lang: confidence >= MIN_CONFIDENCE ? first : "unknown", confidence };
}

export function languageOf(text: string, fallback: ContentLang = DEFAULT_CONTENT_LANG): ContentLang {
  const { lang } = detectLanguage(text);
  return lang === "unknown" ? fallback : lang;
}
