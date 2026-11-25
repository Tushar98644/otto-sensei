import type { Messages } from "..";
import type { Translation } from "../../types";

// Share links and the invite prompt, in Spanish.
export default {
  dialog: {
    title: "Compartir este currículum",
    description:
      "“{title}” como página web que cualquiera con el enlace puede leer, con descarga en PDF. No hace falta una cuenta para abrirla.",
    turnOff: "Desactivar enlace",
    cancel: "Cancelar",
    make: "Crear enlace",
    checking: "Buscando un enlace que ya hayas creado",
    checkFailed: "No se pudieron revisar tus enlaces",
    tryAgain: "Reintentar",
    checkConnection: "Revisa tu conexión y vuelve a intentarlo.",
    madeCopied: "Enlace creado y copiado. Pégalo donde quieras.",
    made: "Enlace creado. Cópialo y envíaselo a quien quieras.",
    updated: "Enlace actualizado a esta versión.",
    link: "Enlace",
    behindTitle: "Este enlace muestra una versión anterior",
    update: "Actualizar enlace",
    behind:
      "Cambiaste este currículum después de compartirlo. Al actualizarlo, el enlace sigue siendo el mismo.",
  },
  list: {
    title: "Enlaces compartidos",
    intro:
      "Cualquiera con uno de estos enlaces puede leer ese currículum. Las visitas no cuentan las vistas previas de enlaces, los buscadores ni a ti mientras tengas la sesión iniciada.",
    untitled: "Currículum",
    shown: "Correo y teléfono visibles",
    hidden: "Correo y teléfono ocultos",
    indexed: "En resultados de búsqueda",
    older: "Versión anterior",
    copyFor: "Copiar el enlace de {name}",
    openFor: "Abrir la página de {name} (se abre en una pestaña nueva)",
    turnOffFor: "Desactivar el enlace de {name}",
    turnOff: "Desactivar",
  },
  copy: {
    copied: "Copiado",
    copyLink: "Copiar enlace",
    linkCopied: "Enlace copiado",
    cantCopy: "No se pudo copiar",
    selectLink: "Selecciona el enlace y cópialo tú.",
    open: "Abrir página",
    newTab: "(se abre en una pestaña nueva)",
  },
  actions: {
    signIn: "Inicia sesión para compartir un enlace a tu currículum.",
    checkFailed:
      "No se pudieron revisar los enlaces que ya creaste. Revisa tu conexión y vuelve a intentarlo.",
    copied: "Copiado",
    ready: "Enlace listo",
    onClipboard:
      "Tu enlace para compartir está en el portapapeles. Cualquiera que lo tenga puede leer este currículum.",
    fromSettings: "Cópialo desde los ajustes del enlace.",
    settings: "Ajustes",
    makeFailed: "No se pudo crear el enlace",
    turnedOff: "Enlace desactivado",
    turnedOffNote: "Quien lo abra ahora verá que ya no funciona.",
    turnOffFailed: "No se pudo desactivar el enlace",
    undo: "Deshacer",
    fallback: "Algo salió mal. Inténtalo de nuevo.",
  },
  invite: {
    text: "Comparte tu enlace: cuando se registren y revisen un currículum, los dos reciben {fix} correcciones de línea más, además de {tailor} versiones adaptadas en Pro o Max.",
    announcement:
      "Invita a un amigo y los dos reciben extras. La invitación está justo debajo del botón de descarga.",
    label: "Invita a un amigo",
    heading: "¿Conoces a alguien que busca empleo?",
    copied: "Copiado",
    copy: "Copiar enlace de invitación",
    announced: "Enlace de invitación copiado.",
    dismiss: "Cerrar la invitación",
    copyFailed: "No se pudo copiar el enlace",
    copyFailedNote: "Tu enlace de invitación también está en la página de tu cuenta.",
  },
} satisfies Translation<Messages["shareLinks"]>;
