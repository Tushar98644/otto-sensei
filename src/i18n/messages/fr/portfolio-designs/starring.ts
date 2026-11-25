import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  visibility: {
    open: "Code ouvert",
    live: "En ligne",
    private: "Privé",
  },
  seeLive: "Voir en ligne ↗",
  viewSource: "Voir le code ↗",
  acts: {
    numbers: "En chiffres",
    studios: "Les studios où j’ai travaillé",
    road: "La route",
    work: "À l’affiche",
    catalogue: "Le catalogue",
    accolades: "Distinctions",
    press: "Tournée promo",
    activity: "Chaque commit compte",
    training: "Montage d’entraînement",
    bonus: "Bonus du DVD",
    offscreen: "Dans les coulisses",
    critics: "La critique",
    soon: "Prochainement",
  },
  iceberg: {
    one: "<b>{stars}</b>étoiles sur {count} dépôt public, et {followers} personnes qui suivent l’aventure.",
    other:
      "<b>{stars}</b>étoiles sur {count} dépôts publics, et {followers} personnes qui suivent l’aventure.",
  },
  studio: {
    now: "Actuel",
    past: "Passé",
  },
  until: "auj.",
  talk: "Conférence",
  article: "Article",
  alsoPlaying: "Aussi à l’affiche",
  openCode: "Encore du code, en accès libre.",
  certified: "Certifications",
  contributions: "/ contributions en 90 jours",
  heatLabel: {
    one: "Contributions par semaine sur la dernière semaine ({count})",
    other: "Contributions par semaine sur les {count} dernières semaines",
  },
  heatNote: "Un carré par semaine, le plus vif à {count}",
  repos: {
    one: "{count} dépôt",
    other: "{count} dépôts",
  },
  skills: "Compétences",
  hero: {
    nowStarring: "À l’affiche",
    available: "Disponible",
    resume: "CV ↓",
    scroll: "Défile — la séance commence ↓",
  },
  act: "Acte {number}",
  credits: {
    wrap: "Et… coupez !",
    starring: "Avec",
    email: "E-mail ↗",
  },
} satisfies Translation<Messages["portfolioDesigns"]["starring"]>;
