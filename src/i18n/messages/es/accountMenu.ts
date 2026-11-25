import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signIn: "Iniciar sesión",
  label: "Cuenta",
  trigger: "Menú de la cuenta de {email}",
  signedInAs: "Sesión iniciada como",
  plan: "Plan {plan}",
  search: "Buscar",
  dashboard: "Panel",
  account: "Cuenta",
  work: "Permisos de trabajo y preferencias",
  help: "Ayuda: {email}",
  feedback: "Enviar comentarios",
  signOut: "Cerrar sesión",
  signingOut: "Cerrando sesión…",
  signedOut: "Cerraste sesión",
  signOutFailed: "No se pudo cerrar tu sesión",
  signOutFailedNote: "Revisa tu conexión e inténtalo de nuevo.",
} satisfies Translation<Messages["accountMenu"]>;
