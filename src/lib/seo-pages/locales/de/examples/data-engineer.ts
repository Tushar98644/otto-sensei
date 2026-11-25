import type { ExampleWords } from "../../../examples";

export const dataEngineer: ExampleWords<"data-engineer"> = {
  role: "Data Engineer",
  card: "Pipelines mit Volumen, Aktualität, Ausfällen und Kosten in jeder Zeile.",
  description:
    "Lebenslauf-Beispiel für Data Engineers: Zeilen mit Spark, Airflow und SQL zu Volumen, Aktualität und Kosten, plus gefragte Fähigkeiten und Fehler.",
  intro:
    "Die Arbeit eines Data Engineers zeigt sich in Tabellen, denen andere vertrauen. Der Lebenslauf muss sagen, wie viele Daten bewegt wurden, wie aktuell sie ankamen, wie oft etwas kaputtging und was der Betrieb kostete. Dieses Beispiel setzt eine dieser Zahlen in jede Zeile.",
  person:
    "Marcus ist erfunden: ein Data Engineer mit 5 Jahren in der Analytik für Banken und Einzelhandel, mit Sitz in Charlotte, North Carolina. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Data Engineer",
    basics: {
      headline: "Data Engineer",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Data Engineer mit 5 Jahren Erfahrung im Bau von Batch- und Streaming-Pipelines mit Python, SQL und Spark. Fokus auf Tabellen, die pünktlich ankommen, ihre Prüfungen bestehen und jedes Quartal günstiger im Betrieb sind.",
    experience: [
      {
        title: "Data Engineer",
        bullets: [
          "40 nächtliche Airflow-Pipelines auf Spark und Snowflake neu gebaut und die Laufzeit von 6 Stunden auf 70 Minuten verkürzt, sodass Finanzberichte jeden Morgen vor 7:00 Uhr bereitstehen.",
          "Kartentransaktionen von stündlichen Batch-Loads auf Kafka-Streams umgestellt, sodass Betrugs-Dashboards statt 60 Minuten nur noch weniger als 2 Minuten hinterherhinken.",
          "dbt-Tests für 220 Modelle eingeführt, die rund 35 fehlerhafte Loads pro Quartal abfangen, bevor Analysten einen Bericht öffnen.",
          "Snowflake-Rechnung durch Clustering der 5 größten Tabellen und das Pausieren inaktiver Warehouses nach 5 Minuten um 31 % gesenkt.",
        ],
      },
      {
        title: "ETL-Entwickler",
        bullets: [
          "Python-ETL-Jobs geschrieben, die jede Nacht Verkaufsdaten aus 180 Filialen in Redshift luden und 12 manuell ausgeführte Tabellenexporte ersetzten.",
          "Sternschema für Bestellungen und Retouren entworfen, das 30 Analysten in Tableau abfragen, und die Ladezeit der Dashboards von 40 auf 6 Sekunden verkürzt.",
          "Alerts für verspätete und leere Loads eingerichtet und verpasste Morgenberichte von 9 auf 1 pro Monat gesenkt.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Informatik" }],
    skills: [
      { label: "Programmiersprachen", items: ["Python", "SQL", "Scala"] },
      { label: "Pipelines", items: ["Spark", "Airflow", "dbt", "Kafka"] },
      { label: "Warehouses und Cloud", items: ["Snowflake", "Redshift", "PostgreSQL", "AWS"] },
    ],
    certifications: [{ name: "Databricks Certified Data Engineer Associate" }],
  },
  lines: [
    {
      weak: "Arbeitete an Datenpipelines für das Finanzteam.",
      strong:
        "40 nächtliche Airflow-Pipelines auf Spark und Snowflake neu gebaut und die Laufzeit von 6 Stunden auf 70 Minuten verkürzt, sodass Finanzberichte jeden Morgen vor 7:00 Uhr bereitstehen.",
    },
    {
      weak: "Verantwortlich für die Datenqualität im gesamten Warehouse.",
      strong:
        "dbt-Tests für 220 Modelle eingeführt, die rund 35 fehlerhafte Loads pro Quartal abfangen, bevor Analysten einen Bericht öffnen.",
    },
    {
      weak: "Half bei der Umstellung des Reportings auf Echtzeit-Streaming.",
      strong:
        "Kartentransaktionen von stündlichen Batch-Loads auf Kafka-Streams umgestellt, sodass Betrugs-Dashboards statt 60 Minuten nur noch weniger als 2 Minuten hinterherhinken.",
    },
  ],
  skills: [
    { label: "Programmiersprachen und Verarbeitung" },
    { label: "Pipelines und Modellierung" },
    { label: "Warehouses und Cloud" },
  ],
  tips: [
    {
      title: "Gib jeder Pipeline eine Größe und eine Uhrzeit",
      text: "Zeilen pro Tag, Terabyte pro Monat, wie lange ein Lauf dauert und wann die Daten ankommen. Ohne Größe und Deadline lässt sich eine Pipeline nicht beurteilen, also schreib beides in die Zeile.",
    },
    {
      title: "Nenne, wer deine Tabellen liest",
      text: "Finanzberichte, Betrugs-Dashboards, ein Preismodell: Wer die Daten nutzt, zeigt, warum die Pipeline wichtig war, und liefert der Person im Interview eine gute erste Frage.",
    },
    {
      title: "Zähl die Ausfälle, die du verhindert hast",
      text: "Verspätete Loads, fehlgeschlagene Läufe, kaputte Daten, die Tests abgefangen haben, bevor jemand sie sah. Datenteams messen das, also sagt ein Vorher und Nachher mehr als „Datenqualität verbessert“.",
    },
  ],
  mistakes: [
    {
      title: "Ein Stack ohne Daten",
      text: "Spark, Airflow, Kafka, Snowflake und dbt in einer Zeile könnten jeden Data Engineer beschreiben. Setz jedes Tool neben die Aufgabe, die es erledigt hat, und die Zahl, die es bewegt hat.",
    },
    {
      title: "„Big Data“ ohne Größe",
      text: "Zwei Terabyte am Tag und 80 Gigabyte pro Woche sind beides echte Jobs, aber sehr unterschiedliche. Schreib das Volumen, das du verarbeitet hast, statt des Etiketts.",
    },
    {
      title: "Nur der Idealfall",
      text: "Im Interview wird nach der Nacht gefragt, in der eine Pipeline ausgefallen ist. Eine Zeile zu Backfills, verspäteten Daten oder einer Schemaänderung, die du aufgefangen hast, zeigt, dass du Pipelines in Produktion betrieben und nicht nur geschrieben hast.",
    },
  ],
  faq: [
    {
      question: "Was gehört in einen Lebenslauf als Data Engineer?",
      answer:
        "Die Pipelines, die du gebaut hast, die Tools, auf denen sie liefen, und Zahlen zu Volumen, Laufzeit, Aktualität, Ausfällen oder Kosten. Ergänze die Teams, die die Daten genutzt haben, eine kurze Liste von Fähigkeiten und eine Zertifizierung, falls du eine hast.",
    },
    {
      question: "Unterscheidet sich ein Lebenslauf als Data Engineer von einem als Datenanalyst?",
      answer:
        "Ja. Die Zeilen von Analysten enden mit einer Entscheidung, die jemand anhand der Zahlen getroffen hat; die Zeilen von Engineers enden mit Daten, die schneller, sauberer oder günstiger ankamen. Wenn du aus der Analyse ins Engineering wechselst, beginne mit den Pipelines, die du für deine eigenen Berichte gebaut hast.",
    },
    {
      question: "Brauche ich als Data Engineer eine Cloud-Zertifizierung?",
      answer:
        "Sie hilft, wenn eine Anzeige eine nennt, aber Zeilen, die zeigen, dass du Pipelines in dieser Cloud betrieben hast, zählen mehr. Eine aktuelle Zertifizierung der Plattform, die du am meisten nutzt, reicht völlig.",
    },
  ],
};
