import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  role: "Portfolio",
  nav: {
    projects: "Projets",
    details: "Détails",
    experience: "Expérience",
    resume: "CV",
    contact: "Contact",
  },
  home: "{name}, accueil",
  menu: "Menu",
  theme: "Changer de thème",
  scroll: "Aller aux projets",
  and: "{list} et {last}",
  view: {
    project: "Voir le projet",
    website: "Voir le site",
    source: "Voir le code",
  },
  loading: "Chargement...",
  drawn: {
    laptop: "{name}, dessiné sur un ordinateur portable",
    phone: "{name}, dessiné sur deux téléphones",
  },
  more: "Plus de projets",
  hello: "Salut",
  message: "Envoie-moi un message",
  aboutMe: "À propos de moi",
  experience: "Expérience",
  visit: "Visiter le site",
  source: "Voir le code",
  back: "Retour aux projets",
} satisfies Translation<Messages["portfolioDesigns"]["reel"]>;
