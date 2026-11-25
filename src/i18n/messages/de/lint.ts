import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  quote: "„{text}“",
  issues: {
    stock: {
      one: "{phrases} ist eine Floskel, die Recruiter überlesen. Zeig lieber das Ergebnis.",
      other: "{phrases} sind Floskeln, die Recruiter überlesen. Zeig lieber das Ergebnis.",
    },
    weakStart:
      "Ersetze {phrase} durch das, was du getan hast, etwa „Aufgebaut“, „Gesenkt“ oder „Geleitet“.",
    duty: "{phrase} klingt nach Stellenbeschreibung. Sag, was du getan hast und was sich geändert hat.",
    tense: "Diese Stelle ist beendet, also schreib {past}, nicht {phrase}.",
    noResult: "Was hat sich dadurch geändert? Nenne das Ergebnis und, wenn du es weißt, wie viel.",
    noNumber: "Wie viele, wie viel oder wie schnell? Nenne eine Zahl, wenn du sie kennst.",
    noNumberWord: "{word} um wie viel, oder für wie viele? Nenne eine Zahl, wenn du sie kennst.",
    noMethod: "Sag, wie du es geschafft hast: Was hast du gebaut, geändert oder eingeführt?",
    firstPersonTeam: "{word} versteckt deinen Anteil. Sag, was du getan hast.",
    firstPersonSelf: "Streich {word}. In Lebenslauf-Zeilen stehen kein „ich“, „mein“ oder „wir“.",
    passive: "{phrase} versteckt, wer es getan hat. Sag lieber, was du getan hast.",
    vagueList: "{phrase} ist vage. Nenne, was zählt, oder streich es.",
    vagueThing: "{phrase} ist vage. Sag genau, was.",
    vagueCount: "{phrase} ist vage. Nenne die echte Zahl.",
    tooLongWords:
      "Diese Zeile hat {count} Wörter. Kürze sie auf zwei Zeilen, damit man sie schnell überfliegen kann.",
    tooLongChars:
      "Diese Zeile hat {count} Zeichen. Kürze sie auf zwei Zeilen, damit man sie schnell überfliegen kann.",
    tooShort:
      "Diese Zeile ist zu kurz, um viel zu zeigen. Ergänze, was du getan hast und was sich geändert hat.",
    duplicate: "Diese Zeile wiederholt eine andere. Behalte eine oder lass jede etwas Neues sagen.",
    stopMost: "Die meisten Zeilen hier enden mit einem Punkt. Setz hier auch einen.",
    stopFirst: "Deine erste Zeile hier endet mit einem Punkt. Setz hier auch einen.",
    noneMost: "Die meisten Zeilen hier enden ohne Punkt. Nimm diesen hier weg.",
    noneFirst: "Deine erste Zeile hier endet ohne Punkt. Nimm diesen hier weg.",
  },
  help: {
    duty: {
      why: "Recruiter suchen, was du getan hast und was sich geändert hat, nicht die Stellenbeschreibung.",
      before: "Verantwortlich für die Wartung der Datenbank",
      after: "Datenbank durch automatische Backups auf 99,9 % Verfügbarkeit gehalten",
    },
    "no-result": {
      why: "Eine Zeile, die mit einem Ergebnis endet, zeigt, warum deine Arbeit zählte.",
      before: "Entwicklung von REST-APIs in Node.js",
      after: "REST-APIs in Node.js gebaut, die die Ladezeit von 3 s auf 0,8 s senkten",
    },
    "no-number": {
      why: "Eine Zahl zeigt die Größe des Ergebnisses: wie viele, wie viel oder wie schnell.",
      before: "Checkout-Prozess verbessert",
      after: "Checkout-Prozess verbessert und abgeschlossene Bestellungen um 12 % gesteigert",
    },
    "no-method": {
      why: "Wenn du sagst, wie du das Ergebnis erreicht hast, wird es glaubwürdig.",
      before: "Cloud-Kosten um 30 % gesenkt",
      after: "Cloud-Kosten durch den Umzug von Batch-Jobs auf günstigere Server um 30 % gesenkt",
    },
    "weak-start": {
      why: "Das erste Wort wird zuerst gelesen. Ein starkes Verb zeigt, dass du die Arbeit gemacht hast.",
      before: "Mithilfe bei der Migration des Patientenportals auf React",
      after: "Patientenportal für 40.000 Patienten auf React migriert",
    },
    "first-person": {
      why: "Lebenslauf-Zeilen kommen ohne „ich“ und „wir“ aus. Es ist dein Lebenslauf, also ist klar, wer es getan hat.",
      before: "Ich habe das Abrechnungssystem gebaut",
      after: "Abrechnungssystem gebaut, das 40 Kunden nutzen",
    },
    tense: {
      why: "Stellen, die du verlassen hast, stehen in der Vergangenheit.",
      before: "Baue interne Tools für das Support-Team",
      after: "Interne Tools gebaut, die dem Support 5 Stunden pro Woche sparten",
    },
    "too-long": {
      why: "Lange Zeilen werden überflogen. Ein bis zwei Zeilen pro Punkt lesen sich leichter.",
      after: "Deploy-Zeit durch einen gemeinsamen Build-Cache um 40 % gesenkt",
    },
    "too-short": {
      why: "Mit ein paar Wörtern lässt sich nicht zeigen, was du getan hast und was sich geändert hat.",
      before: "Bugs behoben",
      after: "120 Checkout-Bugs behoben und fehlgeschlagene Zahlungen um 18 % gesenkt",
    },
    passive: {
      why: "Wenn du sagst, was du getan hast, wird dein Anteil klar.",
      before: "Die Datenbank wurde auf PostgreSQL migriert",
      after: "Datenbank in 3 Wochen auf PostgreSQL migriert",
    },
    vague: {
      why: "Wörter wie „verschiedene“ oder „mehrere“ stehen für eine echte Zahl oder einen echten Namen.",
      before: "Verschiedene Webinare durchgeführt",
      after: "14 Partner-Webinare durchgeführt, die 2.300 Anmeldungen brachten",
    },
    "stock-phrase": {
      why: "Floskeln, die in jedem Lebenslauf stehen, werden überlesen. Ein Ergebnis sagt es besser.",
      before: "Teamfähig und ergebnisorientiert",
      after: "Team von 4 Personen geleitet, das die Mobile-App 2 Wochen früher veröffentlichte",
    },
    duplicate: {
      why: "Eine wiederholte Zeile nimmt Platz weg, den ein anderes Ergebnis nutzen könnte.",
    },
    punctuation: { why: "Zeilen, die gleich enden, wirken ordentlich und sorgfältig." },
  },
  checks: {
    result: "Sagt, was sich geändert hat",
    start: "Starker Anfang",
    voice: "Kein ich oder wir",
    stock: "Keine Floskeln",
    length: "Richtige Länge",
    numbers: "Hat Zahlen",
    method: "Sagt, wie",
    tense: "Vergangenheit",
    passive: "Sagt, wer es tat",
    vague: "Keine vagen Wörter",
    repeat: "Keine Wiederholungen",
    stops: "Einheitliche Punkte",
  },
  review: {
    groups: {
      duty: {
        title: {
          one: "{count} Zeile klingt nach Stellenbeschreibung",
          other: "{count} Zeilen klingen nach Stellenbeschreibung",
        },
        reason:
          "Recruiter suchen, was du getan hast und was sich geändert hat, nicht die Aufgabe selbst.",
      },
      "no-result": {
        title: {
          one: "{count} Zeile sagt nicht, was sich geändert hat",
          other: "{count} Zeilen sagen nicht, was sich geändert hat",
        },
        reason:
          "Jede Zeile sollte mit einem Ergebnis enden: was besser wurde, für wen und, wenn du es weißt, um wie viel.",
      },
      "weak-start": {
        title: { one: "{count} Zeile beginnt schwach", other: "{count} Zeilen beginnen schwach" },
        reason:
          "Beginne mit dem, was du getan hast, etwa Aufgebaut, Gesenkt, Geleitet oder Verfasst.",
      },
      "first-person": {
        title: {
          one: "{count} Zeile verwendet ich oder wir",
          other: "{count} Zeilen verwenden ich oder wir",
        },
        reason: "Lebenslauf-Zeilen kommen ohne ich, mein und wir aus.",
      },
      "stock-phrase": {
        title: {
          one: "{count} Zeile verwendet Floskeln",
          other: "{count} Zeilen verwenden Floskeln",
        },
        reason:
          "Floskeln, die in jedem Lebenslauf stehen, werden überlesen. Zeig lieber das Ergebnis.",
      },
      "too-long": {
        title: {
          one: "{count} Zeile ist länger als zwei Zeilen",
          other: "{count} Zeilen sind länger als zwei Zeilen",
        },
        reason: "Lange Zeilen werden übersprungen. Halte jede bei ein bis zwei Zeilen.",
      },
      tense: {
        title: {
          one: "{count} Zeile in früheren Stellen steht im Präsens",
          other: "{count} Zeilen in früheren Stellen stehen im Präsens",
        },
        reason: "Stellen, die du verlassen hast, stehen in der Vergangenheit: Gebaut, nicht Baue.",
      },
      passive: {
        title: {
          one: "{count} Zeile versteckt, wer die Arbeit gemacht hat",
          other: "{count} Zeilen verstecken, wer die Arbeit gemacht hat",
        },
        reason: "Sag, was du getan hast, nicht was getan wurde.",
      },
      vague: {
        title: {
          one: "{count} Zeile verwendet vage Wörter",
          other: "{count} Zeilen verwenden vage Wörter",
        },
        reason:
          "Wörter wie verschiedene oder mehrere stehen für eine echte Zahl oder einen echten Namen.",
      },
      duplicate: {
        title: {
          one: "{count} Zeile wiederholt eine andere",
          other: "{count} Zeilen wiederholen eine andere",
        },
        reason: "Behalte eine oder lass jede etwas Neues sagen.",
      },
      "too-short": {
        title: { one: "{count} Zeile ist zu kurz", other: "{count} Zeilen sind zu kurz" },
        reason:
          "Mit ein paar Wörtern lässt sich nicht zeigen, was du getan hast und was sich geändert hat.",
      },
      "no-method": {
        title: {
          one: "{count} Ergebnis sagt nicht, wie",
          other: "{count} Ergebnisse sagen nicht, wie",
        },
        reason: "Ein Ergebnis überzeugt mehr, wenn du sagst, wie du es erreicht hast.",
      },
      "no-number": {
        title: {
          one: "{count} Zeile könnte eine Zahl vertragen",
          other: "{count} Zeilen könnten eine Zahl vertragen",
        },
        reason: "Wenn du sie kennst, zeigt eine Zahl die Größe: wie viele, wie viel, wie schnell.",
      },
      punctuation: {
        title: {
          one: "Die Punkte passen in {count} Zeile nicht zusammen",
          other: "Die Punkte passen in {count} Zeilen nicht zusammen",
        },
        reason:
          "Zeilen unter einer Stelle oder einem Projekt wirken ordentlicher, wenn alle gleich enden: mit Punkt oder ohne.",
      },
    },
    summary: {
      place: "Profil",
      both: "Dein Profil enthält Floskeln und ich",
      firstPerson: "Dein Profil verwendet ich oder wir",
      stock: "Dein Profil enthält Floskeln",
      reason:
        "Der Anfang der Seite wird zuerst gelesen, also sollte er wie deine Zeilen klingen: Fakten, kein ich.",
    },
    firstLook: {
      title: {
        one: "Bei {count} Stelle fehlen Jobtitel, Firma oder Daten",
        other: "Bei {count} Stellen fehlen Jobtitel, Firma oder Daten",
      },
      reason: "Der erste Blick eines Recruiters geht auf deine Jobtitel, Firmen und Daten.",
      missing: "Ohne {parts}.",
      parts: { title: "Jobtitel", company: "Firma", dates: "Daten" },
      at: "{title} bei {company}",
      aJob: "Eine Stelle",
    },
    headline: {
      title: "Kein Jobtitel unter deinem Namen",
      reason:
        "Schreib die Stelle, die du suchst, nach oben, damit man weiß, als was du dich bewirbst.",
    },
    skills: {
      title: {
        one: "{count} Fähigkeit steht nur in deiner Liste der Kenntnisse",
        other: "{count} Fähigkeiten stehen nur in deiner Liste der Kenntnisse",
      },
      reason: {
        one: "{skills}: Keine Zeile zu einer Stelle oder einem Projekt zeigt, dass du sie genutzt hast. Recruiter und Filter vertrauen einer Fähigkeit mehr, wenn sie in einer Zeile über deine Arbeit steht.",
        other:
          "{skills}: Keine Zeile zu einer Stelle oder einem Projekt zeigt, dass du sie genutzt hast. Recruiter und Filter vertrauen Fähigkeiten mehr, wenn sie in einer Zeile über deine Arbeit stehen.",
      },
      more: "{names} und {count} weitere",
    },
  },
} satisfies Translation<Messages["lint"]>;
