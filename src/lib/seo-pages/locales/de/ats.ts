import type { AtsTranslation } from "../../ats";

const ANSWER_THE_SAME = "Beantworte sie ehrlich und jedes Mal gleich.";

const GREENHOUSE_HELP = "Greenhouse-Hilfecenter";
const WORKDAY_DOCS = "Workday-Dokumentation";
const ORACLE_DOCS = "Oracle-Taleo-Dokumentation";
const SAP_NOTE = "SAP-Support-Hinweis";
const SAP_LEARNING = "SAP Learning";
const WORKABLE_HELP = "Workable-Hilfecenter";

// The ATS guides' introductions, sourced notes and general advice, in German.
export default {
  intros: {
    greenhouse: {
      what: "Greenhouse ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben, Bewerbungen sammeln und Bewerbende prüfen.",
      spot: "Das Formular liegt oft auf boards.greenhouse.io oder job-boards.greenhouse.io, oder der Link enthält gh_jid= und eine Zahl.",
    },
    lever: {
      what: "Lever ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende prüfen.",
      spot: "Der Job steht oft auf jobs.lever.co.",
    },
    ashby: {
      what: "Ashby ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende prüfen.",
      spot: "Der Job steht oft auf jobs.ashbyhq.com, oder der Link enthält ashby_jid=.",
    },
    workday: {
      what: "Workday ist HR-Software. Arbeitgeber, die die Recruiting-Tools von Workday nutzen, nehmen Bewerbungen über Workday entgegen.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf myworkdayjobs.com oder myworkdaysite.com endet.",
    },
    icims: {
      what: "iCIMS ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende sichten.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf icims.com endet.",
    },
    taleo: {
      what: "Taleo ist die Recruiting-Software von Oracle (ein Bewerbermanagementsystem, kurz ATS), mit der Stellen ausgeschrieben und Bewerbende gesichtet werden.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf taleo.net endet.",
    },
    successfactors: {
      what: "SAP SuccessFactors ist die HR-Software von SAP. Ihr Recruiting-Teil nimmt Bewerbungen entgegen und sichtet Bewerbende.",
      spot: "Das Formular liegt oft unter einer Adresse wie career4.successfactors.com oder unter einer, die auf jobs2web.com endet.",
    },
    smartrecruiters: {
      what: "SmartRecruiters ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende sichten. Seine KI heißt Winston.",
      spot: "Der Job steht oft auf jobs.smartrecruiters.com oder careers.smartrecruiters.com.",
    },
    workable: {
      what: "Workable ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende sichten.",
      spot: "Das Formular liegt oft auf apply.workable.com.",
    },
    bamboohr: {
      what: "BambooHR ist HR-Software für Unternehmen, mit einem Recruiting-Tool, um Stellen auszuschreiben und Bewerbende zu prüfen.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf bamboohr.com endet.",
    },
    jobvite: {
      what: "Jobvite ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende prüfen.",
      spot: "Der Job steht oft auf jobs.jobvite.com.",
    },
    recruitee: {
      what: "Recruitee ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende sichten.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf recruitee.com endet.",
    },
    teamtailor: {
      what: "Teamtailor ist Recruiting-Software (ein Bewerbermanagementsystem, kurz ATS), mit der Arbeitgeber Stellen ausschreiben und Bewerbende prüfen. Sein KI-Assistent heißt Co-pilot.",
      spot: "Das Formular liegt oft unter einer Adresse, die auf teamtailor.com endet.",
    },
  },
  notes: {
    greenhouse: [
      {
        fact: "Arbeitgeber können das Formular so einstellen, dass es dich bei bestimmten Antworten auf Ja/Nein- und Auswahlfragen automatisch ablehnt.",
        todo: ANSWER_THE_SAME,
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Laut Greenhouse prüfen die meisten Recruiter Bewerbungen in der Reihenfolge, in der sie eingehen.",
        todo: "Bewirb dich bald, nachdem der Job online gegangen ist.",
        source: { label: "Greenhouse-Blog" },
      },
      {
        fact: "Greenhouse kann Lebensläufe über 2,5 MB nicht lesen. Auch Spalten, Tabellen und Kontaktdaten in einer Kopf- oder Fußzeile oder einem Textfeld bringen es aus dem Tritt.",
        todo: "Nutze eine Spalte und bleib unter 2,5 MB, mit Kontaktdaten im Haupttext.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Im Keyword-Filter von Greenhouse zählt ein Wort in deiner Bewerbung nur, wenn es genau dem Suchwort des Recruiters entspricht.",
        todo: "Nutze für Fähigkeiten, die du hast, die Wörter der Stellenanzeige, etwa „JavaScript“.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Ist Talent Matching eingeschaltet, stuft KI alle Bewerbenden von Strong match bis Limited match ein. Laut Greenhouse entscheidet sie nie selbst, ob jemand weiterkommt oder abgelehnt wird.",
        todo: "Mach die wichtigsten Fähigkeiten des Jobs in deinem Lebenslauf leicht auffindbar.",
        source: { label: GREENHOUSE_HELP },
      },
    ],
    lever: [
      {
        fact: "Lever bietet Recruitern Talent Fit, einen Prozentwert dafür, wie genau deine Fähigkeiten zur Stellenanzeige passen. Laut Lever treffen Recruiter die endgültige Entscheidung.",
        todo: "Nutze die Wörter der Stellenanzeige für Fähigkeiten, die du wirklich hast.",
        source: { label: "Lever" },
      },
    ],
    ashby: [
      {
        fact: "Ist die KI-Prüfung eingeschaltet, prüft Ashby deinen Lebenslauf anhand jedes Kriteriums des Teams: meets (erfüllt), does not meet (nicht erfüllt) oder undecided (offen).",
        todo: "Mach jede Anforderung, die du erfüllst, leicht auffindbar.",
        source: { label: "Ashby-Dokumentation" },
      },
      {
        fact: "Das Team wählt diese Kriterien: KI-Vorschläge aus der Stellenanzeige, Kriterien aus anderen Jobs oder eigene.",
        todo: "Deck die Anforderungen der Anzeige in deinen eigenen, wahren Worten ab.",
        source: { label: "Ashby-Dokumentation" },
      },
      {
        fact: "Recruiter können Bewerbende nach dem Anteil erfüllter Kriterien sortieren, sodass die besten Treffer zuerst gelesen werden.",
        todo: "Zeig jede genannte Anforderung, die du wirklich erfüllst.",
        source: { label: "Ashby-Dokumentation" },
      },
      {
        fact: "Arbeitgeber können Regeln festlegen, die eine Bewerbung beim Absenden anhand ihrer Antworten im Formular automatisch ablehnen. Die E-Mail dazu kann tagelang zurückgehalten werden.",
        todo: ANSWER_THE_SAME,
        source: { label: "Ashby-Dokumentation" },
      },
    ],
    workday: [
      {
        fact: "Der Lebenslauf-Leser von Workday füllt die Felder für Fähigkeiten (Skills) und Sprachen (Languages) nie aus.",
        todo: "Trag deine Fähigkeiten und Sprachen selbst in diese Felder ein.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Laut Workday hängt das, was es liest, vom Layout und von der Wortreihenfolge der Datei ab, und Dateien ohne Bilder funktionieren am besten.",
        todo: "Prüf jedes Feld, das es ausfüllt, bevor du absendest.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Arbeitgeber können Regeln festlegen, die Bewerbende automatisch ablehnen, etwa alle, die im Land des Jobs nicht arbeiten dürfen.",
        todo: "Beantworte Fragen zur Arbeitserlaubnis ehrlich und jedes Mal gleich.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Wo ein Arbeitgeber die neuere Bewertung von HiredScore aktiviert, prüft sie jede genannte Qualifikation einzeln anhand deines Lebenslaufs. Wer alle grundlegenden erfüllt, bekommt ein A oder B.",
        todo: "Belege jedes Muss-Kriterium mit einer Zeile, die es klar zeigt.",
        source: { label: "Versionshinweise zu Workday HiredScore" },
      },
    ],
    icims: [
      {
        fact: "Arbeitgeber mit iCIMS können K.-o.-Fragen hinzufügen, die Bewerbende schon bei der Bewerbung aussortieren.",
        todo: ANSWER_THE_SAME,
        source: { label: "iCIMS-Blog" },
      },
      {
        fact: "iCIMS bietet Candidate Ranking, das mit KI deine Fähigkeiten und Erfahrung mit der Stellenanzeige abgleicht und die besten Treffer zuerst zeigt.",
        todo: "Beschreib deine Erfahrung in den Begriffen der Anzeige, wo sie zutreffen.",
        source: { label: "iCIMS-Blog" },
      },
    ],
    taleo: [
      {
        fact: "Die Keyword-Suche von Taleo findet nur genau dieselben Wörter, außer der Recruiter schaltet Related Terms (verwandte Begriffe) ein.",
        todo: "Nutze die genauen Wörter der Anzeige und schreib Abkürzungen einmal in beiden Formen: „Kubernetes (K8s)“.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Die Keyword-Suche von Taleo liest die PDF-, Word-, RTF-, Text- und HTML-Dateien, die du anhängst.",
        todo: "Häng eine PDF- oder Word-Datei an, nie ein Foto oder einen Scan.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Ausschlussfragen müssen beantwortet werden, und deine Antworten können dich automatisch ausschließen.",
        todo: ANSWER_THE_SAME,
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Arbeitgeber markieren Fähigkeiten und Fragen als Required (erforderlich) oder Asset (von Vorteil). Recruiter können sich nur die Personen anzeigen lassen, die alle Required-Punkte erfüllen.",
        todo: "Beantworte Fragen zu Fähigkeiten genau: Die Required-Punkte entscheiden, ob du berücksichtigt wirst.",
        source: { label: ORACLE_DOCS },
      },
    ],
    successfactors: [
      {
        fact: "Eine falsche Antwort auf eine Ausschlussfrage lehnt dich automatisch ab.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_NOTE },
      },
      {
        fact: "Arbeitgeber können eine Mindestpunktzahl für bewertete Fragen festlegen. Liegst du darunter, wirst du automatisch ausgeschlossen.",
        todo: "Beantworte bewertete Fragen vollständig. Mach echte Erfahrung nicht kleiner, als sie ist.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Gescannte PDFs oder PDFs aus Bildern werden nicht richtig gelesen. Dropdown-Felder werden nie aus deinem Lebenslauf ausgefüllt.",
        todo: "Nutze ein PDF mit echtem Text und füll Dropdowns von Hand aus.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Das Auslesen von Lebensläufen funktioniert nur in einigen Sprachen, etwa Englisch, Deutsch, Französisch, Spanisch und Niederländisch.",
        todo: "Ist deiner in einer anderen Sprache, prüf jedes Feld, das es ausfüllt.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Ist der KI-Abgleich von Fähigkeiten eingeschaltet, zieht SAP Fähigkeiten aus deinem Lebenslauf und sortiert sie in exakte Treffer und fehlende Fähigkeiten.",
        todo: "Nenne die Fähigkeiten des Jobs, die du hast, Wort für Wort.",
        source: { label: SAP_LEARNING },
      },
    ],
    smartrecruiters: [
      {
        fact: "Jede Ja/Nein- oder Dropdown-Frage kann eine K.-o.-Frage sein. Eine K.-o.-Antwort lehnt dich automatisch ab, standardmäßig mit einer E-Mail eine Stunde später.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston Match bewertet deine Fähigkeiten, Erfahrung und Ausbildung im Vergleich zum Job mit 1 bis 4 Sternen, damit Recruiter entscheiden können, wen sie zuerst lesen.",
        todo: "Mach deine Fähigkeiten, Jobs und Ausbildung leicht auffindbar.",
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston errät Fähigkeiten anhand deiner Jobtitel.",
        todo: "Nutze klare, übliche Jobtitel.",
        source: { label: SAP_LEARNING },
      },
    ],
    workable: [
      {
        fact: "K.-o.-Fragen sind nur Ja/Nein-Fragen. Die K.-o.-Antwort schließt dich aus, und du erfährst es nicht.",
        todo: ANSWER_THE_SAME,
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Das Bewerbungsformular von Workable nimmt Lebensläufe bis 5 MB an, als PDF, DOC, DOCX, RTF, HTML oder ODT.",
        todo: "Schick ein PDF oder DOCX unter 5 MB.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Wo ein Arbeitgeber den Workable Agent nutzt, bewertet er dich anhand der Anforderungen des Teams, und Muss-Kriterien zählen doppelt.",
        todo: "Zeig jedes Muss-Kriterium, das du erfüllst, in klaren Worten.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Sagen dein Lebenslauf und deine Antworten zu wenig über eine Anforderung, markiert der Agent sie als Unknown (unbekannt).",
        todo: "Nenne jede Anforderung, die du erfüllst, klar und deutlich.",
        source: { label: WORKABLE_HELP },
      },
    ],
    bamboohr: [
      {
        fact: "Im Recruiting-Tool von BambooHR lesen Menschen aus dem Team deinen Lebenslauf und deine Antworten und bewerten dich selbst.",
        todo: "Beantworte jede Frage vollständig: Menschen lesen sie.",
        source: { label: "BambooHR" },
      },
    ],
    jobvite: [
      {
        fact: "Die KI von Jobvite zieht eine Liste von Fähigkeiten aus deinem Lebenslauf, und ihre Match-Ergebnisse erreichen Recruiter als Noten.",
        todo: "Nenne die Fähigkeiten des Jobs, die du hast, Wort für Wort.",
        source: { label: "Jobvite" },
      },
      {
        fact: "Laut Jobvite lässt sein Modell deinen Namen, deine Kontaktdaten, dein Alter, deine Hautfarbe, dein Geschlecht und deine ethnische Herkunft außen vor.",
        todo: "Nutze deine Worte für Fähigkeiten und Ergebnisse.",
        source: { label: "Jobvite" },
      },
    ],
    recruitee: [
      {
        fact: "K.-o.-Fragen (Ja/Nein, Einfach- oder Mehrfachauswahl) schließen bei der falschen Antwort automatisch aus und können auch die Absage-E-Mail schicken.",
        todo: ANSWER_THE_SAME,
        source: { label: "Recruitee-Hilfecenter" },
      },
    ],
    teamtailor: [
      {
        fact: "Ist Co-pilot eingeschaltet, prüft KI dich anhand von Kriterien, die das Team schreibt: erfüllt, nicht erfüllt oder ein Strich, wenn es zu wenig Anhaltspunkte gibt.",
        todo: "Nenne jede wahrscheinliche Anforderung klar und deutlich.",
        source: { label: "Teamtailor-Hilfecenter" },
      },
      {
        fact: "Co-pilot liest deinen Lebenslauf, dein Anschreiben, deine Antworten und deine Adresse, und der Arbeitgeber kann Personen anhand des Ergebnisses in eine andere Phase verschieben.",
        todo: "Halte dein Anschreiben und deine Antworten im Einklang mit deinem Lebenslauf.",
        source: { label: "Teamtailor-Hilfecenter" },
      },
    ],
  },
  general: [
    {
      title: "Schick echten Text, kein Bild davon",
      text: "Lade eine PDF- oder Word-Datei hoch, die aus Text erstellt wurde. Ein Scan oder Foto einer Seite wird vielleicht nicht richtig gelesen.",
    },
    {
      title: "Bleib bei einer Spalte",
      text: "Setz deine Kontaktdaten in den Haupttext, nicht in eine Kopf- oder Fußzeile, eine Tabelle oder ein Textfeld.",
    },
    {
      title: "Nutze die Wörter der Stellenanzeige für Fähigkeiten, die du hast",
      text: "Manche Suchen finden nur genau dieselben Wörter. Schreib eine Abkürzung einmal in beiden Formen, etwa „Kubernetes (K8s)“.",
    },
    {
      title: "Nutze klare Jobtitel",
      text: "Manche KI, etwa Winston von SmartRecruiters, errät deine Fähigkeiten anhand deiner Jobtitel.",
    },
    {
      title: "Beantworte Screening-Fragen ehrlich und jedes Mal gleich",
      text: "Bei vielen Systemen können Arbeitgeber Bewerbende bei bestimmten Antworten automatisch ablehnen.",
    },
    {
      title: "Prüf, was das Formular ausfüllt",
      text: "Wenn ein Formular seine Felder aus deinem Lebenslauf ausfüllt, lies jedes davon, bevor du absendest.",
    },
  ],
  screeningTip: "Beantworte Screening-Fragen ehrlich und jedes Mal gleich.",
} satisfies AtsTranslation;
