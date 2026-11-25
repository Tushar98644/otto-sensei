import type { Messages } from "..";
import type { Translation } from "../../types";

// Product and tool pages (resume builder, cover letters, tracker, interview prep, portfolio), in German.
export default {
  common: {
    breadcrumb: "Brotkrümelnavigation",
    home: "Startseite",
    howItWorks: "So funktioniert’s",
    questions: "Fragen",
    keepReading: "Weiterlesen",
    seePlan: "Sieh dir an, was {pro} bietet",
    trialFor: "{headline} für {price}.",
    checkButtons: { match: "Lebenslauf mit Job abgleichen", check: "Lebenslauf prüfen" },
  },
  related: {
    examples: {
      title: "Lebenslauf-Beispiele",
      text: "{count} vollständige Beispiele nach Beruf, jeweils mit stärkeren Zeilen, Fähigkeiten und häufigen Fehlern.",
    },
    templates: {
      title: "Lebenslauf-Vorlagen",
      text: "{count} Formate, jedes einspaltig mit echtem Text. {free} sind kostenlos.",
    },
    jobMatch: {
      title: "Job-Abgleich",
      text: "Füge deinen Lebenslauf und eine Stellenanzeige ein und sieh, welche ihrer Fähigkeiten du zeigst. Kostenlos, ohne Anmeldung.",
    },
    ats: {
      title: "ATS-Ratgeber",
      text: "Infos mit Quellen zu {count} Bewerbermanagementsystemen: wie sie Dateien lesen, Bewerbende filtern und mit KI sortieren.",
    },
    compare: {
      title: "Otto Sensei im Vergleich",
      text: "Wie sich Otto von {names} unterscheidet, laut den eigenen Seiten der Produkte.",
    },
    coverLetters: {
      title: "KI-Anschreiben-Generator",
      text: "Anschreiben, Kontaktnachrichten und Antworten auf Bewerbungsfragen, aus deinem Lebenslauf und der Stellenanzeige.",
    },
    tracker: {
      title: "Bewerbungstracker",
      text: "Deine Bewerbungen auf einem Board, mit dem Lebenslauf, den du geschickt hast, Erinnerungen zum Nachfassen und Interviewterminen.",
    },
    interviewPrep: {
      title: "KI-Interviewvorbereitung",
      text: "Wahrscheinliche Fragen, Geschichten aus deinen eigenen Lebenslaufzeilen und Fragen an das Unternehmen, für jedes Interview.",
    },
    portfolio: {
      title: "Portfolio-Website erstellen",
      text: "Eine Portfolio-Website aus deinem Lebenslauf in einem von {count} Designs, gehostet unter deinem eigenen Link.",
    },
  },
  builder: {
    meta: {
      title: "Kostenloser Lebenslauf-Generator mit KI und ATS-Check",
      description:
        "Erstelle deinen Lebenslauf kostenlos: neu oder aus einer Datei. Sieh den Text, den Bewerbermanagementsysteme lesen, verbessere schwache Zeilen mit Ottos KI-Hilfe und lade ein sauberes PDF herunter.",
    },
    crumb: "Lebenslauf-Generator",
    eyebrow: "Kostenloser Lebenslauf-Generator",
    title: "Ein Lebenslauf-Generator,",
    titleEm: "der zeigt, was Software liest.",
    intro:
      "Starte mit einer Datei, einer leeren Seite oder einem Beispiel. Otto prüft jede Zeile und zeigt den Text, den Bewerbermanagementsysteme aus deiner Datei ziehen, und das PDF lädst du kostenlos herunter.",
    action: "Lebenslauf erstellen",
    seeExamples: "Beispiele ansehen",
    stepsTitle: "Wie Otto einen Lebenslauf erstellt und prüft",
    stepsIntro:
      "Fünf Schritte im Studio. Du kannst nach jedem aufhören; dein Lebenslauf wird dabei laufend in deinem Browser gespeichert.",
    steps: {
      start: {
        title: "Starte mit dem, was du hast",
        text: "Lade eine PDF- oder Word-Datei hoch, importiere deinen LinkedIn-Datenexport oder eine JSON-Resume-Datei, starte mit einer leeren Seite oder öffne eines der <link>Lebenslauf-Beispiele</link>. Mit {pro} schreibt „Mit Otto erstellen“ einen ersten Entwurf aus ein paar Antworten zu deinen Jobs.",
      },
      read: {
        title: "Sieh, was Bewerbermanagementsysteme lesen",
        text: "Die Recruiter-Ansicht zeigt den Text, den ein Bewerbermanagementsystem aus deiner Datei zieht, in Lesereihenfolge, mit klaren Prüfungen für Kontaktdaten, Überschriften, Spalten, Tabellen, Icons, Datumsangaben und Länge. Zu jedem Problem gibt es den Grund.",
      },
      fix: {
        title: "Schwache Zeilen mit Otto verbessern",
        text: "Ottos Zeilenprüfung markiert Zeilen, die wie Aufgabenbeschreibungen klingen, kein Ergebnis nennen oder auf Floskeln setzen. Bitte ihn, eine zu verbessern, dann fragt er zuerst nach der fehlenden Angabe und schreibt die Zeile aus deiner Antwort. Du übernimmst, bearbeitest oder überspringst jeden Vorschlag. {free} enthält {fixes} Zeilenkorrekturen pro Monat.",
      },
      match: {
        title: "Mit einem Job abgleichen",
        text: "Füge eine Stellenanzeige oder ihren Link ein und sieh, welche Fähigkeiten sie nennt, welche dein Lebenslauf zeigt und welche fehlen. Der <link>Job-Abgleich</link> funktioniert ohne Anmeldung. Mit {pro} passt Otto eine Kopie deines Lebenslaufs an die Anzeige an.",
      },
      download: {
        title: "Ein sauberes PDF herunterladen",
        text: "Wähle ein Format und Letter- oder A4-Papier, dann lade herunter. Jedes Format ist eine Spalte mit echtem Text, getestet, indem das PDF zurückgelesen wird. {freeFormats} sind kostenlos, ohne Download-Limit; die anderen {proFormats} Formate und Word-Downloads gibt es mit {pro}.",
      },
    },
    plans: {
      title: "Was kostenlos ist und was {pro} dazu bringt",
      intro:
        "Preise in US-Dollar. Es können Steuern anfallen. {max} kostet {price} pro Monat für mehr Hilfe von Otto jeden Monat.",
      freeCta: "Lebenslauf erstellen",
      freeNote: "Keine Karte nötig",
      paidCta: "{pro} und {max} ansehen",
      cancelAnytime: "Jederzeit kündbar",
    },
    audiencesTitle: "Für wen es ist",
    audiences: {
      freshers: {
        title: "Berufseinsteiger und Studierende",
        text: "Setz die Ausbildung an den Anfang, beschreibe Projekte wie Jobs und bleib bei einer Seite. Das <link>Beispiel für Berufseinsteiger</link> zeigt den Aufbau für einen B.Tech oder jeden anderen Abschluss, und Prüfen und PDFs kosten nichts.",
      },
      changing: {
        title: "Jobwechsel",
        text: "Lade den Lebenslauf hoch, den du hast. Die Recruiter-Ansicht zeigt, was du zuerst verbessern solltest, und der Job-Abgleich zeigt, welche Fähigkeiten der nächste Job verlangt, die dein Lebenslauf noch nicht zeigt.",
      },
      abroad: {
        title: "Bewerbungen im Ausland",
        text: "Wähle Letter-Papier für die USA und Kanada und A4 für die meisten anderen Länder. Lass Foto, Geburtsdatum und Familienstand weg, und gib Geldbeträge in der Währung des Arbeitgebers an.",
      },
      many: {
        title: "Bewerbungen auf viele Jobs",
        text: "{pro} speichert eine angepasste Kopie für jeden Job, schreibt Anschreiben und Antworten auf Bewerbungsfragen und verfolgt bis zu {tracked} Bewerbungen mit Erinnerungen zum Nachfassen.",
      },
    },
    indiaTitle: "Lebensläufe für Jobs in Indien",
    indiaIntro:
      "CTC (das Jahresgehalt), Kündigungsfrist, Naukri und die Biodata-Gewohnheiten alter Vorlagen: wohin was gehört und was du weglassen solltest.",
    india: {
      ctc: {
        title: "Lass das CTC aus dem Lebenslauf",
        text: "Recruiter fragen nach dem aktuellen und dem erwarteten CTC im Bewerbungsformular, in deinem Naukri-Profil oder beim ersten Anruf. Lass es im Lebenslauf weg, dann passt ein Lebenslauf für jede Bewerbung. Mit {pro} lässt Otto eine Lücke für dich frei, wenn er eine Antwort auf eine Gehaltsfrage entwirft.",
      },
      notice: {
        title: "Nenne deine Kündigungsfrist, wo danach gefragt wird",
        text: "Gib sie im Bewerbungsformular oder in deinem Begleitschreiben an, nicht unter deinem Namen. Otto rät sie nie: Mit {pro} bekommt eine entworfene Antwort, die deine Kündigungsfrist braucht, eine Lücke in Klammern, die du ausfüllst.",
      },
      naukri: {
        title: "Erzähl auf Naukri dieselbe Geschichte",
        text: "Lade das PDF, das du hier herunterlädst, in dein Naukri-Profil hoch, und nutze dort denselben Jobtitel und dieselben Kernkompetenzen wie im Lebenslauf. Ein Recruiter, der dich dort findet, sieht dann zweimal dieselbe Geschichte.",
      },
      biodata: {
        title: "Lass die alten Biodata-Angaben weg",
        text: "Foto, Geburtsdatum, Familienstand, Name des Vaters und eine unterschriebene Erklärung stammen aus alten Vorlagen. Die meisten Arbeitgeber verlangen sie nicht, und Ottos Formate haben keinen Platz für ein Foto.",
      },
      marks: {
        title: "Zeig Noten, solange sie zählen",
        text: "Für Berufseinsteiger zählen CGPA und die Noten der 12. Klasse (Class XII) noch, weil viele Stellen auf dem Campus und für Trainees eine Mindestnote setzen. Nach ein paar Jahren im Beruf reichen Abschluss und Hochschule.",
      },
    },
    examplesTitle: "Starte mit einem Beispiel",
    examplesIntro:
      "Jedes ist ein vollständiger Lebenslauf, den du im Studio öffnen und zu deinem eigenen machen kannst. <link>Alle {count} Beispiele ansehen</link>.",
    faq: {
      free: {
        question: "Ist dieser Lebenslauf-Generator wirklich kostenlos?",
        answer:
          "Ja. Einen Lebenslauf zu erstellen, zu prüfen und als PDF herunterzuladen ist kostenlos, in den Formaten {freeFormats}, ohne Download-Limit und ohne Karte. {free} enthält außerdem {fixes} Zeilenkorrekturen pro Monat von Otto. {pro} kostet {price} pro Monat für Anpassen, Anschreiben, alle Formate und Word-Downloads.",
      },
      ai: {
        question: "Ist das ein KI-Lebenslauf-Generator?",
        answer:
          "Ja, mit bewussten Grenzen. Ottos KI verbessert Zeilen, passt Lebensläufe an und schreibt Anschreiben, aber nur aus Fakten, die du ihm gibst: Er fragt nach Zahlen, statt sie zu erfinden, und du bestätigst jede Änderung. Die Recruiter-Ansicht und die Zeilenprüfung sind einfache Regeln, keine KI.",
      },
      ats: {
        question: "Kommt mein Lebenslauf durch ein ATS?",
        answer:
          "Das kann niemand versprechen, weil jeder Arbeitgeber sein Bewerbermanagementsystem anders einrichtet. Otto zeigt dir den Text, den ein System aus deiner Datei zieht, und markiert, was oft schiefgeht, etwa Spalten, Tabellen, Icons und Textfelder. Die <link>ATS-Ratgeber</link> zeigen, was gängige Systeme bekanntermaßen tun.",
      },
      freshers: {
        question: "Eignet er sich für Berufseinsteiger?",
        answer:
          "Ja. Starte mit dem Beispiel für Berufseinsteiger oder einer leeren Seite, setz die Ausbildung an den Anfang und bleib bei einer Seite. {freeFormats} sind beide kostenlos und passen zu einem ersten Lebenslauf.",
      },
      ctc: {
        question: "Sollte ich CTC und Kündigungsfrist in meinen Lebenslauf schreiben?",
        answer:
          "Nein. Nenne sie, wenn ein Bewerbungsformular, ein Recruiter oder dein Naukri-Profil danach fragt. Ein Lebenslauf ohne sie funktioniert für jede Bewerbung, und die Zahlen ändern sich öfter als deine Arbeit.",
      },
      signUp: {
        question: "Muss ich mich registrieren?",
        answer:
          "Nicht zum Erstellen, Prüfen oder Herunterladen: Dein Lebenslauf wird in deinem Browser gespeichert. Ein kostenloses Konto sichert ihn und schaltet Ottos {fixes} Zeilenkorrekturen pro Monat frei. Melde dich mit Google oder einem Code per E-Mail an, ohne Passwort.",
      },
      paper: {
        question: "Letter oder A4?",
        answer:
          "Beides gibt es. Wähle Letter für Jobs in den USA und Kanada und A4 für Indien, Großbritannien, Europa und die meisten anderen Länder. Deine Texte bleiben in beiden Fällen gleich.",
      },
      word: {
        question: "Kann ich meinen Lebenslauf als Word-Datei herunterladen?",
        answer:
          "Word-Downloads (.docx) gibt es mit {pro}. Bei {free} sind Downloads PDFs, so viele du willst. <link>Preise ansehen</link>.",
      },
    },
    closing: {
      otto: "Otto, der Otter, liest einen Lebenslauf",
      title: "Erstellen, prüfen, herunterladen.",
      cta: "Lebenslauf erstellen",
      note: "Kostenlos und ohne Konto.",
    },
  },
  coverLetters: {
    meta: {
      title: "KI-Anschreiben-Generator aus deinem Lebenslauf",
      description:
        "Otto schreibt Anschreiben, Kontaktnachrichten und Antworten auf Bewerbungsfragen aus deinem Lebenslauf und der Stellenanzeige und markiert jede Zeile, die er nicht belegen kann. Mit {pro}.",
    },
    crumb: "Anschreiben-Generator",
    eyebrow: "Anschreiben · {pro}",
    title: "Ein KI-Anschreiben-Generator,",
    titleEm: "der bei deinen Fakten bleibt.",
    action: "Anschreiben verfassen",
    planNote:
      "Mit {pro}: {price} pro Monat für {letters} Anschreiben, Nachrichten, Antworten und Interviewvorbereitungen.",
    check: {
      title: "Prüfe die Passung, bevor du schreibst",
      text: "Ein Anschreiben kommt besser an, wenn dein Lebenslauf schon zeigt, was die Anzeige verlangt. Der Job-Abgleich und die Recruiter-Ansicht sind kostenlos, ohne Karte.",
    },
    closing: {
      title: "Ein Anschreiben für jeden Job, aus deinem eigenen Lebenslauf.",
      art: "Otto, der Otter, zeigt auf ein Anschreiben",
    },
    intro:
      "Füge eine Stellenanzeige oder ihren Link ein. Otto schreibt das Anschreiben aus dieser Anzeige und deinem Lebenslauf und markiert alles, was du vor dem Absenden prüfen solltest.",
    featuresTitle: "Was Otto für dich schreibt",
    features: {
      letter: {
        title: "Ein Anschreiben für jeden Job",
        text: "Drei kurze Absätze: die Stelle und dein stärkstes Argument dafür, zwei oder drei Ergebnisse, die zu dem passen, was die Anzeige am meisten verlangt, und dann, warum genau dieser Job. Anrede und Grußformel werden für dich ergänzt.",
      },
      answers: {
        title: "Antworten auf Bewerbungsfragen",
        text: "Füge eine Frage wie „Warum möchten Sie bei uns arbeiten?“ ein, und Otto beantwortet sie aus deinem Lebenslauf. Alles, was nur du weißt, etwa ein Startdatum oder Gehalt, wird zu einer Lücke in Klammern, die du ausfüllst.",
      },
      outreach: {
        title: "Kontaktaufnahme, Nachfassen und Dankeschöns",
        text: "Eine kurze E-Mail und eine LinkedIn-Nachricht an jemanden im Unternehmen, eine Nachfrage, wenn es um eine Bewerbung still wird, und ein Dankeschön nach einem Interview.",
      },
      facts: {
        title: "Nichts erfunden",
        text: "Otto schreibt nur aus deinem Lebenslauf und der Stellenanzeige. Enthält ein Entwurf eine Zahl, die dein Lebenslauf nicht hat, ein stärkeres Verb als deine Zeile oder eine Floskel, markiert er das, damit du es prüfst.",
      },
      style: {
        title: "Dein Ton, deine Schreibweise",
        text: "Wähle einen Ton ({tones}), eine normale oder kürzere Länge und US- oder UK-Schreibweise. Einmal einstellen, und jedes Anschreiben hält sich daran.",
      },
      send: {
        title: "Bereit zum Absenden",
        text: "Kopiere es, öffne es als E-Mail oder lade es als PDF- oder Word-Datei herunter. Jedes wird mit dem Job gespeichert, für den es geschrieben wurde.",
      },
    },
    steps: {
      job: {
        title: "Wähle den Job",
        text: "Wähle einen gespeicherten Job, eine Bewerbung auf deinem Board oder eine angepasste Kopie deines Lebenslaufs. Oder füge eine Stellenanzeige oder ihren Link ein.",
      },
      kind: {
        title: "Wähle, was Otto schreibt",
        text: "Ein Anschreiben, eine Antwort auf eine Bewerbungsfrage oder eine Kontaktnachricht. Otto schreibt es aus deinem Lebenslauf und der Anzeige.",
      },
      send: {
        title: "Prüfen und absenden",
        text: "Lies den Entwurf, korrigiere, was Otto markiert hat, und kopiere ihn dann, schick ihn per E-Mail oder lade ihn herunter.",
      },
    },
    faq: {
      free: {
        question: "Ist der KI-Anschreiben-Generator kostenlos?",
        answer:
          "Er ist in {pro} und {max} enthalten. {pro} kostet {price} pro Monat und enthält {letters} pro Monat, gemeinsam für Anschreiben, Kontaktnachrichten, Antworten und Interviewvorbereitung. Bei {free} bleiben das Prüfen und Bearbeiten deines Lebenslaufs und PDF-Downloads kostenlos. <link>Alle Tarife ansehen</link>.",
      },
      madeUp: {
        question: "Erfindet Otto Dinge?",
        answer:
          "Nein. Er schreibt nur aus deinem Lebenslauf und der Stellenanzeige und prüft den Entwurf dann gegen beide. Eine Zahl, die dein Lebenslauf nicht hat, ein stärkeres Verb als deine Zeile oder eine Floskel wird markiert, damit du es korrigieren kannst, oder behalten, wenn es stimmt.",
      },
      link: {
        question: "Kann er aus einem Job-Link schreiben?",
        answer:
          "Ja. Füge den Link ein, und Otto liest die Anzeige. Wenn eine Website sie nicht herausgibt, füge stattdessen den Text der Anzeige ein.",
      },
      tone: {
        question: "Kann ich Ton oder Länge ändern?",
        answer:
          "Ja. Wähle einen Ton ({tones}), eine normale oder kürzere Länge, US- oder UK-Schreibweise und deine eigene Grußformel. Du kannst Otto auch eine Notiz hinterlassen, etwa „Erwähne, dass ich umzugsbereit bin.“",
      },
      why: {
        question: "Wie beantwortet er „Warum möchten Sie bei uns arbeiten?“",
        answer:
          "Füge die Frage ein und wähle den Job. Otto antwortet aus deinem Lebenslauf und der Anzeige in einem oder zwei kurzen Absätzen. Alles, was nur du weißt, etwa was dich an dem Unternehmen reizt, wird zu einer Lücke in Klammern, die du ausfüllst.",
      },
    },
    tones: { natural: "natürlich", warm: "herzlich", direct: "direkt", formal: "förmlich" },
  },
  tracker: {
    meta: {
      title: "Bewerbungstracker mit Updates per E-Mail",
      description:
        "Verfolge jede Bewerbung auf einem Board, mit dem Lebenslauf, den du geschickt hast, Erinnerungen zum Nachfassen und Interviewterminen. Bei {pro} aktualisiert es sich aus deinen Jobmails.",
    },
    crumb: "Bewerbungstracker",
    eyebrow: "Bewerbungstracker",
    title: "Ein Bewerbungstracker,",
    titleEm: "der mit deinem Postfach Schritt hält.",
    action: "Bewerbungen verfolgen",
    planNote:
      "{free} verfolgt {freeApplications}, {pro} bis zu {proApplications} mit Updates per E-Mail und {max} bis zu {maxApplications}.",
    applications: { one: "{count} Bewerbung", other: "{count} Bewerbungen" },
    check: {
      title: "Schick einen Lebenslauf, der gut lesbar ist",
      text: "Bevor du die nächste Bewerbung einträgst, sieh nach, welche Fähigkeiten aus der Anzeige dein Lebenslauf zeigt und was Bewerbermanagementsysteme aus deiner Datei lesen. Beide Prüfungen sind kostenlos.",
    },
    closing: {
      title: "Jede Bewerbung, auf einem Board.",
      art: "Otto, der Otter, liest eine Bewerbung",
    },
    intro:
      "Trag jeden Job, auf den du dich bewirbst, auf einem Board ein, mit dem Lebenslauf, den du geschickt hast, einer Erinnerung zum Nachfassen und dem Interviewtermin. Bei {pro} verschieben deine Jobmails jede Karte für dich.",
    featuresTitle: "Was der Tracker für dich festhält",
    features: {
      board: {
        title: "Ein Board, von „Zu bewerben“ bis „Angebot“",
        text: "Gespeicherte Jobs warten unter „Zu bewerben“. Zieh jede Karte nach „Beworben“, „Interviews“ und „Angebot“, sobald du Rückmeldung bekommst, und nach „Abgeschlossen“, wenn es vorbei ist.",
      },
      resume: {
        title: "Der Lebenslauf, den du geschickt hast",
        text: "Jede Bewerbung speichert den Lebenslauf oder die angepasste Kopie, die du geschickt hast, damit du weißt, was dort gelesen wurde. Wenn du ein paar verschickt hast, siehst du, welche Version dir Interviews bringt.",
      },
      reminders: {
        title: "Erinnerungen zum Nachfassen",
        text: "Otto erinnert dich {followUp} Tage nach deiner Bewerbung ans Nachfassen, oder nach den Tagen, die du wählst. Schieb eine Erinnerung um {snooze} Tage auf oder erledige sie. Nach einem Interview setzt er eine für {afterInterview} Werktage später.",
      },
      interviews: {
        title: "Interviewtermine",
        text: "Trag Tag und Uhrzeit des Interviews ein und füg es dann deinem Kalender hinzu, mit einer Erinnerung, am Morgen davor zu üben.",
      },
      emails: {
        title: "Updates aus deinen Jobmails ({pro})",
        text: "Hol dir deine eigene Otto-Adresse und richte einen Gmail-Filter ein, der Jobmails dorthin weiterleitet. Eine Mail „Vielen Dank für Ihre Bewerbung“ legt den Job unter „Beworben“ ab, und eine Intervieweinladung verschiebt ihn mit Termin nach „Interviews“.",
      },
      rules: {
        title: "Nach Regeln gelesen, sparsam gespeichert",
        text: "Otto liest jede weitergeleitete E-Mail mit festen Regeln, nicht mit KI. Er behält die Domain des Absenders, den Betreff und was er gefunden hat, und verwirft den Rest. Mails, die er nicht verifizieren kann, warten darauf, dass du sie prüfst.",
      },
    },
    steps: {
      add: {
        title: "Bewerbung hinzufügen",
        text: "Gib Unternehmen, Jobtitel und Link ein oder markiere einen gespeicherten Job als beworben. Wähle den Lebenslauf, den du geschickt hast.",
      },
      move: {
        title: "Weiterschieben",
        text: "Zieh die Karte weiter, sobald du Rückmeldung bekommst, und trag Interviewtermin und Notizen ein. Bei {pro} erledigen das deine Jobmails für dich.",
      },
      followUp: {
        title: "Rechtzeitig nachfassen",
        text: "Wenn eine Erinnerung fällig ist, fass nach, schieb sie auf oder markiere den Job als „keine Antwort“. Bei {pro} schreibt Otto die Nachfass-Nachricht aus deinem Lebenslauf und dem Job.",
      },
    },
    faq: {
      free: {
        question: "Ist der Bewerbungstracker kostenlos?",
        answer:
          "{free} verfolgt {freeApplications} mit einer Erinnerung zum Nachfassen, damit du ihn ausprobieren kannst. {pro} verfolgt bis zu {proApplications} und bringt Updates aus deinen Jobmails, und {max} verfolgt bis zu {maxApplications}. {pro} kostet {price} pro Monat.",
      },
      email: {
        question: "Wie aktualisiert er sich aus meinen E-Mails?",
        answer:
          "Bei {pro} wählst du einen Namen für deine eigene Otto-Adresse, fügst sie in den Weiterleitungseinstellungen von Gmail hinzu, bestätigst, dass es dein Gmail ist, und richtest dann einen Filter für Jobmails ein. Das dauert ein paar Minuten und endet mit einer Test-Mail. Danach verschiebt jede Jobmail ihre Karte oder wartet darauf, dass du sie prüfst.",
      },
      privacy: {
        question: "Liest Otto alle meine E-Mails?",
        answer:
          "Nein. Nur die E-Mails, die dein Gmail-Filter weiterleitet, erreichen Otto. Er liest jede mit festen Regeln, nicht mit KI, behält die Domain des Absenders, den Betreff und was er darin gefunden hat, etwa Unternehmen, Jobtitel und Interviewtermin, und verwirft den Rest. Diese Einträge werden nach sechs Monaten gelöscht. Die <link>Datenschutzerklärung</link> enthält die Details.",
      },
      wrong: {
        question: "Was, wenn Otto eine E-Mail falsch liest?",
        answer:
          "Mach jede Änderung in der Liste der E-Mails, die Otto gelesen hat, rückgängig. Wenn er nicht verifizieren kann, wer eine E-Mail geschickt hat, bewegt sich nichts, bis du sie prüfst.",
      },
      versions: {
        question: "Kann ich sehen, welcher Lebenslauf Interviews bringt?",
        answer:
          "Ja. Jede Bewerbung speichert den Lebenslauf, den du geschickt hast, also zählt das Board die Interviews und Angebote jeder Version. Sobald zwei Versionen jeweils {minForRate} oder mehr Bewerbungen haben, vergleicht Otto ihre Interviewquoten.",
      },
    },
  },
  interviewPrep: {
    meta: {
      title: "KI-Interviewvorbereitung aus Lebenslauf und Job",
      description:
        "Bereite dich auf jedes Interview vor, mit wahrscheinlichen Fragen, Geschichten aus deinen eigenen Lebenslaufzeilen und Fragen an das Unternehmen. Technische Rollen bekommen auch eine technische Runde.",
    },
    crumb: "Interviewvorbereitung",
    eyebrow: "Interviewvorbereitung · {pro}",
    title: "KI-Interviewvorbereitung,",
    titleEm: "aus deinem eigenen Lebenslauf.",
    action: "Auf ein Interview vorbereiten",
    planNote:
      "Mit {pro}: {price} pro Monat für {letters} Interviewvorbereitungen, Anschreiben, Nachrichten und Antworten.",
    check: {
      title: "Sieh, was die Anzeige verlangt",
      text: "Der Job-Abgleich listet die Fähigkeiten, die eine Anzeige nennt, und wo dein Lebenslauf jede davon zeigt, ein guter Startpunkt für deine Vorbereitung. Er ist kostenlos, ohne Anmeldung.",
    },
    closing: {
      title: "Ins Interview gehen und wissen, was du sagst.",
      art: "Otto, der Otter, denkt über eine Interviewfrage nach",
    },
    intro:
      "Wähle den Job und den Lebenslauf, den du geschickt hast. Otto baut daraus deine Vorbereitung: die Fragen, die du wahrscheinlich bekommst, Geschichten aus deinen eigenen Lebenslaufzeilen und Fragen, die du stellen kannst.",
    featuresTitle: "Was in jedem Vorbereitungspaket steckt",
    features: {
      questions: {
        title: "Wahrscheinliche Fragen, Runde für Runde",
        text: "Vom Einstieg bis zum Abschluss steht bei jeder Frage, was damit geprüft wird, welche Punkte du treffen solltest und welche Nachfrage zu erwarten ist.",
      },
      stories: {
        title: "Geschichten aus deinen eigenen Zeilen",
        text: "Jede Geschichte beginnt bei einer Zeile in deinem Lebenslauf, erzählt als Situation, Aufgabe, Handlung und Ergebnis. Was dein Lebenslauf nicht sagt, bleibt eine Lücke, die du füllst, nie erfunden.",
      },
      technical: {
        title: "Eine technische Runde für technische Rollen",
        text: "Für {roles} Arten von Rollen, von Entwicklern und Data Scientists bis zu Produktmanagern und Designern: vertiefende Fragen zu deiner eigenen Arbeit, Kernkonzepte der Rolle und eine Designfrage, Fallstudie oder Übung. Bei jeder steht, was eine starke Antwort abdeckt und welche Fehler du vermeiden solltest.",
      },
      ask: {
        title: "Fragen an das Unternehmen",
        text: "Vier oder fünf Fragen für das Ende des Interviews, zu Produkt, Team oder Zielen aus der Anzeige. Keine zu Gehalt oder Urlaub.",
      },
      practice: {
        title: "Übungsmodus",
        text: "Otto übernimmt die Rolle des Interviewers, eine Frage nach der anderen. Antworte laut mit dem Mikrofon oder tippe, mit einem Zwei-Minuten-Timer und deiner Gliederung nur einen Tipp entfernt. Dann wiederhole die Fragen, die noch nicht saßen.",
      },
      day: {
        title: "Bereit am Tag X",
        text: "Füg das Interview deinem Kalender hinzu, mit einer Erinnerung, am Morgen davor zu üben, oder druck das Paket aus, um es unterwegs zu lesen.",
      },
    },
    steps: {
      job: {
        title: "Wähle den Job",
        text: "Eine Bewerbung, die bei „Interviews“ ankommt, wartet mit einem Button „Vorbereiten“. Oder starte mit dem Link eines beliebigen Jobs, seiner Anzeige oder nur dem Jobtitel.",
      },
      setup: {
        title: "Prüfe die Einstellungen",
        text: "Nimm den Lebenslauf, den du geschickt hast. Otto wählt die technische Runde passend zum Job; ändere die Rolle oder das Level von {firstLevel} bis {lastLevel}, wenn du willst.",
      },
      practice: {
        title: "Lesen, ausfüllen, üben",
        text: "Geh die Fragen und Geschichten durch, füll jede Lücke mit deinen eigenen Fakten und starte dann den Übungsmodus.",
      },
    },
    faq: {
      free: {
        question: "Ist die KI-Interviewvorbereitung kostenlos?",
        answer:
          "Sie ist in {pro} und {max} enthalten. Jedes Vorbereitungspaket zählt zum selben Monatskontingent wie Anschreiben und Nachrichten: {letters} pro Monat bei {pro} und {maxLetters} bei {max}. {pro} kostet {price} pro Monat.",
      },
      backUp: {
        question: "Gibt sie mir Antworten, die ich nicht belegen kann?",
        answer:
          "Nein. Fakten über dich kommen nur aus deinem Lebenslauf. Wo eine Antwort etwas braucht, das dein Lebenslauf nicht sagt, lässt Otto eine Frage in Klammern stehen, etwa „[Wie viele Leute haben es genutzt?]“, die du beantwortest. In der technischen Runde ist allgemeines Fachwissen als Hinweis formuliert, nie als etwas, das du getan hast.",
      },
      roles: {
        question: "Welche Rollen bekommen eine technische Runde?",
        answer:
          "{roles} Arten, von Backend-, Frontend- und KI/ML-Entwicklern bis zu Datenanalysten, Produktmanagern und Designern. Otto wählt eine anhand von Jobtitel und Anzeige, und du kannst sie ändern oder ausschalten.",
      },
      aloud: {
        question: "Kann ich laut üben?",
        answer:
          "Ja. Drück im Übungsmodus auf das Mikrofon und antworte laut; deine Antwort erscheint als Text. Markiere jede Frage als erledigt oder zum erneuten Üben, und deine Notizen bleiben in deinem Browser.",
      },
      noPost: {
        question: "Kann ich mich ohne Stellenanzeige vorbereiten?",
        answer:
          "Ja. Füge die ganze Anzeige ein, um genauere Fragen zu bekommen, oder lass sie weg, dann arbeitet Otto mit dem Jobtitel.",
      },
    },
    levels: { junior: "Junior", mid: "Mid-Level", senior: "Senior", staff: "Staff" },
  },
  portfolio: {
    meta: {
      title: "Vom Lebenslauf zur Portfolio-Website in {designs} Designs",
      description:
        "Mach aus deinem Lebenslauf eine Portfolio-Website. Wähle eines von {designs} Designs, Otto füllt es aus deinem Lebenslauf, und wir hosten es unter deinem eigenen Link. Mit {pro}.",
    },
    crumb: "Portfolio-Website erstellen",
    eyebrow: "Portfolio-Website · {pro}",
    title: "Vom Lebenslauf zur Portfolio-Website,",
    titleEm: "gehostet unter deinem eigenen Link.",
    action: "Mein Portfolio erstellen",
    planNote: "Mit {pro}: {price} pro Monat, Hosting inklusive.",
    check: {
      title: "Starte mit einem gut lesbaren Lebenslauf",
      text: "Dein Portfolio wird aus deinem Lebenslauf erstellt, also prüfe ihn zuerst: Sieh, was Bewerbermanagementsysteme aus deiner Datei lesen, oder gleiche ihn mit einem Job ab. Beides ist kostenlos.",
    },
    closing: {
      title: "Dein Lebenslauf als eigene Website.",
      art: "Otto, der Otter, winkt",
    },
    intro:
      "Wähle eines von {designs} Designs, und Otto füllt es aus deinem Lebenslauf: deine Projekte, deine Arbeit, Fähigkeiten und Links. Wir hosten es unter deinem eigenen Link, du musst also nichts einrichten.",
    featuresTitle: "Was du bekommst",
    features: {
      designs: {
        title: "{designs} Designs",
        text: "Von einer ruhigen Spalte bis zu einer dunklen Seite mit großen hervorgehobenen Projekten. Öffne jedes in voller Größe mit deinem eigenen Lebenslauf darin, bevor du wählst.",
      },
      filled: {
        title: "Aus deinem Lebenslauf ausgefüllt",
        text: "Otto entwirft „Über mich“, Projekte, Berufserfahrung, Fähigkeiten, Ausbildung und Links aus deinem Lebenslauf. Bearbeite jeden Teil oder blende einen Abschnitt aus, den du nicht brauchst.",
      },
      hosted: {
        title: "Gehostet unter deinem eigenen Link",
        text: "Die Seite bekommt einen Link mit deinem Namen darin, und wir hosten sie. Ändere den Namen später, und der alte Link funktioniert noch {redirectDays} Tage weiter.",
      },
      sync: {
        title: "Im Gleichschritt mit deinem Lebenslauf",
        text: "Mit aktivierter Synchronisierung erscheinen Änderungen an deinem Lebenslauf von selbst auf der Seite. Schalte sie aus, um die Seite erst zu aktualisieren, wenn du so weit bist.",
      },
      private: {
        title: "Private Angaben bleiben verborgen",
        text: "Deine E-Mail und Telefonnummer sind anfangs ausgeblendet, und Suchmaschinen werden gebeten, die Seite zu überspringen, bis du sie finden lässt.",
      },
      views: {
        title: "Aufrufe und GitHub",
        text: "Sieh, wie oft deine Seite aufgerufen wurde. Verbinde GitHub, dann kann die Seite auch deine GitHub-Zahlen zeigen.",
      },
    },
    steps: {
      pick: {
        title: "Wähle einen Lebenslauf und ein Design",
        text: "Sieh jedes Design mit deinem eigenen Lebenslauf darin und wähle dann eines. Otto füllt es aus.",
      },
      check: {
        title: "Prüfe, was Otto geschrieben hat",
        text: "Bearbeite die Texte, blende Abschnitte aus und entscheide, ob deine E-Mail und Telefonnummer sichtbar sind.",
      },
      publish: {
        title: "Veröffentlichen und teilen",
        text: "Nichts geht online, bevor du veröffentlichst. Dann schick den Link an Recruiter oder setz ihn in deinen Lebenslauf und dein LinkedIn-Profil.",
      },
    },
    faq: {
      free: {
        question: "Ist die Portfolio-Website kostenlos?",
        answer:
          "Portfolios sind in {pro} und {max} enthalten, Hosting inklusive. {pro} kostet {price} pro Monat. Wenn dein Tarif endet, geht die Seite offline, aber sie und ihre Einstellungen bleiben gespeichert, sodass sie so zurückkommt, wie sie war, wenn du wiederkommst.",
      },
      code: {
        question: "Muss ich programmieren oder Hosting kaufen?",
        answer:
          "Nein. Otto baut die Seite aus deinem Lebenslauf, und wir hosten sie. Du musst nichts installieren und keine Domain kaufen.",
      },
      google: {
        question: "Findet Google mein Portfolio?",
        answer:
          "Nur wenn du es willst. Bis du „Suchmaschinen dürfen sie finden“ einschaltest, werden Suchmaschinen gebeten, die Seite aus ihren Ergebnissen herauszuhalten.",
      },
      update: {
        question: "Was passiert, wenn ich meinen Lebenslauf aktualisiere?",
        answer:
          "Mit aktivierter Synchronisierung übernimmt die Seite die Änderung von selbst. Ohne Synchronisierung sagt dir Otto, dass sich der Lebenslauf geändert hat, und du aktualisierst die Seite, wenn du so weit bist.",
      },
      design: {
        question: "Kann ich das Design später ändern?",
        answer:
          "Ja. Wechsle jederzeit zu einem der {designs} Designs. Deine Seite behält ihren Link und ihre Einstellungen.",
      },
    },
  },
} satisfies Translation<Messages["product"]>;
