import { fold, indexPhrases, vagueOf, wordSet, type LintLanguage } from "./types";

// German CVs often lead with a noun ("Leitung von…", "Aufbau eines…") or end on the verb; both read as strong.

const STOCK_PHRASES = [
  "analytisches denkvermögen",
  "ausgeprägte kommunikationsfähigkeit",
  "belastbar",
  "belastbarkeit",
  "durchsetzungsstark",
  "durchsetzungsvermögen",
  "eigenverantwortliche arbeitsweise",
  "ergebnisorientiert",
  "ergebnisorientierte",
  "ergebnisorientierter",
  "hands on mentalität",
  "hoch motiviert",
  "hochmotiviert",
  "hochmotivierte",
  "hochmotivierter",
  "kommunikationsfähig",
  "kommunikationsfähigkeit",
  "kommunikationsstark",
  "leidenschaftlich",
  "lösungsorientiert",
  "lösungsorientierte",
  "mehrwert",
  "mit leidenschaft",
  "proaktiv",
  "schnelle auffassungsgabe",
  "selbständige arbeitsweise",
  "selbstständige arbeitsweise",
  "stressresistent",
  "strukturierte arbeitsweise",
  "synergie",
  "synergien",
  "team player",
  "teamfähig",
  "teamfähigkeit",
  "teamgeist",
  "teamplayer",
  "über den tellerrand",
  "verantwortungsbewusst",
  "verantwortungsbewusstsein",
  "zielorientiert",
  "zielorientierte",
];

const DUTY_STARTS = [
  "arbeit an",
  "arbeitete an",
  "beauftragt mit",
  "betraut mit",
  "meine aufgaben",
  "tätig als",
  "tätigkeit als",
  "verantwortlich für",
  "verantwortung für",
  "war verantwortlich für",
  "war zuständig für",
  "zu meinen aufgaben gehörte",
  "zu meinen aufgaben gehörten",
  "zuständig für",
];

const WEAK_STARTS = [
  "assistenz bei",
  "bearbeitete",
  "bearbeitung von",
  "beteiligt an",
  "beteiligung an",
  "erledigte",
  "erledigung von",
  "half",
  "half bei",
  "hilfe bei",
  "mitarbeit an",
  "mitarbeit bei",
  "mitarbeit im",
  "mitarbeit in",
  "mitwirkung an",
  "mitwirkung bei",
  "nahm teil an",
  "teilnahme an",
  "unterstützt",
  "unterstützte",
  "unterstützung bei",
  "unterstützung der",
  "unterstützung des",
  "war",
  "war beteiligt an",
  "war teil",
  "wirkte mit",
];

const RESULT_WORDS = wordSet(`
  beschleunigt beschleunigte beschleunigung beseitigt eingespart einsparung einsparungen
  eliminiert eliminierte ermöglicht ermöglichte erreicht erreichte erhöht erhöhte erhöhung
  erzielt erzielte generiert generierte gesenkt gespart gesteigert gewachsen gewann gewonnen
  günstiger halbiert halbierte maximiert maximierte minimiert minimierte reduktion reduziert
  reduzierte reduzierung schneller senkte senkung sodass sparte steigerte steigerung
  übertraf übertroffen verbessert verbesserte verbesserung verbesserungen verdoppelt
  verdoppelte verdopplung verdreifacht verdreifachte verhindert verhinderte verkürzt
  verkürzte verkürzung vermied vermieden verringert verringerte verringerung wachstum wodurch
  wuchs
`);
const RESULT_PHRASES = indexPhrases([
  "eingesetzt von",
  "führte zu",
  "genutzt von",
  "so dass",
  "verwendet von",
  "was zu",
  "zur folge",
]);
const RESULT_SUFFIXES = [
  "beschleunigung",
  "einsparung",
  "einsparungen",
  "erhöhung",
  "reduktion",
  "reduzierung",
  "senkung",
  "steigerung",
  "verbesserung",
  "verbesserungen",
  "verdopplung",
  "verkürzung",
  "verringerung",
  "wachstum",
].map(fold);
const RESULT_OPENERS = wordSet(`
  einsparung erhöhte erhöhung halbierte reduktion reduzierte reduzierung senkte senkung sparte
  steigerte steigerung verbesserte verbesserung verdoppelte verkürzte verkürzung
`);

const NUMBER_WORDS = wordSet(`
  zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn zwanzig
  dreißig vierzig fünfzig sechzig hundert hunderte tausend tausende million millionen milliarde
  milliarden doppelt verdoppelt dreifach verdreifacht hälfte halbiert dutzend dutzende prozent
`);

export const de: LintLanguage = {
  lang: "de",
  openerSkips: wordSet("ich wir"),
  elisions: false,
  abbreviations: wordSet("etc usw bzw ca ggf inkl evtl nr"),
  stock: indexPhrases(STOCK_PHRASES),
  duty: indexPhrases(DUTY_STARTS),
  weakStart: indexPhrases(WEAK_STARTS),
  firstPerson: {
    words: wordSet(`ich mich mir mein meine meinen meinem meiner meines wir uns unser unsere
      unseren unserem unserer unseres`),
    team: wordSet("wir uns unser unsere unseren unserem unserer unseres"),
  },
  result: {
    words: RESULT_WORDS,
    phrases: RESULT_PHRASES,
    suffixes: RESULT_SUFFIXES,
    openers: RESULT_OPENERS,
  },
  method: {
    words: wordSet("anhand dank durch mit mithilfe mittels nach per über"),
    phrases: indexPhrases(["auf basis", "mit hilfe"]),
    gerund: null,
    lead: null,
  },
  numberWords: NUMBER_WORDS,
  vague: vagueOf(
    {
      count: [
        "diverse",
        "diversen",
        "eine reihe von",
        "eine vielzahl von",
        "mehrere",
        "mehreren",
        "unzählige",
        "verschiedene",
        "verschiedenen",
        "viele",
        "vielen",
        "zahlreiche",
        "zahlreichen",
      ],
      list: ["etc", "und so weiter", "unter anderem", "usw"],
      thing: ["dinge", "sachen"],
    },
    ["etc", "usw"],
  ),
};
