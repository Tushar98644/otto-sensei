import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in Spanish.
export default {
  skipToContent: "Saltar al contenido",
  otto: "Otto, la nutria",
  video: { play: "Reproducir", pause: "Pausar" },
  brand: {
    tagline: "Toda tu búsqueda de empleo, en un solo lugar.",
    description:
      "Revisa y corrige tu currículum con Otto, encuentra vacantes ordenadas según tu perfil, sigue cada postulación desde tu correo, prepárate para entrevistas y comparte un sitio de portafolio. Descargas gratis, siempre.",
  },
  referral: {
    rewardedTitle: "Tú y tu amigo recibieron extras",
    rewarded:
      "Cada uno recibe {fix} correcciones de línea más, además de {tailor} versiones adaptadas en Pro o Max.",
    pendingTitle: "Te uniste con una invitación",
    pending:
      "Revisa un currículum y los dos reciben {fix} correcciones de línea más, además de {tailor} versiones adaptadas en Pro o Max.",
  },
  toast: { region: "Notificaciones", dismiss: "Cerrar" },
} satisfies Translation<Messages["common"]>;
