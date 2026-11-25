import type { Messages } from "..";
import type { Translation } from "../../types";

// Share links and the invite prompt, in German.
export default {
  dialog: {
    title: "Diesen Lebenslauf teilen",
    description:
      "„{title}“ als Webseite, die jeder mit dem Link lesen kann, mit PDF-Download. Zum Öffnen ist kein Konto nötig.",
    turnOff: "Link deaktivieren",
    cancel: "Abbrechen",
    make: "Link erstellen",
    checking: "Suche nach einem Link, den du schon erstellt hast",
    checkFailed: "Deine Links konnten nicht geprüft werden",
    tryAgain: "Erneut versuchen",
    checkConnection: "Prüf deine Verbindung und versuch es dann noch mal.",
    madeCopied: "Link erstellt und kopiert. Füg ihn ein, wo du willst.",
    made: "Link erstellt. Kopier ihn und schick ihn an wen du willst.",
    updated: "Link auf diese Version aktualisiert.",
    link: "Link",
    behindTitle: "Dieser Link zeigt eine ältere Version",
    update: "Link aktualisieren",
    behind:
      "Du hast diesen Lebenslauf nach dem Teilen geändert. Beim Aktualisieren bleibt der Link gleich.",
  },
  list: {
    title: "Geteilte Links",
    intro:
      "Jeder mit einem dieser Links kann den Lebenslauf lesen. Aufrufe zählen keine Link-Vorschauen, Suchmaschinen und nicht dich, solange du angemeldet bist.",
    untitled: "Lebenslauf",
    shown: "E-Mail und Telefon sichtbar",
    hidden: "E-Mail und Telefon ausgeblendet",
    indexed: "In Suchergebnissen",
    older: "Ältere Version",
    copyFor: "Link für {name} kopieren",
    openFor: "Seite für {name} öffnen (öffnet in neuem Tab)",
    turnOffFor: "Link für {name} deaktivieren",
    turnOff: "Deaktivieren",
  },
  copy: {
    copied: "Kopiert",
    copyLink: "Link kopieren",
    linkCopied: "Link kopiert",
    cantCopy: "Kopieren fehlgeschlagen",
    selectLink: "Markier den Link und kopier ihn selbst.",
    open: "Seite öffnen",
    newTab: "(öffnet in neuem Tab)",
  },
  actions: {
    signIn: "Melde dich an, um einen Link zu deinem Lebenslauf zu teilen.",
    checkFailed:
      "Deine bisherigen Links konnten nicht geprüft werden. Prüf deine Verbindung und versuch es dann noch mal.",
    copied: "Kopiert",
    ready: "Link bereit",
    onClipboard:
      "Dein Teilen-Link ist in der Zwischenablage. Jeder mit dem Link kann diesen Lebenslauf lesen.",
    fromSettings: "Kopier ihn aus den Link-Einstellungen.",
    settings: "Einstellungen",
    makeFailed: "Link konnte nicht erstellt werden",
    turnedOff: "Link deaktiviert",
    turnedOffNote: "Wer ihn jetzt öffnet, sieht, dass er nicht mehr funktioniert.",
    turnOffFailed: "Link konnte nicht deaktiviert werden",
    undo: "Rückgängig",
    fallback: "Etwas ist schiefgelaufen. Bitte versuch es noch mal.",
  },
  invite: {
    text: "Teile deinen Link: Wenn sich jemand registriert und einen Lebenslauf prüft, bekommt ihr beide {fix} Zeilenkorrekturen mehr, dazu {tailor} angepasste Versionen mit Pro oder Max.",
    announcement:
      "Lade jemanden ein, und ihr bekommt beide Extras. Die Einladung steht direkt unter dem Download-Button.",
    label: "Jemanden einladen",
    heading: "Kennst du jemanden auf Jobsuche?",
    copied: "Kopiert",
    copy: "Einladungslink kopieren",
    announced: "Einladungslink kopiert.",
    dismiss: "Einladung schließen",
    copyFailed: "Link konnte nicht kopiert werden",
    copyFailedNote: "Dein Einladungslink steht auch auf deiner Kontoseite.",
  },
} satisfies Translation<Messages["shareLinks"]>;
