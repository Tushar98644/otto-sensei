import type { Messages } from "..";
import type { Translation } from "../../types";

// The private calendar feed card, in Spanish.
export default {
  title: "Todas tus entrevistas en tu calendario",
  intro:
    "Suscríbete una vez. Las entrevistas que registres, a su hora, y tus días de seguimiento aparecen solos, cada uno con un enlace a su preparación.",
  google: "Suscribirse en Google Calendar",
  googleNewTab: "(abre Google Calendar en una pestaña nueva)",
  apple: "Apple / Outlook",
  copy: "Copiar enlace",
  copied: "Copiado",
  paste: "Pega el enlace del calendario en tu app de calendario.",
  cantCopy: "No se pudo copiar",
  selectText: "Selecciona el texto del cuadro y cópialo desde ahí.",
  note: "Google actualiza los calendarios suscritos cada varias horas, así que para un cambio del mismo día usa también Agregar al calendario en la entrevista. El enlace es privado: cualquiera que lo tenga puede ver tus entrevistas.",
  noteRenewable:
    "Google actualiza los calendarios suscritos cada varias horas, así que para un cambio del mismo día usa también Agregar al calendario en la entrevista. El enlace es privado: cualquiera que lo tenga puede ver tus entrevistas, así que crea uno nuevo si se filtra.",
  renew: "Crear un enlace nuevo",
  renewHint: "Los calendarios con el enlace anterior dejan de actualizarse.",
  cancel: "Cancelar",
  renewed: "Nuevo enlace de calendario listo",
  renewedNote:
    "Los calendarios con el enlace anterior dejan de actualizarse. Vuelve a suscribirte con este.",
  renewFailed: "No se pudo crear un enlace nuevo",
  loadFailed: "No se cargó el enlace de tu calendario",
  tryAgain: "Reintentar",
  loading: "Obteniendo el enlace de tu calendario",
} satisfies Translation<Messages["calendar"]>;
