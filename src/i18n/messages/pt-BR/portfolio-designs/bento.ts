import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  welcome: "boas-vindas",
  hello: "Oi, eu sou <b>{name}</b>",
  stack: "Tecnologias e ferramentas",
  skills: "Habilidades",
  contact: {
    title: "Vamos trabalhar juntos!",
    details: "Contato",
    resume: "Currículo",
    findMe: "Onde me encontrar",
  },
  tz: {
    in: "Em {place}",
    here: "Onde você está",
    same: "mesmo fuso horário",
    ahead: "{offset} à sua frente",
    behind: "{offset} atrás de você",
    hours: "{hours} h",
    hoursMinutes: "{hours} h {minutes} min",
  },
  github: {
    label: "Perfil no GitHub",
    stars: { one: "{count} estrela", other: "{count} estrelas" },
    repos: { one: "{count} repositório", other: "{count} repositórios" },
  },
  now: { title: "Agora", what: "o que é isso?" },
  experience: "Experiência",
  at: "em {company}",
  accents: {
    red: "destaque vermelho",
    yellow: "destaque amarelo",
    blue: "destaque azul",
    purple: "destaque roxo",
    green: "destaque verde",
  },
  crafted: "Feito com <b>amor</b> por {name}",
} satisfies Translation<Messages["portfolioDesigns"]["bento"]>;
