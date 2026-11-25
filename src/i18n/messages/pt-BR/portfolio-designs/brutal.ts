import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Seções",
    about: "Sobre",
    projects: "Projetos",
    work: "Trabalho",
    contact: "Contato",
  },
  resume: "Currículo",
  hero: {
    label: "Apresentação",
    hello: "Oi, eu sou <b>{name}</b>",
    getInTouch: "Fale comigo",
  },
  stack: { label: "Tecnologias", title: "{name} trabalha com" },
  about: {
    title: "Quem é {name}?",
    moreLabel: "Mais sobre mim",
    more: "Mais sobre {name}",
  },
  projects: {
    title: "Projetos",
    github: "Ver GitHub",
    source: "Código",
    visit: "Visitar",
    tags: "etiquetas:",
  },
  experience: { title: "Experiência", fullResume: "Currículo completo" },
  extras: {
    education: "Formação",
    certifications: "Certificações",
    writing: "Textos",
    minutes: "{minutes} min de leitura",
    talks: "Palestras",
    milestones: "Marcos",
  },
  contact: {
    title: "Vamos conversar.",
    byEmail: "O jeito mais rápido de falar com {name} é por e-mail.",
    below: "O jeito mais rápido de falar com {name} está aqui embaixo.",
  },
  backToTop: "Voltar ao topo",
} satisfies Translation<Messages["portfolioDesigns"]["brutal"]>;
