import type { ExampleWords } from "../../../examples";

export const accountant: ExampleWords<"accountant"> = {
  role: "Buchhalter",
  card: "Ein schnellerer, sauberer Abschluss: Abstimmungen, Prüfungen und die Kontrollen dahinter.",
  description:
    "Lebenslauf-Beispiel für Buchhalter mit Zahlen zu Monatsabschluss, Abstimmungen und Prüfungen, dazu die gefragten GAAP-, ERP- und Excel-Kenntnisse.",
  intro:
    "Die meisten Lebensläufe in der Buchhaltung listen dieselben Aufgaben: Buchungen, Abstimmungen, Monatsabschluss. Was einen davon abhebt, ist, wie gut das lief. Dieses Beispiel misst den Abschluss in Tagen, die Abstimmungen in Konten und Dollar und die Prüfung in Korrekturen.",
  person:
    "Megan ist erfunden: eine CPA mit 6 Jahren Erfahrung, zuerst in der Wirtschaftsprüfung bei einer kleinen Kanzlei, dann bei einem Hersteller in Indianapolis. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Buchhalterin",
    basics: {
      headline: "Senior-Buchhalterin, CPA",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "CPA mit 6 Jahren in Wirtschaftsprüfung und Unternehmensbuchhaltung, die heute den Monatsabschluss eines Herstellers mit 240 Mio. $ Umsatz leitet. Hält Abstimmungen sauber, Prüfungsunterlagen klar und den Abschluss im Zeitplan.",
    experience: [
      {
        title: "Senior-Buchhalterin",
        bullets: [
          "Monatsabschluss durch 120 wiederkehrende Buchungen als NetSuite-Vorlagen und einen täglichen Abschlusskalender von 9 auf 5 Arbeitstage verkürzt.",
          "65 Bilanzkonten monatlich abgestimmt und Altposten über 410.000 $ geklärt, die seit über einem Jahr unerklärt offen waren.",
          "Jahresabschlussprüfung mit einer externen Kanzlei geleitet und 180 Anforderungen fristgerecht geliefert, ohne eine einzige Prüfungskorrektur.",
          "Excel-Modell zur Bestandsbewertung für 3 Werke aufgebaut und vor der Prüfung 260.000 $ zu hoch bewertete unfertige Erzeugnisse aufgedeckt.",
        ],
      },
      {
        title: "Buchhalterin",
        bullets: [
          "Anlagenzugänge und Abschreibungen für 1.400 Anlagegüter gebucht und einen Fehler im Leasingplan nach ASC 842 über 95.000 $ korrigiert.",
          "Schritt-für-Schritt-Anleitungen für 14 Abschlussaufgaben geschrieben, sodass 2 neue Mitarbeitende ihre Konten bis zum zweiten Monat allein abschlossen.",
        ],
      },
      {
        title: "Prüfungsassistentin",
        bullets: [
          "11 Mandanten aus Industrie und Non-Profit-Sektor mit 5 Mio. $ bis 90 Mio. $ Umsatz geprüft, darunter Umsatzerlöse, Vorräte und Lohnabrechnung.",
          "Doppelte Lieferantenzahlung über 70.000 $ bei einem Non-Profit-Mandanten aufgedeckt, was zu einer neuen Freigabekontrolle für Zahlungen über 10.000 $ führte.",
        ],
      },
    ],
    education: [
      { degree: "M.Acc.", field: "Rechnungswesen" },
      { degree: "B.S.", field: "Rechnungswesen" },
    ],
    skills: [
      {
        label: "Rechnungswesen",
        items: [
          "GAAP",
          "Monatsabschluss",
          "Kontenabstimmung",
          "Buchungen",
          "Prüfungsbegleitung",
          "ASC 842",
        ],
      },
      { label: "Systeme", items: ["NetSuite", "Excel", "BlackLine", "QuickBooks"] },
    ],
    certifications: [{ name: "Certified Public Accountant (CPA)" }],
  },
  lines: [
    {
      weak: "Verantwortlich für den Monatsabschluss.",
      strong:
        "Monatsabschluss durch 120 wiederkehrende Buchungen als NetSuite-Vorlagen und einen täglichen Abschlusskalender von 9 auf 5 Arbeitstage verkürzt.",
    },
    {
      weak: "Kontenabstimmungen durchgeführt.",
      strong:
        "65 Bilanzkonten monatlich abgestimmt und Altposten über 410.000 $ geklärt, die seit über einem Jahr unerklärt offen waren.",
    },
    {
      weak: "Unterstützung bei der jährlichen Abschlussprüfung.",
      strong:
        "Jahresabschlussprüfung mit einer externen Kanzlei geleitet und 180 Anforderungen fristgerecht geliefert, ohne eine einzige Prüfungskorrektur.",
    },
  ],
  skills: [{ label: "Rechnungswesen" }, { label: "Systeme" }, { label: "Tabellen und Lizenzen" }],
  tips: [
    {
      title: "Miss den Abschluss",
      text: "Tage bis zum Abschluss, abgestimmte Konten, automatisierte Buchungen. Der Abschluss ist der Herzschlag des Jobs, also gib ihm eine Zahl für vorher und nachher.",
    },
    {
      title: "Nenne die Standards und das System",
      text: "Sag, welche GAAP-Themen du bearbeitet hast, etwa Umsatzrealisierung nach ASC 606 oder Leasing nach ASC 842, und in welchem ERP du abgeschlossen hast. Anzeigen nennen oft beides, und eine Übereinstimmung hilft Recruitern, dich einzuordnen.",
    },
    {
      title: "Setz das CPA dorthin, wo man es sieht",
      text: "Schreib CPA hinter deinen Namen oder in die Überschrift und nenne die Lizenz mit Bundesstaat und Jahr. Wenn du die Prüfungen noch ablegst, sag, welche Teile du bestanden hast.",
    },
  ],
  mistakes: [
    {
      title: "Die Stellenbeschreibung abschreiben",
      text: "„Buchungen und Abstimmungen vorbereitet“ steht schon in der Anzeige. Ergänze, wie viele, wie schnell und was du dabei entdeckt hast.",
    },
    {
      title: "Prüfungsergebnisse weglassen",
      text: "In der Abschlussprüfung wird die Arbeit in der Buchhaltung benotet. Kam deine ohne Korrekturen zurück oder mit weniger Feststellungen als im Vorjahr, dann sag das mit Zahlen.",
    },
    {
      title: "Jede Software, die du je benutzt hast",
      text: "Eine lange Liste von Buchhaltungssoftware drückt die eine, die zählt, nach unten. Beginne mit dem ERP, das die Anzeige nennt, und halte ältere Systeme kurz oder lass sie weg.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf in der Buchhaltung?",
      answer:
        "Dein CPA-Status, die Größe der Bücher, die du geführt hast, die Abschluss- und Abstimmungsarbeit, die du verantwortet hast, Prüfungsergebnisse und deine ERP- und Excel-Kenntnisse. Nutze Zahlen für Tage, Konten und Dollar.",
    },
    {
      question: "Soll ich die bestandenen Teile des CPA-Examens angeben?",
      answer:
        "Ja. Schreib „CPA candidate“ mit den bestandenen Teilen, etwa AUD und FAR, und dem Jahr, damit Recruiter sehen, dass du auf dem Weg bist. Sobald du die Lizenz hast, nenne stattdessen die Lizenz.",
    },
    {
      question: "Wie wechsle ich von der Wirtschaftsprüfung in ein Unternehmen?",
      answer:
        "Behalte den Prüfungsjob und zeig die Mandantenarbeit in Zahlen: wie viele Mandanten, welche Größe, was du geprüft hast. Ergänze dann Abschluss-, Abstimmungs- oder Systemarbeit, damit ein Controller sieht, dass du die Bücher führen kannst.",
    },
  ],
};
