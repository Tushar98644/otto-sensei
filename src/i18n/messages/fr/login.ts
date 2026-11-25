import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in page around the form, in French.
export default {
  meta: {
    title: "Connexion",
    description:
      "Connecte-toi avec Google ou ton adresse e-mail. Pas besoin de mot de passe : on peut t'envoyer un code à 6 chiffres.",
  },
  heading: {
    signIn: "Connexion",
    trial: "Connecte-toi pour démarrer ton essai",
    upgrade: "Connecte-toi pour changer de forfait",
    jobs: "Connecte-toi pour voir tes offres compatibles",
    portfolio: "Connecte-toi pour créer ton portfolio",
  },
  otto: "Utilise Google, ou je t'envoie un code à 6 chiffres par e-mail. Aucun mot de passe à retenir.",
  studio: "Tu veux juste vérifier un CV ? <link>Ouvre le studio</link>. Pas besoin de compte.",
  googleFailed: "La connexion avec Google n'a pas abouti. Réessaie, ou utilise ton adresse e-mail.",
  signingIn: "Connexion en cours",
} satisfies Translation<Messages["login"]>;
