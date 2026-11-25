import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  nav: {
    label: "Secciones",
    projects: "Proyectos",
    talks: "Charlas",
    writing: "Escritos",
    resume: "Currículum",
  },
  top: "{name}, volver arriba",
  lines: {
    current: "Ahora en",
    before: "Antes en",
    projects: "Proyectos",
  },
  elsewhere: "En otras partes de la web",
  sayHello: "Salúdame en <link>{email}</link>",
  recording: "Con grabación",
  minutes: "{minutes} min",
  toTop: "Volver arriba",
} satisfies Translation<Messages["portfolioDesigns"]["prose"]>;
