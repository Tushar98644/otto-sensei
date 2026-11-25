import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  link: "Enlace de la oferta",
  linkHint: "Pega el enlace y Otto lo lee al instante.",
  noLink: "¿No tienes enlace? Pega el texto de la oferta",
  linkFirst: "Primero pega el enlace de la oferta de empleo.",
  notALink: "Eso no parece un enlace. Cópialo de la barra de direcciones del navegador.",
  linkTooLong: "Ese enlace es demasiado largo. Copia la dirección de la oferta en sí.",
  readFailed: "Otto no pudo leer ese enlace ahora. Pega el texto de la oferta.",
  closedSite:
    "{site} no deja que las apps lean la oferta. Copia la descripción del puesto y pégala aquí.",
  readJob: "Oferta leída: {name}.",
  titleAt: "{title} en {company}",
  untitledShort: "sin título",
  fromLink: "Desde el enlace",
  untitled: "Oferta sin título",
  postedToday: "Publicada hoy",
  postedYesterday: "Publicada ayer",
  postedOn: "Publicada el {date}",
  postedDaysAgo: "Publicada el {date} (hace {days} días)",
  closed: "La oferta dice que cerró el {date}.",
  pasteInstead: "¿No es esta? Pega el texto",
  moreOptions: "Más opciones",
  title: "Cargo",
  titlePlaceholder: "p. ej., Diseñadora de producto",
  company: "Empresa",
  companyPlaceholder: "p. ej., Mercado Libre",
  post: "Oferta de empleo",
  postHint: "Pégala completa: tareas, requisitos y deseables.",
  postPlaceholder: "Pega aquí la oferta de empleo",
  needsPost: "Primero pega el enlace de la oferta. Si no abre, pega el texto.",
  tooShort: "Es un poco corta. Pega la oferta completa, no solo el título.",
  tooLong:
    "Pasa de {max} caracteres. Quita la presentación de la empresa o los beneficios y vuelve a intentarlo.",
  compare: "Comparar con mi currículum",
} satisfies Translation<Messages["jobForm"]>;
