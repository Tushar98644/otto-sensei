import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  home: {
    title: "Interviewvorbereitung",
    packsIntro: {
      one: "{count} Vorbereitungspaket, eins pro Stelle, aus deinen eigenen Lebenslaufzeilen.",
      other: "{count} Vorbereitungspakete, eins pro Stelle, aus deinen eigenen Lebenslaufzeilen.",
    },
    intro:
      "Für jede Stelle mit Interview: wahrscheinliche Fragen, Geschichten aus deinen Lebenslaufzeilen und Fragen, die du stellen kannst.",
    prepare: "Auf eine Stelle vorbereiten",
    didntLoad: "Deine Interviewvorbereitung wurde nicht geladen",
    tryAgain: "Erneut versuchen",
    checkConnection: "Prüf deine Verbindung und versuch es dann noch mal.",
    lockedEyebrow: "In Pro enthalten",
    lockedTitle: "Übe jedes Interview, bevor es stattfindet",
    locked:
      "Mit Pro bereite ich dich auf jedes Interview mit deinen eigenen Lebenslaufzeilen vor. Hier ist ein Beispiel.",
    lockedKept:
      "Neue Vorbereitungen sind in Pro enthalten. Deine bisherige Vorbereitung bleibt hier zum Lesen.",
    emptyEyebrow: "Noch keine Interviews",
    emptyTitle: "Dein nächstes Interview, mit einem Klick vorbereitet",
    emptyDetail:
      "Sobald eine Bewerbung die Interviewphase erreicht, wartet sie hier mit der Schaltfläche „Vorbereiten“. Oder bereite dich jetzt über den Link auf eine beliebige Stelle vor.",
    next: "Nächstes Interview",
    atStage: "In der Interviewphase",
    interviews: { one: "{count} Interview", other: "{count} Interviews" },
    moreInterviews: "Weitere Interviews",
    calendar: "In deinem Kalender",
    morePacks: "Weitere Vorbereitungspakete",
    yourPacks: "Deine Vorbereitungspakete",
    packs: { one: "{count} Paket", other: "{count} Pakete" },
    loading: "Deine Interviewvorbereitung wird geladen",
  },
  calendar: {
    ready: "Kalenderdatei bereit",
    readyDetail:
      "Öffne sie, um den Interviewtag einzutragen, mit einer Erinnerung zum Üben am Morgen davor.",
    failed: "Die Kalenderdatei ließ sich nicht erstellen",
    tryLater: "Versuch es gleich noch mal.",
    add: "Zum Kalender hinzufügen",
  },
  brief: {
    title: "Dein Briefing für heute",
    stories: "Deine stärksten Geschichten",
    questions: "Wahrscheinliche Fragen",
    asks: "Fragen, die du stellen kannst",
  },
} satisfies Translation<Messages["interview"]>;
