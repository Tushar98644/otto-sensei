import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Rubriques",
    projects: "Projets",
    talks: "Conférences",
    writing: "Écrits",
    resume: "CV",
  },
  top: "{name}, retour en haut",
  lines: {
    current: "Actuellement chez",
    before: "Auparavant",
    projects: "Projets",
  },
  elsewhere: "Ailleurs sur le web",
  sayHello: "Dis bonjour à <link>{email}</link>",
  recording: "Avec un enregistrement",
  minutes: "{minutes} min",
  toTop: "Remonter en haut",
} satisfies Translation<Messages["portfolioDesigns"]["prose"]>;
