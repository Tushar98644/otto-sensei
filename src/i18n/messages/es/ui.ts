import type { Messages } from "..";
import type { Translation } from "../../types";

// Shared controls, voice typing, feedback and notifications, in Spanish.
export default {
  close: "Cerrar",
  optional: "(opcional)",
  dropOne: "Suelta un archivo a la vez.",
  fileCheck: {
    unsupported: "Ese tipo de archivo no es compatible.",
    unsupportedKinds: "Ese tipo de archivo no es compatible. Elige un archivo {kinds}.",
    kinds: "{first} o {last}",
    empty: "Ese archivo está vacío. Elige otro.",
    tooBig: "Ese archivo es demasiado grande. El límite es {limit}.",
  },
  voice: {
    start: "Hablar en vez de escribir",
    listening: "Dejar de escuchar",
    recording: "Dejar de grabar",
    sending: "Pasando la voz a texto…",
    fullTitle: "Este campo está lleno",
    full: "Parte de lo que dijiste no cupo. Quita algunas palabras para agregar más.",
    problems: {
      micBlocked: {
        title: "Otto no te escucha",
        description: "Permite el micrófono en tu navegador para hablar con Otto.",
      },
      noMic: {
        title: "Otto no encuentra tu micrófono",
        description:
          "Revisa que esté conectado y que otra app no lo esté usando, y vuelve a intentarlo.",
      },
      noSpeech: {
        title: "Otto no oyó nada",
        description: "Inténtalo de nuevo un poco más cerca del micrófono.",
      },
      offline: {
        title: "Dictar necesita internet",
        description: "Revisa tu conexión y vuelve a intentarlo, o escribe.",
      },
      signIn: {
        title: "Primero inicia sesión",
        description: "Inicia sesión para hablar con Otto.",
      },
      tooMany: { title: "Tómate un respiro", description: "Inténtalo de nuevo en unos minutos." },
      failed: {
        title: "No se pudo pasar a texto",
        description: "Inténtalo de nuevo, o escribe.",
      },
    },
  },
  feedback: {
    button: "Enviar comentarios",
    title: "Enviar comentarios",
    description:
      "Cuéntanos qué falló o qué te ayudaría. También vemos desde qué página lo enviaste.",
    cancel: "Cancelar",
    send: "Enviar",
    about: "¿De qué se trata?",
    kinds: { bug: "Problema", idea: "Idea", other: "Otro" },
    placeholders: {
      bug: "¿Qué hiciste y qué pasó?",
      idea: "¿Qué haría a Otto más útil?",
      other: "¿Qué tienes en mente?",
    },
    note: "Tu nota",
    tooShort: "Escribe unas palabras más.",
    sent: "Gracias. Tu nota se envió.",
  },
  notifications: {
    title: "Notificaciones",
    unread: "Notificaciones, {count} sin leer",
    loadFailed: "No se pudieron cargar tus notificaciones.",
    tryAgain: "Reintentar",
    empty:
      "Nada por ahora. Marca un empleo como postulado y te recordaré aquí que hagas seguimiento.",
    openApplications: "Abrir postulaciones",
    new: "Nuevo: ",
    writeIt: "Escríbelo por mí",
    done: "Listo",
    snooze: "Posponer",
    snoozeDays: "Posponer {days} días",
    markedDone: "Seguimiento marcado como hecho",
    snoozed: "Pospuesto hasta el {day}",
    reminderFailed: "No se pudo cambiar el recordatorio",
    thankYou: "Escribir un agradecimiento",
    howItWent: "Cómo te fue",
    outcomes: { next_round: "Siguiente ronda", waiting: "Esperando", rejected: "Rechazado" },
    nextRound: "A la siguiente ronda con {company}",
    nextRoundNote: "Agrega la fecha en la tarjeta cuando la sepas.",
    closed: "Movido a Cerradas",
    closedNote: "{company}. Igual cuenta en tu registro de lo que funciona.",
    waiting: "Esperando respuesta",
    remind: "Te recordaré hacer seguimiento con {company} el {day}.",
    saveFailed: "No se pudo guardar",
  },
} satisfies Translation<Messages["ui"]>;
