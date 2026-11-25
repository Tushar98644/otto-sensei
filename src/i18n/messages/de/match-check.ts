import type { Messages } from "..";
import type { Translation } from "../../types";

// The free job match tool's own words, in German.
export default {
  privacy: {
    pasted: "Eingefügter Text wird in deinem Browser geprüft und verlässt ihn nie.",
    uploaded: "Die Prüfung läuft in deinem Browser. Nichts wird gespeichert.",
  },
  sample: {
    try: "Mit Beispiel testen",
    putBack: "Meinen Text zurückholen",
    clear: "Beispiel entfernen",
  },
  submit: "Passung prüfen",
  failed: {
    title: "Die Prüfung wurde nicht geladen",
    body: "Prüfe deine Verbindung und versuch es dann noch einmal.",
  },
  stale: {
    title: "Du hast den Text seit dieser Prüfung geändert",
    body: "Prüfe die Passung noch einmal, um sie zu aktualisieren.",
  },
  pasteText: "Text einfügen",
  resume: {
    title: "Dein Lebenslauf",
    tabs: "So fügst du deinen Lebenslauf hinzu",
    upload: "Datei hochladen",
    label: "Lebenslauf-Text",
    placeholder: "Füge deinen Lebenslauf hier ein",
    hint: "Kopiere ihn aus deiner Datei oder deinem Profil, mit allen Überschriften.",
    problems: {
      reading: "Einen Moment, Otto liest deine Datei.",
      noFile: "Wähle deine Lebenslauf-Datei oder füge stattdessen den Text ein.",
      empty: "Füge zuerst deinen Lebenslauf ein.",
      short: "Das ist etwas kurz. Füge deinen ganzen Lebenslauf ein.",
      long: "Das ist länger als ein Lebenslauf. Füge nur deinen Lebenslauf ein.",
    },
  },
  upload: {
    label: "Lade deinen Lebenslauf hoch, als PDF- oder Word-Datei",
    reading: "{name} wird gelesen…",
    read: "{words} Wörter gelesen. Wähle eine andere Datei, um sie zu ersetzen.",
    drop: "Zieh deinen Lebenslauf hierher oder wähle eine Datei",
    formats: "PDF oder Word (.docx), bis {size}",
    kept: "Deine Datei wird auf unserem Server gelesen, um den Text zu bekommen, und dann verworfen. Wir speichern sie nicht.",
    failed:
      "Beim Lesen dieser Datei ist etwas schiefgelaufen. Versuch es noch einmal oder füge stattdessen den Text ein.",
    pictureOnly:
      "Diese Datei ist nur ein Bild, also sehen Bewerbermanagementsysteme eine leere Seite. Füge stattdessen den Text deines Lebenslaufs ein.",
  },
  post: {
    title: "Die Stellenanzeige",
    tabs: "So fügst du die Stellenanzeige hinzu",
    link: "Link einfügen",
    label: "Text der Stellenanzeige",
    placeholder: "Füge die Stellenanzeige oder ihren Link hier ein",
    hint: "Füge alles ein: Aufgaben, Anforderungen und Wünschenswertes.",
    problems: {
      empty: "Füge zuerst die Stellenanzeige ein.",
      short: "Das ist etwas kurz. Füge die ganze Stellenanzeige ein, nicht nur den Titel.",
      long: "Das sind mehr als {max} Zeichen. Kürze die Firmenvorstellung oder die Benefits.",
    },
  },
  link: {
    label: "Job-Link",
    hint: "Füge den Link ein, und Otto liest ihn sofort. Funktioniert mit den meisten Jobseiten, aber nicht mit LinkedIn oder Indeed.",
    reading: "Otto liest die Stellenanzeige…",
    readingStatus: "Otto liest die Stellenanzeige.",
    readStatus: "Job gelesen: {title}.",
    untitledStatus: "ohne Titel",
    from: "Aus dem Link",
    untitled: "Job ohne Titel",
    seeText: "Text ansehen, den Otto gelesen hat",
    pasteInstead: "Stattdessen den Jobtext einfügen",
    system: "Dieser Job nutzt {name}.",
    guide: "Den {name}-Ratgeber lesen",
    newTab: "(öffnet in neuem Tab)",
    problems: {
      empty: "Füge zuerst den Link zur Stellenanzeige ein.",
      notLink:
        "Das sieht nicht wie ein Link aus. Kopiere ihn aus der Adressleiste deines Browsers.",
      tooLong: "Dieser Link ist zu lang. Kopiere die Adresse der Stellenanzeige selbst.",
      offline:
        "Du scheinst offline zu sein. Prüfe deine Verbindung oder füge stattdessen den Jobtext ein.",
      failed: "Otto konnte diesen Link gerade nicht lesen. Füge stattdessen den Jobtext ein.",
    },
  },
  result: {
    places: {
      at: "{title} bei {company}",
      line: "{place}, Zeile {number}",
      experience: "Berufserfahrung",
      project: "Projekt",
      education: "Ausbildung",
      jobTitle: "Jobtitel",
      certifications: "Zertifikate",
      summary: "Profil",
      skills: "Kenntnisse",
      skillsGroup: "Kenntnisse: {label}",
      headline: "Berufsbezeichnung",
      tools: "{name}, Tools",
      projects: "Projekte",
      top: "Anfang deines Lebenslaufs",
    },
    eyebrow: "Kostenlose Wortprüfung",
    headline: {
      one: "{found} von {count} Fähigkeit aus der Anzeige gefunden",
      other: "{found} von {count} Fähigkeiten aus der Anzeige gefunden",
    },
    none: "Keine Fähigkeiten oder Tools in dieser Anzeige, die Otto kennt",
    noneBody:
      "Otto sucht nach den Fähigkeiten, Tools, Lizenzen und Sprachen, die er kennt, und diese Anzeige nennt keine davon. Füge die ganze Anzeige mit ihren Anforderungen ein und prüfe noch einmal.",
    body: "Otto hat nach jeder Fähigkeit, jedem Tool und jeder Lizenz aus der Anzeige gesucht, Wort für Wort, so wie Keyword-Filter es tun. Das ist eine Zählung, keine Note.",
    count: "{label}: {found} von {total} gefunden",
    listed: {
      one: "Eine steht nur in einer Liste, etwa bei deinen Fähigkeiten. Recruiter suchen nach einer Zeile, die sagt, wo du sie eingesetzt hast.",
      other:
        "{count} stehen nur in einer Liste, etwa bei deinen Fähigkeiten. Recruiter suchen nach einer Zeile, die sagt, wo du sie eingesetzt hast.",
    },
    groups: {
      must: "Muss-Kriterien",
      nice: "Kann-Kriterien",
      alsoNamed: "Außerdem in der Anzeige genannt",
      all: "Fähigkeiten aus der Anzeige",
    },
    status: {
      shown: "In einer Zeile",
      listed: "Gelistet, nicht belegt",
      missing: "Nicht gefunden",
    },
    missingHint:
      "Wenn du sie eingesetzt hast, ergänze eine Zeile, die sagt, wo und was du getan hast. Nutze die Wörter der Anzeige.",
    asks: {
      label: "Außerdem in der Anzeige",
      title: "Die Anzeige verlangt außerdem",
      note: "Eine Wortprüfung kann Berufsjahre oder Abschlüsse nicht beurteilen. Vergleiche diese selbst mit deinen Zeitangaben und deiner Ausbildung.",
    },
  },
  otto: {
    none: "Ich konnte in dieser Anzeige keine Fähigkeiten oder Tools finden, die ich kenne. Eine Anzeige, die ihre Anforderungen auflistet, funktioniert besser.",
    all: {
      one: "Dein Lebenslauf nennt die eine Fähigkeit, die diese Anzeige nennt.",
      other: "Dein Lebenslauf nennt alle {count} Fähigkeiten, die diese Anzeige nennt.",
    },
    mustLeft: {
      one: "{count} der {total} Muss-Kriterien aus der Anzeige fehlt noch in deinem Lebenslauf. Fang dort an.",
      other:
        "{count} der {total} Muss-Kriterien aus der Anzeige fehlen noch in deinem Lebenslauf. Fang dort an.",
    },
    some: {
      one: "Dein Lebenslauf nennt {found} von {count} Fähigkeit aus dieser Anzeige. Hier siehst du, wo.",
      other:
        "Dein Lebenslauf nennt {found} von {count} Fähigkeiten aus dieser Anzeige. Hier siehst du, wo.",
    },
  },
  studio: {
    title: "Nimm beides mit ins Studio",
    opens: {
      file: "Das kostenlose Studio liest deine Datei",
      sample: "Das kostenlose Studio öffnet sich mit dem Beispiel-Lebenslauf",
      pasted: "Das kostenlose Studio öffnet sich mit deinem eingefügten Lebenslauf",
    },
    body: "{opens} und merkt sich diese Stellenanzeige für „Anpassen“. Verbessere Zeilen selbst oder mit Otto ({fixes} Zeilenkorrekturen pro Monat kostenlos) und lade ein sauberes PDF herunter. Bei Pro passt Otto deinen Lebenslauf an diesen Job an.",
    cta: "Diese Zeilen mit Otto verbessern",
    failed:
      "Das Studio hat sich nicht geöffnet. Prüfe deine Verbindung und versuch es dann noch einmal.",
  },
} satisfies Translation<Messages["matchCheck"]>;
