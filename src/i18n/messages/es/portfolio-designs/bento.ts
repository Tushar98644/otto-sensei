import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  welcome: "bienvenida",
  hello: "Hola, soy <b>{name}</b>",
  stack: "Tecnologías y herramientas",
  skills: "Habilidades",
  contact: {
    title: "¡Trabajemos juntos!",
    details: "Datos de contacto",
    resume: "Currículum",
    findMe: "Encuéntrame en",
  },
  tz: {
    in: "En {place}",
    here: "Donde estás",
    same: "misma zona horaria",
    ahead: "{offset} por delante de ti",
    behind: "{offset} por detrás de ti",
    hours: "{hours} h",
    hoursMinutes: "{hours} h {minutes} min",
  },
  github: {
    label: "Perfil de GitHub",
    stars: { one: "{count} estrella", other: "{count} estrellas" },
    repos: { one: "{count} repositorio", other: "{count} repositorios" },
  },
  now: { title: "Ahora", what: "¿qué es esto?" },
  experience: "Experiencia",
  at: "en {company}",
  accents: {
    red: "acento rojo",
    yellow: "acento amarillo",
    blue: "acento azul",
    purple: "acento morado",
    green: "acento verde",
  },
  crafted: "Hecho con <b>amor</b> por {name}",
} satisfies Translation<Messages["portfolioDesigns"]["bento"]>;
