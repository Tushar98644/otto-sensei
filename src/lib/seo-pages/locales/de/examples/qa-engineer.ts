import type { ExampleWords } from "../../../examples";

export const qaEngineer: ExampleWords<"qa-engineer"> = {
  role: "QA-Engineer",
  card: "Bugs vor dem Release gefunden, schnellere Testläufe und eine wachsende Testabdeckung.",
  description:
    "Lebenslauf-Beispiel für QA-Engineers: Playwright-, Selenium- und API-Testzeilen zu Bugs in Produktion, Laufzeit und Abdeckung, plus Skills und Fehler.",
  intro:
    "Gutes Testen misst sich an dem, was nie bei Kunden ankommt. Ein QA-Lebenslauf muss genau das zeigen: Bugs, die vor dem Release gefunden wurden, kürzere Testläufe und wie viel vom Produkt deine Tests heute abdecken. Dieses Beispiel gibt jedem davon eine Zahl.",
  person:
    "Kevin ist erfunden: ein QA-Engineer mit 5 Jahren beim Testen von Zahlungs- und Reisebuchungs-Apps, mit Sitz in Austin, Texas. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als QA-Engineer",
    basics: {
      headline: "QA-Engineer",
      links: [{ label: "GitHub" }],
    },
    summary:
      "QA-Engineer mit 5 Jahren beim Testen von Web- und Mobile-Apps für Zahlungen und Reisen. Baut automatisierte Test-Suites in Playwright und Java, die Bugs vor dem Release finden und Testläufe kurz halten.",
    experience: [
      {
        title: "QA-Engineer",
        bullets: [
          "Playwright-Suite mit 640 End-to-End-Tests für Buchung und Checkout gebaut und den Regressionsdurchlauf von 3 Tagen manuellem Testen auf 40 Minuten verkürzt.",
          "API-Tests für 85 REST-Endpunkte in die CI/CD-Pipeline aufgenommen und die in Produktion gefundenen Bugs von 14 auf 4 pro Monat gesenkt.",
          "Flaky Tests in einem Jira-Dashboard verfolgt, die 30 schlimmsten behoben und die Erfolgsquote sauberer Builds von 82 % auf 99 % gesteigert.",
        ],
      },
      {
        title: "QA-Analyst",
        bullets: [
          "400 manuelle Testfälle für eine App für Kartenzahlungen geschrieben und die 150 meistgenutzten in Selenium mit Java automatisiert.",
          "3 Tage vor dem Release einen Rundungsfehler bei der Währungsumrechnung gefunden, der 2 % der ausländischen Kartenzahlungen zu hoch belastet hätte.",
          "Barrierefreiheit von 25 Checkout-Screens geprüft und 60 Probleme erfasst, die alle vor dem jährlichen Audit der Bank behoben waren.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Wirtschaftsinformatik" }],
    skills: [
      {
        label: "Automatisierung",
        items: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript"],
      },
      { label: "Tests", items: ["API-Tests", "Regressionstests", "Barrierefreiheit"] },
      { label: "Tools", items: ["Jira", "Postman", "Git", "Jenkins"] },
    ],
    certifications: [{ name: "ISTQB Certified Tester Foundation Level" }],
  },
  lines: [
    {
      weak: "Manuelle und automatisierte Tests für die Buchungs-App gemacht.",
      strong:
        "Playwright-Suite mit 640 End-to-End-Tests für Buchung und Checkout gebaut und den Regressionsdurchlauf von 3 Tagen manuellem Testen auf 40 Minuten verkürzt.",
    },
    {
      weak: "APIs getestet und Bugs an Entwickler gemeldet.",
      strong:
        "API-Tests für 85 REST-Endpunkte in die CI/CD-Pipeline aufgenommen und die in Produktion gefundenen Bugs von 14 auf 4 pro Monat gesenkt.",
    },
    {
      weak: "Arbeitete an der Behebung von Flaky Tests.",
      strong:
        "Flaky Tests in einem Jira-Dashboard verfolgt, die 30 schlimmsten behoben und die Erfolgsquote sauberer Builds von 82 % auf 99 % gesteigert.",
    },
  ],
  skills: [
    { label: "Automatisierung" },
    { label: "Sprachen und APIs" },
    { label: "Prozess und Tools" },
  ],
  tips: [
    {
      title: "Zähl Bugs in Produktion, nicht Testfälle",
      text: "400 Testfälle zu schreiben ist Aufwand; weniger Bugs in Produktion sind das Ergebnis. Stell die Suite, die du gebaut hast, neben den Rückgang an Produktionsbugs oder Support-Tickets, der darauf folgte.",
    },
    {
      title: "Zeig, wie lange ein Testlauf dauert",
      text: "Teams warten vor jedem Release auf Regressionsläufe. Wenn aus Tagen Minuten werden, spürt das jede Engineering-Führungskraft, also nenne Vorher und Nachher.",
    },
    {
      title: "Nenne den Bug, auf den du am stolzesten bist",
      text: "Eine Zeile über einen schweren Bug, den du gefunden hast, und was er gekostet hätte, zeigt das Urteilsvermögen, das eine Abdeckungszahl nicht zeigen kann.",
    },
  ],
  mistakes: [
    {
      title: "Jede Testart aufzählen",
      text: "Smoke, Sanity, Regression, UAT, Blackbox, Whitebox: Die Liste füllt Platz, ohne Können zu zeigen. Nenne die Testarten in Zeilen, die zeigen, was sie gefunden haben.",
    },
    {
      title: "Manuelle Arbeit zuerst bei einer Automatisierungsstelle",
      text: "Wenn die Anzeige Automatisierung verlangt, setz deine automatisierten Suites nach oben, auch kleine. Manuelles Testen zählt weiterhin, aber beginne mit dem Code, den du geschrieben hast.",
    },
    {
      title: "„Produktqualität sichergestellt“",
      text: "So eine Behauptung kann niemand prüfen. Sag, was du getestet hast, wie viel davon und was sich verändert hat: weniger Bugs in Produktion, ein kürzerer Lauf, eine höhere Erfolgsquote.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf als QA-Engineer?",
      answer:
        "Die Produkte, die du getestet hast, deine Automatisierungstools und Sprachen und Zahlen zu gefundenen Bugs, Bugs in Produktion, Testlaufzeit oder Abdeckung. Ergänze ein ISTQB-Zertifikat, falls du eins hast, aber lass deine Zeilen das Gewicht tragen.",
    },
    {
      question: "Wie zeige ich im Lebenslauf den Wechsel vom manuellen Testen zur Automatisierung?",
      answer:
        "Zeig die Automatisierung, die du schon gemacht hast, auch als Nebenaufgabe: Skripte, die du geschrieben, manuelle Fälle, die du automatisiert, einen Pipeline-Schritt, den du ergänzt hast. Ein kleines öffentliches Projekt hilft, wenn dein Code aus dem Job nicht öffentlich ist.",
    },
    {
      question: "Ist ein SDET ein anderer Job als ein QA-Engineer?",
      answer:
        "Ein SDET schreibt mehr Code und baut oft das Test-Framework selbst, aber Ottos Job-Matching ordnet beide derselben Art von Job zu. Wenn du dich auf SDET-Stellen bewirbst, setz deine codelastigsten Zeilen nach vorn.",
    },
  ],
};
