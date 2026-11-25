import type { Messages } from "..";
import type { Translation } from "../../types";

// The job match page around the tool, in German; the tool's own words are in match-check.ts.
export default {
  meta: {
    title: "Kostenloser Abgleich von Lebenslauf und Stellenanzeige",
    description:
      "Füge deinen Lebenslauf und eine Stellenanzeige oder ihren Link ein und sieh, welche Fähigkeiten und Tools die Anzeige nennt, welche dein Lebenslauf zeigt und welche fehlen. Kostenlos, ohne Anmeldung.",
  },
  toolName: "Job-Abgleich von {brand}",
  eyebrow: "Kostenlos, ohne Anmeldung",
  title: "Passt dein Lebenslauf",
  titleEm: "zu diesem Job?",
  intro:
    "Sieh, welche Fähigkeiten die Anzeige nennt, wo dein Lebenslauf jede davon zeigt und was fehlt. Zahlen, keine erfundene Punktzahl.",
  faqTitle: "Was die Prüfung macht",
  faq: {
    looksFor: {
      question: "Wonach sucht die Prüfung?",
      answer:
        "Nach den Fähigkeiten, Tools, Lizenzen und Sprachen, die die Anzeige nennt, aus rund {known}, die Otto kennt, etwa Python, Figma, Salesforce, BLS oder fließendes Spanisch. Er sucht jede davon in deinem Lebenslauf und zeigt dir die Zeile, in der sie steht.",
    },
    mustHaves: {
      question: "Wie unterscheidet sie Muss- von Kann-Kriterien?",
      answer:
        "Anhand der Überschriften und Wörter in der Anzeige selbst. Eine Fähigkeit unter „Requirements“ oder „What you'll need“ oder neben „required“ oder „must“ ist ein Muss-Kriterium. Eine unter „Nice to have“ oder neben „a plus“ oder „preferred“ ist ein Kann-Kriterium. Wenn eine Anzeige es nicht sagt, rät Otto nicht.",
    },
    noScore: {
      question: "Warum gibt es keine Punktzahl für die Passung?",
      answer:
        "Ein Prozentwert würde mehr behaupten, als eine Wortprüfung weiß. Bewerbermanagementsysteme und Recruiter gewichten jeweils auf ihre eigene Art, deshalb zeigt dir Otto die Zahlen und die Zeilen und überlässt die Bewertung dir.",
    },
    meaning: {
      question: "Was prüft sie nicht?",
      answer:
        "Bedeutung. Sie gleicht die Wörter der Anzeige ab, also zählt „ein Team von fünf Leuten geführt“ nicht als „Führung“. Sie kann auch Berufsjahre, Abschlüsse oder die Qualität deiner Arbeit nicht beurteilen, deshalb zitiert sie diese Anforderungen aus der Anzeige, damit du sie selbst prüfst. Echte Recruiter achten auf all das.",
    },
    listed: {
      question: "Was bedeutet „Gelistet, nicht belegt“?",
      answer:
        "Die Fähigkeit steht in einer Liste, etwa in deinem Fähigkeiten-Abschnitt oder deinem Kurzprofil, aber keine Zeile über deine Arbeit sagt, wo du sie eingesetzt hast. Darauf achten Recruiter, deshalb sagt „Abrechnungsservice in Go neu gebaut“ mehr als „Go“ in einer Liste.",
    },
    stored: {
      question: "Wird mein Lebenslauf gespeichert?",
      answer:
        "Nein. Eingefügter Text wird in deinem Browser geprüft und verlässt ihn nie. Eine hochgeladene Datei geht an unseren Server, damit ihr Text gelesen werden kann, so wie Bewerbermanagementsysteme sie lesen, und wird dann verworfen. Ein Job-Link geht ebenfalls an unseren Server, der die Anzeige öffnet und ihren Text zurückschickt. Du brauchst kein Konto.",
    },
    tailoring: {
      question: "Was ist der Unterschied zum Anpassen?",
      answer:
        "Diese Prüfung zeigt, was schon da ist. Das Anpassen bei Pro geht weiter: Otto liest die Anzeige auf ihre Bedeutung hin, stellt deine besten Zeilen für den Job nach vorn, schreibt eine Zusammenfassung dafür und hilft dir, Zeilen für das Fehlende zu ergänzen, aus Fakten, die du ihm gibst, in einer angepassten Kopie. Sieh dir an, <link>was Pro bietet</link>.",
    },
  },
  closing: {
    otto: "Otto, der Otter, liest einen Lebenslauf",
    title: "Sieh, was die Software sieht.",
    cta: "Lebenslauf prüfen",
    note: "Prüfen und PDFs sind kostenlos. Pro und Max bringen mehr Hilfe von Otto.",
  },
} satisfies Translation<Messages["jobMatch"]>;
