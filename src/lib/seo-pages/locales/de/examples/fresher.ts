import type { ExampleWords } from "../../../examples";

export const fresher: ExampleWords<"fresher"> = {
  role: "Berufseinsteiger",
  card: "Ein Informatikabsolvent mit einem Praktikum und zwei Projekten, auf einer Seite.",
  description:
    "Lebenslauf-Beispiel für Berufseinsteiger mit Studium, auf einer Seite: Projekte, Praktika und GPA richtig gezeigt, plus Fähigkeiten und typische Fehler.",
  intro:
    "Ohne Vollzeitjob lebt ein Lebenslauf für Berufseinsteiger von Projekten, Praktika, Noten und dem Beweis, dass du Dinge zu Ende bringst. Dieses Beispiel zeigt einen Informatikabsolventen, der sich auf Trainee- und Associate-Stellen in der Softwareentwicklung bewirbt, und derselbe Aufbau passt für alle Absolventen.",
  person:
    "Noah ist erfunden: ein Informatikabsolvent des Jahrgangs 2026 aus Raleigh, mit einem Praktikum und zwei Projekten. Namen, Hochschulen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Berufseinsteiger",
    basics: {
      headline: "Informatikabsolvent",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Informatikabsolvent (2026) auf der Suche nach einer Stelle als Trainee oder Associate Software Engineer. Hat zwei Full-Stack-Projekte gebaut und veröffentlicht und einen Sommer lang echte Bugs bei einem Startup behoben.",
    education: [
      {
        degree: "B.S.",
        field: "Informatik",
        bullets: ["GPA 3,7/4,0. Abschlussprojekt: Campus-Bus-Tracker (siehe unten)."],
      },
      {
        degree: "High-School-Abschluss",
        field: "",
        bullets: ["GPA 3,9/4,0"],
      },
    ],
    experience: [
      {
        title: "Praktikant Softwareentwicklung",
        bullets: [
          "14 Bugs im React-Dashboard behoben, darunter einen Datumsfehler, der 3.000 Nutzern falsche Liefertage anzeigte.",
          "40 Unit-Tests in Jest für das Buchungsformular geschrieben und die Testabdeckung von 20 % auf 75 % erhöht.",
        ],
      },
    ],
    projects: [
      {
        name: "Campus-Bus-Tracker",
        tech: "React, Node.js, MongoDB",
        bullets: [
          "Live-Tracker für 6 Campusbusse in einem Team von 3 gebaut, den heute jeden Morgen rund 900 Studierende nutzen.",
          "Aktualisierung der Karte durch GPS-Punkte über WebSockets statt Polling von alle 30 auf alle 5 Sekunden beschleunigt.",
        ],
      },
      {
        name: "Ausgaben-Splitter",
        tech: "Python, Django, PostgreSQL",
        bullets: [
          "Web-App zum Aufteilen von Wohnheim- und Reisekosten mit Venmo-Zahlungslinks entwickelt, genutzt von 120 Freunden und Kommilitonen.",
        ],
      },
    ],
    skills: [
      { label: "Programmiersprachen", items: ["Java", "Python", "JavaScript", "SQL"] },
      { label: "Web", items: ["React", "Node.js", "Django", "HTML", "CSS"] },
      { label: "Tools", items: ["Git", "Linux", "MongoDB", "PostgreSQL"] },
    ],
    certifications: [{ name: "freeCodeCamp: JavaScript Algorithms and Data Structures" }],
  },
  lines: [
    {
      weak: "Ein Projekt zum Thema Bus-Tracking gemacht.",
      strong:
        "Live-Tracker für 6 Campusbusse in einem Team von 3 gebaut, den heute jeden Morgen rund 900 Studierende nutzen.",
    },
    {
      weak: "Hochmotivierter und leidenschaftlicher Berufseinsteiger mit Lernbereitschaft.",
      strong:
        "14 Bugs im React-Dashboard behoben, darunter einen Datumsfehler, der 3.000 Nutzern falsche Liefertage anzeigte.",
    },
    {
      weak: "Im Praktikum React und Node.js gelernt.",
      strong:
        "40 Unit-Tests in Jest für das Buchungsformular geschrieben und die Testabdeckung von 20 % auf 75 % erhöht.",
    },
  ],
  skills: [{ label: "Programmiersprachen" }, { label: "Web" }, { label: "Tools" }],
  tips: [
    {
      title: "Die Ausbildung kommt zuerst",
      text: "Bis du einen Vollzeitjob hast, sind Abschluss, Hochschule und GPA die stärksten Fakten, die du hast. Setz die Ausbildung über die Berufserfahrung und behalte deine Schulnoten, solange Anzeigen fürs Campus-Recruiting noch danach fragen.",
    },
    {
      title: "Behandle Projekte wie Jobs",
      text: "Jedes Projekt bekommt dieselbe Art von Zeile wie ein Job: was du gebaut hast, wer es genutzt hat, und eine Zahl. Ein Projekt mit 10 echten Nutzern schlägt einen Tutorial-Klon ohne Nutzer.",
    },
    {
      title: "Eine Seite, ohne Ausnahme",
      text: "Recruiter bei Campus-Recruiting-Tagen und Masseneinstellungen lesen Hunderte Lebensläufe von Berufseinsteigern. Bleib bei einer Seite; Compact bringt mehr darauf unter, ohne die Schrift zu verkleinern.",
    },
  ],
  mistakes: [
    {
      title: "Ein Karriereziel voller Adjektive",
      text: "„Hochmotivierter und leidenschaftlicher Berufseinsteiger mit Lernbereitschaft“ steht in Tausenden Lebensläufen. Ottos Zeilenprüfung markiert Floskeln wie „hochmotiviert“. Nenne die Stelle, die du willst, und eine Sache, die du gebaut hast.",
    },
    {
      title: "Persönliche Angaben und eine Erklärung",
      text: "Name des Vaters, Geburtsdatum, ein Foto und „Hiermit erkläre ich, dass die obigen Angaben wahr sind“ stammen aus alten Vorlagen. Arbeitgeber brauchen sie nicht, und sie nehmen deinen Projekten Platz weg.",
    },
    {
      title: "Studienfächer als Fähigkeiten aufzählen",
      text: "„Betriebssysteme, DBMS, Rechnernetze“ sind Fächer, keine Fähigkeiten. Nenne die Sprachen und Tools, die du in einem Projekt oder Praktikum eingesetzt hast.",
    },
  ],
  faq: [
    {
      question: "Welches Lebenslauf-Format ist für Berufseinsteiger am besten?",
      answer:
        "Eine Seite, eine Spalte, mit der Ausbildung zuerst, dann Praktika, Projekte, Fähigkeiten und Zertifikate. Classic und Compact funktionieren beide und lassen sich kostenlos als PDF herunterladen.",
    },
    {
      question: "Soll ich als Berufseinsteiger meinen CGPA in den Lebenslauf schreiben?",
      answer:
        "Ja, wenn er dir hilft. Viele Anzeigen für Absolventen und Trainees setzen eine Mindestnote, und wenn du ihn weglässt, kann es so wirken, als würdest du ihn verstecken. Schreib ihn so, wie deine Hochschule es tut, etwa 3,7/4,0 oder 8,4/10.",
    },
    {
      question: "Kann ich als Berufseinsteiger ohne Praktikum einen Lebenslauf schreiben?",
      answer:
        "Ja. Beginne mit zwei oder drei Projekten, die wie Jobs geschrieben sind, ergänze Hackathons, Hochschulgruppen oder Freelance-Arbeit mit Zahlen und lass die Ausbildung ganz oben.",
    },
  ],
};
