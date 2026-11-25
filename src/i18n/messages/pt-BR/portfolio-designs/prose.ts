import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Seções",
    projects: "Projetos",
    talks: "Palestras",
    writing: "Textos",
    resume: "Currículo",
  },
  top: "{name}, voltar ao topo",
  lines: {
    current: "Hoje em",
    before: "Antes em",
    projects: "Projetos",
  },
  elsewhere: "Em outros cantos da web",
  sayHello: "Diga oi em <link>{email}</link>",
  recording: "Com gravação",
  minutes: "{minutes} min",
  toTop: "Voltar ao topo",
} satisfies Translation<Messages["portfolioDesigns"]["prose"]>;
