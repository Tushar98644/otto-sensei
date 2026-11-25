import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Bereiche",
    projects: "Projekte",
    talks: "Vorträge",
    writing: "Texte",
    resume: "Lebenslauf",
  },
  top: "{name}, zurück nach oben",
  lines: {
    current: "Derzeit bei",
    before: "Zuvor",
    projects: "Projekte",
  },
  elsewhere: "Anderswo im Netz",
  sayHello: "Sag hallo unter <link>{email}</link>",
  recording: "Mit Aufzeichnung",
  minutes: "{minutes} Min.",
  toTop: "Nach oben scrollen",
} satisfies Translation<Messages["portfolioDesigns"]["prose"]>;
