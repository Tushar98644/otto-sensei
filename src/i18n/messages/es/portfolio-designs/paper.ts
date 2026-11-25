import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: { about: "sobre mí", work: "proyectos", jobs: "empleos", stack: "stack" },
  sections: "Secciones",
  resume: "CV",
  elsewhere: "En otros sitios",
  email: "correo",
  about: "Sobre mí",
  myResume: "mi currículum",
  projects: "Proyectos",
  stars: { one: "<b>{count}</b> estrella", other: "<b>{count}</b> estrellas" },
  work: "Experiencia",
  stack: "Stack tecnológico",
  education: "Educación",
  openSource: "Código abierto",
  allOfIt: "verlo todo",
  writing: "Escritos",
  minRead: "{count} min de lectura",
  talks: "Charlas",
  milestones: "Logros",
  certifications: "Certificaciones",
  dayOrNight: "de día o de noche",
  drawn: "{name} · dibujado a mano, en código",
  mode: {
    day: "día",
    night: "noche",
    toDay: "Cambiar a día",
    toNight: "Cambiar a noche",
  },
} satisfies Translation<Messages["portfolioDesigns"]["paper"]>;
