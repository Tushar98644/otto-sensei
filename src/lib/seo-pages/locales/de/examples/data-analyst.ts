import type { ExampleWords } from "../../../examples";

export const dataAnalyst: ExampleWords<"data-analyst"> = {
  role: "Datenanalyst",
  card: "Arbeit mit SQL, Python und Power BI, die in einer echten Entscheidung endet.",
  description:
    "Lebenslauf-Beispiel für Datenanalysten: Zeilen mit SQL, Excel und Power BI, die zeigen, welche Entscheidung sich änderte, plus Fähigkeiten und Tipps.",
  intro:
    "Alle Datenanalysten können SQL und ein Dashboard-Tool, damit allein hebst du dich also nicht ab. Was dich abhebt, ist die Entscheidung, die deine Arbeit verändert hat: ein Preis, ein Budget, ein Prozess. Dieses Beispiel beendet jede Zeile mit einer davon.",
  person:
    "Emily ist erfunden: eine Datenanalystin mit 3 Jahren im Einzelhandel und bei Essenslieferungen in Houston. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Datenanalystin",
    basics: {
      headline: "Datenanalystin",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Datenanalystin mit 3 Jahren Erfahrung, die Vertriebs- und Lieferdaten in Entscheidungen für Operations- und Marketingteams verwandelt. Arbeitet vor allem mit SQL, Python und Power BI.",
    experience: [
      {
        title: "Datenanalystin",
        bullets: [
          "Power-BI-Dashboard zu Lieferzeiten nach Gebiet gebaut, das 30 City Manager in ihrem wöchentlichen Review nutzen.",
          "Herausgefunden, dass 18 % der verspäteten Bestellungen aus 4 Küchen mit einem gemeinsamen Fahrerpool kamen, was zu einer Personaländerung führte, die Verspätungen um ein Drittel senkte.",
          "SQL-Modelle in BigQuery für tägliche Bestellkennzahlen geschrieben, die 12 manuelle Excel-Berichte ersetzten und dem Team 10 Stunden pro Woche sparten.",
          "A/B-Test zur Kommunikation der Liefergebühr über 200.000 Bestellungen durchgeführt und so eine Änderung beibehalten, die Wiederholungsbestellungen um 4 % steigerte.",
        ],
      },
      {
        title: "MIS-Analystin",
        bullets: [
          "Wöchentlichen Bestandsbericht mit Python und Pandas automatisiert und von 6 Stunden Copy-and-paste auf 15 Minuten verkürzt.",
          "Excel-Modell zum Abverkauf pro Filiale gebaut, mit dem langsam drehende Ware vor dem Saisonschlussverkauf zwischen 45 Filialen umverteilt wurde.",
        ],
      },
    ],
    projects: [
      {
        name: "Niederschlag und Bestellungen",
        tech: "Python, Tableau",
        bullets: [
          "Öffentliche Niederschlagsdaten mit Bestellungen aus 2 Jahren verknüpft, um zu zeigen, wie Regen die Nachfrage je Stunde verschiebt, veröffentlicht als Tableau Story.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Statistik" }],
    skills: [
      {
        label: "Analyse",
        items: ["SQL", "Python", "Pandas", "Excel", "Statistik", "A/B-Tests"],
      },
      { label: "BI-Tools", items: ["Power BI", "Tableau", "BigQuery", "Google Sheets"] },
    ],
    certifications: [{ name: "Microsoft Certified: Power BI Data Analyst Associate" }],
  },
  lines: [
    {
      weak: "Dashboards und Berichte für das Management erstellt.",
      strong:
        "Power-BI-Dashboard zu Lieferzeiten nach Gebiet gebaut, das 30 City Manager in ihrem wöchentlichen Review nutzen.",
    },
    {
      weak: "Daten analysiert, um Erkenntnisse zu gewinnen.",
      strong:
        "Herausgefunden, dass 18 % der verspäteten Bestellungen aus 4 Küchen mit einem gemeinsamen Fahrerpool kamen, was zu einer Personaländerung führte, die Verspätungen um ein Drittel senkte.",
    },
    {
      weak: "Verantwortlich für wöchentliche Excel-Berichte.",
      strong:
        "Wöchentlichen Bestandsbericht mit Python und Pandas automatisiert und von 6 Stunden Copy-and-paste auf 15 Minuten verkürzt.",
    },
  ],
  skills: [{ label: "Abfragen und Code" }, { label: "Tabellen und BI" }, { label: "Methoden" }],
  tips: [
    {
      title: "Beende jede Zeile mit der Entscheidung",
      text: "„Dashboard gebaut“ ist eine Aufgabe. „Dashboard gebaut, mit dem 30 Manager ihr Personal planen“ ist ein Ergebnis. Für die Entscheidung bezahlt dich die einstellende Führungskraft.",
    },
    {
      title: "Nenne das Tool in der Zeile",
      text: "Anzeigen nennen meist SQL plus Power BI, Tableau oder Looker. Wenn du das genannte Tool genutzt hast, schreib es in die Zeile, in der du es eingesetzt hast, damit Ottos Job-Abgleich es als belegt findet und nicht nur als gelistet.",
    },
    {
      title: "MIS-Rollen zählen",
      text: "In Indien starten viele Analysten als MIS Executive. Lass den Titel, wie er war, und zeig die Analyse in den Zeilen: Automatisierung, Modelle und Berichte, die etwas verändert haben.",
    },
  ],
  mistakes: [
    {
      title: "Jeden Diagrammtyp aufzählen",
      text: "Tortendiagramme und Pivot-Tabellen sind für sich keine Fähigkeiten. Nenne die Tools und zeig dann, was eine Analyse verändert hat.",
    },
    {
      title: "Erkenntnisse ohne Zahl",
      text: "„Erkenntnisse gewonnen, die den Umsatz verbessert haben“ lässt sich nicht prüfen. Sag, was du gefunden hast, wie groß es war und was das Team danach getan hat.",
    },
    {
      title: "Eine Kaggle-Liste statt echter Arbeit",
      text: "Ein Projekt mit echten, unordentlichen Daten und einer klaren Frage schlägt fünf Tutorial-Notebooks. Setz Arbeit aus dem Job an die erste Stelle, wenn du sie hast.",
    },
  ],
  faq: [
    {
      question: "Welche Fähigkeiten sollte ein Lebenslauf als Datenanalyst zeigen?",
      answer:
        "SQL und ein Dashboard-Tool fast immer, Excel beinahe immer und oft Python oder R. Statistik und A/B-Tests zählen für Produkt- und Marketingteams. Zeig jede davon in einer Zeile, in der du sie eingesetzt hast.",
    },
    {
      question: "Soll ich als Datenanalyst ein Portfolio angeben?",
      answer:
        "Ja, wenn du ein Projekt hast, das du gut erklären kannst. Verlinke eine kurze Beschreibung oder ein Dashboard mit der Frage, den Daten, deinem Ergebnis und dem, was jemand daraufhin tun sollte.",
    },
    {
      question: "Unterscheidet sich ein Lebenslauf als Datenanalyst von einem als Data Scientist?",
      answer:
        "Vor allem in der Gewichtung. Analysten zeigen Entscheidungen, die aus Reporting und Analyse entstanden sind; Data Scientists zeigen Modelle, Experimente und wie diese in die Produktion kamen.",
    },
  ],
};
