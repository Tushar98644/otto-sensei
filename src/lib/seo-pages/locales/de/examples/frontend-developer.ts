import type { ExampleWords } from "../../../examples";

export const frontendDeveloper: ExampleWords<"frontend-developer"> = {
  role: "Frontend-Entwickler",
  card: "React und TypeScript, mit Geschwindigkeit und Barrierefreiheit in Zahlen.",
  description:
    "Lebenslauf-Beispiel für Frontend-Entwickler: Ergebniszeilen zu React und TypeScript, gefragte Fähigkeiten und wie du Tempo und Barrierefreiheit zeigst.",
  intro:
    "Ein Frontend-Lebenslauf muss in wenigen Sekunden zwei Dinge beweisen: dass du Oberflächen baust, die Menschen nutzen, und dass dir wichtig ist, wie schnell und barrierefrei sie sind. Dieses Beispiel zeigt beides mit Zahlen, die eine einstellende Führungskraft prüfen kann.",
  person:
    "Daniel ist erfunden: ein Frontend-Entwickler mit 5 Jahren bei Produktunternehmen, der remote aus Minneapolis arbeitet. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als Frontend-Entwickler",
    basics: {
      headline: "Frontend-Entwickler",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Frontend-Entwickler mit 5 Jahren Erfahrung im Bau von React- und TypeScript-Apps für Onlineshops und SaaS-Dashboards. Bekannt für schnelle Seiten, aufgeräumte Designsysteme und barrierefreie Formulare.",
    experience: [
      {
        title: "Senior-Frontend-Entwickler",
        bullets: [
          "Produktseite in Next.js mit Server-Rendering neu gebaut und den Largest Contentful Paint auf Mittelklasse-Handys von 3,9 s auf 1,6 s gesenkt.",
          "Umzug von 120 Komponenten in ein gemeinsames Designsystem in Storybook geleitet, das 4 Produktteams nutzen.",
          "64 WCAG-Probleme im Checkout nach einem Audit behoben und Playwright-Checks ergänzt, damit neue Probleme den Build scheitern lassen.",
          "2 Junior-Entwickler mit Code-Reviews und Pairing als Mentor begleitet; beide verantworten heute Features von Anfang bis Ende.",
        ],
      },
      {
        title: "Frontend-Entwickler",
        bullets: [
          "Analytics-Dashboard in React, TypeScript und D3.js gebaut, das 900 Kundenkonten jede Woche öffnen.",
          "JavaScript-Hauptbundle durch Aufteilen der Routen und das Ersetzen von zwei schweren Chart-Bibliotheken von 780 KB auf 310 KB verkleinert.",
          "Unit-Tests in Jest für die Abrechnungsseiten geschrieben und die Testabdeckung in 6 Monaten von 35 % auf 80 % erhöht.",
        ],
      },
    ],
    projects: [
      {
        name: "Farbkontrast-Prüfer",
        tech: "TypeScript, Vite",
        bullets: [
          "Kostenloses Browser-Tool entwickelt, das Textfarben gegen die WCAG-Kontrastverhältnisse prüft, mit 2.000 Besuchern pro Monat.",
        ],
      },
    ],
    education: [{ degree: "Bachelor of Science", field: "Informatik" }],
    skills: [
      { label: "Programmiersprachen", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Redux", "Tailwind CSS", "D3.js"],
      },
      { label: "Qualität", items: ["Jest", "Playwright", "Storybook", "WCAG", "Figma"] },
    ],
  },
  lines: [
    {
      weak: "Verschiedene UI-Komponenten für die Website entwickelt.",
      strong:
        "Umzug von 120 Komponenten in ein gemeinsames Designsystem in Storybook geleitet, das 4 Produktteams nutzen.",
    },
    {
      weak: "Performance der Website verbessert.",
      strong:
        "Produktseite in Next.js mit Server-Rendering neu gebaut und den Largest Contentful Paint auf Mittelklasse-Handys von 3,9 s auf 1,6 s gesenkt.",
    },
    {
      weak: "Die Website barrierefrei gemacht.",
      strong:
        "64 WCAG-Probleme im Checkout nach einem Audit behoben und Playwright-Checks ergänzt, damit neue Probleme den Build scheitern lassen.",
    },
  ],
  skills: [
    { label: "Programmiersprachen" },
    { label: "Frameworks" },
    { label: "Tests und Handwerk" },
  ],
  tips: [
    {
      title: "Miss Geschwindigkeit so wie Teams",
      text: "Nenne die Kennzahl und das Gerät: Largest Contentful Paint auf einem Mittelklasse-Handy, Bundle-Größe in KB, Time to Interactive. „Schneller gemacht“ gibt dem Interviewer nichts, wonach er fragen kann.",
    },
    {
      title: "Verlinke etwas, das live ist",
      text: "Ein Portfolio oder ein Live-Projekt lässt Leser klicken, statt dir einfach zu glauben. Setz den Link in den Kopfbereich und stell sicher, dass er auf dem Handy lädt.",
    },
    {
      title: "Nenne das Framework aus der Anzeige",
      text: "Wenn die Anzeige React verlangt und du mit React gearbeitet hast, schreib React in die Zeile, nicht nur „JavaScript-Frameworks“. Ottos Job-Abgleich sucht nach den Wörtern aus der Anzeige.",
    },
  ],
  mistakes: [
    {
      title: "Ein Screenshot-Portfolio im Lebenslauf",
      text: "Bilder und Layouts aus Design-Tools sehen für Menschen gut aus, aber ein Bewerbermanagementsystem liest darin nichts. Halte den Lebenslauf bei Text und verlinke die Visuals.",
    },
    {
      title: "Jede Bibliothek, die du je importiert hast",
      text: "Mit Lodash und Axios gewinnst du kein Interview. Nenne die Frameworks und Tools, die du gewählt hast und begründen kannst, und heb dir den Rest fürs Gespräch auf.",
    },
    {
      title: "Vage Wörter wie „verschiedene“ und „mehrere“",
      text: "Ottos Zeilenprüfung markiert sie, weil sie den Umfang verbergen. Zähl stattdessen die Komponenten, die Seiten oder die Teams.",
    },
  ],
  faq: [
    {
      question: "Soll ein Lebenslauf als Frontend-Entwickler gestaltet sein?",
      answer:
        "Halte ihn schlicht. Dein Portfolio zeigt dein Gespür für Design; der Lebenslauf muss sich in Bewerbermanagementsystemen sauber lesen lassen, und die bringen Spalten, Icons und Textfelder durcheinander. Eine Spalte mit echtem Text ist am sichersten.",
    },
    {
      question: "Reicht React, oder brauche ich andere Frameworks?",
      answer:
        "Richte dich nach der Anzeige. Viele Teams suchen React mit TypeScript, manche aber Vue oder Angular. Nenne, was du wirklich genutzt hast, und pass die Reihenfolge an jeden Job an.",
    },
    {
      question: "Brauche ich als Frontend-Entwickler ein Portfolio?",
      answer:
        "Es hilft sehr. Ein oder zwei Live-Projekte mit einer kurzen Notiz dazu, was du gebaut hast und warum, sind mehr wert als eine lange Liste von Tutorials.",
    },
  ],
};
