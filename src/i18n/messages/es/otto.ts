import type { Messages } from "..";
import type { Translation } from "../../types";

// Otto's lines about limits, plans and errors, in Spanish.
export default {
  comesWithPro: {
    fix: "Más correcciones de línea vienen con Pro.",
    tailor: "Adaptar viene con Pro.",
    letter:
      "Las cartas, los mensajes de contacto, las respuestas y la preparación para entrevistas vienen con Pro.",
    import: "La lectura con IA de archivos subidos viene con Pro.",
    draft: "Crear borradores conmigo viene con Pro.",
    github: "Los borradores desde GitHub vienen con Pro.",
  },
  tool: {
    resumes: "Free guarda {free}. {pro} guarda {proCount}; {max}, {maxCount}.",
    formats: "Este formato viene con Pro. Free tiene Classic y Compact.",
    word: "Las descargas en Word vienen con Pro. Tu descarga en PDF sigue gratis.",
    tracker: "Free registra {free}. {pro} registra {proCount}; {max}, {maxCount}.",
    jobs: "Los filtros, los empleos guardados y todas las coincidencias vienen con Pro.",
    share: "Los enlaces para compartir vienen con Pro.",
    eligibility: "Revisar desde dónde puede contratar un empleo viene con Pro.",
    portfolio: "Un sitio de portafolio con tu propio enlace viene con Pro.",
  },
  resumes: { one: "{count} currículum", other: "{count} currículums" },
  applications: { one: "{count} postulación", other: "{count} postulaciones" },
  labels: {
    fix: "correcciones de línea",
    tailor: "versiones adaptadas",
    letter: "cartas, respuestas y preparaciones",
    import: "lecturas con IA",
    draft: "borradores",
    github: "borradores de GitHub",
  },
  withTrial: "{line} Prueba {plan} por {days} días.",
  reached: {
    month: "Ya usaste tus {limit} {label} de este mes. {reset}",
    trial: "Ya usaste tus {limit} {label} de esta prueba. {reset}",
  },
  freeUsed: "Ya usaste tus {limit} {label} de este mes. {pro} tiene {proLimit} al mes.",
  near: "Uy, ya usaste {used} de {limit} {label}. {reset}",
  full: {
    resumes: "{plan} guarda {limit} currículums. Borra uno para guardar otro{upsell}.",
    resumesOver:
      "{plan} guarda {limit} currículums; tienes {held}. Borra {over} para guardar otro{upsell}.",
    tracker:
      "{plan} registra {limit} postulaciones. Borra algunas antiguas para agregar más{upsell}.",
    trackerOver:
      "{plan} registra {limit} postulaciones; tienes {held}. Borra {over} para agregar otra{upsell}.",
    upsell: ", o pásate a {plan} para tener {limit}",
  },
  signedOut: "Se cerró tu sesión. Vuelve a iniciar sesión para continuar.",
  writing: {
    none: "No te quedan cartas, mensajes ni respuestas {period}. {reset}",
    left: "Te quedan {left} de {limit} cartas, mensajes y respuestas {period}.",
  },
  errors: {
    generic: "Algo salió mal de mi lado. ¿Lo intentas de nuevo?",
    aiUnavailable:
      "Me trabé con eso. Inténtalo de nuevo en un minuto. La mayoría de estos tropiezos no cuentan en tu límite.",
    offline: "Parece que no tienes conexión. Tu trabajo está guardado en este navegador.",
    rateLimited: "Es mucho a la vez. Dame un minuto para ponerme al día.",
    notFound: "Busqué por todas partes, pero esta página no está aquí.",
  },
  upgrade: {
    done: "Ya estás en {plan}. Tus nuevos límites se aplican de inmediato.",
    trial:
      "Prueba toda mi ayuda con IA: {plan} por {days} días, {price}. Cancela antes de que termine y no pagas nada más.",
    trialStarted: "Tu prueba de Pro dura hasta el {day}. Manos a la obra.",
  },
  budget: {
    month: "Ya usaste el presupuesto de IA de este mes.",
    trial: "Ya usaste el presupuesto de IA de esta prueba.",
    resetsOn: "Se reinicia el {day}.",
    resetsWhenRenews: "Se reinicia cuando se renueve tu plan.",
  },
  warnings: {
    fillIn: {
      send: "Completa {blanks} antes de enviarlo.",
      sendNumbers: "Completa {blanks} antes de enviarlo. Otto nunca inventa números.",
      ownWords: "Completa {blanks} con tus propias palabras antes de enviarlo.",
      use: "Completa {blanks} antes de usarlo.",
    },
    number: "Pon tu cifra real en [number], o quítala. Otto nunca inventa números.",
    verb: "Revisa “{verb}”. Tu currículum dice “{line}”.",
    unbacked: "Revisa “{phrase}”: solo tú sabes si es así. Déjalo si es verdad.",
    cliche: "Cambia {phrases} por tus propias palabras. Los reclutadores las pasan por alto.",
    quote: "“{text}”",
  },
} satisfies Translation<Messages["otto"]>;
