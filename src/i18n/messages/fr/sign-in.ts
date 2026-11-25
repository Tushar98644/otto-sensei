import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in form, dialog and terms line, in French.
export default {
  google: "Continuer avec Google",
  googleOff: "La connexion avec Google fonctionne une fois Supabase configuré.",
  or: "ou",
  email: "E-mail",
  emailPlaceholder: "toi@exemple.com",
  emailMe: "M'envoyer un code",
  badEmail: "Saisis ton adresse e-mail, par exemple nom@exemple.com.",
  badCode: "Saisis le code à {length} chiffres reçu par e-mail.",
  sent: "Nous avons envoyé un code à {length} chiffres à {email}.",
  sentNew: "Nous avons envoyé un nouveau code à {email}.",
  codeSent: "Nous avons envoyé un code à {length} chiffres à <b>{email}</b>.",
  codeSentNew:
    "Nous avons envoyé un nouveau code à <b>{email}</b>. Seul le plus récent fonctionne.",
  devCode: "Mode développement : ton code est <b>{code}</b>",
  codeLabel: "Code à {length} chiffres",
  codeHint: "Tape-le ou colle-le. Tu es connecté dès que les {length} chiffres sont saisis.",
  signIn: "Se connecter",
  sending: "Envoi…",
  resendIn: "Renvoyer le code dans {seconds} s",
  resend: "Renvoyer le code",
  otherEmail: "Utiliser une autre adresse",
  done: "Tu es connecté.",
  terms:
    "Nouveau ici ? Cela crée ton compte gratuit. En continuant, tu acceptes les <link>Conditions</link> et la <link>Politique de confidentialité</link>.",
  newTab: "(s'ouvre dans un nouvel onglet)",
  dialog: {
    reason: "Un compte gratuit permet à Otto de corriger des lignes et d'adapter ton CV.",
    otto: "Utilise Google ou un code à 6 chiffres par e-mail, puis on reprend là où tu en étais.",
  },
  upgrade: {
    trial: "Connecte-toi pour démarrer ton essai",
    upgrade: "Connecte-toi pour changer de forfait",
    otto: "Connecte-toi d'abord. Ensuite, je t'emmène directement au paiement.",
    description: "Utilise Google ou un code à 6 chiffres par e-mail. Sans mot de passe.",
  },
  account: "Connecte-toi pour voir ton forfait et ce que tu as utilisé ce mois-ci.",
  signedOut: {
    safe: "Tes CV sont en sécurité dans ton compte. Reconnecte-toi pour les voir ici.",
    kept: {
      one: "1 CV n'a pas fini d'être sauvegardé, il est donc encore dans ce navigateur.",
      other:
        "{count} CV n'ont pas fini d'être sauvegardés, ils sont donc encore dans ce navigateur.",
    },
  },
  gate: {
    sessionEnded: "Tu as été déconnecté. Reconnecte-toi pour continuer.",
    tryAgain: "Réessaie maintenant.",
    backIn: "C'est bon, tu es connecté. On reprend là où tu en étais.",
    reasons: {
      fix: "Connecte-toi pour corriger des lignes avec moi. Avec Free, tu en as {limit} par mois.",
      tailor: "Connecte-toi, puis essaie {plan} pendant {days} jours pour adapter avec moi.",
      letter:
        "Connecte-toi, puis essaie {plan} pendant {days} jours pour les lettres, les messages et les réponses.",
      import: "Connecte-toi, puis essaie {plan} pendant {days} jours pour les lectures par l'IA.",
      draft:
        "Connecte-toi, puis essaie {plan} pendant {days} jours pour créer des brouillons avec moi.",
      github:
        "Connecte-toi, puis essaie {plan} pendant {days} jours pour rédiger à partir de GitHub.",
    },
  },
} satisfies Translation<Messages["signIn"]>;
