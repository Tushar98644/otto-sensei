import type { ExampleWords } from "../../../examples";

export const softwareEngineer: ExampleWords<"software-engineer"> = {
  role: "Softwareentwickler",
  card: "Vier Jahre an Zahlungssystemen, mit dem Stack und einer Zahl in jeder Zeile.",
  description:
    "Komplettes Lebenslauf-Beispiel für Softwareentwickler: Zeilen mit Wirkung, gefragte Fähigkeiten, Tipps zum Jobtitel für jeden Markt und typische Fehler.",
  intro:
    "Einstellende Führungskräfte achten bei einem Lebenslauf in der Softwareentwicklung auf drei Dinge: was du ausgeliefert hast, wie groß es war und mit welchem Stack du es gebaut hast. Dieses Beispiel bringt alle drei in jede Zeile, damit Menschen und Bewerbermanagementsysteme sie finden.",
  person:
    "Imani ist erfunden: eine Softwareentwicklerin mit Schwerpunkt Backend und 4 Jahren an Zahlungssystemen in New York. Namen, Unternehmen und Zahlen sind ausgedacht; übernimm den Aufbau, nicht die Fakten.",
  resume: {
    title: "Lebenslauf als Softwareentwicklerin",
    basics: {
      headline: "Softwareentwicklerin",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Softwareentwicklerin mit 4 Jahren an Zahlungssystemen in Java, Go und AWS. Verantwortet Services vom Design-Review bis zur Rufbereitschaft und misst sie nach dem Launch.",
    experience: [
      {
        title: "Software Engineer II",
        bullets: [
          "Idempotenz-Schicht für ACH-Zahlungs-Callbacks in Go gebaut und doppelte Erstattungen von 0,4 % der Auszahlungen auf unter 0,05 % gesenkt.",
          "Abrechnungsbericht von einem nächtlichen Batch-Job auf Kafka-Streams umgestellt, sodass Händler abgerechnete Beträge innerhalb von 10 Minuten sehen.",
          "Umzug von 14 Services von EC2 auf Kubernetes in AWS mit einem weiteren Engineer geleitet, ohne Ausfallzeit für Kunden.",
          "Runbook für die Rufbereitschaft und Alert-Regeln in Grafana geschrieben und die Alarme pro Woche in zwei Quartalen von 22 auf 6 gesenkt.",
        ],
      },
      {
        title: "Software Engineer",
        bullets: [
          "REST-API für Rechnungsexporte in Java und Spring Boot ausgeliefert, die heute jeden Monat 1.800 kleine Unternehmen nutzen.",
          "p95-Latenz des Endpunkts für die Rechnungssuche mit zusammengesetzten Indizes und einem Redis-Cache von 1,2 s auf 280 ms gesenkt.",
          "Contract-Tests in die CI/CD-Pipeline eingebaut, die in einem Jahr 9 inkompatible API-Änderungen vor dem Release abfingen.",
        ],
      },
    ],
    projects: [
      {
        name: "ledgerlite",
        tech: "Go, PostgreSQL",
        bullets: [
          "Open-Source-Bibliothek für doppelte Buchführung veröffentlicht, die heute 3 Teams bei Paysprout für Wallet-Guthaben nutzen.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Informatik" }],
    skills: [
      { label: "Programmiersprachen", items: ["Java", "Go", "Python", "SQL"] },
      {
        label: "Backend",
        items: ["Spring Boot", "Kafka", "PostgreSQL", "Redis", "REST", "gRPC"],
      },
      { label: "Cloud", items: ["AWS", "Kubernetes", "Docker", "Terraform", "Grafana"] },
    ],
    certifications: [{ name: "AWS Certified Developer – Associate" }],
  },
  lines: [
    {
      weak: "Verantwortlich für die Wartung des Zahlungs-Backends.",
      strong:
        "Zahlungs-Backend ein Jahr lang mit Health Checks, Retries und einem getesteten Failover-Runbook auf 99,95 % Verfügbarkeit gehalten.",
    },
    {
      weak: "Arbeitete an der Verbesserung der Performance unserer APIs.",
      strong:
        "p95-Latenz der API für die Rechnungssuche mit zusammengesetzten Indizes und einem Redis-Cache von 1,2 s auf 280 ms gesenkt.",
    },
    {
      weak: "Wir haben unsere Services zu Kubernetes migriert.",
      strong:
        "14 Services mit einem weiteren Engineer von EC2 auf Kubernetes in AWS umgezogen, ohne Ausfallzeit für Kunden.",
    },
  ],
  skills: [
    { label: "Programmiersprachen" },
    { label: "Frameworks und Daten" },
    { label: "Cloud und Auslieferung" },
  ],
  tips: [
    {
      title: "Setz den Stack in die Zeile",
      text: "„Latenz mit einem Redis-Cache gesenkt“ zeigt Redis im Einsatz. Eine Fähigkeit, die nur in deiner Fähigkeiten-Liste steht, zählt weniger, bei Recruitern und bei Ottos Job-Abgleich, der sie als „Gelistet, nicht belegt“ markiert.",
    },
    {
      title: "Gib jeder Zeile eine Größe",
      text: "Anfragen pro Sekunde, Nutzer, Services, bewegtes Geld, gesparte Minuten. Eine Zahl reicht, um aus einer Aufgabe ein Ergebnis zu machen, und sie gibt dem Interviewer etwas, wonach er fragen kann.",
    },
    {
      title: "Schreib den Titel auf beide Arten",
      text: "Wenn deine Firma SDE-2 sagt, schreib „Software Engineer II (SDE-2)“. Recruiter in Indien suchen nach SDE-Titeln; Arbeitgeber im Ausland suchen nach „Software Engineer“, und beide sollen dich finden.",
    },
  ],
  mistakes: [
    {
      title: "Eine Liste mit 40 Tools",
      text: "Nenne, worüber du gern im Interview sprechen würdest. Tools, die du einmal angefasst hast, laden zu Fragen ein, die du nicht beantworten kannst, und sie verdecken die, die für den Job zählen.",
    },
    {
      title: "Zeilen über das Team, nicht über dich",
      text: "„Wir haben unsere Services migriert“ verbirgt deinen Anteil. Ottos Zeilenprüfung markiert „wir“ aus diesem Grund: Sag, was du getan hast, auch wenn andere geholfen haben.",
    },
    {
      title: "Zwei Spalten und Skill-Balken",
      text: "Ein Bewerbermanagementsystem liest quer über Spalten hinweg und kann keinen Balken lesen. Eine Spalte mit echtem Text hält deine Jobs, Daten und Fähigkeiten in der richtigen Reihenfolge.",
    },
  ],
  faq: [
    {
      question: "Wie lang sollte ein Lebenslauf als Softwareentwickler sein?",
      answer:
        "Eine Seite für die meisten mit weniger als 5 Jahren Berufserfahrung. Danach sind zwei Seiten in Ordnung, wenn jede Zeile ihren Platz verdient. Ottos Recruiter-Ansicht markiert alles, was länger als zwei Seiten ist.",
    },
    {
      question: "Soll ich meinen GitHub- oder Portfolio-Link angeben?",
      answer:
        "Ja, wenn er Arbeit zeigt, über die du gern sprechen würdest. Ein Link zu leeren oder verwaisten Repositories schadet mehr als gar kein Link. Pinne zuerst deine besten zwei oder drei Projekte.",
    },
    {
      question: "Soll ich mein CTC oder meine Kündigungsfrist in den Lebenslauf schreiben?",
      answer:
        "Nein. Recruiter in Indien fragen im Bewerbungsformular oder im ersten Gespräch nach aktuellem CTC (Gesamtvergütung), erwartetem CTC und Kündigungsfrist. Halte den Lebenslauf für deine Arbeit frei; nenne diese Zahlen, wenn du gefragt wirst.",
    },
  ],
};
