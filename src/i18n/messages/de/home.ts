import type { Messages } from "..";
import type { Translation } from "../../types";

// The home page, in German.
export default {
  meta: {
    title: "Kostenloser ATS-Lebenslauf-Check und -Generator mit KI",
    description:
      "Kostenloser ATS-Lebenslauf-Check und -Generator mit KI-Hilfe von Otto, dazu Jobs passend zu deinem Lebenslauf, Bewerbungstracking, Interviewvorbereitung und eine Portfolio-Website.",
  },
  cta: {
    check: "Lebenslauf prüfen",
    continueWith: "Weiter mit {title}",
  },
  hero: {
    eyebrow: "Kostenlos starten",
    title: "Deine ganze Jobsuche,",
    titleEm: "an <b>einem Ort</b>.",
    lead: {
      check:
        "Prüfe und verbessere deinen Lebenslauf, dann finde Jobs, die am besten zu ihm passen.",
      track: "Verfolge Bewerbungen, bereite dich auf Interviews vor, teile ein Portfolio.",
    },
    featuresLabel: "Was Otto kann",
    features: {
      checker: "Lebenslauf-Check",
      jobs: "{count} offene Jobs",
      jobsNoCount: "Offene Jobs",
      emailTracking: "E-Mail-Tracking",
      interviewPrep: "Interviewvorbereitung",
      portfolio: "Portfolio-Website",
      extension: "Chrome-Erweiterung",
      extensionSoon: "Chrome-Erweiterung, bald",
    },
    noSignup: "Keine Anmeldung nötig. Deine Datei wird gelesen und dann gelöscht.",
    another: "Oder <link>prüfe eine andere Datei</link>. Sie wird gelesen und dann gelöscht.",
    jobPost: "Du hast eine Stellenanzeige? <link>Prüfe, wie gut du passt</link>.",
  },
  demo: {
    see: "Was du siehst",
    reads: "Was ein Bewerbermanagementsystem liest",
    views: { label: "Beispiel-Lebenslauf", see: "Was du siehst", reads: "Was die Software liest" },
    otto: "Otto, der Otter, lugt über den Fensterrand",
    plainText: "Reiner Text",
    mixed: "Fähigkeiten mit Jobs vermischt",
    captionTitle: "Beispiel-Lebenslauf",
    caption:
      "Spalten sehen für Menschen gut aus. Software liest Zeile für Zeile quer über sie hinweg.",
  },
  resume: {
    label:
      "Beispiel-Lebenslauf von {name}, Produktdesignerin. Fähigkeiten und Sprachen stehen in einer linken Spalte, die Berufserfahrung in einer rechten, mit kleinen Icons neben ihrer E-Mail und Telefonnummer.",
    role: "Produktdesignerin",
    headings: { skills: "Fähigkeiten", languages: "Sprachen", experience: "Berufserfahrung" },
    skills: { research: "Nutzerforschung", prototyping: "Prototyping" },
    languages: { english: "Englisch", spanish: "Spanisch" },
    jobs: {
      senior: {
        title: "Senior-Produktdesignerin",
        dates: "2021 – heute",
        bullet: "Checkout neu gestaltet. 18 % mehr Bestellungen.",
      },
      designer: {
        title: "Produktdesignerin",
        dates: "2018 – 2021",
        bullet: "Das Designsystem des Teams aufgebaut.",
      },
    },
  },
  upload: {
    opening: "{name} wird im Studio geöffnet.",
    oneFile: "Wähle immer nur eine Datei.",
    problems: {
      unsupported: "Dieser Dateityp wird nicht unterstützt.",
      unsupportedKinds:
        "Dieser Dateityp wird nicht unterstützt. Wähle eine Datei im Format {kinds}.",
      kinds: "{first} oder {last}",
      empty: "Diese Datei ist leer. Wähle eine andere.",
      tooBig: "Diese Datei ist zu groß. Das Limit liegt bei {limit}.",
    },
    drop: "Zieh deinen Lebenslauf hierher, um ihn zu prüfen",
    formats: "PDF oder Word (.docx), bis {size}",
  },
  how: {
    eyebrow: "So funktioniert’s",
    title: "Von der alten Datei zum sauberen PDF",
    intro: "Fünf Schritte. Du kannst nach jedem aufhören.",
    step: "Schritt {number} · {name}",
    steps: {
      upload: {
        name: "Hochladen",
        caption: "Zieh deine PDF- oder Word-Datei hinein oder fang bei null an.",
      },
      recruiterView: {
        name: "Recruiter-Ansicht",
        caption:
          "Sieh den Text, den Bewerbermanagementsysteme herausziehen, mit klaren Prüfungen und dem Grund für jede.",
      },
      fix: {
        name: "Zeilen mit Otto verbessern",
        caption:
          "Otto fragt nach der fehlenden Angabe und schreibt die Zeile dann aus deiner Antwort. Tipp sie ein oder sprich sie. Er erfindet nie Zahlen, und du übernimmst, bearbeitest oder überspringst jeden Vorschlag.",
      },
      tailor: {
        name: "An einen Job anpassen",
        caption:
          "Füge eine Stellenanzeige ein und sieh, welche Schlüsselwörter du hast und welche fehlen.",
      },
      download: {
        name: "Kostenloses PDF",
        caption:
          "Lade kostenlos ein sauberes PDF herunter und prüfe es dann noch einmal. Jedes Format liest sich von oben nach unten, mit Überschriften in eigenen Zeilen, auf Letter oder A4.",
      },
    },
    upload: { meta: "PDF · 1 Seite", reading: "Deine Datei wird gelesen" },
    checks: {
      meta: { one: "{count} Prüfung", other: "{count} Prüfungen" },
      items: {
        columns: {
          title: "Zweispaltiges Layout",
          detail: "Deine Fähigkeiten sind in deine Berufserfahrung gerutscht.",
        },
        icons: {
          title: "Icons in deiner Kontaktzeile",
          detail: "Sie werden zu wirren Zeichen. Einfache Wörter funktionieren besser.",
        },
        contact: {
          title: "E-Mail und Telefon gefunden",
          detail: "Recruiter können dich erreichen.",
        },
      },
    },
    fixer: {
      addNumber: "Zahl ergänzen",
      before: "Vorher: ",
      line: "Verantwortlich für die Betreuung der Social-Media-Konten",
      questions: "1 Frage",
      question: "Wie stark sind die Follower gewachsen?",
      you: "Du",
      saidOutLoud: "Laut gesagt",
      answer: "Sie haben sich in 6 Monaten verdreifacht. Ich habe jeden Tag kurze Videos gepostet.",
      looksGood: "Sieht gut aus",
      after: "Nachher: ",
      fixed: "Social-Media-Follower in 6 Monaten verdreifacht, durch tägliche Kurzvideos",
      updated: "Zeile aktualisiert",
    },
    tailor: {
      jobPost: "Stellenanzeige",
      jobTitle: "Senior Produktdesigner",
      onResume: "In deinem Lebenslauf",
      missing: "Fehlt",
      onlyIfTrue: "· nur ergänzen, wenn es stimmt",
      terms: { accessibility: "Barrierefreiheit", abTesting: "A/B-Tests" },
    },
    download: {
      before: "Vorher",
      beforeText: "Probleme in der alten Datei",
      after: "Nachher",
      afterText: "Probleme in deinem neuen PDF",
    },
  },
  jobs: {
    eyebrow: "Jobs · jeden Tag neu",
    title: "{count} offene Jobs, sortiert nach deinem Lebenslauf",
    titleNoCount: "Offene Jobs, sortiert nach deinem Lebenslauf",
    intro:
      "Otto liest jeden Tag die Karriereseiten von Unternehmen und zeigt dir nur Jobs in deinem Berufsfeld, die passendsten zuerst, jeweils mit einer klaren Begründung. Free zeigt deine besten {free}; Pro gleicht dich mit allen ab.",
    caption:
      "Die echte Jobs-Seite: Jemand aus dem Vertrieb mit einem Praktikum im digitalen Marketing wählt „Jede Marketing-Rolle“, und Otto sortiert Einstiegsjobs im Marketing nach SEO, Google Ads und HubSpot im Lebenslauf.",
    points: {
      matched: {
        title: "Deine Art von Arbeit, passend zu deinem Lebenslauf",
        text: "Otto versteht, was ein Jobtitel bedeutet. Als Software Engineer siehst du also Stellen als Backend Developer, aber keine aus Support oder Vertrieb. Jeder Job zeigt, was dein Lebenslauf hat und was ihm fehlt.",
      },
      visa: {
        title: "Visum und Arbeitserlaubnis, geprüft",
        text: "Bei Pro sagst du Otto, wo du arbeiten darfst: Stellen, die dich laut Anzeige nicht einstellen können, werden markiert, und ein Schalter blendet sie aus. Unternehmen auf den öffentlichen Sponsorenlisten für das US-H-1B-Visum und für Großbritannien sind entsprechend gekennzeichnet.",
      },
      role: {
        title: "Die Rolle, das Level und der Ort, die du willst",
        text: "Wähle eine Rolle, ein Level und einen Ort oder nur Remote. Zum Start leitet Otto sie aus deinem Lebenslauf ab.",
      },
      direct: {
        title: "Direkt vom Unternehmen",
        text: "Die Jobs kommen von den Karriereseiten der Unternehmen selbst und aus öffentlichen Job-Feeds in den USA, Großbritannien, Australien, Lateinamerika, Europa und mehr, jeden Tag neu gelesen. Jeder verlinkt auf die Originalanzeige.",
      },
    },
    link: "Meine passenden Jobs finden",
  },
  emailTracking: {
    eyebrow: "E-Mail-Tracking · Pro",
    title: "Deine Bewerbungen aktualisieren sich selbst",
    intro:
      "Bewerbungsmails sagen schon, wo jede Bewerbung steht. Leite sie einmalig an Otto weiter, und dein Board bleibt aktuell, ohne dass du eine einzige Karte verschiebst.",
    caption:
      "Das echte Board, während drei E-Mails ankommen: Das Dankeschön von Northwind fügt den Job hinzu, die Einladung von Brightloop verschiebt ihn mit Termin nach „Interviews“, und das Update von Acme schließt ihn ab.",
    points: {
      setup: {
        title: "Einmal einrichten, in Gmail",
        text: "Du bekommst deine eigene Otto-Adresse und einen Gmail-Filter, der nur Jobmails dorthin weiterleitet. Drei Schritte, ein paar Minuten, mit einem Test am Ende.",
      },
      board: {
        title: "Das Board bewegt sich von selbst",
        text: "Ein Dankeschön legt den Job unter „Beworben“ ab, eine Einladung zum Interview oder Test verschiebt ihn mit Termin nach „Interviews“, und Angebote und Absagen landen, wo sie hingehören. Eine Karte wandert nie zurück.",
      },
      rules: {
        title: "Nach Regeln gelesen, sparsam gespeichert",
        text: "Otto liest jede E-Mail mit festen Regeln, ohne KI, und behält nur die Domain des Absenders, den Betreff und was er gefunden hat. Mails, die er nicht verifizieren kann, warten für dich in der Liste „Bitte prüfen“.",
      },
    },
  },
  interviewPrep: {
    eyebrow: "Interviewvorbereitung · Pro",
    title: "Wissen, was sie fragen werden,",
    titleEm: "und was du antwortest.",
    intro:
      "Für jedes Interview liest Otto die Stellenanzeige und deinen Lebenslauf und schreibt ein Vorbereitungspaket für genau diesen Job. Dann übst du es laut, und Otto stellt die Fragen.",
    caption:
      "Ein echtes Vorbereitungspaket für ein Interview als Produktdesigner bei Northwind: die wahrscheinlichen Fragen, eine Geschichte aus dem Lebenslauf, die Runde zum Design-Handwerk und der Übungsmodus.",
    points: {
      questions: {
        title: "Wahrscheinliche Fragen, Runde für Runde",
        text: "Vom Einstieg bis zum Abschluss steht bei jeder Frage, was damit geprüft wird, welche Punkte du treffen solltest und welche Nachfrage zu erwarten ist. Danach kommen Fragen, die du selbst stellen kannst.",
      },
      stories: {
        title: "Geschichten aus deinen eigenen Zeilen",
        text: "Jede Geschichte beginnt bei einer Zeile in deinem Lebenslauf, erzählt als Situation, Aufgabe, Handlung und Ergebnis. Was dein Lebenslauf nicht sagt, bleibt eine Lücke, die du füllst, nie erfunden.",
      },
      craft: {
        title: "Eine Runde zu deinem Fach, dann üben",
        text: "Technische Rollen bekommen eine technische Runde zu deinen Projekten, Kernkonzepten und Systemdesign. Rollen in Design und Produktmanagement bekommen eine zu ihrem Handwerk. Dann führt Otto das Interview, eine Frage nach der anderen.",
      },
    },
    also: {
      title: "Außerdem in Otto",
      letters: {
        label: "Anschreiben",
        text: "Anschreiben, Kontaktnachrichten und Antworten auf Bewerbungsfragen, nur aus deinem Lebenslauf und der Stellenanzeige geschrieben.",
      },
      careerLog: {
        label: "Karrieretagebuch",
        text: "Jeden Monat eine Notiz von einer Minute zu deiner Arbeit, kostenlos in jedem Tarif. Bei Pro macht Otto aus den Notizen Lebenslaufzeilen mit deinen eigenen Zahlen.",
      },
    },
  },
  extension: {
    eyebrow: "Otto für Chrome",
    eyebrowSoon: "Otto für Chrome · bald verfügbar",
    title: "Schneller bewerben, direkt aus der Stellenanzeige",
    intro:
      "Sieh, wie gut du passt, bevor du die ganze Anzeige liest, speichere sie mit einem Klick auf deinem Board und lass Otto lange Bewerbungsformulare aus deinem Lebenslauf ausfüllen. Du prüfst jede Antwort und klickst selbst auf „Absenden“.",
    onPost: "In der Stellenanzeige",
    onForm: "Im Bewerbungsformular",
    points: {
      badge: {
        title: "Deine Passung direkt in der Anzeige",
        text: "Auf LinkedIn, Naukri und Karriereseiten von Unternehmen zeigt Ottos Badge, welche Fähigkeiten aus der Anzeige dein Lebenslauf hat und welche fehlen. Die Prüfung läuft in deinem Browser und schickt die Anzeige nirgendwohin.",
      },
      save: {
        title: "Im Tracker speichern",
        text: "„Speichern“ legt den Job unter „Zu bewerben“ auf deinem Bewerbungs-Board ab, mit einer Kopie der Anzeige, falls sie entfernt wird.",
      },
      tailor: {
        title: "„Anpassen“ und „Anschreiben“ aus der Anzeige",
        text: "Bei {plans} öffnet „Anpassen“ Otto mit deinem Lebenslauf, angepasst an diesen Job, und „Anschreiben“ mit einem Anschreiben dafür.",
      },
      fill: {
        title: "„Mit Otto ausfüllen“ in Bewerbungsformularen",
        text: "Bei {plans} füllt Otto Formulare von Greenhouse, Lever, Ashby und Workday aus deinem Lebenslauf und deinen gespeicherten Antworten aus. Du prüfst alles und klickst auf „Absenden“. Fragen zur Selbstauskunft oder Einwilligung füllt Otto nie aus.",
      },
    },
    post: {
      label:
        "Beispiel: Ottos Badge in der Ecke einer Stellenanzeige als {title}, mit {found} von {total} gefundenen Fähigkeiten; {missing} fehlt.",
      title: "Senior Produktdesigner (m/w/d)",
      where: "Remote, Europa",
      careers: "Karriere bei {company}",
      meta: "Stellenanzeige",
      about: "Über die Rolle",
      bring: "Was du mitbringst",
      found: "von <b>{total}</b> Fähigkeiten gefunden",
      missing: "Fehlt: <b>{skill}</b>",
      skill: "Barrierefreiheit",
      actions: { save: "Speichern", tailor: "Anpassen", letter: "Anschreiben" },
    },
    form: {
      label:
        "Beispiel: „Mit Otto ausfüllen“ im Bewerbungsformular von {company}, mit {filled} ausgefüllten Feldern, dem angehängten Lebenslauf, einer entworfenen Antwort auf „{question}“ und der Frage zum Geschlecht, die für dich frei bleibt.",
      window: "{company} · Bewerben",
      meta: "Bewerbungsformular",
      heading: "Auf diese Stelle bewerben",
      fields: {
        firstName: "Vorname",
        lastName: "Nachname",
        email: "E-Mail",
        company: "Aktuelles Unternehmen",
        portfolio: "Portfolio-Link",
      },
      resume: "Lebenslauf",
      question: "Warum {company}?",
      answer:
        "Mir gefällt, wie {company} komplexe Daten leicht lesbar macht, und ich würde dieselbe Sorgfalt in das Produkt einbringen, von der Recherche bis zum Prototyp.",
      draft: "Mit Otto entwerfen",
      selfId: "Freiwillige Selbstauskunft",
      gender: "Geschlecht",
      select: "Auswählen…",
      submit: "Bewerbung absenden",
      filled: "{count} Felder ausgefüllt und <b>{file}</b> angehängt.",
      leftForYou:
        "Für dich offen: 1 Frage zur Selbstauskunft oder Einwilligung. Die beantwortet Otto nie.",
      checkEvery:
        "Prüfe jede Antwort und klicke dann selbst auf „Absenden“. Otto schickt nie ein Formular ab.",
    },
    addToChrome: "Zu Chrome hinzufügen",
    newTab: "(öffnet in neuem Tab)",
    comingSoon: "Bald verfügbar",
    notInStore: "Noch nicht im Chrome Web Store.",
  },
  portfolio: {
    eyebrow: "Portfolio · für dich gehostet",
    title: "Ein echtes Portfolio,",
    titleEm: "online unter deinem eigenen Link.",
    intro:
      "Nicht einfach dein Lebenslauf als Webseite. Wähle eines von {count} Designs, und Otto füllt es mit deinen Projekten, deiner Arbeit, deinen Texten und Links. Wir hosten es, du musst also nichts einrichten. {offer}",
    offer: "Es ist in Pro enthalten.",
    offerTrial:
      "Es ist in Pro enthalten, und du kannst mit einer {days}-tägigen Testphase starten.",
    templates: {
      paper:
        "Von Hand gezeichnet: dein Name in Marker über einem Fuchs am Meer, getuschte Karten und wellige Unterstreichungen, bei Tag oder Nacht.",
      gazette:
        "Deine Seite als Zeitung von 1926: ein Titel in Frakturschrift, deine Schlagzeile, linierte Spalten und ein Nachrichtenticker.",
      reel: "Ein riesiger, rotierender Titel über einer 3D-Kugel, dann jedes Projekt in einem Geräterahmen.",
    },
    link: "Mein Portfolio erstellen",
  },
  wontDo: {
    title: "Was Otto nicht tut",
    pledges: {
      score: {
        claim: "Eine Punktzahl erfinden.",
        reason: "Du bekommst klare Prüfungen mit Begründung, keine rätselhafte Zahl von 100.",
      },
      numbers: {
        claim: "Deine Zahlen erfinden.",
        reason:
          "Otto fragt nach deinen echten Zahlen und Ergebnissen, und du bestätigst jede Änderung.",
      },
      download: {
        claim: "Geld für den Download verlangen.",
        reason:
          "Bearbeite und lade so viele PDFs herunter, wie du willst. Keine Bezahlschranke beim letzten Schritt.",
      },
      file: {
        claim: "Deine Datei behalten.",
        reason:
          "Wir lesen deinen Upload, um den Text zu bekommen, und verwerfen ihn dann. Deine Lebensläufe bleiben in deinem Browser, außer du meldest dich an, um sie zu sichern. <link>So gehen wir mit Daten um</link>",
      },
    },
  },
  pricingTeaser: {
    eyebrow: "Preise",
    title: "Die Grundlagen sind kostenlos.",
    titleEm: "Mehr, wenn die Jobsuche Fahrt aufnimmt.",
    free: "<b>{plan}:</b> Prüfe, verbessere und lade {resumes} als PDF herunter, mit {fixes} Zeilenkorrekturen pro Monat von Otto.",
    pro: "<b>{plan}, {price} pro Monat:</b> Anpassen, Anschreiben, alle passenden Jobs, bis zu {resumes} und {applications}. {close}",
    resumes: { one: "{count} Lebenslauf", other: "{count} Lebensläufe" },
    trackedApplications: {
      one: "{count} verfolgte Bewerbung",
      other: "{count} verfolgte Bewerbungen",
    },
    trial: "Teste {days} Tage für {price}.",
    link: "Preise ansehen",
  },
  faq: {
    title: "Bevor du startest",
    applications: { one: "{count} Bewerbung", other: "{count} Bewerbungen" },
    items: {
      free: {
        question: "Ist der Download wirklich kostenlos?",
        answer:
          "Ja. Bearbeiten, Recruiter-Prüfungen und PDF-Downloads sind kostenlos, ohne Bezahlschranke beim letzten Schritt, und Free enthält {fixes} Zeilenkorrekturen pro Monat mit Otto. Pro und Max bringen den Rest von Ottos KI-Hilfe, mehr Formate, mehr Lebensläufe und zusätzlich Word-Downloads.",
      },
      ats: {
        question: "Was ist ein ATS?",
        answer:
          "Ein Bewerbermanagementsystem (Applicant Tracking System): die Software, mit der die meisten Arbeitgeber Bewerbungen sammeln und sortieren. Es liest den Text in deiner Datei, und aufwendige Layouts können ihn durcheinanderbringen. Otto zeigt dir genau, was es liest.",
      },
      invent: {
        question: "Erfindet Otto Dinge in meinem Lebenslauf?",
        answer:
          "Nein. Otto fragt dich nach Fakten wie Zahlen und Ergebnissen und nutzt nur, was du ihm sagst. Du prüfst jede Änderung, bevor sie in deinen Lebenslauf kommt.",
      },
      talk: {
        question: "Kann ich sprechen statt tippen?",
        answer:
          "Ja. Die Felder, in die du für Otto schreibst, haben ein Mikrofon, auch bei Ottos Fragen, wenn er eine Zeile verbessert. Drück darauf und sprich, und drück noch einmal, wenn du fertig bist. Das funktioniert in jedem modernen Browser. In manchen Browsern wie Brave und Firefox musst du angemeldet sein. Otto behält nur den Text.",
      },
      account: {
        question: "Brauche ich ein Konto?",
        answer:
          "Nicht zum Prüfen, Bearbeiten oder Herunterladen. Backups und Ottos {fixes} Zeilenkorrekturen pro Monat brauchen ein kostenloses Konto: Melde dich mit Google oder einem 6-stelligen Code per E-Mail an, ohne Passwort. Der Rest von Ottos KI-Hilfe, die volle Liste passender Jobs (Free zeigt deine {matches} besten) und das Verfolgen von mehr als {applications} gibt es mit {pro}. {trialHeadline}: {trialSentence}",
      },
      data: {
        question: "Wo werden meine Daten gespeichert?",
        answer:
          "Deine Lebensläufe werden in deinem Browser gespeichert. Wenn du dich anmeldest, speichern wir zusätzlich ein Backup, damit du sie auf jedem Gerät öffnen kannst. Hochgeladene Dateien lesen wir, um den Text zu bekommen, und verwerfen sie dann. Details stehen in unserer <link>Datenschutzerklärung</link>.",
      },
      cancel: {
        question: "Kann ich jederzeit kündigen?",
        answer:
          "Ja. Kündige deinen Tarif auf deiner Kontoseite, wann immer du willst. Du behältst ihn bis zum Ende des bezahlten Zeitraums und zahlst danach nichts mehr.",
      },
      anyJob: {
        question: "Funktioniert es für jeden Job?",
        answer:
          "Ja, vom ersten Job bis zu Senior-Rollen, in jedem Bereich. Das Anpassen funktioniert mit jeder Stellenanzeige, die du einfügst. Otto liest Lebensläufe auf Englisch am besten. Die <link>Lebenslauf-Beispiele</link> zeigen {count} Jobs, von Berufseinsteigern bis zum Vertrieb.",
      },
    },
  },
  finalCta: {
    otto: "Otto, der Otter, liest einen Lebenslauf",
    title: "Sieh, was die Software sieht.",
    note: "Prüfen und PDFs sind kostenlos. Pro und Max bringen mehr Hilfe von Otto.",
  },
} satisfies Translation<Messages["home"]>;
