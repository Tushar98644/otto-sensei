import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  user: "visiteur",
  banner: {
    help: "Tape '<link>{command}</link>' pour voir la liste des commandes disponibles.",
    summary: "Tape '<link>{command}</link>' pour afficher un résumé.",
    resume: "Tape '<link>{command}</link>' ou clique <link>ici</link> pour voir le CV.",
  },
  fetch: {
    title: "<b>{command}</b> : résumé",
    about: "À PROPOS",
    resume: "CV",
    contact: "COORDONNÉES",
    status: "STATUT",
    now: "EN CE MOMENT",
  },
  about: {
    hello: "Salut, moi c’est {name}.",
    more: "Pour en savoir plus :",
    summary: "'<link>{command}</link>' - résumé rapide.",
    work: "'<link>{command}</link>' - où j’ai travaillé.",
    projects: "'<link>{command}</link>' - ce que j’ai construit.",
  },
  skills: "compétences",
  stack: "technos :",
  minutes: "{minutes} min",
  email: "e-mail",
  resume: "cv",
  shell: {
    welcome: "Bienvenue ! Voici toutes les commandes disponibles :",
    tab: "[tab] : compléter.",
    clear: "[ctrl+l]/clear : vider le terminal.",
    opening: "Ouverture de {label}...",
    themeSet: "Thème réglé sur {mode}.",
    usage: "usage : theme [light|dark]",
    notFound: "shell : commande introuvable : {name}. Essaie 'help' pour commencer.",
    prompt: "Tape une commande, ou help",
    jokes: {
      vi: "waouh, tu utilises encore 'vi' ? essaie 'vim'.",
      vim: "'vim', c’est tellement dépassé. et pourquoi pas 'nvim' ?",
      nvim: "'nvim' ? trop chic. pourquoi pas 'emacs' ?",
      emacs: "tu sais quoi ? utilise juste vscode.",
      sudo: "Permission refusée : à petit pouvoir... aucune responsabilité ?",
      cd: "malheureusement, je n’ai pas les moyens de m’offrir plus de répertoires.",
    },
  },
} satisfies Translation<Messages["portfolioDesigns"]["terminal"]>;
