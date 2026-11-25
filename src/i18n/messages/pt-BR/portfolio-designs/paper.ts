import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: { about: "sobre", work: "projetos", jobs: "empregos", stack: "stack" },
  sections: "Seções",
  resume: "Currículo",
  elsewhere: "Em outros lugares",
  email: "e-mail",
  about: "Sobre",
  myResume: "meu currículo",
  projects: "Projetos",
  stars: { one: "<b>{count}</b> estrela", other: "<b>{count}</b> estrelas" },
  work: "Trabalho",
  stack: "Stack de tecnologia",
  education: "Formação",
  openSource: "Código aberto",
  allOfIt: "ver tudo",
  writing: "Textos",
  minRead: "{count} min de leitura",
  talks: "Palestras",
  milestones: "Marcos",
  certifications: "Certificações",
  dayOrNight: "dia ou noite",
  drawn: "{name} · desenhado à mão, em código",
  mode: {
    day: "dia",
    night: "noite",
    toDay: "Mudar para dia",
    toNight: "Mudar para noite",
  },
} satisfies Translation<Messages["portfolioDesigns"]["paper"]>;
