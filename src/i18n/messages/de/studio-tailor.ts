import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  cancel: "Abbrechen",
  stages: {
    reading: "Otto liest die Stellenanzeige.",
    comparing: "Otto vergleicht sie mit deinem Lebenslauf.",
    writing: "Otto schreibt deine angepassten Zeilen.",
    still: "Ich schreibe noch. Lange Anzeigen dauern etwas länger.",
  },
  otto: {
    intro:
      "Füg einen Link zur Stellenanzeige ein. Ich zeige, was sie verlangt und was du schon hast.",
    working:
      "Brille auf. Das dauert bis zu einer Minute. Du kannst diesen Schritt verlassen, ich mache weiter.",
    done: "Dein angepasster Lebenslauf ist fertig. Dein Original bleibt unverändert.",
    cancelled:
      "Gestoppt. Es kann trotzdem als 1 angepasste Fassung zählen, weil ich schon angefangen hatte.",
    screener: {
      noRequirements:
        "Ich habe in dieser Anzeige keine klaren Anforderungen gefunden. Eine vollständigere Anzeige funktioniert besser.",
      niceOnly:
        "Diese Anzeige nennt keine Muss-Anforderungen. Dein Lebenslauf zeigt {shown} von {total} Wunsch-Anforderungen.",
      oneProven: "Dein Lebenslauf belegt die eine Muss-Anforderung. Genau die prüfen Filter.",
      allProven:
        "Dein Lebenslauf belegt alle {total} Muss-Anforderungen. Filter prüfen sie einzeln.",
      noneProven:
        "Ich finde noch keine Belege für die {total} Muss-Anforderungen. Gehen wir sie durch.",
      someProven: {
        one: "Dein Lebenslauf belegt {proven} von {total} Muss-Anforderungen. Schauen wir uns die letzte an.",
        other:
          "Dein Lebenslauf belegt {proven} von {total} Muss-Anforderungen. Schauen wir uns die anderen {count} an.",
      },
    },
  },
  free: {
    otto: "Hier ist jede Kenntnis, die diese Anzeige nennt, und wo dein Lebenslauf sie zeigt.",
    usage:
      "Free zeigt, welche Kenntnisse die Anzeige nennt und wo du sie zeigst. Anpassen gibt es mit Pro.",
    title: "Anpassen mit Pro geht weiter",
    note: "Otto liest die Anzeige nach ihrer Bedeutung, nicht nur nach Wörtern. Er stellt deine besten Zeilen für diesen Job nach vorn, schreibt ein Profil dafür und hilft dir, Zeilen für Fehlendes hinzuzufügen, aus Fakten, die du ihm gibst. Alles landet in einem angepassten Lebenslauf, dein Original bleibt also gleich.",
    already: "Schon bei Pro?",
    signIn: "Anmelden",
  },
  left: "Noch {left} von {limit} angepassten Fassungen {period}.",
  pastedPost: "Die eingefügte Stellenanzeige",
  empty: "Füge zuerst einen Lebenslauf hinzu",
  base: {
    title: "Kopie von „{title}“ wird angepasst",
    note: "Dieser Lebenslauf ist schon angepasst, also arbeite ich mit dem Original, aus dem er stammt. Jeder Job bekommt seine eigene Kopie.",
    fallback: "dein Original-Lebenslauf",
  },
  comparedWith: "Verglichen mit",
  changePost: "Stellenanzeige ändern",
  startOver: "Mit einem anderen Job neu anfangen",
  stale: {
    freeTitle: "Diese Prüfung gilt für die vorher verglichene Anzeige",
    freeNote: "Vergleiche erneut, um die Anzeige in ihrer jetzigen Form zu prüfen.",
    title: "Diese Ergebnisse gelten für die vorher gesendete Anzeige",
    note: "Vergleiche erneut, um sie für die Anzeige in ihrer jetzigen Form zu aktualisieren.",
  },
  savedJobFailed: "Diese gespeicherte Stelle ließ sich nicht öffnen",
  errors: {
    signedOut: "Du wurdest abgemeldet. Melde dich erneut an, um weiterzumachen.",
    refused: "Mit dieser Anzeige kann ich nicht arbeiten. Füg nur die Stellenbeschreibung ein.",
    badPost:
      "Diese Anzeige ist nicht angekommen. Prüf, ob es die vollständige Anzeige ist, und versuch es erneut.",
  },
  row: {
    status: {
      proven: { label: "Belegt", chip: "Belegt" },
      listed: { label: "Genannt, aber nicht belegt", chip: "Genannt, nicht belegt" },
      missing: { label: "Nicht gezeigt", chip: "Nicht gezeigt" },
      declined: { label: "Du hast Nein gesagt", chip: "Du sagtest Nein" },
    },
    newLine: "Deine neue Zeile für den angepassten Lebenslauf",
    matchedByOtto: "von Otto gefunden",
    removeLine: "Zeile entfernen",
    showLine: "Zeile zeigen",
    unproven:
      "Diese Zeile kommt in den angepassten Lebenslauf, nennt aber {name} nicht, deshalb zählt ein Filter sie nicht.",
    showWhere: "Zeig, wo du es genutzt hast",
    yes: "Ja",
    no: "Nein",
    staysOff: "Es bleibt aus deinem Lebenslauf raus.",
    changeAnswer: "Antwort ändern",
  },
  addLine: {
    where: "Wo hast du es gemacht?",
    what: "Was hast du gemacht?",
    whatHint: "Ein paar Worte reichen. Otto fügt nichts hinzu, was du nicht gesagt hast.",
    whatFirst: "Sag zuerst, wo und was du gemacht hast. Ein paar Worte reichen.",
    placeholder: "Zwei neue Kollegen in ihrem ersten Monat begleitet",
    placeholderWith: "Unsere Staging-Server mit {name} aufgesetzt",
    noTarget:
      "Füge zuerst unter Zeilen korrigieren einen Job oder ein Projekt hinzu und komm dann zurück, um diese Zeile hinzuzufügen.",
    write: "Zeile schreiben",
    useMine: "Meine Worte nehmen",
    cancel: "Abbrechen",
    usesFix: "Die Zeile zu schreiben kostet 1 Zeilenkorrektur.",
    newLine: "Deine neue Zeile",
    newLineHint: "Kommt in den angepassten Lebenslauf, unter {place}.",
    brackets: "Füll zuerst aus oder lösche, was in [Klammern] steht.",
    nameIt: "Nenn {name} in der Zeile, damit ein Filter es findet.",
    claimsMore:
      "Otto hat „{verb}“ geschrieben, das behauptet mehr, als du gesagt hast. Ändere es, wenn es nicht stimmt.",
    droppedHelp:
      "Du hast gesagt, dass du geholfen hast; diese Zeile klingt, als hättest du es allein gemacht. Ergänze es wieder, wenn das fairer ist.",
    add: "Zeile hinzufügen",
    back: "Zurück",
  },
  results: {
    label: "Ergebnisse der Anpassung",
    gone: "Dieser Lebenslauf ist weg",
    goneNote: "Wähl einen anderen und versuch es erneut.",
    bestFirst: "Deine besten Zeilen zuerst",
    bestFirstNote:
      "Zeilen, die eine Muss-Anforderung belegen, rücken an den Anfang ihres Jobs, wo Filter und Recruiter zuerst hinschauen.",
    movedIn: {
      one: "Zeilen rücken in {moved} von {count} Job nach oben",
      other: "Zeilen rücken in {moved} von {count} Jobs nach oben",
    },
    tips: "Tipps für diesen Job",
    tipCount: { one: "{count} Tipp", other: "{count} Tipps" },
  },
  copy: {
    title: "Dein angepasster Lebenslauf",
    picked: "Für diesen Job ausgewählt. Ändere unten, was du willst. Dein Original bleibt gleich.",
    create: "Angepasste Fassung erstellen",
    ready: "Dein angepasster Lebenslauf ist fertig",
    readyNote: "{title}. Dein Original bleibt gleich.",
    open: "Angepasste Fassung öffnen",
    another: "Noch eine erstellen",
    barReady: "Deine Kopie für diesen Job ist fertig: {title}.",
  },
  changes: {
    lines: {
      one: "Fügt {count} von dir bestätigte Zeile hinzu",
      other: "Fügt {count} von dir bestätigte Zeilen hinzu",
    },
    skills: {
      one: "Fügt {count} Kenntnis zu deinem Abschnitt Kenntnisse hinzu",
      other: "Fügt {count} Kenntnisse zu deinem Abschnitt Kenntnisse hinzu",
    },
    reordered: {
      one: "Stellt deine besten Zeilen in {count} Job nach vorn",
      other: "Stellt deine besten Zeilen in {count} Jobs nach vorn",
    },
    summary: "Nutzt das neue Profil",
    inline: {
      lines: {
        one: "fügt {count} von dir bestätigte Zeile hinzu",
        other: "fügt {count} von dir bestätigte Zeilen hinzu",
      },
      skills: {
        one: "fügt {count} Kenntnis zu deinem Abschnitt Kenntnisse hinzu",
        other: "fügt {count} Kenntnisse zu deinem Abschnitt Kenntnisse hinzu",
      },
      reordered: {
        one: "stellt deine besten Zeilen in {count} Job nach vorn",
        other: "stellt deine besten Zeilen in {count} Jobs nach vorn",
      },
      summary: "nutzt das neue Profil",
    },
    sentence: "Die Kopie {changes}. Dein Original bleibt gleich.",
    none: "Keine Änderungen gewählt. Die Kopie behält deine Zeilen, wie sie sind, mit dem Namen dieses Jobs.",
  },
  lines: {
    title: "Deine Zeilen für diesen Job",
    shows: {
      one: "{count} Zeile zeigt, was diese Anzeige verlangt",
      other: "{count} Zeilen zeigen, was diese Anzeige verlangt",
    },
    weak: "{count} könnten es besser sagen",
    unrelated: {
      one: "{count} weitere Zeile zeigt nichts davon; sie kann weiter unten bleiben.",
      other: "{count} weitere Zeilen zeigen nichts davon; sie können weiter unten bleiben.",
    },
    must: "Muss",
    nice: "Wunsch",
    newLine: "Deine neue Zeile für den angepassten Lebenslauf",
    couldBeBetter: "Könnte besser sein:",
    showLine: "Zeile zeigen",
    fewer: "Weniger zeigen",
    all: "Alle {count} Zeilen zeigen",
  },
  top: {
    title: "Der Anfang deines Lebenslaufs",
    note: "Ein Recruiter liest deine Berufsbezeichnung und dein Profil vor jeder Zeile.",
    bothFit: "Deine Berufsbezeichnung und dein Profil passen zu diesem Job",
    summaryFits: "Dein Profil passt zu diesem Job",
    bothOff: "Deine Berufsbezeichnung und dein Profil könnten besser zu diesem Job passen",
    titleOff: "Deine Berufsbezeichnung könnte besser zu diesem Job passen",
    summaryOff: "Dein Profil könnte besser zu diesem Job passen",
    jobTitle: "Berufsbezeichnung",
    summary: "Profil",
    looksRight: ": passt",
    couldBeBetter: ": könnte besser sein",
    suggested: "Vorgeschlagenes Profil",
    suggestedNote: "Nur aus dem geschrieben, was schon in deinem Lebenslauf steht.",
    useSummary: "Dieses Profil nutzen",
    replaces: "Ersetzt dein aktuelles Profil nur im angepassten Lebenslauf.",
    fillsGap: "Dein Lebenslauf hat noch kein Profil, also füllt dieses die Lücke.",
  },
  screener: {
    eyebrow: "Sicht des KI-Filters",
    none: "Keine klaren Anforderungen in dieser Anzeige",
    noneNote:
      "Sie sagt nicht, was jemand mitbringen muss. Eine vollständigere Anzeige mit Anforderungen funktioniert besser.",
    title: "Die Anforderungen, eine nach der anderen",
    note: "Tools wie HiredScore und Ashby prüfen jede Anforderung einzeln. Das hier ist diese Prüfung, offen gemacht. Es ist nicht die genaue Bewertung eines Tools.",
    groups: { must: "Muss-Anforderungen", nice: "Wunsch-Anforderungen" },
  },
  overview: {
    title: "Für diesen Job zuerst korrigieren",
    allShown: "Jede Muss-Anforderung steht in einer Zeile darüber, was du gemacht hast.",
    showLine: "Zeile zeigen",
    goTo: "Hingehen",
    see: "Ansehen",
  },
  recent: {
    title: "Letzte Jobs",
    saved: "Gespeichert:",
    tailored: "Schon angepasst:",
    failed: "Dieser Job ließ sich nicht öffnen",
    failedNote: "Versuch es gleich noch mal.",
  },
  system: {
    uses: "Dieser Job nutzt {system}",
    howItReads: "wie es dich liest",
    notes: { one: "{count} Hinweis zu {system}", other: "{count} Hinweise zu {system}" },
    questions:
      "Fragen in diesem Formular, die so eingestellt werden können, dass sie dich automatisch ablehnen",
    required: "Pflichtfeld",
    yesNo: "Ja oder Nein",
    choices: "{count} Optionen",
    answerTruthfully:
      "Ich weiß nicht, welche dieser Arbeitgeber nutzt. Antworte ehrlich und jedes Mal gleich.",
  },
  kit: {
    title: "Auf diesen Job bewerben",
    meta: "Ein Anschreiben und Antworten auf Formularfragen",
    note: "Nur aus deinem Lebenslauf und dieser Anzeige geschrieben, in einfachen Worten. Du kopierst es dorthin, wo es hingehört.",
    letterWritten: "Anschreiben geschrieben",
    answers: { one: "{count} Antwort", other: "{count} Antworten" },
  },
  letter: {
    title: "Anschreiben",
    words: "{count} Wörter",
    about:
      "Etwa 200 Wörter: die Rolle, deine passendsten Fakten und warum dieser Job. Nur aus deinem Lebenslauf.",
    check: "Prüf es, bevor du es abschickst",
    copy: "Kopieren",
    download: "PDF herunterladen",
    rewrite: "Neu schreiben",
    write: "Anschreiben schreiben",
    pdfFailed: "Dein PDF ist nicht entstanden",
    pdfFailedNote: "Versuch es erneut oder kopiere das Anschreiben.",
  },
  answers: {
    title: "Eine Bewerbungsfrage beantworten",
    question: "Die Frage",
    hint: "Aus deinem Lebenslauf und diesem Job. Prüf jeden Satz, bevor du ihn einfügst: Otto schickt nie etwas ab.",
    placeholder: "Warum willst du hier arbeiten?",
    whole: "Füg die ganze Frage aus dem Formular ein, etwa „Warum willst du hier arbeiten?“",
    draft: "Antwort entwerfen",
    remove: "Diese Antwort entfernen",
    copy: "Kopieren",
    words: "{count} Wörter",
  },
  reorder: {
    moveUp: "Wir stellen diese Zeilen nach oben:",
    more: "Und {count} weitere.",
  },
  reasons: {
    places: {
      at: "{title} bei {company}",
      line: "{place}, Zeile {number}",
      experience: "Berufserfahrung",
      project: "Projekt",
      education: "Ausbildung",
      jobTitle: "Jobtitel",
      certifications: "Zertifikate",
      summary: "Profil",
      skills: "Kenntnisse",
      skillsGroup: "Kenntnisse: {label}",
      headline: "Berufsbezeichnung",
    },
    problems: {
      duty: "liest sich wie eine Stellenbeschreibung",
      "no-result": "sagt nicht, was sich geändert hat",
      "weak-start": "fängt schwach an",
      "stock-phrase": "stützt sich auf eine Floskel",
      "first-person": "sagt ich oder wir",
      tense: "steht im Präsens, obwohl du den Job nicht mehr hast",
    },
    years: {
      one: " Die Anzeige verlangt {asked}+ Jahre; deine Jobdaten ergeben etwa {count} Jahr.",
      other: " Die Anzeige verlangt {asked}+ Jahre; deine Jobdaten ergeben etwa {count} Jahre.",
    },
    spelled:
      " Die Anzeige sagt „{term}“, deine Zeile sagt es anders. Manche Systeme suchen nur nach genauen Wörtern, also schreib auch einmal „{term}“.",
    added: "Deine neue Zeile zeigt es. Sie kommt in den angepassten Lebenslauf.",
    onlyIn: "Nur in {where}. Zeig es auch in einer Zeile darüber, was du gemacht hast.",
    onlyInPlaces: {
      jobTitle: "einem Jobtitel",
      certifications: "deinen Zertifikaten",
      education: "deiner Ausbildung",
      summary: "deinem Profil",
    },
    shownOutside: "Gezeigt {where}, nicht in einem Job.",
    outsidePlaces: {
      project: "in deinem Projekt {name}",
      education: "in deiner Ausbildung",
      other: "in {name}",
    },
    atWork: " Wenn du es im Job genutzt hast, schreib das bei diesem Job.",
    shownWithProblem: "Gezeigt bei {where}, aber diese Zeile {problem}.",
    shownAt: "Gezeigt in einer Zeile bei {where}.",
    declined: "Du hast gesagt, dass du es nicht hast.",
    otherForm:
      "Dein Lebenslauf sagt „{written}“, die Anzeige sagt „{asked}“. Die Stichwortsuche findet nur die getippte Form, also schreib einmal beide: „{both}“.",
    listed:
      "Nur in deiner {list}. Keine Jobzeile zeigt, dass du es genutzt hast, und Filter suchen es in dem, was du gemacht hast.",
    lists: {
      headline: "Berufsbezeichnung",
      skills: "Kenntnisliste",
      group: "Kenntnisliste ({group})",
    },
    missingMust: "Die Anzeige verlangt das, und nichts in deinem Lebenslauf sagt es bisher.",
    missingNice: "Ein Plus für diesen Job. Nichts in deinem Lebenslauf sagt es bisher.",
    lineNote: "Zeigt {names} ({kind}). {next}",
    lineKinds: { must: "eine Muss-Anforderung", nice: "eine Wunsch-Anforderung" },
    keepNearTop: "Lass sie weit oben.",
    fixFirst: {
      missing: {
        one: "{count} Muss-Anforderung fehlt in deinem Lebenslauf: {names}",
        other: "{count} Muss-Anforderungen fehlen in deinem Lebenslauf: {names}",
      },
      missingReason:
        "Wenn du es gemacht hast, sag wo. Wenn nicht, sag Nein, dann kommt nichts dazu.",
      listed: {
        one: "{count} Muss-Anforderung steht nur in deiner Kenntnisliste: {names}",
        other: "{count} Muss-Anforderungen stehen nur in deiner Kenntnisliste: {names}",
      },
      listedReason:
        "Filter suchen sie in einer Zeile darüber, was du gemacht hast. Zeig, wo du sie genutzt hast.",
      spelled: "Die Anzeige sagt „{asked}“, dein Lebenslauf sagt „{written}“",
      spelledReason:
        "Die Stichwortsuche findet nur die getippte Form. Schreib einmal beide: „{both}“.",
      weak: {
        one: "{count} Zeile mit einer Muss-Anforderung wirkt schwach",
        other: "{count} Zeilen mit Muss-Anforderungen wirken schwach",
      },
      title: "Deine Berufsbezeichnung nennt diesen Job nicht",
      noSummary: "Kein Profil ganz oben",
      summary: "Dein Profil geht nicht auf diesen Job ein",
    },
    headline: {
      must: "Belegte Muss-Anforderungen: {proven} von {total}",
      nice: "Wunsch-Anforderungen: {proven} von {total}",
      join: " · ",
    },
    title: {
      headline: "Deine Berufsbezeichnung passt zum Titel der Anzeige, „{title}“.",
      latest: "Dein letzter Jobtitel passt zum Titel der Anzeige, „{title}“.",
      missing:
        "Der Titel der Anzeige ist „{title}“. Wenn er zu dir passt, schreib ihn unter deinen Namen. Recruiter suchen nach Jobtiteln.",
      differs:
        "Der Titel der Anzeige ist „{title}“, deine Berufsbezeichnung sagt „{headline}“. Wenn der Job zu dir passt, nimm seinen Titel in deine Berufsbezeichnung oder dein Profil. Ändere nie den Titel eines früheren Jobs.",
    },
    summary: {
      missing:
        "Du hast kein Profil. Zwei Zeilen ganz oben, die diesen Job und deine beste Übereinstimmung nennen, helfen allen, die nur überfliegen.",
      names: "Dein Profil nennt {what}.",
      theTitle: "den Jobtitel",
      differs: "Dein Profil nennt weder diesen Job noch seine Muss-Anforderungen.",
      suggest: " Du zeigst {names} in deinen Zeilen; schreib es auch oben hin.",
    },
    targets: { aJob: "Ein Job", project: "Projekt: {name}", untitled: "ohne Titel" },
    asks: {
      used: "Hast du schon mit {term} gearbeitet?",
      experience: "Hast du Erfahrung mit {phrase}?",
    },
  },
  skip: {
    note: "Keinen Job im Kopf? Lade ihn so herunter, wie er ist.",
    action: "Weiter zu Herunterladen",
  },
} satisfies Translation<Messages["studioTailor"]>;
