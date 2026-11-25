import type { Messages } from "..";
import type { Translation } from "../../types";

// Header, footer, navigation, the language picker and the 404 page, in German.
export default {
  nav: {
    label: "Hauptnavigation",
    howItWorks: "So funktioniert’s",
    jobs: "Jobs",
    pricing: "Preise",
    signIn: "Anmelden",
    dashboard: "Dashboard",
    menu: "Menü",
  },
  checkMyResume: "Lebenslauf prüfen",
  footer: {
    label: "Fußzeile",
    tagline: "Für Jobsuchende überall.",
    groups: {
      product: "Produkt",
      guides: "Ratgeber",
      legal: "Rechtliches",
    },
    links: {
      resumeBuilder: "Lebenslauf erstellen",
      jobMatch: "Job-Abgleich",
      coverLetters: "Anschreiben",
      applicationTracker: "Bewerbungstracker",
      interviewPrep: "Interviewvorbereitung",
      portfolioWebsite: "Portfolio-Website",
      pricing: "Preise",
      resumeExamples: "Lebenslauf-Beispiele",
      resumeTemplates: "Lebenslauf-Vorlagen",
      atsGuides: "ATS-Ratgeber",
      comparisons: "Vergleiche",
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
      refunds: "Erstattungen",
      acceptableUse: "Zulässige Nutzung",
    },
    payments: "Zahlungen über {merchant}",
    language: "Sprache",
  },
  languageHint: {
    text: "Diese Seite gibt es auch auf Deutsch.",
    link: "Auf Deutsch lesen",
    dismiss: "Schließen",
  },
  notFound: {
    title: "Seite nicht gefunden",
    otto: "Otto, der Otter, sieht besorgt aus",
    text: "Ich habe überall gesucht, aber diese Seite gibt es hier nicht. Vielleicht ist der Link alt oder falsch geschrieben.",
    home: "Zur Startseite",
  },
} satisfies Translation<Messages["site"]>;
