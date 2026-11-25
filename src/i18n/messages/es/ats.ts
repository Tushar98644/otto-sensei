import type { Messages } from "..";
import type { Translation } from "../../types";

// The ATS guide pages around each system's sourced notes, in Spanish.
export default {
  topics: {
    titles: {
      file: "Cómo lee tu archivo",
      search: "Cómo buscan en él los reclutadores",
      screening: "Preguntas que pueden descartarte",
      ai: "Comparación y clasificación con IA",
      review: "Cómo revisan las personas a los candidatos",
    },
    phrases: {
      file: "cómo lee tu archivo",
      search: "cómo buscan en él los reclutadores",
      screening: "preguntas de filtro",
      ai: "comparación con IA",
      review: "cómo revisan las personas a los candidatos",
    },
    short: {
      file: "lectura de archivos",
      search: "búsqueda del reclutador",
      screening: "preguntas de filtro",
      ai: "comparación con IA",
      review: "revisión humana",
    },
  },
  meta: {
    index: {
      title: "Guías de ATS: cómo el software de selección lee currículums",
      description:
        "Cómo {count} sistemas ATS, de Greenhouse y Workday a Taleo, leen currículums, filtran a los candidatos y los clasifican con IA. Cada nota enlaza a su fuente.",
    },
    reads: "ATS {name}: cómo lee tu currículum",
    does: "ATS {name}: qué hace con tu postulación",
  },
  headline: {
    reads: "Cómo lee {name} tu currículum",
    does: "Qué hace {name} con tu postulación",
  },
  description: {
    intros: {
      long: "Qué hace el ATS {name} con tu postulación: {topics}.",
      plain: "Qué hace {name} con tu postulación: {topics}.",
      short: "Qué hace el ATS {name} con tu postulación: {short}.",
      brief: "Guía del ATS {name}: {short}.",
    },
    endings: {
      sourcedGeneral: "{sourced}, más consejos generales para cualquier ATS.",
      sourcedAny: "{sourced}, más consejos para cualquier ATS.",
      briefGeneral: "{brief}, más consejos generales para cualquier ATS.",
      briefAny: "{brief}, más consejos para cualquier ATS.",
      sourced: "{sourced}.",
      brief: "{brief}.",
    },
    sourced: {
      one: "Una nota con un consejo práctico y su fuente",
      other: "{count} notas, cada una con un consejo práctico y su fuente",
    },
    brief: {
      one: "Una nota con fuente y un consejo práctico",
      other: "{count} notas con fuente y consejos prácticos",
    },
  },
  sources: {
    on: "{label} sobre {topics}",
    nth: "{label} ({count})",
    covers: "sobre {topics}",
  },
  crumb: "Guías de ATS",
  index: {
    eyebrow: "Guías de ATS",
    title: "Cómo el software de selección",
    titleEm: "lee tu currículum",
    intro:
      "Un sistema de seguimiento de candidatos (ATS) es el software que usan los empleadores para recibir y ordenar las postulaciones. Esto es lo que Otto ha encontrado sobre {count} de ellos, con un enlace a la página detrás de cada nota.",
    systems: "Sistemas de selección",
    notes: "{count} notas con fuente",
    generalTitle: "Consejos que valen para la mayoría",
    generalIntro:
      "Estos consejos se repiten una y otra vez en los sistemas de arriba. Cada guía tiene los detalles, y las fuentes, de un sistema.",
  },
  guide: {
    eyebrow: "Guía de ATS",
    count: {
      one: "1 nota con fuente, enlazada a la página de donde viene.",
      other: "{count} notas con fuente, cada una enlazada a la página de donde viene.",
    },
    setUp:
      "Cada empleador configura {name} a su manera, así que no todas las notas aplican a todos los empleos.",
    spotTitle: "Cómo saber si un empleo usa {name}",
    noFileNotes:
      "Las notas de Otto todavía no cubren cómo lee {name} los archivos, así que aquí no hay nada con fuente que compartir. Los <link>consejos generales</link> de abajo son un punto de partida seguro.",
    whatToDo: "Qué hacer:",
    optIn: "Solo si el empleador lo activa",
    source: "Fuente:",
    generalTitle: "Consejos generales para cualquier sistema de selección",
    generalIntro:
      "No son específicos de {name}. Estos consejos se repiten una y otra vez en las notas que tiene Otto sobre {count} sistemas de selección.",
    sourcesTitle: "Fuentes",
    aside: "Próximos pasos y más guías",
    sideTitle: "¿Postulas a través de {name}?",
    sideText:
      "Mira cuáles de las habilidades del empleo muestra tu currículum. Gratis, sin iniciar sesión.",
    moreTitle: "Más guías de ATS",
    templatesLink: "Plantillas de currículum en una columna de texto real",
    compareLink: "Cómo se compara Otto con otras herramientas",
  },
  jobLink: {
    label: "Enlace del empleo",
    submit: "Comparar mi currículum con este empleo",
    empty: "Pega el enlace de un empleo y te diré si usa {name}.",
    unknown:
      "No puedo saber el sistema de selección a partir de este enlace. Los consejos generales de abajo siguen aplicando.",
    same: "Este empleo usa {name}, así que las notas de esta página le aplican.",
    other:
      "Este empleo usa {other}, no {name}. Su propia guía tiene las notas que le corresponden.",
    readGuide: "Lee la guía de {name}",
  },
} satisfies Translation<Messages["ats"]>;
