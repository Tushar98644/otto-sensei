import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  role: "Portfolio",
  nav: {
    projects: "Projekte",
    details: "Profil",
    experience: "Erfahrung",
    resume: "Lebenslauf",
    contact: "Kontakt",
  },
  home: "{name}, Startseite",
  menu: "Menü",
  theme: "Farbmodus wechseln",
  scroll: "Zu den Projekten scrollen",
  and: "{list} und {last}",
  view: {
    project: "Projekt ansehen",
    website: "Website ansehen",
    source: "Quellcode ansehen",
  },
  loading: "Wird geladen...",
  drawn: {
    laptop: "{name}, gezeichnet auf einem Laptop",
    phone: "{name}, gezeichnet auf zwei Handys",
  },
  more: "Weitere Projekte",
  hello: "Hallo",
  message: "Schreib mir eine Nachricht",
  aboutMe: "Über mich",
  experience: "Erfahrung",
  visit: "Website besuchen",
  source: "Quellcode ansehen",
  back: "Zurück zu den Projekten",
} satisfies Translation<Messages["portfolioDesigns"]["reel"]>;
