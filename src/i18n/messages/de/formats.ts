import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume formats, in German.
export default {
  lead: {
    looks: "Ein Lebenslauf, {count} Looks.",
    free: "{looks} {names} sind kostenlos. Die anderen {proCount} gibt es mit {pro}, und du kannst sie vorher an deinem Lebenslauf ausprobieren.",
    paid: "{looks} Wechsle, wann du willst: Deine Texte bleiben gleich.",
    and: "{first} und {last}",
  },
  gallery: {
    appliesTo:
      "Ein Format zu wählen, wendet es auf <b>{name}</b> an und öffnet den Download-Schritt.",
    noResume:
      "Noch kein Lebenslauf. Wähl ein Format, dann füg deinen Lebenslauf hinzu oder probier es mit einem Beispiel.",
    applyTo: "Anwenden auf",
    appliesHint:
      "Ein Format zu wählen, wendet es auf diesen Lebenslauf an und öffnet den Download-Schritt.",
    download: "Herunterladen",
    use: "Dieses Format nutzen",
    inUse: "Aktiv",
    preview: "Vorschau",
    close: "Schließen",
    alt: "Seite 1 eines Beispiel-Lebenslaufs im Format {name}",
  },
  chosen: {
    comesOut: "Dein Lebenslauf kommt im Format {name}.",
    setTo: "Dein Lebenslauf wird auf {name} gesetzt.",
    change: "Du kannst es im Download-Schritt ändern.",
    proOnly:
      "{name} ist ein {pro}-Format, darum kommt dein Download mit {free} im Format {fallback}.",
    sample: "Mit Beispiel ausprobieren",
  },
  templates: {
    classic: {
      description:
        "Das Layout, das Karrierezentren von Unis empfehlen: schlichte Schrift, zentrierte Überschriften ohne Linien und der Arbeitgeber über deinem Titel bei jedem Job.",
      bestFor: "Jeder Job, überall. Die sichere Wahl, wenn du unsicher bist.",
    },
    modern: {
      description:
        "Ein großer zweifarbiger Name, Überschriften, die farbig beginnen, mit einer Linie bis zum Rand, und Jobtitel in Kapitälchen.",
      bestFor: "Tech, Start-ups und designaffine Teams.",
    },
    compact: {
      description:
        "Das einseitige Format, das Business Schools an Banken schicken: Times-artige Schrift, Überschriften in Großbuchstaben unter dünnen Linien, eckige Aufzählungspunkte und nur Jahre.",
      bestFor: "Finanzen, Beratung und lange Karrieren, die auf eine Seite müssen.",
    },
    executive: {
      description:
        "Palatino-artige Serifenschrift, dein Name farbig neben deiner Headline, farbige Überschriften über hellen Linien und viel Luft.",
      bestFor: "Senior-Rollen, Finanzen, Recht und Beratung.",
    },
    developer: {
      description:
        "Die Vorlage, die Entwickler teilen: Buch-Serifenschrift, Überschriften in Kapitälchen über durchgehenden Linien, fette Titel über kursiven Firmenzeilen. Skills und Projekte zuerst.",
      bestFor: "Softwareentwickler und andere technische Rollen.",
    },
    minimal: {
      description:
        "Nur Schwarz: Charter-artige Serifenschrift, ein großer schlichter Name, fette Überschriften über dünnen Linien und jeder Job in einer Zeile.",
      bestFor: "Entwickler und alle, die eine ruhige, schlichte Seite wollen.",
    },
  },
} satisfies Translation<Messages["formats"]>;
