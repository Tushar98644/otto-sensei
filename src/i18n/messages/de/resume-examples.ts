import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume example pages around each example, in German.
export default {
  meta: {
    index: {
      title: "{count} Lebenslauf-Beispiele für {year}, nach Beruf",
      description:
        "{count} komplette Lebenslauf-Beispiele von Software und Datenanalyse bis Vertrieb, Marketing und Einstiegsjobs, mit stärkeren Zeilen, Fähigkeiten und Fehlern.",
    },
    long: "{headline} ({year}) mit Fähigkeiten und Tipps",
    short: "{headline} ({year})",
  },
  headline: "Lebenslauf-Beispiel: {role}",
  crumb: "Lebenslauf-Beispiele",
  index: {
    eyebrow: "Lebenslauf-Beispiele",
    title: "Lebenslauf-Beispiele",
    titleEm: "für {count} Jobs.",
    intro:
      "Vollständige Lebensläufe für die Jobs, nach denen am häufigsten gesucht wird, in Indien und im Ausland, von Softwareentwicklung bis HR und Berufseinstieg. Jeder zeigt stärkere Zeilen, die Fähigkeiten, die du nennen solltest, und die Fehler, die du vermeiden solltest.",
    listTitle: "Beispiele",
    howTitle: "So entstehen diese Beispiele",
    how: {
      madeUp: {
        title: "Erfundene Personen, echter Aufbau",
        text: "Jeder Name, jedes Unternehmen, jede Hochschule und jede Zahl ist erfunden. Übernimm den Aufbau, die Art der Zeilen und die Reihenfolge der Abschnitte, und setz dann deine eigenen Fakten ein.",
      },
      lineCheck: {
        title: "Jede Zeile besteht Ottos Zeilenprüfung",
        text: "Jede Zeile lief durch dieselbe Prüfung, die das Studio für deine Zeilen ausführt. Sie markiert Aufgabenbeschreibungen, Floskeln, vage Wörter und Zeilen ohne Ergebnis.",
      },
      skills: {
        title: "Fähigkeiten, die Otto in Stellenanzeigen erkennt",
        text: "Die Fähigkeiten auf jeder Seite sind solche, die der <link>Job-Abgleich</link> aus Stellenanzeigen herausliest. So kannst du deinen eigenen Lebenslauf auf dieselbe Weise mit einer echten Anzeige testen.",
      },
      realText: {
        title: "Echter Text in einem echten Format",
        text: "Jedes Beispiel ist in einem der {count} Formate der App als Text gesetzt, nicht als Bild. Was du siehst, ist also das, was ein Bewerbermanagementsystem lesen würde.",
      },
      start: {
        title: "Starte mit einem davon",
        text: "„Mit diesem Beispiel starten“ öffnet eine Kopie im Studio als deinen eigenen Lebenslauf. Bei {free} ist das dein einer Lebenslauf; {pro} speichert bis zu {proResumes} und {max} bis zu {maxResumes}.",
      },
    },
    ctaTitle: "Kein Beispiel für deinen Job?",
    ctaText:
      "Lade deinen Lebenslauf hoch und sieh, was Bewerbermanagementsysteme lesen, oder gleiche ihn mit einer Stellenanzeige ab. Beides ist kostenlos, ohne Karte.",
  },
  example: {
    eyebrow: "Lebenslauf-Beispiel",
    start: "Mit diesem Beispiel starten",
    startNote: "Öffnet sich im Studio als dein eigener Lebenslauf. Kostenlos, ohne Karte.",
    resumeTitle: "Der Beispiel-Lebenslauf",
    formatFree: "Im Format {name} gezeigt, kostenlos als PDF herunterladbar.",
    formatPro:
      "Im Format {name} gezeigt, das es mit {pro} gibt. Bei {free} lädst du es im Format {fallback} herunter.",
    linesTitle: "Mach aus Aufgaben Ergebnisse",
    linesIntro:
      "Drei schwache Zeilen, was Ottos Zeilenprüfung zu jeder sagt, und die Zeile aus diesem Beispiel, die das löst.",
    before: "Vorher",
    after: "Nachher",
    lineCheck: "Zeilenprüfung",
    skillsTitle: "Fähigkeiten, nach denen Recruiting-Software sucht",
    skillsIntro:
      "Die Fähigkeiten stehen hier auf Englisch, so wie Stellenanzeigen in den USA sie schreiben. Ottos <link>Job-Abgleich</link> erkennt jede davon in Stellenanzeigen. Nenne die, die du hast, und erwähne jede in einer Zeile, in der du sie eingesetzt hast: Eine Fähigkeit, die nur in deiner Fähigkeiten-Liste steht, erscheint als „Gelistet, nicht belegt“.",
    titlesLabel: "Jobtitel für die Suche",
    titles:
      "{titles}. Ottos Job-Matching behandelt sie als dieselbe Art von Job, also suche nach jedem davon.",
    tipsTitle: "Was du zeigen solltest",
    mistakesTitle: "Fehler, die du vermeiden solltest",
    otto: "Otto, der Otter, zeigt auf einen Lebenslauf",
    closingTitle: "Mach diesen Lebenslauf zu deinem.",
    closingText:
      "Er öffnet sich im Studio als dein eigener Lebenslauf. Setz deine Fakten ein, und Otto prüft jede Zeile, während du schreibst.",
    blank: "Oder <link>starte mit einer leeren Seite</link>. Kostenlos, ohne Karte.",
    moreTitle: "Weitere Lebenslauf-Beispiele",
  },
} satisfies Translation<Messages["resumeExamples"]>;
