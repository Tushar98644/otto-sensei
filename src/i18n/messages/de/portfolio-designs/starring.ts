import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  visibility: {
    open: "Open Source",
    live: "Online",
    private: "Privat",
  },
  seeLive: "Online ansehen ↗",
  viewSource: "Code ansehen ↗",
  acts: {
    numbers: "In Zahlen",
    studios: "Meine Studios",
    road: "Der Weg",
    work: "Ausgewählte Arbeiten",
    catalogue: "Der Backkatalog",
    accolades: "Auszeichnungen",
    press: "Pressetour",
    activity: "Jeder Commit zählt",
    training: "Trainingsmontage",
    bonus: "Bonusmaterial",
    offscreen: "Hinter den Kulissen",
    critics: "Die Kritiken",
    soon: "Demnächst",
  },
  iceberg: {
    one: "<b>{stars}</b>Sterne in {count} öffentlichen Repository und {followers} Leute, die mitverfolgen.",
    other:
      "<b>{stars}</b>Sterne in {count} öffentlichen Repositorys und {followers} Leute, die mitverfolgen.",
  },
  studio: {
    now: "Jetzt",
    past: "Früher",
  },
  until: "heute",
  talk: "Vortrag",
  article: "Artikel",
  alsoPlaying: "Außerdem im Programm",
  openCode: "Mehr Code, offen für alle.",
  certified: "Zertifiziert",
  contributions: "/ Beiträge in 90 Tagen",
  heatLabel: {
    one: "Beiträge pro Woche über {count} Woche",
    other: "Beiträge pro Woche über die letzten {count} Wochen",
  },
  heatNote: "Ein Kästchen pro Woche, am hellsten bei {count}",
  repos: {
    one: "{count} Repo",
    other: "{count} Repos",
  },
  skills: "Fähigkeiten",
  hero: {
    nowStarring: "Jetzt im Kino",
    available: "Offen für Jobs",
    resume: "Lebenslauf ↓",
    scroll: "Scrollen — die Show beginnt ↓",
  },
  act: "Akt {number}",
  credits: {
    wrap: "Und… Schnitt!",
    starring: "Mit",
    email: "E-Mail ↗",
  },
} satisfies Translation<Messages["portfolioDesigns"]["starring"]>;
