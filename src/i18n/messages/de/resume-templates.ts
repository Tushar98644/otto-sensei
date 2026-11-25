import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume templates page, in German. Format names stay as they are (Classic, Compact).
export default {
  meta: {
    title: "ATS-Lebenslauf-Vorlagen: {count} Formate, {free} gratis",
    description:
      "{count} Lebenslauf-Vorlagen, jede einspaltig mit echtem Text und per Zurücklesen des PDFs getestet. {freeFormats} sind gratis als PDF, {proCount} weitere mit {pro}.",
  },
  crumb: "Lebenslauf-Vorlagen",
  eyebrow: "Lebenslauf-Vorlagen",
  title: "{count} Lebenslauf-Formate,",
  titleEm: "jedes einspaltig mit echtem Text.",
  intro:
    "Jedes übernimmt ein weitverbreitetes Lebenslauf-Layout, und jedes PDF wird getestet, indem es zurückgelesen wird. {freeFormats} kannst du kostenlos als PDF herunterladen; die anderen {proCount} gibt es mit {pro}, und du kannst sie vorher mit deinem Lebenslauf ausprobieren.",
  tip: "Unsicher? Classic passt zu jeder Stelle. Compact bringt eine lange Laufbahn auf eine Seite.",
  formatsTitle: "Formate",
  listName: "Lebenslauf-Formate",
  preview: "Ganze Seite im Format {name} ansehen",
  use: "Dieses Format verwenden",
  close: "Schließen",
  imageAlt: "Seite 1 eines Beispiel-Lebenslaufs im Format {name}",
  formats: {
    classic: {
      description:
        "Das Layout, das die Career Center von Hochschulen empfehlen: schlichte Schrift, zentrierte Überschriften ohne Linien und bei jedem Job der Arbeitgeber über deinem Titel.",
      bestFor: "Jeder Job, überall. Die sichere Wahl, wenn du unsicher bist.",
    },
    modern: {
      description:
        "Ein großer zweifarbiger Name, Überschriften, die farbig beginnen und mit einer Linie bis zum Rand laufen, und Jobtitel in Kapitälchen.",
      bestFor: "Tech, Start-ups und designorientierte Teams.",
    },
    compact: {
      description:
        "Das einseitige Format, das Business Schools an Banken schicken: Schrift im Stil von Times, Überschriften in Großbuchstaben unter dünnen Linien, eckige Aufzählungspunkte und nur Jahreszahlen.",
      bestFor: "Finanzen, Beratung und lange Laufbahnen, die auf eine Seite passen müssen.",
    },
    executive: {
      description:
        "Serifenschrift im Stil von Palatino, dein Name in Farbe neben deiner Berufsbezeichnung, farbige Überschriften über hellen Linien und großzügige Abstände.",
      bestFor: "Senior-Rollen, Finanzen, Recht und Beratung.",
    },
    developer: {
      description:
        "Die Vorlage, die Entwickler untereinander teilen: Buchschrift mit Serifen, Überschriften in Kapitälchen über durchgehenden Linien, fette Titel über kursiven Firmenzeilen. Fähigkeiten und Projekte zuerst.",
      bestFor: "Softwareentwickler und andere technische Rollen.",
    },
    minimal: {
      description:
        "Nur Schwarz: Serifenschrift im Stil von Charter, ein großer schlichter Name, fette Überschriften über dünnen Linien und jeder Job in einer einzigen Zeile.",
      bestFor: "Entwickler und alle, die eine ruhige, schlichte Seite wollen.",
    },
  },
  commonTitle: "Was alle Formate gemeinsam haben",
  common: {
    oneColumn: {
      title: "Eine Spalte mit echtem Text",
      text: "Der Text liest sich von oben nach unten in der richtigen Reihenfolge, jede Überschrift in einer eigenen Zeile. Jedes Format wird getestet, indem sein PDF zurückgelesen wird, auf Letter- und A4-Papier.",
    },
    unscrambled: {
      title: "Nichts, was die Wörter durcheinanderbringt",
      text: "Keine Icons, kein Blocksatz und keine weiten Buchstabenabstände, die als „P R O F I L“ zurückgelesen werden.",
    },
    sameWords: {
      title: "Gleiche Worte, jeder Look",
      text: "Wechsle das Format, wann immer du willst. Dein Lebenslauf bleibt gleich; nur die Seite drumherum ändert sich.",
    },
    pdfFree: {
      title: "PDF kostenlos, Word mit {pro}",
      text: "Lade {freeFormats} kostenlos als PDF herunter, so oft du willst. Die anderen {proCount} Formate und Word-Downloads (.docx) gibt es mit {pro}.",
    },
  },
  faq: {
    free: {
      question: "Sind diese Lebenslauf-Vorlagen kostenlos?",
      answer:
        "{freeFormats} sind kostenlos, ohne Bezahlschranke beim Download und ohne Konto. Die anderen {proCount} Formate gibt es mit {pro}. Bei {free} wird ein Lebenslauf in einem {pro}-Format im Format {fallback} heruntergeladen.",
    },
    ats: {
      question: "Können Bewerbermanagementsysteme sie lesen?",
      answer:
        "Jede ist eine einzige Spalte mit echtem Text in Lesereihenfolge, und jedes PDF wird getestet, indem es zurückgelesen wird. Jeder Arbeitgeber richtet sein Bewerbermanagementsystem anders ein, daher kann niemand versprechen, wie ein bestimmtes System deinen Lebenslauf behandelt. Die <link>ATS-Ratgeber</link> zeigen, was die gängigen Systeme bekanntermaßen tun.",
    },
    pick: {
      question: "Welche soll ich wählen?",
      answer:
        "{classic} passt zu jedem Job, überall: die sichere Wahl, wenn du unsicher bist. {compact} bringt eine lange Laufbahn auf eine Seite, und {developer} stellt Fähigkeiten und Projekte an den Anfang. Wechsle jederzeit: Deine Worte bleiben gleich.",
    },
    own: {
      question: "Kann ich meinen eigenen Lebenslauf verwenden?",
      answer:
        "Ja. Lade im Studio eine PDF- oder Word-Datei hoch oder fang neu an. „Dieses Format verwenden“ wendet das Format auf den Lebenslauf an, den du geöffnet hast. Ist keiner geöffnet, fragt das Studio nach deinem Lebenslauf, mit dem Format schon ausgewählt. Du kannst ein {pro}-Format mit {free} ausprobieren; es wird im Format {fallback} heruntergeladen, bis du {pro} hast.",
    },
  },
} satisfies Translation<Messages["resumeTemplates"]>;
