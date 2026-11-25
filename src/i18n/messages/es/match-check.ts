import type { Messages } from "..";
import type { Translation } from "../../types";

// The free job match tool's own words, in Spanish.
export default {
  privacy: {
    pasted: "El texto pegado se revisa en tu navegador y nunca sale de él.",
    uploaded: "La revisión se hace en tu navegador. No se guarda nada.",
  },
  sample: {
    try: "Probar con un ejemplo",
    putBack: "Volver a mi texto",
    clear: "Quitar el ejemplo",
  },
  submit: "Revisar compatibilidad",
  failed: { title: "La revisión no cargó", body: "Comprueba tu conexión y vuelve a intentarlo." },
  stale: {
    title: "Cambiaste el texto desde esta revisión",
    body: "Vuelve a revisar la compatibilidad para actualizarla.",
  },
  pasteText: "Pegar texto",
  resume: {
    title: "Tu currículum",
    tabs: "Cómo agregar tu currículum",
    upload: "Subir un archivo",
    label: "Texto del currículum",
    placeholder: "Pega aquí tu currículum",
    hint: "Cópialo de tu archivo o de tu perfil, con títulos y todo.",
    problems: {
      reading: "Espera un momento mientras Otto lee tu archivo.",
      noFile: "Elige el archivo de tu currículum, o pega el texto.",
      empty: "Primero pega tu currículum.",
      short: "Es un poco corto. Pega tu currículum completo.",
      long: "Eso es más largo que un currículum. Pega solo tu currículum.",
    },
  },
  upload: {
    label: "Sube tu currículum, un archivo PDF o Word",
    reading: "Leyendo {name}…",
    read: "Se leyeron {words} palabras. Elige otro archivo para cambiarlo.",
    drop: "Suelta aquí tu currículum o elige un archivo",
    formats: "PDF o Word (.docx), hasta {size}",
    kept: "Tu archivo se lee en nuestro servidor para obtener su texto y luego se descarta. No lo guardamos.",
    failed: "Algo salió mal al leer ese archivo. Vuelve a intentarlo o pega el texto.",
    pictureOnly:
      "Ese archivo es solo una imagen, así que el software de selección ve una página en blanco. Pega el texto de tu currículum.",
  },
  post: {
    title: "La oferta de empleo",
    tabs: "Cómo agregar la oferta de empleo",
    link: "Pegar un enlace",
    label: "Texto de la oferta",
    placeholder: "Pega aquí la oferta de empleo o su enlace",
    hint: "Pégala completa: funciones, requisitos y deseables.",
    problems: {
      empty: "Primero pega la oferta de empleo.",
      short: "Es un poco corta. Pega la oferta completa, no solo el título.",
      long: "Tiene más de {max} caracteres. Quita la presentación de la empresa o los beneficios.",
    },
  },
  link: {
    label: "Enlace de la oferta",
    hint: "Pega el enlace y Otto lo lee al instante. Funciona con la mayoría de los sitios de empleo, pero no con LinkedIn ni Indeed.",
    reading: "Otto está leyendo la oferta…",
    readingStatus: "Otto está leyendo la oferta.",
    readStatus: "Oferta leída: {title}.",
    untitledStatus: "sin título",
    from: "Desde el enlace",
    untitled: "Empleo sin título",
    seeText: "Ver el texto que leyó Otto",
    pasteInstead: "Pegar el texto de la oferta",
    system: "Este empleo usa {name}.",
    guide: "Leer la guía de {name}",
    newTab: "(se abre en una pestaña nueva)",
    problems: {
      empty: "Primero pega el enlace de la oferta.",
      notLink: "Eso no parece un enlace. Cópialo de la barra de direcciones de tu navegador.",
      tooLong: "Ese enlace es demasiado largo. Copia la dirección de la oferta misma.",
      offline: "Parece que no tienes conexión. Revisa tu conexión o pega el texto de la oferta.",
      failed: "Otto no pudo leer ese enlace ahora. Pega el texto de la oferta.",
    },
  },
  result: {
    places: {
        at: "{title} en {company}",
        line: "{place}, línea {number}",
        experience: "Experiencia",
        project: "Proyecto",
        education: "Educación",
        jobTitle: "Puesto",
        certifications: "Certificaciones",
        summary: "Resumen",
        skills: "Habilidades",
        skillsGroup: "Habilidades: {label}",
        headline: "Título profesional",
        tools: "{name}, herramientas",
        projects: "Proyectos",
        top: "Parte de arriba de tu currículum",
      },
    eyebrow: "Revisión de palabras gratis",
    headline: {
      one: "Otto encontró {found} de {count} habilidad que menciona la oferta",
      other: "Otto encontró {found} de {count} habilidades que menciona la oferta",
    },
    none: "No hay habilidades ni herramientas que Otto conozca en esta oferta",
    noneBody:
      "Otto busca las habilidades, herramientas, licencias e idiomas que conoce, y esta oferta no menciona ninguno. Pega la oferta completa, con sus requisitos, y vuelve a revisar.",
    body: "Otto buscó cada habilidad, herramienta y licencia que menciona la oferta, palabra por palabra, como lo hacen los filtros de palabras clave. Es un recuento, no una calificación.",
    count: "{label}: {found} de {total} encontradas",
    listed: {
      one: "Una solo aparece en una lista, como tus habilidades. Los reclutadores buscan una línea que diga dónde la usaste.",
      other:
        "{count} solo aparecen en una lista, como tus habilidades. Los reclutadores buscan una línea que diga dónde las usaste.",
    },
    groups: {
      must: "Imprescindibles",
      nice: "Deseables",
      alsoNamed: "También en la oferta",
      all: "Habilidades que menciona la oferta",
    },
    status: { shown: "En una línea", listed: "Solo listada", missing: "No encontrada" },
    missingHint:
      "Si la usaste, agrega una línea que diga dónde y qué hiciste. Usa las mismas palabras de la oferta.",
    asks: {
      label: "También en la oferta",
      title: "La oferta también pide",
      note: "Una revisión de palabras no puede juzgar años ni títulos. Compáralos por tu cuenta con tus fechas y tu formación.",
    },
  },
  otto: {
    none: "No encontré habilidades ni herramientas que conozca en esta oferta. Funciona mejor una oferta que enumere sus requisitos.",
    all: {
      one: "Tu currículum incluye la única habilidad que menciona esta oferta.",
      other: "Tu currículum incluye las {count} habilidades que menciona esta oferta.",
    },
    mustLeft: {
      one: "{count} de los {total} imprescindibles de la oferta aún no está en tu currículum. Empieza por ahí.",
      other:
        "{count} de los {total} imprescindibles de la oferta aún no están en tu currículum. Empieza por ahí.",
    },
    some: {
      one: "Tu currículum incluye {found} de la {count} habilidad que menciona esta oferta. Aquí ves dónde.",
      other:
        "Tu currículum incluye {found} de las {count} habilidades que menciona esta oferta. Aquí ves dónde.",
    },
  },
  studio: {
    title: "Lleva ambos al estudio",
    opens: {
      file: "El estudio gratuito lee tu archivo",
      sample: "El estudio gratuito se abre con el currículum de ejemplo",
      pasted: "El estudio gratuito se abre con el currículum que pegaste",
    },
    body: "{opens} y guarda esta oferta para Adaptar. Corrige líneas a mano o con Otto ({fixes} correcciones de línea al mes gratis) y descarga un PDF limpio. En Pro, Otto adapta tu currículum a este empleo.",
    cta: "Corregir estas líneas con Otto",
    failed: "El estudio no se abrió. Revisa tu conexión y vuelve a intentarlo.",
  },
} satisfies Translation<Messages["matchCheck"]>;
