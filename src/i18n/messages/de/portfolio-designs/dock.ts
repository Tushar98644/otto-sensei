import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  hello: "Hallo, ich bin {name}",
  about: "Über mich",
  experience: "Berufserfahrung",
  education: "Ausbildung",
  skills: "Kenntnisse",
  projects: {
    pill: "Meine Projekte",
    title: "Sieh dir meine neuesten Arbeiten an",
    text: "Ein paar Dinge, die ich gebaut habe, mit Links zum Ausprobieren.",
  },
  website: "Website",
  source: "Quellcode",
  open: "{name} öffnen",
  milestones: {
    pill: "Hackathons",
    title: "Ich baue gern Dinge",
    text: "Hackathons, Auszeichnungen und Launches auf dem Weg.",
  },
  link: "Link",
  contact: {
    pill: "Kontakt",
    title: "Schreib mir",
    chat: "Lust auf ein Gespräch?",
    email: "<link>Schreib mir einfach eine E-Mail</link> und ich melde mich bei dir.",
    message: "<link>Schick mir einfach eine Nachricht</link> und ich melde mich bei dir.",
    none: "Ich freue mich, von dir zu hören.",
  },
  home: "Start",
  resume: "Lebenslauf",
  email: "E-Mail",
  theme: { label: "Design", toggle: "Design wechseln" },
} satisfies Translation<Messages["portfolioDesigns"]["dock"]>;
