import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  hello: "Olá, eu sou {name}",
  about: "Sobre",
  experience: "Experiência profissional",
  education: "Formação",
  skills: "Habilidades",
  projects: {
    pill: "Meus projetos",
    title: "Confira meu trabalho mais recente",
    text: "Algumas coisas que criei, com links para você testar.",
  },
  website: "Site",
  source: "Código",
  open: "Abrir {name}",
  milestones: {
    pill: "Hackathons",
    title: "Adoro construir coisas",
    text: "Hackathons, prêmios e lançamentos pelo caminho.",
  },
  link: "Link",
  contact: {
    pill: "Contato",
    title: "Vamos conversar",
    chat: "Quer bater um papo?",
    email: "É só <link>me mandar um e-mail</link> que eu respondo.",
    message: "É só <link>me mandar uma mensagem</link> que eu respondo.",
    none: "Vou adorar ter notícias suas.",
  },
  home: "Início",
  resume: "Currículo",
  email: "E-mail",
  theme: { label: "Tema", toggle: "Alternar tema" },
} satisfies Translation<Messages["portfolioDesigns"]["dock"]>;
