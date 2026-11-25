import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  welcome: "bienvenue",
  hello: "Salut, moi c’est <b>{name}</b>",
  stack: "Technos et outils",
  skills: "Compétences",
  contact: {
    title: "Travaillons ensemble !",
    details: "Coordonnées",
    resume: "CV",
    findMe: "Me retrouver sur",
  },
  tz: {
    in: "À {place}",
    here: "Chez toi",
    same: "même fuseau horaire",
    ahead: "{offset} d’avance sur toi",
    behind: "{offset} de retard sur toi",
    hours: "{hours} h",
    hoursMinutes: "{hours} h {minutes} min",
  },
  github: {
    label: "Profil GitHub",
    stars: { one: "{count} étoile", other: "{count} étoiles" },
    repos: { one: "{count} dépôt", other: "{count} dépôts" },
  },
  now: { title: "En ce moment", what: "c’est quoi ?" },
  experience: "Expérience",
  at: "chez {company}",
  accents: {
    red: "accent rouge",
    yellow: "accent jaune",
    blue: "accent bleu",
    purple: "accent violet",
    green: "accent vert",
  },
  crafted: "Fait avec <b>amour</b> par {name}",
} satisfies Translation<Messages["portfolioDesigns"]["bento"]>;
