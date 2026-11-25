import type { Messages } from "..";
import type { Translation } from "../../types";

// The pricing page, plan cards and shared price words, in German. Plan names stay as they are.
export default {
  meta: {
    title: "Preise und Tarife: {free}, {pro} und {max}",
    description:
      "Ein Lebenslauf ist kostenlos: prüfen, verbessern und als PDF herunterladen. {pro} kostet {proPrice} pro Monat für Anpassen, Anschreiben und alle Formate; {max} kostet {maxPrice}. {close}",
    trialClose: "Teste {pro} {days} Tage für {trialPrice}.",
  },
  prices: {
    cancelAnytime: "Jederzeit kündbar.",
    intervalNames: { month: "Monatlich", year: "Jährlich" },
    perInterval: { month: "pro Monat", year: "pro Jahr" },
    eachInterval: { month: "Monat", year: "Jahr" },
    priceLabel: { month: "{price}/Monat", year: "{price}/Jahr" },
    trialOffer: "{plan} {days} Tage lang",
    trialHeadline: "Teste {offer}",
    trialSentence:
      "{price} für {days} Tage, danach {planPrice} {perInterval}. Du kannst jederzeit vor Ende der Testphase kündigen.",
    endsTrial: "Beendet heute deine {trialPlan}-Testphase und startet {plan} für {priceLabel}.",
    monthly: "{price} pro Monat. Jederzeit kündbar.",
    yearly:
      "{price} einmal im Jahr, etwa {perMonth} pro Monat. {savings} % weniger als bei monatlicher Zahlung.",
    yearlyFlat: "{price} einmal im Jahr.",
    perPeriod: { month: "pro Monat", trial: "während der Testphase" },
  },
  features: {
    fix: "Zeilenkorrekturen",
    tailor: "angepasste Versionen",
    letter: "Anschreiben, Kontaktnachrichten, Antworten und Interviewvorbereitungen",
    import: "KI-Auswertungen hochgeladener Lebensläufe",
    draft: "Entwürfe mit „Mit Otto erstellen“",
    github: "GitHub-Projektentwürfe",
  },
  credit: {
    line: "Aufgebraucht? Lade Guthaben ab {min} auf: {buys}.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "angepasste Versionen",
      letter: "Anschreiben",
      fix: "Zeilenkorrekturen",
      import: "KI-Auswertungen von Lebensläufen",
      draft: "Entwürfe mit „Mit Otto erstellen“",
      github: "GitHub-Projektentwürfe",
    },
    each: {
      tailor: "{price} pro angepasster Version",
      letter: "{price} pro Anschreiben",
      fix: "{price} pro Zeilenkorrektur",
      import: "{price} pro KI-Auswertung eines Lebenslaufs",
      draft: "{price} pro Entwurf mit „Mit Otto erstellen“",
      github: "{price} pro GitHub-Projektentwurf",
    },
    cents: "{cents} Cent",
  },
  page: {
    title: "Die Grundlagen sind kostenlos.",
    titleEm: "Mehr, wenn die Jobsuche Fahrt aufnimmt.",
    intro:
      "Prüfen, Verbessern und Herunterladen sind kostenlos. Pro bringt Ottos KI-Hilfe, alle passenden Jobs und den Tracker dazu.",
    otto: "Die Tarife ändern, wie viel ich jeden Monat helfe, nie, was ich tue oder nicht tue.",
    footnote:
      "Preise in US-Dollar. Es können Steuern anfallen. Bezahlte Tarife verlängern sich nach jedem {periods}, bis du kündigst.",
    billingQuestions: "Fragen zur Abrechnung",
    closingStudio: "Oder prüfe deinen Lebenslauf kostenlos",
  },
  plans: {
    howOften: "Wie oft du zahlst",
    period: {
      month: { short: "/Monat", spoken: "pro Monat" },
      year: { short: "/Jahr", spoken: "pro Jahr" },
    },
    free: "kostenlos",
    discount: "{percent} % Rabatt",
    yearlySavings: "{percent} % günstiger als monatlich",
    fairLimits:
      "Faire Limits für jede KI-Funktion, alle aufgeführt in den <link>Nutzungsbedingungen</link>.",
    referencePrice: "Referenzpreis ",
    manage: "Tarif verwalten",
    freeCta: "Lebenslauf kostenlos prüfen",
    popular: "Beliebt",
    trialEmail: "Wir schicken dir am Tag vor der Verlängerung eine E-Mail.",
    yearlyNote: "Etwa {perMonth} pro Monat statt {yearly} pro Jahr bei monatlicher Zahlung.",
    monthlyOnly: "Vorerst nur monatlich erhältlich.",
    wontStart: "{plan} startet nicht, du zahlst also nichts mehr.",
    thenPrice: "Danach {priceLabel}, außer du kündigst.",
    setToEnd: "Läuft aus, du wirst also nicht erneut belastet.",
    yourPlan: "Dein Tarif",
    currentPlan: "Aktueller Tarif",
    currentTrial: "Aktueller Tarif · Testphase bis {day}",
    includedIn: "In {plan} enthalten.",
    startNow: "{plan} jetzt starten",
    upgradeTo: "Upgrade auf {plan}",
    get: "{plan} holen",
    notOnPeriod: "Für deinen Abrechnungszeitraum noch nicht verfügbar.",
  },
  copy: {
    free: {
      summary: "Einen Lebenslauf prüfen, verbessern und herunterladen.",
      note: "Keine Karte nötig",
      outcomes: {
        upload: "Lade einen Lebenslauf hoch und sieh, was Bewerbermanagementsysteme lesen",
        fix: "Verbessere jede Zeile selbst oder mit Otto",
        download: "Lade ein sauberes PDF im Format {formats} herunter",
        matches: "Deine {count} passendsten Jobs",
        track: "Verfolge {applications}, mit einer Erinnerung zum Nachfassen",
      },
    },
    pro: {
      summary: "Ottos Hilfe für eine intensive Jobsuche.",
      lead: "Alles aus Free, plus:",
      note: "Jederzeit in deinem Konto kündbar",
      ai: {
        tailor: "Otto passt deinen Lebenslauf an jeden Job an",
        letters: "Anschreiben, Kontaktnachrichten und Interviewvorbereitung von Otto",
      },
      tools: {
        formats: "Alle {formats} Formate, bis zu {resumes} Lebensläufe und Word-Downloads",
        jobs: "Alle passenden Jobs aus {open} offenen Stellen, mit Filtern und gespeicherten Jobs",
        jobsNoCount: "Offene Jobs passend zu deinem Lebenslauf, mit Filtern und gespeicherten Jobs",
        track: "Verfolge bis zu {applications} Bewerbungen, mit Erinnerungen zum Nachfassen",
        share: "Freigabelinks und eine Portfolio-Website in allen {designs} Designs",
      },
    },
    max: {
      summary: "Für eine lange Suche oder viele Rollen.",
      lead: "Alles aus Pro, nur mehr davon:",
      note: "Jederzeit in deinem Konto kündbar",
      more: {
        tailor: "angepasste Versionen",
        letter: "Anschreiben, Kontaktnachrichten und Interviewvorbereitungen",
        fix: "Zeilenkorrekturen",
        import: "von KI gelesene Uploads",
        drafts: "Entwürfe aus deinen Notizen und GitHub",
      },
      ratio: {
        more: "Mehr {noun}",
        twice: "Doppelt so viele {noun}",
        times: "{times}-mal so viele {noun}",
        overTwice: "Mehr als doppelt so viele {noun}",
        overTimes: "Mehr als {times}-mal so viele {noun}",
      },
      keep: "Bis zu {resumes} Lebensläufe und {applications} verfolgte Bewerbungen",
    },
    resumes: { one: "{count} Lebenslauf", other: "{count} Lebensläufe" },
    applications: { one: "{count} Bewerbung", other: "{count} Bewerbungen" },
    trackedApplications: {
      one: "{count} verfolgte Bewerbung",
      other: "{count} verfolgte Bewerbungen",
    },
    limit: "{count} {label} {period}",
    quota: {
      free: "{resumes} · {fix} {fixLabel} {period} von Otto",
      paid: "{items} {period}",
      item: "{count} {label}",
      letters: "Anschreiben und Vorbereitungen",
    },
  },
  table: {
    title: "Alle Limits, Tarif für Tarif",
    intro:
      "Die Limits von Pro und Max werden jeden Monat zurückgesetzt, an dem Tag im Monat, an dem dein Tarif begonnen hat. Die Zeilenkorrekturen von Free werden am 1. des Monats zurückgesetzt.",
    whatYouGet: "Was du bekommst",
    included: "Enthalten",
    notIncluded: "Nicht enthalten",
    groups: {
      ai: "Ottos KI-Hilfe, pro Monat",
      resumes: "Lebensläufe und Downloads",
      jobs: "Jobs und Bewerbungen",
    },
    ai: {
      tailor: {
        label: "Angepasste Versionen",
        detail: "Dein Lebenslauf, umgeschrieben für einen Job",
      },
      letter: {
        label: "Anschreiben und Interviewvorbereitung",
        detail: "Anschreiben, Kontaktnachrichten, Antworten und Vorbereitung, zusammen gezählt",
      },
      fix: { label: "Zeilenkorrekturen mit Otto" },
      import: {
        label: "Von KI gelesene Uploads",
        detail: "Darüber hinaus und bei Free werden sie ohne KI eingelesen",
      },
      draft: { label: "Erste Entwürfe aus deinen Notizen" },
      github: { label: "Projektentwürfe aus GitHub" },
    },
    rows: {
      recruiterView: "Recruiter-Ansicht und Bearbeiten von Hand",
      resumes: "Lebensläufe",
      resumesDetail: "Angepasste Versionen zählen als Lebensläufe",
      formats: "Formate",
      allFormats: "Alle {count}",
      pdf: "PDF-Downloads",
      word: "Word-Downloads (.docx)",
      share: "Freigabelinks",
      portfolio: "Portfolio-Website",
      portfolioDetail: "{count} Designs, aus deinem Lebenslauf erstellt",
      matches: "Passende Jobs",
      allMatches: "Alle",
      closestMatches: "Die {count} besten",
      filters: "Filter und gespeicherte Jobs",
      tracked: "Verfolgte Bewerbungen",
      reminders: "Erinnerungen zum Nachfassen",
      hireFrom: "Woher jeder Job einstellen kann",
    },
  },
  faq: {
    trial: {
      question: "Wie funktioniert die Pro-Testphase?",
      answer:
        "Neue Konten können Pro {days} Tage lang testen, einmal pro Person. Du hinterlegst beim Bezahlen eine Karte und zahlst {price} (zzgl. etwaiger Steuern), wenn die Testphase beginnt. Wenn sie endet, startet Pro für {priceLabel}. Kündige jederzeit vor dem Ende der Testphase, und du zahlst nichts mehr. Während der Testphase kannst du ein Portfolio erstellen und in der Vorschau ansehen; öffentlich wird es, sobald Pro startet.",
    },
    free: {
      question: "Was bleibt kostenlos?",
      answer:
        "Hochladen mit dem einfachen Einlesen ohne KI, die Recruiter-Ansicht, Bearbeiten und Verbessern von Hand, {fix} Zeilenkorrekturen pro Monat mit Otto, {resumes}, die Formate Classic und Compact, PDF-Downloads, deine {matches} passendsten Jobs und {applications} mit Erinnerung. Keine Karte, kein Zeitlimit. Mehr Zeilenkorrekturen und der Rest von Ottos KI-Hilfe, die anderen Formate, bis zu {proResumes} Lebensläufe, Word-Downloads, die volle Liste passender Jobs mit Filtern, das Verfolgen von bis zu {proApplications} Bewerbungen, Freigabelinks und die Prüfung der Arbeitserlaubnis gibt es mit Pro. Wenn ein bezahlter Tarif endet, bleibt alles, was du erstellt hast: Du kannst es weiter öffnen, bearbeiten und herunterladen.",
    },
    payments: {
      question: "Wer wickelt die Zahlungen ab?",
      answer:
        "{merchant}, unser Merchant of Record. Der Anbieter wickelt deine Zahlung auf seiner eigenen Bezahlseite ab, schickt dir die Belege und kümmert sich um Umsatz- oder Mehrwertsteuer. Auf deiner Kartenabrechnung erscheint die Zahlung unter seinem Namen, beginnend mit {prefix}. Deine vollständige Kartennummer sehen wir nie.",
    },
    tax: {
      question: "Zahle ich zusätzlich Steuern?",
      answer:
        "Je nachdem, wo du wohnst, kann beim Bezahlen Umsatz- oder Mehrwertsteuer hinzukommen. Die Preise sind in US-Dollar, und deine Bank rechnet sie eventuell in deine Währung um.",
    },
    cancel: {
      question: "Wie kündige ich?",
      answer:
        "Auf deiner Kontoseite, jederzeit. Du behältst deinen Tarif bis zum Ende des bezahlten Zeitraums und wirst nicht erneut belastet.",
    },
    refund: {
      question: "Kann ich eine Erstattung bekommen?",
      answer:
        "Erstattungsanfragen bearbeitet {merchant}, unser Merchant of Record, nach seinen <link>Käuferbedingungen</link>. Du kannst außerdem jederzeit auf deiner Kontoseite kündigen und wirst dann nicht erneut belastet. Siehe auch unsere <link>Erstattungsrichtlinie</link>.",
    },
    limits: {
      question: "Welche Limits gibt es?",
      free: "Free hat {fix} {fixLabel} pro Monat (Hilfe bei der Zusammenfassung zählt als eine), zurückgesetzt zu Beginn jedes Monats, und keine andere KI-Hilfe.",
      monthly:
        "Die Limits von Pro und Max werden jeden Monat zurückgesetzt, wenn sich dein Tarif verlängert (bei einem Jahrestarif an dem Tag im Monat, an dem er begonnen hat): {list}.",
      monthlyItem: "{label}: {pro} bei Pro, {max} bei Max",
      trial:
        "Die {days}-tägige Pro-Testphase hat ein eigenes Kontingent für die ganze Testphase: {list}.",
      trialItem: "{count} {label}",
      kept: "Lebensläufe, angepasste Versionen mitgezählt: {freeResumes} bei Free, {proResumes} bei Pro und in der Testphase, {maxResumes} bei Max. Verfolgte Bewerbungen: {freeApplications} bei Free, {proApplications} bei Pro und in der Testphase, {maxApplications} bei Max.",
      uploads:
        "Uploads funktionieren immer: Bei Free oder nach den KI-Auswertungen werden sie stattdessen ohne KI eingelesen.",
    },
    switch: {
      question: "Kann ich zwischen Pro und Max wechseln?",
      answer:
        "Du kannst auf deiner Kontoseite von Pro auf Max wechseln, im Abrechnungszeitraum, den du schon hast. Dein Abo wird direkt umgestellt, du zahlst also nie doppelt: Die Differenz für den Rest des Zeitraums zahlst du sofort. In der Pro-Testphase beendet ein Start von Max die Testphase, und deine hinterlegte Karte wird sofort mit dem vollen Max-Preis (zzgl. etwaiger Steuern) belastet; die Testgebühr von {price} wird nicht abgezogen. Um zu Pro oder zwischen monatlich und jährlich zu wechseln, kündige auf deiner Kontoseite und wähle den neuen Tarif, sobald dein aktueller Zeitraum endet. Beim Wechsel zu Pro bleiben alle deine Lebensläufe und Bewerbungen erhalten; liegst du über den Limits von Pro, kannst du erst wieder welche hinzufügen, wenn du darunter bist.",
    },
    cancelled: {
      question: "Was passiert mit meinen Lebensläufen, wenn ich kündige?",
      answer:
        "Nichts. Sie gehören weiter dir, und du kannst sie weiterhin kostenlos bearbeiten und herunterladen. Ein veröffentlichtes Portfolio geht offline, bis du wieder Pro oder Max hast; es wird nicht gelöscht.",
    },
    credit: {
      question: "Was, wenn mein Kontingent vor der Verlängerung aufgebraucht ist?",
      answer:
        "Bei {pro} oder {max} kannst du Guthaben von {min} bis {maxUsd} auf einmal aufladen, in ganzen Dollar, zzgl. etwaiger Steuern. {buys}: {prices}. Guthaben wird erst genutzt, wenn das Monatskontingent für die Funktion oder das KI-Budget aufgebraucht ist, zu den Preisen, die zum Zeitpunkt der Nutzung angezeigt werden. Es ist vorausbezahlt und nach der Nutzung nicht erstattungsfähig, verfällt nie, solange dein Konto besteht, funktioniert nur mit einem bezahlten Tarif (nicht mit Free oder in der Testphase) und wird entfernt, wenn du dein Konto löschst. Ein Guthaben kann bis zu {balance} betragen.",
    },
  },
} satisfies Translation<Messages["pricing"]>;
