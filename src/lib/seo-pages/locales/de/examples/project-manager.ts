import type { ExampleWords } from "../../../examples";

export const projectManager: ExampleWords<"project-manager"> = {
  role: "Projektmanager",
  card: "Projekte, pünktlich und im Budget abgeschlossen, mit Umfang, Team und Risiken dahinter.",
  description:
    "Lebenslauf-Beispiel für Projektmanager: Zeilen zu Umfang, Budget, Zeitplan und Teamgröße, plus PMP- und Agile-Kenntnisse, Tipps und typische Fehler.",
  intro:
    "Einstellende Führungskräfte lesen einen Lebenslauf als Projektmanager mit drei Fragen im Kopf: Wie groß waren die Projekte, wurden sie pünktlich und im Budget abgeschlossen, und was hast du getan, als eines aus dem Plan lief? Dieses Beispiel beantwortet alle drei in jedem Job.",
  person:
    "Nicole ist erfunden: eine PMP-zertifizierte Projektmanagerin mit 7 Jahren Erfahrung mit Software-Einführungen und Büroumzügen für einen Gesundheitsverbund in Chicago. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Projektmanagerin",
    basics: {
      headline: "Projektmanagerin, PMP",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Projektmanagerin mit 7 Jahren Erfahrung in der Leitung von Software-Einführungen, Klinik-Eröffnungen und Büroumzügen für einen Gesundheitsverbund. Plant im Detail, meldet Risiken früh und hält Budgets von bis zu 4 Mio. $ im Plan.",
    experience: [
      {
        title: "Senior-Projektmanagerin",
        bullets: [
          "Einführung eines neuen Systems zur Terminplanung in 42 Kliniken in 14 Monaten geleitet, 3 Wochen vor Plan und 180.000 $ unter dem Budget von 2,6 Mio. $.",
          "Team von 11 Personen aus IT, Klinikbetrieb und Anbieter geführt, mit einem wöchentlichen Risikoprotokoll, das 2 Probleme bei der Datenmigration vor dem Go-live aufdeckte.",
          "Nach einem Pilot in 6 Kliniken SMS-Erinnerungen in den Rollout aufgenommen und so die Quote versäumter Patiententermine von 14 % auf 9 % gesenkt.",
          "Prozess für Projektanfragen in Jira und Confluence aufgesetzt, der 60 Anfragen pro Jahr nach Kosten und Nutzen ordnet, sodass die Leitung Projekte in einem Meeting freigibt.",
        ],
      },
      {
        title: "Projektmanagerin",
        bullets: [
          "Umzug von 380 Mitarbeitenden in eine neue Zentrale an 2 Wochenenden geleitet, ohne verlorenen Arbeitstag und mit jedem Arbeitsplatz am Montagmorgen einsatzbereit.",
          "3 Klinik-Eröffnungen termingerecht umgesetzt, mit einem gemeinsamen Plan für Bau, Personal und Ausstattung, der später für 5 weitere Standorte genutzt wurde.",
        ],
      },
      {
        title: "Projektkoordinatorin",
        bullets: [
          "Zeitpläne und Budgets für 9 Bauprojekte im Gesamtwert von 22 Mio. $ verfolgt und wöchentlich einen Statusbericht an Kunden und Bauleitungen geschickt.",
          "Nachtragsprotokoll in Excel aufgebaut, das die Freigabezeit von 12 auf 5 Tage verkürzte.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Betriebswirtschaftslehre" }],
    skills: [
      {
        label: "Projektmanagement",
        items: [
          "Projektmanagement",
          "Risikomanagement",
          "Budgetierung",
          "Stakeholder-Management",
          "Lieferantenmanagement",
          "Change-Management",
        ],
      },
      {
        label: "Methoden und Tools",
        items: ["Agile", "Scrum", "Jira", "Confluence", "Smartsheet", "Microsoft Project", "Excel"],
      },
    ],
    certifications: [
      { name: "Project Management Professional (PMP)" },
      { name: "Certified ScrumMaster (CSM)" },
    ],
  },
  lines: [
    {
      weak: "Zuständig für Projektplanung und -umsetzung.",
      strong:
        "Einführung eines neuen Systems zur Terminplanung in 42 Kliniken in 14 Monaten geleitet, 3 Wochen vor Plan und 180.000 $ unter dem Budget von 2,6 Mio. $.",
    },
    {
      weak: "Mit Stakeholdern zusammengearbeitet, um Projekte auf Kurs zu halten.",
      strong:
        "Team von 11 Personen aus IT, Klinikbetrieb und Anbieter geführt, mit einem wöchentlichen Risikoprotokoll, das 2 Probleme bei der Datenmigration vor dem Go-live aufdeckte.",
    },
    {
      weak: "Mehrere Projekte gleichzeitig gemanagt.",
      strong:
        "Zeitpläne und Budgets für 9 Bauprojekte im Gesamtwert von 22 Mio. $ verfolgt und wöchentlich einen Statusbericht an Kunden und Bauleitungen geschickt.",
    },
  ],
  skills: [{ label: "Umsetzung" }, { label: "Methoden" }, { label: "Tools" }],
  tips: [
    {
      title: "Gib jedem Projekt eine Größe",
      text: "Budget, Teamgröße, Zahl der Standorte oder Nutzer und wie lange es lief. Ein Leser kann ein Projekt über 50.000 $ nicht von einem über 5 Mio. $ unterscheiden, wenn du es nicht sagst, und die Größe bestimmt dein Level.",
    },
    {
      title: "Zeig, was passierte, als etwas schiefging",
      text: "Jedes Projekt stößt auf ein Problem. Eine Zeile über ein Risiko, das du früh erkannt, oder eine Verzögerung, die du aufgeholt hast, sagt einer einstellenden Führungskraft mehr als jede Behauptung, du seist gut organisiert.",
    },
    {
      title: "Richte die Methode nach der Anzeige",
      text: "Verlangt die Anzeige Agile, zeig ein Projekt, das in Sprints lief. Verlangt sie PMP oder Wasserfall, zeig Phasen, Abnahmen und Änderungssteuerung. Beginne mit dem, was gesucht wird.",
    },
  ],
  mistakes: [
    {
      title: "„Projekte von Anfang bis Ende gemanagt“",
      text: "Das ist die Definition des Jobs, kein Ergebnis. Ersetz es durch ein Projekt, seine Größe und ob es pünktlich und im Budget fertig wurde.",
    },
    {
      title: "Jedes Tool, das du je geöffnet hast",
      text: "Jira, Asana, Trello, Monday, Smartsheet und Wrike in einer Liste wirken wie Füllmaterial. Nenne die zwei oder drei, in denen du echte Projekte geführt hast, und zeig sie in einer Zeile.",
    },
    {
      title: "Das PMP verstecken",
      text: "Wenn du PMP oder CSM hast, setz es in deine Überschrift und noch einmal mit dem Jahr unter Zertifizierungen. US-Anzeigen nennen es oft als Voraussetzung, und Recruiter suchen danach.",
    },
  ],
  faq: [
    {
      question: "Soll ich das PMP in meinen Lebenslauf als Projektmanager schreiben?",
      answer:
        "Ja, wenn du es hast: in deine Überschrift und mit dem Jahr in einen Abschnitt für Zertifizierungen. Wenn du noch lernst, schreib, dass deine PMP-Prüfung angesetzt ist, und nenne den Monat, statt anzudeuten, dass du es schon hast.",
    },
    {
      question: "Wie zeige ich Erfahrung im Projektmanagement ohne den Titel?",
      answer:
        "Behalte deinen echten Titel und schreib Zeilen über die Projekte, die du in dieser Rolle geleitet hast: Umfang, Budget, Team und Ergebnis. Koordinatoren, Ingenieure und Analysten leiten oft Projekte ohne den Titel.",
    },
    {
      question: "Welche Zahlen gehören in einen Lebenslauf als Projektmanager?",
      answer:
        "Budget, Teamgröße, geplante gegenüber tatsächlichen Terminen, Kosten gegenüber Budget und das Ergebnis, für das es das Projekt gab, etwa weniger versäumte Patiententermine oder eine schnellere Freigabe.",
    },
    {
      question:
        "Unterscheidet sich ein Lebenslauf als Programmmanager von einem als Projektmanager?",
      answer:
        "Ein Programmmanager steuert eine Gruppe zusammenhängender Projekte auf ein gemeinsames Ziel hin, also zeigt der Lebenslauf das Portfolio: wie viele Projekte, das Gesamtbudget und das Ziel, dem sie dienten. Ein Projektmanager zeigt jedes Projekt detaillierter.",
    },
  ],
};
