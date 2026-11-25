import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  user: "visitante",
  banner: {
    help: "Escribe '<link>{command}</link>' para ver la lista de comandos disponibles.",
    summary: "Escribe '<link>{command}</link>' para ver un resumen.",
    resume: "Escribe '<link>{command}</link>' o haz clic <link>aquí</link> para ver el currículum.",
  },
  fetch: {
    title: "<b>{command}</b>: resumen",
    about: "SOBRE MÍ",
    resume: "Currículum",
    contact: "CONTACTO",
    status: "ESTADO",
    now: "AHORA",
  },
  about: {
    hello: "Hola, soy {name}.",
    more: "Más sobre mí:",
    summary: "'<link>{command}</link>' - resumen corto.",
    work: "'<link>{command}</link>' - dónde he trabajado.",
    projects: "'<link>{command}</link>' - cosas que he creado.",
  },
  skills: "habilidades",
  stack: "tecnologías:",
  minutes: "{minutes} min",
  email: "correo",
  resume: "currículum",
  shell: {
    welcome: "¡Hola! Estos son todos los comandos disponibles:",
    tab: "[tab]: autocompletar.",
    clear: "[ctrl+l]/clear: limpiar la terminal.",
    opening: "Abriendo {label}...",
    themeSet: "Tema cambiado a {mode}.",
    usage: "uso: theme [light|dark]",
    notFound: "shell: comando no encontrado: {name}. Prueba 'help' para empezar.",
    prompt: "Escribe un comando, o help",
    jokes: {
      vi: "vaya, ¿todavía usas 'vi'? prueba 'vim'.",
      vim: "'vim' está pasado de moda. ¿qué tal 'nvim'?",
      nvim: "¿'nvim'? demasiado elegante. ¿por qué no 'emacs'?",
      emacs: "¿sabes qué? usa vscode y listo.",
      sudo: "Permiso denegado: con poco poder viene... ¿ninguna responsabilidad?",
      cd: "lamentablemente, no me alcanza para más directorios.",
    },
  },
} satisfies Translation<Messages["portfolioDesigns"]["terminal"]>;
