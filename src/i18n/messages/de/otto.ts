import type { Messages } from "..";
import type { Translation } from "../../types";

// Otto's lines about limits, plans and errors, in German.
export default {
  comesWithPro: {
    fix: "Mehr Zeilenkorrekturen gibt es mit Pro.",
    tailor: "Anpassen gibt es mit Pro.",
    letter: "Anschreiben, Kontaktnachrichten, Antworten und Interviewvorbereitung gibt es mit Pro.",
    import: "Das Lesen von Uploads mit KI gibt es mit Pro.",
    draft: "Entwürfe mit mir erstellen gibt es mit Pro.",
    github: "Entwürfe aus GitHub gibt es mit Pro.",
  },
  tool: {
    resumes: "Free speichert {free}. {pro} speichert {proCount}, {max} {maxCount}.",
    formats: "Dieses Format gibt es mit Pro. Free hat Classic und Compact.",
    word: "Word-Downloads gibt es mit Pro. Dein PDF-Download bleibt kostenlos.",
    tracker: "Free verfolgt {free}. {pro} verfolgt {proCount}, {max} {maxCount}.",
    jobs: "Filter, gespeicherte Jobs und alle Treffer gibt es mit Pro.",
    share: "Teilen-Links gibt es mit Pro.",
    eligibility: "Prüfen, von wo ein Job einstellen kann, gibt es mit Pro.",
    portfolio: "Eine Portfolio-Website unter deinem eigenen Link gibt es mit Pro.",
  },
  resumes: { one: "{count} Lebenslauf", other: "{count} Lebensläufe" },
  applications: { one: "{count} Bewerbung", other: "{count} Bewerbungen" },
  labels: {
    fix: "Zeilenkorrekturen",
    tailor: "angepasste Versionen",
    letter: "Anschreiben, Antworten und Vorbereitungen",
    import: "KI-Lesungen",
    draft: "Entwürfe",
    github: "GitHub-Entwürfe",
  },
  withTrial: "{line} Teste {plan} {days} Tage lang.",
  reached: {
    month: "Du hast die {limit} {label} dieses Monats genutzt. {reset}",
    trial: "Du hast die {limit} {label} dieser Testphase genutzt. {reset}",
  },
  freeUsed: "Du hast die {limit} {label} dieses Monats genutzt. {pro} hat {proLimit} pro Monat.",
  near: "Oje, {used} von {limit} {label} genutzt. {reset}",
  full: {
    resumes:
      "{plan} speichert {limit} Lebensläufe. Lösch einen, um einen neuen zu speichern{upsell}.",
    resumesOver:
      "{plan} speichert {limit} Lebensläufe; du hast {held}. Lösch {over}, um einen neuen zu speichern{upsell}.",
    tracker:
      "{plan} verfolgt {limit} Bewerbungen. Lösch ein paar alte, um mehr hinzuzufügen{upsell}.",
    trackerOver:
      "{plan} verfolgt {limit} Bewerbungen; du hast {held}. Lösch {over}, um eine neue hinzuzufügen{upsell}.",
    upsell: ", oder wechsle zu {plan} für {limit}",
  },
  signedOut: "Du wurdest abgemeldet. Melde dich erneut an, um weiterzumachen.",
  writing: {
    none: "Du hast {period} keine Anschreiben, Nachrichten oder Antworten mehr übrig. {reset}",
    left: "{left} von {limit} Anschreiben, Nachrichten und Antworten {period} übrig.",
  },
  errors: {
    generic: "Bei mir ist etwas schiefgelaufen. Versuchst du es noch mal?",
    aiUnavailable:
      "Da hänge ich gerade fest. Versuch es in einer Minute noch mal. Die meisten solcher Aussetzer zählen nicht gegen dich.",
    offline: "Du scheinst offline zu sein. Deine Arbeit ist in diesem Browser gespeichert.",
    rateLimited: "Das ist viel auf einmal. Gib mir eine Minute, um aufzuholen.",
    notFound: "Ich habe überall gesucht, aber diese Seite gibt es hier nicht.",
  },
  upgrade: {
    done: "Du hast jetzt {plan}. Deine neuen Limits gelten sofort.",
    trial:
      "Teste meine ganze KI-Hilfe: {plan} {days} Tage lang für {price}. Kündige vor dem Ende, dann zahlst du nichts weiter.",
    trialStarted: "Deine Pro-Testphase läuft bis {day}. Legen wir los.",
  },
  budget: {
    month: "Du hast das KI-Budget dieses Monats aufgebraucht.",
    trial: "Du hast das KI-Budget dieser Testphase aufgebraucht.",
    resetsOn: "Es wird am {day} zurückgesetzt.",
    resetsWhenRenews: "Es wird bei der Verlängerung deines Tarifs zurückgesetzt.",
  },
} satisfies Translation<Messages["otto"]>;
