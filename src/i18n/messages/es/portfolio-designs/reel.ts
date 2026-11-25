import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  role: "Portafolio",
  nav: {
    projects: "Proyectos",
    details: "Detalles",
    experience: "Experiencia",
    resume: "CV",
    contact: "Contacto",
  },
  home: "{name}, inicio",
  menu: "Menú",
  theme: "Cambiar tema",
  scroll: "Ir a los proyectos",
  and: "{list} y {last}",
  view: {
    project: "Ver proyecto",
    website: "Ver sitio web",
    source: "Ver código",
  },
  loading: "Cargando...",
  drawn: {
    laptop: "{name}, dibujado en una laptop",
    phone: "{name}, dibujado en un par de teléfonos",
  },
  more: "Más proyectos",
  hello: "¡Hola!",
  message: "Envíame un mensaje",
  aboutMe: "Sobre mí",
  experience: "Experiencia",
  visit: "Visitar sitio web",
  source: "Ver código",
  back: "Volver a los proyectos",
} satisfies Translation<Messages["portfolioDesigns"]["reel"]>;
