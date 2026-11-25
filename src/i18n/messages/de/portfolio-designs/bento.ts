import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  welcome: "willkommen",
  hello: "Hi, ich bin <b>{name}</b>",
  stack: "Technik & Tools",
  skills: "Fähigkeiten",
  contact: {
    title: "Lass uns zusammenarbeiten!",
    details: "Kontaktdaten",
    resume: "Lebenslauf",
    findMe: "Du findest mich auf",
  },
  tz: {
    in: "In {place}",
    here: "Bei dir",
    same: "gleiche Zeitzone",
    ahead: "{offset} vor dir",
    behind: "{offset} hinter dir",
    hours: "{hours} Std.",
    hoursMinutes: "{hours} Std. {minutes} Min.",
  },
  github: {
    label: "GitHub-Profil",
    stars: { one: "{count} Stern", other: "{count} Sterne" },
    repos: { one: "{count} Repo", other: "{count} Repos" },
  },
  now: { title: "Jetzt", what: "was ist das?" },
  experience: "Erfahrung",
  at: "bei {company}",
  accents: {
    red: "Akzent Rot",
    yellow: "Akzent Gelb",
    blue: "Akzent Blau",
    purple: "Akzent Lila",
    green: "Akzent Grün",
  },
  crafted: "Mit <b>Liebe</b> gemacht von {name}",
} satisfies Translation<Messages["portfolioDesigns"]["bento"]>;
