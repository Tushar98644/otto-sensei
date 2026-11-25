import type { Messages } from "..";
import type { Translation } from "../../types";

// The private calendar feed card, in German.
export default {
  title: "Jedes Interview in deinem Kalender",
  intro:
    "Einmal abonnieren. Die Interviews, die du einträgst, zu ihren Zeiten, und deine Nachfass-Tage erscheinen von selbst, jeweils mit Link zur Vorbereitung.",
  google: "In Google Kalender abonnieren",
  googleNewTab: "(öffnet Google Kalender in neuem Tab)",
  apple: "Apple / Outlook",
  copy: "Link kopieren",
  copied: "Kopiert",
  paste: "Füg den Kalenderlink in deine Kalender-App ein.",
  cantCopy: "Kopieren fehlgeschlagen",
  selectText: "Markier den Text im Feld und kopier ihn von dort.",
  note: "Google aktualisiert abonnierte Kalender nur alle paar Stunden. Für eine Änderung am selben Tag nutze daher auch „Zum Kalender hinzufügen“ beim Interview. Der Link ist privat: Jeder, der ihn hat, sieht deine Interviews.",
  noteRenewable:
    "Google aktualisiert abonnierte Kalender nur alle paar Stunden. Für eine Änderung am selben Tag nutze daher auch „Zum Kalender hinzufügen“ beim Interview. Der Link ist privat: Jeder, der ihn hat, sieht deine Interviews. Erstell also einen neuen, falls er in Umlauf gerät.",
  renew: "Neuen Link erstellen",
  renewHint: "Kalender mit dem alten Link werden nicht mehr aktualisiert.",
  cancel: "Abbrechen",
  renewed: "Neuer Kalenderlink bereit",
  renewedNote:
    "Kalender mit dem alten Link werden nicht mehr aktualisiert. Abonnier ihn mit diesem neu.",
  renewFailed: "Neuer Link konnte nicht erstellt werden",
  loadFailed: "Dein Kalenderlink wurde nicht geladen",
  tryAgain: "Erneut versuchen",
  loading: "Dein Kalenderlink wird geladen",
} satisfies Translation<Messages["calendar"]>;
