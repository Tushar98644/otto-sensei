import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  usage: {
    thisPeriod: { month: "este mes", trial: "en esta prueba" },
    perPeriod: { month: "al mes", trial: "durante la prueba" },
    renews: "cuando se renueve tu plan",
    onDayRenews: "el {day}, cuando se renueve tu plan",
    onDay: "el {day}",
    trialStarts: "Tu límite completo empieza el {day}.",
    reset: "Se reinician {when}.",
    pool: "{count} {feature}",
    usedAll: "Ya usaste tus {pool} {period}. {reset}",
    usesOne: "Usa 1 de tus {pool} {period}. Te quedan {left}.",
  },
  features: {
    fix: "correcciones de línea",
    tailor: "versiones adaptadas",
    letter:
      "cartas de presentación, mensajes de contacto, respuestas y preparaciones para entrevistas",
    import: "lecturas con IA de un currículum subido",
    draft: "borradores de Construir con Otto",
    github: "borradores de proyectos de GitHub",
  },
  copy: {
    copied: "Copiado",
    cantCopy: "No se pudo copiar",
    selectText: "Selecciona el texto del cuadro y cópialo desde ahí.",
  },
  undo: "Deshacer",
  trashed: "Movido a Eliminados recientemente",
  pro: { comesWith: ", viene con " },
  seePro: "Ver Pro",
  tryOffer: "Prueba {plan} por {days} días",
  errors: {
    fallback: "Algo salió mal. Inténtalo de nuevo.",
    offline: "No se puede conectar con el servidor. Revisa tu conexión.",
  },
  justNow: "justo ahora",
  working: {
    import: "Otto está leyendo tu archivo.",
    job: "Otto está leyendo la oferta de empleo.",
    tailor: "Otto está leyendo la oferta de empleo y tu currículum.",
    fix: "Otto está pensando una línea más fuerte.",
    line: "Otto está escribiendo tu línea.",
    summary: "Otto está pensando un resumen.",
    letter: "Otto está escribiendo tu carta de presentación.",
    answer: "Otto está redactando tu respuesta.",
    outreach: "Otto está escribiendo tu mensaje.",
    interview: "Otto está armando tu preparación para la entrevista.",
    draft: "Otto está escribiendo tu primer borrador.",
    githubLookup: "Otto está buscando tu trabajo público en GitHub.",
    github: "Otto está convirtiendo tu trabajo de GitHub en líneas de proyecto.",
  },
} satisfies Translation<Messages["app"]>;
