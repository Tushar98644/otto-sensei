import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  role: "Portfólio",
  nav: {
    projects: "Projetos",
    details: "Detalhes",
    experience: "Experiência",
    resume: "Currículo",
    contact: "Contato",
  },
  home: "{name}, início",
  menu: "Menu",
  theme: "Alternar tema",
  scroll: "Rolar até os projetos",
  and: "{list} e {last}",
  view: {
    project: "Ver projeto",
    website: "Ver site",
    source: "Ver código",
  },
  loading: "Carregando...",
  drawn: {
    laptop: "{name}, desenhado em um notebook",
    phone: "{name}, desenhado em um par de celulares",
  },
  more: "Mais projetos",
  hello: "Olá!",
  message: "Me mande uma mensagem",
  aboutMe: "Sobre mim",
  experience: "Experiência",
  visit: "Visitar site",
  source: "Ver código",
  back: "Voltar aos projetos",
} satisfies Translation<Messages["portfolioDesigns"]["reel"]>;
