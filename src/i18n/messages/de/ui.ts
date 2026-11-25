import type { Messages } from "..";
import type { Translation } from "../../types";

// Shared controls, voice typing, feedback and notifications, in German.
export default {
  close: "Schließen",
  optional: "(optional)",
  dropOne: "Leg immer nur eine Datei ab.",
  fileCheck: {
    unsupported: "Dieser Dateityp wird nicht unterstützt.",
    unsupportedKinds: "Dieser Dateityp wird nicht unterstützt. Wähl eine {kinds}-Datei.",
    kinds: "{first} oder {last}",
    empty: "Diese Datei ist leer. Wähl eine andere.",
    tooBig: "Diese Datei ist zu groß. Das Limit ist {limit}.",
  },
  voice: {
    start: "Sprechen statt tippen",
    listening: "Zuhören beenden",
    recording: "Aufnahme beenden",
    sending: "Sprache wird zu Text…",
    fullTitle: "Dieses Feld ist voll",
    full: "Ein Teil von dem, was du gesagt hast, passte nicht mehr rein. Kürz etwas, um mehr hinzuzufügen.",
    problems: {
      micBlocked: {
        title: "Otto kann dich nicht hören",
        description: "Erlaub das Mikrofon in deinem Browser, um mit Otto zu sprechen.",
      },
      noMic: {
        title: "Otto findet dein Mikrofon nicht",
        description:
          "Prüf, ob es angeschlossen ist und keine andere App es nutzt, und versuch es dann noch mal.",
      },
      noSpeech: {
        title: "Otto hat nichts gehört",
        description: "Versuch es noch mal etwas näher am Mikrofon.",
      },
      offline: {
        title: "Diktieren braucht Internet",
        description: "Prüf deine Verbindung und versuch es noch mal, oder tipp stattdessen.",
      },
      signIn: { title: "Erst anmelden", description: "Melde dich an, um mit Otto zu sprechen." },
      tooMany: {
        title: "Mach kurz Pause",
        description: "Versuch es in ein paar Minuten noch mal.",
      },
      failed: {
        title: "Konnte nicht in Text umgewandelt werden",
        description: "Versuch es noch mal, oder tipp stattdessen.",
      },
    },
  },
  feedback: {
    button: "Feedback senden",
    title: "Feedback senden",
    description:
      "Sag uns, was kaputt ist oder was helfen würde. Wir sehen auch, von welcher Seite du es geschickt hast.",
    cancel: "Abbrechen",
    send: "Senden",
    about: "Worum geht es?",
    kinds: { bug: "Problem", idea: "Idee", other: "Anderes" },
    placeholders: {
      bug: "Was hast du gemacht, und was ist passiert?",
      idea: "Was würde Otto nützlicher machen?",
      other: "Was liegt dir auf dem Herzen?",
    },
    note: "Deine Nachricht",
    tooShort: "Schreib noch ein paar Wörter.",
    sent: "Danke. Deine Nachricht wurde gesendet.",
  },
  notifications: {
    title: "Benachrichtigungen",
    unread: "Benachrichtigungen, {count} ungelesen",
    loadFailed: "Deine Benachrichtigungen konnten nicht geladen werden.",
    tryAgain: "Erneut versuchen",
    empty:
      "Noch nichts. Markier einen Job als beworben, dann erinnere ich dich hier ans Nachfassen.",
    openApplications: "Bewerbungen öffnen",
    new: "Neu: ",
    writeIt: "Für mich schreiben",
    done: "Erledigt",
    snooze: "Später",
    snoozeDays: "Um {days} Tage verschieben",
    markedDone: "Nachfassen als erledigt markiert",
    snoozed: "Verschoben bis {day}",
    reminderFailed: "Die Erinnerung konnte nicht geändert werden",
    thankYou: "Dankesnachricht schreiben",
    howItWent: "Wie es lief",
    outcomes: { next_round: "Nächste Runde", waiting: "Warte", rejected: "Abgelehnt" },
    nextRound: "Weiter in die nächste Runde mit {company}",
    nextRoundNote: "Trag den Termin auf der Karte ein, sobald du ihn kennst.",
    closed: "Nach Abgeschlossen verschoben",
    closedNote: "{company}. Zählt trotzdem in deiner Bilanz, was funktioniert.",
    waiting: "Warten auf Antwort",
    remind: "Ich erinnere dich am {day} daran, bei {company} nachzufassen.",
    saveFailed: "Konnte nicht gespeichert werden",
  },
} satisfies Translation<Messages["ui"]>;
