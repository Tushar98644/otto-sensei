import type { Messages } from "..";
import type { Translation } from "../../types";

// The ATS guide pages around each system's sourced notes, in German.
export default {
  topics: {
    titles: {
      file: "Wie es deine Datei liest",
      search: "Wie Recruiter darin suchen",
      screening: "Fragen, die dich aussortieren können",
      ai: "KI-Abgleich und Ranking",
      review: "Wie Menschen Bewerbende prüfen",
    },
    phrases: {
      file: "wie es deine Datei liest",
      search: "wie Recruiter darin suchen",
      screening: "Screening-Fragen",
      ai: "KI-Abgleich",
      review: "wie Menschen Bewerbende prüfen",
    },
    short: {
      file: "Lesen der Datei",
      search: "Recruiter-Suche",
      screening: "Screening-Fragen",
      ai: "KI-Abgleich",
      review: "menschliche Prüfung",
    },
  },
  meta: {
    index: {
      title: "ATS-Ratgeber: Wie ein ATS Lebensläufe liest",
      description:
        "Wie {count} ATS, von Greenhouse und Workday bis Taleo, Lebensläufe lesen, Bewerbende filtern und per KI sortieren. Jeder Hinweis verlinkt seine Quelle.",
    },
    reads: "{name}-ATS: So liest es deinen Lebenslauf",
    does: "{name}-ATS: Was es mit deiner Bewerbung macht",
  },
  headline: {
    reads: "So liest {name} deinen Lebenslauf",
    does: "Was {name} mit deiner Bewerbung macht",
  },
  description: {
    intros: {
      long: "Was das {name}-ATS mit deiner Bewerbung macht: {topics}.",
      plain: "Was {name} mit deiner Bewerbung macht: {topics}.",
      short: "Was das {name}-ATS mit deiner Bewerbung macht: {short}.",
      brief: "ATS-Ratgeber zu {name}: {short}.",
    },
    endings: {
      sourcedGeneral: "{sourced}, dazu allgemeine Tipps für jedes ATS.",
      sourcedAny: "{sourced}, dazu Tipps für jedes ATS.",
      briefGeneral: "{brief}, dazu allgemeine Tipps für jedes ATS.",
      briefAny: "{brief}, dazu Tipps für jedes ATS.",
      sourced: "{sourced}.",
      brief: "{brief}.",
    },
    sourced: {
      one: "Ein belegter Hinweis mit einem Praxistipp und der Quelle",
      other: "{count} Hinweise, jeweils mit Praxistipp und Quelle",
    },
    brief: {
      one: "Ein belegter Hinweis mit Praxistipp",
      other: "{count} belegte Hinweise mit Praxistipps",
    },
  },
  sources: {
    on: "{label}: {topics}",
    nth: "{label} ({count})",
    covers: "Thema: {topics}",
  },
  crumb: "ATS-Ratgeber",
  index: {
    eyebrow: "ATS-Ratgeber",
    title: "Wie Recruiting-Software",
    titleEm: "deinen Lebenslauf liest",
    intro:
      "Ein Bewerbermanagementsystem (ATS) ist die Software, mit der Arbeitgeber Bewerbungen sammeln und sortieren. Hier steht, was Otto über {count} davon herausgefunden hat, mit einem Link zur Seite hinter jedem Hinweis.",
    systems: "Bewerbermanagementsysteme",
    notes: "{count} Hinweise mit Quelle",
    generalTitle: "Tipps, die für die meisten gelten",
    generalIntro:
      "Diese Tipps tauchen bei den Systemen oben immer wieder auf. Jeder Ratgeber hat die Details und die Quellen zu einem System.",
  },
  guide: {
    eyebrow: "ATS-Ratgeber",
    count: {
      one: "1 belegter Hinweis, mit Link zur Seite, von der er stammt.",
      other: "{count} belegte Hinweise, jeder mit Link zur Seite, von der er stammt.",
    },
    setUp:
      "Arbeitgeber richten {name} unterschiedlich ein, daher gilt nicht jeder Hinweis für jeden Job.",
    spotTitle: "So erkennst du, ob ein Job {name} nutzt",
    noFileNotes:
      "Ottos Hinweise decken noch nicht ab, wie {name} Dateien liest, daher gibt es hier nichts Belegtes zu teilen. Die <link>allgemeinen Tipps</link> unten sind ein sicherer Anfang.",
    whatToDo: "Was du tun kannst:",
    optIn: "Nur wenn der Arbeitgeber es einschaltet",
    source: "Quelle:",
    generalTitle: "Allgemeine Tipps für jedes ATS",
    generalIntro:
      "Nicht speziell für {name}. Diese Tipps tauchen in Ottos Hinweisen zu {count} Bewerbermanagementsystemen immer wieder auf.",
    sourcesTitle: "Quellen",
    aside: "Nächste Schritte und weitere Ratgeber",
    sideTitle: "Bewirbst du dich über {name}?",
    sideText:
      "Sieh, welche Fähigkeiten aus der Stellenanzeige dein Lebenslauf zeigt. Kostenlos, ohne Anmeldung.",
    moreTitle: "Weitere ATS-Ratgeber",
    templatesLink: "Einspaltige Lebenslauf-Vorlagen mit echtem Text",
    compareLink: "Otto im Vergleich mit anderen Tools",
  },
  jobLink: {
    label: "Job-Link",
    submit: "Meinen Lebenslauf mit diesem Job abgleichen",
    empty: "Füge einen Job-Link ein, und ich sage dir, ob der Job {name} nutzt.",
    unknown:
      "An diesem Link kann ich das Bewerbermanagementsystem nicht erkennen. Die allgemeinen Tipps unten gelten trotzdem.",
    same: "Dieser Job nutzt {name}, also gelten die Hinweise auf dieser Seite für ihn.",
    other:
      "Dieser Job nutzt {other}, nicht {name}. Dafür gibt es einen eigenen Ratgeber mit den passenden Hinweisen.",
    readGuide: "Ratgeber zu {name} lesen",
  },
} satisfies Translation<Messages["ats"]>;
