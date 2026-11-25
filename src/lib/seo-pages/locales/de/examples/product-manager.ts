import type { ExampleWords } from "../../../examples";

export const productManager: ExampleWords<"product-manager"> = {
  role: "Product Manager",
  card: "Ergebnisse zuerst, mit der Nutzerforschung und den Experimenten dahinter.",
  description:
    "Lebenslauf-Beispiel für Product Manager: Zeilen, die Ergebnis, Weg dorthin und geführtes Team zeigen, plus gefragte Fähigkeiten und typische Fehler.",
  intro:
    "Ein Product Manager schreibt weder den Code noch zeichnet er die Screens, also muss der Lebenslauf zeigen, was sich durch seine Entscheidungen verändert hat. Dieses Beispiel beginnt jede Zeile mit einem Ergebnis und belegt es damit, wie das Team dorthin kam.",
  person:
    "David ist erfunden: ein Product Manager mit 6 Jahren Erfahrung, der bei einem Reiseunternehmen in Seattle von der Softwareentwicklung ins Produktmanagement gewechselt ist. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Product Manager",
    basics: {
      headline: "Product Manager",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Product Manager mit 3 Jahren im Produktmanagement und 3 in der Softwareentwicklung, mit Fokus auf Buchung und Zahlungen einer Reise-App. Liefert in kleinen Schritten, misst ehrlich und hält Dinge schriftlich fest.",
    experience: [
      {
        title: "Product Manager",
        bullets: [
          "Team von 7 Personen beim Neubau des Hotel-Checkouts geleitet und die Abschlussrate bei Buchungen in zwei Quartalen von 61 % auf 70 % gesteigert.",
          "In 30 Nutzerinterviews herausgefunden, dass Nutzer beim Schritt für Firmenrechnungen abbrachen, und ihn auf ein optionales Feld reduziert.",
          "Wöchentliche Produkt-Reviews in Amplitude mit Design und Engineering eingeführt, sodass ein defekter Funnel-Schritt nach 7 statt nach 30 Tagen auffällt.",
          "Roadmap für geteilte Zahlungen mit Apple Pay und Karte geschrieben, gestartet für 2 Millionen Nutzer mit einer Fehlerquote von 0,2 %.",
        ],
      },
      {
        title: "Associate Product Manager",
        bullets: [
          "12 A/B-Tests zu Suchfiltern in 5 Monaten durchgeführt und die 3 behalten, die die Suchen pro Sitzung steigerten.",
        ],
      },
      {
        title: "Softwareentwickler",
        bullets: [
          "Buchungs-APIs für eine Busticket-App gebaut, die in Spitzenzeiten 40.000 Buchungen pro Tag verarbeitete.",
          "Mit Spezifikationen für 2 Features in die Produktarbeit eingestiegen, was zum Wechsel in eine APM-Rolle führte.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Elektrotechnik und Technische Informatik" }],
    skills: [
      {
        label: "Produkt",
        items: [
          "Produktmanagement",
          "Roadmapping",
          "Nutzerforschung",
          "A/B-Tests",
          "Agile Methoden",
        ],
      },
      { label: "Tools", items: ["Jira", "Amplitude", "SQL", "Figma", "Confluence"] },
    ],
  },
  lines: [
    {
      weak: "Produkt-Roadmap für den Checkout gemanagt.",
      strong:
        "Team von 7 Personen beim Neubau des Hotel-Checkouts geleitet und die Abschlussrate bei Buchungen in zwei Quartalen von 61 % auf 70 % gesteigert.",
    },
    {
      weak: "Nutzerforschung durchgeführt.",
      strong:
        "In 30 Nutzerinterviews herausgefunden, dass Nutzer beim Schritt für Firmenrechnungen abbrachen, und ihn auf ein optionales Feld reduziert.",
    },
    {
      weak: "Mit funktionsübergreifenden Teams zusammengearbeitet, um Features zu liefern.",
      strong:
        "Roadmap für geteilte Zahlungen mit Apple Pay und Karte geschrieben, gestartet für 2 Millionen Nutzer mit einer Fehlerquote von 0,2 %.",
    },
  ],
  skills: [{ label: "Produktarbeit" }, { label: "Arbeitsweise" }, { label: "Daten und Design" }],
  tips: [
    {
      title: "Beginne mit dem Ergebnis",
      text: "Conversion, Bindung, Umsatz, gesparte Zeit, vermiedene Support-Tickets. Wähl die Zahl, die das Unternehmen verfolgt hat, setz sie an den Anfang und sag dann, wie das Team sie bewegt hat.",
    },
    {
      title: "Zeig, wie du entschieden hast",
      text: "Eine Zeile über Interviews, ein Experiment oder eine Datenabfrage zeigt, dass du auf Basis von Belegen entscheidest. Einstellende Führungskräfte suchen danach in jedem Produkt-Interview.",
    },
    {
      title: "Mach deinen Wechsel ins Produktmanagement sichtbar",
      text: "Wenn du aus Engineering, Design oder Support kommst, behalte diesen Job und ergänze eine Zeile über die Produktarbeit, die du dort gemacht hast. Das ist eine Stärke, keine Lücke.",
    },
  ],
  mistakes: [
    {
      title: "„Mit funktionsübergreifenden Teams zusammengearbeitet“",
      text: "Das macht jeder Product Manager, also sagt es nichts. Nenne, was das Team ausgeliefert hat und was sich verändert hat.",
    },
    {
      title: "Sich den Erfolg der ganzen Firma zuschreiben",
      text: "Wenn der Umsatz um 40 % wuchs, während du ein Feature verantwortet hast, sag, was dein Feature bewirkt hat. Interviewer fragen nach, und eine ehrliche kleinere Zahl hält stand.",
    },
    {
      title: "Nur Feature-Namen",
      text: "„Smart Filters gelauncht“ sagt außerhalb des Unternehmens nichts. Sag in ein paar einfachen Worten, was es für Nutzer bewirkt hat.",
    },
  ],
  faq: [
    {
      question: "Wie schreibe ich einen Lebenslauf als Product Manager ohne PM-Titel?",
      answer:
        "Behalte deine echten Titel und zeig die Produktarbeit darin: Spezifikationen, die du geschrieben, Research, das du durchgeführt, und Launches, die du geleitet hast. Ein kurzer Satz in der Zusammenfassung kann sagen, dass du ins Produktmanagement wechselst.",
    },
    {
      question: "Sollte ein Lebenslauf als Product Manager eine Seite lang sein?",
      answer:
        "Eine Seite bis etwa 5 Jahre Erfahrung, danach zwei Seiten, wenn auf der zweiten echte Ergebnisse stehen. Kürze alte Jobs auf ein oder zwei Zeilen, statt die Schrift zu verkleinern.",
    },
    {
      question: "Welche Kennzahlen sollte ein Product Manager in den Lebenslauf schreiben?",
      answer:
        "Die, die dein Team verfolgt hat: Conversion, Aktivierung, Bindung, Umsatz oder Kosten. Nenne Vorher und Nachher und wie lange es gedauert hat.",
    },
  ],
};
