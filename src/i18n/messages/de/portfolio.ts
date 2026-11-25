import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  title: "Portfolio",
  about:
    "Eine Portfolio-Website aus deinem Lebenslauf, für dich gehostet unter deinem eigenen Link.",
  loadFailed: "Dein Portfolio konnte nicht geladen werden",
  tryAgain: "Erneut versuchen",
  checkConnection: "Prüf deine Verbindung und versuch es noch einmal.",
  otto: {
    pick: "Wähl ein Design und ich fülle es mit deinem Lebenslauf. Öffne eins, um es mit deinem zu sehen.",
    pickThin:
      "Diese zeigen ein Beispiel, in dem alles ausgefüllt ist. Wähl eins und ich fülle es mit deinem.",
    draft:
      "Ich habe das aus deinem Lebenslauf ausgefüllt. Online geht nichts, bis du veröffentlichst.",
    live: {
      one: "Deine Seite ist online, mit bisher {count} Aufruf.",
      other: "Deine Seite ist online, mit bisher {count} Aufrufen.",
    },
    liveNoViews: "Deine Seite ist online. Schick jemandem den Link, dann zählen die Aufrufe hier.",
    behind:
      "Dein Lebenslauf hat sich seit dieser Kopie geändert. Aktualisier die Seite, wenn du so weit bist.",
    noResume:
      "Der Lebenslauf hinter dieser Seite ist nicht in diesem Browser. Die Seite behält ihre eigene Kopie.",
    noResumes: "Füg zuerst einen Lebenslauf hinzu, dann mache ich daraus eine Seite.",
    previews:
      "Jedes Design unten zeigt deinen eigenen Lebenslauf. Öffne eins als ganze Seite, um es wie Besucher zu sehen.",
    previewsSample:
      "Diese zeigen eine Beispielseite. Füg einen Lebenslauf hinzu, dann zeichne ich jedes Design mit deinem.",
    previewsThin:
      "Diese zeigen eine Beispielseite, in der alles ausgefüllt ist. Wechsle jederzeit zu deiner.",
  },
  facts: {
    projects: { one: "{count} Projekt", other: "{count} Projekte" },
    jobs: { one: "{count} Job", other: "{count} Jobs" },
    skills: { one: "{count} Kenntnis", other: "{count} Kenntnisse" },
  },
  resumeLink: {
    linked:
      "Deine Seite verlinkt deinen geteilten Lebenslauf, damit Besucher ihn ganz lesen können.",
    hidden:
      "Dein geteilter Lebenslauf zeigt Kontaktdaten, die diese Seite ausblendet. Deshalb lässt die Seite den Link weg.",
    share:
      "Teile diesen Lebenslauf, dann verlinkt deine Seite ihn, damit Besucher ihn ganz lesen können.",
  },
  views: {
    none: "Noch keine Aufrufe",
    count: { one: "{count} Aufruf", other: "{count} Aufrufe" },
  },
  saving: "Wird gespeichert…",
  savedLive: "Auf deiner Live-Seite gespeichert",
  saved: "Alle Änderungen gespeichert",
  publishNote:
    "Veröffentlichen ist in Pro enthalten, und wir hosten die Seite für dich. Bis dahin siehst nur du sie.",
  store: {
    makeFailed: "Dein Portfolio konnte nicht erstellt werden",
    saveFailed: "Konnte nicht gespeichert werden",
    notLoaded: "Dein Portfolio ist noch nicht geladen. Versuch es gleich noch einmal.",
    live: "Deine Seite ist online",
    liveDetail: "Jeder mit der Adresse kann sie jetzt öffnen.",
    down: "Deine Seite ist offline",
    downDetail: "Wer die Adresse jetzt öffnet, sieht, dass sie nicht funktioniert.",
    undo: "Rückgängig",
    failed: "Etwas ist schiefgelaufen. Versuch es noch einmal.",
  },
  tabs: { design: "Design", content: "Inhalt", sections: "Abschnitte", settings: "Einstellungen" },
  editLabel: "Dein Portfolio bearbeiten",
  offer: {
    title: "Stattdessen „{name}“ zeigen?",
    use: "Diesen Lebenslauf nehmen",
    keep: "Aktuellen behalten",
    shows: "Du hast ein Portfolio. Es zeigt jetzt {current}.",
    quoted: "„{name}“",
    another: "einen anderen Lebenslauf",
  },
  inUseNote: "Auf deiner Seite im Einsatz.",
  notYetNote: "Noch nicht auf deiner Seite.",
  useDesign: "Dieses Design nehmen",
  useDesignNamed: "Dieses Design nehmen: {name}",
  bar: {
    copied: "Kopiert",
    copyLink: "Link kopieren",
    publish: "Veröffentlichen",
    live: "Online",
    draft: "Entwurf",
    newTab: "(öffnet in neuem Tab)",
    openPage: "Seite öffnen",
    pageActions: "Seitenaktionen",
    moreActions: "Weitere Seitenaktionen",
    takeDown: "Offline nehmen",
    takeDownHint: "Besucher sehen, dass die Seite offline ist. Du kannst das rückgängig machen.",
    linkCopied: "Link kopiert",
    preview: "Vorschau",
  },
  start: {
    noResume: "Noch kein Lebenslauf",
    waving: "Otto der Otter, winkend",
    title: "Wähl ein Design",
    intro: "Du kannst das Design jederzeit wechseln. Online geht nichts, bis du veröffentlichst.",
    makeFrom: "Erstellen aus",
  },
  upgrade: {
    eyebrow: "Für dich gehostet, ohne Einrichtung",
    offlineTitle: "Deine Seite ist vorerst offline",
    title: "Ein echtes Portfolio, online unter deinem eigenen Link",
    offline:
      "Portfolios sind in Pro und Max enthalten. Deine Seite und ihre Einstellungen bleiben erhalten, sie kommt also so zurück, wie sie war.",
    pitch:
      "Deine Projekte, Stationen, Texte und Links in einem von {count} Designs, ausgefüllt aus deinem Lebenslauf.",
    liveAt: "Online unter <b>{url}</b>",
    hosted: "Wir hosten sie: keine Domain, kein Server, kein Code einzurichten.",
    flows:
      "Änderungen an deinem Lebenslauf fließen von selbst ein, und du kannst das Design jederzeit wechseln.",
    comesWith: "Portfolios sind in Pro und Max enthalten.",
    trial:
      "{price} für {days} Tage, danach {plan} pro Monat. Jederzeit kündbar, bevor die Testphase endet.",
    fullPage: "Ganze Seite",
  },
  previewFull: "{name} als ganze Seite ansehen",
  settings: {
    madeFrom: "Erstellt aus",
    resume: "Lebenslauf",
    notHere: "Ein Lebenslauf, der nicht in diesem Browser ist",
    upToDate: "Seite aktuell halten",
    sync: "Mit meinem Lebenslauf synchronisieren",
    syncHint: "An: Änderungen am Lebenslauf erscheinen von selbst auf der Seite.",
    update: "Seite auf meinen neuesten Lebenslauf bringen",
    search: "Suchmaschinen",
    indexing: "Von Suchmaschinen finden lassen",
    indexingHint: "Aus: Google und andere werden gebeten, sie nicht in Suchergebnissen zu zeigen.",
    views: "Aufrufe",
    viewsNote: "{views}. Nicht gezählt werden du selbst, Linkvorschauen und Suchmaschinen.",
  },
  address: {
    title: "Adresse",
    livesAt: "Deine Seite liegt unter /p/",
    keepsOld: "Wenn du sie änderst, funktioniert die alte Adresse noch {days} Tage.",
    rules: "Kleinbuchstaben, Zahlen und Bindestriche.",
    free: "/p/{slug} ist frei.",
    checking: "Wird geprüft…",
    save: "Speichern",
    problems: {
      too_short: "Mindestens {min} Buchstaben oder Zahlen.",
      too_long: "Höchstens {max} Zeichen.",
      characters: "Nur Buchstaben, Zahlen und einzelne Bindestriche.",
      reserved: "Diese Adresse ist für die App reserviert. Versuch eine andere.",
    },
  },
  delete: {
    done: "Deine Seite ist gelöscht",
    doneDetail: "Ihre Adresse und ihr Inhalt sind weg. Dein Lebenslauf bleibt unberührt.",
    failed: "Deine Seite konnte nicht gelöscht werden",
    confirm:
      "Damit werden die Seite, ihre Adresse und alles, was du für sie hinzugefügt hast, gelöscht. Das lässt sich nicht rückgängig machen.",
    delete: "Seite löschen",
    keep: "Behalten",
    start: "Diese Seite löschen",
  },
  picker: {
    title: "Design",
    intro: "Alle Designs nutzen denselben Inhalt. Wechsle jederzeit, nichts geht verloren.",
    inUse: "Im Einsatz",
    groups: { picks: "Unsere Favoriten", more: "Weitere Designs" },
  },
  full: {
    previewOnly: "Nur Vorschau: noch nicht online.",
    previous: "Vorheriges Design",
    next: "Nächstes Design",
    position: "{at} von {count}",
    width: "Seitenbreite",
    close: "Vorschau schließen",
  },
  preview: {
    label: "Vorschau",
    width: "Vorschaubreite",
    desktop: "Desktop",
    phone: "Handy",
    asVisitors: "{name} · so sehen Besucher sie",
    fullScreen: "Vollbild",
    region: "Vorschau deiner Seite in {name}. Scroll, um alles zu sehen.",
  },
  source: {
    yours: "Deine Seite",
    sample: "Beispielseite",
    group: "In den Vorschauen gezeigte Seite",
    own: "Deine Seite, mit deinem eigenen Inhalt",
    sampleShort: "Beispiel:",
    sampleLong: "Beispielseite:",
    madeUpShort: "eine erfundene Person",
    madeUpLong: "{name}, eine erfundene Person",
  },
  visibility: {
    linkSettings: "Link-Einstellungen",
    shareResume: "Diesen Lebenslauf teilen",
    onPage: "Auf deiner Seite",
    shown:
      "{shown} von {total} sichtbar. Ein ausgeblendeter Abschnitt behält seinen Inhalt und lässt sich wieder einschalten.",
    legend: "Abschnitte auf deiner Seite",
    hidden: "Auf deiner Seite ausgeblendet",
    contact: "Kontaktdaten",
    contactIntro:
      "Beides ist anfangs aus, damit eine öffentliche Seite sie nie ungefragt herausgibt.",
    showEmail: "Meine E-Mail zeigen",
    noEmail: "Dein Lebenslauf hat keine E-Mail.",
    emailOn: "An: Besucher sehen {email}.",
    emailOff: "Aus: {email} bleibt von der Seite fern.",
    showPhone: "Meine Telefonnummer zeigen",
    noPhone: "Dein Lebenslauf hat keine Telefonnummer.",
    phoneOn: "An: Besucher sehen {phone}.",
    phoneOff: "Aus: {phone} bleibt von der Seite fern.",
    resumeLink: "Link zum Lebenslauf",
  },
  sections: {
    about: "Über mich",
    projects: "Projekte",
    experience: "Berufserfahrung",
    skills: "Kenntnisse",
    education: "Ausbildung",
    certifications: "Zertifikate",
    extras: "Weitere Abschnitte",
    links: "Links",
  },
  templates: {
    navy: "Dunkle Navy-Seite mit nummerierten Abschnitten, Job-Tabs und großen hervorgehobenen Projekten.",
    dock: "Eine ruhige Spalte, die eingeblendet wird, mit Stationen, Projektkarten und einem schwebenden Dock.",
    reel: "Ein riesiger rotierender Titel über einer 3D-Kugel, danach jedes Projekt im Rahmen eines Geräts.",
    bento: "Alles in Kacheln: Intro, Tech-Stack, Ortszeit live, GitHub und Projekte.",
    cv: "Ein maßstabsgetreu gezeichneter Lebenslauf: linierte Felder, deine Initialen in 3D, Jobs nach Firma gruppiert.",
    prose: "Text zuerst, mit Farbchips, Projekten nach Art gruppiert, dann Vorträge und Texte.",
    folio:
      "Deine Seite als Notizen-App: eine angeheftete Notiz über dich und schnelle Links, dann eine Notiz für jeden Teil deiner Arbeit.",
    paper:
      "Von Hand gezeichnet: dein Name in Marker über einem Fuchs am Meer, Karten in Tinte und wellige Unterstreichungen, bei Tag oder Nacht.",
    gazette:
      "Deine Seite als Zeitung von 1926: ein Titel in Frakturschrift, deine Schlagzeile, linierte Spalten und ein Nachrichtenticker.",
    terminal:
      "Ein Terminal, das beim Öffnen deine Zusammenfassung ausgibt und Besucher dann help, work oder contact tippen lässt.",
    brutal:
      "Laute Farbblöcke mit dicken schwarzen Rändern, harte Schatten, die sich eindrücken, und Pillen-Tags.",
    card: "Eine Karte auf Anthrazit: eine Profil-Seitenleiste neben Tabs für Über mich, Lebenslauf und Arbeit, mit Gold-Akzenten.",
    retro:
      "Ein Retro-Arbeitsplatz: Fenster zum Ziehen, Einrollen und Zoomen, eine Menüleiste und drei Epochen zur Auswahl.",
    starring:
      "Deine Karriere als Film: dein Name riesig auf einer schwarzen Bühne, dann ein Akt für jeden Teil deiner Arbeit.",
    bubble:
      "Laut und niedlich: aufgeblasene gestreifte Buchstaben auf kariertem Himmel, Sticker-Karten, kleine Maskottchen und ein Laufband.",
  },
  page: {
    title: "{name} - Portfolio",
    untitled: "Portfolio",
    description: "Ein Portfolio, erstellt mit {brand}.",
    imageLabel: "PORTFOLIO",
  },
} satisfies Translation<Messages["portfolio"]>;
