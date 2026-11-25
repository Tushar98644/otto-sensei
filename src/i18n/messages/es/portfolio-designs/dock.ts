import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  hello: "Hola, soy {name}",
  about: "Sobre mí",
  experience: "Experiencia laboral",
  education: "Educación",
  skills: "Habilidades",
  projects: {
    pill: "Mis proyectos",
    title: "Mira mi trabajo más reciente",
    text: "Algunas de las cosas que he creado, con enlaces para probarlas.",
  },
  website: "Sitio web",
  source: "Código",
  open: "Abrir {name}",
  milestones: {
    pill: "Hackatones",
    title: "Me encanta crear cosas",
    text: "Hackatones, premios y lanzamientos en el camino.",
  },
  link: "Enlace",
  contact: {
    pill: "Contacto",
    title: "Hablemos",
    chat: "¿Quieres conversar?",
    email: "Solo <link>envíame un correo</link> y te responderé.",
    message: "Solo <link>envíame un mensaje</link> y te responderé.",
    none: "Me encantaría saber de ti.",
  },
  home: "Inicio",
  resume: "CV",
  email: "Correo",
  theme: { label: "Tema", toggle: "Cambiar tema" },
} satisfies Translation<Messages["portfolioDesigns"]["dock"]>;
