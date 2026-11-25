import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: { about: "über mich", work: "Projekte", jobs: "Jobs", stack: "Stack" },
  sections: "Abschnitte",
  resume: "Lebenslauf",
  elsewhere: "Anderswo",
  email: "E-Mail",
  about: "Über mich",
  myResume: "mein Lebenslauf",
  projects: "Projekte",
  stars: { one: "<b>{count}</b> Stern", other: "<b>{count}</b> Sterne" },
  work: "Erfahrung",
  stack: "Tech-Stack",
  education: "Ausbildung",
  openSource: "Open Source",
  allOfIt: "alles ansehen",
  writing: "Texte",
  minRead: "{count} Min. Lesezeit",
  talks: "Vorträge",
  milestones: "Meilensteine",
  certifications: "Zertifikate",
  dayOrNight: "Tag oder Nacht",
  drawn: "{name} · von Hand gezeichnet, in Code",
  mode: {
    day: "Tag",
    night: "Nacht",
    toDay: "Zu Tag wechseln",
    toNight: "Zu Nacht wechseln",
  },
} satisfies Translation<Messages["portfolioDesigns"]["paper"]>;
