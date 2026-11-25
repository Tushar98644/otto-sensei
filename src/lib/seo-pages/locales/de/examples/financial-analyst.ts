import type { ExampleWords } from "../../../examples";

export const financialAnalyst: ExampleWords<"financial-analyst"> = {
  role: "Finanzanalyst",
  card: "Prognosen, Modelle und Budgets, die zu einer Entscheidung im Unternehmen führten.",
  description:
    "Lebenslauf-Beispiel für Finanzanalysten: FP&A-Zeilen zu Prognosen, Budgets und Modellen hinter Entscheidungen, plus gefragte Excel- und Finanzkenntnisse.",
  intro:
    "Finanzanalysten werden daran gemessen, ob die Führung ihren Zahlen genug vertraut, um danach zu handeln. Deshalb nennt jede Zeile hier das Modell oder die Prognose, wie genau sie war, und die Entscheidung, die darauf beruhte: ein Preis, ein Budget oder eine Filiale, die nie eröffnet wurde.",
  person:
    "Ryan ist erfunden: ein FP&A-Analyst mit 4 Jahren bei einem Einzelhändler für Haus- und Wohnbedarf in Dallas, der mit einem Sommerpraktikum bei einer Bank angefangen hat. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Finanzanalyst",
    basics: {
      headline: "Finanzanalyst, FP&A",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Finanzanalyst mit 4 Jahren im FP&A eines Einzelhändlers mit 600 Mio. $ Umsatz. Erstellt die Prognosen, Budgets und Preismodelle, auf deren Basis die Führung entscheidet. Arbeitet mit Excel, SQL und NetSuite und erklärt die Zahlen in einem einseitigen Memo.",
    experience: [
      {
        title: "Senior-Finanzanalyst",
        bullets: [
          "Monatliche Umsatzprognose für 85 Filialen in Excel und SQL erstellt und den Prognosefehler durch Werbeaktionen und Wetterdaten im Modell von 9 % auf 3,5 % gesenkt.",
          "Amortisation von 6 geplanten Filialen modelliert und empfohlen, die 2 ohne Amortisation innerhalb von 3 Jahren zu streichen, was 7 Mio. $ an Kapital sparte.",
          "Monatlichen Soll-Ist-Vergleich mit 9 Abteilungsleitungen geführt und jede Abweichung über 50.000 $ in einem einseitigen Memo erklärt.",
          "Abweichungsbericht zum Monatsende mit Power Query automatisiert und von 3 Tagen auf 4 Stunden verkürzt.",
        ],
      },
      {
        title: "Finanzanalyst",
        bullets: [
          "Neue Liefergebühr anhand eines Modells mit 400.000 Bestellungen bepreist, was 2,1 Mio. $ Marge pro Jahr brachte, ohne messbaren Rückgang der Bestellungen.",
          "Jahresbudget für 4 Abteilungen über insgesamt 38 Mio. $ erstellt und 2 Wochen vor der Frist des Boards abgegeben.",
        ],
      },
      {
        title: "Praktikant Finanzanalyse",
        bullets: [
          "Cashflow-Modell für 25 Kreditprüfungen bei Kleinunternehmen gebaut, das 3 Kreditreferenten in ihren Kreditvorlagen nutzten.",
        ],
      },
    ],
    education: [{ degree: "B.B.A.", field: "Finanzwirtschaft" }],
    skills: [
      {
        label: "Finanzen",
        items: ["Finanzmodellierung", "Forecasting", "Budgetierung", "Abweichungsanalyse", "FP&A"],
      },
      { label: "Tools", items: ["Excel", "SQL", "Power Query", "NetSuite", "Power BI"] },
    ],
    certifications: [{ name: "CFA Level I (bestanden)" }],
  },
  lines: [
    {
      weak: "Monatliche Abweichungsberichte erstellt.",
      strong:
        "Monatlichen Soll-Ist-Vergleich mit 9 Abteilungsleitungen geführt und jede Abweichung über 50.000 $ in einem einseitigen Memo erklärt.",
    },
    {
      weak: "Betraut mit dem Aufbau der Umsatzprognose.",
      strong:
        "Monatliche Umsatzprognose für 85 Filialen in Excel und SQL erstellt und den Prognosefehler durch Werbeaktionen und Wetterdaten im Modell von 9 % auf 3,5 % gesenkt.",
    },
    {
      weak: "Unterstützung bei der Finanzmodellierung für neue Filialeröffnungen.",
      strong:
        "Amortisation von 6 geplanten Filialen modelliert und empfohlen, die 2 ohne Amortisation innerhalb von 3 Jahren zu streichen, was 7 Mio. $ an Kapital sparte.",
    },
  ],
  skills: [
    { label: "Finanzen" },
    { label: "Tabellen und Daten" },
    { label: "Systeme und Qualifikationen" },
  ],
  tips: [
    {
      title: "Sag, wie genau die Prognose war",
      text: "Prognosefehler, Budgetabweichung, wie oft die Führung das Modell genutzt hat. Genauigkeit ist die Zahl, die eine Finanzleitung am meisten interessiert, und nur wenige Lebensläufe nennen sie.",
    },
    {
      title: "Verknüpf jedes Modell mit einer Entscheidung",
      text: "Ein Modell, nach dem niemand gehandelt hat, ist eine Hausaufgabe. Nenne, was das Unternehmen deswegen getan hat: einen Preis geändert, eine Filiale ausgelassen, ein Budget verschoben.",
    },
    {
      title: "Zeig, wie groß dein Bereich war",
      text: "Umsatz, Budget oder Portfoliogröße zeigen sofort, auf welchem Level du arbeitest. Schreib die Größe als Dollarbetrag in die Zeile, etwa ein Budget von 38 Mio. $ über 4 Abteilungen.",
    },
  ],
  mistakes: [
    {
      title: "„Finanzberichte erstellt“",
      text: "Das macht jeder Analyst. Sag, welchen Bericht, wer ihn gelesen hat und was die Leser danach geändert haben.",
    },
    {
      title: "Excel aufzählen und dabei stehen bleiben",
      text: "Excel wird in diesem Job vorausgesetzt. Sag, was du damit gebaut hast, etwa eine treiberbasierte Prognose, ein Three-Statement-Modell oder einen automatisierten Abweichungsbericht, und was es gespart hat.",
    },
    {
      title: "Die Ergebnisse des Unternehmens beanspruchen",
      text: "Wenn das Unternehmen seine Ziele übertroffen hat, ist das nicht deine Zeile. Bleib bei der Prognose, Analyse oder Entscheidung, die du verantwortet hast, mit ihrer eigenen Zahl.",
    },
  ],
  faq: [
    {
      question: "Welche Fähigkeiten sollte ein Lebenslauf als Finanzanalyst zeigen?",
      answer:
        "Finanzmodellierung, Forecasting und Budgetierung, fast immer Excel und oft SQL, ein BI-Tool und das ERP des Unternehmens, etwa NetSuite oder SAP. Zeig jede davon in einer Zeile, in der sie zu einer Zahl geführt hat.",
    },
    {
      question: "Soll ich meinen CFA-Fortschritt im Lebenslauf angeben?",
      answer:
        "Ja, wenn er zur Stelle passt. Schreib das bestandene Level und das Jahr oder dass du Level-II-Kandidat bist, mit dem Prüfungstermin. In Investmentrollen zählt das mehr als im FP&A.",
    },
    {
      question: "Ist FP&A dasselbe wie eine Stelle als Finanzanalyst?",
      answer:
        "FP&A ist eine Art von Finanzanalyse: Planung, Budgetierung und Prognosen innerhalb eines Unternehmens. Investment- und Kreditanalysten sind andere Arten. Nutze den Titel aus der Stellenanzeige, wenn deine Arbeit dazu passt.",
    },
  ],
};
