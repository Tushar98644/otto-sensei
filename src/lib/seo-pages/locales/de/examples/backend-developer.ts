import type { ExampleWords } from "../../../examples";

export const backendDeveloper: ExampleWords<"backend-developer"> = {
  role: "Backend-Entwickler",
  card: "Services, die Last, Latenz, Verfügbarkeit und Betriebskosten zeigen.",
  description:
    "Lebenslauf-Beispiel für Backend-Entwickler: Java- und Python-Zeilen zu Skalierung, Verfügbarkeit und Kosten, gefragte Fähigkeiten und häufige Fehler.",
  intro:
    "Backend-Arbeit ist oft unsichtbar, also muss der Lebenslauf sie sichtbar machen: wie viel Traffic, wie zuverlässig, wie teuer und was sich durch dich geändert hat. Dieses Beispiel macht aus jedem dieser Punkte eine Zahl.",
  person:
    "Ethan ist erfunden: ein Backend-Entwickler mit 3 Jahren in Logistiksoftware in Columbus, Ohio. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Backend-Entwickler",
    basics: {
      headline: "Backend-Entwickler",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Backend-Entwickler mit 3 Jahren Erfahrung im Bau von Bestell- und Tracking-Services mit Java, Python und PostgreSQL. Fokus auf Services, die auch bei Lastspitzen laufen und im Betrieb weniger kosten.",
    experience: [
      {
        title: "Backend-Entwickler",
        bullets: [
          "Sendungsverfolgungs-API in Spring Boot gebaut, die in Spitzenzeiten 1.200 Anfragen pro Sekunde mit einem p99 unter 150 ms beantwortet.",
          "Bestellereignisse von Datenbank-Polling auf Kafka umgestellt und die PostgreSQL-Last im Feiertagsgeschäft um 60 % gesenkt.",
          "Monatliche AWS-Rechnung durch passend dimensionierte Instanzen und die Verlagerung kalter Logs in günstigeren Speicher um 28 % gesenkt.",
        ],
      },
      {
        title: "Junior-Softwareentwickler",
        bullets: [
          "Python-Service mit FastAPI geschrieben, der für das Pricing-Team stündlich Rohstoffpreise aus 40 Quellen abruft.",
          "Docker und GitHub Actions in 6 Services eingeführt und die Zeit vom Merge bis zur Produktion von 2 Tagen auf 25 Minuten verkürzt.",
          "Race Condition bei Bestandsupdates behoben, durch die 3 % der Bestellungen überverkauft wurden, gefunden per Replay von Produktionslogs.",
        ],
      },
    ],
    projects: [
      {
        name: "Rate-Limiter",
        tech: "Go, Redis",
        bullets: [
          "Token-Bucket-Rate-Limiter mit Redis-Backend geschrieben und per Lasttest bis 20.000 Anfragen pro Sekunde geprüft.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Informationstechnik" }],
    skills: [
      { label: "Programmiersprachen", items: ["Java", "Python", "Go", "SQL"] },
      {
        label: "Services und Daten",
        items: ["Spring Boot", "FastAPI", "Kafka", "PostgreSQL", "Redis", "Microservices"],
      },
      { label: "Infrastruktur", items: ["AWS", "Docker", "GitHub Actions", "Linux", "Datadog"] },
    ],
  },
  lines: [
    {
      weak: "Backend-Entwicklung für das Tracking-System übernommen.",
      strong:
        "Sendungsverfolgungs-API in Spring Boot gebaut, die in Spitzenzeiten 1.200 Anfragen pro Sekunde mit einem p99 unter 150 ms beantwortet.",
    },
    {
      weak: "Half, die Cloud-Kosten zu senken.",
      strong:
        "Monatliche AWS-Rechnung durch passend dimensionierte Instanzen und die Verlagerung kalter Logs in günstigeren Speicher um 28 % gesenkt.",
    },
    {
      weak: "War an der Einrichtung von CI/CD beteiligt.",
      strong:
        "Docker und GitHub Actions in 6 Services eingeführt und die Zeit vom Merge bis zur Produktion von 2 Tagen auf 25 Minuten verkürzt.",
    },
  ],
  skills: [
    { label: "Programmiersprachen" },
    { label: "Daten und Messaging" },
    { label: "Architektur und Cloud" },
  ],
  tips: [
    {
      title: "Zeig Last, Latenz und Verfügbarkeit",
      text: "Anfragen pro Sekunde, p99-Latenz, Fehlerrate, Verfügbarkeit. Nach diesen Zahlen fragen Backend-Interviewer, also startet eine davon in einer Zeile genau das Gespräch, das du willst.",
    },
    {
      title: "Geld ist auch ein Ergebnis",
      text: "Eine niedrigere Cloud-Rechnung, weniger Server oder weniger Rufbereitschaft ist ein Ergebnis, das jede Führungskraft versteht. Sag, wie viel, und was du dafür geändert hast.",
    },
    {
      title: "Erklär die Domäne in wenigen Worten",
      text: "„Sendungsverfolgung“, „Kartenerstattungen“, „Rohstoffpreise“: Ein kurzes Substantiv sagt, was das System tut, damit die Zahlen etwas bedeuten.",
    },
  ],
  mistakes: [
    {
      title: "Nur Technologien aufzählen",
      text: "Eine Zeile wie „Java, Spring Boot, Kafka, Docker“ sagt, was du benutzt hast, nicht, was du getan hast. Setz die Tools in eine Zeile mit einem Ergebnis.",
    },
    {
      title: "Sich hinter „war beteiligt an“ verstecken",
      text: "Ottos Zeilenprüfung markiert passive und schwache Anfänge wie diesen, weil man nicht erkennt, was dein Anteil war. Sag mit deinem eigenen Verb, was du getan hast: gebaut, gesenkt, umgestellt, behoben.",
    },
    {
      title: "Den Umfang weglassen",
      text: "Eine Queue, die 50 Nachrichten am Tag verarbeitet, und eine, die 50.000 pro Sekunde verarbeitet, sind verschiedene Jobs. Sag, welche deine war.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf als Backend-Entwickler?",
      answer:
        "Deine Sprachen und Frameworks, die Systeme, die du gebaut hast, und Zahlen zu Last, Latenz, Verfügbarkeit oder Kosten. Ergänze ein Projekt, wenn deine Arbeit im Job unter NDA steht, und bleib bei ein bis zwei Seiten.",
    },
    {
      question: "Soll ich Systemdesign im Lebenslauf erwähnen?",
      answer:
        "Zeig es, statt es zu behaupten. Eine Zeile darüber, wie du einen Service aufgeteilt, eine Queue eingeführt oder für Lastspitzen geplant hast, sagt mehr als das Wort „Systemdesign“ in einer Liste von Fähigkeiten.",
    },
    {
      question: "Welches Format passt zu einem Backend-Lebenslauf?",
      answer:
        "Jedes schlichte, einspaltige Format. Dieses Beispiel nutzt Minimal, das es mit Pro gibt; Classic und Compact sind kostenlos und lesen sich genauso sauber.",
    },
  ],
};
