import type { CompareTranslation, CompareValues } from "../../compare";

// Comparisons of Otto Sensei with other resume tools, in German.
export default function compare(v: CompareValues): CompareTranslation {
  const OTTO = {
    what: {
      answer: "Komplette Jobsuche-Pipeline",
      detail: `Prüfe und erstelle deinen Lebenslauf und finde dann offene Jobs, die passend dazu gerankt sind. Pro bringt für jeden Job eine angepasste Kopie, ein Anschreiben und Kontaktnachrichten, bis zu ${v.proApplications} Bewerbungen, die sich über deine E-Mails aktualisieren, Interviewvorbereitung und eine Portfolio-Website.`,
    },
    score: {
      answer: "Kein erfundener Score",
      detail:
        "Jede Prüfung ist bestanden oder nennt das Problem und wie du es behebst, in einfachen Worten.",
    },
    free: {
      answer: `${v.plural({ one: "{count} Lebenslauf", other: "{count} Lebensläufe" }, v.freeResumes)}, ohne Karte`,
      detail: `Prüfe ihn, verbessere ihn und lade ihn als PDF in den Formaten ${v.freeFormats} herunter. Dazu gibt es ${v.fixes} Zeilenkorrekturen pro Monat von Otto, deine ${v.freeJobMatches} passendsten Jobs und ${v.plural({ one: "{count} verfolgte Bewerbung", other: "{count} verfolgte Bewerbungen" }, v.freeApplications)}.`,
    },
    paid: {
      answer: `Pro: ${v.proMonthly} pro Monat`,
      detail: `Max: ${v.maxMonthly} pro Monat, für mehr KI-Hilfe, Lebensläufe und verfolgte Bewerbungen. Jederzeit kündbar.`,
    },
    downloads: {
      answer: "Kostenlose PDFs, ohne Limit",
      detail: `In den Formaten ${v.freeFormats}. Alle Formate und Word-Downloads (.docx) gibt es mit Pro.`,
    },
    formats: {
      answer: `${v.templateCount} Formate, ${v.freeTemplateCount} kostenlos`,
      detail: `Jedes übernimmt ein weitverbreitetes Lebenslauf-Layout: ${v.freeFormats} bei Free, alle bei Pro.`,
    },
    jobs: {
      answer: "Passend zu deinem Lebenslauf",
      detail: `Offene Jobs von Karriereseiten der Unternehmen und öffentlichen Job-Feeds, jeden Tag gelesen. Free zeigt deine ${v.freeJobMatches} passendsten; Pro zeigt jeden Treffer.`,
    },
    systems: {
      answer: `Erkennt ${v.systemCount} ATS`,
      detail:
        "Anhand eines Job-Links, mit belegten Hinweisen dazu, wie jedes System mit Bewerbungen umgeht.",
    },
  };

  const NO_SCORE = {
    title: "Kein erfundener Score",
    text: "Es gibt keinen Standard-ATS-Score: Jedes Bewerbermanagementsystem rankt Bewerbende auf seine eigene Weise, und keines zeigt dir eine Zahl. Deshalb erfindet Otto auch keine. Jede Prüfung ist bestanden oder nennt das Problem und wie du es behebst.",
  };

  const FREE_PDFS = {
    title: "PDF-Downloads sind kostenlos",
    text: "Einen Lebenslauf zu prüfen, zu bearbeiten und als PDF herunterzuladen kostet nichts, ohne Limit bei den Downloads.",
  };

  const EMPLOYER_JOBS = {
    title: "Jobs von den eigenen Websites der Arbeitgeber",
    text: "Otto liest jeden Tag die Karriereseiten von Unternehmen und öffentliche Job-Feeds und rankt die Jobs nach deinem Lebenslauf. Jeder Job verlinkt auf die Originalanzeige.",
  };

  const SOURCED_NOTES = {
    title: "Belegte Hinweise zu Bewerbermanagementsystemen",
    text: `Ottos Hinweise zu ${v.systemCount} Bewerbermanagementsystemen verlinken jeweils die Seite, von der sie stammen.`,
  };

  const READ_BACK = {
    title: "Formate, getestet durch Zurücklesen",
    text: "Jedes Format ist eine Spalte mit echtem Text, und jedes PDF wird getestet, indem es zurückgelesen wird.",
  };

  return {
    jobscan: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Ein Lebenslauf-Scanner",
            detail:
              "Es vergleicht deinen Lebenslauf mit einer Stellenanzeige und gibt eine Match-Rate aus. Dazu kommen ein Lebenslauf-Generator, ein Job-Tracker, Job-Matches, LinkedIn-Optimierung, ein Anschreiben-Generator, automatisches Bewerben und KI-Interviewtraining.",
          },
        },
        {
          label: "Bewertung",
          otto: OTTO.score,
          them: {
            answer: "Eine Match-Rate",
            detail:
              "Eine pro Scan, mit einem Zielwert von mindestens 75 %. Sie stützt sich zuerst auf Hard Skills, dann auf das Bildungsniveau (nur wenn die Anzeige einen höheren Abschluss verlangt), den Jobtitel, Soft Skills und andere Keywords.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "Kostenlose Scans jeden Monat",
            detail:
              "Lebenslauf-Scans jeden Monat (fünf, laut dem Blog von Jobscan), der Lebenslauf-Generator und eine 7-tägige Premium-Testphase.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Premium, monatlich oder vierteljährlich",
            detail: "Jobscan nennt seine Preise auf seiner Tarifseite.",
          },
        },
        {
          label: "Jobs",
          otto: OTTO.jobs,
          them: {
            answer: "Matches und automatisches Bewerben",
            detail:
              "Jobs passend zu deinem Lebenslauf. Beim automatischen Bewerben prüfst du jede Bewerbung, bevor sie gesendet wird.",
          },
        },
        {
          label: "ATS",
          otto: OTTO.systems,
          them: {
            answer: "Erkennt bekannte Systeme",
            detail:
              "Es nennt das Bewerbermanagementsystem einer Stellenanzeige, wenn es das System des Unternehmens erkennt.",
          },
        },
      ],
      differences: [NO_SCORE],
      extras: [FREE_PDFS, EMPLOYER_JOBS, SOURCED_NOTES],
      sources: [
        { label: "Jobscan-Startseite" },
        { label: "Jobscan-Tutorial" },
        { label: `Jobscan-Blog, „Jobscan vs Rezi“ (${v.date("2026-06-18")})` },
        { label: `Jobscan-Blog, „Jobscan vs Huntr“ (${v.date("2026-08-07")})` },
      ],
    },
    rezi: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Ein KI-Lebenslauf-Generator",
            detail:
              "Mit einem KI-Lebenslauf-Agenten, einem Lebenslauf-Checker und Keyword-Scanner, einem Anschreiben-Generator, KI-Interviewtraining und Jobsuche.",
          },
        },
        {
          label: "Bewertung",
          otto: OTTO.score,
          them: {
            answer: "Der Rezi Score",
            detail:
              "Er prüft deinen Lebenslauf anhand von 23 zentralen Kennzahlen, Abschnitt für Abschnitt. Eingeschränkt bei Free, vollständig bei Pro.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "1 Lebenslauf, 3 PDFs",
            detail:
              "Dazu 1 KI-Interview. Der Rezi Score und das KI-Keyword-Targeting sind eingeschränkt.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: `Pro: ${v.reziPro} pro Monat`,
            detail: `Mit unbegrenzten Lebensläufen, PDF-Downloads und KI-Interviews und einer Prüfung durch Fachleute pro Monat. Lifetime: ${v.usd(149)} einmalig, mit den Funktionen von Pro, aber ohne monatliche Prüfung.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: { answer: "3 PDFs bei Free", detail: "Unbegrenzt bei Pro." },
        },
        { label: "Jobs", otto: OTTO.jobs, them: { answer: "Ein Tool zur Jobsuche" } },
      ],
      differences: [
        NO_SCORE,
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} Der Free-Tarif von Rezi enthält 3 PDF-Downloads.`,
        },
        {
          title: "Ein niedrigerer Monatspreis",
          text: `Otto Pro kostet ${v.proMonthly} pro Monat; Rezi Pro kostet ${v.reziPro} pro Monat.`,
        },
      ],
      extras: [EMPLOYER_JOBS],
      sources: [{ label: "Rezi-Preisseite" }, { label: "Rezi-Startseite" }],
    },
    kickresume: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Generator für Lebenslauf und Anschreiben",
            detail:
              "Mit einem KI-Schreibassistenten, einem ATS-Lebenslauf-Checker, einem Baukasten für persönliche Websites, einer Jobbörse und Apps für iOS und Android.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "4 einfache Lebenslauf-Vorlagen",
            detail:
              "Dazu 4 Anschreiben-Vorlagen, 1 einfache Website-Vorlage und unbegrenzte Downloads. Der KI-Schreibassistent und der Lebenslauf-Checker sind nicht enthalten.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Premium, Preis je nach Land",
            detail: `${v.usd(9)} für einen Monat, ${v.usd(18)} für drei oder ${v.usd(48)} für ein Jahr. Premium bringt 40+ Vorlagen, den KI-Schreibassistenten, den ATS-Lebenslauf-Checker, LinkedIn- und PDF-Import und die mobilen Apps.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: { answer: "Unbegrenzt in jedem Tarif" },
        },
        {
          label: "Vorlagen",
          otto: OTTO.formats,
          them: {
            answer: "40+ bei Premium",
            detail: "4 bei Free. Premium bringt mehr Farben und Schriften.",
          },
        },
      ],
      differences: [
        {
          title: "Ein Lebenslauf-Check bei Free",
          text: "Ottos kostenlose Recruiter-Ansicht zeigt den Text, den Bewerbermanagementsysteme aus deiner Datei ziehen, mit einem klaren Grund für jedes Problem. Den ATS-Lebenslauf-Checker von Kickresume gibt es mit Premium.",
        },
        {
          title: "KI-Hilfe bei Free",
          text: `Free enthält ${v.fixes} Zeilenkorrekturen pro Monat mit Otto. Den KI-Schreibassistenten von Kickresume gibt es mit Premium.`,
        },
      ],
      extras: [READ_BACK, EMPLOYER_JOBS],
      sources: [{ label: "Kickresume-Preisseite" }, { label: "Kickresume-Startseite" }],
    },
    "resume-io": {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Generator für Lebenslauf und Anschreiben",
            detail:
              "Mit einem KI-Schreibassistenten, einem ATS-Scorer, einer Jobbörse, Recruiter-Matching, automatischem Bewerben durch das eigene Team, Interviewtraining, einem Gehaltsanalysator und Kursen.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "1 Lebenslauf, TXT-Downloads",
            detail:
              "Ein Lebenslauf und ein Anschreiben, Downloads nur als TXT und eingeschränktes Teilen und eingeschränkte Analysen.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Wöchentliche oder jährliche Tarife",
            detail:
              "Preise je nach Land, mit unbegrenzten Lebensläufen, Anschreiben und PDF-Downloads. Auf den Tarifkarten steht Einmalzahlung; laut FAQ wird eine 7-tägige Testphase zur monatlichen Mitgliedschaft, wenn du nicht kündigst.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "Nur TXT bei Free",
            detail:
              "PDF-Downloads gibt es mit einem Bezahltarif, und die Vorlagen lassen sich als Word oder PDF herunterladen.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} Beim kostenlosen Tarif von Resume.io gibt es Downloads nur als TXT.`,
        },
        {
          title: "Monatliche Abrechnung",
          text: "Otto Pro wird monatlich oder jährlich abgerechnet, und du kündigst in deinem Konto. Resume.io verkauft einen Tarif für eine Woche oder für ein Jahr.",
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [{ label: "Resume.io-Preisseite" }, { label: "Resume.io-Startseite" }],
    },
    enhancv: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Ein KI-Lebenslauf-Generator",
            detail:
              "Mit Inhaltsvorschlägen, einem ATS-Check und Lebenslauf-Feedback, Anpassung mit Match-Score, Übersetzung, einem Anschreiben-Generator, Interviewhilfe, einer Jobbörse und einem Tracker.",
          },
        },
        {
          label: "Bewertung",
          otto: OTTO.score,
          them: {
            answer: "Ein ATS-Score",
            detail:
              "Das Lebenslauf-Feedback gibt einen ATS-Score, und die Anpassung zeigt einen Match-Score für eine Stellenanzeige.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "Kostenlos für 7 Tage",
            detail:
              "Alle Vorlagen und Design-Tools, Basis-Abschnitte, bis zu 12 Abschnittseinträge und Enhancv-Branding.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Pro, Preis je nach Land",
            detail:
              "Monatlich, alle 3 Monate oder alle 6 Monate abgerechnet. Bringt bis zu 300 Lebensläufe und Anschreiben, Inhaltsvorschläge, den ATS-Check, Pro-Abschnitte und kein Branding.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "PDF, kein Word",
            detail: "Laut FAQ werden Lebensläufe als PDF heruntergeladen.",
          },
        },
      ],
      differences: [
        {
          title: "Ein kostenloser Tarif ohne Enddatum",
          text: "Ottos Free-Tarif hat kein Zeitlimit. Der Free-Tarif von Enhancv gilt 7 Tage.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Enhancv-Preisseite" }, { label: "Enhancv-Startseite" }],
    },
    novoresume: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Generator für Lebenslauf und Anschreiben",
            detail:
              "Mit gestalteten Vorlagen, einem ATS-Checker, der deine Datei bewertet, KI-Schreibtools und einem Anschreiben-Generator bei Pro.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "1 Lebenslauf, 1 Seite",
            detail:
              "8 Vorlagen, 30 Farbthemen, 2 KI-Credits pro Monat und der ATS-Checker. Der Tarif läuft nicht ab, und das PDF trägt Novoresume-Branding.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Pro, Preis je nach Land",
            detail:
              "Monatlich, vierteljährlich oder jährlich bis zur Kündigung, oder ein einmonatiger Pass, der einmal berechnet wird. Pro bringt bis zu 144 Dokumente mit 25 Seiten, alle Vorlagen, den Anschreiben-Generator und 40 KI-Credits pro Monat.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "PDF mit Branding bei Free",
            detail:
              "Pro entfernt das Branding. Ein Download, der dich zum Upgrade auffordert, klappt, sobald Pro-Funktionen gegen kostenlose getauscht sind.",
          },
        },
      ],
      differences: [
        {
          title: "Kostenlose PDFs ohne Branding",
          text: "Otto setzt kein Branding auf die PDFs, die du kostenlos herunterlädst. Die kostenlosen PDFs von Novoresume tragen dessen Branding.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Novoresume-Preisseite" }, { label: "Novoresume-Startseite" }],
    },
    zety: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: { answer: "Ein Online-Lebenslauf-Generator" },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: { answer: "Eine kostenlose Stufe", detail: "Downloads nur als TXT." },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: `${v.usd(1.95)} für 14 Tage`,
            detail: `Die Testphase verlängert sich zu ${v.usd(25.95)} alle 4 Wochen. Oder zahl ${v.usd(71.4)} im Voraus für ein Jahr (${v.usd(5.95)} pro Monat). Eine 14-tägige Geld-zurück-Garantie.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "Nur TXT bei Free",
            detail: "PDF- und Word-Downloads brauchen einen Bezahltarif.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} Bei der kostenlosen Stufe von Zety gibt es Downloads nur als TXT.`,
        },
        {
          title: "Ein niedrigerer Preis von Monat zu Monat",
          text: `Otto Pro kostet ${v.proMonthly} pro Monat, monatlich abgerechnet. Die Testphase von Zety für ${v.usd(1.95)} verlängert sich zu ${v.usd(25.95)} alle 4 Wochen.`,
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [{ label: "Zety-Preisseite" }],
    },
    teal: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Eine Lebenslauf-App",
            detail: "Mit einem kostenlosen und einem bezahlten Tarif, Teal+.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: { answer: "Ja, ein kostenloser Tarif" },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: `Teal+: ${v.usd(13)} pro Woche`,
            detail: `Oder ${v.usd(29)} alle 30 Tage oder ${v.usd(79)} alle 90 Tage.`,
          },
        },
      ],
      differences: [
        {
          title: "Ein niedrigerer Monatspreis",
          text: `Otto Pro kostet ${v.proMonthly} pro Monat. Teal+ kostet ${v.usd(29)} alle 30 Tage.`,
        },
      ],
      extras: [FREE_PDFS, NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Teal-Hilfecenter, „Teal vs Teal+“" },
        { label: "Teal-Blog, „Best resume apps“" },
      ],
    },
    canva: {
      rows: [
        {
          label: "Was es ist",
          otto: OTTO.what,
          them: {
            answer: "Ein allgemeines Design-Tool",
            detail:
              "Lebensläufe sind eines der Dinge, die du damit gestalten kannst; es ist nicht nur dafür gebaut.",
          },
        },
        {
          label: "Kostenloser Tarif",
          otto: OTTO.free,
          them: {
            answer: "Kostenlos, mit Vorlagen",
            detail: "Der kostenlose Tarif enthält kostenlose Vorlagen.",
          },
        },
        {
          label: "Bezahltarife",
          otto: OTTO.paid,
          them: {
            answer: "Canva Pro, je nach Land",
            detail:
              "Die Preise sind je nach Land verschieden, also sieh auf der Preisseite von Canva nach, was für dich gilt.",
          },
        },
      ],
      differences: [
        {
          title: "Für Jobsuchende gemacht",
          text: "Otto ist nur für Lebensläufe und Bewerbungen gebaut: Er zeigt den Text, den Bewerbermanagementsysteme aus deiner Datei lesen, und benennt jedes Problem. Canva ist ein allgemeines Design-Tool.",
        },
      ],
      extras: [READ_BACK, FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Canva-Pro-Preisseite" }],
    },
  };
}
