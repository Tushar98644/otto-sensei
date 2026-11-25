import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  results: {
    textReadable: {
      title: "Text ist lesbar",
      detail: "Ein Bewerbermanagementsystem kann den Text aus dieser Datei auslesen.",
    },
    textMissing: {
      title: "Kein lesbarer Text",
      detail:
        "Ein Bewerbermanagementsystem kann in dieser Datei keinen Text lesen. Wahrscheinlich ist es ein Scan oder ein Bild.",
    },
    emailNotChecked: {
      title: "E-Mail nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir nicht nach einer E-Mail-Adresse suchen.",
    },
    emailFound: {
      title: "E-Mail-Adresse gefunden",
      detail: "Wir haben {email} gefunden, Recruiter können dich also erreichen.",
    },
    emailMissing: {
      title: "Keine E-Mail-Adresse",
      detail:
        "Wir haben im Haupttext keine E-Mail-Adresse gefunden. Ohne sie können Recruiter dich nicht erreichen.",
    },
    phoneNotChecked: {
      title: "Telefon nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir nicht nach einer Telefonnummer suchen.",
    },
    phoneFound: { title: "Telefonnummer gefunden", detail: "Wir haben {phone} gefunden." },
    phoneMissing: {
      title: "Keine Telefonnummer",
      detail:
        "Wir haben keine Telefonnummer gefunden. Viele Recruiter rufen an oder schreiben, bevor sie eine E-Mail senden.",
    },
    headerPdf: {
      title: "Nichts in Kopfzeilen versteckt",
      detail:
        "In einem PDF gehört die Kopfzeile zur Seite, also liest das Bewerbermanagementsystem sie mit.",
    },
    headerClear: {
      title: "Nichts in Kopfzeilen versteckt",
      detail: "Keine deiner Kontaktdaten steckt in einer Kopf- oder Fußzeile.",
    },
    headerEmail: {
      title: "Kontaktdaten in der Kopfzeile",
      detail:
        "Deine E-Mail steht nur in der Kopf- oder Fußzeile. Viele Systeme überspringen die, also sehen sie sie nie.",
    },
    headerPhone: {
      title: "Kontaktdaten in der Kopfzeile",
      detail:
        "Deine Telefonnummer steht nur in der Kopf- oder Fußzeile. Viele Systeme überspringen die, also sehen sie sie nie.",
    },
    headerBoth: {
      title: "Kontaktdaten in der Kopfzeile",
      detail:
        "Deine E-Mail und Telefonnummer stehen nur in der Kopf- oder Fußzeile. Viele Systeme überspringen die, also sehen sie sie nie.",
    },
    sectionsNotChecked: {
      title: "Abschnitte nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir deine Abschnittsüberschriften nicht prüfen.",
    },
    sectionsProjectsOnly: {
      title: "Kein Abschnitt zur Berufserfahrung",
      detail:
        "Wir haben Projekte gefunden, aber keine Überschrift Berufserfahrung. Am Anfang ist das okay, aber Jobs gehören unter Berufserfahrung.",
    },
    sectionsNoWork: {
      title: "Kein Abschnitt zur Berufserfahrung",
      detail:
        "Wir haben keine Überschrift wie „Berufserfahrung“ oder „Werdegang“ gefunden. Ohne sie können viele Systeme deine Jobs nicht auseinanderhalten.",
    },
    sectionsNoSkillsOrEducation: {
      title: "Kein Abschnitt Kenntnisse oder Ausbildung",
      detail:
        "Wir haben keine Überschriften Kenntnisse oder Ausbildung gefunden. Viele Systeme nutzen beide, um dich mit Jobs abzugleichen.",
    },
    sectionsNoSkills: {
      title: "Kein Abschnitt Kenntnisse",
      detail:
        "Wir haben keine Überschrift Kenntnisse gefunden. Viele Systeme nutzen sie, um dich mit Jobs abzugleichen.",
    },
    sectionsNoEducation: {
      title: "Kein Abschnitt Ausbildung",
      detail:
        "Wir haben keine Überschrift Ausbildung gefunden. Viele Systeme erwarten eine, auch eine kurze.",
    },
    sectionsFound: { title: "Klare Abschnittsüberschriften", detail: "Wir haben {sections} gefunden." },
    layoutNotChecked: {
      title: "Layout nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir das Layout nicht prüfen.",
    },
    singleColumn: {
      title: "Eine Spalte",
      detail: "Dein Text liest sich von oben nach unten in einer Spalte.",
    },
    columnsPdf: {
      title: "Zweispaltiges Layout",
      detail:
        "Deine Seite hat Spalten nebeneinander. Manche Systeme lesen quer durch und vermischen sie.",
    },
    columnsDocument: {
      title: "Zweispaltiges Layout",
      detail:
        "Dein Dokument ist in Spalten aufgebaut. Manche Systeme lesen quer durch und vermischen sie.",
    },
    tablesPdf: {
      title: "Keine Probleme mit Tabellen",
      detail:
        "Tabellen bringen Bewerbermanagementsysteme nur in Word-Dateien durcheinander. Im PDF sind sie normaler Text, und die Layout-Prüfung deckt sie ab.",
    },
    tablesNone: {
      title: "Keine Tabellen",
      detail: "Dein Text steht nicht in Tabellen, die manche Systeme falsch lesen.",
    },
    tablesFound: {
      title: "Tabellen gefunden",
      detail: {
        one: "Deine Datei hat {count} Tabelle. Manche Systeme lesen Tabellenzellen in falscher Reihenfolge oder überspringen sie.",
        other:
          "Deine Datei hat {count} Tabellen. Manche Systeme lesen Tabellenzellen in falscher Reihenfolge oder überspringen sie.",
      },
    },
    textBoxesPdf: {
      title: "Keine Probleme mit Textfeldern",
      detail:
        "In einem PDF werden Textfelder zu normalem Text, den ein Bewerbermanagementsystem lesen kann.",
    },
    textBoxesNone: { title: "Keine Textfelder", detail: "Dein ganzer Text steht auf der Hauptseite." },
    textBoxesFound: {
      title: "Textfelder gefunden",
      detail: {
        one: "Deine Datei hat {count} Textfeld. Viele Systeme überspringen Textfelder komplett, dieser Text wird also vielleicht nie gelesen.",
        other:
          "Deine Datei hat {count} Textfelder. Viele Systeme überspringen Textfelder komplett, dieser Text wird also vielleicht nie gelesen.",
      },
    },
    imagesNone: { title: "Keine Bilder", detail: "Nichts Wichtiges steckt in einem Bild." },
    imagePages: {
      title: "Seiten sind Bilder",
      detail: "Deine Seiten sind Bilder. Ein Bewerbermanagementsystem sieht nicht, was darauf steht.",
    },
    imagesFound: {
      title: "Bilder gefunden",
      detail: {
        one: "Wir haben {count} Bild gefunden. Logos, Fotos und Skill-Balken sind für Bewerbermanagementsysteme unsichtbar.",
        other:
          "Wir haben {count} Bilder gefunden. Logos, Fotos und Skill-Balken sind für Bewerbermanagementsysteme unsichtbar.",
      },
    },
    iconsNotChecked: {
      title: "Icons nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir nicht nach Icon-Zeichen suchen.",
    },
    iconsNone: {
      title: "Keine Icon-Zeichen",
      detail: "Keine Symbole, die als Zeichensalat angezeigt würden.",
    },
    iconsFound: {
      title: "Icon-Zeichen gefunden",
      detail: {
        one: "Wir haben {count} Icon-Zeichen gefunden, etwa Telefon- oder E-Mail-Symbole. Viele Systeme zeigen sie als Kästchen oder Zeichensalat.",
        other:
          "Wir haben {count} Icon-Zeichen gefunden, etwa Telefon- oder E-Mail-Symbole. Viele Systeme zeigen sie als Kästchen oder Zeichensalat.",
      },
    },
    datesNotChecked: {
      title: "Daten nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir deine Daten nicht prüfen.",
    },
    datesNone: {
      title: "Keine Daten gefunden",
      detail:
        "Wir haben keine Daten zu deinen Jobs gefunden. Viele Systeme berechnen damit deine Berufsjahre.",
    },
    datesFound: {
      title: "Daten gefunden",
      detail:
        "Wir haben Daten wie „{sample}“ gefunden, Systeme können deine Erfahrung also berechnen.",
    },
    datesMixed: {
      title: "Gemischte Datumsformate",
      detail:
        "Deine Daten mischen Formate, etwa „{main}“ und „{other}“. Manche Systeme lesen gemischte Formate falsch, wenn sie deine Erfahrung zusammenrechnen.",
    },
    datesConsistent: {
      title: "Daten sind einheitlich",
      detail: "Deine Jobdaten nutzen alle ein Format, etwa „{sample}“.",
    },
    lengthNotChecked: {
      title: "Länge nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir die Länge nicht prüfen.",
    },
    lengthShort: {
      title: "Sehr wenig Text",
      detail: {
        one: "Wir haben nur {count} Wort gefunden. Damit hat ein Bewerbermanagementsystem wenig, um es mit einem Job abzugleichen.",
        other:
          "Wir haben nur {count} Wörter gefunden. Damit hat ein Bewerbermanagementsystem wenig, um es mit einem Job abzugleichen.",
      },
    },
    lengthLong: {
      title: "Länger als zwei Seiten",
      detail: {
        one: "Dein Lebenslauf hat {count} Seite. Recruiter überfliegen, und viele erwarten eine oder zwei.",
        other:
          "Dein Lebenslauf hat {count} Seiten. Recruiter überfliegen, und viele erwarten eine oder zwei.",
      },
    },
    lengthGood: {
      title: "Gute Länge",
      detail: "{pages} und {words}: genug für den Abgleich mit Jobs, kurz genug zum Überfliegen.",
    },
    bulletsNotChecked: {
      title: "Stichpunkte nicht geprüft",
      detail: "Es gibt keinen lesbaren Text, also konnten wir deine Stichpunkte nicht prüfen.",
    },
    bulletsParagraphs: {
      title: "Lange Absätze in deinen Jobs",
      detail:
        "Deine Jobs sind in langen Absätzen beschrieben. Kurze Stichpunkte lassen sich leichter überfliegen und abgleichen.",
    },
    bulletsGood: {
      title: "Leicht zu überfliegen",
      detail: "Keine langen Absätze, deine Jobs sind also schnell erfasst.",
    },
  },
  fixes: {
    scan: "Lade ein PDF hoch, das aus Word oder Google Docs exportiert wurde, keinen Scan und kein Foto.",
    moveEmail: "Hol deine E-Mail aus der Kopfzeile in den Haupttext.",
    addEmail: "Schreib deine E-Mail-Adresse als normalen Text oben auf die Seite.",
    movePhone: "Hol deine Telefonnummer aus der Kopfzeile in den Haupttext.",
    addPhone: "Schreib deine Telefonnummer neben deine E-Mail.",
    moveContact: "Verschieb deine Kontaktdaten in den Hauptteil der Seite.",
    addExperience:
      "Wenn du Jobs oder Praktika hattest, führ sie unter der Überschrift „Berufserfahrung“ auf.",
    nameExperience: "Stell deine Jobs unter eine klare Überschrift wie „Berufserfahrung“.",
    addSkillsAndEducation: "Füg kurze Abschnitte „Kenntnisse“ und „Ausbildung“ hinzu.",
    addSkills: "Füg einen Abschnitt „Kenntnisse“ mit den Tools hinzu, die du nutzt.",
    addEducation: "Füg einen Abschnitt „Ausbildung“ hinzu, auch wenn er nur eine Zeile hat.",
    oneColumn: "Wechsel zu einem einspaltigen Layout.",
    noTables: "Ersetz Tabellen durch normale Textzeilen.",
    noTextBoxes: "Hol den Text aus den Textfeldern auf die Hauptseite.",
    noImages: "Entfern die Bilder oder wiederhol alles Wichtige als normalen Text.",
    noIcons: "Ersetz Icons durch Wörter wie „E-Mail“ und „Telefon“.",
    addDates: "Gib bei jedem Job Start- und Enddatum an, etwa „Jan. 2021 - März 2023“.",
    oneDateStyle: "Schreib alle Daten gleich, etwa „{main}“.",
    addLines: "Füg zu jeder Stelle ein paar Stichpunkte hinzu, was du gemacht hast.",
    trim: "Kürz ältere oder weniger wichtige Stellen, damit alles auf zwei Seiten passt.",
    bullets: "Teil jeden Job in 3 bis 5 kurze Stichpunkte, die mit einem Verb beginnen.",
  },
  units: {
    pages: { one: "{count} Seite", other: "{count} Seiten" },
    words: { one: "{count} Wort", other: "{count} Wörter" },
  },
  sections: {
    summary: "Profil",
    experience: "Berufserfahrung",
    projects: "Projekte",
    education: "Ausbildung",
    skills: "Kenntnisse",
    certifications: "Zertifikate",
  },
} satisfies Translation<Messages["fileChecks"]>;
