import type { ExampleWords } from "../../../examples";

export const uiUxDesigner: ExampleWords<"ui-ux-designer"> = {
  role: "UI/UX-Designer",
  card: "Schlichter Text mit Link zum Portfolio, mit Research und Ergebnissen in jeder Zeile.",
  description:
    "Lebenslauf-Beispiel für UI/UX-Designer als schlichter Text, den ein ATS lesen kann, mit Zeilen zu Research und Ergebnissen, gefragten Skills und Tipps.",
  intro:
    "Designer sind versucht, den Lebenslauf zum Schaustück zu machen, aber ein Bewerbermanagementsystem liest ein gestaltetes Layout als durcheinandergewürfelten Text. Die Lösung ist ein schlichter Lebenslauf mit Link zu deinem Portfolio, mit Zeilen, die das Research hinter jedem Design zeigen und was sich nach dem Launch verändert hat.",
  person:
    "Hannah ist erfunden: eine Product Designerin mit 4 Jahren in EdTech und Fintech in Denver. Namen, Unternehmen und Zahlen sind ausgedacht.",
  resume: {
    title: "Lebenslauf als UI/UX-Designerin",
    basics: {
      headline: "Product Designerin (UI/UX)",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Product Designerin mit 4 Jahren Erfahrung in der Gestaltung von Lern- und Zahlungs-Apps, die auf günstigen Android-Handys genutzt werden. Beginnt mit Research, gestaltet in Figma und prüft nach dem Launch die Zahlen.",
    experience: [
      {
        title: "Product Designerin",
        bullets: [
          "Kursplayer nach 18 Usability-Tests mit Studierenden in 3 Städten neu gestaltet und den Anteil abgeschlossener Lektionen von 42 % auf 55 % gesteigert.",
          "Designsystem in Figma mit 90 Komponenten und Dark Mode aufgebaut und die Zeit vom Design bis zur Umsetzung neuer Screens etwa halbiert.",
          "Onboarding auf Spanisch und Englisch gestaltet, das die Bindung neuer Lernender an Tag 7 von 21 % auf 27 % steigerte.",
        ],
      },
      {
        title: "UI/UX-Designerin",
        bullets: [
          "Ablauf zum Bezahlen von Rechnungen neu gestaltet und von 7 auf 4 Screens gekürzt, wodurch die Support-Anrufe zu fehlgeschlagenen Zahlungen um 30 % sanken.",
          "2 Runden Card Sorting mit 40 Kunden durchgeführt, um das App-Menü neu aufzubauen, und es danach mit einem klickbaren Prototyp getestet.",
          "Richtlinien zur Barrierefreiheit für Farbkontraste und Touch-Ziele geschrieben, nach denen die 3 App-Teams heute arbeiten.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Interaktionsdesign" }],
    skills: [
      {
        label: "Design",
        items: ["UX-Design", "UI-Design", "Interaktionsdesign", "Designsysteme", "Prototyping"],
      },
      { label: "Research", items: ["Nutzerforschung", "Usability-Tests", "Wireframing"] },
      { label: "Tools", items: ["Figma", "Framer", "Miro", "Adobe Illustrator"] },
    ],
  },
  lines: [
    {
      weak: "Screens für die mobile App gestaltet.",
      strong:
        "Ablauf zum Bezahlen von Rechnungen neu gestaltet und von 7 auf 4 Screens gekürzt, wodurch die Support-Anrufe zu fehlgeschlagenen Zahlungen um 30 % sanken.",
    },
    {
      weak: "Nutzerforschung und Usability-Tests gemacht.",
      strong:
        "Kursplayer nach 18 Usability-Tests mit Studierenden in 3 Städten neu gestaltet und den Anteil abgeschlossener Lektionen von 42 % auf 55 % gesteigert.",
    },
    {
      weak: "Ein Designsystem erstellt.",
      strong:
        "Designsystem in Figma mit 90 Komponenten und Dark Mode aufgebaut und die Zeit vom Design bis zur Umsetzung neuer Screens etwa halbiert.",
    },
  ],
  skills: [{ label: "Design" }, { label: "Research" }, { label: "Tools" }],
  tips: [
    {
      title: "Lass das Portfolio die Optik tragen",
      text: "Setz den Portfolio-Link in den Kopfbereich und halte den Lebenslauf bei schlichtem Text. Ein Recruiter überfliegt zuerst den Lebenslauf; im Portfolio sieht er deine Arbeit.",
    },
    {
      title: "Verbinde jedes Design mit Research und einem Ergebnis",
      text: "Mit wie vielen Menschen du getestet hast, was du deswegen geändert hast und was sich nach dem Launch bewegt hat. Nach dieser dreiteiligen Zeile suchen Design-Leads.",
    },
    {
      title: "Sag, wer die Nutzer waren",
      text: "Studierende mit günstigen Handys, Bankkunden, die Rechnungen bezahlen, Lagerpersonal mit Handschuhen. Der Kontext zeigt, dass du für echte Menschen gestaltet hast, nicht für einen Dribbble-Shot.",
    },
  ],
  mistakes: [
    {
      title: "Ein Lebenslauf aus einem Design-Tool",
      text: "Spalten, Textfelder und Icons aus einem Design-Tool kommen aus einem Bewerbermanagementsystem oft in der falschen Reihenfolge heraus oder gar nicht. Ottos Recruiter-Ansicht zeigt dir genau, was es liest.",
    },
    {
      title: "Skill-Balken und Bewertungen",
      text: "„Figma: 4 von 5 Sternen“ kann keine Software lesen, und Menschen sagt es nichts. Nenne die Tools; zeig die Fähigkeit in deinen Zeilen.",
    },
    {
      title: "Nur Screens, keine Ergebnisse",
      text: "„Onboarding gestaltet“ ist eine Aufgabe. Ergänze, was sich verändert hat: Abschlussrate, Bindung, weniger Support-Tickets oder schnellere Umsetzung.",
    },
  ],
  faq: [
    {
      question: "Braucht ein UI/UX-Designer einen kreativen Lebenslauf?",
      answer:
        "Halte den Lebenslauf schlicht und lass dein Portfolio kreativ sein. Viele Arbeitgeber lesen Lebensläufe zuerst über ein Bewerbermanagementsystem, und gestaltete Layouts kommen dabei oft durcheinander heraus.",
    },
    {
      question: "Soll ich meinen Portfolio-Link in den Lebenslauf schreiben?",
      answer:
        "Ja, ganz oben, neben deine E-Mail-Adresse. Stell sicher, dass er auf dem Handy schnell lädt und dass die erste Fallstudie deine beste ist.",
    },
    {
      question: "Ist Product Designer dasselbe wie UI/UX-Designer?",
      answer:
        "Die Titel überschneiden sich stark, und Ottos Job-Matching behandelt sie als dieselbe Art von Job. Nutze in deiner Überschrift den Titel aus der Anzeige, auf die du dich bewirbst.",
    },
  ],
};
