import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: {
    shared: "Currículum compartido",
    title: "{name} - Currículum",
    untitled: "Currículum",
    description: "Un currículum compartido desde {brand}.",
    notFound: "Enlace no encontrado",
  },
  updated: "Currículum · Actualizado el {date}",
  madeWith: "Hecho con",
  unavailable: {
    thinking: "Otto la nutria, pensando",
    worried: "Otto la nutria, preocupada",
    busyTitle: "Se abrieron muchas páginas a la vez",
    missingTitle: "Este enlace no funciona",
    busy: {
      one: "Se abrieron muchos currículums desde tu red hace un momento. Vuelve a intentarlo en {count} minuto.",
      other:
        "Se abrieron muchos currículums desde tu red hace un momento. Vuelve a intentarlo en {count} minutos.",
    },
    missing: "Es posible que quien lo compartió lo haya desactivado. Pídele un enlace nuevo.",
    checkOwn: "Revisa tu propio currículum",
  },
  download: {
    failed: "No funcionó. Vuelve a intentarlo.",
    tryAgain: "Intentar de nuevo",
    pdf: "Descargar PDF",
  },
  owner: {
    label: "Tu enlace",
    onlyYou: "Solo tú ves esta barra",
    settings: "Ajustes del enlace",
    edit: "Editar",
    saveFailed: "No se pudo guardar",
    checkConnection: "Revisa tu conexión y vuelve a intentarlo.",
  },
  options: {
    legend: "Lo que muestra la página",
    contact: "Mostrar correo y teléfono",
    contactHint:
      "Desactivado: la página y su PDF no los incluyen. Tu nombre, ciudad y enlaces siempre se muestran.",
    indexing: "Dejar que los buscadores la muestren",
    indexingHint: "Desactivado: se pide a Google y a otros que no la muestren en los resultados.",
  },
  facts: {
    none: "Aún sin visitas",
    views: { one: "{count} visita", other: "{count} visitas" },
    lastOpened: "Última apertura {when}",
    shared: "Compartido {when}",
    justNow: "justo ahora",
  },
} satisfies Translation<Messages["share"]>;
