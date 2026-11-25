import type { ExampleWords } from "../../../examples";

export const dataScientist: ExampleWords<"data-scientist"> = {
  role: "Data Scientist",
  card: "Modelle mit einem geschäftlichen Ergebnis, und wie jedes in die Produktion kam.",
  description:
    "Lebenslauf-Beispiel für Data Scientists: Machine-Learning-Zeilen mit Geschäftsergebnis und dem Weg in die Produktion, plus gefragte Fähigkeiten.",
  intro:
    "Lebensläufe in Data Science lesen sich oft wie Kurslisten: Modelle, Bibliotheken, Kennzahlen. Wer einstellt, will wissen, welches Modell in Produktion ging und was es verändert hat. Dieses Beispiel verknüpft jedes Modell mit einem Ergebnis, das auch jemanden außerhalb des Teams interessiert.",
  person:
    "Maya ist erfunden: eine Data Scientist mit 4 Jahren in Versicherung und Fintech in Boston. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Data Scientist",
    basics: {
      headline: "Data Scientist",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Data Scientist mit 4 Jahren Erfahrung im Bau von Pricing- und Betrugsmodellen in Python, vom ersten Notebook bis zur Produktion. Erklärt ein Modell gern den Menschen, die ihm vertrauen müssen.",
    experience: [
      {
        title: "Senior Data Scientist",
        bullets: [
          "Betrugsmodell für Schadensfälle in Python mit Gradient Boosting gebaut, das 2 von 3 bestätigten Betrugsfällen markiert statt 1 von 3 mit den alten Regeln.",
          "Modell als FastAPI-Service auf AWS mit Drift-Monitoring ausgeliefert, der 40.000 Schadensfälle pro Tag bewertet.",
          "Preisexperiment in 6 Regionen mit einer Holdout-Gruppe durchgeführt, das vor dem vollständigen Rollout 3 % mehr Marge zeigte.",
        ],
      },
      {
        title: "Data Scientist",
        bullets: [
          "Churn-Modell mit scikit-learn trainiert, mit dem das Support-Team 500 abwanderungsgefährdete Kunden pro Monat anrief, was die Abwanderung in dieser Gruppe um 11 % senkte.",
          "Feature-Pipeline in Spark und Airflow gebaut, die die Datenvorbereitung für das Modelltraining von 2 Tagen auf 3 Stunden verkürzte.",
          "25 Analysten in einem 6-wöchigen internen Kurs mit wöchentlichen Übungen die Grundlagen des Machine Learning beigebracht.",
        ],
      },
    ],
    projects: [
      {
        name: "Verspätungsprognosen im Nahverkehr",
        tech: "PyTorch, Pandas",
        bullets: [
          "Busverspätungen aus offenen Stadtdaten mit einem kleinen neuronalen Netz vorhergesagt und eine saisonale Baseline in einem zurückgehaltenen Testmonat um 14 % übertroffen.",
        ],
      },
    ],
    education: [
      { degree: "M.S.", field: "Statistik" },
      { degree: "B.S.", field: "Mathematik" },
    ],
    skills: [
      { label: "Programmiersprachen", items: ["Python", "SQL", "R"] },
      {
        label: "Modellierung",
        items: ["scikit-learn", "PyTorch", "Machine Learning", "Statistik", "A/B-Tests"],
      },
      { label: "Daten und Deployment", items: ["Spark", "Airflow", "AWS", "Docker", "MLOps"] },
    ],
  },
  lines: [
    {
      weak: "Machine-Learning-Modelle mit Python gebaut.",
      strong:
        "Betrugsmodell für Schadensfälle in Python mit Gradient Boosting gebaut, das 2 von 3 bestätigten Betrugsfällen markiert statt 1 von 3 mit den alten Regeln.",
    },
    {
      weak: "Modelle in Produktion gebracht.",
      strong:
        "Modell als FastAPI-Service auf AWS mit Drift-Monitoring ausgeliefert, der 40.000 Schadensfälle pro Tag bewertet.",
    },
    {
      weak: "Mit Stakeholdern an Experimenten gearbeitet.",
      strong:
        "Preisexperiment in 6 Regionen mit einer Holdout-Gruppe durchgeführt, das vor dem vollständigen Rollout 3 % mehr Marge zeigte.",
    },
  ],
  skills: [{ label: "Code" }, { label: "Modellierung" }, { label: "Daten und Produktion" }],
  tips: [
    {
      title: "Übersetze die Kennzahl",
      text: "AUC 0,91 sagt einer Führungskraft außerhalb des Teams wenig. „Markiert 2 von 3 Betrugsfällen statt 1 von 3“ heißt dasselbe, und alle können folgen. Gib gern beides an.",
    },
    {
      title: "Zeig den Weg in die Produktion",
      text: "Sag, wie das Modell bereitgestellt wurde, wie oft es läuft und woran du gemerkt hast, dass es noch funktioniert. Das unterscheidet einen Data Scientist von einem Notebook.",
    },
    {
      title: "Beschreib LLM-Arbeit klar",
      text: "Wenn du mit großen Sprachmodellen gebaut hast, sag, was das System getan hat, wie du es gemessen hast und was es gekostet hat. „An GenAI gearbeitet“ sagt nichts.",
    },
  ],
  mistakes: [
    {
      title: "Eine Liste von Algorithmen",
      text: "Random Forests, XGBoost, k-Means und LSTMs hintereinander lesen sich wie ein Lehrplan. Nenne die Methode in der Zeile, in der sie ein Problem gelöst hat.",
    },
    {
      title: "Accuracy bei unausgewogenen Daten",
      text: "„98 % Accuracy“ bei Betrug ist leicht, wenn Betrug nur 1 % der Fälle ausmacht, und das wissen Interviewer. Nutze die Kennzahl, die zum Problem passt, und sag, warum.",
    },
    {
      title: "Kein Gefühl für die Größenordnung",
      text: "Zeilen, Nutzer, Vorhersagen pro Tag, Geld, das auf dem Spiel steht. Ohne eine davon kann man ein Uniprojekt nicht von einem Produktivsystem unterscheiden.",
    },
  ],
  faq: [
    {
      question: "Sollte ein Lebenslauf als Data Scientist Kaggle-Wettbewerbe nennen?",
      answer:
        "Nur eine starke Platzierung, und nur, wenn du darüber sprechen kannst. Arbeit aus dem Job und ein gut erklärtes Projekt zählen meist mehr.",
    },
    {
      question: "Brauche ich einen Master im Lebenslauf?",
      answer:
        "Nenne deinen höchsten Abschluss und das Fach. Viele Teams stellen auch ohne Master ein, wenn die Arbeit die Fähigkeiten zeigt; im Abschnitt Berufserfahrung beweist du das.",
    },
    {
      question: "Wie technisch sollte ein Lebenslauf als Data Scientist sein?",
      answer:
        "Technisch genug für die Interviewer und einfach genug für den Recruiter, der ihn zuerst liest. Nenne Methode und Tools und beende die Zeile mit dem geschäftlichen Ergebnis.",
    },
  ],
};
