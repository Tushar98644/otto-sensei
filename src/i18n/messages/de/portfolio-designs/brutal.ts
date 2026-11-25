import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Bereiche",
    about: "Über mich",
    projects: "Projekte",
    work: "Werdegang",
    contact: "Kontakt",
  },
  resume: "Lebenslauf",
  hero: {
    label: "Vorstellung",
    hello: "Hi, ich bin <b>{name}</b>",
    getInTouch: "Schreib mir",
  },
  stack: { label: "Werkzeuge", title: "{name} arbeitet mit" },
  about: {
    title: "Wer ist {name}?",
    moreLabel: "Mehr über mich",
    more: "Mehr über {name}",
  },
  projects: {
    title: "Projekte",
    github: "Zu GitHub",
    source: "Code",
    visit: "Ansehen",
    tags: "Tags:",
  },
  experience: { title: "Erfahrung", fullResume: "Ganzer Lebenslauf" },
  extras: {
    education: "Ausbildung",
    certifications: "Zertifikate",
    writing: "Artikel",
    minutes: "{minutes} Min. Lesezeit",
    talks: "Vorträge",
    milestones: "Meilensteine",
  },
  contact: {
    title: "Lass uns reden.",
    byEmail: "Am schnellsten erreichst du {name} per E-Mail.",
    below: "Am schnellsten erreichst du {name} hier unten.",
  },
  backToTop: "Nach oben",
} satisfies Translation<Messages["portfolioDesigns"]["brutal"]>;
