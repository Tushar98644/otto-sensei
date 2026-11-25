import type { ExampleWords } from "../../../examples";

export const devopsEngineer: ExampleWords<"devops-engineer"> = {
  role: "DevOps-Engineer",
  card: "Deployments, Wiederherstellungszeit und Cloud-Kosten: die Zahlen, nach denen Bereitschaftsteams leben.",
  description:
    "Lebenslauf-Beispiel für DevOps: Kubernetes-, Terraform- und CI/CD-Zeilen zu Deploy-Tempo, Verfügbarkeit und Cloud-Kosten, plus Fähigkeiten und Fehler.",
  intro:
    "DevOps wird an dem gemessen, was nicht mehr passiert: fehlgeschlagene Deployments, lange Ausfälle, überraschende Cloud-Rechnungen. Ein Lebenslauf muss diese Ruhe in Zahlen fassen, etwa wie oft Teams ausliefern, wie schnell sie sich erholen und was die Plattform kostet. Dieses Beispiel zeigt jede davon.",
  person:
    "Sofia ist erfunden: Sie arbeitet seit 5 Jahren als DevOps-Engineer für Gesundheitssoftware und Onlinehandel, mit Sitz in Salt Lake City, Utah. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als DevOps-Engineer",
    basics: {
      headline: "DevOps-Engineer",
      links: [{ label: "GitHub" }],
    },
    summary:
      "DevOps-Engineer mit 5 Jahren Erfahrung im Betrieb von AWS- und Kubernetes-Plattformen für Produktteams. Baut Pipelines und Infrastructure as Code, damit Teams täglich ausliefern und sich in Minuten von Incidents erholen.",
    experience: [
      {
        title: "DevOps-Engineer",
        bullets: [
          "45 Services von manuell aufgesetzten EC2-Servern mit Helm auf Kubernetes migriert und die Deployments von 3 pro Woche auf 20 pro Tag gesteigert.",
          "Terraform-Module für Netzwerke, Datenbanken und Cluster geschrieben, die heute 9 Produktteams nutzen, und die Einrichtung neuer Umgebungen von 2 Wochen auf 1 Tag verkürzt.",
          "Alerts in Prometheus und Grafana auf Basis von Service-Level-Objectives eingerichtet und die mittlere Wiederherstellungszeit (MTTR) von 75 auf 18 Minuten gesenkt.",
          "AWS-Rechnung durch Batch-Jobs auf Spot-Instanzen und das Löschen von 600 ungenutzten Volumes um 38.000 $ pro Monat gesenkt.",
        ],
      },
      {
        title: "Cloud-Engineer",
        bullets: [
          "GitHub-Actions-Pipeline mit automatisierten Tests und Rollbacks per Klick gebaut, sodass statt jedes 8. nur noch jedes 40. Release fehlschlug.",
          "Ansible-Playbooks geschrieben, die 300 Linux-Server in einer Nacht patchten statt verteilt über 2 Wochenenden.",
          "4 Disaster-Recovery-Übungen pro Jahr durchgeführt und die Wiederherstellungszeit der Datenbank von 6 Stunden auf 45 Minuten gesenkt.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Technische Informatik" }],
    skills: [
      { label: "Cloud", items: ["AWS", "Terraform", "Kubernetes", "Helm", "Docker"] },
      {
        label: "Auslieferung und Monitoring",
        items: ["GitHub Actions", "Jenkins", "Prometheus", "Grafana", "Datadog"],
      },
      { label: "Skripting", items: ["Python", "Bash", "Go", "Linux"] },
    ],
    certifications: [{ name: "Certified Kubernetes Administrator (CKA)" }],
  },
  lines: [
    {
      weak: "War an der Migration von Services auf Kubernetes beteiligt.",
      strong:
        "45 Services von manuell aufgesetzten EC2-Servern mit Helm auf Kubernetes migriert und die Deployments von 3 pro Woche auf 20 pro Tag gesteigert.",
    },
    {
      weak: "Monitoring und Rufbereitschaft für die Produktion übernommen.",
      strong:
        "Alerts in Prometheus und Grafana auf Basis von Service-Level-Objectives eingerichtet und die mittlere Wiederherstellungszeit (MTTR) von 75 auf 18 Minuten gesenkt.",
    },
    {
      weak: "Verantwortlich für die Release-Pipeline.",
      strong:
        "GitHub-Actions-Pipeline mit automatisierten Tests und Rollbacks per Klick gebaut, sodass statt jedes 8. nur noch jedes 40. Release fehlschlug.",
    },
  ],
  skills: [
    { label: "Cloud und Infrastruktur" },
    { label: "Container und Auslieferung" },
    { label: "Monitoring und Skripting" },
  ],
  tips: [
    {
      title: "Nutze die vier Delivery-Kennzahlen",
      text: "Wie oft du deployst, wie lange eine Änderung bis in die Produktion braucht, wie viele Releases fehlschlagen und wie schnell du dich erholst. Engineering-Leitungen verfolgen genau diese Zahlen, also wirkt eine davon in einer Zeile souverän.",
    },
    {
      title: "Zähl die Teams, die du entlastet hast",
      text: "Plattformarbeit machst du für andere Engineers. Sag, wie viele Teams oder Services nutzen, was du gebaut hast, und wie viel Wartezeit das aus ihrer Woche genommen hat.",
    },
    {
      title: "Gib Cloud-Einsparungen einen Dollarbetrag",
      text: "Eine monatliche oder jährliche Einsparung in Dollar ist eine Zeile, die Finanzen und Engineering gleichermaßen lesen. Nenne, was du dafür geändert hast, etwa Spot-Instanzen, Rightsizing oder Speicherklassen.",
    },
  ],
  mistakes: [
    {
      title: "Eine Wand aus Zertifikats-Badges",
      text: "Sechs Cloud-Badges über deiner Arbeit schieben die Belege nach unten. Behalte die ein oder zwei, die die Anzeige verlangt, und lass deine Zeilen den Rest zeigen.",
    },
    {
      title: "Kein Incident in Sicht",
      text: "Fast jedes DevOps-Interview fragt nach einem Ausfall. Eine Zeile zur Wiederherstellungszeit, zu einer Korrektur aus einem Postmortem oder zu einer Übung, die du geleitet hast, zeigt, dass du Bereitschaft hattest und nicht nur YAML geschrieben hast.",
    },
    {
      title: "Das Tool ist neu, aber was wurde besser?",
      text: "„Kubernetes eingeführt“ sagt, was du installiert hast, nicht, was besser wurde. Ergänze die Zahl der Deployments, die Wiederherstellungszeit oder die Kosten von vorher und nachher.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf als DevOps-Engineer?",
      answer:
        "Die Clouds und Tools, die du betreibst, die Plattformen, die du gebaut hast, und Zahlen zu Deployment-Frequenz, Verfügbarkeit, Wiederherstellungszeit oder Kosten. Ergänze die Teams, die sich auf deine Arbeit verlassen haben, und ein oder zwei aktuelle Zertifizierungen.",
    },
    {
      question: "Ist ein DevOps-Engineer dasselbe wie ein Site Reliability Engineer?",
      answer:
        "Die Arbeit überschneidet sich stark, und Ottos Job-Matching ordnet beide Titel derselben Art von Job zu. Nutze den Titel aus der Anzeige in deiner Überschrift und beginne bei SRE-Rollen mit Zeilen zu Verfügbarkeit und Wiederherstellung, bei DevOps-Rollen mit Zeilen zur Auslieferung.",
    },
    {
      question: "Wie wechsle ich von der Systemadministration zu DevOps?",
      answer:
        "Zeig die Automatisierung in deinem aktuellen Job: Skripte, die manuelle Schritte ersetzt haben, Server, die du mit Ansible gepatcht hast, eine Pipeline, die du aufgesetzt hast. Solche Zeilen lesen sich als DevOps-Arbeit, egal, wie dein Titel lautete.",
    },
  ],
};
