import type { ExampleWords } from "../../../examples";

export const customerSupport: ExampleWords<"customer-support"> = {
  role: "Kundensupport",
  card: "Volumen, Antwortzeit und CSAT, vom Spezialisten bis zur Teamleitung.",
  description:
    "Lebenslauf-Beispiel für den Kundensupport mit Zeilen zu Lösungszeit, CSAT und Volumen, dazu die gefragten Helpdesk-Tools und Fähigkeiten.",
  intro:
    "Supportteams laufen über Zahlen: Tickets pro Tag, Zeit bis zur ersten Antwort, CSAT, Eskalationen. Ein Support-Lebenslauf, der sie nutzt, liest sich wie von jemandem, der den Job schon kennt. Dieses Beispiel führt vom Telefonsupport bis zur Teamleitung.",
  person:
    "Luis ist erfunden: ein Teamleiter im Kundensupport mit 5 Jahren im Telefon- und Chat-Support für einen Onlineshop, mit Sitz in San Antonio. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf im Kundensupport",
    basics: {
      headline: "Teamleiter Kundensupport",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Teamleiter im Kundensupport mit 5 Jahren im Telefon-, Chat- und E-Mail-Support für einen Onlineshop mit 2 Millionen Kunden. Hält Warteschlangen kurz und Antworten freundlich und behebt die Ursachen wiederkehrender Tickets.",
    experience: [
      {
        title: "Teamleiter Kundensupport",
        bullets: [
          "Leitung eines 12-köpfigen Teams für Chat und E-Mail, mit einer ersten Antwort unter 2 Minuten und 92 % CSAT während des Feiertags-Sales.",
          "45 Hilfeartikel in Zendesk für die häufigsten Erstattungs- und Lieferfragen geschrieben, die diese Tickets um 25 % senkten.",
          "Wöchentliches Review wiederkehrender Tickets mit dem Lieferteam eingeführt, das einen Postleitzahlen-Bug hinter 1.500 Tickets pro Monat behob.",
        ],
      },
      {
        title: "Kundensupport-Spezialist",
        bullets: [
          "70 bis 90 Chats und Anrufe pro Tag auf Spanisch und Englisch beantwortet, mit einem CSAT von 94 % über 2 Jahre.",
          "20 neue Mitarbeitende zu Erstattungen und Eskalationen geschult und ihre Einarbeitung bis zur vollen Auslastung von 6 auf 4 Wochen verkürzt.",
          "Den Qualitätspreis des Quartals zweimal gewonnen, unter 80 Agents, für Gesprächsaudits und Lösungszeit.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Anglistik" }],
    skills: [
      {
        label: "Support",
        items: ["Kundensupport", "Kundenservice", "Helpdesk", "Eskalationsmanagement"],
      },
      { label: "Tools", items: ["Zendesk", "Freshdesk", "Google Sheets", "Excel"] },
      { label: "Sprachen", items: ["Spanisch", "Englisch"] },
    ],
  },
  lines: [
    {
      weak: "Kundenanfragen per Chat und Telefon bearbeitet.",
      strong:
        "70 bis 90 Chats und Anrufe pro Tag auf Spanisch und Englisch beantwortet, mit einem CSAT von 94 % über 2 Jahre.",
    },
    {
      weak: "Teamplayer, der in einem schnelllebigen Umfeld aufblüht.",
      strong:
        "Leitung eines 12-köpfigen Teams für Chat und E-Mail, mit einer ersten Antwort unter 2 Minuten und 92 % CSAT während des Feiertags-Sales.",
    },
    {
      weak: "Half neuen Mitarbeitenden, den Prozess zu lernen.",
      strong:
        "20 neue Mitarbeitende zu Erstattungen und Eskalationen geschult und ihre Einarbeitung bis zur vollen Auslastung von 6 auf 4 Wochen verkürzt.",
    },
  ],
  skills: [{ label: "Support" }, { label: "Tools" }, { label: "Office-Tools" }],
  tips: [
    {
      title: "Nenne die Kennzahlen, die dein Team berichtet",
      text: "Tickets oder Anrufe pro Tag, Zeit bis zur ersten Antwort, Lösungszeit, CSAT und Qualitätswerte. Wenn du eine Zahl nicht genau kennst, nimm eine Spanne, hinter der du stehen kannst.",
    },
    {
      title: "Zeig, dass du Ursachen behebst, nicht nur Tickets",
      text: "Hilfeartikel, die eine Ticketart verringert haben, ein Bug, den du hast beheben lassen, ein Prozess, den du geändert hast. Das bringt dich vom Spezialisten zur Teamleitung.",
    },
    {
      title: "Nenne deine Sprachen",
      text: "Viele Supportjobs in Indien und im Ausland stellen nach Sprache ein. Nenne jede Sprache, in der du Kunden betreuen kannst, in einer Zeile mit Fähigkeiten oder in einem Abschnitt „Sprachen“.",
    },
  ],
  mistakes: [
    {
      title: "„Teamplayer in einem schnelllebigen Umfeld“",
      text: "Ottos Zeilenprüfung markiert solche Sätze als Floskeln: Jeder Lebenslauf im Support enthält sie. Ein CSAT-Wert unter Druck sagt dasselbe und beweist es.",
    },
    {
      title: "Prozessnamen, die außerhalb niemand kennt",
      text: "Interne Namen für Queues und Tools sagen einem neuen Arbeitgeber nichts. Sag in einfachen Worten, worum es in dem Prozess ging.",
    },
    {
      title: "Einen BPO-Hintergrund verstecken",
      text: "Erfahrung im Telefonsupport bei einem BPO-Dienstleister ist echte Support-Erfahrung. Nenne die Branche des Kunden, wenn du kannst, und zeig die Zahlen.",
    },
  ],
  faq: [
    {
      question: "Welche Fähigkeiten sollte ein Lebenslauf im Kundensupport zeigen?",
      answer:
        "Die Kanäle, die du betreut hast (Telefon, Chat, E-Mail), die Helpdesk-Tools, die du genutzt hast, deine Sprachen und Zahlen zu Volumen, Antwortzeit und CSAT.",
    },
    {
      question: "Wie komme ich vom Kundensupport in eine Rolle als Teamleitung?",
      answer:
        "Zeig die Führungsarbeit, die du schon machst: neue Kolleginnen und Kollegen einarbeiten, Qualitätsaudits, Hilfeartikel, die Queue abdecken. Nenne zu jedem Punkt eine Zahl und sag im Profil, welchen Schritt du anstrebst.",
    },
    {
      question: "Soll ich Nachtschichten oder Wechselschichten erwähnen?",
      answer:
        "Nur, wenn die Stelle danach fragt. Steht in einer Anzeige Wechselschicht, beantwortet eine Zeile, dass du schon in Wechselschichten gearbeitet hast, die Frage, bevor sie gestellt wird.",
    },
  ],
};
