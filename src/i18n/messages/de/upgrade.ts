import type { Messages } from "..";
import type { Translation } from "../../types";

// The upgrade and add-credit dialogs, in German.
export default {
  otto: {
    pitch: "Anpassungen, Anschreiben und Zeilenkorrekturen jeden Monat, für eine volle Jobsuche.",
    billingOff:
      "Zahlungen sind noch nicht aktiv, aber du kannst uns trotzdem wegen eines Tarifs schreiben.",
    alreadyMax: "Du hast Max, den größten Tarif. Schreib uns, wenn du mehr brauchst.",
    biggest: "Du hast {plan}, den größten Tarif hier. Schreib uns, wenn du mehr brauchst.",
    hasMore: "{line} {plan} hat mehr.",
    monthCredit:
      "Du hast diesen Monat {spent} Guthaben aufgeladen, mehr als die {extra}, die {max} mehr kostet als {pro}.",
  },
  title: {
    reached: {
      month: "Limit für diesen Monat erreicht",
      trial: "Limit für diese Testphase erreicht",
    },
    onPlan: "Du hast {plan}",
    updateCard: "Karte aktualisieren",
    upgradeTo: "Upgrade auf {plan}",
    choose: "Wähl deinen Tarif",
    trial: "Teste {plan} {days} Tage lang",
  },
  resets: "Es wird {when} zurückgesetzt. Brauchst du vorher mehr? Schreib uns.",
  resetsCredit:
    "Es wird {when} zurückgesetzt. Brauchst du vorher mehr? Lade Guthaben auf oder schreib uns.",
  cancelAnytime: "Jederzeit in deinem Konto kündbar.",
  inPlace: "Dein Abo ändert sich direkt: Du zahlst nur die Differenz, nie doppelt.",
  creditFrom: "Oder lade Guthaben ab {min} auf: {buys}.",
  balance: "Dein Guthaben: {balance}.",
  replace:
    "Oder ersetze „{title}“ durch den neuen. Der alte bleibt {days} Tage unter Zuletzt gelöscht, nur in diesem Browser.",
  buttons: {
    addCredit: "Guthaben aufladen",
    replace: "Ersetzen",
    notNow: "Nicht jetzt",
    close: "Schließen",
    emailUs: "Schreib uns",
    back: "Zurück",
    manageBilling: "Zahlung verwalten",
  },
  toast: {
    alreadyOn: "Du hast schon {plan}.",
    backOn: "Du hast {plan}. Machen wir da weiter, wo du warst.",
  },
  trial: {
    notice: "{plan} startet jetzt und deine {trialPlan}-Testphase endet. {charge}",
    charge:
      "Du zahlst sofort {price} (plus ggf. Steuern) mit deiner hinterlegten Karte. Die {trial} für die Testphase werden nicht angerechnet.",
    paymentIssue:
      "Deine letzte Zahlung ist nicht durchgegangen, darum hast du vorerst Free. Aktualisiere deine Karte unter Zahlung verwalten, um deinen Tarif zurückzubekommen.",
    resumeTrial:
      "Deine Testphase ist zur Beendigung vorgemerkt. Setz sie unter Zahlung verwalten fort und starte dann {plan}.",
    resumePlan:
      "Dein Tarif ist zur Beendigung vorgemerkt. Setz ihn unter Zahlung verwalten fort, um den Tarif zu wechseln.",
  },
  offer: {
    howOften: "Zahlweise",
    intervals: { month: "Monatlich", year: "Jährlich" },
    spoken: { month: "pro Monat", year: "pro Jahr" },
    per: { month: "/Monat", year: "/Jahr" },
    current: "Aktueller Tarif",
    popular: "Beliebt",
    save: "{percent} % sparen",
    referencePrice: "Referenzpreis",
    monthlyOnly: "Vorerst nur monatlich.",
    aboutMonth: "Etwa {price} pro Monat.",
    everythingInPro: "Alles aus Pro, und mehr:",
    highlight: {
      month: "{count} {label} pro Monat",
      trial: "{count} {label} in der Testphase",
    },
    labels: {
      fix: "Zeilenkorrekturen",
      tailor: "angepasste Versionen",
      letter: "Anschreiben, Kontaktnachrichten, Antworten und Interviewvorbereitungen",
      import: "KI-Lesungen eines hochgeladenen Lebenslaufs",
      draft: "Entwürfe mit Otto",
      github: "GitHub-Projektentwürfe",
    },
    proHighlight: "Alle {formats} Formate, Word-Downloads und alle Jobtreffer",
    limitsHighlight: "Bis zu {resumes} Lebensläufe und {applications} verfolgte Bewerbungen",
    tryPlan: "Teste {plan} {days} Tage lang",
    upgradeTo: "Upgrade auf {plan}",
    startNow: "{plan} jetzt starten",
    resetRule: {
      month: "Limits werden jeden Monat bei der Verlängerung deines Tarifs zurückgesetzt.",
      year: "Limits werden jeden Monat zurückgesetzt, am Tag des Monats, an dem dein Tarif begann.",
    },
    promises:
      "Uploads funktionieren immer: Nach den KI-Lesungen liest sie der einfache Leser. PDF-Downloads bleiben in jedem Tarif kostenlos.",
    trialSentence:
      "{price} für {days} Tage, danach {planPrice} {perInterval}. Du kannst jederzeit vor Ende der Testphase kündigen.",
    perInterval: { month: "pro Monat", year: "pro Jahr" },
    endsTrial: "Beendet heute deine {trialPlan}-Testphase und startet {plan} für {priceLabel}.",
    monthly: "{price} pro Monat. Jederzeit kündbar.",
    yearly:
      "{price} einmal im Jahr, etwa {perMonth} pro Monat. {savings} % weniger als bei monatlicher Zahlung.",
    yearlyFlat: "{price} einmal im Jahr.",
  },
  billing: {
    testMode: "Testmodus",
    mockPlan: "Keine echte Zahlung. Dein Tarif wechselt sofort.",
    offTitle: "Zahlungen sind noch nicht aktiv",
    off: "Du willst jetzt einen bezahlten Tarif? Schreib an <link>{email}</link>, dann richten wir ihn ein.",
  },
  credit: {
    title: "Guthaben aufladen",
    description:
      "Wird nur genutzt, wenn das Kontingent eines Monats aufgebraucht ist. Es verfällt nie, solange dein Konto besteht.",
    amount: "Betrag",
    other: "Anderer",
    amountLabel: "Betrag in Dollar",
    hint: "Ganze Dollar, {min} bis {max}.",
    add: "{amount} aufladen",
    pick: "Wähl einen Betrag in ganzen Dollar von {min} bis {max}.",
    room: "Dein Guthaben fasst bis zu {cap}, du kannst also jetzt bis zu {room} aufladen.",
    full: "Dein Guthaben fasst bis zu {cap}. Nutze erst etwas davon, dann lade mehr auf.",
    failed: "Guthaben konnte nicht aufgeladen werden",
    balanceNow: "Dein Guthaben jetzt: {balance}.",
    mock: "Keine echte Zahlung. Das Guthaben wird sofort gutgeschrieben.",
    tax: "Zzgl. ggf. Steuern an der Kasse. Im Voraus bezahlt und nach Nutzung nicht erstattbar.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "angepasste Versionen",
      letter: "Anschreiben",
      fix: "Zeilenkorrekturen",
      import: "KI-Lebenslauf-Lesungen",
      draft: "Entwürfe mit Otto",
      github: "GitHub-Projektentwürfe",
    },
  },
} satisfies Translation<Messages["upgrade"]>;
