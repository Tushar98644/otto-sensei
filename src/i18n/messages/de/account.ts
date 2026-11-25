import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: { title: "Konto" },
  heading: "Dein Konto",
  skeleton: {
    loading: "Dein Konto wird geladen…",
    stillLoading: "Lädt immer noch?",
    reload: "Seite neu laden",
  },
  tryAgain: "Erneut versuchen",
  checkConnection: "Prüf deine Verbindung und versuch es noch einmal.",
  saveFailed: "Konnte nicht gespeichert werden",
  copied: "Kopiert",
  copyLink: "Link kopieren",
  view: {
    loadFailed: "Dein Konto konnte nicht geladen werden",
    settingUp: "Dein {plan}-Tarif wird eingerichtet",
    settingUpNew: "Dein neuer Tarif wird eingerichtet",
    checkout: "Weiter zur Zahlung für {plan}",
    signIn: "Anmelden",
  },
  arrival: {
    thanks: "Danke fürs Upgrade!",
    thanksDetail: "Dein Upgrade kann eine Minute brauchen, bis es erscheint.",
    cancelled: "Zahlung abgebrochen",
    nothingCharged: "Es wurde nichts berechnet.",
    credit: "Danke! Dein Guthaben ist unterwegs.",
    creditDetail: "Es kann eine Minute dauern, bis es hier erscheint.",
    goBack: "Zurück",
    testMode: "Testmodus: Du bist wieder bei Free.",
  },
  tabs: {
    label: "Konto",
    plan: "Tarif & Zahlung",
    preferences: "Einstellungen",
    profile: "Profil",
  },
  plan: {
    eyebrow: "Dein Tarif",
    srTitle: "Dein Tarif: ",
    pills: {
      current: "Aktueller Tarif",
      failed: "Zahlung fehlgeschlagen",
      ends: "Endet am {day}",
      trialLeft: "Testphase · {left}",
      trial: "Testphase",
      active: "Aktiv",
      setToEnd: "Endet bald",
    },
    endsToday: "endet heute",
    daysLeft: { one: "noch {count} Tag", other: "noch {count} Tage" },
    per: { month: "/Monat", year: "/Jahr" },
    nothingMore: "Nichts mehr zu zahlen",
    from: "ab {day}",
    until: "bis {day}",
    renews: "verlängert sich am {day}",
    heldTitle: "Deine letzte Zahlung ist nicht durchgegangen",
    heldDetail:
      "Du bist vorerst bei Free. Aktualisier deine Karte, um deinen Tarif zurückzubekommen.",
    held: "{title}. {detail}",
    tracked: {
      one: "eine verfolgte Bewerbung",
      other: "{count} verfolgte Bewerbungen",
    },
    free: "Free hat {fixes} Zeilenkorrekturen im Monat, dazu die Recruiter-Ansicht, Bearbeiten, PDF-Downloads, ein paar passende Jobs und {tracked}.",
    tryPro: "{base} Teste {pro}: {trial}",
    trialSentence: {
      month:
        "{price} für {days} Tage, danach {plan} pro Monat. Jederzeit kündbar, bevor die Testphase endet.",
      year: "{price} für {days} Tage, danach {plan} pro Jahr. Jederzeit kündbar, bevor die Testphase endet.",
    },
    trialEnding:
      "Deine Testphase endet am {day} und {name} startet nicht, du zahlst also nichts mehr.",
    trialStarts: {
      month:
        "Du hast {trial} für die Testphase bezahlt. Am {day} startet {name} für {price} pro Monat. Wir erinnern dich am Tag davor.",
      year: "Du hast {trial} für die Testphase bezahlt. Am {day} startet {name} für {price} pro Jahr. Wir erinnern dich am Tag davor.",
    },
    endsOn:
      "Dein Tarif endet am {day}, dann wechselt dein Konto zu Free. Dir wird nichts mehr berechnet.",
    setToEnd:
      "Dein Tarif ist zur Beendigung vorgemerkt, dann wechselt dein Konto zu Free. Dir wird nichts mehr berechnet.",
    renewsOn: {
      month:
        "Dein Tarif verlängert sich am {day} für {price} pro Monat. Du kannst bis dahin jederzeit kündigen.",
      year: "Dein Tarif verlängert sich am {day} für {price} pro Jahr. Du kannst bis dahin jederzeit kündigen.",
    },
    renewsEach: {
      month: "Dein Tarif verlängert sich jeden Monat für {price} pro Monat. Jederzeit kündbar.",
      year: "Dein Tarif verlängert sich jedes Jahr für {price} pro Jahr. Jederzeit kündbar.",
    },
    yearly: "Jährlich zahlen: {price} pro Jahr.",
    yearlySaves: "Jährlich zahlen: {price} pro Jahr, {savings} % weniger als monatlich.",
    how: {
      trial:
        "Ein Tarif kann nicht mitten im Zeitraum von monatlich auf jährlich wechseln. Kündige deine Testphase und wähl nach ihrem Ende auf der Preisseite jährlich.",
      trialBefore:
        "Ein Tarif kann nicht mitten im Zeitraum von monatlich auf jährlich wechseln. Kündige deine Testphase vor dem {day} und wähl nach ihrem Ende auf der Preisseite jährlich.",
      paid: "Ein Tarif kann nicht mitten im Zeitraum von monatlich auf jährlich wechseln. Kündige den Monatstarif und wähl nach seinem Ende auf der Preisseite jährlich.",
      paidBefore:
        "Ein Tarif kann nicht mitten im Zeitraum von monatlich auf jährlich wechseln. Kündige den Monatstarif vor dem {day} und wähl nach seinem Ende auf der Preisseite jährlich.",
    },
    max: {
      triple:
        "Brauchst du mehr? {max} hat mindestens das Dreifache jedes {pro}-Limits, für {price} pro Monat.",
      double:
        "Brauchst du mehr? {max} hat mindestens das Doppelte jedes {pro}-Limits, für {price} pro Monat.",
      more: "Brauchst du mehr? {max} hat mehr als jedes {pro}-Limit, für {price} pro Monat.",
    },
    updateCard: "Karte aktualisieren",
    howToSwitch: "So wechselst du",
    testMode: "Testmodus",
    testModeLine: "Kündigen oder Karte aktualisieren bringt dich zurück zu Free.",
    compare: "Tarife vergleichen",
    tryFor: "{plan} für {price} testen",
    upgradeTo: "Upgrade auf {plan}",
    resumeTrial: "Testphase fortsetzen",
    resumePlan: "Tarif fortsetzen",
    change: "Tarif ändern",
    cancelTrial: "Testphase kündigen",
    cancelPlan: "Tarif kündigen",
  },
  usage: {
    title: "Nutzung",
    meters: {
      tailor: "Angepasste Versionen",
      letter: "Anschreiben, Antworten und Vorbereitung",
      fix: "Zeilenkorrekturen",
      import: "KI-Lebenslaufanalysen",
      draft: "Entwürfe mit Otto",
      github: "GitHub-Projektentwürfe",
    },
    trialEnds: "Diese Testphase · endet am {day}",
    trial: "Diese Testphase",
    monthResets: "Dieser Monat · zurückgesetzt am {day}",
    month: "Dieser Monat",
    allUsed: "Vorerst alles aufgebraucht.",
    allUsedTrial: "Alles aufgebraucht. Mehr gibt es nach dem Ende der Testphase am {day}.",
    allUsedOn: "Alles aufgebraucht. Mehr gibt es am {day}.",
    used: "{used} von {limit} genutzt",
    of: "von {limit}",
    proOnly: "Anpassen, Anschreiben, KI-Lebenslaufanalysen und Portfolios gibt es mit {pro}.",
    hideRest: "Andere Limits ausblenden",
    showRest: "Alle Limits zeigen",
    basicReader:
      "Uploads funktionieren auch nach den KI-Analysen weiter, gelesen vom einfachen Leser.",
  },
  credit: {
    title: "Guthaben",
    neverExpires: "Verfällt nie",
    about: {
      one: "etwa {count} angepasste Version",
      other: "etwa {count} angepasste Versionen",
    },
    none: "Noch kein Guthaben",
    usable: "Wird nur genutzt, wenn das Kontingent dieses Monats aufgebraucht ist.",
    waits:
      "Guthaben funktioniert mit {pro} und {max}, sobald eine Testphase vorbei ist. Dein Guthaben wartet bis dahin.",
    add: "Guthaben aufladen",
    buys: "{price} = {list}",
    or: "{list} oder {last}",
    from: "{buys}. Ab {min}, in ganzen Dollar.",
    maxHint:
      "Du hast diesen Monat {added} Guthaben aufgeladen. {max} kostet {extra} mehr als {pro} und bietet {more} angepasste Versionen im Monat statt {less} bei {pro}.",
    hideHistory: "Guthabenverlauf ausblenden",
    showHistory: "Guthabenverlauf zeigen",
    historyFailed: "Dein Guthabenverlauf konnte nicht geladen werden",
    nothing: "Noch nichts.",
    added: "Guthaben aufgeladen",
    takenBack: "Guthaben nach einer Erstattung zurückgebucht",
    aiHelp: "KI-Hilfe",
    labels: {
      tailor: { one: "{count} angepasste Version", other: "{count} angepasste Versionen" },
      letter: { one: "{count} Anschreiben", other: "{count} Anschreiben" },
      fix: { one: "{count} Zeilenkorrektur", other: "{count} Zeilenkorrekturen" },
      import: { one: "{count} KI-Lebenslaufanalyse", other: "{count} KI-Lebenslaufanalysen" },
      draft: { one: "{count} Entwurf mit Otto", other: "{count} Entwürfe mit Otto" },
      github: { one: "{count} GitHub-Projektentwurf", other: "{count} GitHub-Projektentwürfe" },
    },
  },
  payment: {
    title: "Zahlungsmethode",
    ending: "{brand} mit Endziffern {last4}",
    expires: "Gültig bis {date}",
    lastCard: "Die Karte deiner letzten Zahlung",
    keptBy: "Deine Karte wird bei Dodo Payments gespeichert.",
    merchant:
      "Abgerechnet von Dodo Payments, unserem Merchant of Record. Abbuchungen erscheinen auf deinem Kontoauszug als DODOPAY.",
  },
  history: {
    title: "Rechnungsverlauf",
    loadFailed: "Deine Zahlungen konnten nicht geladen werden",
    none: "Noch keine Zahlungen.",
    date: "Datum",
    item: "Posten",
    amount: "Betrag",
    status: "Status",
    invoice: "Rechnung",
    plusTax: "zzgl. etwaiger Steuern",
    invoiceFailed: "Die Rechnung konnte nicht heruntergeladen werden",
    download: "Rechnung für {item}, {date} herunterladen",
    statuses: {
      paid: "Bezahlt",
      processing: "In Bearbeitung",
      failed: "Fehlgeschlagen",
      refunded: "Erstattet",
      upcoming: "Anstehend",
    },
  },
  status: {
    pickUp: "Da weitermachen, wo du warst",
    dashboard: "Zu deiner Übersicht",
    stillShowing: "Steht da noch {plan}?",
    checkAgain: "Erneut prüfen",
    slowFree:
      "Zahlungen können ein paar Minuten brauchen, bis sie bei uns ankommen. Prüf es gleich noch einmal oder schreib an <link>{email}</link>.",
    slowPaid:
      "Zahlungen können ein paar Minuten brauchen, bis sie bei uns ankommen, also prüf es gleich noch einmal. Wurde deine Karte abgelehnt, bleibst du bei {plan}: Aktualisier unten deine Karte und versuch es noch einmal, oder schreib an <link>{email}</link>.",
    finishing: "Dein Upgrade wird abgeschlossen",
    finishingDetail:
      "Dein Upgrade kann eine Minute brauchen, bis es erscheint. Diese Seite prüft selbst noch einmal.",
  },
  preferences: {
    writingStyle: "Schreibstil",
    writingStyleIntro:
      "Ton, Länge, Rechtschreibung und Grußformel für alles, was Otto für dich schreibt.",
    jobSearch: "Jobsuche",
    jobSearchIntro:
      "Wo du arbeiten kannst und was du suchst, damit Jobs die passenden Stellenanzeigen zuerst zeigt.",
    reminders: "Erinnerungen",
    remindersIntro:
      "Erinnerungen zum Nachfassen bei deinen Bewerbungen in der Glocke, deine Interviews in deinem Kalender und dein monatliches Karrieretagebuch.",
  },
  style: {
    loadFailed: "Dein Schreibstil konnte nicht geladen werden",
    intro:
      "Gilt für deine Anschreiben, Antworten auf Bewerbungsfragen und Kontaktnachrichten. Otto hält sich daran, aber dein Werdegang kommt weiterhin nur aus deinem Lebenslauf, und Otto erfindet nie etwas.",
    tone: "Ton",
    length: "Länge",
    spelling: "Rechtschreibung",
    tones: {
      natural: {
        label: "Natürlich",
        hint: "Schlicht und freundlich, wie ein sorgfältiger Mensch schreibt.",
      },
      warm: { label: "Herzlich", hint: "Freundlich und persönlich, trotzdem professionell." },
      direct: { label: "Direkt", hint: "Kurze Sätze, direkt auf den Punkt." },
      formal: { label: "Förmlich", hint: "Gepflegt und klassisch, ohne Umgangssprache." },
    },
    lengths: {
      standard: {
        label: "Standard",
        hint: "Etwa 200 Wörter für ein Anschreiben, 120 für eine Nachricht.",
      },
      shorter: {
        label: "Kürzer",
        hint: "Etwa 140 Wörter für ein Anschreiben, 80 für eine Nachricht.",
      },
    },
    spellings: {
      us: { label: "US-Englisch", hint: "organize, color, résumé" },
      uk: { label: "Britisches Englisch", hint: "organise, colour, CV" },
    },
    signOff: "Grußformel",
    signOffHint: "Schließt deine Anschreiben und Nachrichten ab.",
    signOffPlaceholder: "Viele Grüße",
    notes: "Notizen für Otto",
    notesHint:
      "Alles, was sonst noch wichtig ist, etwa „Erwähne, dass ich umzugsbereit bin“ oder „Bleib bescheiden, keine Superlative“.",
    notesLeft: "Noch {count} Zeichen in deinen Notizen.",
    saveFailed: "Dein Schreibstil konnte nicht gespeichert werden",
    reset: "Zurücksetzen",
    saving: "Wird gespeichert…",
    saved: "Gespeichert",
    asYouGo: "Änderungen werden automatisch gespeichert.",
  },
  work: {
    title: "Wo du arbeiten kannst",
    intro:
      "Wo du wohnst, deine Zeitzone und ob du ein Visum brauchst. Jobs markiert Stellenanzeigen, die dich laut eigener Angabe nicht einstellen können, und kann sie ausblenden. Nur du siehst das.",
    loadFailed: "Dein Arbeitsprofil konnte nicht geladen werden",
  },
  lookingFor: {
    title: "Wonach du suchst",
    intro:
      "Die Rolle, das Level und der Ort, die Jobs zuerst zeigt. Aus deinem Lebenslauf geschätzt, bis du wählst.",
    loadFailed: "Deine Suche konnte nicht geladen werden",
    change: "Tipp auf einen Teil, um ihn zu ändern. Wird automatisch gespeichert.",
    pick: "Tipp auf einen Teil, um Rolle und Level zu wählen. Wird automatisch gespeichert.",
  },
  reminders: {
    calendar: "Kalender",
    saved: "Erinnerungen kommen jetzt {days} Tage nach deiner Bewerbung.",
    title: "Erinnerungen zum Nachfassen",
    intro:
      "Wenn du einen Job als beworben markierst, legt Otto eine Erinnerung zum Nachfassen an und zeigt sie in der Glocke in deiner Übersicht, mit Erledigt und {days} Tage verschieben. Am Tag vor einem Interview und am Morgen selbst erinnert dich Otto dort auch, und am Morgen danach fragt er, wie es lief. Neue passende Jobs und Aufrufe deiner Links erscheinen dort ebenfalls.",
    loadFailed: "Deine Erinnerungseinstellungen konnten nicht geladen werden",
    after: "Ans Nachfassen erinnern nach",
    counted: "Gezählt ab dem Tag deiner Bewerbung.",
    days: "{count} Tagen",
  },
  careerLog: {
    title: "Karrieretagebuch",
    intro:
      "Jeden Monat eine einminütige Notiz zu dem, was du geschafft hast, damit sich dein nächster Lebenslauf fast von selbst schreibt. Kostenlos in jedem Tarif, auch wenn du nicht mehr zahlst.",
    checkinsOn: "Monatliche Check-ins sind an.",
    checkinsOff: "Monatliche Check-ins sind aus.",
    emailsOn: "Check-in-E-Mails sind an.",
    emailsOff: "Check-in-E-Mails sind aus.",
    resumed: "Check-ins sind wieder an.",
    paused: "Check-ins sind pausiert.",
    daySaved: "Check-in-Tag gespeichert.",
    monthly: "Monatlicher Check-in",
    monthlyHint:
      "Drei kurze Fragen einmal im Monat, in der Glocke und auf Start. Aus, bis du es einschaltest.",
    askOn: "Frag mich am",
    next: "Nächster: {day}.",
    onceAMonth: "Einmal im Monat.",
    week: "Woche im Monat",
    weekday: "Wochentag",
    weeks: {
      first: "Ersten",
      second: "Zweiten",
      third: "Dritten",
      fourth: "Vierten",
      last: "Letzten",
    },
    pause: "Pause",
    pausedUntil: "Pausiert bis {day}.",
    busy: "Voller Monat? Lass einen Check-in aus, oder drei.",
    pausedOption: "Pausiert bis {day}",
    resumeNow: "Jetzt fortsetzen",
    notPaused: "Nicht pausiert",
    pauseMonth: "Einen Monat pausieren",
    pauseThree: "3 Monate pausieren",
    email: "Check-in-E-Mail",
    emailHint:
      "Eine kurze E-Mail am Tag selbst, nie mehr als eine im Monat. Die Glocke und Start fragen so oder so.",
    open: "Dein Karrieretagebuch öffnen",
    loadFailed: "Die Einstellungen deines Karrieretagebuchs konnten nicht geladen werden",
    on: "An",
    off: "Aus",
  },
  profile: {
    title: "E-Mail und Anmeldung",
    google:
      "Du meldest dich mit Google oder einem 6-stelligen Code an, der an diese E-Mail geschickt wird. Kein Passwort.",
    code: "Du meldest dich mit einem 6-stelligen Code an, der an diese E-Mail geschickt wird. Kein Passwort.",
    signOut: "Abmelden",
    signOutFailed: "Abmelden hat nicht geklappt",
    signedOut: "Du bist abgemeldet.",
  },
  invite: {
    title: "Freunde einladen",
    intro:
      "Wenn sich eine Freundin oder ein Freund mit deinem Link anmeldet und einen Lebenslauf prüft, bekommt ihr beide in diesem Monat {fix} Zeilenkorrekturen und {tailor} angepasste Versionen extra.",
    loadFailed: "Dein Einladungslink konnte nicht geladen werden",
    shareText:
      "Ich nutze {brand}, um zu sehen, was Bewerbermanagementsysteme in meinem Lebenslauf lesen. Melde dich mit meinem Link an und prüf deinen, dann bekommen wir beide {fix} Zeilenkorrekturen extra.",
    copyFailed: "Link konnte nicht kopiert werden",
    copyYourself: "Markier ihn und kopier ihn selbst.",
    yourLink: "Dein Einladungslink",
    share: "Teilen",
    linkCopied: "Einladungslink kopiert.",
    progress: "Freunde, die dir Extras gebracht haben",
    progressValue: "{done} von {total}",
    nobody: "Mit deinem Link hat sich noch niemand angemeldet.",
    joined: {
      one: "{count} Person angemeldet; geprüfte Lebensläufe: {checked}.",
      other: "{count} Personen angemeldet; geprüfte Lebensläufe: {checked}.",
    },
    full: "Das sind die {max} Freunde, die dir Extras bringen. Neue Freunde bekommen ihre trotzdem.",
    upTo: "Extras für bis zu {max} Freunde.",
    extrasTrial:
      "In deiner Testphase hast du dank Einladungen {fix} Zeilenkorrekturen und {tailor} angepasste Versionen extra.",
    extrasMonth:
      "Diesen Monat hast du dank Einladungen {fix} Zeilenkorrekturen und {tailor} angepasste Versionen extra.",
    free: "Bei Free bringt jede eingeladene Person {fix} Zeilenkorrekturen zu den {limit} des Monats dazu. Anpassen gibt es mit Pro, deshalb warten die {tailor} angepassten Versionen: Starte in dem Monat eine Testphase oder mach ein Upgrade, dann nimmst du jedes ungenutzte Extra mit.",
    trial:
      "Extras kommen zu den Limits deiner Testphase dazu, und ungenutzte gehen in deinen ersten bezahlten Monat über.",
    paid: "Extras kommen zu deinen {plan}-Limits dazu.",
  },
  data: {
    title: "Deine Daten",
    intro:
      "Eine ZIP-Datei mit den Lebensläufen in deinem Konto, deinen Anschreiben, Antworten und Nachrichten und den Jobs, die du verfolgst.",
    download: "Meine Daten herunterladen",
    failed: "Deine Daten konnten nicht heruntergeladen werden",
  },
  deleteAccount: {
    title: "Konto löschen",
    intro:
      "Löscht dein Konto und alles, was darin gespeichert ist. Das lässt sich nicht rückgängig machen.",
    alsoCancels: "Dein Tarif wird damit auch gekündigt.",
    downloadFirst: "Lad deine Daten vorher herunter, wenn du sie behalten willst.",
    failed: "Dein Konto konnte nicht gelöscht werden",
    dialogTitle: "Dein Konto löschen?",
    dialogIntro:
      "Damit werden dein Konto, die darin gesicherten Lebensläufe und dein Nutzungsverlauf gelöscht. Das lässt sich nicht rückgängig machen.",
    cancel: "Abbrechen",
    cancelsPlan: "Dein Tarif wird damit auch gekündigt",
    endsNow: "Dein bezahlter Tarif endet sofort, und dir wird nichts mehr berechnet.",
    credit: "Dein Guthaben von {credit} wird mit entfernt und kann nicht mehr genutzt werden.",
    browser: "In diesem Browser gespeicherte Lebensläufe werden ebenfalls gelöscht.",
    word: "LÖSCHEN",
    type: "Gib <b>{word}</b> ein, um zu bestätigen",
  },
  extension: {
    title: "Chrome-Erweiterung",
    connected:
      "Verbunden seit {date}. Sie gleicht Stellenanzeigen direkt auf der Seite mit deinem Lebenslauf ab und speichert sie auf deinem Board.",
    connectedIn:
      "In {count} Browsern verbunden seit {date}. Sie gleicht Stellenanzeigen direkt auf der Seite mit deinem Lebenslauf ab und speichert sie auf deinem Board.",
    pitch:
      "Sieh, wie gut dein Lebenslauf zu jeder Stellenanzeige passt, speichere Jobs auf deinem Board und füll Bewerbungen mit einem Klick aus.",
    disconnected: "Otto für Chrome ist getrennt",
    everyBrowser: "In jedem Browser, in dem es war.",
    disconnectFailed: "Trennen hat nicht geklappt",
    disconnect: "Trennen",
    soon: "Bald verfügbar",
    soonStore: "Bald im Chrome Web Store.",
    add: "Zu Chrome hinzufügen",
    connect: {
      meta: "Otto für Chrome verbinden",
      title: "Otto für Chrome verbinden",
      doneTitle: "Otto ist bei deiner Jobsuche dabei",
      intro:
        "Ein Tippen verbindet die Erweiterung mit deinem Konto, damit das Abzeichen Stellenanzeigen mit deinem Lebenslauf abgleichen kann.",
      doneIntro:
        "Öffne eine beliebige Stellenanzeige. Ottos Abzeichen zeigt, wie gut dein Lebenslauf passt und ob du den Job annehmen kannst, bevor du ein Wort liest.",
      checkingAccount: "Dein Konto wird geprüft",
      looking: "Suche nach der Erweiterung",
      connecting: "Wird verbunden",
      missing: "Otto für Chrome ist noch nicht in diesem Browser",
      added: "Hab ich hinzugefügt",
      missingStore:
        "Füg die Erweiterung zu Chrome hinzu und komm dann zu diesem Tab zurück. Wenn du sie gerade hinzugefügt hast, lad diese Seite neu.",
      missingSoon:
        "Otto für Chrome kommt bald in den Chrome Web Store. Wenn du es schon hast, lad diese Seite neu.",
      failed: "Das hat nicht geklappt",
      tryAgain: "Erneut versuchen",
      connectedAs: "Verbunden als {email}",
      tryPost:
        "Probier eine Stellenanzeige auf {sites} oder {last}. Auf jeder anderen Website drück meinen Button in der Symbolleiste.",
      board: "Dein Board öffnen",
      close: "Diesen Tab schließen",
    },
  },
  reminder: {
    meta: "Erinnerung",
    title: "Erinnerungen",
    missing: "Diesem Link fehlt ein Teil. Öffne stattdessen deine Bewerbungen.",
    done: {
      message: "Schon nachgefasst? Markier es als erledigt, dann erinnere ich dich nicht mehr.",
      label: "Als erledigt markieren",
    },
    snooze: {
      message: "Noch nicht bereit zum Nachfassen? Ich erinnere dich in {days} Tagen noch einmal.",
      label: "{days} Tage verschieben",
    },
    unsubscribe: {
      message:
        "Erinnerungs-E-Mails ausschalten? Deine Erinnerungen bleiben in der Glocke in deiner Übersicht.",
      label: "Erinnerungs-E-Mails ausschalten",
    },
    snoozeCompany:
      "Noch nicht bereit, bei {company} nachzufassen? Ich erinnere dich in {days} Tagen noch einmal.",
    doneRole:
      "Bei {company} wegen der Stelle als {role} nachgefasst? Markier es als erledigt, dann erinnere ich dich nicht mehr.",
    doneCompany:
      "Bei {company} nachgefasst? Markier es als erledigt, dann erinnere ich dich nicht mehr.",
    badUnsubscribe: "Dieser Abmeldelink ist ungültig. Schalte E-Mails auf deiner Kontoseite aus.",
    unsubscribed:
      "Erledigt. Du bekommst keine Erinnerungs-E-Mails mehr. Die Glocke in deiner Übersicht behält sie.",
    failed: "Das hat nicht geklappt. Öffne stattdessen deine Bewerbungen.",
    failedShort: "Das hat nicht geklappt.",
    thatJob: "diesen Job",
    marked: "Als erledigt markiert. Ich erinnere dich nicht mehr an {name}.",
    movedOn: "{name} ist nicht mehr bei Beworben, es gibt also nichts zu verschieben.",
    snoozed: "Um {days} Tage verschoben. Ich erinnere dich am {day} an {name}.",
    applications: "Deine Bewerbungen öffnen",
  },
} satisfies Translation<Messages["account"]>;
