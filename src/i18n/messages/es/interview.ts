import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  home: {
    title: "Preparación para entrevistas",
    packsIntro: {
      one: "{count} paquete de preparación, uno por empleo, hecho con las líneas de tu currículum.",
      other:
        "{count} paquetes de preparación, uno por empleo, hechos con las líneas de tu currículum.",
    },
    intro:
      "Para cada empleo en el que tengas entrevista: preguntas probables, historias de las líneas de tu currículum y preguntas para hacerles.",
    prepare: "Prepararme para un empleo",
    didntLoad: "Tu preparación para entrevistas no cargó",
    tryAgain: "Intentar de nuevo",
    checkConnection: "Revisa tu conexión y vuelve a intentarlo.",
    lockedEyebrow: "Viene con Pro",
    lockedTitle: "Practica cada entrevista antes de que llegue",
    locked:
      "Con Pro, te preparo para cada entrevista con las líneas de tu propio currículum. Aquí tienes un ejemplo.",
    lockedKept:
      "Crear una nueva preparación viene con Pro. La que hiciste antes se queda aquí para leer.",
    emptyEyebrow: "Aún no hay entrevistas",
    emptyTitle: "Tu próxima entrevista, preparada en un clic",
    emptyDetail:
      "Cuando una postulación llega a la etapa de entrevista, te espera aquí con un botón Prepararme. O prepárate ya para cualquier empleo desde su enlace.",
    next: "Próxima entrevista",
    atStage: "En etapa de entrevista",
    interviews: { one: "{count} entrevista", other: "{count} entrevistas" },
    moreInterviews: "Más entrevistas",
    calendar: "En tu calendario",
    morePacks: "Más paquetes de preparación",
    yourPacks: "Tus paquetes de preparación",
    packs: { one: "{count} paquete", other: "{count} paquetes" },
    loading: "Cargando tu preparación para entrevistas",
  },
  calendar: {
    ready: "Archivo de calendario listo",
    readyDetail:
      "Ábrelo para agregar el día de la entrevista, con un recordatorio para practicar la mañana anterior.",
    failed: "No se pudo crear el archivo de calendario",
    tryLater: "Vuelve a intentarlo en un momento.",
    add: "Agregar al calendario",
  },
  brief: {
    title: "Resumen de hoy",
    stories: "Tus historias más fuertes",
    questions: "Preguntas probables",
    asks: "Preguntas para hacerles",
  },
} satisfies Translation<Messages["interview"]>;
