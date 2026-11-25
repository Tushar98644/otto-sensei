import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signIn: "Anmelden",
  label: "Konto",
  trigger: "Kontomenü für {email}",
  signedInAs: "Angemeldet als",
  plan: "Tarif {plan}",
  search: "Suchen",
  dashboard: "Übersicht",
  account: "Konto",
  work: "Arbeitserlaubnis und Vorlieben",
  help: "Hilfe: {email}",
  feedback: "Feedback senden",
  signOut: "Abmelden",
  signingOut: "Wird abgemeldet…",
  signedOut: "Du bist abgemeldet",
  signOutFailed: "Abmelden hat nicht geklappt",
  signOutFailedNote: "Prüf deine Verbindung und versuch es erneut.",
} satisfies Translation<Messages["accountMenu"]>;
