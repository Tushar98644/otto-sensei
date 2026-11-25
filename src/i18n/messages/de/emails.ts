import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signOff: "{mascot} von {brand}",
  linkLine: "{label}: {url}",
  unsubscribe: "Abmelden",
  unsubscribeLine: "Mit einem Klick abmelden: {url}",
  emailSettings: "E-Mail-Einstellungen",
  signInCode: {
    subject: "Dein Otto-Sensei-Code: {token}",
    lead: "Dein Code für Otto Sensei lautet",
    expires: "Er läuft in 10 Minuten ab.",
    ignore: "Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.",
  },
  trialEnding: {
    subject: "Deine {plan}-Testphase endet am {day}",
    at: "{day} um {time}",
    price: { month: "{price} pro Monat", year: "{price} pro Jahr" },
    noticeBody:
      "Sie endet am {when}. Danach kostet {plan} {price}. Du kannst jederzeit vorher auf deiner Kontoseite kündigen.",
    lead: "Kurzer Hinweis: Deine {plan}-Testphase endet am {when}.",
    charge:
      "Danach kostet {plan} {price} (in US-Dollar, zuzüglich Sales Tax oder Mehrwertsteuer an deinem Wohnort), bis du kündigst. Wenn du {plan} behalten möchtest, musst du nichts tun.",
    cancel:
      "Wenn du nicht weitermachen möchtest, kannst du jederzeit vorher auf deiner Kontoseite kündigen, und dir wird nichts weiter berechnet.",
    account: "Dein Konto",
    button: "Zu deinem Konto",
    footer:
      "Du bekommst diese E-Mail, weil deine {plan}-Testphase bald endet. Es ist ein Abrechnungshinweis, deshalb kommt er auch, wenn Erinnerungs-E-Mails aus sind.",
  },
  checkin: {
    noticeTitle: "Dein Monatsrückblick für {month}",
    noticeBody:
      "Eine Minute: was du umgesetzt hast, ein paar Zahlen und was du gelernt oder geleitet hast.",
    subject: "Dein Monatsrückblick für {month} in einer Minute",
    lead: "Eine Minute für den {month}? Drei kurze Fragen, per Sprache oder Text. Überspring, was du willst.",
    prompts: {
      shipped: {
        label: "Was hast du umgesetzt oder verbessert?",
        hint: "Ein Feature, ein Fix, ein Prozess, ein Abschluss.",
      },
      numbers: {
        label: "Irgendwelche Zahlen?",
        hint: "Nutzer, %, Geld, gesparte Zeit. Grob reicht.",
      },
      learned: {
        label: "Etwas gelernt oder geleitet?",
        hint: "Eine Fähigkeit, ein Tool, eine Person, der du geholfen hast.",
      },
    },
    nothingNew: "Nichts Neues diesen Monat? Das ist ein Tipp auf der Seite.",
    free: "Deine Notizen bleiben in jedem Tarif kostenlos. Wenn du deinen nächsten Job suchst, macht Pro daraus Lebenslaufzeilen, die deine eigenen Fakten zitieren.",
    button: "Meinen Rückblick schreiben",
    reason:
      "Du bekommst diese E-Mail, weil du den Monatsrückblick im Karrieretagebuch eingeschaltet hast. Einmal im Monat.",
  },
  processorNotice: {
    subject: "Dodo Payments nimmt ab dem {day} die Zahlungen für {brand} an",
    intro:
      "Ein kurzer Hinweis zu Zahlungen: Dodo Payments übernimmt jetzt den Bezahlvorgang für {brand} anstelle von Paddle und nimmt ab dem {day} echte Zahlungen an.",
    reseller:
      "Dodo Payments ist unser Online-Wiederverkäufer und Merchant of Record. Dodo Payments nimmt die Zahlung an, wenn du einen Tarif kaufst, und kümmert sich um Belege, Sales Tax oder Mehrwertsteuer, Erstattungen und Abrechnungssupport.",
    data: "Wenn du einen Bezahlvorgang startest, senden wir Dodo Payments die E-Mail-Adresse deines Kontos, unsere zufällige ID für dein Konto und den gewählten Tarif, also dieselben Angaben, die Paddle bisher bekam. Dodo Payments verarbeitet deine Zahlungsdaten nach seiner eigenen Datenschutzerklärung.",
    nothing:
      "Du musst nichts tun. Alles, was du in {brand} erstellt hast, bleibt, wie es ist, und unsere Preise ändern sich nicht.",
    updated:
      "Wir haben unsere AGB, Datenschutzerklärung und Erstattungsseite entsprechend aktualisiert:",
    terms: "AGB",
    privacy: "Datenschutzerklärung",
    refunds: "Erstattungen",
    questions: "Fragen? Schreib an {email}.",
    footer:
      "Du bekommst diese E-Mail, weil du ein Konto bei {brand} hast. Es ist ein einmaliger Hinweis zu einer Änderung unserer AGB und Datenschutzerklärung, deshalb kommt er auch, wenn andere E-Mails aus sind.",
  },
  unsubscribePage: {
    title: "Abmelden",
    invalid:
      "Dieser Link ist nicht mehr gültig. Otto verschickt diese E-Mails nicht mehr; deine Erinnerungen findest du in der Glocke in deiner Übersicht.",
    failed: "Diese E-Mails konnten nicht abgeschaltet werden. Bitte versuch es noch einmal.",
    lists: {
      reminders: {
        name: "Erinnerungs-E-Mails zum Nachfassen",
        ask: "Erinnerungs-E-Mails zum Nachfassen abschalten? Deine Erinnerungen bleiben in der Glocke in deiner Übersicht.",
        press: "Erinnerungs-E-Mails abschalten",
        done: "Erledigt. Du bekommst keine Erinnerungs-E-Mails zum Nachfassen mehr. Die Glocke in deiner Übersicht behält sie.",
      },
      jobs: {
        name: "Die wöchentliche Jobs-E-Mail",
        ask: "Die wöchentliche E-Mail zu neuen Jobs, die zu deinem Lebenslauf passen, stoppen? Der Tab Jobs zeigt sie weiterhin.",
        press: "Wöchentliche E-Mail stoppen",
        done: "Erledigt. Du bekommst die wöchentliche Jobs-E-Mail nicht mehr. Neue Treffer erscheinen in der Glocke in deiner Übersicht.",
      },
      tips: {
        name: "Tipps und Erinnerungen",
        ask: "Tipps- und Erinnerungs-E-Mails stoppen, etwa den Hinweis, wenn die Zeilenkorrekturen von Free zurück sind? Abrechnungshinweise zu einer Testphase kommen weiterhin.",
        press: "Tipps und Erinnerungen stoppen",
        done: "Erledigt. Du bekommst keine Tipps- und Erinnerungs-E-Mails mehr.",
      },
      views: {
        name: "Aufrufe-E-Mails",
        ask: "Die E-Mails stoppen, wenn jemand deine Lebenslauf-Links oder dein Portfolio öffnet? Die Glocke in deiner Übersicht zeigt sie weiterhin.",
        press: "Aufrufe-E-Mails stoppen",
        done: "Erledigt. Du bekommst keine Aufrufe-E-Mails mehr. Die Glocke in deiner Übersicht behält sie.",
      },
      career: {
        name: "E-Mails zum Monatsrückblick",
        ask: "Die monatliche E-Mail zum Karrieretagebuch stoppen? Dein Tagebuch bleibt, kostenlos, und die Glocke in deiner Übersicht fragt weiterhin einmal im Monat.",
        press: "Rückblick-E-Mails stoppen",
        done: "Erledigt. Du bekommst keine E-Mails zum Karrieretagebuch mehr. Dein Tagebuch bleibt, und du kannst die E-Mail in deinen Kontoeinstellungen wieder einschalten.",
      },
    },
  },
  followUp: {
    title: "Zeit, bei {company} nachzufassen?",
    titleBlank: "Zeit zum Nachfassen?",
    titleMany: {
      one: "{count} Bewerbung ist bereit zum Nachfassen",
      other: "{count} Bewerbungen sind bereit zum Nachfassen",
    },
    days: { one: "{count} Tag", other: "{count} Tage" },
    sinceInterview:
      "Dein Interview bei {company} ist {days} her. Eine kurze Nachricht hält dich in Erinnerung.",
    sinceInterviewBlank:
      "Dein Interview ist {days} her. Eine kurze Nachricht hält dich in Erinnerung.",
    sinceApplied: "Deine Bewerbung bei {company} ist {days} her. Kurzes Nachfassen kann helfen.",
    thatCompany: "dieser Firma",
    many: "Zeit zum Nachfassen bei {who}. Eine kurze Nachricht kann helfen.",
    applications: { one: "{count} Bewerbung", other: "{count} Bewerbungen" },
    andMore: "{names} und {count} weiteren",
    pair: "{first} und {second}",
  },
  interviewSoon: {
    title: "Dein Interview bei {company} ist {day}",
    titleBlank: "Dein Interview ist {day}",
    today: "heute",
    tomorrow: "morgen",
    onDay: "am {weekday}",
    role: "Für die Stelle als {role}.",
    advice: "Geh vorher die wahrscheinlichen Fragen in deiner Vorbereitung durch.",
  },
  views: {
    count: { one: "{count} Aufruf", other: "{count} Aufrufe" },
    shareTitle: "Jemand hat deinen Lebenslauf-Link geöffnet",
    shareBody: "{link} hat bisher {views}.",
    namedLink: "Dein Link für „{name}“",
    resumeLink: "Dein Lebenslauf-Link",
    portfolioTitle: "Dein Portfolio hatte {period} {views}",
    thisWeek: "diese Woche",
    since: "seit dem {day}",
    portfolioBody: "Ohne deine eigenen Aufrufe, Link-Vorschauen und Suchmaschinen.",
  },
  jobs: {
    title: {
      one: "{count} neuer Treffer diese Woche",
      other: "{count} neue Treffer diese Woche",
    },
    job: "{title} bei {company}",
    andMore: "{names} und {count} weitere.",
    pair: "{first} und {second}.",
    single: "{name}.",
    free: "Mit Free zeigt Jobs nur deine besten Treffer.",
    alert: { one: "{count} neuer Job für „{name}“", other: "{count} neue Jobs für „{name}“" },
  },
} satisfies Translation<Messages["emails"]>;
