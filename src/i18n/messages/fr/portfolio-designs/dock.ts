import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  hello: "Salut, moi c’est {name}",
  about: "À propos",
  experience: "Expérience professionnelle",
  education: "Formation",
  skills: "Compétences",
  projects: {
    pill: "Mes projets",
    title: "Découvre mes derniers travaux",
    text: "Quelques-unes des choses que j’ai créées, avec des liens pour les essayer.",
  },
  website: "Site web",
  source: "Code source",
  open: "Ouvrir {name}",
  milestones: {
    pill: "Hackathons",
    title: "J’adore créer des choses",
    text: "Hackathons, prix et lancements au fil du temps.",
  },
  link: "Lien",
  contact: {
    pill: "Contact",
    title: "Restons en contact",
    chat: "Envie de discuter ?",
    email: "<link>Envoie-moi un e-mail</link> et je te réponds vite.",
    message: "<link>Envoie-moi un message</link> et je te réponds vite.",
    none: "J’ai hâte d’avoir de tes nouvelles.",
  },
  home: "Accueil",
  resume: "CV",
  email: "E-mail",
  theme: { label: "Thème", toggle: "Changer de thème" },
} satisfies Translation<Messages["portfolioDesigns"]["dock"]>;
