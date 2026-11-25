import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  tip: {
    position: "{position} von {total}",
    skip: "Tipps überspringen",
    back: "Zurück",
    next: "Weiter",
    done: "Verstanden",
  },
  studio: {
    "read-text": {
      title: "Was das Bewerbermanagementsystem liest",
      body: "So liest ein Bewerbermanagementsystem deine Datei. Was hier fehlt, fehlt auch Recruitern.",
    },
    "fix-with-otto": {
      title: "Korrigiere eine Zeile mit Otto",
      body: "Markierungen zeigen Zeilen, die Arbeit brauchen. Ich frage nach Fakten und schreibe neu. Zahlen erfinde ich nie.",
    },
    tailor: {
      title: "An einen Job anpassen",
      body: "Füg einen Link zur Anzeige ein. Ich zeige, was sie verlangt, und helfe dir zu ergänzen, was du wirklich hast.",
    },
    download: {
      title: "Kostenlos herunterladen",
      body: "Dein PDF ist kostenlos, immer. Danach prüfe ich es noch einmal und zeige, was sich geändert hat.",
    },
  },
  dashboard: {
    setup: {
      title: "Als Nächstes",
      none: "Was als Nächstes ansteht, das Wichtigste zuerst. Jede Zeile verschwindet, sobald sie erledigt ist.",
      steps: {
        one: "Was als Nächstes ansteht, das Wichtigste zuerst. Dein {count} Einrichtungsschritt hakt sich selbst ab.",
        other:
          "Was als Nächstes ansteht, das Wichtigste zuerst. Deine {count} Einrichtungsschritte haken sich selbst ab.",
      },
    },
    actions: {
      title: "Hier anfangen",
      body: "Prüf eine Datei, pass einen Lebenslauf an einen Job an oder probier eine neue Vorlage.",
    },
    library: {
      title: "Deine Lebensläufe",
      body: "Hier liegen alle Lebensläufe und angepassten Kopien. Such nach Name oder Firma.",
    },
    jobs: {
      title: "Jobs für dich",
      body: "Offene Stellen von Karriereseiten, sortiert danach, wie gut jede zu deinem Lebenslauf passt.",
    },
    applications: {
      title: "Bewerbungen",
      body: "Trag jede Stelle, auf die du dich bewirbst, auf einem Board ein. Anschreiben und Vorbereitung bleiben verknüpft.",
    },
    interview: {
      title: "Interviewvorbereitung",
      body: "Für jedes Interview: wahrscheinliche Fragen, Geschichten aus deinen eigenen Zeilen und Fragen, die du stellen kannst.",
    },
    portfolio: {
      title: "Portfolio",
      body: "Mach aus deinem Lebenslauf eine Portfolio-Website, für dich gehostet unter deinem eigenen Link.",
    },
    "win-rate": {
      title: "Was funktioniert",
      body: "Trag die Jobs ein, auf die du dich bewirbst. Ich zeige dir, welcher Lebenslauf dir Interviews bringt.",
    },
  },
} satisfies Translation<Messages["onboarding"]>;
