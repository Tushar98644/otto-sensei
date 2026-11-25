import type { ExampleWords } from "../../../examples";

export const businessAnalyst: ExampleWords<"business-analyst"> = {
  role: "Business Analyst",
  card: "Anforderungen, Prozesslandkarten und Daten, die die Arbeit eines Teams verändert haben.",
  description:
    "Lebenslauf-Beispiel für Business Analysts: Zeilen zu Anforderungen, Prozessen und SQL, die Wirkung zeigen, plus gefragte Fähigkeiten, Tools und Tipps.",
  intro:
    "Ein Business Analyst sitzt zwischen den Leuten, die einen Prozess betreiben, und denen, die ihn verändern. Der Lebenslauf muss beide Seiten zeigen: was du herausgefunden hast, was du aufgeschrieben hast und was besser wurde, als die Änderung live ging. Dieses Beispiel macht das für eine Bank und einen Versicherer.",
  person:
    "Natalie ist erfunden: eine Business Analystin mit 5 Jahren bei einer Bank und einem Versicherer in Charlotte, die aus der Schadenbearbeitung aufgestiegen ist. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Business Analystin",
    basics: {
      headline: "Business Analystin",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Business Analystin mit 5 Jahren in Banken und Versicherungen, die unübersichtliche Prozesse in klare Anforderungen und messbare Verbesserungen übersetzt. Arbeitet mit SQL, Excel und Power BI und ist bei Mitarbeitenden aus dem operativen Geschäft genauso zu Hause wie bei Entwicklern.",
    experience: [
      {
        title: "Senior Business Analystin",
        bullets: [
          "Kreditprozess für kleine Unternehmen über 4 Teams und 23 Übergaben abgebildet und die Anforderungen geschrieben, die die Genehmigungszeit von 19 auf 8 Tage senkten.",
          "140 User Stories mit Akzeptanzkriterien für ein neues Kreditportal geschrieben und Nutzertests mit 12 Kreditprüfern durchgeführt, die vor dem Launch 31 Fehler fanden.",
          "Mit SQL in Kreditdaten aus 3 Jahren nachgewiesen, dass 40 % der Nacharbeit auf 2 fehlende Felder im Antragsformular zurückging, die das Team dann zu Pflichtfeldern machte.",
          "Power-BI-Dashboard mit Krediten nach Bearbeitungsstand gebaut, das 15 Filialleitungen täglich nutzen, statt einer wöchentlich per E-Mail verschickten Tabelle.",
        ],
      },
      {
        title: "Business Analystin",
        bullets: [
          "Prozess der Schadenaufnahme dokumentiert, 6 doppelte Erfassungsschritte gefunden und per Release entfernt, was jedem Schadenregulierer 5 Stunden pro Woche sparte.",
          "Anforderungen von 30 Schadenregulierern für eine Statusseite zu Schadensfällen aufgenommen, die Statusanrufe im Callcenter um 22 % senkte.",
        ],
      },
      {
        title: "Sachbearbeiterin Schadenregulierung",
        bullets: [
          "60 Kfz-Schäden pro Woche bearbeitet und den ersten Leitfaden des Teams geschrieben, der zum Schulungsmaterial für 25 neue Mitarbeitende wurde.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Betriebswirtschaftslehre" }],
    skills: [
      {
        label: "Analyse",
        items: [
          "Anforderungserhebung",
          "Prozessmodellierung",
          "User Stories",
          "Abnahmetests (UAT)",
          "Datenanalyse",
        ],
      },
      { label: "Tools", items: ["SQL", "Excel", "Power BI", "Jira", "Confluence", "Visio"] },
    ],
    certifications: [{ name: "Certification of Capability in Business Analysis (CCBA)" }],
  },
  lines: [
    {
      weak: "Anforderungen von Stakeholdern aufgenommen.",
      strong:
        "Kreditprozess für kleine Unternehmen über 4 Teams und 23 Übergaben abgebildet und die Anforderungen geschrieben, die die Genehmigungszeit von 19 auf 8 Tage senkten.",
    },
    {
      weak: "Beteiligt an Projekten zur Prozessoptimierung.",
      strong:
        "Prozess der Schadenaufnahme dokumentiert, 6 doppelte Erfassungsschritte gefunden und per Release entfernt, was jedem Schadenregulierer 5 Stunden pro Woche sparte.",
    },
    {
      weak: "Verschiedene Datenanalysen mit SQL durchgeführt.",
      strong:
        "Mit SQL in Kreditdaten aus 3 Jahren nachgewiesen, dass 40 % der Nacharbeit auf 2 fehlende Felder im Antragsformular zurückging, die das Team dann zu Pflichtfeldern machte.",
    },
  ],
  skills: [{ label: "Analyse" }, { label: "Umsetzung" }, { label: "Datentools" }],
  tips: [
    {
      title: "Zeig den Prozess vorher und nachher",
      text: "Tage bis zur Genehmigung, entfernte Schritte, Fehler, gesparte Stunden. Deine Arbeit als Business Analyst zeigt sich darin, wie der Prozess nach der Änderung läuft, also miss ihn, bevor du anfängst.",
    },
    {
      title: "Zähl die Dokumente, die du geschrieben hast",
      text: "User Stories, Prozesslandkarten, Anforderungen und Testfälle. Sag, wie viele es waren und wer sie abgenommen hat; das zeigt, dass du eine Änderung vom Besprechungsraum bis zum Release tragen kannst.",
    },
    {
      title: "Setz SQL in eine Zeile, nicht nur in eine Liste",
      text: "Viele Anzeigen für Business Analysts verlangen SQL oder sehr gute Excel-Kenntnisse. Eine Zeile, in der eine Abfrage die Ursache eines Problems gefunden hat, beweist das besser als eine Liste von Fähigkeiten.",
    },
  ],
  mistakes: [
    {
      title: "„Schnittstelle zwischen Fachbereich und IT“",
      text: "Das wiederholt nur den Jobtitel. Sag, worauf sich beide Seiten dank dir geeinigt haben und was daraufhin live ging.",
    },
    {
      title: "Nur die Tools, nie die Veränderung",
      text: "In Jira, Visio und Confluence liegt die Arbeit, aber sie sind nicht die Arbeit selbst. Jede Zeile braucht einen Prozess, eine Entscheidung oder eine Zahl, die sich bewegt hat.",
    },
    {
      title: "Deine Jahre im operativen Geschäft verstecken",
      text: "Die Zeit in der Schadenbearbeitung, in der Abrechnung oder im Callcenter ist der Grund, warum du den Prozess verstehst. Behalte diesen Job im Lebenslauf, mit einer Zeile, die zeigt, dass du seine Abläufe verbessert hast.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf als Business Analyst?",
      answer:
        "Die Prozesse oder Systeme, die du analysiert hast, die Anforderungen, die du geschrieben hast, die Tools, die du genutzt hast, und was sich danach geändert hat: gesparte Zeit, weniger Fehler oder vermiedene Kosten. Ergänze eine ECBA-, CCBA- oder CBAP-Zertifizierung, falls du eine hast.",
    },
    {
      question: "Brauchen Business Analysts SQL im Lebenslauf?",
      answer:
        "Nicht jede Anzeige verlangt es, aber viele Anzeigen in den USA fragen danach, und du kannst damit ein Problem selbst in den Daten prüfen. Wenn du SQL genutzt hast, zeig in einer Zeile ein Ergebnis aus einer Abfrage.",
    },
    {
      question: "Wie wechsle ich aus dem operativen Geschäft in eine Rolle als Business Analyst?",
      answer:
        "Beschreib deinen aktuellen Job über die Analyse darin: einen Prozess, den du abgebildet hast, einen Bericht, den du gebaut hast, eine Verbesserung, die du vorgeschlagen hast. Im Profil kannst du sagen, dass du in die Business-Analyse wechselst.",
    },
    {
      question: "Ist ein Business Analyst dasselbe wie ein Datenanalyst?",
      answer:
        "Die Rollen überschneiden sich. Business Analysts konzentrieren sich auf Prozesse und die Anforderungen an eine Änderung, Datenanalysten auf Reporting und Analyse. Richte deine Zeilen auf das aus, was die Anzeige verlangt.",
    },
  ],
};
