import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signIn: "Entrar",
  label: "Conta",
  trigger: "Menu da conta de {email}",
  signedInAs: "Conectado como",
  plan: "Plano {plan}",
  search: "Buscar",
  dashboard: "Painel",
  account: "Conta",
  work: "Permissão de trabalho e preferências",
  help: "Ajuda: {email}",
  feedback: "Enviar feedback",
  signOut: "Sair",
  signingOut: "Saindo…",
  signedOut: "Você saiu",
  signOutFailed: "Não foi possível sair",
  signOutFailedNote: "Verifique sua conexão e tente de novo.",
} satisfies Translation<Messages["accountMenu"]>;
