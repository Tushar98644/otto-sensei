import { indexPhrases, vagueOf, wordSet, type LintLanguage } from "./types";

// French CVs often lead with a noun ("Gestion de…") or a participle ("Développé…"); both read as strong.

const STOCK_PHRASES = [
  "aisance relationnelle",
  "bon relationnel",
  "bonnes capacités de communication",
  "bonnes compétences en communication",
  "capacité d'adaptation",
  "dynamique et motivé",
  "dynamique et motivée",
  "esprit d'initiative",
  "esprit d'équipe",
  "excellent relationnel",
  "excellentes capacités de communication",
  "excellentes compétences en communication",
  "force de proposition",
  "forte expérience",
  "hautement motivé",
  "hautement motivée",
  "joueur d'équipe",
  "orienté résultats",
  "orienté vers les résultats",
  "orientée résultats",
  "orientée vers les résultats",
  "passion pour",
  "passionné par",
  "passionnée par",
  "polyvalent",
  "polyvalente",
  "proactif",
  "proactive",
  "résistance au stress",
  "rigoureuse",
  "rigoureux",
  "sens du détail",
  "sens du relationnel",
  "sens du travail en équipe",
  "solide expérience",
  "sortir des sentiers battus",
  "souci du détail",
  "synergie",
  "synergies",
  "travail en équipe",
  "travail sous pression",
  "travailler sous pression",
  "très motivé",
  "très motivée",
  "valeur ajoutée",
];

const DUTY_STARTS = [
  "chargé de",
  "chargé des",
  "chargé du",
  "chargée de",
  "chargée des",
  "chargée du",
  "en charge de",
  "en charge des",
  "en charge du",
  "étais en charge de",
  "étais responsable de",
  "mes missions",
  "mes responsabilités",
  "mes tâches",
  "responsable de",
  "responsable des",
  "responsable du",
  "travail sur",
  "travaillé sur",
];

const WEAK_STARTS = [
  "aidant",
  "aide à",
  "aide au",
  "aidé",
  "aidé à",
  "aidé au",
  "assistance à",
  "assistance au",
  "assisté",
  "assisté à",
  "assisté au",
  "collaboré avec",
  "contribué à",
  "contribué au",
  "contribution à",
  "contribution au",
  "étais",
  "été impliqué dans",
  "été impliquée dans",
  "fait",
  "fait partie de",
  "faisais partie de",
  "impliqué dans",
  "impliquée dans",
  "participation à",
  "participation au",
  "participation aux",
  "participé à",
  "participé au",
  "participé aux",
  "pris part à",
  "soutien à",
  "soutien au",
  "soutien aux",
  "soutenu",
  "traité",
  "travaillé avec",
];

const RESULT_WORDS = wordSet(`
  accru accrue accrus accroissement accéléré accélérée accélérant accélération amélioration
  améliorations amélioré améliorée améliorés améliorant atteint atteinte augmentation
  augmentations augmenté augmentée augmentés augmentant baisse baissé converti croissance
  diminué diminuée diminuant diminution doublé doublée dépassé économie économies économisé
  économisant élargi éliminé éliminant élimination évité évitant gagné généré générée générant
  hausse maximisé minimisé obtenu obtenue permettant raccourci récupéré remporté réduction
  réductions réduire réduisant réduit réduite réduits réduites supprimé triplé
`);
const RESULT_PHRASES = indexPhrases([
  "aboutissant à",
  "adopté par",
  "adoptée par",
  "afin que",
  "ce qui a permis",
  "conduisant à",
  "de sorte que",
  "plus rapide",
  "plus rapides",
  "si bien que",
  "utilisé par",
  "utilisée par",
  "utilisés par",
]);
const RESULT_OPENERS = wordSet(`
  accru accéléré amélioration amélioré augmentation augmenté diminué diminution doublé
  économisé généré réduction réduit triplé
`);

const NUMBER_WORDS = wordSet(`
  zéro deux trois quatre cinq six sept huit dix onze douze treize quatorze quinze seize vingt
  trente quarante cinquante soixante cent cents mille million millions milliard milliards
  double doublé triple triplé moitié douzaine douzaines dizaine dizaines centaine centaines
  milliers pourcent
`);

export const fr: LintLanguage = {
  lang: "fr",
  openerSkips: wordSet("je j' nous ai avons"),
  elisions: true,
  abbreviations: wordSet("etc env cf ex vs ste"),
  stock: indexPhrases(STOCK_PHRASES),
  duty: indexPhrases(DUTY_STARTS),
  weakStart: indexPhrases(WEAK_STARTS),
  // "me" and "m'" are left out: they belong to verbs like "je m'occupe".
  firstPerson: {
    words: wordSet("je j' moi mon ma mes nous notre nos"),
    team: wordSet("nous notre nos"),
  },
  result: { words: RESULT_WORDS, phrases: RESULT_PHRASES, suffixes: [], openers: RESULT_OPENERS },
  method: {
    words: wordSet("avec via grâce après moyennant"),
    phrases: indexPhrases([
      "à l'aide de",
      "à l'aide d'",
      "au moyen de",
      "grâce à",
      "grâce au",
      "grâce aux",
      "par le biais de",
    ]),
    gerund: null,
    lead: { word: "en", next: (word) => /^\p{L}{3,}ant$/u.test(word) },
  },
  numberWords: NUMBER_WORDS,
  vague: vagueOf(
    {
      count: [
        "beaucoup d'",
        "beaucoup de",
        "divers",
        "diverses",
        "multiples",
        "nombreuses",
        "nombreux",
        "plusieurs",
        "un certain nombre de",
        "une multitude de",
      ],
      list: ["entre autres", "et ainsi de suite", "et cetera", "etc"],
      thing: ["choses", "trucs"],
    },
    ["etc"],
  ),
};
