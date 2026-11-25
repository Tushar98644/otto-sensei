import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: { about: "à propos", work: "projets", jobs: "postes", stack: "stack" },
  sections: "Rubriques",
  resume: "CV",
  elsewhere: "Ailleurs",
  email: "e-mail",
  about: "À propos",
  myResume: "mon CV",
  projects: "Projets",
  stars: { one: "<b>{count}</b> étoile", other: "<b>{count}</b> étoiles" },
  work: "Parcours",
  stack: "Stack technique",
  education: "Formation",
  openSource: "Open source",
  allOfIt: "tout voir",
  writing: "Écrits",
  minRead: "{count} min de lecture",
  talks: "Conférences",
  milestones: "Jalons",
  certifications: "Certifications",
  dayOrNight: "jour ou nuit",
  drawn: "{name} · dessiné à la main, en code",
  mode: {
    day: "jour",
    night: "nuit",
    toDay: "Passer au jour",
    toNight: "Passer à la nuit",
  },
} satisfies Translation<Messages["portfolioDesigns"]["paper"]>;
