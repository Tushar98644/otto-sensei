import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signIn: "Se connecter",
  label: "Compte",
  trigger: "Menu du compte {email}",
  signedInAs: "Connecté en tant que",
  plan: "Offre {plan}",
  search: "Rechercher",
  dashboard: "Tableau de bord",
  account: "Compte",
  work: "Droit de travail et préférences",
  help: "Aide : {email}",
  feedback: "Envoyer un avis",
  signOut: "Se déconnecter",
  signingOut: "Déconnexion…",
  signedOut: "Tu es déconnecté",
  signOutFailed: "Impossible de te déconnecter",
  signOutFailedNote: "Vérifie ta connexion et réessaie.",
} satisfies Translation<Messages["accountMenu"]>;
