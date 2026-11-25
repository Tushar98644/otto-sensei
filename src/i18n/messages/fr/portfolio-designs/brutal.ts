import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Rubriques",
    about: "À propos",
    projects: "Projets",
    work: "Parcours",
    contact: "Contact",
  },
  resume: "CV",
  hero: {
    label: "Présentation",
    hello: "Salut, moi c’est <b>{name}</b>",
    getInTouch: "Me contacter",
  },
  stack: { label: "Outils", title: "{name} travaille avec" },
  about: {
    title: "Qui est {name} ?",
    moreLabel: "Plus sur moi",
    more: "Plus sur {name}",
  },
  projects: {
    title: "Projets",
    github: "Voir GitHub",
    source: "Code",
    visit: "Visiter",
    tags: "étiquettes :",
  },
  experience: { title: "Expérience", fullResume: "CV complet" },
  extras: {
    education: "Formation",
    certifications: "Certifications",
    writing: "Articles",
    minutes: "{minutes} min de lecture",
    talks: "Conférences",
    milestones: "Étapes clés",
  },
  contact: {
    title: "Parlons-en.",
    byEmail: "Le plus simple pour joindre {name}, c’est par e-mail.",
    below: "Le plus simple pour joindre {name}, c’est juste en dessous.",
  },
  backToTop: "Retour en haut",
} satisfies Translation<Messages["portfolioDesigns"]["brutal"]>;
