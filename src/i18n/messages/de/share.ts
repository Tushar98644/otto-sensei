import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: {
    shared: "Geteilter Lebenslauf",
    title: "{name} - Lebenslauf",
    untitled: "Lebenslauf",
    description: "Ein Lebenslauf, geteilt über {brand}.",
    notFound: "Link nicht gefunden",
  },
  updated: "Lebenslauf · Aktualisiert am {date}",
  madeWith: "Erstellt mit",
  unavailable: {
    thinking: "Otto der Otter, nachdenklich",
    worried: "Otto der Otter, besorgt",
    busyTitle: "Zu viele Seiten auf einmal geöffnet",
    missingTitle: "Dieser Link funktioniert nicht",
    busy: {
      one: "Aus deinem Netzwerk wurden gerade viele Lebensläufe geöffnet. Versuch es in {count} Minute noch einmal.",
      other:
        "Aus deinem Netzwerk wurden gerade viele Lebensläufe geöffnet. Versuch es in {count} Minuten noch einmal.",
    },
    missing:
      "Die Person, die ihn geteilt hat, hat ihn vielleicht ausgeschaltet. Bitte sie um einen neuen Link.",
    checkOwn: "Deinen eigenen Lebenslauf prüfen",
  },
  download: {
    failed: "Das hat nicht geklappt. Versuch es noch einmal.",
    tryAgain: "Erneut versuchen",
    pdf: "PDF herunterladen",
  },
  owner: {
    label: "Dein Link",
    onlyYou: "Nur du siehst diese Leiste",
    settings: "Link-Einstellungen",
    edit: "Bearbeiten",
    saveFailed: "Konnte nicht gespeichert werden",
    checkConnection: "Prüf deine Verbindung und versuch es noch einmal.",
  },
  options: {
    legend: "Was die Seite zeigt",
    contact: "E-Mail und Telefon zeigen",
    contactHint:
      "Aus: Die Seite und ihr PDF lassen sie weg. Dein Name, deine Stadt und deine Links sind immer sichtbar.",
    indexing: "Von Suchmaschinen listen lassen",
    indexingHint: "Aus: Google und andere werden gebeten, sie nicht in Suchergebnissen zu zeigen.",
  },
  facts: {
    none: "Noch keine Aufrufe",
    views: { one: "{count} Aufruf", other: "{count} Aufrufe" },
    lastOpened: "Zuletzt geöffnet {when}",
    shared: "Geteilt {when}",
    justNow: "gerade eben",
  },
} satisfies Translation<Messages["share"]>;
