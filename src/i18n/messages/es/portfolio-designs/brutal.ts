import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Secciones",
    about: "Sobre mí",
    projects: "Proyectos",
    work: "Trabajo",
    contact: "Contacto",
  },
  resume: "CV",
  hero: {
    label: "Presentación",
    hello: "Hola, soy <b>{name}</b>",
    getInTouch: "Escríbeme",
  },
  stack: { label: "Tecnologías", title: "{name} trabaja con" },
  about: {
    title: "¿Quién es {name}?",
    moreLabel: "Más sobre mí",
    more: "Más sobre {name}",
  },
  projects: {
    title: "Proyectos",
    github: "Ver GitHub",
    source: "Código",
    visit: "Visitar",
    tags: "etiquetas:",
  },
  experience: { title: "Experiencia", fullResume: "CV completo" },
  extras: {
    education: "Educación",
    certifications: "Certificaciones",
    writing: "Escritos",
    minutes: "{minutes} min de lectura",
    talks: "Charlas",
    milestones: "Hitos",
  },
  contact: {
    title: "Hablemos.",
    byEmail: "La forma más rápida de contactar a {name} es por correo.",
    below: "La forma más rápida de contactar a {name} está aquí abajo.",
  },
  backToTop: "Volver arriba",
} satisfies Translation<Messages["portfolioDesigns"]["brutal"]>;
